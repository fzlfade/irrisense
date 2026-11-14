import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoisture, formatTemp, formatHum, pumpLabel, faultMessage, toSeries, zone, ageText, screenState, pumpReason } from '../public/js/format.js';

test('format angka dan null', () => {
  assert.equal(formatMoisture(63.5), '63.5 %');
  assert.equal(formatMoisture(null), '---');
  assert.equal(formatTemp(28), '28.0 °C');
  assert.equal(formatTemp(null), '---');
  assert.equal(formatHum(64.6), '65 %');
  assert.equal(formatHum(null), '---');
});

test('pumpLabel dan faultMessage', () => {
  assert.equal(pumpLabel(true, 'auto'), 'ON · AUTO');
  assert.equal(pumpLabel(false, 'manual'), 'OFF · MANUAL');
  assert.equal(faultMessage('none'), null);
  assert.match(faultMessage('max_run'), /batas waktu/);
  assert.match(faultMessage('no_sensor'), /tidak terbaca/);
});

test('toSeries: null tetap null (celah di grafik)', () => {
  const s = toSeries([{ ts: 1, moisture: null, temp: 28, hum: 65 }]);
  assert.equal(s.moisture[0], null);
  assert.equal(s.temp[0], 28);
  assert.deepEqual(s.t, [1]);
});

test('zone: batas 60 dan 80 sama dengan firmware', () => {
  assert.equal(zone(59.9), 'low');
  assert.equal(zone(60), 'in');
  assert.equal(zone(79.9), 'in');
  assert.equal(zone(80), 'high');
  assert.equal(zone(null), null);
});

test('ageText dan screenState', () => {
  assert.equal(ageText(2000), 'baru saja');
  assert.equal(ageText(12000), '12 detik lalu');
  assert.equal(ageText(180000), '3 menit lalu');
  const r = { fault: 'none' };
  assert.equal(screenState({ loaded: false, apiError: false, reading: null, online: false }), 'loading');
  assert.equal(screenState({ loaded: true, apiError: true, reading: null, online: false }), 'error');
  assert.equal(screenState({ loaded: true, apiError: false, reading: null, online: false }), 'empty');
  assert.equal(screenState({ loaded: true, apiError: false, reading: r, online: false }), 'offline');
  assert.equal(screenState({ loaded: true, apiError: false, reading: { fault: 'max_run' }, online: true }), 'fault');
  assert.equal(screenState({ loaded: true, apiError: false, reading: r, online: true }), 'ok');
});

test('pumpReason menjelaskan histeresis tanpa em dash', () => {
  assert.match(pumpReason({ mode: 'auto', pump: true, moisture: 54 }), /di bawah 60 %/);
  assert.match(pumpReason({ mode: 'auto', pump: true, moisture: 70 }), /sampai rata-rata mencapai 80 %/);
  assert.match(pumpReason({ mode: 'auto', pump: false, moisture: 85 }), /cukup basah/);
  assert.match(pumpReason({ mode: 'manual', pump: false, moisture: 70 }), /Mode manual/);
  assert.doesNotMatch(faultMessage('no_sensor') + faultMessage('max_run') + pumpReason({ mode: 'auto', pump: false, moisture: 70 }), /—/);
});
