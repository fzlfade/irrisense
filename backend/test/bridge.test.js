import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import aedesPkg from 'aedes';
import mqtt from 'mqtt';
import { createBridge } from '../src/bridge.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 3000) => { const t = Date.now(); while (!fn()) { if (Date.now() - t > ms) throw new Error('timeout'); await wait(20); } };

async function startBroker() {
  const aedes = await aedesPkg.createBroker();
  const server = net.createServer(aedes.handle);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `mqtt://127.0.0.1:${server.address().port}`, stop: () => new Promise((r) => aedes.close(() => server.close(r))) };
}

const tel = { boot: 1, seq: 1, ts: 1000, moisture: 50, valid: 4, temp: 28, hum: 65,
  pump: false, mode: 'auto', buffered: false, fault: 'none' };

test('bridge: telemetri, sampah, status, perintah', async () => {
  const broker = await startBroker();
  const readings = []; const statuses = [];
  const bridge = createBridge({ url: broker.url, nodeId: 'node1',
    onReading: (r) => readings.push(r), onStatus: (s) => statuses.push(s) });
  const esp = mqtt.connect(broker.url);
  const cmds = [];
  await new Promise((r) => esp.on('connect', r));
  esp.subscribe('irrisense/node1/cmd', { qos: 1 });
  esp.on('message', (t, p, packet) => cmds.push({ t, body: JSON.parse(p), retain: packet.retain, qos: packet.qos }));
  await until(() => bridge.connected());
  await wait(200);   // subscribe selesai

  esp.publish('irrisense/node1/telemetry', JSON.stringify(tel));
  await until(() => readings.length === 1);
  assert.equal(readings[0].nodeId, 'node1');

  esp.publish('irrisense/node1/telemetry', 'garbage');
  esp.publish('irrisense/node1/telemetry', JSON.stringify({ ...tel, seq: 2 }));
  await until(() => readings.length === 2);          // bridge tetap hidup
  assert.equal(readings[1].seq, 2);

  esp.publish('irrisense/node1/status', 'online', { qos: 1 });
  esp.publish('irrisense/node1/status', 'offline', { qos: 1 });
  await until(() => statuses.length === 2);
  assert.deepEqual(statuses, [true, false]);

  await bridge.publishCommand({ mode: 'manual', pump: true });
  await until(() => cmds.length === 1);
  assert.deepEqual(cmds[0].body, { mode: 'manual', pump: true });
  assert.equal(cmds[0].retain, false);
  assert.equal(cmds[0].qos, 1);

  await bridge.close();
  await assert.rejects(bridge.publishCommand({ pump: true }), /mqtt disconnected/);
  await new Promise((r) => esp.end(true, {}, r));
  await broker.stop();
});
