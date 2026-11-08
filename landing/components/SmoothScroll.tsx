"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/** Gulir bawaan browser dipertahankan bila gerak diminta dikurangi atau perangkatnya layar sentuh. */
const NATIVE = "(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)";

/** Pasang Lenis dengan integrasi GSAP dari README Lenis; satu loop raf saja (ticker GSAP). Mengembalikan fungsi bongkar. */
function startLenis(): () => void {
  const lenis = new Lenis({ anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // Selama intro diputar halaman tidak boleh bergulir; gulir dilanjutkan saat intro selesai atau dilewati.
  if (document.documentElement.dataset.intro === "play") lenis.stop();
  const resume = () => lenis.start();
  window.addEventListener("irri-intro-done", resume);

  return () => {
    window.removeEventListener("irri-intro-done", resume);
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

/**
 * Gulir halus untuk tetikus dan touchpad, supaya putaran model 3D dan bagian cerita mengikuti gulir tanpa
 * patah-patah per putaran roda. Ikut berubah bila pengaturan "kurangi gerak" diganti saat halaman terbuka.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const mq = window.matchMedia(NATIVE);
    let stop: (() => void) | null = null;
    const apply = () => {
      stop?.();
      stop = mq.matches ? null : startLenis();
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      stop?.();
    };
  }, []);
  return null;
}
