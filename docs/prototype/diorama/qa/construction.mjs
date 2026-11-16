// Cek konstruksi pada build yang dimuat di browser (posisi dunia hidup), plus injeksi negatif.
// Normal harus lolos; ?inject=dripper dan ?inject=pot harus GAGAL pada cek yang tepat.
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PAGE = process.env.PAGE || pathToFileURL(resolve('irrisense-diorama.html')).href;
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = { page: PAGE, runs: [] };
let failed = false;
try {
  for (const [inject, expectFail] of [['', null], ['dripper', 'dripper-1 tertancap di tanah'], ['pot', 'polybag-1 tidak menembus pipa']]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(PAGE + (inject ? `?inject=${inject}` : ''));
    await page.waitForFunction(() => window.__dioramaReady === true, null, { timeout: 30000 });
    const runs = [];
    for (const t of [0, 9, 15.2]) runs.push(await page.evaluate((t) => { window.__diorama.freeze(t); return window.__diorama.construction(); }, t));
    const r = runs[0], allSame = runs.every((x) => x.pass === r.pass);
    const failedIds = r.results.filter((x) => !x.pass).map((x) => x.id);
    let ok;
    if (!expectFail) {
      ok = r.pass && allSame && errors.length === 0;
      console.log(`[normal] ${r.results.length} cek, ${failedIds.length} gagal, error konsol: ${errors.length} -> ${ok ? 'LULUS' : 'GAGAL'}`);
      for (const x of r.results.filter((x) => !x.pass)) console.log(`   GAGAL ${x.id}: ${x.detail}`);
    } else {
      ok = !r.pass && failedIds.includes(expectFail);
      console.log(`[inject=${inject}] gagal pada: ${failedIds.join('; ') || '(tidak ada)'} -> ${ok ? 'TERDETEKSI (benar)' : 'TIDAK TERDETEKSI'}`);
    }
    if (!ok) failed = true;
    report.runs.push({ inject: inject || 'normal', expectFail, ok, errors, results: r.results });
    await page.close();
  }
} finally {
  await browser.close();
}
mkdirSync('qa', { recursive: true });
writeFileSync('qa/report.json', JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
