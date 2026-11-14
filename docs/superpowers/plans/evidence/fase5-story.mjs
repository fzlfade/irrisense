// Verifikasi Fase 5 (panggung cerita: progres induk, perakitan model, sorot langkah) lewat CDP di Edge headless, hanya loopback.
// Pakai: node docs/superpowers/plans/evidence/fase5-story.mjs [url] [--port 9335] [--out berkas.json] [--shots folder]
// Yang diuji: panggung menempel dan progres 0..1; perakitan pada p = 0 / 0,33 / 0,66 / 1 (terurai, urut, utuh);
// langkah aktif sama di daftar dan di model; kontras langkah redup; tidak ada ScrollTrigger yang bocor saat mode
// cerita berganti lewat ubah ukuran; roda dan seret di atas panggung; CLS; "kurangi gerak", layar pendek, sentuh 375 px.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const url = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'http://localhost:3000/';
const port = Number(opt('--port', 9335));
const out = opt('--out', null);
const shots = opt('--shots', null);
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
  const profile = mkdtempSync(path.join(tmpdir(), 'irri-fase5-'));
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
const metrics = (c, width, height, mobile = false) => c.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });

const STAGE = '[data-story="on"]';
const FRAME = `document.querySelector('${STAGE} iframe')`;
const PROTO = `${FRAME}.contentWindow.__prototype`;
const READY = `!!(${FRAME} && ${FRAME}.style.opacity === '1' && ${FRAME}.contentWindow.__prototype)`;
// GSAP tidak dipasang di window. Kelas ScrollTrigger diambil dari konteks useGSAP milik CaraStory (ref React pada fiber
// elemen panggung), lalu disimpan di window.__st oleh uji ini saja; kode aplikasi tidak diubah untuk keperluan uji.
const FIND_ST = `(()=>{if(window.__st)return true;const el=document.querySelector('${STAGE}');if(!el)return false;
  const key=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));for(let f=el[key];f;f=f.return){
  for(let h=f.memoizedState;h&&typeof h==='object'&&'next' in h;h=h.next){const ctx=h.memoizedState&&h.memoizedState.current;
  if(ctx&&Array.isArray(ctx.data)&&typeof ctx.revert==='function'){const st=ctx.data.find(a=>a&&a.scrollTrigger);if(st){window.__st=st.scrollTrigger.constructor;return true}}}}
  return false})()`;
const TRIGGERS = 'window.__st ? window.__st.getAll().length : null';
const scrollToP = (p) => `(()=>{const w=document.querySelector('${STAGE}');const top=w.getBoundingClientRect().top+scrollY;window.scrollTo(0,Math.round(top+${p}*(w.offsetHeight-innerHeight)));return true})()`;
const STEPS = "Array.from(document.querySelectorAll('#cara-langkah > li'))";
// Kontras WCAG warna teks langkah terhadap latar section (--surface), dibaca dari gaya terhitung.
const CONTRAST = `(()=>{
  const parse=(s)=>{const m=s.match(/[\\d.]+/g).map(Number);return /^color\\(/.test(s)?m.slice(0,3).map(v=>v*255):m.slice(0,3)};
  const lum=(c)=>{const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
  const bg=parse(getComputedStyle(document.getElementById('cara-kerja')).backgroundColor);
  return ${STEPS}.map(li=>{const a=lum(parse(getComputedStyle(li).color)),b=lum(bg);return +((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2)});
})()`;

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
  await metrics(c, 1280, 800);
  await c.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "try{sessionStorage.setItem('irri-intro','1')}catch(e){};window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true})}catch(e){}",
  });

  // 1. Panggung: pembungkus setinggi --story-length, panggung menempel, model siap.
  await load(c, url, 1500);
  R.panggung = await c.evaluate(`(()=>{const w=document.querySelector('${STAGE}');if(!w)return{ada:false};const st=w.firstElementChild;return{ada:true,tinggiPembungkusLayar:+(w.offsetHeight/innerHeight).toFixed(2),posisi:getComputedStyle(st).position,tinggiPanggungPx:st.offsetHeight,iframeCerita:!!w.querySelector('iframe[src*="story=1"]')}})()`);
  await c.evaluate(scrollToP(0));
  R.panggung.modelSiap = await waitFor(c, READY, 30000);
  R.panggung.kelasScrollTriggerDitemukan = await c.evaluate(FIND_ST);
  R.panggung.triggerAwal = await c.evaluate(TRIGGERS);

  // 2. Progres 0 / 0,33 / 0,66 / 1: perakitan, langkah aktif di daftar dan model, kontras, tangkapan layar.
  if (shots) mkdirSync(shots, { recursive: true });
  R.progres = [];
  for (const p of [0, 0.33, 0.66, 1]) {
    await c.evaluate(scrollToP(p));
    for (let i = 0; i < 80; i++) { const st = await c.evaluate(`${PROTO}.story`); if (Math.abs(st.now - st.goal) < 0.002) break; await sleep(150); }
    await sleep(800);
    const row = {
      p,
      // "+ 0" mengubah -0 menjadi 0 (CDP tidak bisa mengirim -0 sebagai nilai).
      panggungTopPx: await c.evaluate(`Math.round(document.querySelector('${STAGE}').firstElementChild.getBoundingClientRect().top) + 0`),
      model: await c.evaluate(`(()=>{const s=${PROTO}.story;return{now:+s.now.toFixed(3),langkah:s.idx}})()`),
      dirakit: await c.evaluate(`${PROTO}.assembled`),
      langkahAktifDaftar: await c.evaluate(`${STEPS}.findIndex(li=>li.dataset.active==='true')`),
      lit: await c.evaluate(`${STEPS}.map(li=>+(+li.style.getPropertyValue('--lit')).toFixed(2))`),
      kontrasLangkah: await c.evaluate(CONTRAST),
    };
    if (shots) {
      // clip memakai koordinat dokumen, jadi y = posisi gulir saat ini.
      const y = await c.evaluate('Math.round(scrollY)');
      const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 55, clip: { x: 0, y, width: 1280, height: 800, scale: 0.5 } });
      row.gambar = `p${String(p).replace('.', '_')}.jpg`;
      writeFileSync(path.join(shots, row.gambar), Buffer.from(shot.data, 'base64'));
    }
    R.progres.push(row);
  }
  const rows = R.progres;
  const monoton = rows.every((r, i) => !i || r.dirakit.every((v, k) => v >= rows[i - 1].dirakit[k]));
  const urut = rows.every((r) => r.dirakit.every((v, k) => !k || v <= r.dirakit[k - 1]));
  R.perakitan = {
    terurai0: rows[0].dirakit.every((v) => v === 0),
    utuh1: rows[3].dirakit.every((v) => v === 1),
    monoton,
    urutSesuaiLangkah: urut,
    langkahSama: rows.every((r) => r.langkahAktifDaftar === r.model.langkah),
    langkahDiharapkan: rows.map((r) => r.langkahAktifDaftar).join(',') === '0,1,2,3',
    panggungMenempel: rows.every((r) => r.panggungTopPx === 0),
    kontrasMin: Math.min(...rows.flatMap((r) => r.kontrasLangkah)),
  };
  R.perakitan.lulus = Object.entries(R.perakitan).every(([k, v]) => (k === 'kontrasMin' ? v >= 4.5 : v === true));

  // 3. Roda di atas panggung menggulir halaman (progres naik); seret memutar model dan kembali setelah dilepas.
  await c.evaluate(scrollToP(0.4));
  await sleep(1500);
  const box = await c.evaluate(`(()=>{const r=document.querySelector('${STAGE} [class*=_drag]').getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`);
  R.roda = { sebelum: await c.evaluate('Math.round(scrollY)'), targetDiTitik: await c.evaluate(`document.elementFromPoint(${box.x},${box.y}).className`) };
  for (let i = 0; i < 4; i++) { await c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: 120 }); await sleep(60); }
  await sleep(1500);
  R.roda.sesudah = await c.evaluate('Math.round(scrollY)');
  R.roda.lulus = R.roda.sesudah - R.roda.sebelum >= 200 && /_drag/.test(R.roda.targetDiTitik);
  const ANGLE = `(+${PROTO}.dragAngle.toFixed(3)) + 0`;
  R.seret = { sebelum: await c.evaluate(ANGLE) };
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 10; i++) { await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x + i * 15, y: box.y, button: 'left', buttons: 1 }); await sleep(16); }
  await sleep(150);
  R.seret.saatDitahan = await c.evaluate(ANGLE);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x + 150, y: box.y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(3000);
  R.seret.tigaDetikSetelahLepas = await c.evaluate(ANGLE);
  R.seret.lulus = Math.abs(R.seret.saatDitahan - R.seret.sebelum) > 1 && Math.abs(R.seret.tigaDetikSetelahLepas) < 0.1;

  // 4. Ganti mode lewat ubah ukuran (lebar <-> sempit, dua kali) dan ubah ukuran dalam mode yang sama:
  //    jumlah ScrollTrigger kembali ke angka awal, iframe cerita dimuat ulang tanpa error.
  const snap = async (label) => ({ label, cerita: await c.evaluate(`!!document.querySelector('${STAGE}')`), trigger: await c.evaluate(TRIGGERS), iframeCerita: await c.evaluate("document.querySelectorAll('iframe[src*=\"story=1\"]').length") });
  R.gantiMode = [await snap('1280 awal')];
  for (let i = 0; i < 2; i++) {
    await metrics(c, 900, 800); await sleep(1200); R.gantiMode.push(await snap('900'));
    await metrics(c, 1280, 800); await sleep(1200); R.gantiMode.push(await snap('1280'));
  }
  await metrics(c, 1440, 900); await sleep(1200); R.gantiMode.push(await snap('1440'));
  await metrics(c, 1280, 800); await sleep(1200); R.gantiMode.push(await snap('1280 akhir'));
  const lebar = R.gantiMode.filter((s) => s.cerita);
  R.gantiModeLulus = Number.isInteger(lebar[0].trigger) && lebar.every((s) => s.trigger === lebar[0].trigger && s.iframeCerita === 1)
    && R.gantiMode.filter((s) => !s.cerita).every((s) => s.trigger === lebar[0].trigger - 1 && s.iframeCerita === 0);

  // 5. Keyboard: Tab dari awal halaman sampai tautan "Coba prototipe 3D" di panggung; tautan harus terlihat di layar.
  await load(c, url, 1500);
  R.tab = { urutan: [] };
  for (let i = 0; i < 15; i++) {
    await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(700);
    const a = await c.evaluate("(()=>{const e=document.activeElement;const r=e.getBoundingClientRect();return{teks:(e.textContent||'').trim().slice(0,40),href:e.getAttribute('href'),terlihat:r.top>=0&&r.bottom<=innerHeight&&r.height>0}})()");
    R.tab.urutan.push(a.teks);
    if (a.href === '/prototipe/' && a.teks.startsWith('Coba')) { R.tab.tautanPanggung = a; break; }
  }
  R.tab.lulus = Boolean(R.tab.tautanPanggung?.terlihat);

  // 6. CLS selama gulir penuh halaman.
  await load(c, url, 1500);
  const h = await c.evaluate('document.documentElement.scrollHeight');
  for (let y = 0; y <= h; y += 400) { await c.evaluate(`window.scrollTo(0,${y}),true`); await sleep(120); }
  await sleep(800);
  R.cls = +(await c.evaluate('window.__cls')).toFixed(4);

  // 7. Kurangi gerak: tanpa panggung, tanpa iframe, daftar biasa.
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load(c, url, 1500);
  R.kurangiGerak = { panggung: await c.evaluate(`!!document.querySelector('${STAGE}')`), iframe: await c.evaluate("document.querySelectorAll('iframe').length"), tinggiCaraKerjaLayar: await c.evaluate("+(document.getElementById('cara-kerja').offsetHeight/innerHeight).toFixed(2)") };
  R.kurangiGerak.lulus = !R.kurangiGerak.panggung && R.kurangiGerak.iframe === 0 && R.kurangiGerak.tinggiCaraKerjaLayar < 2;
  await c.send('Emulation.setEmulatedMedia', { features: [] });

  // 8. Layar lebar tetapi pendek (1280 x 560, di bawah 36rem): tanpa panggung.
  await metrics(c, 1280, 560);
  await load(c, url, 1500);
  R.layarPendek = { panggung: await c.evaluate(`!!document.querySelector('${STAGE}')`) };
  R.layarPendek.lulus = !R.layarPendek.panggung;

  // 9. Layar sentuh 375 px: tanpa panggung, tanpa overflow.
  await metrics(c, 375, 812, true);
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await load(c, url, 1500);
  R.sentuh = { panggung: await c.evaluate(`!!document.querySelector('${STAGE}')`), overflowPx: await c.evaluate('document.documentElement.scrollWidth - innerWidth') };
  R.sentuh.lulus = !R.sentuh.panggung && R.sentuh.overflowPx <= 0;
  await c.send('Emulation.setTouchEmulationEnabled', { enabled: false });

  R.errorKonsol = errors;
  R.lulusSemua = Boolean(R.panggung.ada && R.panggung.modelSiap && R.perakitan.lulus && R.roda.lulus && R.seret.lulus
    && R.gantiModeLulus && R.tab.lulus && R.cls <= 0.05 && R.kurangiGerak.lulus && R.layarPendek.lulus && R.sentuh.lulus && !errors.length);
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
