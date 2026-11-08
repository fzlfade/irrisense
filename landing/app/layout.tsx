import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable}`}>
      <body>
        <noscript>
          <style>{".split-parent{visibility:visible!important}"}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
