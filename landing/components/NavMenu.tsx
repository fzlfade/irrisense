"use client";

import { usePathname } from "next/navigation";

type Props = { id: string; className: string; links: { href: string; label: string }[] };

/** "/spesifikasi/" dan "/spesifikasi" dianggap sama (ekspor statis memakai garis miring di akhir). */
const trim = (path: string) => path.replace(/\/+$/, "") || "/";

/**
 * Daftar tautan navigasi. Di ponsel ia popover yang dibuka tombol "Menu"; di desktop tampil sebaris (CSS).
 * Tugas JavaScript di sini: menutup popover saat tautan diketuk, supaya anchor di halaman yang sama
 * (mis. /#cara-kerja) tidak tertutup menu, dan menandai tautan halaman yang sedang dibuka (aria-current).
 * Tanpa JavaScript menu tetap bisa dibuka dan ditutup.
 */
export default function NavMenu({ id, className, links }: Props) {
  const here = trim(usePathname() ?? "/");
  return (
    <ul
      id={id}
      className={className}
      popover="auto"
      onClick={(e) => {
        const list = e.currentTarget;
        if ((e.target as HTMLElement).closest("a") && list.matches(":popover-open")) list.hidePopover();
      }}
    >
      {links.map((l) => (
        <li key={l.href}>
          <a href={l.href} aria-current={!l.href.includes("#") && trim(l.href) === here ? "page" : undefined}>
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
