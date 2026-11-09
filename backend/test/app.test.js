import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { insertReading } from '../src/db.js';
import { createApp } from '../src/app.js';
import { makeTestDb } from './helpers.js';

const R = (o = {}) => ({ nodeId: 'node1', boot: 1, seq: 1, ts: 1000, sentTs: 1000, recvTs: 1100,
  latencyMs: 100, moisture: 50, valid: 4, temp: 28, hum: 65, pump: false, mode: 'auto',
  buffered: false, fault: 'none', ...o });

async function setup(bridgeOver = {}) {
  const t = await makeTestDb();
  const db = t.db;
  const sent = [];
  const bridge = { connected: () => true, publishCommand: async (c) => { sent.push(c); }, ...bridgeOver };
  const bus = new EventEmitter();
  const server = createApp({ db, bridge, bus, nodeId: 'node1' }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { db, bus, sent, base, close: async () => { server.closeAllConnections(); server.close(); await t.close(); } };
}
const post = (base, body) => fetch(`${base}/api/command`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('health, latest 404 lalu 200', async () => {
  const s = await setup();
  assert.deepEqual(await (await fetch(`${s.base}/api/health`)).json(), { ok: true, mqtt: true });
  assert.equal((await fetch(`${s.base}/api/latest`)).status, 404);
  await insertReading(s.db, R());
  assert.equal((await fetch(`${s.base}/api/latest`)).status, 200);
  await s.close();
});

test('readings: urut, limit, limit tidak valid -> 400', async () => {
  const s = await setup();
  for (let i = 0; i < 5; i++) await insertReading(s.db, R({ seq: i, ts: 1000 + i }));
  const a = await (await fetch(`${s.base}/api/readings?limit=3`)).json();
  assert.equal(a.length, 3);
  assert.ok(a[0].ts < a[2].ts);
  assert.equal((await fetch(`${s.base}/api/readings?limit=abc`)).status, 400);
  await s.close();
});

test('command: valid, kosong, mode salah, bridge putus', async () => {
  const s = await setup();
  assert.equal((await post(s.base, { mode: 'manual', pump: true })).status, 200);
  assert.deepEqual(s.sent[0], { mode: 'manual', pump: true });
  assert.equal((await post(s.base, {})).status, 400);
  assert.equal((await post(s.base, { mode: 'turbo' })).status, 400);
  assert.equal((await post(s.base, { pump: 'yes' })).status, 400);
  await s.close();
  const d = await setup({ publishCommand: async () => { throw new Error('mqtt disconnected'); } });
  assert.equal((await post(d.base, { pump: true })).status, 503);
  await d.close();
});

test('stats: validasi rentang', async () => {
  const s = await setup();
  assert.equal((await fetch(`${s.base}/api/stats?from=10&to=5`)).status, 400);
  assert.equal((await fetch(`${s.base}/api/stats?from=a&to=5`)).status, 400);
  assert.equal((await fetch(`${s.base}/api/stats?from=0&to=50000`)).status, 200);
  await s.close();
});

test('stream SSE menerima event reading', async () => {
  const s = await setup();
  const res = await fetch(`${s.base}/api/stream`);
  const reader = res.body.getReader();
  await reader.read();                       // retry: 2000
  setTimeout(() => s.bus.emit('reading', R({ seq: 9 })), 50);
  const { value } = await reader.read();
  const text = new TextDecoder().decode(value);
  assert.match(text, /event: reading/);
  assert.match(text, /"seq":9/);
  await reader.cancel();
  await s.close();
});

async function routeSetup({ withLanding }) {
  const t = await makeTestDb();
  const root = mkdtempSync(path.join(os.tmpdir(), 'irri-'));
  const dash = path.join(root, 'dash'), land = path.join(root, 'land');
  mkdirSync(dash); mkdirSync(land);
  writeFileSync(path.join(dash, 'index.html'), 'DASHBOARD');
  writeFileSync(path.join(land, 'index.html'), 'LANDING');
  mkdirSync(path.join(land, 'spesifikasi'));
  writeFileSync(path.join(land, 'spesifikasi', 'index.html'), 'SPESIFIKASI');
  const app = createApp({ db: t.db, bridge: { connected: () => true }, bus: new EventEmitter(), nodeId: 'node1',
    staticDir: dash, landingDir: withLanding ? land : undefined });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: async () => { server.closeAllConnections(); server.close(); await t.close(); } };
}

test('route: landing di /, dashboard di /dashboard/', async () => {
  const s = await routeSetup({ withLanding: true });
  assert.equal(await (await fetch(`${s.base}/`)).text(), 'LANDING');
  assert.equal(await (await fetch(`${s.base}/dashboard/`)).text(), 'DASHBOARD');
  const r = await fetch(`${s.base}/dashboard`, { redirect: 'manual' });
  assert.ok([301, 302].includes(r.status));
  assert.equal(new URL(r.headers.get('location'), s.base).pathname, '/dashboard/');
  assert.equal((await fetch(`${s.base}/api/health`)).status, 200);
  await s.close();
});

test('route: halaman Spesifikasi di /spesifikasi/, tanpa garis miring diarahkan ke sana', async () => {
  const s = await routeSetup({ withLanding: true });
  const page = await fetch(`${s.base}/spesifikasi/`);
  assert.equal(page.status, 200);
  assert.equal(await page.text(), 'SPESIFIKASI');
  const r = await fetch(`${s.base}/spesifikasi`, { redirect: 'manual' });
  assert.ok([301, 302].includes(r.status));
  assert.equal(new URL(r.headers.get('location'), s.base).pathname, '/spesifikasi/');
  await s.close();
});

test('route: tanpa landing, / diarahkan ke /dashboard/', async () => {
  const s = await routeSetup({ withLanding: false });
  const r = await fetch(`${s.base}/`, { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.equal(new URL(r.headers.get('location'), s.base).pathname, '/dashboard/');
  await s.close();
});

test('route: /prototipe/ disajikan dan Three.js tersedia lokal', async () => {
  const t = await makeTestDb();
  const dir = mkdtempSync(path.join(os.tmpdir(), 'irri-proto-'));
  writeFileSync(path.join(dir, 'index.html'), 'PROTOTIPE');
  const server = createApp({ db: t.db, bridge: { connected: () => true }, bus: new EventEmitter(), nodeId: 'node1', prototypeDir: dir }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal(await (await fetch(`${base}/prototipe/`)).text(), 'PROTOTIPE');
  const three = await fetch(`${base}/vendor/three/build/three.module.js`);
  assert.equal(three.status, 200);
  assert.equal((await fetch(`${base}/vendor/three/examples/jsm/controls/OrbitControls.js`)).status, 200);
  server.closeAllConnections(); server.close(); await t.close();
});

test('kompresi: berkas besar terkompresi, SSE tidak dan event tetap langsung tiba', async () => {
  const s = await setup();
  let reader;
  try {
    const three = await fetch(`${s.base}/vendor/three/build/three.module.min.js`, { headers: { 'accept-encoding': 'gzip' } });
    assert.equal(three.status, 200);
    assert.equal(three.headers.get('content-encoding'), 'gzip');
    await three.arrayBuffer();

    const res = await fetch(`${s.base}/api/stream`, { headers: { 'accept-encoding': 'gzip' } });
    reader = res.body.getReader();
    assert.equal(res.headers.get('content-encoding'), null);
    await reader.read();                       // retry: 2000
    setTimeout(() => s.bus.emit('reading', R({ seq: 11 })), 50);
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('event SSE tertahan')), 3000));
    const { value } = await Promise.race([reader.read(), timeout]);
    assert.match(new TextDecoder().decode(value), /"seq":11/);
  } finally {
    await reader?.cancel().catch(() => {});
    await s.close();
  }
});

test('cache: berkas _next/static berhash disimpan lama, berkas tanpa hash tidak', async () => {
  const t = await makeTestDb();
  const root = mkdtempSync(path.join(os.tmpdir(), 'irri-cache-'));
  const land = path.join(root, 'land'), proto = path.join(root, 'proto');
  mkdirSync(path.join(land, '_next', 'static', 'chunks'), { recursive: true }); mkdirSync(proto);
  writeFileSync(path.join(land, 'index.html'), 'LANDING');
  writeFileSync(path.join(land, '_next', 'static', 'chunks', 'a1b2c3.js'), 'console.log(1)');
  writeFileSync(path.join(proto, 'scene.js'), 'console.log(2)');
  const server = createApp({ db: t.db, bridge: { connected: () => true }, bus: new EventEmitter(), nodeId: 'node1', landingDir: land, prototypeDir: proto }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const hashed = await fetch(`${base}/_next/static/chunks/a1b2c3.js`);
  assert.equal(hashed.status, 200);
  assert.match(hashed.headers.get('cache-control'), /max-age=31536000/);
  assert.match(hashed.headers.get('cache-control'), /immutable/);
  const scene = await fetch(`${base}/prototipe/scene.js`);
  assert.doesNotMatch(scene.headers.get('cache-control') ?? '', /immutable/);
  const html = await fetch(`${base}/`);
  assert.doesNotMatch(html.headers.get('cache-control') ?? '', /immutable/);
  server.closeAllConnections(); server.close(); await t.close();
});
