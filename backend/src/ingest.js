// Parser telemetri sesuai Kontrak Bersama. Tidak pernah melempar: payload buruk -> null.
const MODES = ['auto', 'manual'];
const FAULTS = ['none', 'no_sensor', 'max_run'];

const isUint = (v) => Number.isInteger(v) && v >= 0;
const isNullableNum = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));

export function parseTelemetry(payload, nodeId, recvMs) {
  let o;
  try {
    o = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8'));
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;

  const { boot, seq, ts, moisture, valid, temp, hum, pump, mode, buffered, fault } = o;
  if (!isUint(boot) || !isUint(seq) || !isUint(ts) || !isUint(valid)) return null;
  if (!isNullableNum(moisture) || !isNullableNum(temp) || !isNullableNum(hum)) return null;
  if (moisture !== null && (moisture < 0 || moisture > 100)) return null;
  if (typeof pump !== 'boolean' || typeof buffered !== 'boolean') return null;
  if (!MODES.includes(mode) || !FAULTS.includes(fault)) return null;

  const lat = recvMs - ts;
  const latencyMs = !buffered && ts > 0 && lat >= 0 ? lat : null;
  return {
    nodeId, boot, seq,
    ts: ts > 0 ? ts : recvMs,
    sentTs: ts, recvTs: recvMs, latencyMs,
    moisture, valid, temp, hum, pump, mode, buffered, fault,
  };
}
