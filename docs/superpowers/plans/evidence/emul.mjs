const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost:3000'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const probe = `(() => { const h1 = document.querySelector('h1'); const intro = document.querySelector('.intro');
  return { reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, dataIntro: document.documentElement.dataset.intro ?? null,
    overlayShown: intro ? getComputedStyle(intro).display !== 'none' && getComputedStyle(intro).visibility !== 'hidden' && getComputedStyle(intro).opacity !== '0' : false,
    iframes: document.querySelectorAll('iframe').length, h1Text: h1 && h1.textContent, h1Visible: h1 && getComputedStyle(h1).visibility,
    splitChars: document.querySelectorAll('h1 .split-char').length, targets: [...document.querySelectorAll('dd')].map((d) => d.textContent.trim()).slice(0, 3),
    storyAttr: document.getElementById('cara-langkah')?.dataset.story ?? null, htmlClass: document.documentElement.className.replace(/\\S*__variable\\S*/g, '').trim() }; })()`;
const out = {};
await send('Page.enable');
out.cdpMethods = {};
const r1 = await send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
out.cdpMethods.setEmulatedMedia = r1.error ? r1.error.message : 'ok';
await send('Runtime.evaluate', { expression: "sessionStorage.removeItem('irri-intro')" });
await send('Page.navigate', { url: 'http://localhost:3000/' }); await sleep(6000);
out.reducedMotion = await ev(probe);
await send('Emulation.setEmulatedMedia', { media: '', features: [] });
const r2 = await send('Emulation.setScriptExecutionDisabled', { value: true });
out.cdpMethods.setScriptExecutionDisabled = r2.error ? r2.error.message : 'ok';
await send('Page.navigate', { url: 'http://localhost:3000/' }); await sleep(4000);
out.noJavaScript = await ev(probe);
await send('Emulation.setScriptExecutionDisabled', { value: false });
const r3 = await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 });
out.cdpMethods.emulateNetworkConditions = r3.error ? r3.error.message : 'ok';
await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
const r4 = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value}).observe({type:"layout-shift",buffered:true})' });
out.cdpMethods.addScriptToEvaluateOnNewDocument = r4.error ? r4.error.message : 'ok';
console.log(JSON.stringify(out, null, 1));
ws.close();
