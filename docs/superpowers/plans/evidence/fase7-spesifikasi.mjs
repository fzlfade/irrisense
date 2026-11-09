// Verifikasi Fase 7 (halaman Spesifikasi) lewat HTTP dan CDP di Edge headless, hanya loopback.
// Pakai: node docs/superpowers/plans/evidence/fase7-spesifikasi.mjs [url-dasar] [--port 9337] [--out berkas.json] [--shots folder]
// Yang diuji: rute /spesifikasi/ dan pengalihan /spesifikasi; perayap tautan internal di beranda dan Spesifikasi (semua
// href, src, dan anchor ada); isi tabel sama dengan landing/content/spesifikasi.ts; heading dan landmark; aria-current;
// anchor daftar isi; tanpa layar muat; kontras; cincin fokus; tanpa overflow di 375, 768, 1280 px; menu ponsel;
// kurangi gerak; tanpa JavaScript; pindah ke beranda lewat tautan merek; beranda tetap memutar layar muat; CLS; konsol.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const base = (args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'http://localhost:3000/').replace(/\/?$/, '/');
const port = Number(opt('--port', 9337));
const out = opt('--out', null);
const shots = opt('--shots', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGE = new URL('spesifikasi/', base).href;
const spec = await import(new URL('../../../../landing/content/spesifikasi.ts', import.meta.url).href);

const BROWSERS = [
  process.env.AUDIT_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

async function launchBrowser() {
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) throw new Error('Edge/Chrome tidak ditemukan; set AUDIT_BROWSER');
  const root = `http://127.0.0.1:${port}`;
  try { await fetch(`${root}/json/version`); throw new Error(`port ${port} sudah dipakai`); } catch (e) { if (/sudah dipakai/.test(e.message)) throw e; }
  const profile = mkdtempSync(path.join(tmpdir(), 'irri-fase7-'));
  const child = spawn(exe, [
    '--headless=new', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 80; i++) {
    try { await (await fetch(`${root}/json/version`)).json(); return { child, profile, root }; } catch { await sleep(250); }
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
async function waitFor(c, expr, ms, step = 100) {
  for (let t = 0; t < ms; t += step) { if (await c.evaluate(expr)) return true; await sleep(step); }
  return false;
}
async function load(c, target) {
  await c.send('Page.navigate', { url: target });
  await waitFor(c, `document.readyState === 'complete'`, 20000, 100);
  await sleep(600);
}
const metrics = (c, width, height, mobile = false) => c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
async function key(c, k) {
  const [code, text] = { Tab: [9, ''], Enter: [13, '\r'] }[k];
  for (const type of ['keyDown', 'keyUp']) {
    await c.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, ...(type === 'keyDown' && text ? { text } : {}) });
  }
}
async function clickAt(c, x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
}
async function shot(c, name, clip) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  const { data } = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 60, ...(clip ? { clip } : {}) });
  writeFileSync(path.join(shots, name), Buffer.from(data, 'base64'));
}

// ---------- 1. HTTP: rute dan perayap tautan internal ----------
async function http() {
  const res = {};
  const page = await fetch(PAGE);
  const redirect = await fetch(PAGE.replace(/\/$/, ''), { redirect: 'manual' });
  res.rute = {
    spesifikasi: page.status,
    tanpaGarisMiring: redirect.status,
    lokasi: redirect.headers.get('location') ? new URL(redirect.headers.get('location'), base).pathname : null,
  };
  // Kumpulkan href dan src internal dari beranda dan Spesifikasi, lalu minta satu per satu.
  const pages = [base, PAGE];
  const html = {};
  for (const p of pages) html[p] = await (await fetch(p)).text();
  const refs = new Map();
  for (const p of pages) {
    for (const m of html[p].matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const raw = m[1].replace(/&amp;/g, '&');
      if (/^(mailto:|tel:|data:|javascript:)/.test(raw)) continue;
      const u = new URL(raw, p);
      if (u.origin !== new URL(base).origin) continue;
      const key = u.href;
      if (!refs.has(key)) refs.set(key, { url: key, dari: new Set() });
      refs.get(key).dari.add(new URL(p).pathname);
    }
  }
  const results = [];
  for (const r of refs.values()) {
    const u = new URL(r.url);
    const hash = u.hash;
    u.hash = '';
    const resp = await fetch(u.href);
    let anchor = null;
    if (hash) {
      const body = resp.status === 200 ? await resp.text() : '';
      anchor = body.includes(`id="${decodeURIComponent(hash.slice(1))}"`);
    } else await resp.arrayBuffer();
    results.push({ url: r.url.replace(new URL(base).origin, ''), status: resp.status, anchorAda: anchor, dari: [...r.dari] });
  }
  res.tautan = { jumlah: results.length, gagal: results.filter((x) => x.status !== 200 || x.anchorAda === false), daftar: results.map((x) => `${x.status} ${x.url}${x.anchorAda === null ? '' : x.anchorAda ? ' (anchor ada)' : ' (ANCHOR HILANG)'}`) };
  return res;
}

const PAGE_STATE = `(() => {
  const d = document.documentElement;
  const heads = [...document.querySelectorAll('h1, h2, h3')].map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim() }));
  const skips = heads.filter((h, i) => i && h.level > heads[i - 1].level + 1).map((h) => h.text);
  const navLinks = [...document.querySelectorAll('header nav a')].map((a) => ({ text: a.textContent.trim(), current: a.getAttribute('aria-current') }));
  const tables = [...document.querySelectorAll('main table')];
  return {
    dataIntro: d.dataset.intro ?? null, penutup: !!document.querySelector('.intro'), overflowHtml: getComputedStyle(d).overflow,
    landmark: { header: document.querySelectorAll('body > header').length, main: document.querySelectorAll('main').length,
      footer: document.querySelectorAll('body > footer').length, nav: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')) },
    h1: heads.filter((h) => h.level === 1).map((h) => h.text), h2: heads.filter((h) => h.level === 2).map((h) => h.text), lompatHeading: skips,
    navLinks, tabel: tables.length,
    tabelBernama: tables.every((t) => { const id = t.getAttribute('aria-labelledby'); return !!id && !!document.getElementById(id)?.textContent.trim(); }),
    scopeBenar: tables.every((t) => [...t.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col') && [...t.querySelectorAll('tbody th')].every((th) => th.getAttribute('scope') === 'row')),
    sumber: [...document.querySelectorAll('main section')].map((s) => s.querySelectorAll('p code').length > 0 && /Sumber:/.test(s.textContent)),
  };
})()`;

// Isi tabel yang tampil dibandingkan dengan data spesifikasi.ts (bukan teks yang diketik ulang).
const TABLES = `(() => {
  const rows = (id) => [...document.querySelectorAll('#' + id + ' tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim()));
  return { komponen: rows('komponen'), pin: rows('pin'), api: rows('api'), mode: rows('mode'),
    mqtt: [...document.querySelectorAll('#data table')][0] ? [...[...document.querySelectorAll('#data table')][0].querySelectorAll('tbody th')].map((t) => t.textContent.trim()) : [],
    aturan: [...document.querySelectorAll('#aturan dd')].map((dd) => dd.textContent.trim()) };
})()`;

const CONTRAST = `(() => {
  const parse = (s) => s.match(/[\\d.]+/g).map(Number).slice(0, 3);
  const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const x = lum(parse(a)), y = lum(parse(b)); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
  const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return c; } return 'rgb(255, 255, 255)'; };
  const pair = (sel) => { const el = typeof sel === 'string' ? document.querySelector(sel) : sel; return el ? ratio(getComputedStyle(el).color, bg(el)) : null; };
  const source = [...document.querySelectorAll('main section p')].find((p) => p.textContent.startsWith('Sumber:'));
  return { judul: pair('main h1'), ringkasan: pair('main h1 + p'), daftarIsi: pair('nav[aria-label="Isi halaman"] a'), teksIsi: pair('#aturan dd'),
    kepalaTabel: pair('#komponen thead th'), sumber: pair(source), tautan: pair('#komponen a'), param: pair('#api code + code'),
    navAktif: pair('header nav a[aria-current="page"]') };
})()`;

const R = { url: PAGE, waktu: new Date().toISOString() };
const errors = [];
let b;
try {
  Object.assign(R, await http());
  b = await launchBrowser();
  const tab = async ({ collectErrors = true } = {}) => {
    const t = await (await fetch(`${b.root}/json/new?about:blank`, { method: 'PUT' })).json();
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
    await c.send('Page.addScriptToEvaluateOnNewDocument', {
      source: "window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true})}catch(e){}",
    });
    return c;
  };
  const closeTab = async (c) => { c.close(); await fetch(`${b.root}/json/close/${c.targetId}`); };
  const overflow = `(() => ({ halamanPx: document.documentElement.scrollWidth - innerWidth,
    tabelMeluber: [...document.querySelectorAll('main table')].filter((t) => t.scrollWidth > t.parentElement.clientWidth + 1).length }))()`;

  // 2. Desktop 1280: struktur, isi tabel, kontras, anchor daftar isi, fokus, CLS.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await load(c, PAGE);
    R.desktop = await c.evaluate(PAGE_STATE);
    R.isi = await c.evaluate(TABLES);
    R.kontras = await c.evaluate(CONTRAST);
    R.desktop.overflow = await c.evaluate(overflow);
    await shot(c, 'desktop-atas.jpg', { x: 0, y: 0, width: 1280, height: 800, scale: 0.5 });
    // Tab dari awal halaman (sebelum klik anchor, yang memindahkan titik awal fokus): tautan lewati, merek, empat
    // tautan nav, lalu daftar isi dengan cincin krem.
    const order = [];
    for (let i = 0; i < 7; i++) {
      await key(c, 'Tab');
      order.push(await c.evaluate(`document.activeElement.textContent.trim().slice(0, 60)`));
    }
    R.tab = { urutan: order, cincinDaftarIsi: await c.evaluate(`(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor; })()`) };
    await c.evaluate(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
    // Anchor daftar isi: klik "Pin ESP32", tunggu gulir halus selesai, bagian itu mendarat di atas layar.
    const rect = await c.evaluate(`(() => { const r = document.querySelector('nav[aria-label="Isi halaman"] a[href="#pin"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await clickAt(c, rect.x, rect.y);
    await sleep(2200);
    R.anchor = await c.evaluate(`({ hash: location.hash, atasBagianPx: Math.round(document.getElementById('pin').getBoundingClientRect().top), gulirPx: Math.round(scrollY) })`);
    await shot(c, 'desktop-pin.jpg', { x: 0, y: R.anchor.gulirPx, width: 1280, height: 800, scale: 0.5 });
    // Gulir penuh lalu baca CLS.
    const H = await c.evaluate('document.documentElement.scrollHeight');
    for (let y = 0; y <= H; y += 400) { await c.evaluate(`window.scrollTo(0, ${y})`); await sleep(120); }
    await sleep(500);
    R.desktop.cls = await c.evaluate('Math.round(window.__cls * 1000) / 1000');
    // Pindah ke beranda lewat tautan merek (navigasi Next di sisi klien): tanpa layar muat, halaman tidak terkunci.
    await c.evaluate(`window.scrollTo(0, 0)`);
    await sleep(300);
    const brand = await c.evaluate(`(() => { const r = document.querySelector('header a[href="/"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await clickAt(c, brand.x, brand.y);
    await waitFor(c, `location.pathname === '/' && !!document.querySelector('#cara-kerja')`, 10000);
    await sleep(800);
    R.keBeranda = await c.evaluate(`({ path: location.pathname, penutup: !!document.querySelector('.intro'), dataIntro: document.documentElement.dataset.intro ?? null,
      overflowHtml: getComputedStyle(document.documentElement).overflow, h1: document.querySelector('h1')?.textContent.trim() ?? null, footer: document.querySelectorAll('body > footer').length,
      navAktif: [...document.querySelectorAll('header nav a[aria-current]')].map((a) => a.textContent.trim()) })`);
    await closeTab(c);
  }

  // 3. Lebar 768 dan 375 (sentuh): tanpa overflow; di ponsel menu terbuka dan menandai Spesifikasi.
  {
    const c = await tab();
    await metrics(c, 768, 1024);
    await load(c, PAGE);
    R.tablet = { ...(await c.evaluate(overflow)), navSebaris: await c.evaluate(`(() => { const a = [...document.querySelectorAll('header nav a')].map((x) => x.getBoundingClientRect().top); return a.length > 0 && Math.max(...a) - Math.min(...a) < 2; })()`) };
    await shot(c, 'tablet-768.jpg', { x: 0, y: 0, width: 768, height: 1024, scale: 0.5 });
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await metrics(c, 375, 812, true);
    await load(c, PAGE);
    R.ponsel = await c.evaluate(overflow);
    // Layar ponsel berkerapatan 2x; skala 0,5 menghasilkan gambar 375 px agar bukti tetap kecil.
    await shot(c, 'ponsel-375-atas.jpg', { x: 0, y: 0, width: 375, height: 812, scale: 0.5 });
    const sec = await c.evaluate(`Math.round(document.getElementById('data').getBoundingClientRect().top + scrollY)`);
    await c.evaluate(`window.scrollTo(0, ${sec})`);
    await sleep(400);
    await shot(c, 'ponsel-375-data.jpg', { x: 0, y: sec, width: 375, height: 812, scale: 0.5 });
    await c.evaluate('window.scrollTo(0, 0)');
    await sleep(300);
    const menu = await c.evaluate(`(() => { const r = document.querySelector('header button[popovertarget]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await clickAt(c, menu.x, menu.y);
    await sleep(300);
    R.ponsel.menu = await c.evaluate(`(() => { const l = document.getElementById('menu-utama'); return { terbuka: l.matches(':popover-open'), tautan: [...l.querySelectorAll('a')].map((a) => a.textContent.trim() + (a.getAttribute('aria-current') ? ' (aktif)' : '')) }; })()`);
    await closeTab(c);
  }

  // 4. "Kurangi gerak" dan tanpa JavaScript: halaman tetap utuh dan terbaca.
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await load(c, PAGE);
    R.kurangiGerak = await c.evaluate(`({ penutup: !!document.querySelector('.intro'), tabel: document.querySelectorAll('main table').length, h1Terlihat: getComputedStyle(document.querySelector('main h1')).visibility === 'visible' })`);
    await closeTab(c);
    const d = await tab();
    await metrics(d, 1280, 800);
    await d.send('Emulation.setScriptExecutionDisabled', { value: true });
    await d.send('Page.navigate', { url: PAGE });
    await sleep(2500);
    R.tanpaJs = await d.evaluate(`({ dataIntro: document.documentElement.dataset.intro ?? null, tabel: document.querySelectorAll('main table').length,
      baris: document.querySelectorAll('main tbody tr').length, h1Terlihat: getComputedStyle(document.querySelector('main h1')).visibility === 'visible',
      navSpesifikasi: !!document.querySelector('header nav a[href="/spesifikasi/"]') })`);
    await closeTab(d);
  }

  // 5. Beranda tetap memutar layar muat pada kunjungan pertama (intro hanya dibatasi ke beranda, bukan dimatikan).
  {
    const c = await tab();
    await metrics(c, 1280, 800);
    await c.send('Page.navigate', { url: base });
    await waitFor(c, `document.readyState !== 'loading'`, 10000, 50);
    R.berandaIntro = await c.evaluate(`({ dataIntro: document.documentElement.dataset.intro ?? null, penutup: !!document.querySelector('.intro'), footer: document.querySelectorAll('body > footer').length })`);
    await closeTab(c);
  }
} catch (e) {
  R.galat = e.message;
} finally {
  await closeBrowser(b);
}

R.errorKonsol = errors;
const f = spec.firmware;
const pinGpio = [...f.soilPins, f.dhtPin, f.relayPin, f.i2cSda, f.i2cScl].map(String);
const d = R.desktop ?? {};
R.cek = {
  rute: R.rute?.spesifikasi === 200 && [301, 308].includes(R.rute?.tanpaGarisMiring) && R.rute?.lokasi === '/spesifikasi/',
  tautanInternal: R.tautan?.jumlah > 0 && R.tautan?.gagal.length === 0,
  tanpaLayarMuat: d.dataIntro === null && d.penutup === false && d.overflowHtml !== 'hidden',
  landmark: d.landmark?.header === 1 && d.landmark?.main === 1 && d.landmark?.footer === 1 && d.landmark?.nav.includes('Utama') && d.landmark?.nav.includes('Isi halaman'),
  heading: d.h1?.length === 1 && d.h1[0] === 'Spesifikasi' && d.lompatHeading?.length === 0 && ['Aturan pompa', 'Komponen', 'Pin ESP32', 'Data dan jaringan', 'API server', 'Mode firmware'].every((h) => d.h2?.includes(h)),
  tabelAksesibel: d.tabel === 6 && d.tabelBernama === true && d.scopeBenar === true,
  sumberTiapBagian: d.sumber?.length === 6 && d.sumber.every(Boolean),
  navAktif: d.navLinks?.filter((l) => l.current === 'page').map((l) => l.text).join() === 'Spesifikasi',
  isiKomponen: JSON.stringify(R.isi?.komponen) === JSON.stringify(spec.komponen.map((k, i) => [String(i + 1), k.nama, k.keterangan])),
  isiPin: JSON.stringify(R.isi?.pin?.map((r) => r[1])) === JSON.stringify(pinGpio),
  isiApi: JSON.stringify(R.isi?.api?.map((r) => r[0].split(/[?{]/)[0].trim().replace(/\s+/g, ' '))) === JSON.stringify(spec.api.map((r) => `${r.metode} ${r.alamat}`)),
  isiMode: JSON.stringify(R.isi?.mode?.map((r) => r[0])) === JSON.stringify(spec.modeFirmware.map((m) => m.env)),
  isiMqtt: JSON.stringify(R.isi?.mqtt) === JSON.stringify(spec.topikMqtt.map((t) => `irrisense/${f.nodeId}/${t.akhiran}`)),
  isiAturan: R.isi?.aturan?.[0]?.includes(`${f.mSet} %`) && R.isi?.aturan?.[1]?.includes(`${f.mMax} %`) && R.isi?.aturan?.[3]?.includes(`${f.maxRunMs / 60000} menit`),
  kontras: Object.entries(R.kontras ?? {}).every(([k, v]) => v !== null && v >= 4.5) && Object.keys(R.kontras ?? {}).length === 9,
  anchorDaftarIsi: R.anchor?.hash === '#pin' && Math.abs(R.anchor?.atasBagianPx) <= 4,
  urutanTab: JSON.stringify(R.tab?.urutan) === JSON.stringify(['Lewati ke konten', 'IrriSense', 'Cara kerja', 'Spesifikasi', 'Uji coba', 'Dashboard', 'Aturan pompa']) && /rgb\(243, 236, 216\)/.test(R.tab?.cincinDaftarIsi ?? ''),
  tanpaOverflow: d.overflow?.halamanPx <= 0 && d.overflow?.tabelMeluber === 0 && R.tablet?.halamanPx <= 0 && R.tablet?.tabelMeluber === 0 && R.ponsel?.halamanPx <= 0 && R.ponsel?.tabelMeluber === 0,
  navTablet: R.tablet?.navSebaris === true,
  menuPonsel: R.ponsel?.menu?.terbuka === true && R.ponsel?.menu?.tautan.includes('Spesifikasi (aktif)'),
  cls: typeof d.cls === 'number' && d.cls <= 0.05,
  keBeranda: R.keBeranda?.path === '/' && R.keBeranda?.penutup === false && R.keBeranda?.overflowHtml !== 'hidden' && R.keBeranda?.h1 === 'IrriSense' && R.keBeranda?.footer === 1 && R.keBeranda?.navAktif.length === 0,
  kurangiGerak: R.kurangiGerak?.penutup === false && R.kurangiGerak?.tabel === 6 && R.kurangiGerak?.h1Terlihat === true,
  tanpaJs: R.tanpaJs?.dataIntro === null && R.tanpaJs?.tabel === 6 && R.tanpaJs?.baris > 0 && R.tanpaJs?.h1Terlihat === true && R.tanpaJs?.navSpesifikasi === true,
  berandaTetapIntro: R.berandaIntro?.dataIntro === 'play' && R.berandaIntro?.penutup === true && R.berandaIntro?.footer === 1,
  konsolBersih: errors.length === 0,
};
R.lulusSemua = !R.galat && Object.values(R.cek).every(Boolean);

const text = JSON.stringify(R, null, 2);
if (out) writeFileSync(out, `${text}\n`);
console.log(text);
process.exitCode = R.galat ? 2 : R.lulusSemua ? 0 : 1;
