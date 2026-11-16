# Sources

## Shape

| Question | Searched | Found | Decision |
| --- | --- | --- | --- |
| bentuk rangka | foto pengguna (rangka paralon di teras) | atap pelana PVC putih, fitting abu-abu, alas kisi, 3 kuda-kuda, bubungan | dimodelkan; ukuran perkiraan dari pintu dan galon |
| ukuran rangka | formulir booth (100 × 30 × 50 cm) vs foto | foto tampak lebih lebar dan tinggi | pakai perkiraan foto 100 × 60 × 75 cm, tandai sebagai perkiraan |
| komponen | RAB D-02 | ESP32, LCD 20×4, DHT11, sensor tanah + casing, relay, pompa 5 V, adaptor 5 V 2 A, casing 16×14×4, kabel duct, selang tetes + emitter | semua dimodelkan; isi casing tidak |

## Motion

| Question | Searched | Found | Decision |
| --- | --- | --- | --- |
| kapan pompa menyala/mati | `firmware/src/config.h`, `backend/prototipe/sim.js` | `M_SET = 60`, `M_MAX = 80`, keputusan dari rata-rata sensor, batas 10 menit | hysteresis yang sama; waktu dipercepat jadi siklus 24 s |
| bentuk tetesan dripper stik | pengetahuan umum irigasi tetes | air keluar dari kepala/stik dekat tanah, membasahi titik kecil | tetes kecil + noda basah melebar |

## Assets

| Asset | Ladder step | Source / query | Licence | Decision |
| --- | --- | --- | --- | --- |
| semua model | authored-only (pilihan pengguna) | tidak ada pencarian model | — | dibuat sendiri |
| three.js 0.160.0 | dependensi kode | npm | MIT | dibundel ke standalone |

## Proof

Lihat `qa/` dan tabel QA Frames di `DESIGN.md`.
