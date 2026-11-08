// Fungsi murni untuk tampilan (tanpa DOM) agar bisa diuji.
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const formatMoisture = (v) => (isNum(v) ? `${v.toFixed(1)} %` : '---');
export const formatTemp = (v) => (isNum(v) ? `${v.toFixed(1)} °C` : '---');
export const formatHum = (v) => (isNum(v) ? `${Math.round(v)} %` : '---');
export const pumpLabel = (pump, mode) => `${pump ? 'ON' : 'OFF'} · ${String(mode).toUpperCase()}`;

export function faultMessage(fault) {
  if (fault === 'no_sensor') return 'Sensor tanah tidak terbaca — pompa dimatikan';
  if (fault === 'max_run') return 'Pompa berhenti: melewati batas waktu nyala — cek reservoir/emitter';
  return null;
}

export function toSeries(readings) {
  return {
    t: readings.map((r) => r.ts),
    moisture: readings.map((r) => (isNum(r.moisture) ? r.moisture : null)),
    temp: readings.map((r) => (isNum(r.temp) ? r.temp : null)),
    hum: readings.map((r) => (isNum(r.hum) ? r.hum : null)),
  };
}
