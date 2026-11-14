// Verifikasi Fase 4 (Lenis + ScrollTrigger + lapisan seret) lewat CDP di Edge headless, hanya loopback.
// Pakai: node docs/superpowers/plans/evidence/fase4-scroll.mjs [url] [--port 9334] [--out berkas.json]
// Yang diuji: kelas lenis, roda di atas model 3D menggulir halaman, seret memutar model, lintasan anchor
// (tanpa lompat mundur), tombol PageDown dan Spasi, "kurangi gerak" (tanpa Lenis, anchor mendarat <= 4 px),
// layar sentuh (tanpa Lenis), dan error konsol.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const url = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'http://localhost:3000/';
const port = Number(opt('--port', 9334));
const out = opt('--out', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const profile = mkdtempSync(path.join(tmpdir(), 'irri-fase4-'));
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
async function load(c, target, settleMs) {
  let loaded = false;
  const fn = (msg) => { if (msg.method === 'Page.loadEventFired') loaded = true; };
  c.on(fn);
  await c.send('Page.navigate', { url: target });
  for (let i = 0; i < 120 && !loaded; i++) await sleep(250);
  await sleep(settleMs);
}
async function waitFor(c, expr, ms) {
  for (let t = 0; t < ms; t += 250) { if (await c.evaluate(expr)) return true; await sleep(250); }
  return false;
}

// Lintasan scrollY per frame selama `ms`, dimulai sebelum klik pada titik (x, y).
const SAMPLER = (ms) => `window.__s=[];(()=>{const t0=performance.now();(function f(){__s.push([Math.round(performance.now()-t0),Math.round(scrollY)]);if(performance.now()-t0<${ms})requestAnimationFrame(f)})()})();true`;
const ANALYZE = `(()=>{const s=__s;let back=0,maxStep=0;for(let i=1;i<s.length;i++){const d=s[i][1]-s[i-1][1];if(d<0)back++;maxStep=Math.max(maxStep,d)}const end=s[s.length-1][1];const half=s.find(p=>p[1]>=end/2);return{frames:s.length,akhir:end,langkahMundur:back,langkahTerbesarPx:maxStep,msSampaiSetengah:half?half[0]:null}})()`;

async function click(c, x, y) {
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}
async function key(c, k, code, vk, text) {
  await c.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, text });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
}
const centerOf = (sel) => `(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`;
const SECTION_TOP = "Math.round(document.getElementById('cara-kerja').getBoundingClientRect().top)";

const R = { url, waktu: new Date().toISOString() };
const errors = [];
let b;
try {
  b = await launchBrowser();
  const t = await (await fetch(`${b.base}/json/new?about:blank`, { method: 'PUT' })).json();
  const c = await cdp(t.webSocketDebuggerUrl);
  c.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{sessionStorage.setItem('irri-intro','1')}catch(e){}" });

  // 1. Mode normal: Lenis aktif.
  await load(c, url, 1500);
  R.normal = { kelasLenis: await c.evaluate("document.documentElement.classList.contains('lenis')") };
  R.normal.lapisanSiap = await waitFor(c, "document.querySelectorAll('[class*=_drag]').length >= 1", 15000);

  // 2. Roda di atas model 3D hero menggulir halaman.
  await c.evaluate("document.querySelector('[class*=_drag]').scrollIntoView({block:'center'}),true");
  await sleep(1200);
  const p = await c.evaluate(centerOf('[class*=_drag]'));
  R.roda = { targetDiTitik: await c.evaluate(`document.elementFromPoint(${p.x},${p.y}).className`), sebelum: await c.evaluate('Math.round(scrollY)') };
  for (let i = 0; i < 5; i++) { await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY: 120 }); await sleep(60); }
  await sleep(1500);
  R.roda.sesudah = await c.evaluate('Math.round(scrollY)');
  R.roda.lulus = R.roda.sesudah - R.roda.sebelum >= 300 && /_drag/.test(R.roda.targetDiTitik);

  // 3. Seret di lapisan memutar model (dragAngle di iframe), lalu kembali ke pose setelah dilepas.
  await c.evaluate("document.querySelector('[class*=_drag]').scrollIntoView({block:'center'}),true");
  await sleep(1200);
  const q = await c.evaluate(centerOf('[class*=_drag]'));
  const ANGLE = `(()=>{const el=document.elementFromPoint(${q.x},${q.y});const f=el.parentElement.querySelector('iframe');return +f.contentWindow.__prototype.dragAngle.toFixed(3)})()`;
  R.seret = { sebelum: await c.evaluate(ANGLE) };
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.x, y: q.y });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: q.x, y: q.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 10; i++) { await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: q.x + i * 15, y: q.y, button: 'left', buttons: 1 }); await sleep(16); }
  await sleep(100);
  R.seret.saatDitahan = await c.evaluate(ANGLE);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: q.x + 150, y: q.y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(3000);
  R.seret.tigaDetikSetelahLepas = await c.evaluate(ANGLE);
  R.seret.lulus = Math.abs(R.seret.saatDitahan - R.seret.sebelum) > 1 && Math.abs(R.seret.tigaDetikSetelahLepas) < 0.1;

  // 4. Anchor: tombol "Lihat cara kerja" dan tautan nav "Cara kerja". Lintasan harus maju tanpa lompat mundur.
  for (const [nama, sel] of [['tombolHero', 'a[href="#cara-kerja"]'], ['tautanNav', 'nav a[href="/#cara-kerja"]']]) {
    await c.evaluate('window.scrollTo(0,0),true');
    await sleep(1200);
    const a = await c.evaluate(centerOf(sel));
    await c.evaluate(SAMPLER(3000));
    await click(c, a.x, a.y);
    await sleep(3300);
    R[`anchor_${nama}`] = { ...(await c.evaluate(ANALYZE)), jarakAkhirKeSectionPx: await c.evaluate(SECTION_TOP), hash: await c.evaluate('location.hash') };
  }

  // 5. Keyboard: PageDown dan Spasi tetap menggulir.
  await c.evaluate('window.scrollTo(0,0),document.activeElement&&document.activeElement.blur(),true');
  await sleep(1200);
  const k0 = await c.evaluate('Math.round(scrollY)');
  await key(c, 'PageDown', 'PageDown', 34);
  await sleep(1200);
  const k1 = await c.evaluate('Math.round(scrollY)');
  await key(c, ' ', 'Space', 32, ' ');
  await sleep(1200);
  const k2 = await c.evaluate('Math.round(scrollY)');
  R.keyboard = { awal: k0, setelahPageDown: k1, setelahSpasi: k2, lulus: k1 > k0 + 200 && k2 > k1 + 200 };

  // 5b. Enter pada tombol "Lihat cara kerja" yang difokus keyboard.
  await c.evaluate('window.scrollTo(0,0),true');
  await sleep(1200);
  await c.evaluate(`document.querySelector('a[href="#cara-kerja"]').focus(),true`);
  await key(c, 'Enter', 'Enter', 13, '\r');
  await sleep(3300);
  R.keyboard.enterJarakKeSectionPx = await c.evaluate(SECTION_TOP);
  R.keyboard.lulus = R.keyboard.lulus && Math.abs(R.keyboard.enterJarakKeSectionPx) <= 4;

  // 6. Kurangi gerak: tanpa Lenis, anchor langsung mendarat.
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load(c, url, 1500);
  R.kurangiGerak = { kelasLenis: await c.evaluate("document.documentElement.classList.contains('lenis')"), iframe: await c.evaluate("document.querySelectorAll('iframe').length") };
  await c.evaluate('window.scrollTo(0,0),true');
  await sleep(400);
  const a2 = await c.evaluate(centerOf('a[href="#cara-kerja"]'));
  await click(c, a2.x, a2.y);
  await sleep(500);
  R.kurangiGerak.jarakKeSectionPx = await c.evaluate(SECTION_TOP);
  R.kurangiGerak.lulus = !R.kurangiGerak.kelasLenis && Math.abs(R.kurangiGerak.jarakKeSectionPx) <= 4;
  await c.send('Emulation.setEmulatedMedia', { features: [] });

  // 7. Layar sentuh 375 px (pointer kasar): tanpa Lenis, tanpa overflow, lapisan seret tetap membiarkan gesek vertikal.
  await c.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await load(c, url, 1500);
  const lapisan = await waitFor(c, "document.querySelectorAll('[class*=_drag]').length >= 1", 15000);
  R.sentuh = {
    pointerKasar: await c.evaluate("matchMedia('(pointer: coarse)').matches"),
    tanpaHover: await c.evaluate("matchMedia('(hover: none)').matches"),
    kelasLenis: await c.evaluate("document.documentElement.classList.contains('lenis')"),
    overflowPx: await c.evaluate('document.documentElement.scrollWidth - innerWidth'),
    lapisanSeret: lapisan,
    touchAction: lapisan ? await c.evaluate("getComputedStyle(document.querySelector('[class*=_drag]')).touchAction") : null,
  };
  R.sentuh.lulus = (R.sentuh.pointerKasar || R.sentuh.tanpaHover) && !R.sentuh.kelasLenis && R.sentuh.overflowPx <= 0 && (!lapisan || R.sentuh.touchAction === 'pan-y');
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: false });

  R.errorKonsol = errors;
  c.close();
} catch (e) {
  R.galat = String(e.message ?? e);
  R.errorKonsol = errors;
} finally {
  await closeBrowser(b);
}

console.log(JSON.stringify(R, null, 2));
if (out) writeFileSync(out, `${JSON.stringify(R, null, 2)}\n`);
process.exit(R.galat ? 2 : 0);
