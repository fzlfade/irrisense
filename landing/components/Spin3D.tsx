"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { StoryProgress } from "@/lib/storyProgress";
import s from "./spin3d.module.css";

type Props = {
  /** Alamat halaman prototipe dalam mode embed, mis. "/prototipe/?embed=1&bg=12301f". */
  src: string;
  /** Gambar cadangan: tampil bila WebGL tidak ada, gerak dikurangi, atau halaman prototipe tidak tersedia. */
  poster: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  /** Rasio lebar/tinggi di layar sempit, mis. "4 / 3". */
  mobileRatio?: string;
  eager?: boolean;
  /**
   * Mode cerita (dipasang CaraStory hanya di layar lebar tanpa "kurangi gerak"): model dirakit dan kameranya
   * terbang mengikuti progres panggung, bukan berputar mengikuti posisi elemen.
   */
  progress?: StoryProgress;
  storyRatio?: string;
};

/**
 * Model 3D yang berputar mengikuti scroll. Putarannya dikendalikan lewat postMessage ke halaman
 * prototipe (satu asal), jadi landing tidak perlu memuat Three.js sendiri.
 */
export default function Spin3D({ src, poster, alt, width, height, sizes, mobileRatio, eager, progress, storyRatio }: Props) {
  const reduced = useReducedMotion();
  const storyOn = Boolean(progress) && !reduced;
  const frameSrc = storyOn ? `${src}&story=1` : src;
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  // Siap dicatat per alamat: saat mode cerita berganti, iframe baru dimuat dan poster tampil lagi sampai siap.
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const ready = readySrc === frameSrc;
  const drag = useRef<{ id: number; x: number } | null>(null);

  // Seret mendatar diteruskan ke model lewat postMessage (lihat lapisan seret di bawah).
  const postToFrame = (msg: object) => frame.current?.contentWindow?.postMessage(msg, window.location.origin);
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    postToFrame({ type: "irri-dragend" });
  };

  // Iframe baru dimuat setelah halaman selesai, supaya tidak berebut dengan gambar utama.
  useEffect(() => {
    if (reduced) return undefined;
    const go = () => setMounted(true);
    if (document.readyState === "complete") {
      go();
      return undefined;
    }
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, [reduced]);

  useEffect(() => {
    const box = wrap.current;
    const f = frame.current;
    if (reduced || !mounted || !box || !f) return undefined;
    let raf = 0;
    let isReady = false;
    let visible = false;
    const post = (msg: object) => f.contentWindow?.postMessage(msg, window.location.origin);
    const orbit = () => {
      const r = box.getBoundingClientRect();
      const vh = window.innerHeight;
      return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    };
    const send = () => {
      raf = 0;
      if (!isReady) return;
      if (storyOn && progress) post({ type: "irri-progress", p: progress.get() });
      else post({ type: "irri-orbit", p: orbit() });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(send);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== f.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === "irri-ready") {
        isReady = true;
        setReadySrc(frameSrc);
        post({ type: "irri-visible", v: visible });
        send();
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (isReady) post({ type: "irri-visible", v: visible });
      },
      { rootMargin: "100px" },
    );
    io.observe(box);
    window.addEventListener("message", onMessage);
    // Mode cerita: progres datang dari ScrollTrigger CaraStory. Mode biasa: putaran dihitung dari posisi elemen.
    const unsubscribe = storyOn && progress ? progress.subscribe(schedule) : null;
    if (!unsubscribe) {
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
    }
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("message", onMessage);
      unsubscribe?.();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reduced, mounted, storyOn, progress, frameSrc]);

  return (
    <div
      ref={wrap}
      className={s.box}
      style={{
        ["--ar" as string]: storyOn && storyRatio ? storyRatio : `${width} / ${height}`,
        ["--ar-m" as string]: mobileRatio ?? `${width} / ${height}`,
      }}
    >
      <Image
        src={poster}
        alt={alt}
        fill
        sizes={sizes}
        className={s.poster}
        fetchPriority={eager ? "high" : undefined}
        loading={eager ? "eager" : undefined}
      />
      {!reduced && mounted && (
        // key: elemen baru tiap alamat berganti, supaya pergantian mode tidak menambah riwayat tombol Kembali.
        <iframe
          key={frameSrc}
          ref={frame}
          src={frameSrc}
          title={`Model 3D prototipe IrriSense yang ${storyOn ? "dirakit" : "berputar"} mengikuti gulir halaman`}
          aria-hidden="true"
          tabIndex={-1}
          className={s.frame}
          style={{ opacity: ready ? 1 : 0 }}
        />
      )}
      {/*
        Lapisan seret di atas iframe. lenis.css mematikan pointer di iframe selama gulir halus, dan roda tetikus
        di atas iframe tidak sampai ke halaman induk. Lapisan ini menerima roda (halaman tetap bergulir halus) dan
        meneruskan seret mendatar ke model; gesek vertikal di layar sentuh tetap menggulir (touch-action: pan-y).
      */}
      {!reduced && mounted && ready && (
        <div
          aria-hidden="true"
          className={s.drag}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            drag.current = { id: e.pointerId, x: e.clientX };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            const dx = e.clientX - d.x;
            d.x = e.clientX;
            if (dx) postToFrame({ type: "irri-drag", dx });
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
      )}
    </div>
  );
}
