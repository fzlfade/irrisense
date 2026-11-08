# Rencana: Refactor Palet Warna + Landing Page IrriSense (gaya Awwwards, React Bits)

Keputusan awal (ubah sebelum eksekusi bila tidak cocok):
- Landing page = **proyek baru `landing/`**, Next.js (App Router) dengan **static export** (`output: 'export'`). Dashboard di `backend/public/` tetap HTML biasa.
- Palet diambil dari banner pameran yang sudah ada (`docs/banner/banner.html`), lalu dijadikan satu sumber token untuk landing dan dashboard.
- Landing page ini untuk **pameran / dosen / calon pengguna**, bukan halaman produk komersial. Tidak ada harga, testimoni, atau logo pelanggan palsu.

## Phase 0: Temuan dokumentasi (sudah dikumpulkan)

Sumber: reactbits.dev/get-started/installation dan registry `reactbits.dev/r/<Nama>-<Varian>.json` (dibaca langsung), `docs/banner/banner.html`, `backend/public/css/app.css`.

**Pasang komponen React Bits**
- shadcn: `npx shadcn@latest add @react-bits/SplitText-JS-CSS`
- jsrepo: `npx jsrepo@latest add https://reactbits.dev/r/SplitText-JS-CSS`
- Akhiran varian: JS atau TS, lalu CSS atau TW. Pilih **TS-CSS** (cocok dengan Next.js + CSS variables). Kode jadi milik proyek, jadi wajib dibaca setelah disalin.

**Dependensi per komponen (dari registry, varian JS-CSS)**

| Komponen | Dependensi |
|---|---|
| SplitText | `gsap@^3.13.0`, `@gsap/react@^2.1.2` |
| ScrollReveal | `gsap@^3.13.0` |
| FadeContent | `gsap@^3.13.0` |
| CountUp | `motion@^12.23.12` |
| ScrollVelocity | `motion@^12.23.12` |
| Magnet, ScrollStack, SpotlightCard, TiltedCard, DotGrid, Grainient, LogoLoop, ShinyText, GradualBlur, PillNav, Silk, Topography | tidak ada |

Daftar komponen yang tersedia (nama URL): `text-animations/*`, `animations/*`, `components/*`, `backgrounds/*` di reactbits.dev.

**Palet saat ini (dua sistem yang tidak nyambung)**
- Dashboard `app.css`: `--bg #f4f6f3`, `--ink #1c2a22`, `--green #2f7d4f`, `--blue #2b6cb0`, `--amber #b7791f`, `--red #c0392b`, plus mode gelap.
- Banner: `--daun #12301f`, `--daun2 #1f4a31`, `--lumut #6f9c78`, `--kertas #f3ecd8`, `--kertas2 #e7dcbd`, `--vanili #b9892b`, `--air #2d8fc0`, `--tanah #5a3b22`, `--tinta #1b2a21`.

**Anti-pattern (aturan antislop-ui yang berlaku)**
- Jangan gradien biru-ungu, aurora/orb di belakang hero tanpa alasan (R-01, R-13).
- Jangan animasi loop tanpa tujuan, dan hormati `prefers-reduced-motion` (R-19).
- Jangan badge "AI Powered", logo bar palsu, testimoni palsu, angka karangan (R-18, R-38).
- Jangan section template (bento, 3 langkah, 3 kolom harga) kecuali isinya memang begitu (R-05).
- Jangan mengarang API komponen. Props dibaca dari file hasil salinan.

## Phase 1: DESIGN.md + token palet (tanpa mengubah tampilan)

Yang dikerjakan
1. Buat `design/DESIGN.md`: tujuan halaman, audiens, 3 inti warna + 1 aksen (R-29), tipografi, radius, dial MOTION/RHYTHM.
2. Usulan palet (bisa disesuaikan):
   - Basis gelap: `daun #12301f` (+ `daun2`), basis terang: `kertas #f3ecd8` (+ `kertas2`), teks: `tinta #1b2a21`.
   - **Satu aksen: `vanili #b9892b`**, hanya di momen kunci (tombol utama, angka utama).
   - `air #2d8fc0` khusus data air/kelembapan (grafik), bukan dekorasi.
   - Warna status dashboard (hijau/kuning/merah) tetap, karena menandai keadaan nyata.
3. Buat `design/tokens.css` berisi variabel CSS (terang + gelap). Cek kontras teks/latar minimal 4,5:1 dengan checker kontras antislop.
4. Pindahkan nilai `:root` di `backend/public/css/app.css` ke token yang sama (`@import` atau salin satu file), lalu cocokkan nama (`--green` menjadi turunan `--daun`/`--lumut`).

Rujukan: `backend/public/css/app.css:1-11`, `docs/banner/banner.html:8`.

Verifikasi
- `npm test` di `backend/` tetap 26 lulus (tes tidak menyentuh CSS, tapi pastikan tidak ada yang rusak).
- Buka http://localhost:3000 terang dan gelap: tidak ada teks tak terbaca, grafik dan status masih jelas.
- `grep -rn "#[0-9a-fA-F]\{6\}" backend/public/css` hanya menemukan nilai di token, bukan di aturan lain.

Larangan: jangan ganti layout atau JS dashboard di fase ini.

## Phase 2: Scaffold Next.js + token

Yang dikerjakan
1. Di `landing/`: `npx create-next-app@latest` (TypeScript, App Router, **tanpa Tailwind**, ESLint), lalu set `output: 'export'` di `next.config`.
2. Impor `design/tokens.css` di layout. Font dipilih dengan alasan tertulis di DESIGN.md (bukan default Inter/Geist tanpa alasan, R-06).
3. Pasang `gsap`, `@gsap/react`, `motion` dengan versi pasti (tanpa `^`).
4. Siapkan hook `useReducedMotion` dan aturan CSS `@media (prefers-reduced-motion: reduce)` global.

Rujukan: dokumentasi instalasi React Bits di atas, bagian "Next.js" pada dokumen create-next-app yang dibaca saat eksekusi.

Verifikasi
- `npm run build` menghasilkan folder `out/` tanpa error.
- `npx serve out` membuka halaman kosong dengan palet baru.

Larangan: komponen WebGL (`Silk`, `Grainient`, `Topography`, dan sejenisnya) di Next.js dimuat dengan `next/dynamic` dan `ssr: false`; jangan diimpor langsung di server component.

## Phase 3: Struktur halaman berdasarkan isi nyata

Susunan section mengikuti cerita produk, bukan template. Usulan:
1. **Hero**: nama IrriSense, satu kalimat masalah (boros air di kebun vanili), satu foto/render prototipe asli (`docs/prototype/prototipe-3d-tertutup.png`).
2. **Masalah → solusi**: penyiraman manual vs tetes otomatis.
3. **Cara kerja**: 6 sensor tanah → ESP32 → pompa, sesuai alur sebenarnya (bukan dipaksa 3 langkah).
4. **Data nyata**: angka dari sistem yang berjalan (kelembapan, jumlah sensor, ambang 60/80 %), dibaca dari `/api/stats` bila tersedia, kalau tidak diberi label contoh.
5. **Tim dan kampus**: Universitas Tidar, Capstone D-02, logo asli (`docs/banner/logo-untidar.png`).

Verifikasi: tiap section punya alasan tertulis di DESIGN.md. Tidak ada section yang hanya "karena landing page biasanya punya".

## Phase 4: Komponen React Bits (maksimal 5, tiap satu dengan alasan)

Usulan, urut prioritas. Hapus yang tidak terpakai.

| Tempat | Komponen | Alasan |
|---|---|---|
| Judul hero | `SplitText` | Judul muncul sekali saat load, bukan loop |
| Cerita masalah → solusi | `ScrollReveal` | Teks panjang terbaca bertahap saat scroll |
| Angka data | `CountUp` | Angka naik sekali saat terlihat |
| Cara kerja | `ScrollStack` | Langkah menumpuk mengikuti alur nyata |
| Tombol utama | `Magnet` | Hanya satu tombol, efek ringan |

Latar: pakai **`DotGrid` atau tidak ada latar sama sekali**. Latar WebGL (`Silk`, `Aurora`, `Galaxy`) hanya bila ada alasan tertulis, dan tidak boleh memperlambat hero (R-40). Komponen gaya neon, partikel, dan glow tidak dipakai.

Cara kerja per komponen: jalankan `npx shadcn@latest add @react-bits/<Nama>-TS-CSS`, baca file hasilnya, tambah `"use client"` bila perlu, ganti warna demo dengan variabel token, pastikan mati saat `prefers-reduced-motion`.

Verifikasi
- Tiap komponen: teks akhir tetap terbaca tanpa JavaScript dan oleh pembaca layar.
- Tidak ada animasi yang berulang tanpa henti.
- Lighthouse (laptop, mode mobile): hero muncul cepat; angka yang dilaporkan hasil ukur, bukan perkiraan.

Larangan: jangan menambah komponen di luar tabel tanpa menulis alasannya di DESIGN.md.

## Phase 5: Penyajian dan pameran

1. Salin `landing/out/` agar disajikan backend di `/` atau `/landing`, dashboard tetap di `/dashboard` (atau path yang sekarang dipakai). Putuskan dengan pengguna sebelum mengubah route.
2. Tambah tautan "Buka dashboard" yang benar-benar menuju dashboard.
3. Pastikan halaman bekerja offline (tanpa font/CDN eksternal, font disalin lokal).

## Phase 6: Verifikasi akhir

- Jalankan checklist antislop-ui (termasuk butir React Bits) dan Delivery Gate.
- `grep` anti-pattern: tidak ada `#6366f1`/gradien biru-ungu, tidak ada teks "AI Powered", tidak ada emoji dekoratif, tidak ada `John Doe`.
- Cek di lebar 375, 768, 1280 px: tanpa scroll horizontal, tombol bisa disentuh.
- Cek keyboard-only: fokus terlihat, urutan tab masuk akal.
- Cek terang dan gelap.
- `npm run build` di `landing/` dan `npm test` di `backend/` lulus.

## Pertanyaan terbuka (jawab sebelum Phase 3)
1. Landing dilayani backend yang sama atau dihosting terpisah?
2. Bahasa halaman: Indonesia saja, atau Indonesia + Inggris (seperti banner)?
3. Ada foto kebun/prototipe asli selain render 3D?
4. Aksen `vanili` (emas-cokelat) disetujui, atau mau aksen lain?
