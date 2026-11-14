# Delivery Gate antislop: Fase 4 (2026-11-09)

Mode antislop: during (session override). Design Read sudah tertulis di `design/DESIGN.md` sebelum kode Fase 4 ditulis: landing pameran capstone, editorial hangat, dial ENERGY 3 / RHYTHM 2 / MOTION 3.

Yang berubah: gulir halus Lenis (`landing/components/SmoothScroll.tsx`, dipasang di `app/layout.tsx`), lapisan seret di atas model 3D (`Spin3D.tsx`, `spin3d.module.css`), dan penanganan pesan seret di mode embed `backend/prototipe/scene.js`. Tidak ada teks UI, warna, tautan, atau aset baru. Butir yang tidak tersentuh merujuk ke `delivery-gate-fase3.md`.

Bukti: uji CDP `fase4-scroll.mjs` (hasil `fase4-scroll-2026-11-09.json`), audit `fase4-2026-11-09.json` (semua anggaran lulus), `npm run lint`, `tsc --noEmit`, `npm run build` sukses, tes backend 42 lulus.

## Blok 1: Hard Gate (semua jawaban harus "tidak")

- R-02 PASS: tidak ada teks UI baru; komentar kode bukan teks UI.
- R-03 PASS: 375 px dengan sentuhan: overflow 0 px, Lenis tidak dipasang, lapisan seret `touch-action: pan-y` sehingga gesek vertikal tetap menggulir.
- R-17 PASS: tidak ada angka baru di halaman.
- R-18 PASS: tidak ada testimoni.
- R-23 PASS: tidak ada aset atau struktur navigasi baru; Lenis tertulis di rencana Fase 4 yang disetujui ("jalankan fase 4").
- R-24 PASS: tidak ada tautan baru; anchor `#cara-kerja` dari tombol hero dan nav mendarat 0 px dari section.
- R-25 PASS: tidak ada warna teks baru (lihat Fase 3).
- R-26 PASS: lapisan seret berfungsi: seret 150 px memutar model 1,8 rad, lalu kembali ke 0 setelah dilepas.
- R-27 PASS: lapisan seret baru muncul setelah model siap (`irri-ready`); sebelum itu dan saat gagal, poster tetap tampil seperti dulu.
- R-28 PASS: tidak ada FAQ.
- R-32 PASS: PageDown 0 ke 700 px, Spasi 700 ke 1400 px, Enter pada "Lihat cara kerja" mendarat 0 px dari section; Tab pertama tetap tautan lewati (audit). Lapisan seret tidak menangkap fokus (`aria-hidden`, bukan kontrol).
- R-33 PASS: fitur ditulis langsung di sumber; `fase4-scroll.mjs` hanya menguji, tidak mengubah berkas.
- R-34 PASS: tidak ada pengalih tema.
- R-35 PASS: build, uji CDP (roda, seret, dua anchor, keyboard, kurangi gerak, sentuh), dan audit dijalankan; konsol tanpa error.
- R-36 PASS: tidak ada klaim baru; angka kinerja yang dilaporkan semuanya diukur (ukuran JS, CLS).
- R-37 PASS: arah dan dial tertulis di DESIGN.md sebelum Fase 4.
- R-38 PASS: tidak ada isi baru.
- R-39 PASS: Lenis tidak dipasang saat "kurangi gerak" (diuji: tanpa kelas `lenis`, tanpa iframe); gulir halus hanya bergerak saat pengguna menggulir, jadi tidak ada gerak otomatis lebih dari 5 detik; lapisan seret `aria-hidden` dan tidak bertentangan dengan peran apa pun; kursor grab menandai permukaan yang bisa diseret.
- R-40 PASS: tidak ada skrip pihak ketiga di `<head>` (Lenis dibundel); JS landing naik 2,9 KB gzip (263,2 KB, batas 300); CLS 0 (diukur).

## Blok 2: Purpose-Gate

- R-01, R-04, R-06, R-07, R-08, R-09, R-10, R-12, R-13, R-14, R-22 PASS: tidak ada gradien, ikon, font, pola latar, panah, badge, kaca, bayangan, glow, kartu, atau ilustrasi baru.
- R-19 PASS: tujuan gulir halus tertulis di DESIGN.md (putaran model dan cerita langkah mengikuti gulir dengan mulus); sesuai MOTION 3; bukan animasi templat.

## Blok 3: Liveliness

- Dial tertulis dan konsisten: YA. Gulir halus memperkuat gerak terkait scroll (MOTION 3) tanpa menambah gerak baru.
- Titik fokus, ruang kosong, satu aksen, motif identitas: YA, tidak berubah sejak Fase 3.
- Design Read dideklarasikan sebelum kode: YA (DESIGN.md, sebelum Fase 4).

## Blok 4: Craftsmanship dan Quality Locks

- C-1 PASS: alasan Lenis dan lapisan seret tertulis di DESIGN.md.
- C-2 PASS: lapisan seret punya fungsi nyata (R-26).
- C-3 PASS: tidak ada section baru.
- C-4 PASS: diuji dengan tetikus, keyboard, "kurangi gerak", dan layar sentuh 375 px; tanpa JavaScript tetap lulus di audit.
- C-5 PASS: tidak ada klaim karangan.
- R-05, R-11, R-15, R-16, R-20, R-21, R-29 PASS: tata letak, radius, CTA, teks, identitas, tema, dan palet tidak berubah sejak Fase 3.
- R-30 PASS: Lenis adalah pustaka MIT yang dipakai sesuai README-nya; tidak ada teks, aset, kode, atau merek referensi yang disalin.
- R-31 PASS: setiap keputusan Fase 4 punya alasan tertulis (DESIGN.md dan status Fase 4 di rencana).

Hasil: tidak ada FAIL.
