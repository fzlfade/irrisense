# Delivery Gate antislop: Fase 6 (2026-11-09)

Mode antislop: during (session override). Arah dan dial ada di `design/DESIGN.md` (ENERGY 3 / RHYTHM 2 / MOTION 3). Tujuan tiap gerak layar muat ditulis di bagian "Layar muat 'tetes air'" sebelum kode Fase 6 ditulis, lalu disesuaikan dengan hasil uji: batas pudar 3,0 sampai 3,4 detik, jam disamakan dengan first-paint, dan pudar dijalankan compositor.

Yang berubah:
- layar muat berbasis progres (`landing/components/Intro.tsx`, `landing/lib/loadProgress.ts`, blok intro di `landing/app/globals.css`);
- laporan poster dan model hero dari `Spin3D.tsx` (prop `reportsLoad`, dipasang di `Sections.tsx`);
- skrip `<head>` di `layout.tsx` yang menutup intro sendiri bila JavaScript belum jalan saat pudar CSS selesai.

Teks UI baru hanya "Memuat halaman n %". Tidak ada warna, aset, atau tautan baru.

Bukti: uji CDP `fase6-intro.mjs` (hasil `fase6-intro-2026-11-09.json`, gambar `fase6/`), uji ulang `fase5-story.mjs` dan `fase4-scroll.mjs` (semua lulus), audit `fase6-2026-11-09.json` (semua anggaran lulus). `npm run lint`, `tsc --noEmit`, dan `npm run build` sukses, dan 44 tes backend lulus.

## Blok 1: Hard Gate (semua jawaban harus "tidak")

- R-02 PASS: teks baru "Memuat halaman 50 %" tanpa em dash. Format persennya sama dengan bagian lain halaman (spasi sebelum %).
- R-03 PASS: di layar sentuh 375 px, teks status mulai 19 px dari kiri dan tombol "Lewati" berakhir di 356 px. Tingginya 44 px, keduanya tidak bertumpuk, dan overflow 0 px.
- R-17 PASS: bobot 40/10/50 berasal dari ukuran unduhan yang diukur audit (huruf 183,3 KB, poster 20,5 KB, JavaScript model 184,4 KB gzip). Persen di layar adalah progres sungguhan, bukan hitungan buatan.
- R-18 PASS: tidak ada testimoni.
- R-23 PASS: tidak ada aset baru.
- R-24 PASS: tidak ada tautan baru.
- R-25 PASS, diukur dari gaya terhitung:
  - teks status di atas hijau tua 12,12:1;
  - kata "IrriSense" di atas air 3,07:1 pada 128 px. Itu teks besar (cukup 3:1) dan `aria-hidden`;
  - cincin fokus "Lewati" krem di atas hijau tua 12,1:1, menggantikan `--blue` yang hanya 2,6:1.

  Teks kecil sengaja tidak pernah diletakkan di atas `--air-600` (hanya 3,1:1).
- R-26 PASS: tombol "Lewati", Enter, Esc, dan klik di penutup masing-masing langsung menutup intro. Uji membuktikan `data-intro` menjadi "done", penutup hilang, dan gulir terbuka.
- R-27 PASS:
  - Keadaan muat menyebut apa yang dimuat ("Memuat halaman 50 %").
  - Bila model belum siap, penutup tetap hilang di batas waktu dan hero menampilkan poster.
  - Bila JavaScript gagal dimuat (semua chunk .js diblokir), CSS memudarkan penutup (hilang 3,38 detik setelah tergambar). Skrip `<head>` membuka kunci gulir (roda menggulir 500 px), dan judul hero biasa tampil.
- R-28 PASS: tidak ada FAQ.
- R-32 PASS: saat penutup tampil, Tab pertama mengenai "Lewati" dengan cincin krem 2 px, lalu Enter dan Esc melewati. Urutan Tab halaman setelah intro tidak berubah (uji ulang Fase 5).
- R-33 PASS: fitur ditulis langsung di sumber (komponen, CSS, skrip `<head>`), dan skrip uji hanya membaca. Saat menyunting, satu blok CSS intro diganti sekali lewat skrip Python sementara. Hasilnya sama dengan suntingan tangan, dan tidak ada skrip penambal di repo.
- R-34 PASS: tidak ada pengalih tema. Penutup memakai token yang sama dengan sebelumnya.
- R-35 PASS: build, lint, tsc, tes backend, audit, uji ulang Fase 4 dan 5, dan uji CDP Fase 6 dijalankan. Uji Fase 6 mencakup jaringan cepat, sedang, dan lambat; JavaScript diblokir; Tab, Enter, Esc, dan klik; kunjungan kedua; "kurangi gerak"; tanpa JavaScript; sentuh 375 px; dan trace browser. Konsol tanpa error.
- R-36 PASS: angka waktu dan kontras diukur. LCP dan TBT tidak diukur dan tidak diklaim.
- R-37 PASS: tujuan gerak sudah tertulis di DESIGN.md sebelum kode.
- R-38 PASS: tidak ada isi karangan.
- R-39 PASS:
  - Dengan "kurangi gerak", penutup tidak diputar: `data-intro` "skip", 0 iframe, judul terlihat.
  - Semua gerak penutup berakhir paling lambat 3,5 detik dan bisa dilewati.
  - Teks status memakai `role="status"` dan berubah paling banyak tiga kali (per 10 %).
  - Tetesan, air, dan kata diberi `aria-hidden`.
  - "Lewati" adalah `<button>` dengan nama, kursor tangan, status hover, dan status tekan.
- R-40 PASS:
  - Penutup `position: fixed` tidak menggeser tata letak: CLS 0,005 selama muat dengan intro dan 0,002 saat scroll penuh.
  - Poster hero tetap `<img>` di HTML dengan `fetchpriority="high"`.
  - Air naik lewat `transform` dan pudar lewat `opacity`; keduanya dijalankan compositor. Trace menunjukkan hanya `intro-hide` yang gagal dikomposit, karena `visibility`, dan itu disengaja.
  - JS landing 264,8 KB gzip (naik 0,7 KB) dan CSS 14,0 KB.

## Blok 2: Purpose-Gate

- R-01, R-04, R-06, R-07, R-08, R-09, R-10, R-12, R-13, R-14, R-22 PASS: tidak ada gradien, ikon, font, pola latar, panah, badge, kaca, bayangan, glow, kartu, atau ilustrasi baru. Baris atas penutup hanya berisi teks dan tombol yang sudah ada.
- R-19 PASS: tujuan tiap gerak tertulis di DESIGN.md:
  - air naik menunjukkan progres muat sungguhan;
  - tetesan adalah motif identitas, sekali di awal;
  - kata muncul saat hurufnya siap, supaya huruf tidak berganti di depan mata;
  - pudar membuka halaman.

  Semua sesuai MOTION 3 (diputar sekali saat masuk, tanpa loop).

## Blok 3: Liveliness

- Dial tertulis dan konsisten: YA. Layar muat tetap momen merek di awal (ENERGY 3) dan diputar sekali tanpa loop (MOTION 3).
- Titik fokus per layar: YA. Kata "IrriSense" di garis air.
- Ruang kosong struktural, satu aksen, motif identitas: YA. Motif tetes dan air kini sekaligus menjadi penanda progres.
- Design Read dideklarasikan sebelum kode: YA.

## Blok 4: Craftsmanship dan Quality Locks

- C-1 PASS: setiap keputusan punya alasan di DESIGN.md dan di status Fase 6 pada rencana:
  - bobot 40/10/50;
  - baris atas di luar air;
  - kata menunggu hurufnya;
  - batas 1,2 detik dan 3,0 sampai 3,4 detik;
  - jam disamakan dengan first-paint;
  - pudar opacity saja;
  - model Cara kerja tetap dimuat selama penutup tampil;
  - skrip `<head>` sebagai penutup cadangan;
  - judul biasa tampil sendiri bila JavaScript gagal.
- C-2 PASS: tidak ada kontrol mati. "Lewati" bekerja lewat tombol, Enter, Esc, dan klik.
- C-3 PASS: tidak ada section baru.
- C-4 PASS: diuji dengan jaringan cepat, sedang, dan lambat; JavaScript diblokir; keyboard; tetikus; "kurangi gerak"; tanpa JavaScript; sentuh 375 px; dan kunjungan kedua.
- C-5 PASS: tidak ada klaim karangan.
- R-05, R-11, R-15, R-16, R-20, R-21, R-29 PASS: tata letak halaman, radius, CTA, teks, identitas, tema, dan palet tidak berubah. Tombol "Lewati" tetap bergaya lama.
- R-30 PASS: dari referensi hanya diamati bahwa layar muatnya menampilkan persentase (rencana bagian 3.1 baris 7). Teks, aset, kode, dan mekanismenya tidak disalin; mekanismenya bahkan tidak teramati. Visualnya tetap motif tetes air IrriSense.
- R-31 PASS: setiap keputusan Fase 6 punya alasan tertulis.

Hasil: tidak ada FAIL.
