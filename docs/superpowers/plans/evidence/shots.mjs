import { writeFileSync } from 'node:fs';
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find((t) => t.type === 'page' && t.url.startsWith('https://kasane-keyboard.com'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 810, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'https://kasane-keyboard.com/' });
await sleep(6000);
const info = await ev(`(() => { const s = document.querySelector('#threeDScrollSection'); const r = s.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), h: Math.round(r.height), H: document.documentElement.scrollHeight }; })()`);
console.log(JSON.stringify(info));
const marks = [['hero', 0], ['pra-cerita', Math.max(0, info.top - 500)], ['cerita-0', info.top], ['cerita-33', info.top + info.h * 0.33], ['cerita-66', info.top + info.h * 0.66], ['cerita-akhir', info.top + info.h - 810], ['sesudah', info.top + info.h + 700], ['dasar', info.H - 810]];
for (const [name, y] of marks) {
  await ev(`window.scrollTo(0, ${Math.round(y)})`); await sleep(1800);
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 55, clip: { x: 0, y: 0, width: 1440, height: 810, scale: 0.45 } });
  writeFileSync(`shot-${name}.jpg`, Buffer.from(r.result.data, 'base64')); console.log('ok', name, Math.round(y));
}
ws.close();
