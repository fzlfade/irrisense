# Skrip penemuan (Phase 0) untuk rencana refactor landing

Skrip kami sendiri, tanpa isi pihak ketiga. Dipakai untuk menganalisis sisi publik situs referensi lewat CDP loopback dan REA 6.8.0, dan untuk mengukur IrriSense sendiri. Cara menjalankannya: lampiran B di `../2026-11-09-landing-refactor-rea-kasane.md`.

- `probe.mjs`: jaringan, DOM, dan scroll bertahap (argumen: URL, berkas keluaran).
- `emul.mjs`: emulasi reduced motion, tanpa JavaScript, jaringan lambat pada landing lokal.
- `shots.mjs`: tangkapan layar JPEG kecil pada posisi scroll tertentu (khusus situs referensi).

Fase 1 mengadaptasinya menjadi `tools/audit/audit.mjs`. Port debug hanya di `127.0.0.1`; matikan Edge setelah selesai.

`baseline-2026-11-09.json`: laporan audit pertama (`node tools/audit/audit.mjs`), sebelum Fase 2.
