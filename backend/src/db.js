import pg from 'pg';

// BIGINT (oid 20) dikembalikan sebagai number: ts epoch-ms dan seq/boot uint32 aman di double.
pg.types.setTypeParser(20, (v) => Number(v));

export const DEFAULT_URL = 'postgres://postgres@localhost:5432/irrisense';

// schema opsional: dipakai tes agar tiap tes terisolasi (tabel dibuat di schema itu).
export async function openDb(url = DEFAULT_URL, { schema } = {}) {
  if (schema) {
    const admin = new pg.Pool({ connectionString: url, max: 1 });
    await admin.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await admin.end();
  }
  const pool = new pg.Pool({
    connectionString: url,
    options: schema ? `-c search_path="${schema}"` : undefined,
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS readings (
      id BIGSERIAL PRIMARY KEY,
      node_id TEXT NOT NULL, boot BIGINT NOT NULL, seq BIGINT NOT NULL,
      ts BIGINT NOT NULL, sent_ts BIGINT NOT NULL, recv_ts BIGINT NOT NULL,
      latency_ms BIGINT, moisture DOUBLE PRECISION, valid INTEGER NOT NULL,
      temp DOUBLE PRECISION, hum DOUBLE PRECISION, pump BOOLEAN NOT NULL, mode TEXT NOT NULL,
      buffered BOOLEAN NOT NULL, fault TEXT NOT NULL,
      UNIQUE (node_id, boot, seq)
    );
    CREATE INDEX IF NOT EXISTS idx_readings_node_ts ON readings (node_id, ts);
  `);
  return pool;
}

export async function closeDb(db, { dropSchema } = {}) {
  if (dropSchema) await db.query(`DROP SCHEMA IF EXISTS "${dropSchema}" CASCADE`);
  await db.end();
}

const fromRow = (x) => ({
  nodeId: x.node_id, boot: x.boot, seq: x.seq, ts: x.ts, sentTs: x.sent_ts, recvTs: x.recv_ts,
  latencyMs: x.latency_ms, moisture: x.moisture, valid: x.valid, temp: x.temp, hum: x.hum,
  pump: x.pump, mode: x.mode, buffered: x.buffered, fault: x.fault,
});

export async function insertReading(db, r) {
  const res = await db.query(
    `INSERT INTO readings
      (node_id, boot, seq, ts, sent_ts, recv_ts, latency_ms, moisture, valid, temp, hum, pump, mode, buffered, fault)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (node_id, boot, seq) DO NOTHING`,
    [r.nodeId, r.boot, r.seq, r.ts, r.sentTs, r.recvTs, r.latencyMs, r.moisture, r.valid,
      r.temp, r.hum, r.pump, r.mode, r.buffered, r.fault]);
  return res.rowCount > 0;
}

// Mengambil `limit` data TERBARU dalam rentang, dikembalikan urut ts naik.
export async function queryReadings(db, { nodeId, from = 0, to = Number.MAX_SAFE_INTEGER, limit = 500 }) {
  const { rows } = await db.query(
    'SELECT * FROM readings WHERE node_id = $1 AND ts >= $2 AND ts <= $3 ORDER BY ts DESC, id DESC LIMIT $4',
    [nodeId, from, to, limit]);
  return rows.reverse().map(fromRow);
}

export async function latestReading(db, nodeId) {
  const { rows } = await db.query(
    'SELECT * FROM readings WHERE node_id = $1 ORDER BY ts DESC, id DESC LIMIT 1', [nodeId]);
  return rows[0] ? fromRow(rows[0]) : null;
}
