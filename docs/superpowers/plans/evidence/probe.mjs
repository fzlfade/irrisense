// Probe jaringan + DOM untuk halaman referensi lewat CDP (loopback). Hanya membaca; tidak mengubah situs.
import { readFileSync, writeFileSync } from 'node:fs';

const url = process.argv[2] ?? 'https://kasane-keyboard.com/';
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find((t) => t.type === 'page' && t.url.startsWith(new URL(url).origin));
if (!page) { console.error('target tidak ditemukan'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map(); const reqs = new Map(); let loaded = false;
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  const p = msg.params;
  if (msg.method === 'Network.requestWillBeSent') reqs.set(p.requestId, { url: p.request.url, type: p.type ?? 'Other', bytes: 0 });
  if (msg.method === 'Network.responseReceived' && reqs.has(p.requestId)) { const r = reqs.get(p.requestId); r.mime = p.response.mimeType; r.status = p.response.status; r.type = p.type ?? r.type; }
  if (msg.method === 'Network.loadingFinished' && reqs.has(p.requestId)) reqs.get(p.requestId).bytes = p.encodedDataLength;
  if (msg.method === 'Page.loadEventFired') loaded = true;
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Network.enable'); await send('Page.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Page.navigate', { url });
for (let i = 0; i < 80 && !loaded; i++) await sleep(250);
await sleep(2500);

const H = await ev('document.documentElement.scrollHeight'); const vh = await ev('innerHeight');
const steps = [];
for (let y = 0; y < H; y += Math.round(vh * 0.5)) { await ev(`window.scrollTo(0, ${y})`); await sleep(450); steps.push(y); }
await sleep(3000);

const dom = await ev(`(() => {
  const gs = (e) => getComputedStyle(e);
  const sec = document.querySelector('#threeDScrollSection'); const r = sec && sec.getBoundingClientRect();
  const stickies = [...document.querySelectorAll('*')].filter((e) => gs(e).position === 'sticky').slice(0, 8).map((e) => ({ tag: e.tagName, top: gs(e).top, h: Math.round(e.getBoundingClientRect().height) }));
  const hs = [...document.querySelectorAll('h1,h2')].slice(0, 8).map((e) => ({ t: e.tagName, fs: gs(e).fontSize, lh: gs(e).lineHeight, ls: gs(e).letterSpacing, fw: gs(e).fontWeight, ff: gs(e).fontFamily.split(',')[0].slice(0, 30) }));
  return {
    htmlClass: document.documentElement.className.slice(0, 120), scrollH: document.documentElement.scrollHeight, vh: innerHeight, vw: innerWidth,
    story: r && { heightPx: Math.round(r.height), heightInVh: +(r.height / innerHeight).toFixed(2) },
    canvases: [...document.querySelectorAll('canvas')].map((c) => c.width + 'x' + c.height),
    videos: [...document.querySelectorAll('video')].map((v) => ({ file: (v.currentSrc || v.src || '').split('/').pop().slice(0, 48), autoplay: v.autoplay, muted: v.muted, loop: v.loop, playsInline: v.playsInline, preload: v.preload })),
    stickies, headings: hs,
    fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '') + ' ' + f.weight))].slice(0, 10),
    reducedMotionRules: [...document.styleSheets].reduce((n, s) => { try { return n + [...s.cssRules].filter((x) => x.media && /prefers-reduced-motion/.test(x.media.mediaText)).length; } catch { return n; } }, 0),
  };
})()`);

const all = [...reqs.values()].filter((r) => r.bytes > 0 || r.status);
const by = {}; let total = 0;
for (const r of all) { const t = r.type; by[t] ??= { n: 0, bytes: 0 }; by[t].n++; by[t].bytes += r.bytes; total += r.bytes; }
const mimeCount = {}; for (const r of all) if (/Image|Media|Font/.test(r.type)) { const k = r.type + ' ' + (r.mime ?? '?'); mimeCount[k] = (mimeCount[k] ?? 0) + 1; }
const top = all.sort((a, b) => b.bytes - a.bytes).slice(0, 12).map((r) => ({ type: r.type, kb: Math.round(r.bytes / 1024), file: new URL(r.url).pathname.split('/').pop().slice(0, 50) }));
const out = { url, scrollSteps: steps.length, pageHeightPx: H, totalKB: Math.round(total / 1024), byType: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { n: v.n, kb: Math.round(v.bytes / 1024) }])), mimeCount, top, dom };
writeFileSync(process.argv[3] ?? 'probe-out.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
ws.close();
