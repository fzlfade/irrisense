# Rencana: refactor landing IrriSense berdasarkan analisis REA atas kasane-keyboard.com

Tanggal: 2026-11-09. Status: draf, menunggu persetujuan. Pendahulu: `2026-11-08-landing-page-palette.md` (Phase 1 sampai 5 selesai).

Cara memakai dokumen ini: tiap fase berdiri sendiri. Mulai dari bagian "Rujukan" fase itu, kerjakan "Kerjakan", jalankan "Verifikasi", dan jangan lompat fase. Bagian 3 (Phase 0) adalah hasil penemuan yang sudah dikerjakan; jangan diulang kecuali ada alasan.

## 1. Tujuan dan batasan

**Tujuan.** Membawa landing IrriSense ke tingkat kerapian gerak dan struktur yang terlihat pada situs referensi, dengan teknik yang terbukti dari analisis REA: satu mesin scroll, bagian cerita 3D yang tinggi dengan panggung menempel, layar muat dengan progres nyata, jenjang tipografi besar, dan struktur beberapa halaman. Semuanya memakai isi nyata proyek ini dan tetap jalan offline di pameran.

**Yang boleh diambil dari referensi (teknik umum, bukan ekspresi):**
- Satu mesin scroll (Lenis + GSAP ScrollTrigger) dengan pola dari dokumentasi resmi.
- Bagian cerita tinggi dengan panggung menempel; progres scroll menggerakkan animasi.
- Layar muat berbasis progres sebelum halaman.
- Judul kunci berukuran besar; struktur beranda berkisah + halaman spesifikasi + halaman uji coba + kontak.

**Yang tidak boleh:**
- Menyalin teks, gambar, video, model 3D, kode, nama berkas aset, warna, atau tata letak persis. Tidak menaut langsung aset mereka. Tidak meniru merek atau gaya toko ("Buy Now").
- Meniru kekurangan aksesibilitas mereka (bagian 3.1, baris 9).
- Mengarang isi. Semua isi baru bersumber dari repo (bagian 7, Fase 7).

**Aturan proyek yang tetap berlaku:**
- antislop mode DURING (`CLAUDE.md`, `.claude/skills/antislop-ui/SKILL.md`). Jalankan Delivery Gate (`.claude/skills/antislop/SKILL.md`, bagian "Delivery Gate (Mandatory)", baris 619) di akhir tiap fase yang menyentuh UI.
- Gerak harus punya tujuan tertulis, tidak berulang sendiri, dan mati saat `prefers-reduced-motion`.
- Satu aksen warna (`--accent`), tema terang bawaan (`design/DESIGN.md`).
- Tidak ada commit atau push tanpa izin Anda. Repo GitHub `fzlfade/irrisense` terakhir terlihat **publik** padahal `docs/banner/` memuat nama dan NIM anggota tim; jadikan privat sebelum push berikutnya.

## 2. Keputusan yang perlu Anda konfirmasi (default yang dipakai rencana ini)

| # | Keputusan | Default rencana | Dampak bila diubah |
|---|---|---|---|
| Q1 | Struktur halaman | Beranda + `/spesifikasi/` + `/prototipe/` (Uji coba) + header navigasi | Tanpa Q1: Fase 7 dibuang, header hanya memuat tautan yang sudah ada |
| Q2 | Mesin 3D | Tetap iframe ke `/prototipe/?embed=1` (satu kode scene, dua pemakaian) | R3F + GLB ada di Fase 10 (ditunda) |
| Q3 | Tata letak panggung cerita | 5A: kolom (daftar kiri, 3D kanan) lebih dulu; 5B: layar penuh bila 5A terasa kurang | Memilih langsung 5B menambah satu fase desain |
| Q4 | Layar muat | Ganti intro berbasis waktu dengan berbasis progres (Fase 6) | Tanpa Q4: intro "tetes air" sekarang dipertahankan |
| Q5 | Smooth scroll | Hanya perangkat penunjuk presisi (mouse/touchpad); mati di sentuh dan "kurangi gerak" | Bila booth pameran memakai layar sentuh, perilaku sentuh tetap native |
| Q6 | Kontak | Tidak ada bagian kontak sampai Anda memberi email atau tautan yang boleh dipublikasikan | Tidak akan diisi dengan data karangan |

## 3. Phase 0: hasil penemuan (sudah dikerjakan 2026-11-09)

Alat: REA 6.8.0 (`rea-agents`, dikunci), Edge headless dengan profil sementara di `127.0.0.1:9222`, protokol CDP. Sumber lain: berkas yang terpasang di `landing/node_modules` dan `backend/node_modules`, README resmi dari paket npm. Skrip penemuan tersimpan di `docs/superpowers/plans/evidence/` (lihat Lampiran B).

### 3.1 Temuan REA atas referensi

| # | Temuan | Dasar | Keyakinan |
|---|---|---|---|
| 1 | Next.js 15.4.10 (App Router) + React, di-deploy di Vercel | `analyze-web-bundle`: vendor_fingerprint Next.js (tinggi), React (sedang); string versi di bundle | Tinggi / sedang |
| 2 | Three.js (string revisi "179"), React Three Fiber, loader GLTF, Draco, KTX2, shader kustom | Tanda tangan di 21 skrip yang berhasil diunduh: `WebGLRenderer` 3 berkas, `__r3f` 2, loader 35 kemunculan | Sedang (statis, tidak dieksekusi) |
| 3 | GSAP + ScrollTrigger + Lenis; integrasinya persis pola README Lenis: `on("scroll", ScrollTrigger.update)`, `gsap.ticker.add(t => raf(1000*t))`, `lagSmoothing(0)`; opsi Lenis hampir semuanya bawaan | Pola terlihat langsung di kode; opsi hanya bawaan pustaka yang terlihat | Tinggi |
| 4 | Bagian cerita: `ScrollTrigger.create` dengan `start:"top top"`, `end:"bottom bottom"`, `pin` pada elemen dalam, `pinSpacing:false`, `anticipatePin:1`, dan `invalidate…` (terpotong, kemungkinan `invalidateOnRefresh`). Callback `onUpdate` mengatur waktu klip animasi = durasi klip x progres, dengan target `#threeDScrollSection`. | Kode (pola) + probe DOM | Tinggi |
| 5 | Bagian cerita adalah **hero itu sendiri**: tinggi 8.100 px = 10 layar, anak menempel setinggi 1 layar (`position: sticky; top: 0`). Halaman total 17,4 layar. | Probe CDP (DOM terhitung) | Tinggi |
| 6 | Hero: model 3D, dua judul besar di kiri-kanan, bilah atas (wordmark, tombol garis tepi, "MENU"), isyarat "Scroll to explore" | Tangkapan layar headless | Tinggi |
| 7 | Layar muat dengan teks persentase ("Loading… 0 % completed") dan wordmark sebelum hero | Tangkapan layar; mekanisme penghitung progres tidak terlihat | Tinggi (tampilan) / rendah (mekanisme) |
| 8 | Lima rute: `/`, `/craftanddesign`, `/feelandplay`, `/techandspec`, `/contact`, semuanya HTTP 200. Beranda: 5 `<section>`, 7 `<h2>`, 2 `<h1>`, 2 `<video>` (autoplay, muted, loop, playsInline, preload metadata), 14 `<img>`. `/feelandplay` kosong di HTML awal (dirender klien). | HTML tiap rute + REA | Tinggi |
| 9 | Aksesibilitas referensi lemah: landmark hanya `main`; 5 dari 18 tautan/tombol tanpa nama; tanpa skip link; `lang="en"`; 0 aturan `prefers-reduced-motion` di CSS, hanya 1 pemeriksaan di JS | Pohon aksesibilitas REA (498 node) + probe | Tinggi |
| 10 | Tipografi: serif display (700) untuk judul, sans untuk isi; H2 terhitung 84,96 px pada lebar 1440 (sekitar 5,9 vw), H1 sekitar 35 px | `getComputedStyle` lewat CDP | Tinggi |
| 11 | Beban awal: JS 22 skrip 1.686 KB mentah, CSS 5 berkas 713 KB (satu 647 KB), font 6 berkas 233 KB, gambar awal 117 KB (WebP). DOM hanya 435 node. | REA `inspect-web-page` | Tinggi |

**Tidak teramati (jangan dianggap fakta):** ukuran dan lokasi berkas model GLB; frame setelah sekitar 50 % bagian cerita (hitam di tangkapan headless, kemungkinan keterbatasan WebGL perangkat lunak); konfigurasi Lenis kustom (hanya bawaan terlihat); isi `/feelandplay`; apakah layar muat menghitung aset sungguhan.

### 3.2 Baseline IrriSense (sebelum) dibanding referensi

| Metrik | IrriSense sekarang | Referensi |
|---|---|---|
| JS landing | 792 KB mentah, 257 KB gzip (11 berkas) | 1.686 KB mentah (22 skrip) |
| JS iframe 3D `/prototipe/` | 729 KB mentah, 186 KB gzip (Three.js saja 655 / 164) | termasuk di atas |
| Dikirim terkompresi? | **Tidak.** `backend/src/app.js:73-78` tanpa kompresi, jadi yang terkirim sebesar ukuran mentah (sekitar 1,5 MB JS) | CDN |
| Transfer saat dimuat (audit Fase 1, cache dimatikan) | 2.854 KB dari 29 respons, **0 terkompresi**; skrip 2.335 KB karena tiap iframe mengunduh Three.js sendiri | - |
| CLS saat scroll penuh (audit Fase 1) | 0,002 | tidak diukur |
| CSS | 10 KB | 713 KB |
| Font | 183 KB (5 woff2) | 233 KB |
| Gambar halaman awal | 397 KB (3 PNG; poster hero 143 KB tanpa dioptimalkan) | 117 KB (WebP) |
| Landmark | banner, main, contentinfo, 3 region (tanpa `navigation`) | hanya `main` |
| Tautan/tombol tanpa nama | 0 dari 3 | 5 dari 18 |
| DOM node | 817 (3 frame; iframe memuat 46 tombol dan 33 item daftar yang tersembunyi) | 435 |
| Reduced motion (diuji CDP) | intro dilewati, 0 iframe, judul terlihat. **Cacat:** angka target terbaca "< 0 detik", "± 0 %", "0 %" sampai digulir ke layar | CSS 0 aturan |
| Tanpa JavaScript (diuji CDP) | judul dan angka target benar, overlay intro tersembunyi | tidak diuji |

### 3.3 Kondisi kode sekarang (file:baris)

| Area | Lokasi |
|---|---|
| Bagian halaman | `landing/components/Sections.tsx`: Hero 9, Masalah 50, CaraKerja 102 (id `cara-kerja` 104, `<ol id="cara-langkah">` 110, `Spin3D` 121), Target 150, Tim 184 |
| Pengendali 3D di landing | `landing/components/Spin3D.tsx`: mode cerita dan hitung langkah 80-112, pendengar pesan 114-129, pendengar scroll/resize 130-132, `src` + `&story=1` 168 |
| Scene | `backend/prototipe/scene.js`: `embed` 9, registri bagian `reg(...)` 116-194, `enclosureParts` 133, legenda 269, `refreshUI` 346, `drawChart` 367, timer 447 dan 455, `STORY`/`storyPose`/`highlight` 473-490, pesan masuk 511-513, loop 518, `__prototype` 564 |
| CSS section | `landing/components/sections.module.css`: `.caraGrid` 121, `.steps` 125, `.caraFigure` 148, blok `@media (min-width: 64rem)` **ganda** di 262 dan 283 |
| Intro | `landing/components/Intro.tsx` (74 baris), `landing/lib/useIntroState.ts`, aturan di `landing/app/globals.css` 53-129, skrip `<head>` di `landing/app/layout.tsx` |
| `scroll-behavior: smooth` | `landing/app/globals.css:9` (bertabrakan dengan Lenis bila tak ditangani) |
| CountUp (salinan React Bits yang saya ubah) | `landing/components/reactbits/CountUp.tsx:249` (teks awal = nilai akhir), `:268` (efek layout mengosongkan ke nilai awal), `:398` (reduced motion hanya dicek saat animasi berjalan) |
| Backend statis dan SSE | `backend/src/app.js`: SSE `/api/stream` 61-70, mount statis 73-78 |

### 3.4 Daftar API yang boleh dipakai (Allowed APIs) dan sumbernya

**Lenis 1.3.27 (MIT).** README: `https://unpkg.com/lenis@1.3.27/README.md`.
- Impor: `import Lenis from "lenis"`; CSS: `import "lenis/dist/lenis.css"` (README 132). Next mengizinkan impor CSS dari `node_modules` di mana saja (`landing/node_modules/next/dist/docs/01-app/01-getting-started/11-css.md:358`).
- Opsi (README 190-210): `autoRaf` (bawaan false), `anchors` (false), `lerp` (0.1), `duration` (1.2), `smoothWheel` (true), `syncTouch` (false), `respectReducedMotion` (true), `allowNestedScroll`, `autoToggle`.
- Metode (README 262-268): `on`, `raf(ms)`, `scrollTo(target, {offset, duration, immediate, lock, force, onComplete})`, `start()`, `stop()`, `destroy()`, `resize()`. Properti `lenis.prefersReducedMotion` (README 352).
- Integrasi GSAP, salin dari README 145-160:
  ```js
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  ```
- Atribut cegah: `data-lenis-prevent`, `-wheel`, `-touch`, `-vertical`, `-horizontal` (README 299-310).
- **Kendala dari `lenis.css`:** aturan `.lenis.lenis-smooth iframe { pointer-events: none }`. Selama Lenis aktif, iframe 3D tidak bisa diseret. Penanganannya ada di Fase 4.
- Entri React `lenis/react` mengekspor `ReactLenis` dan `useLenis(callback, deps, priority)`; props `root`, `options`, `autoRaf` (`lenis-react.d.ts`). Rencana ini memakai kelas `Lenis` biasa agar bergantung pada cuplikan yang terdokumentasi.
- README tidak menyebut `scroll-behavior`; tabrakan dengan `html { scroll-behavior: smooth }` harus diuji (Fase 4).

**GSAP 3.15.1 dan @gsap/react 2.1.2 (terpasang).** Sumber: tipe di `landing/node_modules/gsap/types/scroll-trigger.d.ts` dan `gsap-core.d.ts`, `landing/node_modules/@gsap/react/types/index.d.ts`.
- `ScrollTrigger.create(vars: StaticVars)` (133); `StaticVars extends Vars` (765), jadi semua kunci `Vars` berlaku. Kunci: `trigger` 761, `start` 758, `end` 727, `scrub` 756, `pin` 747, `pinSpacing` 750, `anticipatePin` 725, `invalidateOnRefresh` 733, `onUpdate` 745, `onToggle` 746, `scroller` 755, `refreshPriority` 754, `snap` 757, `markers` 734.
- Statis: `ScrollTrigger.update()` 482, `refresh()` 378, `getAll()` 165, `matchMedia()` 286, `config()` 114, `isInViewport()` 240, `maxScroll()` 302.
- `gsap.matchMedia(scope?)` (`gsap-core.d.ts:450`), `gsap.ticker.add/remove` (157/161), `gsap.ticker.lagSmoothing` (160).
- `useGSAP(callback, { scope, dependencies, revertOnUpdate })` dan `contextSafe` (`@gsap/react/types/index.d.ts:10-33`). Daftarkan plugin seperti `components/reactbits/SplitText.tsx:9`.

**Next.js 16.4.5, ekspor statis.** Baca dulu `landing/AGENTS.md` dan `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`.
- Tidak didukung: rute dinamis tanpa `generateStaticParams`, rewrites, redirects, headers, Image Optimization dengan loader bawaan, Server Actions (bagian "Unsupported Features"). Karena itu `images.unoptimized: true` dan `trailingSlash: true` di `landing/next.config.ts` tetap.
- Halaman baru: `app/<nama>/page.tsx` menghasilkan `out/<nama>/index.html`.
- `next/dynamic` dengan `ssr: false` hanya di Client Component (`01-app/02-guides/lazy-loading.md:66, 94`).

**Express 4.22.3 + compression 1.8.2 + serve-static (terpasang 1.16.3; README yang dibaca versi 1.16.2).**
- `app.use(compression({ filter }))`, dengan `filter(req, res)` memanggil `compression.filter(req, res)` sebagai cadangan (README compression, contoh baris 180-194).
- SSE tidak jalan di balik kompresi tanpa `res.flush()` (README compression, bagian "Server-Sent Events", baris 252-275). Rencana ini **mengecualikan** `/api/stream` lewat filter.
- `express.static(dir, { maxAge, immutable })`: `immutable` hanya berguna bersama `maxAge` (README serve-static, baris 93-99).

**CDP yang sudah diuji berhasil (Edge 157):** `Emulation.setEmulatedMedia`, `Emulation.setScriptExecutionDisabled`, `Network.emulateNetworkConditions`, `Page.addScriptToEvaluateOnNewDocument`. Tambahan yang dipakai skrip penemuan: `Network.enable`, `Page.captureScreenshot`, `Runtime.evaluate`.

**REA CLI yang relevan (6.8.0):** `inspect-web-page`, `analyze-web-bundle`, `observe-web-session`, `capture-web-screenshot`, `list-browser-targets`. Pelajaran dari percobaan: `analyze-web-bundle --detail summary` mewajibkan `--view` berbentuk objek yang tidak terdokumentasi, jadi pakai mode lengkap; `--allowed-origins` tidak usah dipakai (bawaannya sudah asal target).

**Dependensi untuk Fase 10 (ditunda):** `@react-three/fiber` 9.8.2 (peer React `>=19 <19.4`, `three >=0.156`), `@react-three/drei` 10.7.9 (peer `three >=0.159`), keduanya MIT. React kita 19.3.0, jadi memenuhi, tetapi batas atas `<19.4` melarang menaikkan React. `three/examples/jsm/exporters/GLTFExporter.js` ada di Three 0.160.

### 3.5 Anti-pola (jangan dilakukan)

- Mengarang parameter yang tak ada di bagian 3.4. Bila ragu, baca berkas tipe atau README yang dirujuk.
- `autoRaf: true` bersama `gsap.ticker.add(... lenis.raf ...)` (dua loop raf). Pilih satu: ticker GSAP.
- Membungkus halaman dengan `ReactLenis` **dan** membuat `new Lenis` sekaligus.
- Memanggil `ScrollTrigger.create` di badan render. Panggil di `useGSAP` atau `useEffect` dan bersihkan (`revert` atau `kill`).
- `next/dynamic({ ssr: false })` di Server Component.
- Menambah `rewrites`, `redirects`, `headers` di `next.config.ts`, atau mengandalkan Image Optimization (ekspor statis).
- Mengaktifkan `syncTouch` atau membajak scroll sentuh.
- Menganimasikan properti tata letak; pakai `transform`, `opacity`, `clip-path`.
- Mengirim SSE lewat kompresi tanpa pengecualian filter.
- `Cache-Control: immutable` pada berkas yang namanya tidak berhash (`/prototipe/*.js`, `/vendor/*`).
- Menyalin apa pun dari referensi (bagian 1).
- Menaruh angka atau klaim baru tanpa sumber di repo.

### 3.6 Anggaran performa (usulan; dapat diubah di Fase 1)

| Metrik | Baseline | Anggaran |
|---|---|---|
| JS landing, gzip | 257 KB | maksimal 300 KB (termasuk Lenis, sekitar 10 KB gzip) |
| JS iframe 3D, gzip | 186 KB | maksimal 200 KB |
| CSS mentah | 10 KB | maksimal 30 KB |
| Font | 183 KB | maksimal 200 KB |
| Poster hero (gambar di atas lipatan) | 143 KB | maksimal 60 KB |
| DOM node total (landing + 2 iframe embed) | 817 | maksimal 450 |
| Landmark | tanpa `navigation` | banner, navigation, main, contentinfo |
| Tautan/tombol tanpa nama | 0 | 0 |
| CLS saat scroll penuh | tidak diukur | maksimal 0,05 |

LCP dan TBT tidak bisa diukur andal di Edge headless (WebGL perangkat lunak). Ukur keduanya di laptop pameran (Fase Akhir).

## 4. Urutan dan ketergantungan

```
Fase 1 (alat audit, anggaran)
  |-- Fase 2 (higiene server, cacat CountUp)   [bebas dari Fase 3]
  |-- Fase 3 (tipografi, header, landmark)
         |-- Fase 7 (halaman Spesifikasi)      [butuh Q1]
Fase 2 + 3 -> Fase 4 (Lenis + lapisan seret) -> Fase 5 (panggung cerita) -> Fase 6 (layar muat) -> Fase 8 (gerak) -> Fase 9 (aksesibilitas nyata) -> Fase Akhir
Fase 10 (R3F + GLB) ditunda; hanya bila keputusan Q2 berubah.
```

### Risiko utama dan penangkalnya

| Risiko | Penangkal |
|---|---|
| Lenis mematikan pointer di iframe (`lenis.css`) | Lapisan seret di induk (Fase 4); diuji dengan seret dan roda mouse sungguhan |
| Posisi ScrollTrigger meleset setelah font atau gambar selesai dimuat | `ScrollTrigger.refresh()` setelah `document.fonts.ready` dan saat `irri-ready` |
| Hidrasi `<html data-intro>` berbeda dari server | `suppressHydrationWarning` di `app/layout.tsx`; jangan dihapus |
| Kinerja bagian cerita di GPU lemah | Hanya transform; iframe dijeda di luar layar (`irri-visible`); uji manual di laptop pameran |
| Bundel membengkak | Anggaran 3.6 diperiksa tiap fase oleh audit |

## 5. Fase

### Fase 1: titik awal dan alat audit (ukuran S)

**Status: selesai 2026-11-09.** Commit checkpoint `4a3d40b`; alat `tools/audit/` (audit penuh sekitar 35 detik); baseline `evidence/baseline-2026-11-09.json` dengan 4 gagal sesuai perkiraan: poster hero 140 KiB, DOM 817 node, landmark `navigation` belum ada, angka target nol saat kurangi gerak. Kode keluar terbukti: anggaran longgar 0, satu batas diperketat 1.

**Prasyarat:** izin Anda untuk commit; repo GitHub sudah privat.

**Kerjakan**
1. Commit checkpoint dari 10 berkas yang belum ter-commit (7 diubah, 3 baru: `HeroTitle.tsx`, `Intro.tsx`, `useIntroState.ts`). Pesan dalam bahasa Indonesia, akhiri dengan baris Co-Authored-By sesuai aturan sesi.
2. Buat `tools/audit/audit.mjs`, adaptasi dari skrip penemuan (Lampiran B). Alur: nyalakan Edge headless (`--remote-debugging-address=127.0.0.1`, profil sementara), buka URL, lalu (a) `npx -y rea-agents@6.8.0 inspect-web-page <endpoint> <targetId> --observation-ms 3000 --include-accessibility-text --format json` dijalankan dari folder sementara di luar proyek (anjuran README REA); (b) probe jaringan dengan scroll bertahap; (c) tiga emulasi (reduced motion, tanpa JavaScript, jaringan lambat) dan pengukur CLS lewat `Page.addScriptToEvaluateOnNewDocument`. Matikan Edge di blok `finally`.
3. Keluaran: JSON + tabel ringkas; **kode keluar 1 bila anggaran 3.6 dilanggar**.
4. Simpan baseline di `docs/superpowers/plans/evidence/baseline-2026-11-09.json` (hanya angka IrriSense; tanpa konten pihak ketiga).

**Rujukan:** Lampiran B (skrip `probe.mjs`, `emul.mjs`, `shots.mjs`); bagian 3.4 (CDP).

**Verifikasi**
- `node tools/audit/audit.mjs http://localhost:3000/` mencetak angka yang cocok dengan tabel 3.2 (selisih sampai 10 %).
- Ubah satu anggaran menjadi lebih kecil dari baseline, jalankan lagi: harus keluar kode 1. Kembalikan.
- `netstat` tidak menunjukkan port 9222 setelah selesai.

**Guard:** Edge hanya di `127.0.0.1`; jangan commit skrip atau aset pihak ketiga; jangan jalankan `npx` di dalam folder proyek.

### Fase 2: higiene server dan dua cacat nyata (ukuran M)

**Status: selesai 2026-11-09.** Audit `evidence/fase2-2026-11-09.json`: transfer halaman 2.854 KB (0 dari 29 terkompresi) menjadi 784,5 KB (24 dari 28 terkompresi); poster hero 140,1 KB menjadi 20,5 KB (WebP); DOM total 817 menjadi 305 node (iframe embed 13 node); angka target saat kurangi gerak kini final dan nilai akhir selalu dibacakan pembaca layar. Tersisa 1 gagal sesuai jadwal: landmark `navigation` (Fase 3). Tes backend 42 lulus, termasuk uji mutasi yang membuktikan SSE tidak lagi tertahan kompresi. `sharp` 0.35.5 (Apache-2.0) hanya di `tools/`.

**Kerjakan**
1. **Kompresi.** `npm install --save-exact compression@1.8.2` di `backend/`. Di `backend/src/app.js` (sebelum mount statis, baris 73) tambah `app.use(compression({ filter }))` dengan filter yang mengembalikan `false` untuk `req.path === '/api/stream'` dan selain itu `compression.filter(req, res)`.
2. **Cache berkas berhash.** Mount tambahan `app.use('/_next/static', express.static(<landingDir>/_next/static, { maxAge: '1y', immutable: true }))` sebelum mount landing (baris 78). Biarkan `/prototipe/*` dan `/vendor/*` tanpa `immutable`.
3. **Mode embed ramping.** Di `backend/prototipe/scene.js`, lewati pembuatan legenda (baris 269), `refreshUI`/`drawChart`, dan `setInterval(refreshUI, 250)` (baris 455) saat `embed`. Halaman penuh `/prototipe/` harus tetap persis seperti sekarang.
4. **CountUp.** Perbaiki cacat reduced-motion di `landing/components/reactbits/CountUp.tsx`: bila `prefers-reduced-motion`, jangan mengosongkan ke nilai awal (baris 268) dan tampilkan nilai akhir; untuk semua kasus, tambahkan teks nilai akhir yang terbaca pembaca layar (`sr-only`) dan tandai teks hitungan `aria-hidden`.
5. **Poster WebP.** Skrip satu kali `tools/images/convert.mjs` (devDependency `sharp` hanya di `tools/`, bukan di `landing`) mengubah `landing/public/img/prototipe-hero.png` dan `prototipe-terbuka.png` menjadi WebP; ganti `poster` di `Sections.tsx` (baris 34 dan 121). Bila `sharp` gagal dipasang di Node 26, biarkan PNG dan catat.

**Rujukan:** README compression (baris 180-194, 252-275); README serve-static (93-99); bagian 3.3 tabel CountUp.

**Verifikasi**
- `curl -s -I -H "Accept-Encoding: gzip" http://localhost:3000/vendor/three/build/three.module.min.js` memuat `content-encoding: gzip`; ukuran terkirim di audit turun mendekati kolom gzip 3.2.
- Tes baru di `backend/test/app.test.js`: (a) berkas Three terkompresi, (b) `/api/stream` **tidak** memuat `content-encoding` dan event `reading` tiba (pakai pola tes SSE yang sudah ada).
- Audit: DOM node total tiga frame turun dari 817 ke maksimal 450; poster hero di bawah 60 KB.
- Emulasi reduced motion: angka target terbaca "< 2 detik", "± 5 %", "30 %" tanpa digulir.
- `npm test` di `backend/` tetap lulus (40 sekarang, ditambah tes baru).

**Guard:** jangan memakai `res.flush()` sebagai jalan pintas; jangan beri `immutable` pada berkas tak berhash; jangan menyentuh perilaku `/prototipe/` non-embed.

### Fase 3: tipografi, landmark, dan navigasi (ukuran M)

**Status: selesai 2026-11-09.** Audit `evidence/fase3-2026-11-09.json`: semua anggaran lulus (landmark banner, navigation, main, contentinfo; Tab pertama ke tautan lewati; DOM 326; JS 260,3 KB gzip; CSS 12,6 KB; CLS 0,002). Delivery Gate tanpa FAIL (`evidence/delivery-gate-fase3.md`). Penyimpangan dari rencana: menu ponsel memakai atribut `popover`, bukan `<details>` (Esc dan klik di luar menutupnya, dan daftar melayang tanpa menggeser tata letak); header tidak menempel, jadi `scroll-margin-top` tidak perlu; judul Cara kerja dipindah ke atas grid agar tetap dua baris di 1280 px; token judul section `clamp(2.25rem, 4.6vw, 4.25rem)`, sedikit lebih kecil dari usulan. Temuan Gate yang ikut diperbaiki: status hover dan tekan semua kontrol, tombol Lewati intro 44 px, dan tetesan 3D di embed berhenti 5 detik setelah pompa menyala.

**Kerjakan**
1. **Skala tipografi.** Di `design/tokens.css` (sumber tunggal) tambah token `--step-*` fluid (usulan: judul section `clamp(2.25rem, 5.2vw, 4.75rem)`; judul hero tetap). Jalankan `npm run sync:tokens` di `backend/` dan `landing/`. Pakai di `.h2`, `.revealText`, `.targetValue` pada `sections.module.css`. Acuan ukur (bukan untuk disalin): referensi memakai H2 sekitar 5,9 vw; font IrriSense tetap Fraunces + Instrument Sans.
2. **Header dan navigasi.** Komponen server `landing/components/SiteHeader.tsx`: `<header>` berisi tautan lewati (`<a href="#konten">Lewati ke konten</a>`, fokus pertama) dan `<nav aria-label="Utama">` dengan tautan yang **sudah ada saja**: Cara kerja (`/#cara-kerja`), Uji coba (`/prototipe/`), Dashboard (`/dashboard/`). Di bawah 48rem pakai `<details><summary>Menu</summary>...</details>` (tanpa JavaScript). Beri `id="konten"` pada `<main>` di `app/page.tsx`.
3. **CSS.** Gabungkan dua blok `@media (min-width: 64rem)` ganda (`sections.module.css:262` dan `:283`). Tambah `scroll-margin-top` pada `[id]` agar anchor tak tertutup header.
4. **Dokumen.** Perbarui `design/DESIGN.md`: skala tipografi, navigasi, dan dial MOTION ("dosis sedang, terkait scroll").

**Rujukan:** `design/DESIGN.md`; `.claude/skills/antislop-ui/SKILL.md` (tidak ada tautan mati R-24; satu aksen); `.claude/skills/antislop-layoutmobile/SKILL.md`.

**Verifikasi**
- Audit: landmark `banner`, `navigation`, `main`, `contentinfo`; tautan/tombol tanpa nama = 0.
- CDP `Input.dispatchKeyEvent` Tab pertama: `document.activeElement` adalah tautan lewati.
- Kontras teks header di atas pita hijau (hitung WCAG, minimal 4,5:1); lebar 375, 768, 1280 tanpa overflow.
- Delivery Gate antislop.

**Guard:** tidak ada tautan ke halaman yang belum ada; tombol menu harus punya teks, bukan ikon saja; jangan tambah warna baru.

### Fase 4: mesin scroll Lenis + ScrollTrigger dan lapisan seret (ukuran M)

**Status: selesai 2026-11-09.** Lenis 1.3.27 (MIT) dipasang lewat `components/SmoothScroll.tsx` dengan integrasi README 145-160. Uji CDP `evidence/fase4-scroll.mjs` (hasil `evidence/fase4-scroll-2026-11-09.json`), semua lulus: kelas `lenis` ada; roda di atas model 3D menggulir halaman (511 ke 1111 px); seret memutar model 1,8 rad lalu kembali ke 0 setelah dilepas; anchor dari tombol hero dan tautan nav maju tanpa langkah mundur dan mendarat 0 px dari section; PageDown, Spasi, dan Enter jalan; "kurangi gerak" tanpa Lenis dan anchor mendarat 0 px; layar sentuh 375 px tanpa Lenis, tanpa overflow, lapisan seret `touch-action: pan-y`; konsol tanpa error. Audit `evidence/fase4-2026-11-09.json`: semua anggaran lulus, JS landing 260,3 menjadi 263,2 KB gzip (naik 2,9 KB), CLS 0. Butir 4 (`scroll-behavior`): diuji tidak bentrok, jadi `globals.css` tidak diubah. Delivery Gate tanpa FAIL (`evidence/delivery-gate-fase4.md`).

**Prasyarat:** Fase 2 dan 3.

**Kerjakan**
1. `npm install --save-exact lenis@1.3.27` di `landing/`.
2. Buat `landing/components/SmoothScroll.tsx` (Client Component, dipasang di `app/layout.tsx`). Di efek: lewati bila `(prefers-reduced-motion: reduce)` atau `(hover: none), (pointer: coarse)` (Q5). Selain itu `new Lenis({ anchors: true })` dan pasang integrasi **persis README 145-160** (bagian 3.4); bersihkan dengan `gsap.ticker.remove(tick)` dan `lenis.destroy()`. Impor `lenis/dist/lenis.css`. Daftarkan `ScrollTrigger` dengan `gsap.registerPlugin`.
3. Selama intro memutar (`html[data-intro="play"]`) panggil `lenis.stop()`; pada event `irri-intro-done` panggil `lenis.start()` (README 267-268).
4. `scroll-behavior`: karena README tidak membahasnya, uji dulu. Bila anchor beranimasi ganda, ganti `html { scroll-behavior: smooth }` (`globals.css:9`) menjadi `html:not(.lenis) { scroll-behavior: smooth }` atau hapus.
5. **Lapisan seret (wajib, karena `lenis.css` mematikan pointer di iframe).** Di `Spin3D.tsx` tambah `<div aria-hidden="true">` transparan di atas iframe, `touch-action: pan-y`, kursor grab. Ia menerjemahkan `pointerdown/move/up` menjadi `postMessage({ type: 'irri-drag', dx })` dan `irri-dragend`. Di `scene.js` mode embed (baris 497-502) ganti pendengar pointer pada kanvas dengan penanganan pesan itu (efeknya sama: `dragAngle += dx * 0.012`, kembali ke pose setelah 1,5 detik). Halaman penuh `/prototipe/` tidak berubah.

**Rujukan:** README Lenis 95-160, 190-210, 262-268, 329-341; `lenis.css`; `Spin3D.tsx:80-132`; `scene.js:497-513`.

**Verifikasi (CDP)**
- Normal: `html` punya kelas `lenis`; roda mouse di atas area 3D menggulir halaman (`scrollY` naik); seret di lapisan mengubah `__prototype.dragAngle`.
- Emulasi reduced motion: tidak ada kelas `lenis`; klik `a[href="#cara-kerja"]` mendarat dalam 4 px dari puncak section.
- Anchor biasa dan Tab/Space/PageDown tetap bekerja.
- Audit: delta JS landing kurang dari 15 KB gzip.

**Guard:** satu loop raf saja (ticker GSAP); `autoRaf` tetap false; jangan `syncTouch`; `destroy` saat unmount; jangan beri `lock: true` pada anchor.

### Fase 5: panggung cerita 2.0 (ukuran L)

**Status: 5A selesai 2026-11-09; 5B tidak dikerjakan (Q3 tetap bawaan).** `components/CaraStory.tsx` membungkus daftar langkah dan model dalam pembungkus 450vh dengan panggung `position: sticky`; satu `gsap.timeline({ scrollTrigger: { trigger, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate } })` memberi progres induk ke model (`irri-progress`, lewat `lib/storyProgress.ts`) dan menggerakkan `--lit` tiap langkah. `scene.js` mengelompokkan mesh lewat `part()` dan merakitnya dengan `assemble(p)` (`easeOutCubic`), kamera ke waypoint 0,15 / 0,40 / 0,65 / 0,90 dengan diam ±0,05. Uji CDP `evidence/fase5-story.mjs` (hasil `evidence/fase5-story-2026-11-09.json`, gambar `evidence/fase5/`), semua lulus: pembungkus 4,5 layar dan panggung menempel; perakitan p=0 semua 0, p=0,33 [1, 1, 0,898, 0, 0], p=0,66 [1, 1, 1, 1, 0], p=1 semua 1, monoton dan urut; langkah aktif sama di daftar dan model (0, 1, 2, 3); kontras langkah redup minimal 5,82:1; roda di atas panggung menggulir (3197 ke 3677 px); seret 1,8 rad lalu kembali ke 0; ganti mode lewat ubah ukuran dua kali dan ubah ukuran ke 1440: ScrollTrigger tetap 2 (cerita) atau 1 (biasa); Tab sampai tautan di panggung dan tautan terlihat; CLS 0; "kurangi gerak", 1280 × 560, dan sentuh 375 px kembali ke daftar biasa, overflow 0; konsol tanpa error. Uji ulang Fase 4 semua lulus. Audit `evidence/fase5-2026-11-09.json`: semua anggaran lulus, JS landing 263,2 menjadi 264,1 KB gzip, CSS 13,5 KB, DOM 329, CLS 0,002. Tes backend 44 lulus (2 baru di `test/story.test.js`, menjaga `WAYPOINTS` dan `HOLD` sama di landing dan scene). Delivery Gate tanpa FAIL (`evidence/delivery-gate-fase5.md`).

Penyimpangan dari rencana: (1) urutan rakit mengikuti empat langkah (bedeng, tanaman, sensor; casing, ESP32, relay, duct, kabel sensor; tandon, pompa, selang, emitter, adaptor; tutup ber-LCD dan DHT11), bukan urutan butir 3, agar tiap langkah merakit yang dibahasnya; bagian turun lurus dari atas dan kelompok langkah 2 sampai 4 disembunyikan sampai gilirannya karena percobaan pertama (semua melayang sekaligus) membuat duct menutupi sensor; (2) pose langkah 4 lebar (model utuh, LCD dan DHT11 disorot), bukan dekat ke LCD, karena DHT11 ikut langkah 4; (3) langkah redup memakai warna `--muted` dan geser 0,75 rem, bukan opacity, karena opacity 0,4 hanya sekitar 2,4:1; (4) mode cerita juga butuh tinggi minimal 36rem, dan di bawah 1280 px kolom dibuat sama lebar agar empat langkah muat; (5) `irri-story` langsung dihapus karena landing dan scene dirilis bersama; (6) uji bocor "pindah rute" diganti ganti mode lewat ubah ukuran, karena landing hanya satu rute Next dan halaman lain dimuat penuh. Belum diuji: kelancaran 60 fps di laptop pameran (manual), LCP dan TBT (tidak diukur).

**Prasyarat:** Fase 4. Dikerjakan dalam dua langkah; 5B hanya bila Q3 memintanya.

**5A: progres induk dan perakitan**
1. **Satu progres induk.** Ganti hitung "langkah berpecahan" berbasis pusat elemen DOM (`Spin3D.tsx:80-112`) dengan satu `ScrollTrigger.create({ trigger: <bungkus tinggi>, start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: self => post({ type: 'irri-progress', p: self.progress }) })`. Ini pola yang sama dengan referensi (bagian 3.1 baris 4) dan tipenya ada di `scroll-trigger.d.ts` (bagian 3.4). Bungkus tinggi: `--story-length: 450vh` (empat langkah, sekitar satu layar per langkah; referensi 10 layar karena isinya lebih banyak). Panggung `position: sticky; top: 0` (pola CSS, lebih tahan dengan Lenis; `pin` bukan keharusan). Daftarkan lewat `useGSAP({ scope })` dan `ScrollTrigger.refresh()` setelah `document.fonts.ready`.
2. **Pesan.** Tambah `irri-progress {p}` di `scene.js`; pertahankan `irri-story {u}` sementara agar mundur-kompatibel, lalu hapus di akhir fase.
3. **Perakitan (inti gaya referensi, isi milik IrriSense).** Di `scene.js` kelompokkan mesh per komponen daftar legenda (12 komponen; bagian registri `reg()` baris 116-194 sudah memberi kunci `s0..s5`, `tank`, `pump`, `casing`, `lcd`, `esp`, `relay`, `adaptor`, `dht`; tambahkan kelompok untuk bedeng, selang, kabel duct). Fungsi `assemble(p)`: tiap kelompok bergeser dari posisi terurai ke posisi akhir mengikuti jendela progres sendiri (urutan: bedeng dan tanaman, sensor, selang/tandon/pompa, casing/ESP32/relay, LCD dan tutup, DHT/adaptor/duct), memakai `easeOutCubic`. Waypoint kamera dan sorotan (`STORY`, baris 473) dipetakan ke progres 0,15 / 0,40 / 0,65 / 0,90 dengan jeda di tiap waypoint.
4. **Teks langkah.** Daftar langkah (`#cara-langkah`) tetap DOM biasa; kelas aktif ditentukan dari `p`, bukan dari `getBoundingClientRect`. Judul langkah memudar/bergeser lewat `gsap.timeline({ scrollTrigger: { scrub: true } })`.
5. **Mundur-kompatibel.** Tampilan tanpa JavaScript, `< 1024px`, dan reduced motion tetap daftar + poster (perilaku sekarang, atribut `data-story`).

**5B (opsional, Q3): panggung layar penuh.** Panggung 100svh dengan 3D di belakang, kartu teks solid (bukan kaca, antislop R-10) di kiri; gaya dua judul besar kiri-kanan ala referensi hanya sebagai ide komposisi, teks milik sendiri.

**Rujukan:** `scroll-trigger.d.ts` baris 725-761, 482, 378; `Spin3D.tsx`; `scene.js:116-194, 473-513, 518`; legenda `scene.js:269`; README Lenis 145-160.

**Verifikasi (CDP)**
- Pada `p` = 0, 0,33, 0,66, 1 (scroll terprogram): ambil tangkapan layar JPEG kecil dan nilai `__prototype.story`; di p=0 bagian terurai, di p=1 terpasang semua; urutan monoton.
- `ScrollTrigger.getAll().length` sama sebelum dan sesudah berpindah rute pulang-pergi (tanpa bocor).
- CLS maksimal 0,05; `ScrollTrigger.getAll()` tidak bertambah saat resize.
- Seret dan roda mouse tetap bekerja di atas panggung (Fase 4).
- Kinerja 60 fps **tidak** dapat dibuktikan di headless; catat sebagai uji manual di laptop pameran.

**Guard:** tidak ada loop gerak otomatis; hanya properti transform di scene; jangan menaruh keadaan di `window` selain `__prototype` yang ada; jangan menambah pesan tanpa memeriksa `e.origin` dan `e.source` (pola sekarang di `Spin3D.tsx:114-117`).

### Fase 6: layar muat berbasis progres (ukuran M, hanya bila Q4 disetujui)

**Status: selesai 2026-11-09.** Garis waktu tetap diganti progres sungguhan. `lib/loadProgress.ts` mencatat tiga bagian: huruf (`document.fonts.ready`, bobot 40), poster hero (`decode()`, 10), dan model hero (`irri-ready`, 50). `Intro.tsx` memakai `--intro-progress` pada `.intro__water` (`transform: scaleY()`) dan teks "Memuat halaman n %" (`role="status"`, per 10 %). Penutup paling cepat mulai pudar 1,2 detik dan selalu hilang paling lambat 3,5 detik setelah first-paint.

Uji CDP `evidence/fase6-intro.mjs` (hasil `evidence/fase6-intro-2026-11-09.json`, gambar `evidence/fase6/`) semua lulus:
- jaringan cepat: progres 0, 50, lalu 100 %; pudar dijadwalkan di 1,81 detik dan penutup hilang di 2,21 detik; hero sudah menampilkan model;
- jaringan lambat (250 KB/s, 150 ms): progres 0, 40, lalu 50 %; pudar di 3,0 detik dan penutup hilang di 3,4 detik; model belum siap, jadi hero menampilkan poster;
- JavaScript diblokir: penutup hilang di 3,38 detik, roda menggulir 500 px, judul tampil;
- selama penutup tampil, halaman tidak bergulir dan Lenis berhenti;
- Tab mengenai "Lewati" (cincin krem, 44 px); Enter, Esc, dan klik melewati;
- kunjungan kedua tidak memutar intro;
- "kurangi gerak" dan tanpa JavaScript tidak menampilkan penutup;
- sentuh 375 px tanpa overflow;
- kontras teks status 12,12:1;
- trace membuktikan pudar dijalankan compositor;
- konsol tanpa error.

Uji ulang Fase 4 dan 5 lulus. Audit `evidence/fase6-2026-11-09.json`: semua anggaran lulus, JS landing naik dari 264,1 ke 264,8 KB gzip, CSS 14,0 KB. Tes backend 44 lulus. Delivery Gate tanpa FAIL (`evidence/delivery-gate-fase6.md`).

Penyimpangan dari rencana:
1. Batas atas CSS dimajukan ke detik 3,0 sampai 3,4, dan jam animasi disamakan dengan first-paint. Alasannya, saat halaman sibuk jam animasi CSS mulai 14 sampai 111 ms setelah penutup tergambar.
2. `visibility` dipisah dari animasi pudar (`intro-hide`) supaya pudar opacity dijalankan compositor. Versi pertama terlambat sekitar 0,18 detik saat main thread menyiapkan model 3D.
3. Dua tambahan di luar rencana untuk kasus JavaScript terlambat atau gagal. Skrip `<head>` menutup intro sendiri saat pudar CSS selesai; sebelumnya halaman tetap terkunci sampai JavaScript datang. Judul hero biasa juga tampil sendiri di detik 3,4.
4. Teks status dan tombol "Lewati" dipindah ke baris atas di luar air, karena teks kecil di atas `--air-600` hanya 3,1:1. Cincin fokus "Lewati" diganti krem; sebelumnya `--blue` hanya 2,6:1 di atas hijau tua.
5. Kata "IrriSense" muncul saat hurufnya siap, bukan di detik 1,2.
6. Menunda model Cara kerja sampai penutup hilang sudah dicoba lalu dibatalkan. Model hero tidak jadi lebih cepat, dan kerja beratnya pindah ke saat judul hero beranimasi.
7. Batas waktu dinilai dari jadwal animasi (jam compositor) yang dihitung dari first-paint. Waktu yang teramati di main thread Edge headless bisa tertinggal (jaringan lambat: 3,69 detik) karena model 3D disiapkan tanpa GPU; angka itu tetap dicatat di hasil uji.

Belum diuji:
- durasi dan kelancaran nyata di laptop pameran (GPU sungguhan);
- LCP dan TBT;
- pembacaan teks status oleh pembaca layar sungguhan (NVDA atau Narrator).

**Kerjakan**
1. Ganti garis waktu tetap di `globals.css` 53-129 dengan variabel `--intro-progress` (0 sampai 1) pada `.intro__water` memakai `transform: scaleY()` (bukan `height`). Progres = rata-rata tertimbang: `document.fonts.ready`, dekode poster hero (`HTMLImageElement.decode()`), dan pesan `irri-ready` iframe hero (sudah ada).
2. Batas: tampil minimal 1,2 detik (agar tidak berkedip) dan maksimal 3,5 detik (selalu lepas). Cadangan CSS murni tetap ada: animasi `intro-fade` berjalan sendiri bila JavaScript gagal (perilaku sekarang).
3. Tampilkan teks progres ("Memuat 60 %") di `<span aria-live="polite">`, diperbarui paling sering sekali per 10 %.
4. Tetap: sekali per kunjungan, lewati lewat tombol/Esc/klik, mati pada reduced motion dan tanpa JavaScript.

**Rujukan:** `Intro.tsx`, `useIntroState.ts`, `globals.css:53-129`, `layout.tsx` (skrip `<head>`); pengamatan referensi (bagian 3.1 baris 7).

**Verifikasi (CDP)**: `Network.emulateNetworkConditions` lambat membuat progres naik bertahap dan durasi tidak melewati 3,5 detik; jaringan cepat tidak kurang dari 1,2 detik; reduced motion dan tanpa JavaScript tidak menampilkan overlay.

**Guard:** `aria-live` tidak boleh membanjiri pembaca layar; jangan animasikan `height`; jangan blokir konten.

### Fase 7: halaman Spesifikasi (ukuran M, hanya bila Q1 disetujui)

**Status: selesai 2026-11-09.** Halaman `/spesifikasi/` (`app/spesifikasi/page.tsx`) berisi enam bagian: aturan pompa, komponen (12), pin ESP32, data dan jaringan (topik MQTT, buffer offline, baris LCD), API server, dan mode firmware. Datanya ada di `landing/content/spesifikasi.ts`. Tujuh tes di `backend/test/content.test.js` membandingkannya dengan `config.h`, `perkabelan.md`, `display.cpp`, `scene.js`, `platformio.ini`, `app.js`, dan `index.js`. Mutasi yang disengaja (ambang, label pin, nama komponen, env, dan rute) semuanya tertangkap. Header kini punya tautan "Spesifikasi" dengan `aria-current`, footer tim dipindah ke layout (`SiteFooter.tsx`), dan layar muat serta skrip `<head>`-nya hanya berlaku di beranda.

Uji `evidence/fase7-spesifikasi.mjs` (hasil `evidence/fase7-spesifikasi-2026-11-09.json`, gambar `evidence/fase7/`) semua lulus:
- `/spesifikasi/` 200, dan `/spesifikasi` dialihkan 301 ke sana;
- perayap: 32 href dan src internal di beranda dan Spesifikasi bernilai 200, dan setiap anchor punya id tujuan;
- isi enam tabel dan daftar aturan sama dengan data;
- satu h1 tanpa lompatan heading; enam tabel bernama dengan `scope`; `aria-current` hanya pada "Spesifikasi";
- anchor `#pin` mendarat 0 px dari bagiannya; urutan Tab benar, dengan cincin fokus krem;
- kontras minimal 5,24:1;
- tanpa overflow di 375, 768, dan 1280 px (dan 320 px di tangkapan tinjauan); menu ponsel menandai halaman aktif;
- "kurangi gerak" dan tanpa JavaScript tetap utuh;
- pindah ke beranda lewat tautan merek: tanpa layar muat, halaman tidak terkunci;
- beranda tetap memutar layar muat;
- CLS 0 dan konsol tanpa error.

Audit beranda `evidence/fase7-2026-11-09.json` lulus semua: JS 264,8 KB gzip, CSS 16,9 KB, DOM 332, CLS 0,002. Audit Spesifikasi `evidence/fase7-spesifikasi-audit-2026-11-09.json` lulus semua dengan `tools/audit/budgets-spesifikasi.json`: DOM 728 dari batas 800, CLS 0. Uji ulang Fase 4, 5, dan 6 lulus. Tes backend 52 lulus (8 baru). Delivery Gate tanpa FAIL (`evidence/delivery-gate-fase7.md`).

Penyimpangan dari rencana:
1. Isinya lebih luas dari butir 1. Selain komponen, pin, ambang, mode, dan API, halaman memuat topik MQTT, buffer offline, dan isi LCD. Semuanya diambil dari kode dan ikut dites, karena itulah yang dilihat penguji di alat dan dashboard.
2. Tes anti-melenceng tidak hanya memeriksa pin dan ambang, tetapi juga komponen, env, rute API, topik MQTT, dan baris LCD.
3. `/api/node` didaftarkan di `backend/src/index.js`, bukan `app.js`, jadi tes membaca keduanya.
4. Footer tim pindah ke layout supaya halaman Spesifikasi punya landmark contentinfo. Layar muat dan skrip `<head>` dibatasi ke beranda supaya halaman lain tidak ikut terkunci.
5. Anggaran DOM halaman Spesifikasi 800, bukan 450. Angka 450 disusun untuk beranda, sedangkan halaman ini enam tabel tanpa iframe. Angka 800 adalah batas peringatan Lighthouse. REA menghitung semua node termasuk teks (728); elemen di body hanya 361.
6. "Uji coba" sudah ada di header sejak Fase 3, jadi butir 3 hanya menambah "Spesifikasi".

Temuan di luar fase (tidak diubah):
- `docs/hardware/wiring.md` menyebut adaptor 5 V 3 A yang juga memasok VIN ESP32. Sebaliknya, `perkabelan.md` dan daftar komponen prototipe menyebut adaptor 5 VDC 2 A khusus jalur pompa, dengan ESP32 lewat USB. Halaman mengikuti `perkabelan.md` dan `scene.js`.
- `backend/README.md` menyebut "npm test (26 tes)", padahal sekarang 52.

Belum diuji: pembacaan oleh pembaca layar sungguhan, serta LCP dan TBT.

**Kerjakan**
1. `landing/app/spesifikasi/page.tsx` (Server Component, `metadata` sendiri). Isi hanya dari sumber repo: komponen (12 butir, `backend/prototipe/scene.js` array `items`), pin (`docs/hardware/perkabelan.md`, `firmware/src/config.h`: `SOIL_PINS` {36,39,34,35,32,33}, `DHT_PIN` 4, `RELAY_PIN` 26, ambang `M_SET` 60, `M_MAX` 80, `MAX_RUN_MS` 600000), mode firmware (`firmware/platformio.ini`: env `esp32dev`, `bringup`, `esp32dev_cal`, `bench`), dan API (`backend/README.md`, `backend/src/app.js`).
2. Data dalam `landing/content/spesifikasi.ts` (tipe jelas). **Tes anti-melenceng** di `backend/test/content.test.js`: membaca `firmware/src/config.h` dan `landing/content/spesifikasi.ts`, lalu memastikan pin dan ambang sama.
3. Tambahkan "Spesifikasi" ke `SiteHeader` dan tautan ke `/prototipe/` sebagai "Uji coba".
4. Beranda tidak diduplikasi; halaman ini tabel dan daftar bergaya editorial dengan skala tipografi Fase 3.

**Rujukan:** bagian 3.4 Next (halaman statis, `trailingSlash`); sumber isi di atas.

**Verifikasi:** `npm run build` menghasilkan `out/spesifikasi/index.html`; `GET /spesifikasi/` 200 dari backend (`/spesifikasi` mengarahkan ke dengan garis miring, seperti `/dashboard`); perayap tautan internal: semua `href` internal bernilai 200; audit memuat rute baru; tes isi lulus; tambahkan satu tes rute di `backend/test/app.test.js`.

**Guard:** tidak ada angka yang tidak punya sumber; tidak ada gambar stok; tidak membuat bagian kontak (Q6).

### Fase 8: koreografi gerak seperlunya (ukuran S sampai M)

**Status: selesai 2026-11-09.** Tiga efek dibuat, semuanya mengikuti gulir (scrub) dan hanya mengubah `clip-path` atau `transform`:
- (a) pita hero menyempit 3 % di kiri-kanan dan sudut bawahnya membulat sampai 14 px saat ditinggalkan;
- (b) angka 60–80 % bergeser mendatar ±2vw;
- (c) garis penanda progres 2 px di sisi kiri panggung cerita, dengan empat tanda langkah.

Efek (a) dan (b) ada di `components/ScrollMotion.tsx`, dipasang lewat `gsap.matchMedia("(min-width: 48rem) and (prefers-reduced-motion: no-preference)")` dan dibongkar lewat `mm.revert()`. Efek (c) masuk timeline yang sudah ada di `CaraStory.tsx`, dengan gaya di `storyMarker.module.css`.

Uji `evidence/fase8-gerak.mjs` (hasil `evidence/fase8-gerak-2026-11-09.json`, baseline `evidence/fase8-baseline-2026-11-09.json`, gambar `evidence/fase8/`) semua lulus:
- ScrollTrigger dari 2 menjadi 4;
- hero di tengah peralihan inset 1,5 % dengan sudut 7 px, dan di akhir 3 % dengan sudut 14 px;
- angka bergeser dari −18,3 ke +14,7 px;
- penanda terisi 0,5 saat progres 0,5;
- di 700 px efek dibongkar, lalu terpasang lagi di 1280 px;
- 768 px aktif tanpa penanda, karena panggung cerita butuh 1024 px;
- "kurangi gerak" dan sentuh 375 px tanpa efek, overflow 0;
- konsol tanpa error.

Uji ulang Fase 4, 5, 6, dan 7 lulus. Audit beranda: JS 265,2 KB gzip, DOM 337, CLS 0,002. Audit Spesifikasi: DOM 727, CLS 0. Delivery Gate tanpa FAIL (`evidence/delivery-gate-fase8.md`).

Penyimpangan dari rencana:
1. **Kriteria beban diganti atas persetujuan pengguna (2026-11-09).** Rencana meminta LayoutCount dan RecalcStyleCount per langkah tidak naik lebih dari 25 %. Percobaan menunjukkan setiap frame animasi apa pun dihitung satu: di halaman tanpa efek, satu animasi gulir CSS murni menaikkannya dari 0,07 ke sekitar 17 per langkah, dan satu transisi CSS 0,6 detik memakai 88 hitungan. Kriteria barunya: total waktu main thread per langkah naik maksimal 25 % (hasil +14,8 %; run lain −4 sampai +5 %) dan tata letak tidak bertambah (tetap 0). Hitungan gaya tetap dicatat: 7,5 menjadi 12,5 per langkah, tambahan sekitar 3 ms.
2. **Pengukuran menunggu kedua model 3D siap,** lalu memakai median lintasan 2 dan 3. Run awal yang langsung mengukur memberi angka yang berbeda jauh antar-run. Baseline diukur dari build tanpa Fase 8 di folder yang sama, dengan font yang sama.
3. **Efek (c) memakai timeline CaraStory, bukan `gsap.matchMedia`,** karena panggung cerita sudah punya syarat media sendiri (`useStageFits`) dan konteks `useGSAP`.

Belum diuji: kelancaran di laptop pameran (GPU sungguhan).

**Kerjakan:** maksimal tiga efek terkait scroll di luar panggung cerita, masing-masing dengan tujuan tertulis di `DESIGN.md`: (a) peralihan `clip-path` hero ke Masalah; (b) geser horizontal tipis pada angka "60-80 %"; (c) penanda progres tipis di sisi layar untuk panggung cerita. Bungkus semuanya dalam `gsap.matchMedia()` dengan kondisi `(prefers-reduced-motion: no-preference)` dan titik putus; bersihkan lewat konteksnya. Gunakan komponen React Bits yang sudah ada bila cocok.

**Rujukan:** `gsap-core.d.ts:450`; `useGSAP` (`contextSafe`); `.claude/skills/antislop-ui/SKILL.md` bagian Motion.

**Verifikasi:** `ScrollTrigger.getAll().length` terhitung dan tercatat; CDP `Performance.getMetrics` sebelum dan sesudah scroll penuh: `LayoutCount` dan `RecalcStyleCount` per langkah tidak naik lebih dari 25 % dibanding baseline; reduced motion: nol efek aktif.

**Guard:** tidak ada gerak berulang sendiri; tidak ada `will-change` massal; jangan menambah efek di luar daftar tanpa menulis tujuannya.

### Fase 9: aksesibilitas dan mode alternatif diverifikasi nyata (ukuran S)

**Status: selesai 2026-11-09, tanpa temuan yang perlu diperbaiki di kode.** Uji baru `evidence/fase9-a11y.mjs` (hasil `evidence/fase9-a11y-2026-11-09.json`) di beranda dan Spesifikasi, semua lulus:
- `lang="id"` dan title ada;
- semua gambar punya alt, dan kedua iframe punya title (`aria-hidden`, `tabIndex -1`);
- satu h1 tanpa lompatan heading;
- jalur Tab penuh (9 langkah di beranda, 13 di Spesifikasi): setiap fokus terlihat di layar dan punya cincin, tanpa jebakan;
- Shift+Tab berurutan terbalik;
- Enter pada "Lewati ke konten" membawa Tab berikutnya ke `<main>`;
- tombol Menu di 375 px dibuka dengan Enter, ditutup dengan Esc, dan fokus kembali ke tombol;
- target sentuh minimal 24 × 24 px di 375, 768, dan 1280 px, tanpa overflow;
- konsol tanpa error.

Semua emulasi lain dijalankan ulang, dan hasilnya disimpan di `evidence/fase9/`:
- kurangi gerak dan sentuh 375 px (Fase 4, 5, 7, 8);
- tanpa JavaScript dan jaringan lambat (Fase 6 dan 7, serta audit);
- 768 dan 1280 px (Fase 7 dan 8);
- dua audit anggaran (semua baris tabel 3.6 lulus).

Semuanya lulus. Pengukuran ini dilakukan dengan perubahan font Raleway dari sesi fork, yang belum di-commit, ada di folder kerja.

Penyimpangan: dua kegagalan di run pertama berasal dari skrip ujinya, bukan halaman. Pertama, gulir ke elemen terfokus berjalan halus sekitar 0,5 detik, jadi posisinya dibaca terlalu cepat. Kedua, `blur()` tidak mengembalikan titik awal fokus ke awal halaman. Skripnya diperbaiki.

Tidak bisa diuji otomatis (tidak dinyatakan lolos):
- pembaca layar sungguhan (NVDA atau Narrator), termasuk pembacaan teks progres layar muat;
- kelancaran gerak di GPU laptop pameran;
- LCP dan TBT;
- perbesaran teks 200 %;
- perangkat sentuh sungguhan.

**Kerjakan:** jalankan pemeriksaan penuh lewat audit (bagian 3.4, CDP yang sudah terbukti): reduced motion, tanpa JavaScript, jaringan lambat, lebar 375/768/1280, jalur keyboard (Tab, Shift+Tab, Esc, Enter pada tombol), `lang="id"`, urutan fokus, dan teks alternatif gambar/iframe. Perbaiki temuan; catat yang tak bisa diuji otomatis.

**Verifikasi:** semua baris tabel anggaran 3.6 lulus; hasil tiap emulasi dicatat di `docs/superpowers/plans/evidence/`.

**Guard:** jangan menyatakan "lolos" untuk hal yang tak diuji (misalnya kelancaran GPU atau pembaca layar sungguhan).

### Fase 10: R3F dan GLB (ditunda, hanya bila Q2 berubah)

Hanya bila Fase 5 memperlihatkan iframe tak memadai, atau Anda ingin satu bundel tanpa iframe. Langkah ringkas: ekspor scene lewat `GLTFExporter` (ada di Three 0.160), kompres (Draco/KTX2 opsional), muat dengan `@react-three/fiber` 9.8.2 + `@react-three/drei` 10.7.9 (`useGLTF`), dan gerakkan waktu klip dari progres seperti referensi. Syarat: React tetap 19.3.x (`peer <19.4`); anggaran JS 3.6 dihitung ulang; `next/dynamic` dengan `ssr:false` hanya di Client Component. Dokumen terpisah akan dibuat bila fase ini dipilih.

## 6. Fase Akhir: verifikasi dan rilis

**Status 2026-11-09: butir 1 sampai 5 selesai. Butir 6 menunggu pengguna. Butir 7 ditahan karena repo masih publik.**
1. Audit akhir `evidence/akhir-audit-beranda-2026-11-09.json` dan `evidence/akhir-audit-spesifikasi-2026-11-09.json`: semua anggaran 3.6 lulus. Perbandingan dengan baseline:

   | Ukuran | Baseline | Akhir |
   |---|---|---|
   | Transfer saat dimuat | 2.854 KB, 0 dari 29 respons terkompresi | 696,8 KB, 27 dari 32 terkompresi |
   | DOM | 817 node | 337 node |
   | Poster hero | 140,1 KB | 20,5 KB |
   | Font | 183,3 KB | 119,4 KB (Raleway, perubahan sesi fork yang belum di-commit) |
   | JS landing | 257,2 KB gzip | 265,2 KB gzip |
   | CSS | 9,8 KB | 16,7 KB |
   | CLS | 0,002 | 0,002 |

   Landmark `navigation`, Tab pertama ke tautan lewati, kurangi gerak, dan tanpa JavaScript semuanya lulus. `/prototipe/?embed=1` tidak diaudit sebagai halaman tersendiri, karena halaman itu hanya isi iframe. JS-nya diukur di baris "JS iframe 3D", dan DOM-nya ikut dihitung di "DOM node total (semua frame)" pada audit beranda.
2. 52 tes backend lulus. `tsc --noEmit`, `npm run lint`, dan `npm run build` di `landing/` sukses.
3. Grep pola salah:
   - tidak ada `autoRaf` dan tidak ada `ssr: false`;
   - pendengar gulir yang tersisa disengaja dan dibersihkan saat komponen dilepas: `Spin3D` (putaran mode biasa) dan `Magnet` (React Bits);
   - satu `ScrollTrigger.create` di `ScrollReveal` (React Bits), dibersihkan lewat `mm.revert()`.
4. Grep hak cipta: nama referensi hanya ada di dokumen rencana dan lampiran bukti (`probe.mjs`, `shots.mjs`, README, `delivery-gate-fase3.md`). `landing/public` hanya berisi logo Untidar dan dua poster prototipe IrriSense.
5. Delivery Gate per fase tanpa FAIL (`evidence/delivery-gate-fase3.md` sampai `delivery-gate-fase9.md`). Tidak ada UI yang berubah sesudah gate terakhir.
6. **Menunggu pengguna,** uji manual di laptop pameran:
   - kelancaran panggung cerita dan tiga gerak gulir;
   - LCP dan TBT lewat DevTools;
   - mode offline (matikan jaringan setelah halaman dimuat);
   - pembaca layar (NVDA atau Narrator);
   - perbesaran teks 200 %.
7. **Ditahan:** `https://api.github.com/repos/fzlfade/irrisense` masih menjawab 200 tanpa login (publik). Commit lokal Fase 1 sampai Fase Akhir belum di-push.

1. Jalankan `node tools/audit/audit.mjs` untuk `/`, `/spesifikasi/`, `/prototipe/?embed=1`; bandingkan dengan `baseline-2026-11-09.json`; semua anggaran 3.6 lulus.
2. `npm test` di `backend/` (semua lulus) dan `npm run build && npm run lint` di `landing/`.
3. Pemeriksaan pola salah (grep): tidak ada `autoRaf: true` bersama ticker GSAP; tidak ada `window.addEventListener('scroll'` sisa di `landing/components` kecuali yang disengaja; tidak ada `ScrollTrigger.create` tanpa pembersihan; tidak ada `ssr: false` di berkas tanpa `"use client"`.
4. Pemeriksaan hak cipta: `grep -ril "kasane\|urushi\|KASANÉ" landing backend design docs --include=*.{ts,tsx,css,md,html,js} --exclude-dir=node_modules --exclude-dir=out` hanya boleh menemukan dokumen rencana dan lampiran bukti ini; tidak ada aset atau teks mereka di `landing/public`.
5. Delivery Gate antislop untuk seluruh UI yang berubah (`.claude/skills/antislop/SKILL.md:619`).
6. Uji manual di laptop pameran: kelancaran bagian cerita, LCP/TBT (DevTools), mode offline (matikan jaringan setelah dimuat).
7. Commit per fase dan push **setelah** repo privat, dengan izin Anda.

## 7. Pertanyaan terbuka

1. Q1 sampai Q6 (bagian 2): setujui atau ubah default.
2. Apakah booth pameran memakai layar sentuh? (menentukan Q5.)
3. Ada foto atau rekaman asli prototipe untuk hero? Tanpa itu, tidak ada video.
4. Email atau tautan kontak yang boleh dipublikasikan? (Q6; kosong sampai Anda jawab.)
5. Repo GitHub sudah dijadikan privat?

## Lampiran A: ringkasan bukti REA (angka mentah)

- REA `inspect-web-page` atas referensi (Edge 157, observasi 5 detik): 435 node DOM (140 DIV, 33 P, 18 A, 14 IMG, 7 H2, 5 SECTION, 2 VIDEO, 2 H1), pohon aksesibilitas 498 node (heading 9, image 24, link 18, hanya landmark `main`), 30 skrip, 39 sumber daya: Script 22 (1.686 KB), Stylesheet 5 (713 KB), Font 6 (233 KB), Image 4 (117 KB), Media 2.
- Probe CDP atas referensi (scroll 35 langkah, cache dimatikan): tinggi halaman 14.042 px (17,4 layar); `#threeDScrollSection` 8.080 px (10 layar); satu elemen `position: sticky; top: 0` setinggi 808 px; 0 kanvas pada saat diukur; font termuat Playfair Display dan Inter; 2 video autoplay muted loop playsInline preload metadata.
- REA `inspect-web-page` atas IrriSense (sebelum): 3 frame, 817 node DOM, 206 node aksesibilitas, 22 skrip; sumber daya: Script 10 (701 KB), Image 3 (368 KB), Font 2 (95 KB), Stylesheet 4 (16 KB); landmark banner, main, contentinfo, 3 region.
- Ukuran berkas IrriSense (gzip/brotli dihitung dari `landing/out` dan modul iframe): lihat tabel 3.2.

## Lampiran B: skrip penemuan dan cara mengulang

Skrip tersimpan di `docs/superpowers/plans/evidence/` (hanya kode kami, tanpa isi pihak ketiga): `probe.mjs` (jaringan, DOM, scroll bertahap), `emul.mjs` (emulasi reduced motion, tanpa JavaScript, jaringan lambat), `shots.mjs` (tangkapan layar JPEG kecil).

Urutan perintah (PowerShell atau Git Bash, dari folder sementara di luar proyek):
1. Nyalakan Edge: `msedge.exe --headless=new --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --user-data-dir=<folder-sementara> --no-first-run --disable-extensions <URL>`.
2. Ambil `targetId` dari `http://127.0.0.1:9222/json/list` (tipe `page`).
3. `npx -y rea-agents@6.8.0 inspect-web-page http://127.0.0.1:9222 <targetId> --observation-ms 5000 --include-accessibility-text --format json > inspect.json`
4. `node probe.mjs <URL> hasil.json`
5. Matikan Edge (`taskkill //PID <pid> //T //F`) dan hapus folder sementara. Pastikan port 9222 tertutup.

Peringatan dari README REA: jalankan akuisisi paket dari folder tepercaya di luar proyek target. Hanya analisis halaman yang Anda berwenang periksa; situs referensi dianalisis hanya pada sisi publik yang dikirim ke setiap browser.
