import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelemetry } from '../src/ingest.js';

const base = { boot: 7, seq: 1, ts: 1000, moisture: 63.5, valid: 4, temp: 28, hum: 65,
  pump: true, mode: 'auto', buffered: false, fault: 'none' };
const P = (o, recv = 1120) => parseTelemetry(JSON.stringify({ ...base, ...o }), 'node1', recv);

test('payload valid: latensi dihitung', () => {
  const r = P({});
  assert.equal(r.latencyMs, 120);
  assert.equal(r.ts, 1000);
  assert.equal(r.nodeId, 'node1');
  assert.equal(r.moisture, 63.5);
});

test('ts 0 / buffered / jam miring: latensi null', () => {
  const a = P({ ts: 0 });
  assert.equal(a.ts, 1120); assert.equal(a.latencyMs, null);
  assert.equal(P({ buffered: true }).latencyMs, null);
  assert.equal(P({ ts: 5000 }).latencyMs, null);
});

test('payload rusak ditolak tanpa throw', () => {
  assert.equal(parseTelemetry('not json', 'node1', 0), null);
  assert.equal(parseTelemetry('{}', 'node1', 0), null);
  assert.equal(P({ moisture: 101 }), null);
  assert.equal(P({ moisture: -1 }), null);
  assert.equal(P({ mode: 'turbo' }), null);
  assert.equal(P({ pump: 'yes' }), null);
  assert.equal(P({ fault: 'x' }), null);
  assert.equal(P({ seq: -1 }), null);
});

test('moisture/temp/hum null diterima', () => {
  const r = P({ moisture: null, temp: null, hum: null, valid: 0, fault: 'no_sensor' });
  assert.equal(r.moisture, null); assert.equal(r.temp, null); assert.equal(r.hum, null);
});

test('menerima Buffer', () => {
  assert.ok(parseTelemetry(Buffer.from(JSON.stringify(base)), 'node1', 1120));
});
