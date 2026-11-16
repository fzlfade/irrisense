# DESIGN.md: IrriSense

Dipakai bersama aturan antislop (core + antislop-ui). Perbarui file ini sebelum mengubah palet atau gaya.

## Tujuan dan audiens
- **Dashboard** (`backend/public/`): operator memantau kelembapan tanah dan mengontrol pompa. Keputusan utama: apakah pompa perlu dinyalakan sekarang.
- **Landing page** (`landing/`): pengunjung pameran, dosen penguji, calon mitra kebun vanili. Tujuan: paham masalah (boros air), solusi (penyiraman tetes otomatis), dan bukti bahwa sistem berjalan.

## Warna
Aturan 60-30-10 dengan tiga inti + satu aksen (R-29).

| Peran | Terang | Gelap | Pemakaian |
|---|---|---|---|
| Latar (60 %) | `kertas` #f3ecd8 | `daun-950` #0f2519 | `--bg` |
| Permukaan | `kertas-50` #fbf8ee | `daun-800` #17382a | `--surface` |
| Teks | `tinta` #1b2a21 | `kertas` #f3ecd8 | `--ink` |
| Hijau (30 %) | `daun-700` #1f4a31 | #8fc79a | aksi utama, status pompa ON (`--green`) |
| **Aksen (10 %)** | `vanili` #b9892b | sama | landing: tombol utama (dan hover tautan di sebelahnya) serta tiga angka target di pita gelap. `--accent` |
| Data air | #1f6f9c | #6fb7e0 | garis kelembapan udara, ambang OFF (`--blue`) |
| Ambang / peringatan | #8a6414 | #d9a441 | garis ambang ON, suhu (`--amber`) |
| Galat | #a93226 | #f08a7a | node offline, FAULT (`--red`) |

Aturan:
- Warna status (hijau/kuning/merah) hanya menandai keadaan nyata, bukan dekorasi.
- `--accent` tidak dipakai untuk teks kecil atau garis grafik (kontras 2,96:1 di atas permukaan terang). Untuk itu pakai `--amber`.
- Tidak ada gradien biru-ungu, tidak ada glow, tidak ada latar orb.
- Nama variabel lama (`--green`, `--blue`, `--amber`, `--red`, `--muted`, `--line`, ...) tetap dipertahankan karena `backend/public/js/app.js` membacanya untuk warna grafik.

## Tema
**Terang adalah bawaan** untuk dashboard dan landing, apa pun pengaturan sistem pengunjung. Nilai mode gelap tetap disimpan di `design/tokens.css` dan aktif hanya bila `<html data-theme="dark">` dipasang. Belum ada tombol pengalih; tambahkan bila diperlukan.

## Kontras terukur (WCAG, dihitung langsung)
Terang: ink/bg 12,7; muted/surface 5,8; green/surface 9,5; teks putih di green 10,1; red/red-soft 5,1; blue/surface 5,2; amber/surface 5,1.
Gelap: ink/surface 10,9; muted/surface 6,2; green/surface 6,6; red/red-soft 5,5; blue/surface 5,8; amber/surface 5,7.
Semua melewati 4,5:1 untuk teks dan 3:1 untuk garis grafik. Tombol aktif (`.seg button.on`) memakai `--on-green` karena teks putih di atas hijau muda mode gelap gagal kontras.

## Tipografi
- Dashboard: tetap font sistem (`system-ui`), karena padat data dan tanpa unduhan font.
- Landing: **Raleway**, satu keluarga untuk judul dan isi (variabel, sumbu bobot), dimuat lewat `next/font/google`, yang mengunduh saat build dan menyimpannya sebagai file lokal di `out/`, jadi halaman jalan offline saat pameran. Sebelumnya Fraunces (serif, judul) dan Instrument Sans (isi); diganti atas permintaan tim. Satu keluarga berarti perbedaan judul dan isi hanya lewat bobot dan ukuran: judul, tombol, dan label 600, isi 500. Paling tebal 600 dan tinggi baris judul minimal 1,1 (skill typography VectorLab, 2026-11-11; sebelumnya judul 700 dengan tinggi baris 0,95). Bukan Inter/Geist.
  - **Angka.** Raleway memakai angka gaya lama (naik-turun) secara bawaan. Halaman ini penuh angka (60–80 %, target, tabel), jadi `body` memakai `font-variant-numeric: lining-nums` (diuji: lebar angka berubah, berarti fiturnya ada). Fitur `tabular-nums` tidak ada di Raleway ini (lebar "1111" dan "0000" tetap beda), jadi kolom angka yang harus sejajar (GPIO, label pin, topik) memakai monospace.
  - **Bobot isi 500, bukan 400.** Raleway 400 tipis di ukuran kecil (keterangan 0,85 rem berwarna `--muted`).
  - **Lebar judul dalam em, bukan ch.** Satuan `ch` mengikuti lebar angka "0", yang di Raleway lebar, sehingga judul Cara kerja sempat pecah jadi tiga baris. `.h2` dan `.h2Light` memakai `max-width: 15em`.
  - Dashboard tetap font sistem.
  - Kode (halaman Spesifikasi) tetap monospace bawaan sistem.

Skala judul landing memakai token fluid di `design/tokens.css` (dipakai di `landing/components/sections.module.css`). Judul dibuat besar supaya tiap layar punya satu titik fokus yang terbaca dari jarak meja pameran; teks isi tetap 1 rem.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--step-hero` | `clamp(3.5rem, 15vw, 10rem)` | judul hero "IrriSense" |
| `--step-section` | `clamp(2.25rem, 4.6vw, 4.25rem)` | judul section (`.h2`, `.h2Light`) dan kalimat kunci bagian Masalah |
| `--step-figure` | `clamp(2.75rem, 6.5vw, 5rem)` | tiga angka target |
| `--step-lead` | `clamp(1.15rem, 2.4vw, 1.5rem)` | paragraf pembuka hero |

Judul Cara kerja berdiri di atas grid langkah (bukan di kolom kiri yang sempit) agar tetap dua baris di 1280 px.

## Bentuk
- Radius: 14 px (kartu dan panel), 10 px (kontrol). Pil penuh hanya untuk indikator status node.
- Bayangan: tidak dipakai. Pemisah memakai garis `--line`.

## Status kontrol (landing)
- Kursor tangan untuk `a[href]`, `button`, dan `summary` diatur sekali di `landing/app/globals.css`; tombol nonaktif memakai `not-allowed`.
- Hover tidak hanya mengganti warna: tautan teks menebalkan garis bawah (2 px), tombol isi menambah garis bawah, tombol garis tepi mendapat isi `--daun-700` dan tepi penuh.
- Tekan: kontrol turun 1 px (`translateY`), tanpa transisi, jadi tetap aman untuk "kurangi gerak".
- Fokus: garis 2 px (`--blue` di latar terang, `--kertas-100` di header gelap), jarak 3 px.

## Navigasi (landing)
- Header berupa pita `--daun-900` yang menyambung dengan hero. Header tidak menempel (static), jadi anchor tidak pernah tertutup dan `scroll-margin-top` tidak diperlukan.
- Fokus pertama: tautan "Lewati ke konten" ke `<main id="konten">`, tersembunyi sampai difokus.
- Tautan hanya ke tujuan yang sudah ada, berurutan dari cerita ke detail lalu ke alat yang bisa dicoba: Cara kerja (`/#cara-kerja`), Spesifikasi (`/spesifikasi/`), Uji coba (`/prototipe/`), Dashboard (`/dashboard/`). Tautan halaman yang sedang dibuka diberi `aria-current="page"` dan garis bawah tetap, jadi tidak hanya ditandai warna.
- Di bawah 48rem daftar dibuka tombol teks "Menu" lewat atribut HTML `popover`: buka, tutup, Esc, dan klik di luar bekerja tanpa JavaScript, dan daftar melayang di atas hero tanpa menggeser tata letak. Satu pendengar klik kecil (`NavMenu.tsx`) menutupnya saat tautan dipilih. Rencana awal memakai `<details>`; `popover` dipilih karena perilaku tutupnya bawaan browser.
- Kontras terukur di atas `--daun-900`: tautan nav #c9c6b4 8,32:1; wordmark dan tombol Menu 12,12:1; tautan lewati (tinta di atas kertas) 12,72:1; hover menu (kertas di atas `--daun-700`) 8,55:1.

## Dial dan Design Read (landing)
Reading this as: landing pameran capstone untuk pengunjung pameran dan dosen penguji, bahasa visual editorial hangat (Raleway satu keluarga, hijau tua + krem, satu aksen vanili), dial ENERGY 3 / RHYTHM 2 / MOTION 3.

Dial: ENERGY 3 / RHYTHM 2 / MOTION 3

- **ENERGY 3:** judul hero sangat besar di pita hijau tua, model 3D selebar layar, dan layar muat tetes air. Halaman pameran harus menarik orang yang sedang lewat.
- **RHYTHM 2:** section terang dan gelap bergantian dengan beberapa pemecah: angka besar 60–80 % di Masalah, langkah bergaya cerita dengan model yang menempel di Cara kerja, lalu pita target gelap.
- **MOTION 3:** model 3D berputar mengikuti scroll, dan di Cara kerja model dirakit sambil kameranya terbang per langkah (panggung menempel dan koreografi). Dosisnya dijaga: setiap gerak terkait scroll atau diputar sekali saat masuk, tidak ada loop yang jalan sendiri, dan semuanya mati saat "kurangi gerak".

**Motif identitas: air dan tetes.** Biru air (`--air-600`) hanya muncul untuk air, yaitu air di layar muat yang naik mengikuti progres muat. Tetesan juga jatuh dari emitter di model 3D. Rentang 60–80 % (kelembapan yang dijaga sistem) menjadi angka terbesar di bagian Masalah dan muncul lagi sebagai ambang pompa di langkah 2 Cara kerja.

## Komponen React Bits yang dipakai (Phase 4)
Sumber salinan: `landing/components/reactbits/` (diambil dari registry resmi, varian TS-CSS, dikecualikan dari lint).

| Komponen | Tempat | Alasan |
|---|---|---|
| `SplitText` | judul hero | Judul masuk sekali saat halaman dibuka, tidak berulang; 0,3 detik per huruf, jeda 25 ms (total jeda 200 ms) |
| `ScrollReveal` (mode `enter`) | judul section masalah | Kalimat kunci muncul kata demi kata sekali, saat terlihat; 0,3 detik per kata, jeda 30 ms |
| `Magnet` | tombol "Lihat cara kerja" | Satu tombol, tarikan kecil (maks 14 px), diabaikan di layar sentuh; redaman kritis (27) supaya kembali tanpa memantul |

**Model 3D yang berputar mengikuti scroll (landing):** dua gambar prototipe (hero dan cara kerja) diganti `Spin3D`, yaitu iframe ke `/prototipe/?embed=1` yang kameranya diputar 270° sesuai posisi elemen di layar (nilai 0 sampai 1 dikirim lewat `postMessage`, satu asal). Gerak ini punya tujuan (memperlihatkan alat dari semua sisi), tidak berulang sendiri, dan berhenti saat elemen di luar layar. Gambar poster (WebP) tetap dipakai sebagai cadangan: bila `prefers-reduced-motion`, WebGL tidak ada, atau halaman prototipe tidak tersedia.

**Gulir halus (Lenis 1.3.27, `SmoothScroll.tsx`):** dengan tetikus atau touchpad, gulir dihaluskan supaya putaran model 3D dan cerita langkah mengikuti gerak yang mulus, bukan patah-patah tiap putaran roda. Aturannya: tidak dipasang bila "kurangi gerak" atau layar sentuh (gulir bawaan di sana sudah halus); berhenti selama intro diputar; anchor tetap jalan (`anchors: true`); hanya satu loop animasi (ticker GSAP) dan ScrollTrigger ikut disinkronkan. `html { scroll-behavior: smooth }` dipertahankan karena diuji tidak bentrok dengan anchor Lenis (lintasan maju tanpa lompat mundur). Keyboard (PageDown, Spasi, Enter pada tautan) tetap memakai perilaku bawaan.

**Lapisan seret di atas model 3D:** `lenis.css` mematikan pointer di iframe selama gulir halus, dan roda tetikus di atas iframe tidak sampai ke halaman. Karena itu tiap model punya lapisan transparan di halaman induk (`aria-hidden`, kursor grab). Roda di atasnya menggulir halaman; seret mendatar diteruskan ke model lewat `postMessage` (`irri-drag`, `irri-dragend`) dan model mulai kembali menghadap depan 1,5 detik setelah dilepas; gesek vertikal di layar sentuh tetap menggulir (`touch-action: pan-y`).

**Panggung cerita Cara kerja (desktop):** di layar minimal 1024 × 576 px tanpa "kurangi gerak", bagian Cara kerja menjadi pembungkus setinggi 450vh dengan panggung satu layar yang menempel (`position: sticky`): daftar empat langkah di kiri, model 3D di kanan (`CaraStory.tsx`). Satu ScrollTrigger mengubah posisi gulir di pembungkus itu menjadi progres 0 sampai 1, dan progres yang sama menggerakkan tiga hal:
- **Perakitan model.** Bagian model turun lurus dari atas ke tempatnya dan mendarat tepat saat kamera tiba di langkah yang membahasnya. Kelompoknya mengikuti langkah: bedeng, tanaman, dan enam sensor (langkah 1); casing, ESP32, relay, kabel duct, dan kabel sensor (langkah 2); tandon, pompa, selang, emitter, dan adaptor (langkah 3); tutup ber-LCD dan DHT11 (langkah 4). Kelompok langkah 2 sampai 4 baru muncul saat gilirannya, supaya tidak melayang di depan kamera atau membuat bayangan lebih dulu. Tujuannya memperlihatkan bahwa alat ini tersusun dari komponen yang disebut di teks, satu kelompok per langkah.
- **Kamera.** Kamera mulai dari pandangan papan dasar dengan bedeng dan sensor yang masih melayang, lalu berhenti di tiap langkah pada progres 0,15 / 0,40 / 0,65 / 0,90 (diam ±0,05 di sekitar tiap titik): sensor di bedeng, ESP32 dan relay di casing yang belum bertutup, pompa dan tandon dengan pompa menyala, lalu model utuh dengan LCD dan DHT11 disorot.
- **Daftar langkah.** Langkah yang sedang dibahas memakai warna tinta penuh dan bergeser 0,75 rem ke kanan; langkah lain diredupkan dengan opacity 0,7, yang tetap 5,5:1 di atas `--surface` (diukur di `fase5-story.mjs`). Sejak 2026-11-11 yang dianimasikan opacity, bukan warna (skill motion VectorLab: hanya transform dan opacity); versi sebelumnya mencampur warna ke `--muted`, dan versi pertama memakai opacity 0,4 yang kontrasnya hanya sekitar 2,4:1. Peralihannya mengikuti gulir (timeline GSAP dengan `scrub`), bersamaan dengan kamera terbang.

Di bawah 1280 px kedua kolom dibuat sama lebar agar keempat langkah tetap muat dalam satu layar (diuji sampai 1024 × 576). Tidak ada gerak yang jalan sendiri: semuanya mengikuti gulir, dan tetesan air di langkah 3 berhenti 5 detik setelah pompa menyala. Di bawah 1024 × 576 px, dengan "kurangi gerak", atau tanpa JavaScript, tampilannya kembali ke daftar biasa dengan gambar atau putaran sederhana. Progres dikirim ke model lewat `postMessage` (`irri-progress`). Titik langkah (`WAYPOINTS`) ditulis di `landing/lib/storyProgress.ts` dan `backend/prototipe/scene.js`; tes `backend/test/story.test.js` gagal bila keduanya berbeda.

**Dua gerak gulir tambahan (`ScrollMotion.tsx` dan `CaraStory.tsx`):** keduanya mengikuti gulir dan tidak ada yang jalan sendiri. Hanya `transform` yang diubah, jadi tata letak tidak dihitung ulang. Gerak angka dipasang lewat `gsap.matchMedia()` dengan syarat lebar minimal 48rem dan tanpa "kurangi gerak", sehingga dibongkar otomatis bila syarat itu tidak lagi terpenuhi. Penanda progres hanya ada di panggung cerita (minimal 1024 × 576).
- **Hero ke Masalah: dihapus 2026-11-11.** Pita hero dulu menyempit 3 % dan membulat lewat `clip-path` saat ditinggalkan. Skill motion VectorLab hanya membolehkan transform dan opacity, jadi efek ini dibuang.
- **Angka 60–80 % (`transform`).** Angka bergeser mendatar paling jauh 2vw ke kiri dan ke kanan selama bagian Masalah lewat (paralaks tipis). Tujuannya memisahkan angka kunci dari kalimat di sebelahnya dan menarik mata ke angka itu lebih dulu. Gerak ini tidak dipasang di ponsel, karena angka besar itu hampir selebar layar.
- **Penanda progres panggung cerita.** Garis tegak 2 px di sisi kiri layar terisi hijau (`--green`) mengikuti progres panggung, dengan empat tanda di titik langkah (`WAYPOINTS`). Tujuannya menjawab "masih berapa lama bagian ini": panggung setinggi 4,5 layar, dan tanpa penanda pengunjung tidak tahu sedang di langkah mana dan kapan bagian ini selesai. Penanda ini disembunyikan dari pembaca layar (`aria-hidden`), karena daftar langkah sudah memuat isinya.
- **Beban gulir** diukur sebelum dan sesudah lewat CDP `Performance.getMetrics`. Syaratnya dua: total waktu kerja main thread per langkah gulir tidak boleh naik lebih dari 25 %, dan tata letak tidak boleh bertambah. Hasilnya: waktu naik 14,8 %, dan tata letak tetap 0. Setelah efek hero dibuang (2026-11-11), waktu main thread 0,74 kali baseline.
  - Jumlah hitungan gaya (RecalcStyleCount) hanya dicatat, tidak dinilai. Setiap frame animasi apa pun dihitung satu kali, baik animasi gulir CSS murni maupun satu transisi 0,6 detik (88 hitungan). Jadi angka itu mengukur lama beranimasi, bukan beratnya.
  - Tambahan waktu hitung gaya sekitar 3 ms per langkah gulir 300 px.

**Layar muat "tetes air" (berbasis progres, `Intro.tsx`):** saat halaman pertama dibuka, penutup hijau tua menutupinya. Setetes air jatuh sekali (motif identitas), lalu air biru (`--air-600`) naik mengikuti progres muat sungguhan dari tiga hal yang dibutuhkan tampilan pertama: huruf (40 %), poster hero (10 %), dan model 3D hero (50 %). Bobotnya kira-kira sebanding ukuran unduhan (huruf sekitar 183 KB, poster 20 KB, JavaScript model 3D sekitar 184 KB gzip) dan dibulatkan ke puluhan, jadi teks "Memuat halaman 50 %" hanya berubah saat satu bagian selesai, paling banyak tiga kali. Tujuannya: pengunjung melihat halaman sedang menyiapkan model 3D, dan saat penutup terbuka, hero langsung menampilkan model yang siap, bukan poster yang lalu berganti.
- **Batas waktu.** Penutup paling cepat mulai memudar 1,2 detik setelah tergambar (agar tidak berkedip) dan selalu hilang paling lambat 3,5 detik. Batas atasnya murni CSS: animasi `intro-fade` memudarkan penutup di detik 3,0 sampai 3,4, jadi tetap jalan bila JavaScript gagal. JavaScript hanya mempercepat: bila ketiga bagian sudah dimuat, animasi itu dilompatkan ke awal pudarnya. Bila model belum siap di detik 3,0, penutup tetap memudar dan hero menampilkan poster sampai model siap.
- **Ketepatan waktu.** Saat halaman sibuk, jam animasi bisa mulai 14 sampai 111 ms setelah penutup tergambar, jadi JavaScript menyamakan jam itu dengan `first-paint`; sisa 0,1 detik sampai 3,5 detik menutup selisih itu bila JavaScript gagal. Pudarnya hanya mengubah opacity supaya dijalankan compositor dan tetap tepat walau main thread sibuk menyiapkan model 3D (dibuktikan lewat trace browser). `visibility` dipisah ke animasi `intro-hide`, karena properti itu memaksa animasi ke main thread; di uji pertama, gabungan keduanya membuat pudar terlambat sekitar 0,18 detik.
- **Bila JavaScript terlambat atau gagal.** Saat pudar CSS selesai, skrip kecil di `<head>` menutup intro sendiri, jadi halaman langsung bisa digulir (sebelumnya terkunci sampai JavaScript jalan), dan judul hero biasa tampil sendiri di detik 3,4 (sebelumnya tetap tersembunyi).
- **Model Cara kerja** tetap dimuat selama penutup tampil. Menundanya sampai penutup hilang sudah diuji: model hero tidak jadi lebih cepat, dan kerja beratnya malah jatuh tepat saat judul hero beranimasi.
- **Air** naik lewat `transform: scaleY()` dengan peralihan 0,6 detik, bukan `height`, jadi tidak memicu tata letak ulang.
- **Kata "IrriSense"** baru muncul saat hurufnya siap, supaya tidak berganti dari huruf cadangan di depan mata. Di atas air biru kontrasnya 3,1:1; cukup karena hurufnya besar (minimal 48 px) dan hanya hiasan (`aria-hidden`); judul halaman yang sebenarnya ada di hero.
- **Teks progres dan tombol "Lewati"** ada di baris atas yang tidak terendam air, karena teks kecil di atas `--air-600` hanya 3,1:1, sedangkan di atas hijau tua 12,1:1. Teksnya `role="status"`, jadi pembaca layar membacakannya tanpa memotong. Cincin fokus tombol "Lewati" berwarna krem (12,1:1), bukan `--blue` yang hanya 2,6:1 di atas hijau tua.
- **Aturan lama tetap:** diputar **sekali per kunjungan** (`sessionStorage`), bisa dilewati (tombol "Lewati", Esc, atau klik), tidak diputar bila "kurangi gerak" atau tanpa JavaScript, dan halaman sudah ada di HTML sejak awal (penutup hanya menutupinya). Skrip kecil di `<head>` menentukan putar atau lewati sebelum halaman tergambar agar tidak berkedip, gulir halus berhenti selama penutup tampil, dan animasi huruf judul hero baru dimulai setelah penutup hilang. Selama penutup tampil, isi halaman di belakangnya diberi `inert` (audit UX 2026-11-11), jadi Tab tidak pindah ke tautan yang tertutup penutup; `inert` dilepas saat penutup hilang atau dilewati.

**Tidak dipakai:** `ScrollStack` (mengambil alih scroll, bayangan tebal dan radius 28 px bertentangan dengan aturan bentuk di atas, dan bentrok dengan gambar sticky). Latar WebGL (`Silk`, `Aurora`, `Galaxy`, dan sejenisnya) tidak dipakai karena halaman tidak punya alasan untuk itu.

**Perubahan pada kode salinan:** `CountUp` dihapus 2026-11-11; tiga target kini angka statis, karena menghitung naik mengubah teks, bukan transform atau opacity, dan tidak muat dalam batas 300 ms. `SplitText` menyembunyikan teks sampai JavaScript siap, jadi `layout.tsx` memuat `<noscript>` yang menampilkannya kembali.

## Penerapan skill VectorLab (2026-11-11)
- **Beranda:** tipe rute marketing Home. CTA hero diulang di akhir bagian Target ("Buka dashboard" dan "Baca spesifikasi").
- **Spasi:** padding dan margin kontrol memakai kelipatan 4 px (0,25 / 0,5 / 0,75 rem). Lebar teks isi paling banyak 70ch.
- **Gerak:** durasi animasi yang berjalan sendiri paling lama 300 ms dengan easing keluar. Gerak yang mengikuti gulir (`scrub`) tidak punya durasi, jadi batas itu tidak berlaku untuknya.
- **Pengecualian yang masih terbuka:** layar muat intro menutup seluruh halaman, padahal skill loaders melarang layar muat satu halaman penuh. Layar ini disetujui sebagai bagian dari rencana (Fase 6), jadi menunggu keputusan tim: dibuang, atau dipertahankan sebagai pengecualian tercatat. Durasi intro (air 0,6 detik, tetesan 0,7 detik) ikut keputusan itu.

## Retheme Storytelling-Driven (2026-11-15)
Di data skill ui-ux-pro-max, "Storytelling-Driven" adalah pola halaman (pembuka, bab masalah, bab perjalanan, bab solusi, CTA penutup), bukan gaya visual, jadi palet dan huruf tidak berganti.
- **Nomor bab** sebagai teks biasa `--muted` (di pita gelap `--ink-on-dark-muted`): "Bab 1 · Masalah", "Bab 2 · Cara kerja", "Bab 3 · Target". Tanpa pil atau titik; isinya urutan cerita, yang tidak tertulis di judul.
- **CTA kecil per bab:** bab Masalah ditutup tautan "Lihat cara kerjanya"; bab Cara kerja sudah punya tautan prototipe 3D; bab Target memuat CTA penutup.
- **Token baru** di `tokens.css`: `--accent-hover`, `--ink-on-dark-muted`, `--line-on-dark`, `--dur-1..4`, `--ease-out`, `--ease-in`, `--section-pad`. CSS landing tidak lagi memuat warna hex langsung.

## Halaman Spesifikasi (`/spesifikasi/`)
Reading this as: halaman rujukan untuk dosen penguji dan pengunjung yang ingin tahu detail teknis, bukan halaman promosi. Pola halaman: detail atau rujukan (tipe rute marketing di skill page-patterns: Case study). Dial lokal ENERGY 2 / RHYTHM 1 / MOTION 1: tenang dan mudah dipindai, tanpa animasi. Tujuannya membuktikan alat ini dirancang dengan angka yang jelas dan bisa dicek.

- **Isi hanya dari repo.** Setiap bagian menulis sumbernya di baris "Sumber" kecil, supaya penguji bisa mencocokkan sendiri:
  - aturan pompa, interval, buffer, pin, dan topik MQTT dari `firmware/src/config.h`, `controller.cpp`, `main.cpp`, dan `display.cpp`;
  - label pin di board dari `docs/hardware/perkabelan.md`;
  - daftar komponen dari `items` di `backend/prototipe/scene.js`, dengan nomor yang sama dengan penanda di prototipe 3D;
  - API dari `backend/src/app.js` dan `stats.js`;
  - mode firmware dari `firmware/platformio.ini`.
- **Satu sumber data dan tes anti-melenceng.** Datanya ada di `landing/content/spesifikasi.ts`. Tes `backend/test/content.test.js` gagal bila data itu berbeda dengan sumbernya. Angka di teks halaman diambil dari data itu, bukan diketik ulang.
- **Tata letak.** Pita judul hijau tua menyambung dari header dan berisi h1 (`--step-section`), ringkasan, dan daftar isi berupa tautan anchor. Isi halaman di latar terang `--bg`, dengan tiap bagian dipisah garis tipis `--line`. Di layar minimal 64rem, judul bagian dan penjelasan ada di kolom kiri dan tabel di kolom kanan; di bawahnya satu kolom.
- **Tabel.** Paling banyak tiga kolom, dan teks boleh turun baris, jadi tidak ada gulir mendatar (diuji di 320, 375, 768, dan 1280 px). Kolom pertama memakai `th scope="row"` dan angka memakai `tabular-nums`. Nilai yang harus diketik persis (GPIO, topik, alamat API, nama env) memakai huruf monospace bawaan sistem, tanpa unduhan font baru. Tabel dan daftar aturan memakai bidang L1 (audit UX 2026-11-11): latar `--surface` satu tingkat di atas `--bg`, garis tepi `--line`, dan radius 14 px, supaya terbaca sebagai satu blok data, bukan teks lepas di atas halaman.
  - Kode dipotong dengan `overflow-wrap: break-word`, bukan `anywhere`. Dengan `anywhere`, tabel menganggap kode boleh dipotong per huruf, sehingga kolomnya menyempit dan "esp32dev_cal" pecah di tengah.
  - Topik MQTT boleh turun baris setelah tiap garis miring (`<wbr>`), supaya di ponsel kolom "Isi" tidak tinggal 105 px.
  - Alamat API dan parameternya tidak dipecah (`nowrap`), supaya "?" tidak tertinggal sendirian di satu baris.
- **Kontras.** Teks isi `--ink` di atas `--bg` 12,7:1, teks redup `--muted` 5,2:1. Di pita judul, krem 12,1:1 dan #c9c6b4 8,3:1. Cincin fokus di pita judul berwarna krem, karena `--blue` hanya 2,6:1 di atas hijau tua.
- **Tanpa gerak dan tanpa layar muat.** Skrip `<head>` dan `Intro` hanya memutar layar muat di beranda, jadi halaman ini langsung tampil. Footer tim dipindah ke layout dan tampil di semua halaman.
- **Tidak dibuat:** bagian kontak (Q6), gambar stok, angka tanpa sumber, dan salinan bagian beranda.

## Sumber token
`design/tokens.css` adalah satu-satunya sumber. Dashboard memakai salinannya di `backend/public/css/tokens.css`; tes `backend/test/tokens.test.js` gagal bila kedua file berbeda.
