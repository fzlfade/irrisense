# Audit landing IrriSense

Mengukur landing terhadap anggaran di `budgets.json` (sumber: `docs/superpowers/plans/2026-11-09-landing-refactor-rea-kasane.md`, bagian 3.6). Dipakai di akhir tiap fase rencana refactor.

## Prasyarat

- Node 22.23 atau lebih baru (syarat REA).
- Edge atau Chrome terpasang (atau set `AUDIT_BROWSER` ke path browser berbasis Chromium).
- Landing sudah dibuild: `cd landing && npm run build`.
- Backend menyala di `http://localhost:3000`: `cd backend && npm start`.

## Pemakaian

```bash
node tools/audit/audit.mjs
```

```bash
node tools/audit/audit.mjs --no-browser
```

```bash
node tools/audit/audit.mjs http://localhost:3000/ --out laporan.json --port 9444
```

- Tanpa argumen: audit penuh `http://localhost:3000/`, sekitar 35 detik.
- `--no-browser`: hanya ukuran berkas, sekitar 1 detik; metrik browser ditandai LEWAT.
- `--budgets <berkas>`: anggaran lain (misalnya untuk mencoba batas baru).
- `--out <berkas>`: lokasi laporan JSON. Bawaan `tools/audit/out/audit-<waktu>.json` (diabaikan git).
- `--port <n>`: port debug browser, bawaan 9333.

Kode keluar: `0` semua lulus, `1` ada anggaran gagal, `2` audit tidak bisa dijalankan.

## Yang diukur

| Metrik | Cara |
|---|---|
| JS landing, CSS, font | Ukuran berkas di `landing/out` (gzip dihitung ulang) |
| JS iframe 3D | `backend/prototipe/scene.js`, `sim.js`, Three.js, OrbitControls |
| Poster hero | `<img fetchpriority="high">` pertama di `landing/out/index.html` |
| DOM node, landmark, kontrol tanpa nama | REA `inspect-web-page` (pohon DOM dan aksesibilitas) |
| Transfer jaringan dan kompresi | CDP `Network`, cache dimatikan |
| CLS | `PerformanceObserver` lewat CDP, scroll penuh bertahap |
| Kurangi gerak | CDP `Emulation.setEmulatedMedia`: tanpa intro, tanpa iframe, angka target final tanpa scroll |
| Tanpa JavaScript | CDP `Emulation.setScriptExecutionDisabled`: judul dan angka target terbaca |

## Keamanan

- Browser berjalan headless dengan profil sementara, port debug hanya di `127.0.0.1`, lalu dimatikan dan profilnya dihapus walau audit gagal.
- REA (`rea-agents@6.8.0`, versi dikunci) dijalankan lewat `npx` dari folder sementara di luar proyek, sesuai anjuran README REA.
- Arahkan hanya ke situs yang Anda berhak analisis. Bawaannya landing lokal.

## Baseline

`docs/superpowers/plans/evidence/baseline-2026-11-09.json`: 4 gagal yang memang dijadwalkan diperbaiki (poster hero, DOM node, landmark `navigation`, angka target saat kurangi gerak).
