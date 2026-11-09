import Image from "next/image";
import s from "./sections.module.css";

const team = [
  "Faizal Deshta Nugraha (ketua)",
  "Muhamad Rifa'i",
  "Fahmi Aulia Mustofa",
  "Vincensius A. M. Prabaswara",
  "Ilhan Ha'is Munjazi",
];

/** Footer situs: tim dan kampus. Dipasang di layout, jadi tampil di beranda dan halaman Spesifikasi. */
export default function SiteFooter() {
  return (
    <footer className={s.tim} aria-labelledby="tim-judul">
      <div className={`${s.wrap} ${s.timGrid}`}>
        <div>
          <h2 id="tim-judul" className={s.h2}>
            Tim IrriSense
          </h2>
          <p className={s.body}>Capstone Design 2026, Fakultas Teknik, Universitas Tidar.</p>
          <ul className={s.team}>
            {team.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className={s.body}>
            Dosen pembimbing: <strong>Kukuh Trisna Pambudi, S.T., M.Eng.</strong>
          </p>
        </div>
        <Image
          src="/img/logo-untidar.png"
          alt="Logo Universitas Tidar"
          width={500}
          height={500}
          className={s.logo}
        />
      </div>
    </footer>
  );
}
