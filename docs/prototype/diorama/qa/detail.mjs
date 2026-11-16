// Close-up QA: bekukan waktu, pindahkan kamera debug ke titik tertentu, potret, lalu reset ke pose hero.
// Bukti visual untuk komponen kecil (LCD/LED/DHT11, dripper + tetes, galon + pompa, sisi belakang).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PAGE = pathToFileURL(resolve('irrisense-diorama.html')).href;
const VIEWS = [
  { name: 'casing-off', t: 3, pos: [0.12, 0.26, 0.75], tgt: [0, 0.17, 0.33] },
  { name: 'casing-on', t: 9, pos: [0.12, 0.26, 0.75], tgt: [0, 0.17, 0.33] },
  { name: 'dripper-depan', t: 9, pos: [0.05, 0.42, 0.62], tgt: [-0.13, 0.19, 0.12] },
  { name: 'dripper-belakang', t: 9, pos: [-0.2, 0.55, -0.55], tgt: [-0.13, 0.19, -0.12] },
  { name: 'galon-pompa', t: 9, pos: [-0.55, 0.35, 0.65], tgt: [-0.78, 0.22, 0] },
  { name: 'belakang-tinggi', t: 9, pos: [-1.6, 1.9, -2.1], tgt: [-0.15, 0.25, 0] },
];
mkdirSync('qa/detail', { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(PAGE);
  await page.waitForFunction(() => window.__dioramaReady === true, null, { timeout: 30000 });
  for (const v of VIEWS) {
    await page.evaluate((v) => {
      const d = window.__diorama; d.freeze(v.t);
      d.camera.position.set(...v.pos); d.orbit.controls.target.set(...v.tgt); d.orbit.controls.update();
      d.renderer.render(d.scene, d.camera); // jalur OutlineEffect tetap lewat render() berikut
    }, v);
    await page.evaluate(() => window.__diorama.orbit.controls.dispatchEvent({ type: 'change' }));
    await page.screenshot({ path: `qa/detail/${v.name}.png` });
  }
  const back = await page.evaluate(() => { const d = window.__diorama; d.freeze(0); return d.camera.position.toArray().map((n) => n.toFixed(2)).join(','); });
  console.log(`detail: ${VIEWS.length} potret, kamera setelah reset: ${back}, error: ${errors.length ? errors.join(' | ') : 'tidak ada'}`);
} finally {
  await browser.close();
}
