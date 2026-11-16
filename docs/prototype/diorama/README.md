# Diorama IrriSense (rangka paralon)

Diorama 3D edukasi: enam polybag vanili di rangka paralon, siklus penyiraman tetes otomatis 24 detik (dipercepat). Dibangun dengan playbook Diorama 5.7.0. Keputusan: **stroked-toon · authored-only · educational · minimal controls**.

- **Buka:** `irrisense-diorama.html` (satu file, jalan offline, tanpa internet).
- **Kontrol:** seret untuk memutar, gulir untuk zoom, panah untuk memutar, `R` untuk reset, spasi untuk jeda. Tombol Jeda/Putar dan Reset tampilan di kiri bawah.
- **Bekukan waktu:** `irrisense-diorama.html?t=9` (detik 0–24).

## Siklus (sama dengan firmware: ON < 60%, OFF ≥ 80%, rata-rata 6 sensor)

| t (s) | Kejadian |
| --- | --- |
| 0 | rata-rata 66%, pompa mati |
| 5.81 | rata-rata < 60% → relay ON, LED hijau, pompa bergetar, riak di galon |
| 6.71 | air sampai di dripper, mulai menetes, noda basah melebar |
| 15.0 | rata-rata ≥ 80% → pompa mati |
| 15.4 | tetes terakhir; tanah mengering kembali ke 66% di t = 24 |

## Mengubah ukuran rangka

Ukuran sekarang **perkiraan dari foto**. Ubah konstanta di awal `src/main.js` (`L`, `W`, `H`, `POST`, `R`), lalu jalankan:

```bash
npm install
node build.mjs --minify
```

## QA (jalankan dari folder ini; butuh Microsoft Edge)

```bash
node qa/cycle.test.mjs
node qa/construction.mjs
node qa/offline.mjs
node qa/detail.mjs
```

`qa/shoot.mjs` dan `qa/audit.mjs` (disalin dari playbook) butuh `BASE_URL` berisi URL `file:///` ke `irrisense-diorama.html`.
