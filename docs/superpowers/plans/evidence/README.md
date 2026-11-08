# Skrip penemuan (Phase 0) untuk rencana refactor landing

Skrip kami sendiri, tanpa isi pihak ketiga. Dipakai untuk menganalisis sisi publik situs referensi lewat CDP loopback dan REA 6.8.0, dan untuk mengukur IrriSense sendiri. Cara menjalankannya: lampiran B di `../2026-11-09-landing-refactor-rea-kasane.md`.

- `probe.mjs`: jaringan, DOM, dan scroll bertahap (argumen: URL, berkas keluaran).
- `emul.mjs`: emulasi reduced motion, tanpa JavaScript, jaringan lambat pada landing lokal.
- `shots.mjs`: tangkapan layar JPEG kecil pada posisi scroll tertentu (khusus situs referensi).

Fase 1 mengadaptasinya menjadi `tools/audit/audit.mjs`. Port debug hanya di `127.0.0.1`; matikan Edge setelah selesai.

`baseline-2026-11-09.json`: laporan audit pertama (`node tools/audit/audit.mjs`), sebelum Fase 2.
`fase2-2026-11-09.json`: audit setelah Fase 2.
`fase3-2026-11-09.json`: audit setelah Fase 3; `delivery-gate-fase3.md`: laporan Delivery Gate antislop Fase 3.
`fase4-2026-11-09.json`: audit setelah Fase 4; `delivery-gate-fase4.md`: laporan Delivery Gate Fase 4.
`fase4-scroll.mjs`: uji CDP Fase 4 (roda di atas model 3D, seret, anchor, keyboard, kurangi gerak, layar sentuh 375 px); hasilnya `fase4-scroll-2026-11-09.json`. Jalankan dengan `node docs/superpowers/plans/evidence/fase4-scroll.mjs http://localhost:3000/` saat backend menyala.
