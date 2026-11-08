import test from 'node:test';
import assert from 'node:assert/strict';
import { insertReading, queryReadings, latestReading } from '../src/db.js';
import { makeTestDb } from './helpers.js';

const R = (o = {}) => ({ nodeId: 'node1', boot: 1, seq: 1, ts: 1000, sentTs: 1000, recvTs: 1100,
  latencyMs: 100, moisture: 50, valid: 4, temp: 28, hum: 65, pump: false, mode: 'auto',
  buffered: false, fault: 'none', ...o });

test('insert lalu query mengembalikan data sama', async () => {
  const t = await makeTestDb();
  assert.equal(await insertReading(t.db, R()), true);
  const [r] = await queryReadings(t.db, { nodeId: 'node1' });
  assert.deepEqual(r, R());
  await t.close();
});

test('desimal tidak kehilangan presisi, uint32 besar aman', async () => {
  const t = await makeTestDb();
  await insertReading(t.db, R({ moisture: 28.2, boot: 4294967295, seq: 4294967295, ts: 1793887645195 }));
  const r = await latestReading(t.db, 'node1');
  assert.equal(r.moisture, 28.2);
  assert.equal(r.boot, 4294967295);
  assert.equal(r.ts, 1793887645195);
  await t.close();
});

test('duplikat (node, boot, seq) ditolak', async () => {
  const t = await makeTestDb();
  assert.equal(await insertReading(t.db, R()), true);
  assert.equal(await insertReading(t.db, R({ ts: 2000 })), false);
  assert.equal((await queryReadings(t.db, { nodeId: 'node1' })).length, 1);
  await t.close();
});

test('query menghormati from/to/limit dan urutan naik', async () => {
  const t = await makeTestDb();
  for (let i = 0; i < 10; i++) await insertReading(t.db, R({ seq: i, ts: 1000 + i * 100 }));
  const a = await queryReadings(t.db, { nodeId: 'node1', from: 1200, to: 1500 });
  assert.deepEqual(a.map((x) => x.ts), [1200, 1300, 1400, 1500]);
  const b = await queryReadings(t.db, { nodeId: 'node1', limit: 3 });
  assert.deepEqual(b.map((x) => x.ts), [1700, 1800, 1900]);   // terbaru, urut naik
  await t.close();
});

test('latestReading: kosong -> null, lalu terbaru', async () => {
  const t = await makeTestDb();
  assert.equal(await latestReading(t.db, 'node1'), null);
  await insertReading(t.db, R({ seq: 1, ts: 1000 }));
  await insertReading(t.db, R({ seq: 2, ts: 3000 }));
  assert.equal((await latestReading(t.db, 'node1')).ts, 3000);
  await t.close();
});

test('nilai null dan boolean tersimpan benar', async () => {
  const t = await makeTestDb();
  await insertReading(t.db, R({ moisture: null, temp: null, hum: null, pump: true, buffered: true, latencyMs: null }));
  const r = await latestReading(t.db, 'node1');
  assert.equal(r.moisture, null); assert.equal(r.pump, true); assert.equal(r.buffered, true);
  assert.equal(r.latencyMs, null);
  await t.close();
});
