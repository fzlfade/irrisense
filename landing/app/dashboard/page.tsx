import type { Metadata } from "next";
import s from "../spesifikasi/page.module.css";
import d from "./page.module.css";

// Hanya tampil di situs statis (Vercel). Lewat backend di laptop, Express menyajikan dashboard asli di /dashboard/
// sebelum berkas landing, jadi halaman ini tertutup di sana.
export const metadata: Metadata = {
  title: "Dashboard | IrriSense",
  description: "Dashboard IrriSense membaca data langsung dari alat, jadi hanya bisa dibuka di laptop yang menjalankan servernya.",
  robots: { index: false },
};

export default function Dashboard() {
  return (
    <main id="konten" className={s.page}>
      <div className={s.head}>
        <div className={s.wrap}>
          <h1 className={s.title}>Dashboard</h1>
          <p className={s.lead}>
            Dashboard menampilkan kelembapan tanah, suhu udara, dan status pompa langsung dari alat di kebun. Karena
            datanya datang dari alat, dashboard hanya bisa dibuka di laptop yang menjalankan server IrriSense.
          </p>
        </div>
      </div>
      <section className={s.section} aria-labelledby="coba-judul">
        <div className={`${s.wrap} ${s.side}`}>
          <h2 id="coba-judul" className={s.h2}>
            Coba cara kerjanya sekarang
          </h2>
          <p>
            Prototipe 3D menjalankan aturan pompa yang sama dengan firmware sebagai simulasi di browser. Keringkan atau
            basahi tanahnya, lalu lihat kapan pompa menyala dan berhenti.
          </p>
          <p className={d.links}>
            <a className={s.link} href="/prototipe/">
              Buka prototipe 3D
            </a>
            <a className={s.link} href="/spesifikasi/">
              Lihat spesifikasi alat
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
