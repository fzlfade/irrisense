# DESIGN.md: IrriSense

Dipakai bersama aturan antislop (core + antislop-ui). Perbarui file ini sebelum mengubah palet atau gaya.

## Tujuan dan audiens
- **Dashboard** (`backend/public/`): operator memantau kelembapan tanah dan mengontrol pompa. Keputusan utama: apakah pompa perlu dinyalakan sekarang.
- **Landing page** (`landing/`, fase berikutnya): pengunjung pameran, dosen penguji, calon mitra kebun vanili. Tujuan: paham masalah (boros air), solusi (penyiraman tetes otomatis), dan bukti bahwa sistem berjalan.

## Warna
Aturan 60-30-10 dengan tiga inti + satu aksen (R-29).

| Peran | Terang | Gelap | Pemakaian |
|---|---|---|---|
| Latar (60 %) | `kertas` #f3ecd8 | `daun-950` #0f2519 | `--bg` |
| Permukaan | `kertas-50` #fbf8ee | `daun-800` #17382a | `--surface` |
| Teks | `tinta` #1b2a21 | `kertas` #f3ecd8 | `--ink` |
| Hijau (30 %) | `daun-700` #1f4a31 | #8fc79a | aksi utama, status pompa ON (`--green`) |
| **Aksen (10 %)** | `vanili` #b9892b | sama | landing: tombol utama, satu angka utama. `--accent` |
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

## Bentuk
- Radius: 14 px (kartu dan panel), 10 px (kontrol). Pil penuh hanya untuk indikator status node.
- Bayangan: tidak dipakai. Pemisah memakai garis `--line`.

## Dial (landing)
MOTION rendah: animasi masuk sekali, tidak ada loop, mati saat `prefers-reduced-motion`. RHYTHM: antar-section bervariasi sesuai isi.

## Komponen React Bits yang dipakai (Phase 4)
Sumber salinan: `landing/components/reactbits/` (diambil dari registry resmi, varian TS-CSS, dikecualikan dari lint).

| Komponen | Tempat | Alasan |
|---|---|---|
| `SplitText` | judul hero | Judul masuk sekali saat halaman dibuka, tidak berulang |
| `ScrollReveal` (mode `enter`) | judul section masalah | Kalimat kunci muncul kata demi kata sekali, saat terlihat |
| `CountUp` | tiga target | Angka naik sekali saat terlihat; HTML awal memuat angka akhir |
| `Magnet` | tombol "Lihat cara kerja" | Satu tombol, tarikan kecil (maks 14 px), diabaikan di layar sentuh |

**Model 3D yang berputar mengikuti scroll (landing):** dua gambar prototipe (hero dan cara kerja) diganti `Spin3D`, yaitu iframe ke `/prototipe/?embed=1` yang kameranya diputar 270° sesuai posisi elemen di layar (nilai 0 sampai 1 dikirim lewat `postMessage`, satu asal). Gerak ini punya tujuan (memperlihatkan alat dari semua sisi), tidak berulang sendiri, dan berhenti saat elemen di luar layar. Gambar PNG lama tetap dipakai sebagai cadangan: bila `prefers-reduced-motion`, WebGL tidak ada, atau halaman prototipe tidak tersedia.

**Tidak dipakai:** `ScrollStack` (mengambil alih scroll, bayangan tebal dan radius 28 px bertentangan dengan aturan bentuk di atas, dan bentrok dengan gambar sticky). Latar WebGL (`Silk`, `Aurora`, `Galaxy`, dan sejenisnya) tidak dipakai karena halaman tidak punya alasan untuk itu.

**Perubahan pada kode salinan:** `CountUp` menampilkan angka akhir di HTML awal. `SplitText` menyembunyikan teks sampai JavaScript siap, jadi `layout.tsx` memuat `<noscript>` yang menampilkannya kembali.

## Sumber token
`design/tokens.css` adalah satu-satunya sumber. Dashboard memakai salinannya di `backend/public/css/tokens.css`; tes `backend/test/tokens.test.js` gagal bila kedua file berbeda.
