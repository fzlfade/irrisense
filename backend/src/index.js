import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, insertReading, DEFAULT_URL } from './db.js';
import { createBridge } from './bridge.js';
import { createApp } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const NODE_ID = process.env.NODE_ID ?? 'node1';
const DATABASE_URL = process.env.DATABASE_URL ?? DEFAULT_URL;
const PORT = Number(process.env.PORT ?? 3000);
const FLOW = Number(process.env.FLOW_ML_PER_MIN ?? 100);

const db = await openDb(DATABASE_URL);
const bus = new EventEmitter();
let nodeOnline = false;

const bridge = createBridge({
  url: MQTT_URL,
  nodeId: NODE_ID,
  onReading: (r) => {
    insertReading(db, r)
      .then((isNew) => { if (isNew) bus.emit('reading', r); })
      .catch((e) => console.error('insert gagal:', e.message));
  },
  onStatus: (online) => { nodeOnline = online; bus.emit('status', online); },
});

const landingOut = path.join(root, '..', 'landing', 'out');
const landingDir = existsSync(path.join(landingOut, 'index.html')) ? landingOut : undefined;
if (!landingDir) console.warn('landing/out belum ada (jalankan `npm run build` di landing/): / diarahkan ke dashboard');

const app = createApp({ db, bridge, bus, nodeId: NODE_ID, staticDir: path.join(root, 'public'), landingDir, prototypeDir: path.join(root, 'prototipe'), flowMlPerMin: FLOW, password: process.env.DASHBOARD_PASSWORD });
app.get('/api/node', (_req, res) => res.json({ online: nodeOnline }));

app.listen(PORT, () => console.log(`IrriSense backend: http://localhost:${PORT}  dashboard: /dashboard/  (MQTT ${MQTT_URL}, node ${NODE_ID})`));
