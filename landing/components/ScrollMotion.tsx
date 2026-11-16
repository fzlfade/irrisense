"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Syarat gerak angka: layar minimal 48rem dan tanpa "kurangi gerak". */
const QUERY = "(min-width: 48rem) and (prefers-reduced-motion: no-preference)";

/**
 * Gerak gulir di beranda (tujuannya tertulis di design/DESIGN.md): angka 60–80 % bergeser mendatar tipis selama
 * bagian Masalah lewat. Mengikuti gulir (scrub) dan hanya mengubah transform. gsap.matchMedia memasangnya hanya saat
 * QUERY cocok, dan membongkarnya beserta gaya inline-nya saat tidak lagi cocok (mis. layar diperkecil atau
 * "kurangi gerak" dinyalakan). Elemen sasarannya ditandai data-motion di Sections.tsx.
 */
export default function ScrollMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(QUERY, () => {
      const value = document.querySelector<HTMLElement>('[data-motion="drift"]');
      const section = value?.closest("section");
      if (value && section) {
        gsap.fromTo(
          value,
          { x: "-2vw" },
          { x: "2vw", ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true } },
        );
      }
    });
    return () => mm.revert();
  });
  return null;
}
