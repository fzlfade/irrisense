# Delivery Gate antislop: Fase 3 (2026-11-09)

Mode antislop: during (session override). Yang diuji: landing `http://localhost:3000/` dari build `landing/out` terbaru, dilayani backend lokal. Bukti angka: `fase3-2026-11-09.json` (audit, semua anggaran lulus, kode keluar 0). Tes backend: 42 lulus.

## Temuan yang diperbaiki sebelum laporan ini ditulis

1. **R-39, status kontrol.** Tautan "Coba prototipe 3D", wordmark, dan tombol "Lewati" intro belum punya status hover. Belum ada satu pun status tekan, dan kursor tangan belum diatur di lapisan dasar. Sekarang kursor diatur sekali di `landing/app/globals.css`. Hover menambah garis bawah atau isi latar, bukan hanya warna, dan tekan menurunkan kontrol 1 px.
2. **R-03, target sentuh.** Tombol "Lewati" intro tingginya sekitar 36 px. Sekarang minimal 44 px.
3. **R-39, gerak lebih dari 5 detik.** Di langkah 3 Cara kerja, tetesan air dan getar pompa di model 3D bergerak terus selama langkah itu terbuka. Sekarang di mode embed geraknya berhenti 5 detik setelah pompa menyala (`backend/prototipe/scene.js`, `flowStill`). Diuji: setelah 1,5 detik masih bergerak, setelah 6,5 detik diam, dan kembali ke langkah 1 mematikan pompa. Halaman penuh `/prototipe/` tetap bergerak seperti semula.

## Blok 1: Hard Gate (semua jawaban harus "tidak")

- R-02 PASS: `grep "—"` di `landing/app` dan `landing/components` (salinan React Bits tidak ikut) kosong.
- R-03 PASS: lebar 375, 768, dan 1280 tanpa overflow mendatar. Tombol Menu 77×45 px, tautan menu setinggi 53 px, tombol Lewati intro minimal 44 px.
- R-17 PASS: angka di halaman bersumber dari rancangan proyek (`docs/superpowers/plans/2026-11-03-irrisense-iot-system.md` baris 18-20 dan 28: ambang 60/80 %, akurasi ±5 %, hemat air 30 %, "<2 detik" dari Intisari). Halaman menyebutnya target, belum hasil pengukuran.
- R-18 PASS: tidak ada testimoni.
- R-23 PASS: struktur navigasi (tiga tautan dan tautan lewati) tertulis di rencana Fase 3 yang disetujui ("Lanjut fase 3"). Tidak ada aset baru.
- R-24 PASS: `/`, `/#cara-kerja`, `/prototipe/`, dan `/dashboard/` semuanya menjawab 200. `id="cara-kerja"` dan `id="konten"` masing-masing ada satu kali di `out/index.html`.
- R-25 PASS, dihitung dengan rumus WCAG: tautan nav 8,32:1; wordmark dan Menu 12,12:1; tautan lewati 12,72:1; hover menu 8,55:1; hover tautan "Buka dashboard" (vanili di `--daun-900`) 4,55:1; hover "Coba prototipe 3D" (tinta di `--surface`) 14,12:1; teks CTA saat hover 5,83:1.
- R-26 PASS: ada 9 kontrol. Semuanya `a[href]` ke tujuan nyata atau `button` yang berfungsi (Menu membuka popover, Lewati menutup intro).
- R-27 PASS: halaman statis. Model 3D menampilkan poster sampai `irri-ready`, dan poster tetap tampil bila WebGL atau halaman prototipe gagal.
- R-28 PASS: tidak ada FAQ.
- R-32 PASS: Tab pertama memfokus "Lewati ke konten" dan terlihat (audit). Esc menutup menu dan fokus kembali ke tombol Menu. Cincin fokus 2 px, 12,12:1 di header.
- R-33 PASS: semua perubahan ditulis langsung di sumber. `sync:tokens` hanya menyalin berkas token sumber ke dua pemakainya (alur lama), tidak menambal fitur.
- R-34 PASS: tidak ada pengalih tema; hanya mode terang.
- R-35 PASS: `npm run lint` dan `npm run build` sukses. Semua kontrol diklik: tiga tautan nav, "Lihat cara kerja" ke `#cara-kerja`, "Buka dashboard", "Coba prototipe 3D", Menu buka dan tutup, ketuk tautan menu menutup daftar lalu menggulir. Hover "Coba prototipe 3D" diperiksa (`:hover` aktif, warna tinta, garis bawah 2 px). Konsol tanpa error.
- R-36 PASS: tidak ada klaim keamanan, kinerja, atau pelanggan. LCP dan TBT ditulis "belum diukur".
- R-37 PASS: arah sudah tertulis di `design/DESIGN.md` dan rencana sebelum Fase 3; dial kini tercatat di DESIGN.md.
- R-38 PASS: nama tim dan dosen pembimbing berasal dari dokumen proyek. Tidak ada isi karangan.
- R-39 PASS setelah perbaikan 1 dan 3: kursor tangan di 9 dari 9 kontrol; hover dan tekan berbeda dan tidak hanya lewat warna; `lang="id"`, `<title>` unik, landmark banner, navigation, main, contentinfo; satu `h1`, urutan h1, h2, h3 tanpa lompatan; viewport tanpa `user-scalable=no`; "kurangi gerak" mematikan intro dan iframe (audit); tidak ada gerak otomatis lebih dari 5 detik.
- R-40 PASS: poster hero berupa `<img>` di HTML dengan `fetchPriority="high"` dan `loading="eager"` (WebP 20,5 KB). Iframe dan poster berada di wadah ber-`aspect-ratio`. CLS 0,002 (diukur). Tidak ada skrip pihak ketiga di `<head>`. LCP dan TBT belum diukur karena Edge headless memakai WebGL perangkat lunak.

## Blok 2: Purpose-Gate (teknik boleh, alasan wajib)

- R-01 PASS: tidak ada gradien atau glow (`grep gradient|box-shadow|backdrop-filter` kosong).
- R-04 PASS: tidak ada ikon; tidak ada `<svg>` di komponen.
- R-06 PASS: tidak ada monospace besar atau label kapital berjarak lebar. Jarak huruf hanya rapat kecil pada judul serif. Alasan font tertulis di DESIGN.md bagian Tipografi.
- R-07 PASS: tidak ada pola grid atau titik di latar.
- R-08 PASS: tidak ada panah di tombol.
- R-09 PASS: tidak ada badge.
- R-10 PASS: tidak ada glassmorphism.
- R-12 PASS: tidak ada bayangan (aturan Bentuk di DESIGN.md).
- R-13 PASS: tidak ada glow.
- R-14 PASS: tidak ada kartu fitur. Empat langkah berupa daftar bernomor dengan isi berbeda.
- R-19 PASS: setiap gerak punya tujuan tertulis di DESIGN.md (intro tetes, judul hero, kalimat kunci, angka target, putaran 3D, cerita langkah, Magnet) dan cocok dengan dial MOTION 3. Tidak ada loop yang berjalan sendiri.
- R-22 PASS: tidak ada ilustrasi generik. Gambar berasal dari model 3D prototipe sendiri.

## Blok 3: Liveliness (semua jawaban harus "ya")

- Dial tertulis: YA. ENERGY 3 / RHYTHM 2 / MOTION 3 di DESIGN.md.
- Sesuai dial: YA. ENERGY 3: judul hero sampai 10 rem di pita hijau penuh, model 3D selebar layar, intro tetes. RHYTHM 2: terang dan gelap bergantian dengan pemecah (angka besar, cerita langkah, pita target). MOTION 3: model menempel dan kamera bergerak mengikuti scroll.
- Satu titik fokus per layar: YA. Hero: judul IrriSense. Masalah: angka 60–80 %. Cara kerja: model 3D dan langkah aktif. Target: tiga angka vanili. Tim: judul tim.
- Ruang kosong struktural: YA. Jarak section fluid (`clamp(3rem, 8vw, 6rem)`); judul Cara kerja dipisah dari grid lewat `.caraHead`.
- Satu aksen: YA. Vanili hanya di tombol utama (dan hover tautan di sebelahnya) serta tiga angka target.
- Motif identitas: YA. Air dan tetes: intro tetes, tetesan di emitter model 3D, dan rentang 60–80 %.
- Design Read dideklarasikan: YA, dengan catatan proses. Arah sudah ada di DESIGN.md dan rencana sebelum Fase 3. Baris Design Read lengkap baru diucapkan di chat saat Fase 3 berjalan (setelah token skala huruf dibuat), lalu hasilnya dicek ulang terhadap baris itu (dua butir pertama blok ini). Mulai Fase 4 baris ini sudah ada sebelum kode ditulis.

## Blok 4: Craftsmanship dan Quality Locks (semua jawaban harus "tidak")

- C-1 PASS: alasan setiap keputusan visual tertulis di DESIGN.md.
- C-2 PASS: semua kontrol berfungsi (lihat R-26).
- C-3 PASS: setiap section membawa isi proyek (masalah, cara kerja, target uji, tim).
- C-4 PASS: diuji di 375, 768, 1280, "kurangi gerak", tanpa JavaScript (audit: judul dan angka final tampil), dan keyboard saja.
- C-5 PASS: tidak ada klaim karangan.
- R-05 PASS: bukan templat Hero dan kartu. Cara kerja berisi 4 langkah bergaya cerita; tidak ada baris logo, bento, atau kolom harga. Ritme sesuai RHYTHM 2.
- R-11 PASS: radius 14 px untuk panel dan 10 px untuk kontrol; tidak ada pil di landing.
- R-15 PASS: CTA spesifik: "Lihat cara kerja", "Buka dashboard", "Coba prototipe 3D dengan live test".
- R-16 PASS: `grep` kata klise (seamless, revolutionary, cutting edge, leverage, unlock, empower) kosong.
- R-20 PASS: identitas datang dari isi produk (model 3D kebun vanili, tetes air, 60–80 %), bukan dari logo.
- R-21 PASS: mode terang sebagai bawaan dengan alasan di DESIGN.md (Tema); tidak ada permintaan pengalih tema.
- R-29 PASS: tiga warna inti (kertas, daun, tinta) dan satu aksen vanili. Biru air hanya untuk air. #c9c6b4 sudah dipakai sebelum Fase 3, jadi tidak ada warna baru.
- R-30 PASS: referensi kasane-keyboard.com hanya diukur (angka di rencana); tidak ada teks, aset, kode, atau merek yang disalin.
- R-31 PASS: alasan tertulis di DESIGN.md (skala huruf, navigasi, status kontrol, dial, motif).

Hasil: tidak ada FAIL setelah tiga perbaikan di atas.
