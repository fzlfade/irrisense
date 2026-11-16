// Disalin dari templates/build.mjs (Diorama c790df5). Perubahan: halaman Indonesia, latar kertas IrriSense,
// kontrol minimal (Jeda/Putar, Reset tampilan), tanpa image-rendering pixelated karena preset stroked-toon.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const minify = process.argv.includes('--minify');
await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/main.js'], bundle: true, format: 'iife', target: ['es2020'],
  outfile: 'dist/app.js', minify, sourcemap: minify ? false : 'inline', legalComments: 'none', logLevel: 'info',
});

const js = await readFile('dist/app.js', 'utf8');
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const css = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #f3ecd8; }
  body { font: 500 15px/1.4 system-ui, "Segoe UI", sans-serif; color: #12301f; -webkit-tap-highlight-color: transparent; }
  #stage { position: fixed; inset: 0; width: 100%; height: 100%; display: block; outline: none; touch-action: none; }
  #stage:focus-visible { box-shadow: inset 0 0 0 3px #b9892b; }
  .ctl { position: fixed; left: 16px; bottom: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; max-width: calc(100% - 32px); }
  .ctl button { min-height: 44px; padding: 0 16px; border: 0; border-radius: 10px; background: #1f4a31; color: #fff; font: 600 15px system-ui, "Segoe UI", sans-serif; cursor: pointer; }
  .ctl button:hover { background: #12301f; }
  .ctl button:active { transform: translateY(1px); }
  .ctl button:focus-visible { outline: 3px solid #b9892b; outline-offset: 2px; }
  .hint { font-size: 13px; color: #55655a; }
  #fallback { position: fixed; inset: 0; display: grid; place-items: center; background: #f3ecd8; padding: 2rem; text-align: center; }
  #fallback[hidden] { display: none; }
`;

function page(scriptTag) {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<link rel="icon" href="data:," />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Diorama IrriSense</title>
<style>${css}</style>
</head>
<body>
<main>
<h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Diorama prototipe IrriSense di rangka paralon</h1>
<canvas id="stage" tabindex="0" aria-label="Diorama 3D prototipe IrriSense. Seret untuk memutar, gulir untuk zoom, panah untuk memutar, R untuk reset, spasi untuk jeda"></canvas>
<div class="ctl" role="group" aria-label="Kontrol diorama">
  <button id="play" type="button" aria-pressed="false">Jeda</button>
  <button id="reset" type="button">Reset tampilan</button>
  <span class="hint">Seret untuk memutar, gulir untuk zoom</span>
</div>
</main>
<div id="fallback" hidden>Diorama ini butuh browser dengan WebGL.</div>
${scriptTag}
</body>
</html>
`;
}

await writeFile('index.html', page('<script src="./dist/app.js"></script>'));
// Standalone: payload disisipkan lewat fungsi agar pola $& di bundle tidak diekspansi String.replace.
const standalone = page('__APP__').replace('__APP__', () => `<script>${safeJs}</script>`);
await writeFile('irrisense-diorama.html', standalone);
console.log(`built dist/app.js (${(js.length / 1024).toFixed(0)} kB), index.html, irrisense-diorama.html`);
