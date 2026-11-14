// Fungsi murni untuk tampilan (tanpa DOM) agar bisa diuji.
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const M_SET = 60;   // pompa ON di bawah ini (sama dengan firmware dan sim.js)
export const M_MAX = 80;   // pompa OFF di atas atau sama dengan ini
export const STALE_MS = 20_000;   // firmware kirim tiap 5 detik; 4 kali terlewat dianggap basi

export const formatMoisture = (v) => (isNum(v) ? `${v.toFixed(1)} %` : '---');
export const formatTemp = (v) => (isNum(v) ? `${v.toFixed(1)} °C` : '---');
export const formatHum = (v) => (isNum(v) ? `${Math.round(v)} %` : '---');
export const pumpLabel = (pump, mode) => `${pump ? 'ON' : 'OFF'} · ${String(mode).toUpperCase()}`;

export function faultMessage(fault) {
  if (fault === 'no_sensor') return 'Sensor tanah tidak terbaca, jadi pompa dimatikan demi keamanan. Cek kabel dan colokan sensor.';
  if (fault === 'max_run') return 'Pompa berhenti sendiri karena menyala melewati batas waktu 10 menit. Cek isi tandon dan selang tetes, lalu ganti mode untuk membuka kuncinya.';
  return null;
}

/** Posisi rata-rata terhadap target: 'low' (di bawah 60), 'in' (60 sampai 80), 'high' (80 ke atas), atau null. */
export function zone(moisture) {
  if (!isNum(moisture)) return null;
  if (moisture < M_SET) return 'low';
  if (moisture >= M_MAX) return 'high';
  return 'in';
}

/** Umur data dalam kalimat biasa: "baru saja", "12 detik lalu", "3 menit lalu", "2 jam lalu". */
export function ageText(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return 'baru saja';
  if (s < 60) return `${s} detik lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

/**
 * Keadaan layar: 'loading' | 'error' | 'empty' | 'offline' | 'fault' | 'ok'.
 * Urutan penting: galat server mengalahkan semuanya, lalu data kosong, node mati, galat pompa.
 */
export function screenState({ loaded, apiError, reading, online }) {
  if (apiError && !reading) return 'error';
  if (!loaded) return 'loading';
  if (!reading) return 'empty';
  if (!online) return 'offline';
  if (reading.fault && reading.fault !== 'none') return 'fault';
  return 'ok';
}

/** Kalimat alasan di bawah status pompa. Menjelaskan kenapa pompa begini dan kapan berubah. */
export function pumpReason(r) {
  if (!r) return '';
  if (r.mode === 'manual') {
    return r.pump
      ? 'Mode manual: pompa menyala sampai dimatikan, dan berhenti sendiri setelah 10 menit.'
      : 'Mode manual: pompa tidak mengikuti kelembapan. Nyalakan sendiri bila tanah perlu air.';
  }
  const z = zone(r.moisture);
  if (z === null) return 'Rata-rata belum bisa dihitung karena tidak ada sensor tanah yang terbaca.';
  const m = formatMoisture(r.moisture);
  if (r.pump) {
    return z === 'low'
      ? `Rata-rata ${m} di bawah ${M_SET} %, jadi pompa menyala sampai rata-rata mencapai ${M_MAX} %.`
      : `Pompa tetap menyala sampai rata-rata mencapai ${M_MAX} % (sekarang ${m}).`;
  }
  if (z === 'low') return `Rata-rata ${m} di bawah ${M_SET} %. Pompa akan menyala sendiri.`;
  if (z === 'high') return `Tanah cukup basah (${m}). Pompa mati sampai rata-rata turun di bawah ${M_SET} %.`;
  return `Rata-rata ${m} masih di dalam target. Pompa mati sampai turun di bawah ${M_SET} %.`;
}

export function toSeries(readings) {
  return {
    t: readings.map((r) => r.ts),
    moisture: readings.map((r) => (isNum(r.moisture) ? r.moisture : null)),
    temp: readings.map((r) => (isNum(r.temp) ? r.temp : null)),
    hum: readings.map((r) => (isNum(r.hum) ? r.hum : null)),
  };
}
