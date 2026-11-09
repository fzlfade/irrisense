/**
 * Progres panggung cerita Cara kerja (0 sampai 1). CaraStory menulisnya dari ScrollTrigger, Spin3D membacanya
 * dan meneruskannya ke model 3D, tanpa render ulang React di tiap frame gulir.
 */
export type StoryProgress = {
  get(): number;
  set(p: number): void;
  subscribe(fn: (p: number) => void): () => void;
};

export function createStoryProgress(): StoryProgress {
  let value = 0;
  const fns = new Set<(p: number) => void>();
  return {
    get: () => value,
    set(p) {
      value = p;
      fns.forEach((fn) => fn(p));
    },
    subscribe(fn) {
      fns.add(fn);
      return () => {
        fns.delete(fn);
      };
    },
  };
}

// Progres saat kamera tiba di tiap langkah, dan lama kamera diam di sekitarnya.
// Harus sama dengan backend/prototipe/scene.js (dijaga backend/test/story.test.js).
export const WAYPOINTS = [0.15, 0.4, 0.65, 0.9];
export const HOLD = 0.05;

/** Langkah aktif = waypoint terdekat; batasnya di tengah antara dua waypoint. */
export function stepAt(p: number): number {
  let i = 0;
  while (i < WAYPOINTS.length - 1 && p > (WAYPOINTS[i] + WAYPOINTS[i + 1]) / 2) i++;
  return i;
}
