"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
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
};

/**
 * Model 3D yang berputar mengikuti scroll. Putarannya dikendalikan lewat postMessage ke halaman
 * prototipe (satu asal), jadi landing tidak perlu memuat Three.js sendiri.
 */
export default function Spin3D({ src, poster, alt, width, height, sizes, mobileRatio, eager }: Props) {
  const reduced = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);

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
    const progress = () => {
      const r = box.getBoundingClientRect();
      const vh = window.innerHeight;
      return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    };
    const send = () => {
      raf = 0;
      if (isReady) post({ type: "irri-orbit", p: progress() });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(send);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== f.contentWindow) return;
      if ((e.data as { type?: string } | null)?.type === "irri-ready") {
        isReady = true;
        setReady(true);
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
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced, mounted]);

  return (
    <div
      ref={wrap}
      className={s.box}
      style={{ ["--ar" as string]: `${width} / ${height}`, ["--ar-m" as string]: mobileRatio ?? `${width} / ${height}` }}
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
        <iframe
          ref={frame}
          src={src}
          title="Model 3D prototipe IrriSense yang berputar mengikuti gulir halaman"
          aria-hidden="true"
          tabIndex={-1}
          className={s.frame}
          style={{ opacity: ready ? 1 : 0 }}
        />
      )}
    </div>
  );
}
