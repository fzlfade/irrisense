# Daftar Perkabelan IrriSense

Sesuai board ESP32 38 pin dengan shield berkolom **G / V / S** (G = GND, V = VCC, S = sinyal).
Pin sensor mengikuti `firmware/src/config.h`. Panduan uji bangku ada di `wiring.md`.

## 1. Sensor tanah (6 buah)

Tiap sensor: **A0 → S**, **VCC → V**, **GND → G**, di baris yang sama. Pin **D0 tidak dipakai**.
Sisi kiri board, urutan dari atas: `EN, VP, VN, D34, D35, D32, D33`.

| Sensor | Baris di board | GPIO |
|---|---|---|
| S1 | VP  | 36 |
| S2 | VN  | 39 |
| S3 | D34 | 34 |
| S4 | D35 | 35 |
| S5 | D32 | 32 |
| S6 | D33 | 33 |

Kolom V harus **3,3 V** (cek jumper `JUMP` di board).

## 2. DHT11 (sisi kanan)

| Kabel DHT11 | Ke |
|---|---|
| DATA | baris **D4**, kolom S |
| VCC  | kolom V (3,3 V) |
| GND  | kolom G |

## 3. Relay (sisi kiri)

| Pin relay | Ke |
|---|---|
| IN  | baris **D26**, kolom S |
| VCC | baris **VIN** (5 V) |
| GND | kolom G |

## 4. LCD I2C 20x4 (header kecil kanan bawah)

| Pin LCD | Ke |
|---|---|
| SCL | D22 |
| SDA | D21 |
| VCC | VCC (bila LCD gelap, pindah ke VIN) |
| GND | GND |

## 5. Jalur pompa (terminal biru relay)

Urutan terminal dari kiri ke kanan: **NO**, **COM**, **NC**.

| Dari | Ke |
|---|---|
| (+) adaptor 5 V (merah) | terminal tengah **COM** |
| terminal kiri **NO** | (+) pompa (merah) |
| (−) pompa (hitam) | (−) adaptor (abu-abu), disambung langsung |
| Dioda 1N4007 | paralel di pompa, sisi bergaris ke (+) |

Terminal kanan **NC** dikosongkan.

## 6. Daya

| Sumber | Ke |
|---|---|
| ESP32 | kabel **USB** saja |
| Adaptor 5 V | **hanya** ke jalur pompa (bagian 5) |

Jangan sambungkan adaptor ke `VIN` ESP32 selagi USB tercolok.
Jack DC di board bertuliskan 6,5–16 V: **jangan** dipakai untuk adaptor 5 V.

## Cek cepat sebelum menyalakan

1. Tidak ada ujung kabel terkupas yang saling menyentuh.
2. Semua kabel menancap kencang (kabel DHT11 longgar membuat suhu/RH kosong di dashboard).
3. Pompa terendam air, atau selang mengarah ke wadah air.
4. Sensor S5 dan S6 sudah terkalibrasi di `SOIL_CAL` bila dipasang.
