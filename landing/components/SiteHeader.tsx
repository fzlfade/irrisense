import Link from "next/link";
import NavMenu from "./NavMenu";
import s from "./siteHeader.module.css";

/** Tautan hanya ke tujuan yang sudah ada (antislop R-24). Tambah "Spesifikasi" bila halamannya sudah dibuat. */
const LINKS = [
  { href: "/#cara-kerja", label: "Cara kerja" },
  { href: "/prototipe/", label: "Uji coba" },
  { href: "/dashboard/", label: "Dashboard" },
];

export default function SiteHeader() {
  return (
    <header className={s.header}>
      <a className={s.skip} href="#konten">
        Lewati ke konten
      </a>
      <div className={s.bar}>
        <Link className={s.brand} href="/">
          IrriSense
        </Link>
        <nav aria-label="Utama" className={s.nav}>
          {/* Di ponsel daftar dibuka lewat tombol ini (atribut HTML popover, tanpa JavaScript). */}
          <button type="button" className={s.menuButton} popoverTarget="menu-utama">
            Menu
          </button>
          <NavMenu id="menu-utama" className={s.list} links={LINKS} />
        </nav>
      </div>
    </header>
  );
}
