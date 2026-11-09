/**
 * Progres muat untuk layar muat (Intro). Tiap bagian yang dibutuhkan tampilan pertama dicatat sekali saat selesai.
 * Bobot kira-kira sebanding ukuran unduhannya (huruf sekitar 183 KB, poster hero 20 KB, JavaScript model 3D hero
 * sekitar 184 KB gzip), dibulatkan ke puluhan supaya teks progres naik per 10 %.
 */
const WEIGHTS = { fonts: 40, poster: 10, model: 50 } as const;

export type LoadPart = keyof typeof WEIGHTS;

const TOTAL = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
const done = new Set<LoadPart>();
const listeners = new Set<() => void>();
let percent = 0;

export function markLoaded(part: LoadPart): void {
  if (done.has(part)) return;
  done.add(part);
  let sum = 0;
  done.forEach((p) => {
    sum += WEIGHTS[p];
  });
  percent = Math.round((sum / TOTAL) * 100);
  listeners.forEach((fn) => fn());
}

/** Persen bagian yang sudah dimuat, 0 sampai 100. */
export const loadPercent = (): number => percent;

export const isLoaded = (part: LoadPart): boolean => done.has(part);

export function onLoadChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
