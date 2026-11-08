"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  /**
   * Mode cerita (hanya layar lebar dan tanpa "kurangi gerak"): kamera terbang ke bagian yang dibahas
   * oleh langkah yang sedang di tengah layar. `listId` = id elemen daftar yang anak-anaknya adalah langkah.
   */
  story?: { listId: string };
  storyRatio?: string;
};

const WIDE = "(min-width: 64rem)";
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/**
 * Model 3D yang berputar mengikuti scroll. Putarannya dikendalikan lewat postMessage ke halaman
 * prototipe (satu asal), jadi landing tidak perlu memuat Three.js sendiri.
 */
export default function Spin3D({ src, poster, alt, width, height, sizes, mobileRatio, eager, story, storyRatio }: Props) {
  const reduced = useReducedMotion();
  const wide = useWide();
  const storyOn = Boolean(story) && wide && !reduced;
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
    // Mode cerita: langkah ke-i dianggap "aktif" saat pusatnya melewati tengah layar; nilai u berpecahan antar-langkah.
    const list = storyOn && story ? document.getElementById(story.listId) : null;
    if (list) list.dataset.story = "on";
    const storyU = () => {
      const items = Array.from(list?.children ?? []) as HTMLElement[];
      const focus = window.innerHeight * 0.5;
      const mids = items.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      let u = mids.length - 1;
      if (focus <= mids[0]) u = 0;
      else {
        for (let i = 0; i < mids.length - 1; i++) {
          if (focus < mids[i + 1]) {
            u = i + (focus - mids[i]) / (mids[i + 1] - mids[i]);
            break;
          }
        }
      }
      items.forEach((el, i) => {
        el.dataset.active = String(i === Math.round(u));
      });
      return u;
    };
    const send = () => {
      raf = 0;
      if (!isReady) return;
      if (list) post({ type: "irri-story", u: storyU() });
      else post({ type: "irri-orbit", p: progress() });
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
    if (list) onScroll();
    return () => {
      if (list) {
        delete list.dataset.story;
        Array.from(list.children).forEach((el) => delete (el as HTMLElement).dataset.active);
      }
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced, mounted, storyOn, story]);

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
        <iframe
          ref={frame}
          src={storyOn ? `${src}&story=1` : src}
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
