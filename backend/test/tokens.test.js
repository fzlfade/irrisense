import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('salinan tokens dashboard sama dengan design/tokens.css', () => {
  assert.equal(read('../public/css/tokens.css'), read('../../design/tokens.css'),
    'jalankan `npm run sync:tokens` di backend/');
});

test('app.css tidak lagi menulis warna heksadesimal sendiri', () => {
  assert.doesNotMatch(read('../public/css/app.css'), /#[0-9a-fA-F]{3,8}\b/);
});

test('nama token yang dibaca grafik (app.js) tetap ada', () => {
  const tokens = read('../public/css/tokens.css');
  for (const n of ['--muted', '--line', '--green', '--amber', '--blue']) {
    assert.match(tokens, new RegExp(`${n}:`), n);
  }
});
