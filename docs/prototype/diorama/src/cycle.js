// Siklus kelembapan dipercepat. Semua nilai fungsi murni dari t (detik), tanpa state antar-frame.
// Ambang sama dengan firmware/src/config.h: pompa ON bila rata-rata < 60, OFF bila >= 80.
export const LOOP = 24;
export const M_SET = 60;
export const M_MAX = 80;
const START = 66;              // rata-rata saat t = 0 dan t = LOOP (sambungan loop)
const DRY = 6.2 / 6;           // %/detik, laju mengering sebelum pompa
const PEAK = 80.6;             // sedikit naik setelah pompa mati (air sisa di selang)
export const OFFSETS = [3, -1, -4, 2, 4, -4]; // selisih tiap sensor; jumlah 0 agar rata-rata tetap

export const T = {};
T.on = (START - M_SET) / DRY;  // rata-rata menyentuh 60
T.flow = T.on + 0.9;           // air sampai di dripper
T.off = 15.0;                  // rata-rata menyentuh 80
T.stop = T.off + 0.4;          // tetes terakhir
const LOW = START - DRY * T.flow;

export const wrap = (t) => ((t % LOOP) + LOOP) % LOOP;
const easeOut = (u) => 1 - (1 - u) * (1 - u);

export function avgAt(time) {
  const t = wrap(time);
  if (t <= T.flow) return START - DRY * t;
  if (t <= T.off) return LOW + (M_MAX - LOW) * easeOut((t - T.flow) / (T.off - T.flow));
  if (t <= T.stop) return M_MAX + (PEAK - M_MAX) * ((t - T.off) / (T.stop - T.off));
  return PEAK - (PEAK - START) * ((t - T.stop) / (LOOP - T.stop));
}

export const sensorsAt = (t) => OFFSETS.map((o) => avgAt(t) + o);
export const pumpOnAt = (t) => { const u = wrap(t); return u >= T.on && u < T.off; };
export const flowAt = (t) => { const u = wrap(t); return u >= T.flow && u < T.stop; };
