import mqtt from 'mqtt';
import { parseTelemetry } from './ingest.js';

// Jembatan MQTT: subscribe telemetri/status, publish perintah (QoS 1, tidak retained).
export function createBridge({ url, nodeId, onReading, onStatus, now = Date.now }) {
  const base = `irrisense/${nodeId}`;
  const client = mqtt.connect(url, { reconnectPeriod: 2000, clientId: `irrisense-backend-${process.pid}` });

  client.on('connect', () => {
    client.subscribe(`${base}/telemetry`, { qos: 0 });
    client.subscribe(`${base}/status`, { qos: 1 });
  });
  client.on('error', () => {});   // reconnect otomatis; jangan crash

  client.on('message', (topic, payload) => {
    try {
      if (topic === `${base}/telemetry`) {
        const r = parseTelemetry(payload, nodeId, now());
        if (r) onReading(r);
      } else if (topic === `${base}/status`) {
        onStatus(payload.toString() === 'online');
      }
    } catch (e) {
      console.error('bridge handler error:', e.message);
    }
  });

  return {
    connected: () => client.connected,
    publishCommand(cmd) {
      return new Promise((resolve, reject) => {
        if (!client.connected) return reject(new Error('mqtt disconnected'));
        client.publish(`${base}/cmd`, JSON.stringify(cmd), { qos: 1, retain: false }, (err) =>
          err ? reject(new Error('mqtt disconnected')) : resolve());
      });
    },
    close: () => new Promise((resolve) => client.end(true, {}, resolve)),
  };
}
