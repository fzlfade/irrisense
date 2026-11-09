// Verifikasi Fase 9 (aksesibilitas nyata) lewat CDP di Edge headless, hanya loopback. Melengkapi uji Fase 4-8 dan
// audit (kurangi gerak, tanpa JavaScript, jaringan lambat, landmark, Tab pertama sudah diuji di sana).
// Pakai: node docs/superpowers/plans/evidence/fase9-a11y.mjs [url] [--port 9339] [--out berkas.json]
// Yang diuji di beranda dan Spesifikasi: lang dan title; alt gambar dan title iframe; heading tanpa lompatan; seluruh
// jalur Tab (setiap fokus terlihat di layar dan punya cincin, tanpa jebakan) dan Shift+Tab; Enter pada tautan lewati;
// Enter dan Esc pada tombol Menu (375 px); target sentuh minimal 24 × 24 px (WCAG 2.5.8) di 375, 768, 1280 px; overflow.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const base = (args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'http://localhost:3000/').replace(/\/?$/, '/');
const port = Number(opt('--port', 9339));
const out = opt('--out', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGES = [base, new URL('spesifikasi/', base).href];

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
  const profile = mkdtempSync(path.join(tmpdir(), 'irri-fase9-'));
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
const metrics = (c, width, height, mobile = false) => c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
async function key(c, k, modifiers = 0) {
  const [code, text] = { Tab: [9, ''], Enter: [13, '\r'], Escape: [27, ''] }[k];
  for (const type of ['keyDown', 'keyUp']) {
    await c.send('Input.dispatchKeyEvent', { type, key: k, code: k, modifiers, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, ...(type === 'keyDown' && text ? { text } : {}) });
  }
}

// Struktur halaman: lang, title, alt, title iframe, heading.
const STRUCTURE = `(() => {
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
  return { lang: document.documentElement.lang, title: document.title,
    gambarTanpaAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src),
    gambar: [...document.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src'), alt: i.alt })),
    iframeTanpaTitle: [...document.querySelectorAll('iframe')].filter((f) => !f.title).length,
    iframe: [...document.querySelectorAll('iframe')].map((f) => ({ title: f.title, ariaHidden: f.getAttribute('aria-hidden'), tabIndex: f.tabIndex })),
    h1: heads.filter((l) => l === 1).length, lompatHeading: heads.filter((l, i) => i && l > heads[i - 1] + 1).length };
})()`;
// Keadaan elemen yang sedang fokus: terlihat di layar, punya cincin fokus.
const FOCUSED = `(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
  const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow && cs.boxShadow !== 'none');
  return { teks: (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 50), tag: a.tagName,
    terlihat: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, cincin: !!ring,
    cincinWarna: cs.outlineColor };
})()`;
// Target sentuh: kontrol di luar kalimat (WCAG 2.5.8 mengecualikan tautan dalam teks) minimal 24 × 24 px.
const TARGETS = `(() => {
  const bad = [];
  for (const el of document.querySelectorAll('a[href], button, summary')) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width === 0 || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) continue;
    const inline = cs.display === 'inline' && el.parentElement && /^(P|LI|DD|TD|SPAN)$/.test(el.parentElement.tagName) && el.parentElement.textContent.trim() !== el.textContent.trim();
    if (inline) continue;
    if (r.width < 24 || r.height < 24) bad.push({ teks: el.textContent.trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return { kecil: bad, overflowPx: document.documentElement.scrollWidth - innerWidth };
})()`;

const R = { waktu: new Date().toISOString(), halaman: {} };
const errors = [];
let b;
try {
  b = await launchBrowser();
  const tab = async () => {
    const t = await (await fetch(`${b.root}/json/new?about:blank`, { method: 'PUT' })).json();
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
  const load = async (c, u) => { await c.send('Page.navigate', { url: u }); for (let i = 0; i < 100 && (await c.evaluate('document.readyState')) !== 'complete'; i++) await sleep(100); await sleep(1500); };
  const closeTab = async (c) => { c.close(); await fetch(`${b.root}/json/close/${c.targetId}`); };

  for (const page of PAGES) {
    const P = (R.halaman[new URL(page).pathname] = {});
    const c = await tab();
    await metrics(c, 1280, 800);
    await load(c, page);
    P.struktur = await c.evaluate(STRUCTURE);
    // Seluruh jalur Tab dari awal sampai fokus kembali ke awal (atau 80 langkah: tanda jebakan).
    await c.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0)');
    const jalur = [];
    for (let i = 0; i < 80; i++) {
      await key(c, 'Tab');
      await sleep(250);
      let f = await c.evaluate(FOCUSED);
      // Gulir ke elemen terfokus berjalan halus (sekitar 0,5 detik); baca ulang bila belum sampai.
      if (f && !f.terlihat) { await sleep(1200); f = await c.evaluate(FOCUSED); }
      if (!f || (jalur.length && f.teks === jalur[0].teks && f.tag === jalur[0].tag)) break;
      jalur.push(f);
    }
    P.tab = { jumlah: jalur.length, urutan: jalur.map((f) => f.teks), tidakTerlihat: jalur.filter((f) => !f.terlihat).map((f) => f.teks),
      tanpaCincin: jalur.filter((f) => !f.cincin).map((f) => f.teks), selesai: jalur.length < 80 };
    // Shift+Tab tiga kali dari elemen terakhir: urutan terbalik.
    await c.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0)');
    for (let i = 0; i < jalur.length; i++) await key(c, 'Tab');
    const mundur = [];
    for (let i = 0; i < 3; i++) { await key(c, 'Tab', 8); await sleep(250); mundur.push((await c.evaluate(FOCUSED))?.teks ?? null); }
    P.shiftTab = { dapat: mundur, harap: jalur.slice(-4, -1).reverse().map((f) => f.teks) };
    // Enter pada tautan lewati: Tab berikutnya masuk ke <main>. Dimuat ulang dulu: blur() tidak mengembalikan titik awal
    // fokus ke awal halaman setelah uji Shift+Tab.
    await load(c, page);
    await key(c, 'Tab');
    await key(c, 'Enter');
    await sleep(1200);
    await key(c, 'Tab');
    await sleep(300);
    P.lewati = await c.evaluate(`({ hash: location.hash, fokusDiMain: !!document.activeElement && !!document.activeElement.closest('main'), fokus: document.activeElement?.textContent.trim().slice(0, 40) })`);
    P.target = {};
    for (const [w, h, mobile] of [[1280, 800, false], [768, 1024, false], [375, 812, true]]) {
      if (mobile) await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await metrics(c, w, h, mobile);
      await load(c, page);
      P.target[w] = await c.evaluate(TARGETS);
    }
    // 375 px: tombol Menu lewat keyboard (Enter membuka, Esc menutup, fokus kembali ke tombol).
    await c.evaluate('document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0)');
    let menuFocused = false;
    for (let i = 0; i < 6 && !menuFocused; i++) { await key(c, 'Tab'); menuFocused = await c.evaluate(`document.activeElement?.matches('button[popovertarget]') ?? false`); }
    await key(c, 'Enter');
    await sleep(300);
    const buka = await c.evaluate(`document.getElementById('menu-utama').matches(':popover-open')`);
    await key(c, 'Escape');
    await sleep(300);
    P.menu = { tombolTerfokus: menuFocused, terbukaEnter: buka, tertutupEsc: await c.evaluate(`!document.getElementById('menu-utama').matches(':popover-open')`),
      fokusKembali: await c.evaluate(`document.activeElement?.matches('button[popovertarget]') ?? false`) };
    await closeTab(c);
  }
} catch (e) {
  R.galat = e.message;
} finally {
  await closeBrowser(b);
}

R.errorKonsol = errors;
const pages = Object.values(R.halaman);
R.cek = {
  langDanTitle: pages.length === 2 && pages.every((p) => p.struktur?.lang === 'id' && p.struktur.title.length > 0),
  altDanIframe: pages.every((p) => p.struktur?.gambarTanpaAlt.length === 0 && p.struktur.iframeTanpaTitle === 0),
  heading: pages.every((p) => p.struktur?.h1 === 1 && p.struktur.lompatHeading === 0),
  jalurTab: pages.every((p) => p.tab?.selesai && p.tab.jumlah > 5 && p.tab.tidakTerlihat.length === 0 && p.tab.tanpaCincin.length === 0),
  shiftTab: pages.every((p) => JSON.stringify(p.shiftTab?.dapat) === JSON.stringify(p.shiftTab?.harap)),
  lewatiKeMain: pages.every((p) => p.lewati?.hash === '#konten' && p.lewati.fokusDiMain),
  menuKeyboard: pages.every((p) => p.menu?.tombolTerfokus && p.menu.terbukaEnter && p.menu.tertutupEsc && p.menu.fokusKembali),
  targetSentuh: pages.every((p) => Object.values(p.target ?? {}).length === 3 && Object.values(p.target).every((t) => t.kecil.length === 0 && t.overflowPx <= 0)),
  konsolBersih: errors.length === 0,
};
R.lulusSemua = !R.galat && Object.values(R.cek).every(Boolean);
const text = JSON.stringify(R, null, 2);
if (out) writeFileSync(out, `${text}\n`);
console.log(text);
process.exitCode = R.galat ? 2 : R.lulusSemua ? 0 : 1;
