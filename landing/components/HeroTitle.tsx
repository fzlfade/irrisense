"use client";

import { useIntroState } from "@/lib/useIntroState";
import SplitText from "./reactbits/SplitText";
import s from "./sections.module.css";

/**
 * Judul hero. Animasi hurufnya baru dimulai setelah intro selesai (atau langsung bila intro dilewati),
 * supaya tidak habis tersembunyi di balik penutup intro. Sebelum itu (dan tanpa JavaScript) yang tampil
 * adalah <h1> biasa; atribut data-intro di <html> menyembunyikannya sementara agar tidak berkedip.
 */
export default function HeroTitle() {
  const intro = useIntroState();
  if (intro === "server" || intro === "play") {
    return <h1 className={`${s.heroTitle} hero-plain`}>IrriSense</h1>;
  }
  return (
    <SplitText
      tag="h1"
      text="IrriSense"
      className={s.heroTitle}
      textAlign="left"
      splitType="chars"
      effect="rise"
      trigger="load"
      delay={55}
      duration={0.9}
    />
  );
}
