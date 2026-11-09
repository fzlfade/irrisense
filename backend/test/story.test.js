import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
// Ambil nilai konstanta (angka atau daftar angka) dari kode sumber tanpa menjalankannya.
const constant = (src, name) => {
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*(\\[[^\\]]*\\]|[\\d.]+)`));
  assert.ok(m, `${name} tidak ditemukan`);
  return JSON.parse(m[1]);
};

test('titik langkah panggung cerita sama di landing dan model 3D', () => {
  const landing = read('../../landing/lib/storyProgress.ts');
  const scene = read('../prototipe/scene.js');
  for (const name of ['WAYPOINTS', 'HOLD']) {
    assert.deepEqual(constant(scene, name), constant(landing, name), `${name} di scene.js berbeda dengan storyProgress.ts`);
  }
});

test('titik langkah naik dan berada di antara 0 dan 1', () => {
  const w = constant(read('../../landing/lib/storyProgress.ts'), 'WAYPOINTS');
  assert.equal(w.length, 4, 'empat langkah Cara kerja');
  w.forEach((v, i) => {
    assert.ok(v > 0 && v < 1, `waypoint ${i} di luar 0..1`);
    if (i) assert.ok(v > w[i - 1], `waypoint ${i} tidak naik`);
  });
});
