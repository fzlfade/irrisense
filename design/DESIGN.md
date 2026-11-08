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
- Landing: **Fraunces** (serif, judul) dan **Instrument Sans** (isi dan label), dimuat lewat `next/font/google`, yang mengunduh saat build dan menyimpannya sebagai file lokal di `out/`, jadi halaman jalan offline saat pameran. Alasan merek: banner memakai serif hangat (Constantia) untuk judul dan sans teknis (Bahnschrift) untuk label; dua font ini membawa pembagian yang sama tanpa bergantung pada font bawaan Windows. Bukan Inter/Geist.

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
- Tautan hanya ke tujuan yang sudah ada: Cara kerja (`/#cara-kerja`), Uji coba (`/prototipe/`), Dashboard (`/dashboard/`). "Spesifikasi" ditambah bila halamannya dibuat.
- Di bawah 48rem daftar dibuka tombol teks "Menu" lewat atribut HTML `popover`: buka, tutup, Esc, dan klik di luar bekerja tanpa JavaScript, dan daftar melayang di atas hero tanpa menggeser tata letak. Satu pendengar klik kecil (`NavMenu.tsx`) menutupnya saat tautan dipilih. Rencana awal memakai `<details>`; `popover` dipilih karena perilaku tutupnya bawaan browser.
- Kontras terukur di atas `--daun-900`: tautan nav #c9c6b4 8,32:1; wordmark dan tombol Menu 12,12:1; tautan lewati (tinta di atas kertas) 12,72:1; hover menu (kertas di atas `--daun-700`) 8,55:1.

## Dial dan Design Read (landing)
Reading this as: landing pameran capstone untuk pengunjung pameran dan dosen penguji, bahasa visual editorial hangat (Fraunces + Instrument Sans, hijau tua + krem, satu aksen vanili), dial ENERGY 3 / RHYTHM 2 / MOTION 3.

Dial: ENERGY 3 / RHYTHM 2 / MOTION 3

- **ENERGY 3:** judul hero sangat besar di pita hijau tua, model 3D selebar layar, dan intro tetes air. Halaman pameran harus menarik orang yang sedang lewat.
- **RHYTHM 2:** section terang dan gelap bergantian dengan beberapa pemecah: angka besar 60–80 % di Masalah, langkah bergaya cerita dengan model yang menempel di Cara kerja, lalu pita target gelap.
- **MOTION 3:** model 3D berputar mengikuti scroll dan kameranya terbang per langkah (pin dan koreografi). Dosisnya dijaga: setiap gerak terkait scroll atau diputar sekali saat masuk, tidak ada loop yang jalan sendiri, dan semuanya mati saat "kurangi gerak".

**Motif identitas: air dan tetes.** Biru air (`--air-600`) hanya muncul untuk air, yaitu intro tetes yang memenuhi layar. Tetesan juga jatuh dari emitter di model 3D. Rentang 60–80 % (kelembapan yang dijaga sistem) menjadi angka terbesar di bagian Masalah dan muncul lagi sebagai ambang pompa di langkah 2 Cara kerja.

## Komponen React Bits yang dipakai (Phase 4)
Sumber salinan: `landing/components/reactbits/` (diambil dari registry resmi, varian TS-CSS, dikecualikan dari lint).

| Komponen | Tempat | Alasan |
|---|---|---|
| `SplitText` | judul hero | Judul masuk sekali saat halaman dibuka, tidak berulang |
| `ScrollReveal` (mode `enter`) | judul section masalah | Kalimat kunci muncul kata demi kata sekali, saat terlihat |
| `CountUp` | tiga target | Angka naik sekali saat terlihat; HTML awal memuat angka akhir |
| `Magnet` | tombol "Lihat cara kerja" | Satu tombol, tarikan kecil (maks 14 px), diabaikan di layar sentuh |

**Model 3D yang berputar mengikuti scroll (landing):** dua gambar prototipe (hero dan cara kerja) diganti `Spin3D`, yaitu iframe ke `/prototipe/?embed=1` yang kameranya diputar 270° sesuai posisi elemen di layar (nilai 0 sampai 1 dikirim lewat `postMessage`, satu asal). Gerak ini punya tujuan (memperlihatkan alat dari semua sisi), tidak berulang sendiri, dan berhenti saat elemen di luar layar. Gambar poster (WebP) tetap dipakai sebagai cadangan: bila `prefers-reduced-motion`, WebGL tidak ada, atau halaman prototipe tidak tersedia.

**Gulir halus (Lenis 1.3.27, `SmoothScroll.tsx`):** dengan tetikus atau touchpad, gulir dihaluskan supaya putaran model 3D dan cerita langkah mengikuti gerak yang mulus, bukan patah-patah tiap putaran roda. Aturannya: tidak dipasang bila "kurangi gerak" atau layar sentuh (gulir bawaan di sana sudah halus); berhenti selama intro diputar; anchor tetap jalan (`anchors: true`); hanya satu loop animasi (ticker GSAP) dan ScrollTrigger ikut disinkronkan. `html { scroll-behavior: smooth }` dipertahankan karena diuji tidak bentrok dengan anchor Lenis (lintasan maju tanpa lompat mundur). Keyboard (PageDown, Spasi, Enter pada tautan) tetap memakai perilaku bawaan.

**Lapisan seret di atas model 3D:** `lenis.css` mematikan pointer di iframe selama gulir halus, dan roda tetikus di atas iframe tidak sampai ke halaman. Karena itu tiap model punya lapisan transparan di halaman induk (`aria-hidden`, kursor grab). Roda di atasnya menggulir halaman; seret mendatar diteruskan ke model lewat `postMessage` (`irri-drag`, `irri-dragend`) dan model mulai kembali menghadap depan 1,5 detik setelah dilepas; gesek vertikal di layar sentuh tetap menggulir (`touch-action: pan-y`).

**Cara kerja bergaya cerita (desktop):** di layar 1024 px ke atas, tiap langkah di bagian Cara kerja mendapat satu "layar" (jarak antarlangkah lebih lebar). Langkah yang pusatnya melewati tengah layar jadi terang, yang lain meredup, dan kamera model 3D yang menempel di sebelahnya terbang ke bagian yang dibahas: sensor di bedeng (1), ESP32 dan relay dengan casing terbuka (2), pompa dan tandon dengan pompa menyala (3), lalu LCD dengan casing menutup lagi (4). Bagian yang dibahas disorot lembut. Nilai posisi dikirim lewat `postMessage` (`irri-story`), bentuk teknik yang sama dengan putaran-saat-scroll di bagian lain. Di bawah 1024 px, atau dengan "kurangi gerak", atau tanpa JavaScript, tampilannya kembali ke daftar biasa dengan gambar atau putaran sederhana.

**Intro "tetes air":** setetes air jatuh, air biru (`--air-600`) memenuhi layar, "IrriSense" muncul, lalu penutup hijau memudar; total sekitar 2,4 detik. Dipilih karena membawa cerita produk (irigasi tetes) tanpa dekorasi kosong. Animasinya murni CSS (kelas `.intro` di `globals.css`) sehingga selesai sendiri bahkan bila JavaScript gagal. Aturannya: diputar **sekali per kunjungan** (`sessionStorage`), bisa dilewati (tombol "Lewati", Esc, atau klik), tidak diputar bila "kurangi gerak" atau tanpa JavaScript, dan halaman sudah ada di HTML sejak awal (intro hanya menutupinya, tidak menunda gambar atau teks). Skrip kecil di `<head>` menentukan putar atau lewati sebelum halaman tergambar agar tidak berkedip, dan animasi huruf judul hero baru dimulai setelah intro selesai.

**Tidak dipakai:** `ScrollStack` (mengambil alih scroll, bayangan tebal dan radius 28 px bertentangan dengan aturan bentuk di atas, dan bentrok dengan gambar sticky). Latar WebGL (`Silk`, `Aurora`, `Galaxy`, dan sejenisnya) tidak dipakai karena halaman tidak punya alasan untuk itu.

**Perubahan pada kode salinan:** `CountUp` menampilkan angka akhir di HTML awal. `SplitText` menyembunyikan teks sampai JavaScript siap, jadi `layout.tsx` memuat `<noscript>` yang menampilkannya kembali.

## Sumber token
`design/tokens.css` adalah satu-satunya sumber. Dashboard memakai salinannya di `backend/public/css/tokens.css`; tes `backend/test/tokens.test.js` gagal bila kedua file berbeda.
