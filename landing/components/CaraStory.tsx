"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Spin3D from "./Spin3D";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { createStoryProgress, HOLD, stepAt, WAYPOINTS } from "@/lib/storyProgress";
import s from "./sections.module.css";
import m from "./storyMarker.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Panggung butuh layar lebar dan cukup tinggi: daftar empat langkah dan model harus muat dalam satu layar.
const STAGE = "(min-width: 64rem) and (min-height: 36rem)";
function useStageFits(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(STAGE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(STAGE).matches,
    () => false,
  );
}

type Step = { title: string; text: string };

/**
 * Daftar langkah dan model 3D bagian Cara kerja. Di layar lebar tanpa "kurangi gerak", pembungkusnya setinggi
 * --story-length dan panggung satu layar menempel; satu ScrollTrigger mengubah posisi gulir menjadi progres 0..1
 * yang menyorot langkah dan merakit model. Tanpa JavaScript, layar sempit, atau "kurangi gerak": daftar biasa.
 */
export default function CaraStory({ steps }: { steps: Step[] }) {
  const reduced = useReducedMotion();
  const fits = useStageFits();
  const on = fits && !reduced;
  const root = useRef<HTMLDivElement>(null);
  const [progress] = useState(createStoryProgress);

  useGSAP(
    () => {
      const el = root.current;
      if (!on || !el) return undefined;
      const items = Array.from(el.querySelectorAll<HTMLElement>("ol > li"));
      let active = -1;
      const mark = (p: number) => {
        progress.set(p);
        const i = stepAt(p);
        if (i === active) return;
        active = i;
        items.forEach((li, k) => {
          li.dataset.active = String(k === i);
        });
      };
      // --lit (0..1) per langkah: CSS menurunkan warna dan geseran darinya. Peralihan terjadi saat kamera terbang.
      gsap.set(items, { "--lit": (k: number) => (k === 0 ? 1 : 0) });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => mark(self.progress),
          onRefresh: (self) => mark(self.progress),
        },
      });
      for (let i = 0; i < items.length - 1; i++) {
        const at = WAYPOINTS[i] + HOLD;
        const dur = WAYPOINTS[i + 1] - HOLD - at;
        tl.to(items[i], { "--lit": 0, duration: dur }, at).to(items[i + 1], { "--lit": 1, duration: dur }, at);
      }
      // Penanda progres di sisi layar terisi sebanding progres panggung.
      const fill = el.querySelector<HTMLElement>('[data-motion="story-fill"]');
      if (fill) tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0);
      tl.set({}, {}, 1); // panjang timeline = 1, jadi waktunya sama dengan progres gulir
      mark(tl.scrollTrigger?.progress ?? 0);
      // Font yang selesai dimuat menggeser tinggi bagian di atas; hitung ulang posisi awal dan akhir.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());
      return () => {
        items.forEach((li) => {
          delete li.dataset.active;
        });
      };
    },
    { scope: root, dependencies: [on], revertOnUpdate: true },
  );

  const caption = on
    ? "Rancangan 3D prototipe di rangka paralon, ukuran perkiraan 100 × 60 × 75 cm. Gulir untuk merakitnya langkah demi langkah, seret untuk memutar."
    : reduced
      ? "Susunan prototipe di rangka paralon, ukuran perkiraan 100 × 60 × 75 cm (rancangan 3D, casing terbuka)."
      : "Susunan prototipe di rangka paralon, ukuran perkiraan 100 × 60 × 75 cm (rancangan 3D, casing terbuka). Gulir atau seret untuk memutar.";

  return (
    <div ref={root} className={s.story} data-story={on ? "on" : undefined}>
      <div className={s.stage}>
        {on && (
          <div className={m.marker} aria-hidden="true" data-motion="story-bar">
            <span className={m.fill} data-motion="story-fill" />
            {WAYPOINTS.map((w) => (
              <span key={w} className={m.tick} data-motion="story-tick" style={{ top: `${w * 100}%` }} />
            ))}
          </div>
        )}
        <div className={`${s.wrap} ${s.caraGrid}`}>
          <ol id="cara-langkah" className={s.steps}>
            {steps.map((step) => (
              <li key={step.title} className={s.step}>
                <h3 className={s.h3}>{step.title}</h3>
                <p className={s.body}>{step.text}</p>
              </li>
            ))}
          </ol>
          <figure className={s.caraFigure}>
            <div className={s.caraFrame}>
              <Spin3D
                src="/prototipe/?embed=1&bg=fbf8ee&open=1&cam=-110,120,230&tgt=-10,25,10"
                poster="/img/prototipe-terbuka.webp"
                alt="Rancangan 3D prototipe di rangka paralon dengan casing terbuka, memperlihatkan ESP32, relay, galon dan pompa, sensor tanah, dan sensor suhu di tiang."
                width={1500}
                height={900}
                sizes="(min-width: 64rem) 60vw, 100vw"
                progress={on ? progress : undefined}
                storyRatio="5 / 4"
              />
            </div>
            <figcaption className={s.captionDark}>{caption}</figcaption>
            <a className={s.link} href="/prototipe/">
              Coba prototipe 3D dengan live test
            </a>
          </figure>
        </div>
      </div>
    </div>
  );
}
