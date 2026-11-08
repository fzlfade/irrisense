"use client";

import { useEffect } from "react";
import { useIntroState } from "@/lib/useIntroState";

/**
 * Intro "tetes air": setetes air jatuh, air memenuhi layar, nama muncul, lalu penutup memudar.
 * Animasinya murni CSS (globals.css) dan selesai sendiri; komponen ini hanya mengurus lewati, ingatan "sudah
 * diputar sekali per kunjungan", dan memberi tahu bagian lain (judul hero) bahwa intro selesai.
 * Status dibaca dari atribut data-intro di <html> yang dipasang skrip di <head> sebelum halaman tergambar:
 * "play" (putar), "skip" (sudah diputar atau gerak dikurangi), "done" (selesai).
 */
export default function Intro() {
  const intro = useIntroState();

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return undefined;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        sessionStorage.setItem("irri-intro", "1");
      } catch {
        /* penyimpanan diblokir: intro akan diputar lagi di kunjungan berikutnya */
      }
      root.dataset.intro = "done";
      window.dispatchEvent(new Event("irri-intro-done"));
    };
    const el = document.querySelector(".intro");
    const onEnd = (e: Event) => {
      if ((e as AnimationEvent).animationName === "intro-fade") finish();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    el?.addEventListener("animationend", onEnd);
    window.addEventListener("keydown", onKey);
    root.addEventListener("irri-intro-skip", finish);
    const fallback = window.setTimeout(finish, 4000);
    return () => {
      el?.removeEventListener("animationend", onEnd);
      window.removeEventListener("keydown", onKey);
      root.removeEventListener("irri-intro-skip", finish);
      window.clearTimeout(fallback);
    };
  }, []);

  if (intro !== "server" && intro !== "play") return null;

  return (
    <div
      className="intro"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".intro__skip")) return;
        document.documentElement.dispatchEvent(new Event("irri-intro-skip"));
      }}
    >
      <span className="intro__drop" aria-hidden="true" />
      <span className="intro__water" aria-hidden="true" />
      <span className="intro__word" aria-hidden="true">
        IrriSense
      </span>
      <button
        type="button"
        className="intro__skip"
        onClick={() => document.documentElement.dispatchEvent(new Event("irri-intro-skip"))}
      >
        Lewati
      </button>
    </div>
  );
}
