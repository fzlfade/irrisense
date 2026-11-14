// Tes anti-melenceng halaman Spesifikasi: data di landing/content/spesifikasi.ts harus sama dengan sumbernya di repo.
// Bila tes ini gagal, alat atau kodenya berubah: samakan spesifikasi.ts (dan periksa teks halamannya).
// Node mengimpor berkas .ts itu langsung (type stripping); peringatan "Reparsing as ES module" dari Node wajar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const spec = await import('../../landing/content/spesifikasi.ts');

const config = read('../../firmware/src/config.h');
const num = (name) => {
  const m = config.match(new RegExp(`\\b${name}\\s*=\\s*(0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?)`));
  assert.ok(m, `${name} tidak ditemukan di config.h`);
  return Number(m[1]);
};
const bool = (name) => {
  const m = config.match(new RegExp(`\\b${name}\\s*=\\s*(true|false)`));
  assert.ok(m, `${name} tidak ditemukan di config.h`);
  return m[1] === 'true';
};
const defines = Object.fromEntries([...config.matchAll(/^#define\s+(\w+)\s+(.+)$/gm)].map((m) => [m[1], m[2].trim()]));
// Nilai #define berupa gabungan string C dan nama #define lain, mis. "irrisense/" NODE_ID "/telemetry".
const defineValue = (name) => defines[name].match(/"[^"]*"|\w+/g).map((t) => (t.startsWith('"') ? t.slice(1, -1) : defineValue(t))).join('');

test('aturan pompa, interval, buffer, dan pin sama dengan firmware/src/config.h', () => {
  const f = spec.firmware;
  assert.equal(f.mSet, num('M_SET'));
  assert.equal(f.mMax, num('M_MAX'));
  assert.equal(f.maxRunMs, num('MAX_RUN_MS'));
  assert.equal(f.sensorIntervalMs, num('SENSOR_INTERVAL_MS'));
  assert.equal(f.bufferCapacity, num('BUFFER_CAPACITY'));
  assert.equal(f.drainPerTick, num('DRAIN_PER_TICK'));
  const pins = config.match(/SOIL_PINS\[[^\]]*\]\s*=\s*\{([^}]*)\}/);
  assert.ok(pins, 'SOIL_PINS tidak ditemukan');
  assert.deepEqual([...f.soilPins], pins[1].split(',').map(Number));
  assert.equal(f.soilPins.length, num('SOIL_COUNT'));
  assert.equal(f.dhtPin, num('DHT_PIN'));
  assert.equal(f.relayPin, num('RELAY_PIN'));
  assert.equal(f.relayActiveLow, bool('RELAY_ACTIVE_LOW'));
  assert.equal(f.i2cSda, num('I2C_SDA'));
  assert.equal(f.i2cScl, num('I2C_SCL'));
  assert.equal(f.lcdAddr, num('LCD_ADDR'));
  assert.equal(f.nodeId, defineValue('NODE_ID'));
});

test('topik MQTT sama dengan #define TOPIC_* di config.h', () => {
  const topics = Object.keys(defines).filter((k) => k.startsWith('TOPIC_')).map(defineValue).sort();
  const page = spec.topikMqtt.map((t) => `irrisense/${spec.firmware.nodeId}/${t.akhiran}`).sort();
  assert.deepEqual(page, topics);
});

test('baris LCD dan pesan FAULT sama dengan firmware/lib/irrisense_core/display.cpp', () => {
  const display = read('../../firmware/lib/irrisense_core/display.cpp');
  assert.equal(spec.lcdBaris.length, Number(display.match(/char out\[(\d+)\]\[21\]/)?.[1]));
  for (const baris of spec.lcdBaris) {
    for (const t of baris.tulisan) assert.match(display, new RegExp(`"[^"]*\\b${t}\\s?:`), `"${t}:" tidak ada di display.cpp`);
  }
  for (const pesan of Object.values(spec.faultLcd)) assert.ok(display.includes(`"${pesan}"`), `${pesan} tidak ada di display.cpp`);
});

test('label pin di board sama dengan docs/hardware/perkabelan.md', () => {
  const doc = read('../../docs/hardware/perkabelan.md');
  const rows = [...doc.matchAll(/^\|\s*S(\d)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|/gm)];
  assert.deepEqual(rows.map((r) => Number(r[1])), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(rows.map((r) => r[2]), [...spec.soilBoardLabels]);
  assert.deepEqual(rows.map((r) => Number(r[3])), [...spec.firmware.soilPins]);
  // Halaman menulis label D<gpio> untuk DHT11, relay, dan LCD.
  const f = spec.firmware;
  assert.match(doc, new RegExp(`DATA \\| baris \\*\\*D${f.dhtPin}\\*\\*`));
  assert.match(doc, new RegExp(`IN\\s+\\| baris \\*\\*D${f.relayPin}\\*\\*`));
  assert.match(doc, new RegExp(`SDA \\| D${f.i2cSda} \\|`));
  assert.match(doc, new RegExp(`SCL \\| D${f.i2cScl} \\|`));
});

test('daftar komponen sama dengan items di prototipe 3D (backend/prototipe/scene.js)', () => {
  const scene = read('../prototipe/scene.js');
  const block = scene.match(/const items = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'daftar items tidak ditemukan di scene.js');
  const items = [...block[1].matchAll(/\['([^']*)',\s*'([^']*)'\]/g)].map((m) => ({ nama: m[1], keterangan: m[2] }));
  assert.equal(items.length, 12);
  assert.deepEqual(spec.komponen.map((k) => ({ ...k })), items);
});

test('mode firmware sama dengan env di firmware/platformio.ini', () => {
  const ini = read('../../firmware/platformio.ini');
  const envs = [...ini.matchAll(/^\[env:([^\]]+)\]/gm)].map((m) => m[1]);
  assert.deepEqual(spec.modeFirmware.map((m) => m.env), envs);
  assert.equal(spec.modeFirmware[0].env, ini.match(/^default_envs\s*=\s*(\S+)/m)?.[1]);
});

test('rute dan batas API sama dengan backend/src/app.js dan index.js', () => {
  const app = read('../src/app.js');
  const index = read('../src/index.js');
  // /api/node didaftarkan di index.js (butuh status node dari bridge MQTT), sisanya di app.js.
  const routes = [...`${app}\n${index}`.matchAll(/app\.(get|post)\('(\/api\/[^']+)'/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`).sort();
  assert.deepEqual(spec.api.map((r) => `${r.metode} ${r.alamat}`).sort(), routes);
  assert.match(app, new RegExp(`limit === undefined \\? ${spec.apiBatas.limitBawaan} :`));
  assert.match(app, new RegExp(`Math\\.min\\(limit, ${spec.apiBatas.limitMaks}\\)`));
  assert.match(app, new RegExp(`flowMlPerMin = ${spec.apiBatas.aliranMlPerMenit}\\b`));
  assert.match(index, new RegExp(`FLOW_ML_PER_MIN \\?\\? ${spec.apiBatas.aliranMlPerMenit}\\)`));
});
