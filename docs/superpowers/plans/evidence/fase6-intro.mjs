// Verifikasi Fase 6 (layar muat berbasis progres) lewat CDP di Edge headless, hanya loopback.
// Pakai: node docs/superpowers/plans/evidence/fase6-intro.mjs [url] [--port 9336] [--out berkas.json] [--shots folder]
// Yang diuji: jaringan cepat (pudar paling cepat 1,2 detik, progres sampai 100 %, hero sudah menampilkan model saat
// penutup hilang); jaringan lambat (progres naik bertahap, penutup hilang paling lambat 3,5 detik); JavaScript gagal
// dimuat (penutup tetap hilang, halaman bisa digulir, judul tampil); teks progres per 10 % dengan role="status"; selama penutup
// tampil halaman tidak bergulir dan Lenis berhenti; Tab ke "Lewati" dengan cincin fokus krem; lewati lewat Enter, Esc,
// dan klik; sekali per kunjungan; "kurangi gerak"; tanpa JavaScript; sentuh 375 px; kontras; CLS; dan lewat trace
// browser, bahwa pudar penutup dijalankan compositor (tetap tepat waktu walau main thread sibuk).
// Waktu dihitung dari first-paint (saat penutup pertama tergambar).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const url = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'http://localhost:3000/';
const port = Number(opt('--port', 9336));
const out = opt('--out', null);
const shots = opt('--shots', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIN_MS = 1200;
const MAX_MS = 3500;
const FRAME_MS = 50; // toleransi deteksi per frame
const SLOW = { offline: false, latency: 150, downloadThroughput: 250 * 1024, uploadThroughput: 125 * 1024 };
const MEDIUM = { offline: false, latency: 60, downloadThroughput: 500 * 1024, uploadThroughput: 250 * 1024 };

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
  const profile = mkdtempSync(path.join(tmpdir(), 'irri-fase6-'));
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
async function waitFor(c, expr, ms, step = 50) {
  for (let t = 0; t < ms; t += step) { if (await c.evaluate(expr)) return true; await sleep(step); }
  return false;
}
const metrics = (c, width, height, mobile = false) => c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
const wheel = (c, x, y, dy) => c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy });
async function key(c, k) {
  const [code, text] = { Tab: [9, ''], Enter: [13, '\r'], Escape: [27, ''] }[k];
  for (const type of ['keyDown', 'keyUp']) {
    await c.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, ...(type === 'keyDown' && text ? { text } : {}) });
  }
}
async function click(c, x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
}

// Perekam per frame, dipasang oleh uji ini saja (hanya di dokumen utama, bukan di iframe model). Waktu dicatat mutlak
// (jam performance) lalu dihitung relatif terhadap t0 = first-paint, saat penutup pertama tergambar.
// Dua jam: (a) jadwal dari animasi intro-fade sendiri (startTime + delay/durasi), yang diikuti compositor; (b) frame
// main thread tempat perubahan teramati, yang bisa terlambat bila main thread sibuk (mis. menyiapkan model 3D).
const RECORDER = `(() => {
  if (window.top !== window) return;
  const L = (window.__intro = { t0: null, t0Sumber: null, animStartAwal: null, firstFrame: null, fadeStart: null, gone: null, planFade: null, planEnd: null, progress: [], status: [], wordShownAt: null, heroReadyAtGone: null, cls: 0, never: false });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) L.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
  const last = (a) => (a.length ? a[a.length - 1].v : null);
  let anim = null;
  const tick = (now) => {
    const el = document.querySelector('.intro');
    const cs = el && getComputedStyle(el);
    const shown = !!cs && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
    if (L.firstFrame === null) {
      if (!shown) {
        if (document.readyState !== 'loading' && document.documentElement.dataset.intro !== 'play') { L.never = true; return; }
        requestAnimationFrame(tick);
        return;
      }
      anim = el.getAnimations().find((x) => x.animationName === 'intro-fade') || null;
      L.animStartAwal = anim ? anim.startTime : null;
      L.firstFrame = now;
    }
    if (shown) {
      if (anim && anim.startTime !== null) {
        L.planFade = anim.startTime + anim.effect.getTiming().delay;
        L.planEnd = anim.startTime + anim.effect.getComputedTiming().endTime;
      }
      if (L.fadeStart === null && Number(cs.opacity) < 0.999) L.fadeStart = now;
      const p = cs.getPropertyValue('--intro-progress').trim();
      if (p !== last(L.progress)) L.progress.push({ t: now, v: p });
      const s = el.querySelector('.intro__status');
      const text = s ? s.textContent : null;
      if (text !== last(L.status)) L.status.push({ t: now, v: text });
      const w = el.querySelector('.intro__word');
      if (L.wordShownAt === null && w && Number(getComputedStyle(w).opacity) > 0.5) L.wordShownAt = now;
      requestAnimationFrame(tick);
    } else {
      L.gone = now;
      const f = document.querySelector('iframe');
      L.heroReadyAtGone = !!f && f.style.opacity === '1';
      const fp = performance.getEntriesByName('first-paint')[0] || performance.getEntriesByName('first-contentful-paint')[0];
      L.t0 = fp ? fp.startTime : (L.animStartAwal ?? L.firstFrame);
      L.t0Sumber = fp ? fp.name : 'animasi';
    }
  };
  requestAnimationFrame(tick);
})();`;
const ENDED = 'window.__intro && (window.__intro.gone !== null || window.__intro.never)';

function summarize(L) {
  if (!L || L.t0 === null) return { tampil: false };
  const rel = (x) => (x === null || x === undefined ? null : Math.round(x - L.t0));
  const nums = L.progress.map((x) => Number(x.v));
  const pcts = L.status.map((x) => { const m = /^Memuat halaman (\d+) %$/.exec(x.v ?? ''); return m ? Number(m[1]) : NaN; });
  const planFade = rel(L.planFade);
  const progress = L.progress.map((x) => ({ t: rel(x.t), v: x.v }));
  const before = progress.filter((x) => planFade === null || x.t <= planFade);
  return {
    tampil: true,
    t0: L.t0Sumber,
    jamAnimasiTerlambatMs: rel(L.animStartAwal),
    jadwalPudarMs: planFade,
    jadwalHilangMs: rel(L.planEnd),
    mulaiPudarTeramatiMs: rel(L.fadeStart),
    hilangTeramatiMs: rel(L.gone),
    progres: progress,
    teks: L.status.map((x) => ({ t: rel(x.t), v: x.v })),
    kataMunculMs: rel(L.wordShownAt),
    progresSaatPudar: before.length ? Number(before[before.length - 1].v) : null,
    progresNaik: nums.every((v, i) => i === 0 || v >= nums[i - 1]),
    adaProgresAntara: nums.some((v) => v > 0 && v < 1),
    teksValid: pcts.every((v) => Number.isInteger(v) && v % 10 === 0 && v >= 0 && v <= 100) && pcts.every((v, i) => i === 0 || v >= pcts[i - 1]),
    perubahanTeks: Math.max(0, L.status.length - 1),
    heroSiapSaatHilang: L.heroReadyAtGone,
    cls: Math.round(L.cls * 1000) / 1000,
  };
}

const STATE = `(() => { const d = document.documentElement; const h = document.querySelector('h1'); const el = document.querySelector('.intro');
  const cs = el && getComputedStyle(el);
  return { dataIntro: d.dataset.intro ?? null, tersimpan: (() => { try { return sessionStorage.getItem('irri-intro'); } catch (e) { return 'diblokir'; } })(),
    overflow: getComputedStyle(d).overflow, lenisBerhenti: d.classList.contains('lenis-stopped'),
    h1Terlihat: !!h && getComputedStyle(h).visibility === 'visible' && !h.classList.contains('hero-plain'),
    penutupTampil: !!cs && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0,
    iframe: document.querySelectorAll('iframe').length }; })()`;
// Kontras WCAG dari gaya terhitung: teks status di atas latar penutup, kata di atas air.
const CONTRAST = `(() => {
  const parse = (s) => s.match(/[\\d.]+/g).map(Number).slice(0, 3);
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(parse(a)), y = lum(parse(b)); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
  const q = (s) => getComputedStyle(document.querySelector(s));
  return { statusDiAtasHijau: ratio(q('.intro__status').color, q('.intro').backgroundColor),
    kataDiAtasAir: ratio(q('.intro__word').color, q('.intro__water').backgroundColor),
    ukuranKataPx: parseFloat(q('.intro__word').fontSize), ukuranStatusPx: parseFloat(q('.intro__status').fontSize) };
})()`;

const R = { url, waktu: new Date().toISOString(), batas: { minMs: MIN_MS, maxMs: MAX_MS, toleransiFrameMs: FRAME_MS }, profilLambat: SLOW, profilSedang: MEDIUM };
const errors = [];
let b;
try {
  b = await launchBrowser();
  const tab = async ({ collectErrors = true } = {}) => {
    const t = await (await fetch(`${b.base}/json/new?about:blank`, { method: 'PUT' })).json();
    const c = await cdp(t.webSocketDebuggerUrl);
    c.targetId = t.id;
    if (collectErrors) {
      c.on((m) => {
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
      });
    }
    await c.send('Page.enable');
    await c.send('Runtime.enable');
    await c.send('Network.enable');
    await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    await c.send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
    return c;
  };
  const closeTab = async (c) => { c.close(); await fetch(`${b.base}/json/close/${c.targetId}`); };
  // Tunggu JavaScript halaman jalan selama penutup tampil. Desktop: Lenis sudah berhenti, artinya efek SmoothScroll
  // jalan, dan efek Intro jalan lebih dulu di giliran yang sama (urutan pohon). Sentuh (tanpa Lenis): node penutup
  // sudah dihidrasi React; uji menunggu 300 ms lagi agar efeknya ikut jalan.
  const HYDRATED = `document.documentElement.dataset.intro === 'play' && document.documentElement.classList.contains('lenis-stopped')`;
  const HYDRATED_TOUCH = `document.documentElement.dataset.intro === 'play' && (() => { const el = document.querySelector('.intro'); return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber$')); })()`;

  // 1. Jaringan cepat (tanpa pembatasan, cache mati): pudar paling cepat 1,2 detik, progres 100 %, model siap.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Page.navigate', { url });
    await waitFor(c, ENDED, 15000);
    R.cepat = summarize(await c.evaluate('window.__intro'));
    await sleep(1500);
    R.cepat.sesudah = await c.evaluate(STATE);
    await wheel(c, 640, 400, 500);
    await sleep(900);
    R.cepat.sesudah.gulirPx = await c.evaluate('Math.round(scrollY)');
    // Kunjungan kedua di sesi (tab) yang sama: tidak diputar lagi.
    await c.send('Page.navigate', { url });
    await waitFor(c, `document.readyState === 'complete' && ${ENDED}`, 15000);
    await sleep(300);
    const kedua = await c.evaluate(STATE);
    R.kunjunganKedua = { dataIntro: kedua.dataIntro, penutupTampil: kedua.penutupTampil, perekam: await c.evaluate('window.__intro.never') };
    await closeTab(c);
  }

  // 2. Jaringan lambat: progres naik bertahap dan penutup tetap hilang paling lambat 3,5 detik.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Network.emulateNetworkConditions', SLOW);
    await c.send('Page.navigate', { url });
    await waitFor(c, ENDED, 20000);
    R.lambat = summarize(await c.evaluate('window.__intro'));
    await waitFor(c, `document.readyState === 'complete'`, 30000, 250);
    await sleep(1000);
    R.lambat.sesudah = await c.evaluate(STATE);
    await closeTab(c);
  }

  // 3. JavaScript halaman gagal dimuat (semua chunk .js diblokir): CSS memudarkan penutup, skrip <head> membuka kunci
  // gulir, dan judul biasa tampil sendiri (React tidak pernah menggantinya dengan judul beranimasi).
  {
    const c = await tab({ collectErrors: false });
    await metrics(c, 1280, 800);
    await c.send('Network.setBlockedURLs', { urls: ['*/_next/static/chunks/*.js'] });
    await c.send('Page.navigate', { url });
    await waitFor(c, ENDED, 15000);
    const s = summarize(await c.evaluate('window.__intro'));
    await sleep(300);
    R.jsGagal = { tampil: s.tampil, jadwalHilangMs: s.jadwalHilangMs, hilangTeramatiMs: s.hilangTeramatiMs, progres: s.progres, ...(await c.evaluate(STATE)) };
    R.jsGagal.judulBiasaTerlihat = await c.evaluate(`(() => { const h = document.querySelector('h1.hero-plain'); return !!h && getComputedStyle(h).visibility === 'visible'; })()`);
    await wheel(c, 640, 400, 500);
    await sleep(600);
    R.jsGagal.gulirPx = await c.evaluate('Math.round(scrollY)');
    await closeTab(c);
  }

  // 4. Selama penutup tampil: role status, halaman tidak bergulir, Lenis berhenti, Tab ke "Lewati", Enter melewati.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Network.emulateNetworkConditions', MEDIUM);
    await c.send('Page.navigate', { url });
    const siap = await waitFor(c, HYDRATED, 15000, 25);
    const d = { jsJalanSaatTampil: siap };
    d.kontras = await c.evaluate(CONTRAST);
    Object.assign(d, await c.evaluate(`({ role: document.querySelector('.intro__status')?.getAttribute('role') ?? null, overflow: getComputedStyle(document.documentElement).overflow, lenisBerhenti: document.documentElement.classList.contains('lenis-stopped') })`));
    await wheel(c, 640, 500, 600);
    await sleep(250);
    d.gulirSaatTampilPx = await c.evaluate('Math.round(scrollY)');
    await key(c, 'Tab');
    d.fokus = await c.evaluate(`(() => { const a = document.activeElement; const cs = a && getComputedStyle(a);
      return { kelas: a ? a.className : null, teks: a ? a.textContent.trim() : null, cincin: cs ? cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor : null,
        tinggiPx: a ? Math.round(a.getBoundingClientRect().height) : null, kursor: cs ? cs.cursor : null }; })()`);
    d.masihTampilSaatTab = await c.evaluate(`document.documentElement.dataset.intro === 'play'`);
    await key(c, 'Enter');
    await sleep(150);
    d.setelahEnter = await c.evaluate(STATE);
    R.interaksi = d;
    await closeTab(c);
  }

  // 5. Esc dan klik di penutup juga melewati.
  for (const [nama, aksi] of [['esc', (c) => key(c, 'Escape')], ['klik', (c) => click(c, 640, 500)]]) {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Network.emulateNetworkConditions', MEDIUM);
    await c.send('Page.navigate', { url });
    const siap = await waitFor(c, HYDRATED, 15000, 25);
    await aksi(c);
    await sleep(150);
    R[nama] = { jsJalanSaatTampil: siap, ...(await c.evaluate(STATE)) };
    await closeTab(c);
  }

  // 6. "Kurangi gerak": tidak diputar.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await c.send('Page.navigate', { url });
    await waitFor(c, `document.readyState === 'complete'`, 15000, 100);
    await sleep(800);
    R.kurangiGerak = { ...(await c.evaluate(STATE)), perekamTakPernahMelihat: await c.evaluate('window.__intro.never') };
    await closeTab(c);
  }

  // 7. Tanpa JavaScript: penutup disembunyikan <noscript>, atribut data-intro tidak ada.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Emulation.setScriptExecutionDisabled', { value: true });
    await c.send('Page.navigate', { url });
    await sleep(2500);
    R.tanpaJs = await c.evaluate(`(() => { const el = document.querySelector('.intro'); const h = document.querySelector('h1');
      return { dataIntro: document.documentElement.dataset.intro ?? null, penutupDisplay: el ? getComputedStyle(el).display : 'tidak ada', h1Terlihat: !!h && getComputedStyle(h).visibility === 'visible' }; })()`);
    await closeTab(c);
  }

  // 8. Sentuh 375 px: baris atas muat, tombol minimal 44 px, tanpa overflow; batas 3,5 detik tetap.
  {
    const c = await tab();
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await metrics(c, 375, 812, true);
    await c.send('Network.emulateNetworkConditions', MEDIUM);
    await c.send('Page.navigate', { url });
    await waitFor(c, HYDRATED_TOUCH, 15000, 25);
    await sleep(300);
    const m = await c.evaluate(`(() => { const s = document.querySelector('.intro__status').getBoundingClientRect(); const k = document.querySelector('.intro__skip').getBoundingClientRect();
      return { statusKiriPx: Math.round(s.left), tombolKananPx: Math.round(k.right), lebar: innerWidth, tombolTinggiPx: Math.round(k.height), tumpang: s.right > k.left,
        overflowPx: document.documentElement.scrollWidth - innerWidth }; })()`);
    if (shots) {
      mkdirSync(shots, { recursive: true });
      const { data } = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
      writeFileSync(path.join(shots, 'sentuh-375.jpg'), Buffer.from(data, 'base64'));
    }
    await waitFor(c, ENDED, 15000);
    const s = summarize(await c.evaluate('window.__intro'));
    R.sentuh375 = { ...m, jadwalPudarMs: s.jadwalPudarMs, jadwalHilangMs: s.jadwalHilangMs, hilangTeramatiMs: s.hilangTeramatiMs };
    await closeTab(c);
  }

  // 9. Tangkapan layar jaringan sedang (terpisah dari pengukuran waktu): satu gambar tiap teks progres berubah.
  if (shots) {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Network.emulateNetworkConditions', MEDIUM);
    await c.send('Page.navigate', { url });
    const STATUS = `(() => { const el = document.querySelector('.intro'); if (!el) return null; const cs = getComputedStyle(el);
      if (cs.display === 'none' || Number(cs.opacity) < 0.98) return null; return document.querySelector('.intro__status').textContent; })()`;
    const seen = new Set();
    R.gambar = [];
    for (let i = 0; i < 120; i++) {
      const st = await c.evaluate(STATUS);
      if (st && !seen.has(st)) {
        seen.add(st);
        // Keadaan pertama diambil langsung (tetesan sedang jatuh); berikutnya tunggu air selesai naik.
        if (R.gambar.length) await sleep(650);
        // Gambar hanya disimpan bila teks sebelum dan sesudah pengambilan sama, supaya nama berkas sesuai isinya.
        const before = await c.evaluate(STATUS);
        const { data } = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 55, clip: { x: 0, y: 0, width: 1280, height: 800, scale: 0.5 } });
        const after = await c.evaluate(STATUS);
        const name = before && before === after ? `progres-${before.match(/\d+/)[0]}.jpg` : null;
        if (name && !R.gambar.includes(name)) {
          seen.add(before);
          writeFileSync(path.join(shots, name), Buffer.from(data, 'base64'));
          R.gambar.push(name);
        }
      }
      if (await c.evaluate(ENDED)) break;
      await sleep(80);
    }
    await closeTab(c);
  }

  // 10. Trace browser: animasi penutup mana yang gagal dijalankan compositor (event "Animation" dengan compositeFailed).
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Network.emulateNetworkConditions', MEDIUM);
    const events = [];
    let complete = false;
    c.on((m) => {
      if (m.method === 'Tracing.dataCollected') events.push(...m.params.value);
      if (m.method === 'Tracing.tracingComplete') complete = true;
    });
    await c.send('Tracing.start', { categories: 'blink.animations,devtools.timeline', transferMode: 'ReportEvents' });
    await c.send('Page.navigate', { url });
    await waitFor(c, ENDED, 15000);
    await c.send('Tracing.end');
    for (let i = 0; i < 80 && !complete; i++) await sleep(250);
    const anim = events.filter((e) => e.name === 'Animation');
    const names = new Map();
    for (const e of anim) if (e.ph === 'b' && e.args?.data?.displayName) names.set(e.id2?.local ?? e.id, `${e.args.data.displayName} (${e.args.data.nodeName})`);
    const failed = anim.filter((e) => e.args?.data?.compositeFailed).map((e) => ({ animasi: names.get(e.id2?.local ?? e.id) ?? null, properti: e.args.data.unsupportedProperties ?? [] }));
    R.compositor = { animasiPenutup: [...names.values()].filter((n) => /intro/.test(n)), gagalKomposit: failed };
    await closeTab(c);
  }
} catch (e) {
  R.galat = e.message;
} finally {
  await closeBrowser(b);
}

R.errorKonsol = errors;
const ok = (x) => x === true;
const c = R.cepat ?? {}; const l = R.lambat ?? {}; const j = R.jsGagal ?? {}; const d = R.interaksi ?? {};
// Batas atas dinilai dari jadwal animasi pudar, yang dijalankan compositor (dibuktikan trace, cek pudarDiCompositor),
// jadi tetap tepat walau main thread sibuk. Waktu teramati di main thread ikut dicatat sebagai keterangan: di Edge
// headless tanpa GPU, menyiapkan model 3D bisa menahan main thread beberapa ratus milidetik.
const maxOk = (x) => ok(x?.tampil ?? true) && x?.jadwalHilangMs <= MAX_MS + 1;
const fadeFailed = (R.compositor?.gagalKomposit ?? []).filter((f) => /^intro-fade /.test(f.animasi ?? ''));
R.cek = {
  pudarDiCompositor: (R.compositor?.animasiPenutup ?? []).some((n) => /^intro-fade /.test(n)) && fadeFailed.length === 0,
  cepatTampilMinimal: ok(c.tampil) && c.jadwalPudarMs >= MIN_MS - 1 && c.mulaiPudarTeramatiMs >= MIN_MS - FRAME_MS,
  cepatHilangMaksimal: maxOk(c),
  cepatProgres100SebelumPudar: c.progresSaatPudar === 1,
  cepatHeroModelSiap: ok(c.heroSiapSaatHilang),
  cepatTeks: ok(c.teksValid) && ok(c.progresNaik) && c.perubahanTeks <= 3,
  cepatSesudah: c.sesudah?.dataIntro === 'done' && c.sesudah?.tersimpan === '1' && c.sesudah?.overflow !== 'hidden' && !c.sesudah?.lenisBerhenti && ok(c.sesudah?.h1Terlihat) && !c.sesudah?.penutupTampil && c.sesudah?.gulirPx > 0,
  cepatCls: typeof c.cls === 'number' && c.cls <= 0.05,
  kunjunganKedua: R.kunjunganKedua?.dataIntro === 'skip' && R.kunjunganKedua?.penutupTampil === false,
  lambatHilangMaksimal: ok(l.tampil) && maxOk(l),
  lambatBertahap: ok(l.adaProgresAntara) && ok(l.progresNaik) && ok(l.teksValid) && l.perubahanTeks <= 3,
  jsGagalTetapTerbuka: ok(j.tampil) && maxOk(j) && j.dataIntro === 'done' && j.overflow !== 'hidden' && j.gulirPx > 0 && ok(j.judulBiasaTerlihat),
  // Lenis yang berhenti memasang overflow: clip (lenis.css); tanpa Lenis berlaku overflow: hidden dari globals.css.
  selamaTampil: ok(d.jsJalanSaatTampil) && ['hidden', 'clip'].includes(d.overflow) && d.role === 'status' && ok(d.lenisBerhenti) && d.gulirSaatTampilPx === 0,
  tabKeLewati: ok(d.masihTampilSaatTab) && d.fokus?.kelas === 'intro__skip' && /rgb\(243, 236, 216\)/.test(d.fokus?.cincin ?? '') && d.fokus?.tinggiPx >= 44,
  enterMelewati: d.setelahEnter?.dataIntro === 'done' && d.setelahEnter?.penutupTampil === false && d.setelahEnter?.overflow !== 'hidden',
  escMelewati: ok(R.esc?.jsJalanSaatTampil) && R.esc?.dataIntro === 'done' && R.esc?.penutupTampil === false,
  klikMelewati: ok(R.klik?.jsJalanSaatTampil) && R.klik?.dataIntro === 'done' && R.klik?.penutupTampil === false,
  kontras: d.kontras?.statusDiAtasHijau >= 4.5 && d.kontras?.kataDiAtasAir >= 3 && d.kontras?.ukuranKataPx >= 24,
  kurangiGerak: R.kurangiGerak?.dataIntro === 'skip' && R.kurangiGerak?.penutupTampil === false && ok(R.kurangiGerak?.perekamTakPernahMelihat) && ok(R.kurangiGerak?.h1Terlihat) && R.kurangiGerak?.iframe === 0,
  tanpaJs: R.tanpaJs?.dataIntro === null && R.tanpaJs?.penutupDisplay === 'none' && ok(R.tanpaJs?.h1Terlihat),
  sentuh375: R.sentuh375?.statusKiriPx >= 0 && R.sentuh375?.tombolKananPx <= R.sentuh375?.lebar && R.sentuh375?.tombolTinggiPx >= 44 && R.sentuh375?.tumpang === false && R.sentuh375?.overflowPx <= 0 && maxOk(R.sentuh375),
  konsolBersih: errors.length === 0,
};
R.lulusSemua = !R.galat && Object.values(R.cek).every(Boolean);

const text = JSON.stringify(R, null, 2);
if (out) writeFileSync(out, `${text}\n`);
console.log(text);
process.exitCode = R.galat ? 2 : R.lulusSemua ? 0 : 1;
