# Delivery Gate antislop: Fase 8 (2026-11-09)

Mode antislop: during (session override). Tujuan tiap gerak ditulis di `design/DESIGN.md` ("Tiga gerak gulir tambahan") sebelum kodenya dibuat.

Yang berubah:
- `landing/components/ScrollMotion.tsx`: hero dan angka, lewat `gsap.matchMedia`;
- `CaraStory.tsx` dan `storyMarker.module.css`: penanda progres panggung cerita;
- `data-motion` di `Sections.tsx`;
- `<ScrollMotion />` dipasang di `app/page.tsx`.

Tidak ada teks UI, warna, aset, atau tautan baru.

Bukti:
- uji `fase8-gerak.mjs` (hasil `fase8-gerak-2026-11-09.json`, baseline `fase8-baseline-2026-11-09.json`, gambar `fase8/`), lulus semua;
- uji ulang Fase 4, 5, 6, dan 7, lulus semua;
- audit beranda dan Spesifikasi, lulus semua;
- `npm run lint`, `tsc --noEmit`, dan `npm run build` sukses.

## Blok 1: Hard Gate

- R-02, R-17, R-18, R-23, R-24, R-28, R-38 PASS: tidak ada teks, angka, aset, tautan, atau FAQ baru.
- R-03 PASS: sentuh 375 px tanpa efek dan tanpa overflow. 768 px dan 1280 px juga tanpa overflow.
- R-25 PASS: penanda isi `--green` di atas `--surface` 9,5:1, dan tanda langkah `--muted` 5,8:1. Garis dasarnya `--line` hanya hiasan.
- R-26, R-32 PASS: tidak ada kontrol baru. Urutan Tab tidak berubah (uji ulang Fase 5 dan 7).
- R-27 tidak berlaku: tidak ada data.
- R-33 PASS: efek ditulis langsung di sumber, dan skrip uji hanya membaca.
- R-34 PASS: tidak ada pengalih tema.
- R-35 PASS: build, lint, dan tsc dijalankan, juga uji Fase 8, uji ulang Fase 4–7, dan audit. Konsol tanpa error. Tes backend tidak dijalankan ulang, karena backend tidak berubah sejak Fase 7 (52 lulus).
- R-36 PASS: angka beban diukur. Kelancaran 60 fps tidak diklaim, karena tidak bisa diukur di headless tanpa GPU.
- R-37 PASS: tujuan gerak tertulis sebelum kode.
- R-39 PASS:
  - Dengan "kurangi gerak": nol efek, tanpa gaya inline dan tanpa penanda.
  - Semua gerak mengikuti gulir, tidak ada yang jalan sendiri, dan tidak ada yang lebih lama dari 5 detik tanpa kendali.
  - Penanda diberi `aria-hidden`, karena daftar langkah sudah memuat isinya.
- R-40 PASS:
  - Hanya `clip-path` dan `transform` yang diubah, jadi tata letak per langkah gulir tetap 0.
  - Total waktu main thread naik 14,8 % (batas 25 %, kriteria yang disetujui pengguna).
  - CLS 0,002, dan JS landing naik 0,4 KB gzip.
  - Tidak ada `will-change`.

## Blok 2: Purpose-Gate

- R-01, R-04, R-06 sampai R-14, R-22 PASS: tidak ada gradien, ikon, font, pola, panah, badge, kaca, bayangan, glow, kartu, atau ilustrasi baru. Sudut 14 px pada hero memakai `--radius`.
- R-19 PASS: tujuan tiap gerak tertulis di DESIGN.md:
  - hero menandai pergantian bab dan mengarahkan mata ke angka 60–80 %;
  - angka memisahkan nilai kunci dari kalimat di sebelahnya;
  - penanda menjawab "sedang di langkah mana, berapa lama lagi".

  Ketiganya sesuai MOTION 3: terkait gulir, tanpa loop.

## Blok 3: Liveliness

- Dial tertulis dan konsisten: YA. MOTION 3 tetap, dengan tiga efek terkait gulir.
- Titik fokus per layar: YA. Di bagian Masalah, angka 60–80 %.
- Design Read dideklarasikan sebelum kode: YA.

## Blok 4: Craftsmanship dan Quality Locks

- C-1 PASS: setiap keputusan punya alasan di DESIGN.md dan di status Fase 8 pada rencana, termasuk pergantian kriteria beban.
- C-2, C-3, C-5 PASS: tidak ada kontrol mati, section baru, atau klaim karangan.
- C-4 PASS: diuji di 1280, 768, dan 375 px (sentuh), dengan "kurangi gerak", dan saat lebar layar berganti (efek dibongkar lalu dipasang lagi).
- R-05, R-11, R-15, R-16, R-20, R-21, R-29, R-31 PASS: tata letak, radius, teks, identitas, dan palet tidak berubah.
- R-30 PASS: tekniknya umum (efek terkait gulir dari GSAP), dan tidak ada yang disalin dari referensi.

Hasil: tidak ada FAIL.
