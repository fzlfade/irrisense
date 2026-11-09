# Delivery Gate antislop: Fase 5 (2026-11-09)

Mode antislop: during (session override). Arah dan dial sudah ada di `design/DESIGN.md` (ENERGY 3 / RHYTHM 2 / MOTION 3); tujuan gerak panggung cerita ditulis di bagian "Panggung cerita Cara kerja" sebelum kode Fase 5 ditulis, lalu disesuaikan dengan hasil penyetelan.

Yang berubah: panggung cerita Cara kerja (`landing/components/CaraStory.tsx`, `landing/lib/storyProgress.ts`, `sections.module.css`), mode cerita `Spin3D.tsx` (progres dari CaraStory, iframe baru per alamat), perakitan per langkah di `backend/prototipe/scene.js` (`part()`, `ASSEMBLY`, `irri-progress`), dan tes `backend/test/story.test.js`. Teks UI baru hanya keterangan gambar Cara kerja (tiga versi menurut mode). Tidak ada warna, aset, atau tautan baru.

Bukti: uji CDP `fase5-story.mjs` (hasil `fase5-story-2026-11-09.json`, gambar `fase5/`), uji ulang `fase4-scroll.mjs` (semua lulus), audit `fase5-2026-11-09.json` (semua anggaran lulus), halaman `/prototipe/` penuh dimuat tanpa error (panel, nomor, buka tutup casing jalan), `npm run lint`, `tsc --noEmit`, `npm run build` sukses, tes backend 44 lulus.

## Blok 1: Hard Gate (semua jawaban harus "tidak")

- R-02 PASS: keterangan baru ("Rancangan 3D prototipe di atas papan 100 × 76 cm. Gulir untuk merakitnya langkah demi langkah, seret untuk memutar.") tanpa em dash; dua versi lain hanya memangkas kalimat lama.
- R-03 PASS: sentuh 375 px tanpa panggung, overflow 0 px; 1024 × 576 memuat empat langkah dan model dalam satu layar (diperiksa lewat tangkapan layar); 1280 × 560 kembali ke daftar biasa.
- R-17 PASS: tidak ada angka baru; 100 × 76 cm berasal dari keterangan lama dan ukuran papan di scene.
- R-18 PASS: tidak ada testimoni.
- R-23 PASS: tidak ada aset baru; model 3D adalah scene yang sudah ada, hanya dikelompokkan.
- R-24 PASS: tidak ada tautan baru; "Coba prototipe 3D dengan live test" tetap ke `/prototipe/`.
- R-25 PASS: langkah redup diukur 5,82:1, langkah aktif 14,12:1, titik peralihan 6,56 dan 12,7 (gaya terhitung, latar section). Versi lama (opacity 0,4) sekitar 2,4:1 dan sudah diganti.
- R-26 PASS: lapisan seret di panggung memutar model 1,8 rad lalu kembali ke 0; roda di atasnya menggulir halaman (3197 ke 3677 px).
- R-27 PASS: sebelum model siap, saat gagal, dan saat iframe dimuat ulang karena ganti mode, poster tampil (`readySrc`); sorot langkah tetap jalan tanpa iframe karena digerakkan ScrollTrigger di halaman.
- R-28 PASS: tidak ada FAQ.
- R-32 PASS: Tab dari awal sampai "Coba prototipe 3D dengan live test" (urutan: lewati, IrriSense, Cara kerja, Uji coba, Dashboard, Lihat cara kerja, Buka dashboard, tautan panggung) dan tautan itu terlihat di layar; PageDown, Spasi, dan Enter tetap jalan (uji ulang Fase 4).
- R-33 PASS: fitur ditulis di sumber; skrip uji hanya membaca (kelas ScrollTrigger dibaca dari konteks useGSAP, kode aplikasi tidak diubah untuk uji).
- R-34 PASS: tidak ada pengalih tema; `color-mix` memakai `--ink` dan `--muted` yang punya nilai di kedua tema.
- R-35 PASS: build, lint, tsc, tes backend, uji CDP Fase 5 dan Fase 4, audit, dan `/prototipe/` dijalankan; konsol tanpa error.
- R-36 PASS: tidak ada klaim baru; angka kinerja yang dilaporkan diukur (ukuran JS, CLS). 60 fps tidak diklaim (tidak bisa diukur di headless).
- R-37 PASS: arah dan dial tertulis di DESIGN.md sebelum Fase 5.
- R-38 PASS: isi baru hanya keterangan yang menjelaskan perilaku nyata.
- R-39 PASS: "kurangi gerak": tanpa panggung dan tanpa iframe (diuji); semua gerak mengikuti gulir, tetesan dan getar pompa berhenti 5 detik setelah pompa menyala; daftar tetap `ol > li > h3 + p`; lapisan seret dan iframe `aria-hidden`; tidak ada kontrol baru.
- R-40 PASS: kotak model tetap ber-`aspect-ratio`; tinggi pembungkus dipasang sebelum pengguna sampai di section, CLS 0 (uji Fase 5) dan 0,002 (audit); tidak ada skrip pihak ketiga; JS landing 264,1 KB gzip (naik 0,9 KB).

## Blok 2: Purpose-Gate

- R-01, R-04, R-06, R-07, R-08, R-09, R-10, R-12, R-13, R-14, R-22 PASS: tidak ada gradien, ikon, font, pola latar, panah, badge, kaca, bayangan, glow, kartu, atau ilustrasi baru. Sorotan emissive pada bagian 3D sudah ada sejak versi cerita sebelumnya.
- R-19 PASS: tujuan tiap gerak tertulis di DESIGN.md (perakitan memperlihatkan komponen yang disebut tiap langkah, kamera mendatangi komponen itu, daftar menandai langkah yang sedang dibahas); sesuai MOTION 3 (panggung menempel dan koreografi); bukan animasi templat.

## Blok 3: Liveliness

- Dial tertulis dan konsisten: YA. MOTION 3 sekarang punya panggung menempel dengan koreografi terkait gulir; tidak ada loop.
- Titik fokus per layar: YA. Di panggung, model 3D adalah titik fokus; langkah aktif mengikutinya.
- Ruang kosong struktural, satu aksen, motif identitas: YA, tidak berubah (tetesan air tetap jatuh di langkah 3).
- Design Read dideklarasikan sebelum kode: YA.

## Blok 4: Craftsmanship dan Quality Locks

- C-1 PASS: setiap keputusan (urutan rakit, pose akhir lebar, redup lewat warna, syarat tinggi layar, kolom sama lebar di bawah 1280 px) punya alasan di DESIGN.md dan status Fase 5 di rencana.
- C-2 PASS: tidak ada kontrol mati.
- C-3 PASS: tidak ada section baru; Cara kerja tetap empat langkah nyata.
- C-4 PASS: diuji dengan tetikus (roda, seret), keyboard (Tab, PageDown, Spasi, Enter), "kurangi gerak", layar pendek, sentuh 375 px, ganti mode lewat ubah ukuran (ScrollTrigger tetap 2 atau 1, tidak bocor), dan tanpa JavaScript (audit).
- C-5 PASS: tidak ada klaim karangan.
- R-05 PASS: panggung menempel adalah pemecah ritme yang disengaja (RHYTHM 2); langkahnya empat, bukan templat tiga langkah.
- R-11, R-15, R-16, R-20, R-21, R-29 PASS: radius, CTA, teks, identitas, tema terang, dan palet tidak berubah; `color-mix` hanya berpindah di antara dua token yang sudah ada.
- R-30 PASS: tekniknya umum (panggung menempel dan progres gulir yang menggerakkan animasi, dari dokumentasi GSAP); tidak ada teks, aset, kode, atau merek referensi yang disalin.
- R-31 PASS: setiap keputusan Fase 5 punya alasan tertulis.

Hasil: tidak ada FAIL.
