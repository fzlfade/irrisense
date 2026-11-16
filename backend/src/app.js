import compression from 'compression';
import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryReadings, latestReading } from './db.js';
import { computeStats } from './stats.js';

const chartDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/chart.js/dist');
const threeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/three');

const num = (v) => (v === undefined ? undefined : /^-?\d+$/.test(String(v)) ? Number(v) : NaN);

export function createApp({ db, bridge, bus, nodeId, staticDir, landingDir, prototypeDir, flowMlPerMin = 100, password }) {
  const app = express();
  // Kompresi semua respons kecuali SSE: compression menahan data SSE di buffer (README compression,
  // bagian Server-Sent Events), jadi /api/stream dikecualikan agar event tetap langsung terkirim.
  app.use(compression({ filter: (req, res) => (req.path === '/api/stream' ? false : compression.filter(req, res)) }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true, mqtt: !!bridge.connected() }));

  // Saat dibuka ke internet, dashboard dan API (termasuk perintah pompa) butuh password; username bebas.
  // Didaftarkan sesudah /api/health agar pemantau uptime tetap bisa memanggilnya.
  if (password) {
    const want = Buffer.from(password);
    app.use(['/api', '/dashboard'], (req, res, next) => {
      const [scheme, b64 = ''] = (req.headers.authorization ?? '').split(' ');
      const decoded = Buffer.from(b64, 'base64').toString();
      const got = Buffer.from(decoded.slice(decoded.indexOf(':') + 1));
      const ok = scheme === 'Basic' && decoded.includes(':') && got.length === want.length && timingSafeEqual(got, want);
      if (ok) return next();
      res.set('WWW-Authenticate', 'Basic realm="IrriSense", charset="UTF-8"').status(401).json({ error: 'butuh password' });
    });
  }

  // Handler async: error database -> 500, tidak menjatuhkan proses.
  const h = (fn) => (req, res) => fn(req, res).catch((e) => {
    console.error('api error:', e.message);
    if (!res.headersSent) res.status(500).json({ error: 'database error' });
  });

  app.get('/api/latest', h(async (_req, res) => {
    const r = await latestReading(db, nodeId);
    if (!r) return res.status(404).json({ error: 'no data' });
    res.json(r);
  }));

  app.get('/api/readings', h(async (req, res) => {
    const from = num(req.query.from), to = num(req.query.to);
    const limit = req.query.limit === undefined ? 500 : num(req.query.limit);
    if ([from, to, limit].some(Number.isNaN) || limit < 1) return res.status(400).json({ error: 'bad query' });
    res.json(await queryReadings(db, { nodeId, from, to, limit: Math.min(limit, 5000) }));
  }));

  app.get('/api/stats', h(async (req, res) => {
    const from = num(req.query.from), to = num(req.query.to);
    if (from === undefined || to === undefined || Number.isNaN(from) || Number.isNaN(to) || to <= from)
      return res.status(400).json({ error: 'bad range' });
    res.json(await computeStats(db, { nodeId, from, to, flowMlPerMin }));
  }));

  app.post('/api/command', async (req, res) => {
    const { mode, pump } = req.body ?? {};
    const hasMode = mode !== undefined, hasPump = pump !== undefined;
    if (!hasMode && !hasPump) return res.status(400).json({ error: 'empty command' });
    if (hasMode && mode !== 'auto' && mode !== 'manual') return res.status(400).json({ error: 'bad mode' });
    if (hasPump && typeof pump !== 'boolean') return res.status(400).json({ error: 'bad pump' });
    const cmd = {};
    if (hasMode) cmd.mode = mode;
    if (hasPump) cmd.pump = pump;
    try {
      await bridge.publishCommand(cmd);
      res.json({ sent: true });
    } catch {
      res.status(503).json({ error: 'mqtt disconnected' });
    }
  });

  app.get('/api/stream', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    res.write('retry: 2000\n\n');
    const onReading = (r) => res.write(`event: reading\ndata: ${JSON.stringify(r)}\n\n`);
    const onStatus = (online) => res.write(`event: status\ndata: ${JSON.stringify({ online })}\n\n`);
    bus.on('reading', onReading);
    bus.on('status', onStatus);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); bus.off('reading', onReading); bus.off('status', onStatus); });
  });

  app.use('/vendor/chart', express.static(chartDist));
  app.use('/vendor/three', express.static(threeDir));
  if (prototypeDir) app.use('/prototipe', express.static(prototypeDir));
  // Dashboard di /dashboard/, landing page di /. Tanpa landing (belum dibuild), / diarahkan ke dashboard.
  if (staticDir) app.use('/dashboard', express.static(staticDir));
  if (landingDir) {
    // Berkas build Next di /_next/static bernama hash isi: aman disimpan setahun di cache browser.
    // Berkas tanpa hash (/prototipe/*, /vendor/*, HTML) tetap memakai validasi ETag bawaan.
    app.use('/_next/static', express.static(path.join(landingDir, '_next', 'static'), { maxAge: '1y', immutable: true }));
    app.use(express.static(landingDir));
  } else if (staticDir) app.get('/', (_req, res) => res.redirect('/dashboard/'));
  return app;
}
