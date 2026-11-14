"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Syarat gerak hero dan angka: layar minimal 48rem dan tanpa "kurangi gerak". */
const QUERY = "(min-width: 48rem) and (prefers-reduced-motion: no-preference)";

/**
 * Dua gerak gulir di beranda (tujuannya tertulis di design/DESIGN.md): pita hero menyempit dan membulat saat
 * ditinggalkan, dan angka 60–80 % bergeser mendatar tipis selama bagian Masalah lewat. Keduanya mengikuti gulir
 * (scrub) dan hanya mengubah clip-path dan transform. gsap.matchMedia memasangnya hanya saat QUERY cocok, dan
 * membongkarnya beserta gaya inline-nya saat tidak lagi cocok (mis. layar diperkecil atau "kurangi gerak" dinyalakan).
 * Elemen sasarannya ditandai data-motion di Sections.tsx.
 */
export default function ScrollMotion() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(QUERY, () => {
      const hero = document.querySelector<HTMLElement>('[data-motion="hero"]');
      if (hero) {
        // 14px = --radius (aturan bentuk di DESIGN.md).
        gsap.fromTo(
          hero,
          { clipPath: "inset(0% 0% 0% 0% round 0px 0px 0px 0px)" },
          {
            clipPath: "inset(0% 3% 0% 3% round 0px 0px 14px 14px)",
            ease: "none",
            scrollTrigger: { trigger: hero, start: "bottom bottom", end: "bottom top", scrub: true },
          },
        );
      }
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
