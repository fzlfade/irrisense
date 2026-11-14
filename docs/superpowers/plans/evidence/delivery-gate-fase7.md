# Delivery Gate antislop: Fase 7 (2026-11-09)

Mode antislop: during (session override). Arah halaman ditulis di `design/DESIGN.md` bagian "Halaman Spesifikasi" sebelum kode. Design Read-nya: halaman rujukan untuk dosen penguji, dengan dial lokal ENERGY 2 / RHYTHM 1 / MOTION 1. Setelah tangkapan layar ditinjau, ada tiga penyesuaian: kode tidak dipotong per huruf, topik MQTT boleh turun baris setelah garis miring, dan alamat API dibiarkan utuh.

Yang berubah:
- halaman baru `/spesifikasi/` (`landing/app/spesifikasi/page.tsx` dan `page.module.css`), dengan data di `landing/content/spesifikasi.ts`;
- tes anti-melenceng `backend/test/content.test.js` (7 tes) dan satu tes rute di `backend/test/app.test.js`;
- tautan "Spesifikasi" di header dengan `aria-current="page"` (`SiteHeader.tsx`, `NavMenu.tsx`, `siteHeader.module.css`);
- footer tim dipindah ke `components/SiteFooter.tsx` dan dipasang di layout;
- layar muat dan skrip `<head>`-nya dibatasi ke beranda (`Intro.tsx`, `layout.tsx`);
- anggaran audit halaman ini di `tools/audit/budgets-spesifikasi.json`.

Bukti:
- uji `fase7-spesifikasi.mjs` (hasil `fase7-spesifikasi-2026-11-09.json`, gambar `fase7/`);
- audit beranda `fase7-2026-11-09.json` dan audit Spesifikasi `fase7-spesifikasi-audit-2026-11-09.json`, semua anggaran lulus;
- uji ulang Fase 4, 5, dan 6, semua lulus;
- `npm run lint`, `tsc --noEmit`, dan `npm run build` sukses, dan 52 tes backend lulus.

## Blok 1: Hard Gate (semua jawaban harus "tidak")

- R-02 PASS: teks baru diperiksa dengan grep dan tidak memuat em dash.
- R-03 PASS: tanpa overflow halaman di 375, 768, dan 1280 px (uji) serta 320 px (tangkapan tinjauan). Tidak ada tabel yang meluber dari wadahnya, dan menu ponsel terbuka.
- R-17 PASS: semua angka berasal dari repo. Tes anti-melenceng gagal bila data berbeda dengan `config.h`, `perkabelan.md`, `display.cpp`, `scene.js`, `platformio.ini`, `app.js`, atau `index.js`. Mutasi yang disengaja (ambang, label pin, nama komponen, env, dan rute) semuanya tertangkap.
- R-18 PASS: tidak ada testimoni.
- R-23 PASS: tidak ada gambar baru, termasuk gambar stok.
- R-24 PASS: perayap menemukan 32 href dan src internal di beranda dan Spesifikasi, semuanya bernilai 200. Setiap anchor punya id tujuan.
- R-25 PASS, diukur dari gaya terhitung: judul dan ringkasan 12,12:1; daftar isi 8,32:1; teks isi 12,72:1; kepala tabel, baris sumber, dan parameter API 5,24:1; tautan 8,55:1; tautan nav aktif 12,12:1.
- R-26 PASS: semua tautan menuju tujuan nyata. Anchor daftar isi mendarat 0 px dari bagiannya.
- R-27 tidak berlaku: halaman statis tanpa pengambilan data.
- R-28 PASS: tidak ada FAQ.
- R-32 PASS: urutan Tab adalah Lewati ke konten, IrriSense, Cara kerja, Spesifikasi, Uji coba, Dashboard, lalu daftar isi. Cincin fokus di pita judul berwarna krem, 2 px.
- R-33 PASS: fitur ditulis langsung di sumber, dan skrip uji hanya membaca.
- R-34 PASS: tidak ada pengalih tema.
- R-35 PASS: build, lint, tsc, 52 tes backend, uji CDP Fase 7, uji ulang Fase 4, 5, dan 6, serta audit dua halaman dijalankan. Konsol tanpa error.
- R-36 PASS: tidak ada klaim kinerja baru. Batas DOM 800 dikutip dari dokumentasi Lighthouse. LCP dan TBT tidak diukur dan tidak diklaim.
- R-37 PASS: arah halaman tertulis sebelum kode.
- R-38 PASS: isi nyata dari repo, tanpa placeholder.
- R-39 PASS:
  - `<html lang>` dan `<title>` unik ("Spesifikasi | IrriSense");
  - landmark banner, dua navigation berlabel (Utama, Isi halaman), main, dan contentinfo;
  - satu h1, tanpa lompatan tingkat heading;
  - tiap tabel bernama (`aria-labelledby`) dan memakai `scope`;
  - tautan aktif ditandai `aria-current`;
  - tidak ada gerak.
- R-40 PASS: tidak ada media baru, CLS 0, DOM 728 node (anggaran halaman ini 800), JS landing tetap 264,8 KB gzip, dan CSS 16,9 KB.

## Blok 2: Purpose-Gate

- R-01, R-04, R-06, R-07, R-08, R-09, R-10, R-12, R-13, R-14, R-22 PASS: tidak ada gradien, ikon, pola latar, panah, badge, kaca, bayangan, glow, kartu, atau ilustrasi baru. Monospace adalah font bawaan sistem untuk nilai yang harus diketik persis; alasannya tertulis di DESIGN.md.
- R-19 PASS: tidak ada animasi (MOTION 1 lokal). Layar muat sengaja tidak tampil di halaman ini.

## Blok 3: Liveliness

- Dial tertulis dan konsisten: YA (ENERGY 2 / RHYTHM 1 / MOTION 1 lokal).
- Titik fokus per layar: YA. Judul di pita hijau, lalu satu tabel per bagian.
- Ruang kosong struktural: YA. Judul dan sumber di kolom kiri, isi di kolom kanan.
- Design Read dideklarasikan sebelum kode: YA.

## Blok 4: Craftsmanship dan Quality Locks

- C-1 PASS: setiap keputusan punya alasan di DESIGN.md, di status Fase 7 pada rencana, atau di `budgets-spesifikasi.json`:
  - satu sumber data plus tes anti-melenceng;
  - tata letak dua kolom;
  - tabel paling banyak tiga kolom;
  - monospace, `<wbr>`, dan `nowrap`;
  - footer di layout;
  - layar muat hanya di beranda;
  - batas DOM 800.
- C-2 PASS: tidak ada kontrol mati.
- C-3 PASS: satu halaman baru yang memang direncanakan (Q1), tanpa menyalin bagian beranda.
- C-4 PASS: diuji di 320, 375, 768, dan 1280 px; dengan layar sentuh, keyboard, "kurangi gerak", dan tanpa JavaScript; serta pindah ke beranda lewat navigasi Next (tanpa layar muat dan tanpa halaman terkunci).
- C-5 PASS: tidak ada klaim karangan.
- R-05 PASS: bukan templat; strukturnya mengikuti isi teknis proyek.
- R-11, R-15, R-16, R-20, R-21, R-29 PASS: palet, radius, teks, identitas, dan tema tidak berubah; hanya token yang sudah ada yang dipakai.
- R-30 PASS: referensi punya rute spesifikasi, tetapi tidak ada isi, struktur, atau gaya yang disalin. Seluruh isi berasal dari repo IrriSense.
- R-31 PASS: setiap keputusan Fase 7 punya alasan tertulis.

Hasil: tidak ada FAIL.
