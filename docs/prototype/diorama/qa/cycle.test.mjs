// Uji logika siklus tanpa browser: hysteresis firmware dijalankan ulang pada sampel avgAt(t)
// dan harus sama persis dengan pumpOnAt(t); loop harus menyambung tanpa lompatan.
import assert from 'node:assert/strict';
import { LOOP, M_SET, M_MAX, T, avgAt, sensorsAt, pumpOnAt, flowAt } from '../src/cycle.js';

const DT = 0.01;
let pump = false, mismatches = 0, maxJump = 0, prev = avgAt(0);
for (let t = 0; t < LOOP; t += DT) {
  const s = sensorsAt(t), avg = s.reduce((a, b) => a + b, 0) / s.length;
  assert.ok(Math.abs(avg - avgAt(t)) < 1e-9, 'rata-rata sensor harus sama dengan avgAt');
  if (!pump && avg < M_SET) pump = true;
  else if (pump && avg >= M_MAX) pump = false;
  if (pump !== pumpOnAt(t)) mismatches++;
  maxJump = Math.max(maxJump, Math.abs(avgAt(t) - prev)); prev = avgAt(t);
  if (flowAt(t)) assert.ok(t >= T.on, 'air tidak boleh menetes sebelum pompa menyala');
}
// Batas sampel tepat di ambang boleh beda satu langkah (floating point di t = T.on / T.off).
assert.ok(mismatches <= 2, `hysteresis tidak cocok di ${mismatches} sampel`);
assert.ok(Math.abs(avgAt(LOOP - 1e-9) - avgAt(0)) < 1e-6, 'sambungan loop harus mulus');
assert.ok(maxJump < 0.2, `lompatan nilai per ${DT}s terlalu besar: ${maxJump}`);
console.log(`cycle ok: on=${T.on.toFixed(3)} flow=${T.flow.toFixed(3)} off=${T.off} stop=${T.stop} mismatch=${mismatches} maxJump=${maxJump.toFixed(4)}`);
