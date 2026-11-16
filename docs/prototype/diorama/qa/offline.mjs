// Standalone harus jalan tanpa jaringan: semua request selain file:// dan data: diblokir.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  const blocked = [], errors = [];
  await page.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('file:') || u.startsWith('data:')) r.continue(); else { blocked.push(u); r.abort(); } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(resolve('irrisense-diorama.html')).href);
  await page.waitForFunction(() => window.__dioramaReady === true, null, { timeout: 30000 });
  const ok = blocked.length === 0 && errors.length === 0;
  console.log(`offline: request jaringan ${blocked.length}, error ${errors.length} -> ${ok ? 'LULUS' : 'GAGAL'}`);
  if (!ok) { console.log(blocked.concat(errors).join('\n')); process.exitCode = 1; }
} finally {
  await browser.close();
}
