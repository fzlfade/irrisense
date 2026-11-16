# IrriSense di rangka paralon — design sheet

Playbook: Diorama 5.7.0 (`.claude/skills/diorama`, commit c790df5). Disalin dari `templates/DESIGN.md`; baris naratif yang tidak berlaku dihapus.

## Profile and hard acceptance

- `sceneProfile`: **educational**. Alasan: tujuannya menjelaskan cara kerja satu mekanisme (sensor → ESP32 → relay → pompa → dripper → tanah basah → pompa mati), untuk pengunjung pameran.
- `uiMode`: **minimal-controls** (Jeda/Putar, Reset tampilan, petunjuk orbit). Tidak memakai kartu V8: pengguna tidak meminta panel, dan panel netral tidak senada dengan merek IrriSense. Penjelasan disampaikan lewat perilaku adegan: angka di LCD, LED pompa, tetesan, warna tanah.
- `representationMode`: **real-subject** (prototipe fisik di rangka paralon), bukan model pengajaran abstrak.
- `assetStrategy`: **authored-only**. Jawaban pengguna: *"gas, pake ukuran perkiraan dulu aja"* atas rekomendasi "stroked-toon, model dibuat sendiri". Alasan: semua bentuk sederhana (pipa, polybag, galon, kotak) dan harus cocok dengan ukuran rangka; model unduhan tidak menambah akurasi.
- Major-role sourcing ledger: tidak ada unduhan model. Riset subjek tetap: foto rangka dari pengguna, RAB D-02, `firmware/src/config.h`, `backend/prototipe/sim.js`.
- Dependensi kode: three 0.160.0 (MIT), esbuild, playwright-core (hanya QA). Standalone membundel three ke satu HTML.

### Occupied space and actions

- Tidak ada aktor/orang/hewan. Objek bergerak: tetesan air, getaran pompa, riak air galon, layar LCD, LED.
- Statik yang wajib tidak saling tembus: polybag vs pipa alas, selang mikro vs polybag, kabel sensor vs polybag/selang, casing vs tiang.

## Premise

Rangka paralon berisi enam polybag vanili; tanah mengering, IrriSense membaca rata-rata enam sensor, menyalakan pompa saat di bawah 60%, menetes sampai 80%, lalu berhenti.

- Mekanisme: hysteresis on-off firmware (`M_SET = 60`, `M_MAX = 80`, keputusan dari rata-rata enam sensor).
- Asumsi: siklus 24 s dipercepat (aslinya menit sampai jam); ukuran rangka perkiraan dari foto: 100 × 60 × 75 cm, tiang 25 cm, pipa ¾" (Ø 2,7 cm).

## Render Preset and Style Confirmation

- Preset: **`stroked-toon`**. Jawaban pengguna: *"gas, pake ukuran perkiraan dulu aja"* (menyetujui rekomendasi stroked-toon).
- Warna: palet merek IrriSense (`design/DESIGN.md`): daun #12301f, kertas #f3ecd8, air #2d8fc0, vanili #b9892b sebagai aksen kecil. Pengecualian warna komponen: kepala dripper ungu tua #6b3fa0 dan tutup ujung selang merah, karena begitulah warna barang aslinya dan keduanya harus terbaca di tampilan jauh.
- Kertas: CSS #f3ecd8; renderer alpha. Lantai teras ubin terakota seperti foto.
- Kontur: OutlineEffect, tinta #27231e, tebal 0.0032; tanpa outline untuk air, galon transparan, tetesan, layar LCD, noda basah.
- Kamera: fov 26, azimuth 38°, elevasi 27.5°, jarak dihitung dari batas adegan; orbit bebas, reset (tombol + tombol R), tanpa putar otomatis, tanpa pan.
- Render path: native toon + OutlineEffect (template `stroked-toon.js`), antialias, DPR maks 2.
- **Decision receipt:** Stroked toon · authored-only · educational · minimal controls.
- QA yang diganti: cek palet/dither/kertas-kosong khusus pixel tidak berlaku.

## Camera Side

- +Z = sisi depan (pengunjung): casing + LCD + DHT11 di tiang depan kuda-kuda tengah, kabel duct di lantai depan rel depan.
- Galon di kiri (−X), adaptor + stopkontak di depan kanan.
- Tidak boleh tertutup dari sudut hero: LCD, dripper baris depan, galon dan pompa.

## Mechanism manifest (educational)

| ID | Bagian | Tumpuan / sambungan | Fungsi | Bukti |
| --- | --- | --- | --- | --- |
| frame | rangka PVC ¾": 3 rel memanjang, 5 rel melintang, 3 kuda-kuda, bubungan | lantai | struktur, rambatan | hero |
| pot-1..6 | polybag + tanah | lantai, di dalam sel alas | media tanam | cek AABB pot vs pipa |
| plant-1..6 | ajir + sulur + daun vanili | tertancap di tanah | subjek | hero |
| sensor-1..6 | sensor tanah kapasitif + casing | garpu tertancap di tanah | baca kelembapan | cek ujung garpu di bawah tanah |
| cable-1..6 | kabel sensor | menyusuri rel melintang ke duct | sinyal ke ESP32 | crop |
| duct | kabel duct | di lantai tepat di depan rel depan (tidak menembus tiang) | merapikan kabel sensor dan kabel pompa | crop |
| box | casing 16×14×4 + LCD 20×4 + LED | diikat 2 cable tie ke tiang depan tengah | ESP32 + relay di dalam | hero, LED |
| dht | DHT11 | diikat ke tiang di atas casing | suhu/RH udara | crop |
| tank | galon 19 L + air | lantai | tandon | hero |
| pump | pompa celup 5 V | dasar galon | dorong air | getaran saat ON |
| hose | selang PE 16 mm | dari pompa, keluar mulut galon, klip ke rel tengah, tutup ujung | jalur air | cek ujung di galon |
| branch-1..6 | konektor + selang mikro 4/7 mm | dari selang utama ke bibir polybag | jalur ke dripper | cek awal di selang |
| dripper-1..6 | dripper stik | tertancap di tanah | keluarkan tetesan | cek ujung di tanah |
| power | adaptor 5 V 2 A + stopkontak | lantai | daya | crop |

Penyederhanaan: isi casing (ESP32, relay, PCB) tidak dimodelkan karena casing tertutup; tidak ada mode Inside.

## Causal sequence (beat sheet, LOOP = 24 s)

| t (s) | Beat | Bukti |
| --- | --- | --- |
| 0.0 | tanah 66%, pompa mati | `t0.0` |
| 3.0 | tanah mengering (warna memudar) | `kering` |
| 5.81 | rata-rata < 60% → relay ON, LED hijau, pompa bergetar | `pompa-on` 6.2 |
| 6.7 | air sampai di dripper, tetes mulai | `menetes` 9.0 |
| 15.0 | rata-rata ≥ 80% → pompa OFF | `pompa-off` 15.2 |
| 15.4 | tetes berhenti | — |
| 24.0 | kembali 66% (sambungan loop mulus) | cek kontinuitas |

## Whole-object completeness matrix

| Assembly | Status | Bukti |
| --- | --- | --- |
| Rangka: alas kisi, tiang, kaki kuda-kuda, bubungan, fitting | required | hero + belakang |
| Polybag + tanah + tanaman + ajir ×6 | required | hero |
| Sensor + casing + kabel ×6 | required | crop + cek garpu |
| Selang utama + klip + tutup ujung | required | cek ujung |
| Cabang + dripper ×6 | required | cek ujung |
| Casing + LCD + LED + cable tie + kelenjar kabel | required | crop depan |
| DHT11 + kabel | required | crop |
| Galon + air + pompa | required | hero |
| Adaptor + stopkontak + kabel | required | hero |
| Paranet | omitted (opsional, di luar RAB) | — |

## Non-Penetration Gate

- Intended contact: polybag↔lantai, pipa alas↔lantai, garpu sensor↔tanah, stik dripper↔tanah, ajir↔tanah, klip↔rel+selang, casing↔tiang (lewat cable tie).
- Cek otomatis (`qa/construction.mjs`): geometri berhingga (NaN), AABB polybag tidak memotong pipa mana pun, ujung dripper/sensor/ajir berada di dalam volume tanah, awal cabang di dalam selang utama, ujung selang di dalam air galon, titik terendah objek lantai di y≈0, kontinuitas loop dan logika hysteresis.
- Injeksi negatif: `?inject=dripper` (dripper diangkat) dan `?inject=pot` (polybag digeser ke atas rel) harus GAGAL.
- Batas metode: AABB dan titik ujung, bukan uji tabrakan mesh penuh.

## QA Frames

| Frame | t | Membuktikan |
| --- | --- | --- |
| hero | 0.0 | susunan lengkap, tanah 66%, pompa mati |
| kering | 3.0 | tanah memudar |
| pompa-on | 6.2 | LED hijau, LCD "POMPA ON", belum menetes |
| menetes | 9.0 | tetesan + noda basah |
| pompa-off | 15.2 | LCD 80%+, LED mati |
| phone | 9.0 | 390×844 tidak terpotong |

## QA results (build final, sha256 irrisense-diorama.html = bbc5b936851ad861…)

| Perintah | Hasil |
| --- | --- |
| `node qa/cycle.test.mjs` | lulus: hysteresis cocok kecuali 1 sampel tepat di ambang, sambungan loop mulus, lompatan maks 0.05 %/0.01 s |
| `node qa/construction.mjs` | 39/39 cek lulus pada t = 0, 9, 15.2; `inject=dripper` dan `inject=pot` gagal pada cek yang tepat; 0 error konsol |
| `node qa/offline.mjs` | 0 request jaringan, 0 error |
| `qa/audit.mjs` (LOOP=24, STEP=0.2) | lulus; pemindaian margin kertas tidak berjalan karena lempeng memenuhi frame |
| `qa/shoot.mjs` 1280×800, 1388×950, 390×844 | 0 error konsol; 254 draw call, 42 062 segitiga; bukti di `qa/shots/` |
| `node qa/detail.mjs` | 6 close-up di `qa/detail/`, kamera kembali ke pose hero |

Temuan yang diperbaiki saat QA: fitting simpul alas menembus lantai 6 mm (pipa alas dinaikkan ke tinggi fitting); kabel duct menembus tiang (duct dipindah ke lantai depan rel); kabel pompa menembus dinding galon (dirutekan lewat mulut galon); fit kamera terlalu jauh karena noda basah/riak berukuran 1 m sebelum diskala; metadata jarak kamera untuk audit.

Belum diverifikasi: tabrakan mesh penuh (hanya AABB dan titik ujung), kontras teks tombol di atas latar, interaksi keyboard dan seret di browser sungguhan, performa di laptop pameran.

## Risks

- Dripper dan sensor kecil bisa hilang di tampilan jauh → ukuran dilebihkan sedikit, warna kontras.
- Ukuran rangka perkiraan; ganti konstanta `L, W, H, POST` di `src/main.js` setelah ukur.
