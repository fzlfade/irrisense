// Verifikasi Fase 8 (koreografi gerak terkait gulir) lewat CDP di Edge headless, hanya loopback.
// Pakai: node docs/superpowers/plans/evidence/fase8-gerak.mjs [url] [--port 9338] [--out berkas.json] [--shots folder]
//        [--metrics-only] [--baseline berkas-baseline.json]
// --metrics-only: hanya ukur beban gulir (baseline sebelum Fase 8). --baseline: bandingkan dengan hasil itu.
// Yang diuji: jumlah ScrollTrigger; beban gulir (Performance.getMetrics): total waktu main thread per langkah naik
// paling banyak 25 % dari baseline dan LayoutCount tidak bertambah (jumlah RecalcStyleCount hanya dicatat: setiap frame
// animasi apa pun dihitung satu, jadi angka itu mengukur lama beranimasi, bukan beratnya; diputuskan 2026-11-09); (a) clip-path hero menyempit dan membulat saat ditinggalkan; (b) angka 60–80 %
// bergeser mendatar mengikuti gulir; (c) penanda progres panggung cerita mengikuti progres; "kurangi gerak": nol efek;
// layar sentuh 375 px tanpa efek dan tanpa overflow; 768 px; efek dibongkar dan dipasang lagi saat lebar berganti.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const url = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'http://localhost:3000/';
const port = Number(opt('--port', 9338));
const out = opt('--out', null);
const shots = opt('--shots', null);
const baselineFile = opt('--baseline', null);
const metricsOnly = args.includes('--metrics-only');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_RISE = 0.25;

const BROWSERS = [
  process.env.AUDIT_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

async function launchBrowser() {
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) throw new Error('Edge/Chrome tidak ditemukan; set AUDIT_BROWSER');
  const base = `http://127.0.0.1:${port}`;
  try { await fetch(`${base}/json/version`); throw new Error(`port ${port} sudah dipakai`); } catch (e) { if (/sudah dipakai/.test(e.message)) throw e; }
  const profile = mkdtempSync(path.join(tmpdir(), 'irri-fase8-'));
  const child = spawn(exe, [
    '--headless=new', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 80; i++) {
    try { await (await fetch(`${base}/json/version`)).json(); return { child, profile, base }; } catch { await sleep(250); }
  }
  throw new Error('browser headless tidak siap');
}
async function closeBrowser(b) {
  if (!b) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(b.child.pid), '/T', '/F'], { stdio: 'ignore' });
    else b.child.kill('SIGKILL');
  } catch { /* sudah mati */ }
  for (let i = 0; i < 20; i++) {
    try { rmSync(b.profile, { recursive: true, force: true }); return; } catch { await sleep(300); }
  }
}
async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP tidak tersambung')); });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else listeners.forEach((fn) => fn(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, (msg) => (msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result?.value;
  };
  return { send, evaluate, on: (fn) => listeners.add(fn), close: () => ws.close() };
}
async function waitFor(c, expr, ms, step = 200) {
  for (let t = 0; t < ms; t += step) { if (await c.evaluate(expr)) return true; await sleep(step); }
  return false;
}
async function load(c, target) {
  await c.send('Page.navigate', { url: target });
  await waitFor(c, `document.readyState === 'complete'`, 20000, 100);
  await sleep(1500);
}
const metrics = (c, width, height, mobile = false) => c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
async function shot(c, name) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  const y = await c.evaluate('Math.round(scrollY)');
  const w = await c.evaluate('innerWidth');
  const h = await c.evaluate('innerHeight');
  const { data } = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 60, clip: { x: 0, y, width: w, height: h, scale: 0.5 } });
  writeFileSync(path.join(shots, name), Buffer.from(data, 'base64'));
}

// Kelas ScrollTrigger diambil dari konteks useGSAP milik CaraStory (GSAP tidak dipasang di window); uji ini saja yang
// menyimpannya di window.__st. Butuh mode cerita (desktop, tanpa "kurangi gerak").
const FIND_ST = `(()=>{if(window.__st)return true;const el=document.querySelector('[data-story="on"]');if(!el)return false;
  const key=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));for(let f=el[key];f;f=f.return){
  for(let h=f.memoizedState;h&&typeof h==='object'&&'next' in h;h=h.next){const ctx=h.memoizedState&&h.memoizedState.current;
  if(ctx&&Array.isArray(ctx.data)&&typeof ctx.revert==='function'){const st=ctx.data.find(a=>a&&a.scrollTrigger);if(st){window.__st=st.scrollTrigger.constructor;return true}}}}
  return false})()`;
const TRIGGERS = 'window.__st ? window.__st.getAll().length : null';

// Keadaan efek dibaca dari DOM: gaya inline yang dipasang GSAP (bukan dari CSS).
const EFFECTS = `(() => {
  const hero = document.querySelector('[data-motion="hero"]');
  const drift = document.querySelector('[data-motion="drift"]');
  const fill = document.querySelector('[data-motion="story-fill"]');
  const scaleY = (el) => { if (!el) return null; const t = getComputedStyle(el).transform; if (!t || t === 'none') return 1; const m = t.match(/matrix\\(([^)]+)\\)/); return m ? +Number(m[1].split(',')[3]).toFixed(3) : null; };
  const tx = (el) => { if (!el) return null; const t = getComputedStyle(el).transform; if (!t || t === 'none') return 0; const m = t.match(/matrix\\(([^)]+)\\)/); return m ? +Number(m[1].split(',')[4]).toFixed(1) : null; };
  return {
    heroInline: hero ? hero.style.clipPath || null : 'tidak ada', heroClip: hero ? getComputedStyle(hero).clipPath : null,
    driftInline: drift ? drift.style.transform || null : 'tidak ada', driftX: tx(drift),
    storyBar: !!document.querySelector('[data-motion="story-bar"]'), storyFill: scaleY(fill),
    ticks: document.querySelectorAll('[data-motion="story-tick"]').length,
    overflowPx: document.documentElement.scrollWidth - innerWidth,
  };
})()`;
// inset(a b c d round r1 r2 r3 r4) -> angka-angkanya.
const insetNums = (s) => (s && s.startsWith('inset(') ? s.match(/-?[\d.]+/g).map(Number) : null);

async function scrollLoad(c) {
  await c.send('Performance.enable');
  const get = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const H = await c.evaluate('document.documentElement.scrollHeight - innerHeight');
  const ys = [];
  for (let y = 0; y <= H; y += 300) ys.push(y);
  for (let y = H; y >= 0; y -= 300) ys.push(y);
  await c.evaluate('window.scrollTo(0, 0)');
  await sleep(800);
  const before = await get();
  for (const y of ys) { await c.evaluate(`window.scrollTo(0, ${y})`); await sleep(120); }
  await sleep(600);
  const after = await get();
  await c.send('Performance.disable');
  const per = (k) => +((after[k] - before[k]) / ys.length).toFixed(2);
  // Durasi dari CDP dalam detik; dicatat dalam milidetik per langkah.
  const ms = (k) => +(((after[k] - before[k]) * 1000) / ys.length).toFixed(3);
  return { langkah: ys.length, layoutPerLangkah: per('LayoutCount'), recalcStylePerLangkah: per('RecalcStyleCount'),
    layoutTotal: after.LayoutCount - before.LayoutCount, recalcStyleTotal: after.RecalcStyleCount - before.RecalcStyleCount,
    recalcStyleMs: ms('RecalcStyleDuration'), layoutMs: ms('LayoutDuration'), scriptMs: ms('ScriptDuration'), taskMs: ms('TaskDuration') };
}

const R = { url, waktu: new Date().toISOString(), batasKenaikan: MAX_RISE };
const errors = [];
let b;
try {
  b = await launchBrowser();
  const tab = async () => {
    const t = await (await fetch(`${b.base}/json/new?about:blank`, { method: 'PUT' })).json();
    const c = await cdp(t.webSocketDebuggerUrl);
    c.targetId = t.id;
    c.on((m) => {
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    });
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{sessionStorage.setItem('irri-intro','1')}catch(e){}" });
    return c;
  };
  const closeTab = async (c) => { c.close(); await fetch(`${b.base}/json/close/${c.targetId}`); };

  // 1. Beban gulir di 1280 × 800. Pengukuran baru dimulai setelah kedua model 3D siap dan halaman diam 2 detik
  // (bila model masih bersiap, angkanya ikut naik dan berbeda jauh antar-run). Tiga lintasan turun lalu naik; lintasan
  // pertama memuat kerja sekali jalan (teks muncul, angka menghitung), jadi pembanding utamanya median lintasan 2 dan 3.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await load(c, url);
    await waitFor(c, FIND_ST, 15000);
    R.modelSiap = await waitFor(c, `[...document.querySelectorAll('iframe')].length === 2 && [...document.querySelectorAll('iframe')].every((f) => f.style.opacity === '1')`, 30000, 250);
    await sleep(2000);
    R.scrollTrigger = await c.evaluate(TRIGGERS);
    R.lintasan = [];
    for (let i = 0; i < 3; i++) R.lintasan.push(await scrollLoad(c));
    const median = (k) => { const v = R.lintasan.slice(1).map((x) => x[k]).sort((a, b) => a - b); return +((v[0] + v[v.length - 1]) / 2).toFixed(2); };
    R.stabil = {
      layoutPerLangkah: median('layoutPerLangkah'),
      recalcStylePerLangkah: median('recalcStylePerLangkah'),
      recalcStyleMs: median('recalcStyleMs'),
      layoutMs: median('layoutMs'),
      scriptMs: median('scriptMs'),
      taskMs: median('taskMs'),
    };
    await closeTab(c);
  }

  if (!metricsOnly) {
    // 2. Efek di 1280 × 800.
    {
      const c = await tab();
      await metrics(c, 1280, 800);
      await load(c, url);
      await waitFor(c, FIND_ST, 15000);
      const d = { triggers: await c.evaluate(TRIGGERS), awal: await c.evaluate(EFFECTS) };
      // (a) hero: saat tepi bawahnya di tengah layar (separuh jalan) dan di atas layar (selesai).
      const heroBottom = await c.evaluate(`(() => { const r = document.querySelector('[data-motion="hero"]').getBoundingClientRect(); return Math.round(r.bottom + scrollY); })()`);
      await c.evaluate(`window.scrollTo(0, ${heroBottom - 400})`);
      await sleep(900);
      d.heroSeparuh = insetNums(await c.evaluate(`getComputedStyle(document.querySelector('[data-motion="hero"]')).clipPath`));
      await shot(c, 'hero-peralihan.jpg');
      await c.evaluate(`window.scrollTo(0, ${heroBottom})`);
      await sleep(900);
      d.heroSelesai = insetNums(await c.evaluate(`getComputedStyle(document.querySelector('[data-motion="hero"]')).clipPath`));
      // (b) angka 60–80 %: posisi mendatar saat bagian Masalah masuk dan saat hampir keluar.
      const sec = await c.evaluate(`(() => { const s = document.querySelector('[data-motion="drift"]').closest('section').getBoundingClientRect(); return { top: Math.round(s.top + scrollY), h: Math.round(s.height) }; })()`);
      await c.evaluate(`window.scrollTo(0, ${sec.top - 600})`);
      await sleep(900);
      d.angkaMasuk = (await c.evaluate(EFFECTS)).driftX;
      await c.evaluate(`window.scrollTo(0, ${sec.top + sec.h - 300})`);
      await sleep(900);
      d.angkaKeluar = (await c.evaluate(EFFECTS)).driftX;
      // (c) penanda progres panggung cerita di p = 0,5.
      const p = await c.evaluate(`(() => { const w = document.querySelector('[data-story="on"]'); const top = w.getBoundingClientRect().top + scrollY; return Math.round(top + 0.5 * (w.offsetHeight - innerHeight)); })()`);
      await c.evaluate(`window.scrollTo(0, ${p})`);
      await sleep(1200);
      const e = await c.evaluate(EFFECTS);
      d.cerita = { bar: e.storyBar, isi: e.storyFill, ticks: e.ticks };
      await shot(c, 'cerita-progres.jpg');
      // Ganti lebar: 1280 -> 700 (efek dibongkar) -> 1280 (dipasang lagi), jumlah ScrollTrigger kembali sama.
      await c.evaluate('window.scrollTo(0, 0)');
      await sleep(400);
      await metrics(c, 700, 900);
      await sleep(1200);
      d.lebar700 = { triggers: await c.evaluate(TRIGGERS), ...(await c.evaluate(EFFECTS)) };
      await metrics(c, 1280, 800);
      await sleep(1500);
      d.lebar1280Lagi = { triggers: await c.evaluate(TRIGGERS), ...(await c.evaluate(EFFECTS)) };
      R.desktop = d;
      await closeTab(c);
    }

    // 3. Tablet 768: hero dan angka aktif, panggung cerita tidak (butuh 1024 px).
    {
      const c = await tab();
      await metrics(c, 768, 1024);
      await load(c, url);
      const heroBottom = await c.evaluate(`(() => { const r = document.querySelector('[data-motion="hero"]').getBoundingClientRect(); return Math.round(r.bottom + scrollY); })()`);
      await c.evaluate(`window.scrollTo(0, ${heroBottom - 400})`);
      await sleep(900);
      R.tablet = { ...(await c.evaluate(EFFECTS)), heroSeparuh: insetNums(await c.evaluate(`getComputedStyle(document.querySelector('[data-motion="hero"]')).clipPath`)) };
      await closeTab(c);
    }

    // 4. "Kurangi gerak" dan layar sentuh 375 px: nol efek.
    {
      const c = await tab();
      await metrics(c, 1280, 800);
      await c.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await load(c, url);
      const heroBottom = await c.evaluate(`(() => { const r = document.querySelector('[data-motion="hero"]').getBoundingClientRect(); return Math.round(r.bottom + scrollY); })()`);
      await c.evaluate(`window.scrollTo(0, ${heroBottom - 400})`);
      await sleep(800);
      R.kurangiGerak = await c.evaluate(EFFECTS);
      await closeTab(c);
      const m = await tab();
      await m.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await metrics(m, 375, 812, true);
      await load(m, url);
      await m.evaluate(`window.scrollTo(0, 900)`);
      await sleep(800);
      R.sentuh375 = await m.evaluate(EFFECTS);
      await closeTab(m);
    }
  }
} catch (e) {
  R.galat = e.message;
} finally {
  await closeBrowser(b);
}

R.errorKonsol = errors;
if (metricsOnly) {
  R.lulusSemua = !R.galat && errors.length === 0;
} else {
  const base = baselineFile ? JSON.parse(readFileSync(baselineFile, 'utf8')) : null;
  // Rasio sesudah / sebelum untuk lintasan stabil (median lintasan 2 dan 3). Bila baseline 0 per langkah, rasio tidak
  // terdefinisi; kenaikan dianggap lolos bila tidak lebih dari 0,1 per langkah.
  const ratio = (k) => (base && base.stabil[k] > 0 ? +(R.stabil[k] / base.stabil[k]).toFixed(3) : null);
  const within = (k) => !!base && R.stabil[k] <= base.stabil[k] * (1 + MAX_RISE) + 0.1;
  R.perbandingan = base
    ? {
        baselineScrollTrigger: base.scrollTrigger,
        baselineStabil: base.stabil,
        sesudahStabil: R.stabil,
        waktuMainThreadRasio: ratio('taskMs'),
        recalcStyleMsTambahan: +(R.stabil.recalcStyleMs - base.stabil.recalcStyleMs).toFixed(2),
        layoutRasio: ratio('layoutPerLangkah'),
        recalcStyleRasio: ratio('recalcStylePerLangkah'),
        lintasanPertama: {
          layout: [base.lintasan[0].layoutPerLangkah, R.lintasan[0].layoutPerLangkah],
          recalcStyle: [base.lintasan[0].recalcStylePerLangkah, R.lintasan[0].recalcStylePerLangkah],
        },
      }
    : null;
  const d = R.desktop ?? {};
  const noEffect = (e) => !!e && (e.heroInline === null || e.heroInline === '') && (e.driftInline === null || e.driftInline === '') && e.storyBar === false;
  R.cek = {
    bebanGulir: within('taskMs') && within('layoutPerLangkah'),
    scrollTriggerTercatat: typeof R.scrollTrigger === 'number' && (!base || R.scrollTrigger === base.scrollTrigger + 2),
    heroMenyempit: !!d.heroSeparuh && !!d.heroSelesai && d.heroSeparuh[1] > 0 && d.heroSeparuh[1] < d.heroSelesai[1] && d.heroSelesai[1] <= 3.01 && d.heroSelesai[0] === 0,
    angkaBergeser: typeof d.angkaMasuk === 'number' && typeof d.angkaKeluar === 'number' && d.angkaKeluar - d.angkaMasuk > 10 && Math.abs(d.angkaMasuk) <= 1280 * 0.025 + 1 && Math.abs(d.angkaKeluar) <= 1280 * 0.025 + 1,
    penandaCerita: d.cerita?.bar === true && Math.abs(d.cerita.isi - 0.5) <= 0.05 && d.cerita.ticks === 4,
    // Di 700 px dua gerak Fase 8 dibongkar, dan panggung cerita juga mati (butuh 1024 px): ScrollTrigger turun 3.
    gantiLebar: noEffect(d.lebar700) && d.lebar700?.triggers === d.triggers - 3 && d.lebar1280Lagi?.triggers === d.triggers && !!d.lebar1280Lagi?.heroInline && d.lebar1280Lagi?.overflowPx <= 0,
    tablet: !!R.tablet?.heroInline && !!R.tablet?.driftInline && R.tablet?.storyBar === false && R.tablet?.overflowPx <= 0 && R.tablet?.heroSeparuh?.[1] > 0,
    kurangiGerak: noEffect(R.kurangiGerak),
    sentuh375: noEffect(R.sentuh375) && R.sentuh375?.overflowPx <= 0,
    konsolBersih: errors.length === 0,
  };
  R.lulusSemua = !R.galat && Object.values(R.cek).every(Boolean);
}

const text = JSON.stringify(R, null, 2);
if (out) writeFileSync(out, `${text}\n`);
console.log(text);
process.exitCode = R.galat ? 2 : R.lulusSemua ? 0 : 1;
