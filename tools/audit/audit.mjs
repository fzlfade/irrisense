#!/usr/bin/env node
// Audit landing IrriSense terhadap anggaran (tools/audit/budgets.json).
// Mengukur: ukuran berkas hasil build, REA inspect-web-page (DOM, landmark, nama kontrol),
// probe CDP (transfer jaringan, CLS saat scroll penuh), emulasi "kurangi gerak" dan "tanpa JavaScript".
//
// Pemakaian:
//   node tools/audit/audit.mjs [url] [--budgets <berkas>] [--out <berkas>] [--port <n>] [--no-browser]
// Kode keluar: 0 semua lulus, 1 ada anggaran gagal, 2 audit tidak bisa dijalankan.

import { execFileSync, execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const REA = 'rea-agents@6.8.0';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kb = (bytes) => Math.round(bytes / 102.4) / 10;

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const url = args.find((a) => /^https?:\/\//.test(a)) ?? 'http://localhost:3000/';
const useBrowser = !args.includes('--no-browser');
const budgetsPath = path.resolve(opt('--budgets', path.join(here, 'budgets.json')));
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outPath = path.resolve(opt('--out', path.join(here, 'out', `audit-${stamp}.json`)));
const port = Number(opt('--port', '9333'));

// ---------- ukuran berkas ----------
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}
function sizes(files) {
  let raw = 0, gz = 0;
  for (const f of files) { const b = readFileSync(f); raw += b.length; gz += zlib.gzipSync(b).length; }
  return { files: files.length, rawKB: kb(raw), gzipKB: kb(gz) };
}
function staticMetrics() {
  const out = path.join(root, 'landing', 'out');
  if (!existsSync(path.join(out, 'index.html'))) throw new Error('landing/out belum ada: jalankan `npm run build` di landing/');
  const all = walk(out);
  const iframeFiles = [
    'backend/prototipe/scene.js', 'backend/prototipe/sim.js',
    'backend/node_modules/three/build/three.module.min.js',
    'backend/node_modules/three/examples/jsm/controls/OrbitControls.js',
  ].map((f) => path.join(root, f));
  // Poster hero = <img fetchpriority="high"> pertama di index.html hasil build.
  const html = readFileSync(path.join(out, 'index.html'), 'utf8');
  const tag = (html.match(/<img[^>]*fetchpriority="high"[^>]*>/i) || [])[0];
  const src = tag && (tag.match(/\ssrc="([^"]+)"/i) || [])[1];
  const posterFile = src ? path.join(out, decodeURI(src.split('?')[0])) : null;
  return {
    landingJs: sizes(all.filter((f) => f.endsWith('.js'))),
    landingCss: sizes(all.filter((f) => f.endsWith('.css'))),
    landingFonts: sizes(all.filter((f) => f.endsWith('.woff2'))),
    iframeJs: sizes(iframeFiles.filter((f) => existsSync(f))),
    heroPoster: { src: src ?? null, KB: posterFile && existsSync(posterFile) ? kb(statSync(posterFile).size) : null },
  };
}

// ---------- browser (Edge/Chrome headless, hanya loopback) ----------
const BROWSERS = [
  process.env.AUDIT_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean);

async function launchBrowser() {
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) throw new Error('Edge/Chrome tidak ditemukan; set AUDIT_BROWSER');
  const base = `http://127.0.0.1:${port}`;
  try { await fetch(`${base}/json/version`); throw new Error(`port ${port} sudah dipakai; pilih --port lain`); } catch (e) { if (/sudah dipakai/.test(e.message)) throw e; }
  const profile = mkdtempSync(path.join(tmpdir(), 'irri-audit-'));
  const child = spawn(exe, [
    '--headless=new', `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 80; i++) {
    try { const v = await (await fetch(`${base}/json/version`)).json(); return { child, profile, base, version: v.Browser }; } catch { await sleep(250); }
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
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
  return { send, evaluate, on: (fn) => listeners.add(fn), off: (fn) => listeners.delete(fn), close: () => ws.close() };
}

async function navigate(c, target, settleMs) {
  let loaded = false;
  const fn = (msg) => { if (msg.method === 'Page.loadEventFired') loaded = true; };
  c.on(fn);
  await c.send('Page.navigate', { url: target });
  for (let i = 0; i < 120 && !loaded; i++) await sleep(250);
  c.off(fn);
  await sleep(settleMs);
}

function runRea(base, targetId) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'irri-rea-'));   // README REA: jalankan npx di luar proyek target
  try {
    // Hanya konstanta, port angka, dan ID target heksadesimal dari CDP yang masuk ke perintah ini.
    if (!/^[A-F0-9]+$/i.test(targetId)) throw new Error('ID target tidak valid');
    const out = execSync(`npx -y ${REA} inspect-web-page ${base} ${targetId} --observation-ms 3000 --include-accessibility-text --format json`, {
      cwd, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 300000, stdio: ['ignore', 'pipe', 'ignore'],
    });
    const j = JSON.parse(out);
    if (j.code || j.error) return { error: j.message ?? j.error };
    const n = j.normalized_result;
    const live = n.accessibility.nodes.filter((x) => !x.ignored);
    const controls = live.filter((x) => x.role === 'button' || x.role === 'link');
    const resources = {};
    for (const r of n.resources) { resources[r.type] ??= { count: 0, KB: 0 }; resources[r.type].count++; resources[r.type].KB = kb(resources[r.type].KB * 1024 + (r.content_size ?? 0)); }
    return {
      evidenceId: j.evidence_id,
      frames: n.frames.length,
      domNodes: n.dom.total_nodes,
      a11yNodes: n.accessibility.total_nodes,
      scripts: n.scripts.total,
      landmarks: [...new Set(live.filter((x) => /^(banner|navigation|main|contentinfo|complementary|region|search|form)$/.test(x.role)).map((x) => x.role))],
      controls: controls.length,
      unnamedControls: controls.filter((x) => !x.name).length,
      resources,
    };
  } catch (e) {
    return { error: `REA gagal: ${e.message.split('\n')[0]}` };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const CLS_SCRIPT = "window.__cls=0;try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(!e.hadRecentInput)window.__cls+=e.value})}).observe({type:'layout-shift',buffered:true})}catch(e){window.__cls=null}";

function checkScript(checks) {
  return `(() => {
    const intro = document.querySelector(${JSON.stringify(checks.introSelector)});
    const cs = intro && getComputedStyle(intro);
    const h1 = document.querySelector('h1');
    return {
      overlayShown: !!(cs && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0'),
      iframes: document.querySelectorAll('iframe').length,
      h1Visible: !!h1 && getComputedStyle(h1).visibility === 'visible',
      targets: [...document.querySelectorAll(${JSON.stringify(checks.targetSelector)})].map((d) => d.textContent.trim()),
    };
  })()`;
}

async function browserMetrics(budgets) {
  const b = await launchBrowser();
  try {
    const t = await (await fetch(`${b.base}/json/new?${url}`, { method: 'PUT' })).json();
    let c = await cdp(t.webSocketDebuggerUrl);
    await c.send('Page.enable');
    await c.send('Network.enable');
    await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    const { identifier } = await c.send('Page.addScriptToEvaluateOnNewDocument', { source: `${budgets.checks.skipIntroScript};${CLS_SCRIPT}` });

    // 1) Muat halaman: catat transfer jaringan dan apakah respons dikompresi.
    const reqs = new Map();
    const onNet = (msg) => {
      const p = msg.params;
      if (msg.method === 'Network.responseReceived') {
        const h = p.response.headers ?? {};
        reqs.set(p.requestId, { type: p.type ?? 'Other', bytes: 0, encoded: Boolean(h['content-encoding'] ?? h['Content-Encoding']) });
      }
      if (msg.method === 'Network.loadingFinished' && reqs.has(p.requestId)) reqs.get(p.requestId).bytes = p.encodedDataLength;
    };
    c.on(onNet);
    await navigate(c, url, 4000);
    c.off(onNet);
    const transfer = { totalKB: 0, byType: {}, compressedResponses: 0, responses: reqs.size };
    for (const r of reqs.values()) {
      transfer.byType[r.type] ??= { count: 0, KB: 0 };
      transfer.byType[r.type].count++;
      transfer.byType[r.type].KB = kb(transfer.byType[r.type].KB * 1024 + r.bytes);
      transfer.totalKB = kb(transfer.totalKB * 1024 + r.bytes);
      if (r.encoded) transfer.compressedResponses++;
    }
    c.close();

    // 2) REA inspect-web-page pada halaman yang sama (sambungan CDP kita ditutup dulu).
    const rea = runRea(b.base, t.id);

    // 3) Scroll penuh bertahap, lalu baca CLS.
    c = await cdp(t.webSocketDebuggerUrl);
    await c.send('Page.enable');
    const H = await c.evaluate('document.documentElement.scrollHeight');
    const vh = await c.evaluate('innerHeight');
    for (let y = 0; y <= H; y += Math.round(vh / 2)) { await c.evaluate(`window.scrollTo({ top: ${y}, behavior: 'instant' })`); await sleep(300); }
    await sleep(1000);
    const cls = await c.evaluate('typeof window.__cls === "number" ? Math.round(window.__cls * 1000) / 1000 : null');
    const pageScreens = Math.round((H / vh) * 10) / 10;

    // 4) Emulasi "kurangi gerak" tanpa melewati intro secara paksa, tanpa scroll.
    // Skrip itu terikat pada sesi CDP pertama yang sudah ditutup; hapus bila masih ada.
    try { await c.send('Page.removeScriptToEvaluateOnNewDocument', { identifier }); } catch { /* sudah hilang bersama sesinya */ }
    await c.evaluate("try{sessionStorage.removeItem('irri-intro')}catch(e){}");
    await c.send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await navigate(c, url, 4000);
    const reducedMotion = await c.evaluate(checkScript(budgets.checks));
    await c.send('Emulation.setEmulatedMedia', { media: '', features: [] });

    // 5) Emulasi "tanpa JavaScript".
    await c.send('Emulation.setScriptExecutionDisabled', { value: true });
    await navigate(c, url, 2500);
    const noJavaScript = await c.evaluate(checkScript(budgets.checks));
    await c.send('Emulation.setScriptExecutionDisabled', { value: false });
    c.close();

    return { browser: b.version, transfer, rea, cls, pageScreens, reducedMotion, noJavaScript };
  } finally {
    await closeBrowser(b);
  }
}

// ---------- penilaian ----------
function evaluateBudgets(budgets, m) {
  const values = {
    landingJsGzipKB: m.static.landingJs.gzipKB,
    iframeJsGzipKB: m.static.iframeJs.gzipKB,
    landingCssKB: m.static.landingCss.rawKB,
    landingFontsKB: m.static.landingFonts.rawKB,
    heroPosterKB: m.static.heroPoster.KB,
    domNodesTotal: m.browser?.rea?.domNodes ?? null,
    unnamedControls: m.browser?.rea?.unnamedControls ?? null,
    cls: m.browser?.cls ?? null,
  };
  const rows = [];
  for (const [key, lim] of Object.entries(budgets.limits)) {
    const value = values[key];
    if (lim.browser && !m.browser) { rows.push({ key, label: lim.label, value: null, limit: `<= ${lim.max}`, status: 'LEWAT' }); continue; }
    rows.push({ key, label: lim.label, value, unit: lim.unit, limit: `<= ${lim.max}`, status: value !== null && value !== undefined && value <= lim.max ? 'LULUS' : 'GAGAL' });
  }
  if (m.browser) {
    const have = m.browser.rea?.landmarks ?? [];
    const missing = budgets.requiredLandmarks.filter((r) => !have.includes(r));
    rows.push({ key: 'landmarks', label: 'Landmark wajib', value: have.join(', ') || '(tidak terukur)', limit: budgets.requiredLandmarks.join(', '), status: m.browser.rea?.error || missing.length ? 'GAGAL' : 'LULUS', missing });
    const exp = budgets.checks.expectedTargets;
    const same = (a) => Array.isArray(a) && exp.every((v, i) => a[i] === v);
    const rm = m.browser.reducedMotion;
    rows.push({ key: 'reducedMotion', label: 'Kurangi gerak: tanpa intro/iframe, angka final', value: JSON.stringify({ intro: rm.overlayShown, iframes: rm.iframes, h1: rm.h1Visible, targets: rm.targets }), limit: 'intro=false, iframes=0, h1, angka final', status: !rm.overlayShown && rm.iframes === 0 && rm.h1Visible && same(rm.targets) ? 'LULUS' : 'GAGAL' });
    const nj = m.browser.noJavaScript;
    rows.push({ key: 'noJavaScript', label: 'Tanpa JavaScript: judul dan angka final', value: JSON.stringify({ intro: nj.overlayShown, h1: nj.h1Visible, targets: nj.targets }), limit: 'intro=false, h1, angka final', status: !nj.overlayShown && nj.h1Visible && same(nj.targets) ? 'LULUS' : 'GAGAL' });
  } else {
    for (const key of ['landmarks', 'reducedMotion', 'noJavaScript']) rows.push({ key, label: key, value: null, limit: '-', status: 'LEWAT' });
  }
  return rows;
}

function gitCommit() {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch { return null; }
}

// ---------- utama ----------
try {
  const budgets = JSON.parse(readFileSync(budgetsPath, 'utf8'));
  const metrics = { static: staticMetrics(), browser: null };
  if (useBrowser) metrics.browser = await browserMetrics(budgets);
  const rows = evaluateBudgets(budgets, metrics);
  const failed = rows.filter((r) => r.status === 'GAGAL');
  const report = {
    meta: { url, date: new Date().toISOString(), commit: gitCommit(), rea: REA, budgets: path.relative(root, budgetsPath), browserMode: useBrowser },
    metrics, results: rows, passed: failed.length === 0,
  };
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Audit ${url}  (commit ${report.meta.commit ?? '?'})`);
  for (const r of rows) {
    const v = r.value === null || r.value === undefined ? '(tidak terukur)' : `${r.value}${r.unit ? ` ${r.unit}` : ''}`;
    console.log(`${r.status.padEnd(6)} ${r.label.padEnd(46)} ${String(v).slice(0, 70).padEnd(24)} ${r.limit}`);
  }
  if (metrics.browser?.rea?.error) console.log(`Peringatan: ${metrics.browser.rea.error}`);
  console.log(`Laporan: ${path.relative(process.cwd(), outPath)}`);
  console.log(failed.length ? `${failed.length} anggaran GAGAL` : 'Semua anggaran LULUS');
  process.exit(failed.length ? 1 : 0);
} catch (e) {
  console.error(`Audit tidak bisa dijalankan: ${e.message}`);
  process.exit(2);
}
