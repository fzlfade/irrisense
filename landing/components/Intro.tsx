"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useIntroState } from "@/lib/useIntroState";
import { isLoaded, loadPercent, markLoaded, onLoadChange } from "@/lib/loadProgress";

/** Penutup paling cepat mulai memudar setelah tampil selama ini, supaya tidak berkedip. Batas atasnya ada di CSS. */
const MIN_MS = 1200;

const zero = () => 0;
const no = () => false;
const fontsLoaded = () => isLoaded("fonts");

/**
 * Layar muat "tetes air": setetes air jatuh, lalu air naik mengikuti progres muat sungguhan (huruf, poster hero,
 * model 3D hero) dan penutup memudar. Batas atasnya murni CSS (globals.css): animasi intro-fade memudarkan penutup
 * paling lambat 3,5 detik setelah tampil, dan bila JavaScript belum jalan saat itu, skrip di <head> (layout.tsx)
 * yang menutup intro. Komponen ini hanya mempercepatnya: bila semua sudah dimuat dan penutup sudah tampil
 * 1,2 detik, animasi itu dilompatkan ke awal pudarnya.
 * Status dibaca dari atribut data-intro di <html> yang dipasang skrip di <head> sebelum halaman tergambar:
 * "play" (putar), "skip" (sudah diputar atau gerak dikurangi), "done" (selesai).
 * Hanya di beranda: halaman lain (mis. Spesifikasi) langsung tampil tanpa layar muat.
 */
export default function Intro() {
  const home = usePathname() === "/";
  const intro = useIntroState();
  const percent = useSyncExternalStore(onLoadChange, loadPercent, zero);
  const fontsReady = useSyncExternalStore(onLoadChange, fontsLoaded, no);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return undefined;
    let finished = false;
    // Selama penutup tampil, isi halaman di belakangnya inert: Tab tidak pindah ke tautan yang tertutup penutup.
    let blocked: Element[] = [];
    const release = () => {
      blocked.forEach((n) => n.removeAttribute("inert"));
      blocked = [];
    };
    const finish = () => {
      release();
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

    const el = document.querySelector<HTMLElement>(".intro");
    const fade = el?.getAnimations().find((a) => (a as CSSAnimation).animationName === "intro-fade");
    // Tanpa animasi pudar (CSS tidak termuat): tidak ada batas waktu, jadi langsung selesai.
    if (!el || !fade) {
      finish();
      return undefined;
    }

    // Jam kedua animasi penutup dihitung dari saat penutup tergambar pertama (first-paint). Saat halaman sibuk, jam itu
    // bisa mulai sedikit lebih lambat; disamakan supaya batas 1,2 dan 3,5 detik dihitung dari saat penutup terlihat.
    const paint =
      performance.getEntriesByName("first-paint")[0] ?? performance.getEntriesByName("first-contentful-paint")[0];
    if (paint) {
      el.getAnimations().forEach((a) => {
        a.startTime = paint.startTime;
      });
    }
    // Pudarnya sudah habis sebelum JavaScript sempat jalan (jaringan lambat).
    if (fade.playState === "finished") {
      finish();
      return undefined;
    }

    blocked = [...document.body.children].filter((n) => n !== el && !n.hasAttribute("inert"));
    blocked.forEach((n) => n.setAttribute("inert", ""));

    void (document.fonts?.ready ?? Promise.resolve()).then(() => markLoaded("fonts"));

    let leaveTimer = 0;
    const leaveWhenLoaded = () => {
      if (leaveTimer || loadPercent() < 100) return;
      const fadeAt = Number(fade.effect?.getTiming().delay ?? 0);
      leaveTimer = window.setTimeout(
        () => {
          // Mulai pudar sekarang, kecuali batas atas di CSS sudah lebih dulu memulainya.
          if (Number(fade.currentTime) < fadeAt) fade.currentTime = fadeAt;
        },
        Math.max(0, MIN_MS - Number(fade.currentTime)),
      );
    };
    const stopWatching = onLoadChange(leaveWhenLoaded);
    leaveWhenLoaded();

    const onEnd = (e: AnimationEvent) => {
      if (e.animationName === "intro-fade") finish();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    el.addEventListener("animationend", onEnd);
    el.addEventListener("animationcancel", onEnd);
    window.addEventListener("keydown", onKey);
    root.addEventListener("irri-intro-skip", finish);
    // Jaring pengaman bila event animasi tidak datang; pudar di CSS sudah selesai 3,5 detik setelah penutup tampil.
    const fallback = window.setTimeout(finish, 4000);
    return () => {
      release();
      stopWatching();
      window.clearTimeout(leaveTimer);
      window.clearTimeout(fallback);
      el.removeEventListener("animationend", onEnd);
      el.removeEventListener("animationcancel", onEnd);
      window.removeEventListener("keydown", onKey);
      root.removeEventListener("irri-intro-skip", finish);
    };
  }, []);

  if (!home || (intro !== "server" && intro !== "play")) return null;

  // Teks hanya berubah per 10 % (bobot di loadProgress kelipatan 10), supaya pembaca layar tidak dibanjiri.
  const shown = Math.floor(percent / 10) * 10;

  return (
    <div
      className="intro"
      data-fonts={fontsReady ? "" : undefined}
      style={{ ["--intro-progress" as string]: percent / 100 }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".intro__skip")) return;
        document.documentElement.dispatchEvent(new Event("irri-intro-skip"));
      }}
    >
      <div className="intro__bar">
        <span className="intro__status" role="status">
          {`Memuat halaman ${shown} %`}
        </span>
        <button
          type="button"
          className="intro__skip"
          onClick={() => document.documentElement.dispatchEvent(new Event("irri-intro-skip"))}
        >
          Lewati
        </button>
      </div>
      <div className="intro__tank" aria-hidden="true">
        <span className="intro__water" />
        <span className="intro__drop" />
        <span className="intro__word">IrriSense</span>
      </div>
    </div>
  );
}
