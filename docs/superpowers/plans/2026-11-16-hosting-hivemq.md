# Broker MQTT di HiveMQ Cloud: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti broker Mosquitto lokal dengan HiveMQ Cloud supaya ESP32 dan backend tidak perlu berada di Wi-Fi yang sama; keduanya cukup terhubung ke internet.

**Architecture:** HiveMQ Cloud hanya menggantikan broker. ESP32 (PubSubClient) dan backend (mqtt.js) sama-sama membuka koneksi keluar ke cluster HiveMQ lewat MQTT over TLS port 8883 dengan username/password. Topik, QoS, retained, dan LWT tidak berubah. Backend, PostgreSQL, dashboard, dan landing tetap jalan di laptop seperti sekarang.

**Tech Stack:** HiveMQ Cloud (paket Serverless/gratis), mqtt.js 5 (`mqtts://`), ESP32 Arduino `WiFiClientSecure` + PubSubClient 2.8, Node 26 (`--env-file-if-exists`).

**Spec:** Tidak ada dokumen spec terpisah. Sumbernya permintaan pengguna (2026-11-16) dan kontrak topik di `firmware/README.md` bagian "Topik MQTT".

## Di luar cakupan

HiveMQ adalah broker MQTT, bukan hosting aplikasi. Backend, PostgreSQL, dan dashboard tetap di laptop dan dibuka ke internet lewat plan `2026-11-16-backend-laptop-funnel.md`. Plan HiveMQ ini hanya perlu bila ESP32 berada di jaringan lain dari laptop. Landing dipublikasikan ke Vercel lewat plan `2026-11-16-landing-vercel.md`.

## Global Constraints

- Topik tetap `irrisense/<NODE_ID>/{telemetry,status,cmd}`; QoS telemetri 0, status 1 retained (LWT `offline`), cmd 1 **tidak** retained.
- Port 8883, TLS dengan verifikasi sertifikat **wajib**. Dilarang `setInsecure()` di ESP32 dan dilarang `rejectUnauthorized: false` di backend.
- Kredensial tidak pernah masuk git: ESP32 di `firmware/src/secrets.h` (sudah di-ignore), backend di `backend/.env` (sudah di-ignore oleh pola `.env`).
- Dua kredensial terpisah di HiveMQ: satu untuk ESP32, satu untuk backend, supaya salah satu bisa dicabut tanpa mematikan yang lain.
- Tanpa dependensi baru. `mqtt` CLI sudah ikut paket `mqtt` di `backend/node_modules`.
- Broker lokal `infra/docker-compose.yml` tetap ada untuk dev backend; default `MQTT_URL` tidak diubah.
- Teks dokumentasi dalam Bahasa Indonesia, gaya yang sama dengan README yang ada.

## Review Focus

1. **Handshake TLS macet saat pompa menyala.** `connectMqtt()` memblok `loop()`. Default handshake `WiFiClientSecure` 120 detik; kalau broker tak terjangkau, kontrol pompa ikut tertahan. Wajib `setHandshakeTimeout(5)`; diuji di Task 3 Step 6.
2. **ESP32 mencoba TLS sebelum jam sinkron NTP.** Jam masih 1970 bisa membuat mbedTLS menolak sertifikat ("validity in the future"). Diuji di Task 3 Step 5; kalau gagal, tunda `connectMqtt()` sampai `netEpochMs() > 0`.
3. **Password backend salah.** Sekarang `client.on('error', () => {})` menelan semua error, jadi salah kredensial tidak terlihat sama sekali. Task 2 mencetak error sekali per pesan berbeda; diuji di Task 2 Step 1.
4. **Password muncul di log.** Kalau kredensial ditaruh di URL, baris log `MQTT ${MQTT_URL}` membocorkannya. Kredensial lewat env terpisah, URL tanpa kredensial; dicek di Task 2 Step 6.
5. **ESP32 mati mendadak.** Dashboard harus berubah ke offline lewat LWT dalam ±25 detik (keepalive PubSubClient 15 detik × 1,5). Diuji di Task 4 Step 4.

---

### Task 1: Cluster HiveMQ Cloud + uji asap TLS

Langkah manual oleh pengguna (pembuatan akun dan kredensial tidak dilakukan agen).

**Files:**
- Create (lokal, tidak di-commit): `backend/.env`

**Interfaces:**
- Produces: `HIVEMQ_HOST` (mis. `abc123.s1.eu.hivemq.cloud`), kredensial `irrisense-node1` (ESP32) dan `irrisense-backend` (backend). Dipakai Task 2–4.

- [ ] **Step 1: Buat cluster.** Daftar di console.hivemq.cloud, buat cluster paket gratis (Serverless). Cek batas paket saat daftar; info terakhir yang saya tahu: 100 koneksi dan 10 GB/bulan. Kebutuhan IrriSense ±150 MB/bulan (1 pesan ±250 B tiap 5 detik).
- [ ] **Step 2: Buat dua kredensial** di Access Management: `irrisense-node1` dan `irrisense-backend`, izin Publish & Subscribe. Batasi ke `irrisense/#` bila panel paketnya menyediakan pembatasan topik.
- [ ] **Step 3: Isi `backend/.env`:**

```
MQTT_URL=mqtts://<HIVEMQ_HOST>:8883
MQTT_USERNAME=irrisense-backend
MQTT_PASSWORD=<password>
```

- [ ] **Step 4: Uji asap dengan dua terminal** dari folder `backend/`:

Run: `npx mqtt sub -h <HIVEMQ_HOST> -p 8883 -l mqtts -u irrisense-backend -P <password> -t "irrisense/#" -v`
Run (terminal lain): `npx mqtt pub -h <HIVEMQ_HOST> -p 8883 -l mqtts -u irrisense-node1 -P <password> -t irrisense/node1/test -m halo`
Expected: terminal pertama mencetak `irrisense/node1/test halo`. Jangan publish retained ke `irrisense/node1/cmd`.

- [ ] **Step 5: Catat CA root broker.**

Run: `openssl s_client -connect <HIVEMQ_HOST>:8883 -servername <HIVEMQ_HOST> -showcerts </dev/null`
Expected: rantai berakhir di `ISRG Root X1` (Let's Encrypt). Kalau root-nya lain, Task 3 memakai root itu, bukan ISRG Root X1.

---

### Task 2: Backend: kredensial lewat env, error terlihat

**Files:**
- Modify: `backend/src/bridge.js` (opsi `mqtt.connect`, handler `error`)
- Modify: `backend/src/index.js:10-28` (baca env, teruskan ke bridge)
- Modify: `backend/package.json` (`start`)
- Modify: `backend/README.md` (variabel env + cara HiveMQ)
- Test: `backend/test/bridge.test.js`

**Interfaces:**
- Produces: `createBridge({ url, username, password, nodeId, onReading, onStatus, now })`. `username`/`password` opsional (undefined = anonim, perilaku lama).

- [ ] **Step 1: Tulis tes yang gagal** `bridge: kredensial dikirim, salah password tidak connect` di `backend/test/bridge.test.js`. `startBroker(opts)` menerima `authenticate` dan memasangnya ke `aedes.authenticate`. Broker hanya menerima `username === 'u'` dan `password.toString() === 'p'`.

```js
const good = createBridge({ url: broker.url, username: 'u', password: 'p', nodeId: 'node1', onReading() {}, onStatus() {} });
await until(() => good.connected());
const bad = createBridge({ url: broker.url, username: 'u', password: 'salah', nodeId: 'node1', onReading() {}, onStatus() {} });
await wait(500);
assert.equal(bad.connected(), false);
```

Tes yang sama menangkap `console.error` dan menegaskan pesan error auth tercetak **tepat sekali** selama 2 kali percobaan reconnect (`reconnectPeriod` 2000 ms; tunggu ±4,5 detik), lalu menutup kedua bridge dan broker.

- [ ] **Step 2: Jalankan tes, pastikan gagal**

Run: `cd backend && node --test test/bridge.test.js`
Expected: FAIL (`good.connected()` timeout karena kredensial belum diteruskan).

- [ ] **Step 3: Implementasi.** Di `bridge.js`, teruskan `username` dan `password` ke opsi `mqtt.connect`. Ganti `client.on('error', () => {})` dengan log `console.error('mqtt:', e.message)` yang hanya mencetak bila pesannya beda dari error terakhir; reset pencatat itu di event `connect`. Di `index.js`, baca `process.env.MQTT_USERNAME` dan `process.env.MQTT_PASSWORD` lalu teruskan ke `createBridge`. Baris log startup tetap mencetak `MQTT_URL` (tanpa kredensial).

- [ ] **Step 4: Jalankan semua tes**

Run: `cd backend && npm test`
Expected: semua PASS (26 lama + 1 baru). Postgres harus menyala.

- [ ] **Step 5: `start` membaca `.env`.** Ubah script jadi `node --env-file-if-exists=.env src/index.js`. Tanpa `.env`, perilaku lama (Mosquitto lokal) tetap jalan.

- [ ] **Step 6: Verifikasi ke HiveMQ**

Run: `cd backend && npm start`, lalu buka `http://localhost:3000/api/health`
Expected: `{"ok":true,"mqtt":true}`. Log startup memuat `mqtts://<HIVEMQ_HOST>:8883` tanpa password. Ubah sementara `MQTT_PASSWORD` jadi salah: log mencetak satu baris `mqtt: Connection refused: Not authorized`, tidak berulang tiap 2 detik.

- [ ] **Step 7: README.** Tambah `MQTT_USERNAME`, `MQTT_PASSWORD` di daftar variabel, dan subbagian "Broker HiveMQ Cloud" (isi `backend/.env` seperti Task 1 Step 3; `infra/` tetap untuk dev lokal).

- [ ] **Step 8: Commit**

```bash
git add backend/src/bridge.js backend/src/index.js backend/package.json backend/README.md backend/test/bridge.test.js
git commit -m "Backend: kredensial MQTT lewat env untuk HiveMQ Cloud"
```

---

### Task 3: Firmware: MQTT over TLS

**Files:**
- Create: `firmware/src/ca_cert.h` (sertifikat root publik, boleh di-commit)
- Modify: `firmware/src/net.cpp` (klien TLS)
- Modify: `firmware/src/secrets.example.h`
- Modify: `firmware/README.md` (langkah 1)
- Local only: `firmware/src/secrets.h`

**Interfaces:**
- Consumes: `HIVEMQ_HOST`, kredensial `irrisense-node1`, root CA dari Task 1 Step 5.
- Produces: header `ca_cert.h` berisi `static const char MQTT_CA_CERT[] PROGMEM = R"(...)";`.

- [ ] **Step 1: `ca_cert.h`.** Unduh PEM root dari sumber resminya (ISRG Root X1: `https://letsencrypt.org/certs/isrgrootx1.pem`), tempel utuh sebagai raw string `MQTT_CA_CERT`. Jangan ketik ulang dari ingatan. Simpan sebagai `.h` karena `*.pem` di-ignore oleh `.gitignore`.

- [ ] **Step 2: `net.cpp`.** Ganti `WiFiClient` dengan `WiFiClientSecure`, `#include "ca_cert.h"`. Di `netBegin()`: `wifiClient.setCACert(MQTT_CA_CERT); wifiClient.setHandshakeTimeout(5);` dan naikkan `mqtt.setSocketTimeout(2)` jadi `5` (TLS lebih lambat). Fungsi lain tidak berubah.

- [ ] **Step 3: `secrets.example.h`.** `MQTT_HOST "xxxxxxxx.s1.eu.hivemq.cloud"` (host cluster HiveMQ), `MQTT_PORT 8883`, `MQTT_USER`/`MQTT_PASS` wajib diisi. Isi `secrets.h` lokal dengan nilai asli.

- [ ] **Step 4: Build semua env**

Run: `cd firmware && pio run -e esp32dev && pio run -e bench && pio run -e bringup && pio run -e esp32dev_cal`
Expected: keempatnya SUCCESS (env uji bangku tidak menyertakan `net.cpp`, jadi tidak terpengaruh).

- [ ] **Step 5: Flash dan uji connect setelah boot**

Run: `pio run -e esp32dev -t upload && pio device monitor`, sambil menjalankan `npx mqtt sub ... -t "irrisense/#" -v` dari Task 1.
Expected: dalam ±20 detik setelah boot muncul `irrisense/node1/status online` lalu telemetri tiap 5 detik.
Kalau Serial menunjukkan error sertifikat "validity"/"future": di `netLoop()`, jangan panggil `connectMqtt()` selama `netEpochMs() == 0`, build ulang, ulangi step ini.

- [ ] **Step 6: Uji broker tak terjangkau.** Isi sementara `MQTT_HOST` dengan host yang tidak ada (mis. `nonexistent.s1.eu.hivemq.cloud`), flash, paksa pompa ON lewat kondisi tanah kering.
Expected: Serial tetap mencetak tik sensor tiap ±5 detik (jeda tidak lebih dari ±10 detik) dan pompa tetap mati di `M_MAX`. Kembalikan `MQTT_HOST` asli.

- [ ] **Step 7: README firmware.** Langkah 1 menyebut host HiveMQ, port 8883, dan kredensial `irrisense-node1`.

- [ ] **Step 8: Commit**

```bash
git add firmware/src/ca_cert.h firmware/src/net.cpp firmware/src/secrets.example.h firmware/README.md
git commit -m "Firmware: MQTT over TLS ke HiveMQ Cloud"
```

---

### Task 4: Uji ujung ke ujung

Tidak ada kode baru. Backend jalan dengan `backend/.env` (Task 2), ESP32 dengan firmware Task 3. Laptop dan ESP32 sengaja di jaringan **berbeda** (mis. ESP32 di Wi-Fi kampus, laptop di hotspot HP).

- [ ] **Step 1: Data masuk.** `/api/node` → `{"online":true}`; jumlah baris `readings` bertambah tiap 5 detik; dashboard menampilkan angka hidup.
- [ ] **Step 2: Perintah sampai.** Dari dashboard, mode manual → pompa ON. Expected: relay berbunyi dalam ±2 detik, telemetri berikutnya `pump:true`.
- [ ] **Step 3: Latensi.** `/api/stats` mengisi latensi (jam Windows harus sinkron NTP). Catat nilainya di laporan; latensi lewat cloud akan lebih besar dari Mosquitto lokal.
- [ ] **Step 4: LWT.** Cabut daya ESP32. Expected: `/api/node` jadi `false` dalam ±25 detik.
- [ ] **Step 5: Buffer offline.** Matikan Wi-Fi ESP32 ±1 menit lalu nyalakan. Expected: telemetri `buffered:true` masuk, tidak ada duplikat (constraint `UNIQUE (node_id, boot, seq)`).
- [ ] **Step 6: Tutup proses uji** (aturan `CLAUDE.md`): hentikan `npm start`, `npx mqtt sub`, dan `pio device monitor` yang dibuka sendiri; pastikan port 3000 kosong.
