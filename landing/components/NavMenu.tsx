"use client";

type Props = { id: string; className: string; links: { href: string; label: string }[] };

/**
 * Daftar tautan navigasi. Di ponsel ia popover yang dibuka tombol "Menu"; di desktop tampil sebaris (CSS).
 * Satu-satunya tugas JavaScript di sini: menutup popover saat tautan diketuk, supaya anchor di halaman
 * yang sama (mis. /#cara-kerja) tidak tertutup menu. Tanpa JavaScript menu tetap bisa dibuka dan ditutup.
 */
export default function NavMenu({ id, className, links }: Props) {
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
          <a href={l.href}>{l.label}</a>
        </li>
      ))}
    </ul>
  );
}
