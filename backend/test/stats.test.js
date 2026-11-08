import test from 'node:test';
import assert from 'node:assert/strict';
import { insertReading } from '../src/db.js';
import { computeStats } from '../src/stats.js';
import { makeTestDb } from './helpers.js';

const R = (o = {}) => ({ nodeId: 'node1', boot: 1, seq: 1, ts: 0, sentTs: 0, recvTs: 0,
  latencyMs: 100, moisture: 50, valid: 4, temp: 28, hum: 65, pump: false, mode: 'auto',
  buffered: false, fault: 'none', ...o });

test('uptime: 10 slot, 9 terisi = 90 %', async () => {
  const t = await makeTestDb();
  for (let i = 0; i < 10; i++) if (i !== 4) await insertReading(t.db, R({ seq: i, ts: i * 5000 }));
  const s = await computeStats(t.db, { nodeId: 'node1', from: 0, to: 50000 });
  assert.equal(s.uptimePct, 90);
  assert.equal(s.count, 9);
  await t.close();
});

test('latensi p50/p95/max nearest-rank', async () => {
  const t = await makeTestDb();
  for (const [i, l] of [100, 110, 120, 130, 200].entries()) await insertReading(t.db, R({ seq: i, ts: i * 5000, latencyMs: l }));
  const s = await computeStats(t.db, { nodeId: 'node1', from: 0, to: 25000 });
  assert.deepEqual(s.latency, { n: 5, p50: 120, p95: 200, max: 200 });
  await t.close();
});

test('semua latensi null -> latency null', async () => {
  const t = await makeTestDb();
  await insertReading(t.db, R({ seq: 1, ts: 0, latencyMs: null }));
  assert.equal((await computeStats(t.db, { nodeId: 'node1', from: 0, to: 5000 })).latency, null);
  await t.close();
});

test('air: 12 reading pompa ON = 60 s, 100 mL', async () => {
  const t = await makeTestDb();
  for (let i = 0; i < 12; i++) await insertReading(t.db, R({ seq: i, ts: i * 5000, pump: true }));
  const s = await computeStats(t.db, { nodeId: 'node1', from: 0, to: 60000 });
  assert.equal(s.pump.onSeconds, 60);
  assert.equal(s.pump.estimatedMl, 100);
  await t.close();
});

test('DB kosong: tanpa NaN/throw', async () => {
  const t = await makeTestDb();
  const s = await computeStats(t.db, { nodeId: 'node1', from: 0, to: 50000 });
  assert.equal(s.count, 0); assert.equal(s.uptimePct, 0); assert.equal(s.latency, null);
  await t.close();
});
