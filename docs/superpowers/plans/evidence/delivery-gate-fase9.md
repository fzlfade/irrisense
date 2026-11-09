# Delivery Gate antislop: Fase 9 (2026-11-09)

Mode antislop: during (session override). Fase ini hanya memverifikasi. Tidak ada temuan di halaman, jadi kode landing tidak berubah; yang ditambah hanya uji `fase9-a11y.mjs` dan bukti.

Bukti:
- `fase9-a11y-2026-11-09.json`;
- `fase9/`: uji ulang Fase 4–8 dan audit beranda serta Spesifikasi, semua lulus.

## Blok 1: Hard Gate

- R-03 PASS: tanpa overflow di 375, 768, dan 1280 px di kedua halaman. Kontrol di luar kalimat minimal 24 × 24 px (WCAG 2.5.8).
- R-25 PASS: kontras sudah diukur di Fase 5–8, dan tidak ada warna yang berubah sejak itu.
- R-26 PASS: tombol Menu dibuka dengan Enter dan ditutup dengan Esc, fokus kembali ke tombol. Tautan lewati membawa fokus ke `<main>`.
- R-32 PASS: jalur Tab penuh di kedua halaman. Setiap fokus terlihat dan bercincin, tidak ada jebakan, dan Shift+Tab berurutan terbalik.
- R-35 PASS: semua uji dan audit dijalankan ulang. Konsol tanpa error.
- R-36 PASS: hal yang tidak bisa diuji otomatis dicatat sebagai belum diuji, tidak dinyatakan lolos: pembaca layar sungguhan, kelancaran GPU, LCP dan TBT, perbesaran teks 200 %, dan perangkat sentuh sungguhan.
- R-39 PASS:
  - `lang="id"` dan title ada;
  - gambar ber-alt, dan iframe ber-title serta `aria-hidden`;
  - satu h1 tanpa lompatan heading;
  - dengan "kurangi gerak": tanpa intro, tanpa iframe, dan tanpa efek gulir (uji Fase 6–8).
- R-40 PASS: semua baris anggaran 3.6 lulus di kedua halaman.
- R-02, R-17, R-18, R-23, R-24, R-27, R-28, R-33, R-34, R-37, R-38 PASS: tidak ada teks, aset, tautan, data, atau tema baru.

## Blok 2–4

Tidak berlaku. Tidak ada perubahan visual, gerak, atau isi.

Hasil: tidak ada FAIL.
