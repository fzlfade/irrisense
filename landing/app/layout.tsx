import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import Intro from "@/components/Intro";
import SiteHeader from "@/components/SiteHeader";
import SmoothScroll from "@/components/SmoothScroll";
import "./tokens.css";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IrriSense | Penyiraman tetes otomatis untuk kebun vanili",
  description:
    "Sistem penyiraman tetes otomatis berbasis IoT untuk perkebunan vanili. Capstone Design 2026, Universitas Tidar.",
};

// Dijalankan di <head> sebelum halaman tergambar: tentukan apakah intro diputar, supaya tidak berkedip.
const INTRO_SCRIPT =
  'try{var d=document.documentElement;d.dataset.intro=(sessionStorage.getItem("irri-intro")==="1"||matchMedia("(prefers-reduced-motion: reduce)").matches)?"skip":"play"}catch(e){}';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body>
        <noscript>
          <style>{".split-parent{visibility:visible!important}.intro{display:none!important}"}</style>
        </noscript>
        <Intro />
        <SmoothScroll />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
