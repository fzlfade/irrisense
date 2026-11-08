import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoisture, formatTemp, formatHum, pumpLabel, faultMessage, toSeries } from '../public/js/format.js';

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
