import { queryReadings } from './db.js';

const percentile = (sorted, p) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];   // nearest-rank

export async function computeStats(db, { nodeId, from, to, intervalSec = 5, flowMlPerMin = 100 }) {
  const rows = await queryReadings(db, { nodeId, from, to: to - 1, limit: 1_000_000 });
  const lats = rows.map((r) => r.latencyMs).filter((v) => v !== null).sort((a, b) => a - b);
  const latency = lats.length
    ? { n: lats.length, p50: percentile(lats, 50), p95: percentile(lats, 95), max: lats[lats.length - 1] }
    : null;

  const slotMs = intervalSec * 1000;
  const totalSlots = Math.max(1, Math.floor((to - from) / slotMs));
  const filled = new Set();
  for (const r of rows) filled.add(Math.floor((r.ts - from) / slotMs));
  const uptimePct = rows.length ? (Math.min(filled.size, totalSlots) / totalSlots) * 100 : 0;

  const onSeconds = rows.filter((r) => r.pump).length * intervalSec;
  return { count: rows.length, latency, uptimePct, pump: { onSeconds, estimatedMl: (onSeconds / 60) * flowMlPerMin } };
}
