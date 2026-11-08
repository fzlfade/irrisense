import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSim, stepSim, setMode, manualPump, shiftSensors, toggleSensorValid, setTank, average, lcdLines,
  M_SET, M_MAX, MAX_RUN_S,
} from '../prototipe/sim.js';

const run = (s, seconds) => { for (let i = 0; i < seconds; i++) stepSim(s, 1); };

test('rata-rata hanya dari sensor valid; semua rusak -> NaN', () => {
  const s = createSim();
  const full = average(s.sensors);
  toggleSensorValid(s, 0);
  assert.notEqual(average(s.sensors), full);
  s.sensors.forEach((_, i) => { s.sensors[i].valid = false; });
  assert.ok(Number.isNaN(average(s.sensors)));
});

test('histeresis: ON di bawah 60 %, tetap ON sampai 80 %, lalu OFF', () => {
  const s = createSim();
  assert.equal(s.pump, false);
  shiftSensors(s, -20);                       // rata-rata turun jauh di bawah 60
  stepSim(s, 1);
  assert.equal(s.pump, true);
  let sawMiddle = false;
  while (average(s.sensors) < M_MAX) {
    const m = average(s.sensors);
    if (m >= M_SET && m < M_MAX) { sawMiddle = true; assert.equal(s.pump, true, `m=${m}`); }
    stepSim(s, 1);
  }
  assert.ok(sawMiddle, 'harus melewati zona 60-80 % dengan pompa tetap ON');
  stepSim(s, 1);
  assert.equal(s.pump, false);
});

test('tanah mengering sendiri tanpa pompa, lalu pompa menyala otomatis', () => {
  const s = createSim();
  let guard = 0;
  while (!s.pump && guard++ < 5000) stepSim(s, 1);
  assert.equal(s.pump, true);
  assert.ok(average(s.sensors) < M_SET);
});

test('tandon kosong: pompa menyala tapi tanah tidak basah -> MAX RUN terkunci', () => {
  const s = createSim();
  setTank(s, 0);
  shiftSensors(s, -30);
  run(s, MAX_RUN_S + 5);
  assert.equal(s.fault, 'max_run');
  assert.equal(s.pump, false);
  run(s, 20);                                  // terkunci walau tanah masih kering
  assert.equal(s.pump, false);
  setMode(s, 'auto');                          // hanya ganti mode yang membuka kunci
  assert.equal(s.fault, 'none');
});

test('semua sensor rusak di mode auto: pompa mati dan galat NO SENSOR; pulih saat sensor kembali', () => {
  const s = createSim();
  shiftSensors(s, -30);
  stepSim(s, 1);
  assert.equal(s.pump, true);
  s.sensors.forEach((_, i) => toggleSensorValid(s, i));
  stepSim(s, 1);
  assert.equal(s.pump, false);
  assert.equal(s.fault, 'no_sensor');
  s.sensors.forEach((_, i) => toggleSensorValid(s, i));
  stepSim(s, 1);
  assert.equal(s.fault, 'none');
});

test('mode manual: pompa tidak mengikuti kelembapan, hanya perintah', () => {
  const s = createSim();
  assert.equal(manualPump(s, true), false);    // di mode auto ditolak
  setMode(s, 'manual');
  shiftSensors(s, -30);
  run(s, 5);
  assert.equal(s.pump, false);
  assert.equal(manualPump(s, true), true);
  assert.equal(s.pump, true);
  shiftSensors(s, 100);
  run(s, 5);
  assert.equal(s.pump, true);                  // kelembapan 100 %, tetap ON sampai dimatikan
  manualPump(s, false);
  assert.equal(s.pump, false);
});

test('ganti mode mematikan pompa', () => {
  const s = createSim();
  setMode(s, 'manual');
  manualPump(s, true);
  setMode(s, 'auto');
  assert.equal(s.pump, false);
});

test('layar LCD memakai format firmware dan 20 karakter per baris', () => {
  const s = createSim();
  const lines = lcdLines(s);
  assert.equal(lines.length, 4);
  lines.forEach((l) => assert.equal(l.length, 20));
  assert.match(lines[0], /^Soil : \d+\.\d %/);
  assert.match(lines[2], /^Pump:OFF Mode:AUTO/);
  assert.match(lines[3], /^W:OK M:OK/);
});
