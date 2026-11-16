# Backend di laptop, dibuka lewat Tailscale Funnel: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard IrriSense yang berjalan di laptop pengguna bisa dibuka dari internet lewat satu URL HTTPS tetap, gratis, tanpa memindahkan backend atau database.

**Architecture:** Tidak ada yang dipindah. Backend Express, PostgreSQL (Laragon), dan broker tetap di laptop. Tailscale Funnel meneruskan `https://<laptop>.<tailnet>.ts.net` ke `localhost:3000`, tanpa port forwarding di router. Karena URL itu publik dan dashboard bisa menyalakan pompa, `/dashboard` dan `/api/*` (kecuali `/api/health`) dikunci password lewat HTTP Basic Auth. Laptop diatur agar tidak tidur dan agar backend, Docker, dan Laragon menyala sendiri setelah restart. Landing tetap di Vercel; `/dashboard/` di Vercel dialihkan ke URL Funnel.

**Tech Stack:** Tailscale (Funnel, paket Personal gratis), Express 4, `node:crypto`, Windows Task Scheduler, `powercfg`.

**Spec:** Tidak ada dokumen spec terpisah. Sumbernya keputusan pengguna (2026-11-16): server hosting memakai laptop sendiri, menggantikan rencana Render + Supabase.

## Broker MQTT

- ESP32 di Wi-Fi yang sama dengan laptop: Mosquitto lokal (`infra/docker-compose.yml`) tetap dipakai, plan HiveMQ tidak wajib.
- ESP32 di jaringan lain (misalnya di kebun): jalankan plan `2026-11-16-hosting-hivemq.md` dulu. Funnel hanya meneruskan HTTPS, bukan MQTT, jadi ESP32 tidak bisa memakai jalur ini untuk menjangkau Mosquitto.

## Global Constraints

- Tanpa dependensi baru di `backend/`. Basic Auth memakai `node:crypto` `timingSafeEqual`.
- Tanpa `DASHBOARD_PASSWORD`, backend berperilaku seperti sekarang. Selama Funnel aktif, variabel ini **wajib** diisi di `backend/.env`.
- `/api/health`, landing, dan `/prototipe/` tetap publik.
- Funnel hanya untuk port 3000 (backend). Postgres (5432) dan Mosquitto (1883) tidak pernah dibuka ke internet.
- Pengaturan sistem Windows (daya, tutup laptop, Task Scheduler, auto start Docker/Laragon) dan login Tailscale dilakukan pengguna sendiri; agen hanya menyiapkan perintah dan skrip.
- Secret hanya di `backend/.env` (sudah di-ignore).

## Review Focus

1. **Siapa pun bisa menyalakan pompa.** URL `ts.net` publik; tanpa kunci, `POST /api/command` terbuka. Diuji di Task 1 Step 1.
2. **Backend mati saat laptop baru menyala.** `openDb` melempar `ECONNREFUSED` bila Postgres Laragon belum siap, dan proses keluar. Skrip start mengulang setelah jeda; diuji di Task 2 Step 5 dengan restart sungguhan.
3. **Laptop tidur saat layar ditutup.** Semua koneksi putus dan telemetri hilang. Diuji di Task 2 Step 5.
4. **Live update tidak lewat Funnel atau tidak membawa password.** `EventSource` ke `/api/stream` harus tetap mengalir lewat Funnel setelah login. Dicek di Task 3 Step 4.
5. **Funnel tidak bisa dijangkau dari luar di Windows.** Ada laporan Tailscale 1.102.1 di Windows 11 yang membuat Funnel hanya mendengar di IP Tailscale. Diuji dari HP memakai data seluler (bukan Wi-Fi rumah) di Task 3 Step 3.

---

### Task 1: Kunci dashboard dan API

**Files:**
- Modify: `backend/src/app.js` (parameter `password`, middleware sesudah route `/api/health`)
- Modify: `backend/src/index.js` (teruskan `DASHBOARD_PASSWORD`)
- Modify: `backend/README.md` (variabel `DASHBOARD_PASSWORD`)
- Test: `backend/test/app.test.js`

**Interfaces:**
- Produces: `createApp({ ..., password })`. `password` string opsional; kosong/undefined = tanpa kunci.

- [ ] **Step 1: Tulis tes yang gagal** `kunci: dashboard dan API butuh password, health tetap publik`. `setup()` menerima opsi `password` dan meneruskannya ke `createApp`, beserta `staticDir` sementara berisi `index.html` (buat dengan `mkdtempSync`, sudah diimpor di berkas ini). Dengan `password: 'rahasia'`:

```js
const auth = (p) => ({ authorization: 'Basic ' + Buffer.from(`operator:${p}`).toString('base64') });
assert.equal((await fetch(`${s.base}/api/health`)).status, 200);
const r = await fetch(`${s.base}/api/latest`);
assert.equal(r.status, 401);
assert.match(r.headers.get('www-authenticate'), /^Basic realm=/);
assert.equal((await fetch(`${s.base}/dashboard/`)).status, 401);
assert.equal((await post(s.base, { pump: true })).status, 401);
assert.equal(s.sent.length, 0);
assert.equal((await fetch(`${s.base}/api/latest`, { headers: auth('salah') })).status, 401);
assert.equal((await fetch(`${s.base}/api/latest`, { headers: auth('rahasia') })).status, 404); // lolos kunci, DB kosong
assert.equal((await fetch(`${s.base}/dashboard/`, { headers: auth('rahasia') })).status, 200);
```

Tes kedua `kunci: tanpa password perilaku lama`: `setup()` tanpa `password`, `GET /api/latest` → 404 (bukan 401).

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd backend && node --test test/app.test.js`
Expected: tes kunci FAIL (`/api/latest` membalas 404, bukan 401). Postgres Laragon harus menyala.

- [ ] **Step 3: Implementasi.** Di `createApp`, setelah route `/api/health`: bila `password` ada, pasang middleware untuk path yang diawali `/api` atau `/dashboard`. Middleware membaca header `authorization` `Basic`, mengambil bagian sesudah `:` pertama sebagai password (username bebas), membandingkan dengan `timingSafeEqual` (samakan panjang dulu), dan bila gagal membalas `401` + `WWW-Authenticate: Basic realm="IrriSense", charset="UTF-8"`. `index.js` meneruskan `process.env.DASHBOARD_PASSWORD`. Route `/api/node` di `index.js` didaftarkan sesudah `createApp`, jadi ikut terkunci.

- [ ] **Step 4: Jalankan semua tes**

Run: `cd backend && npm test`
Expected: semua PASS kecuali dua tes `content.test.js` yang sudah gagal sebelum plan ini karena perubahan pin yang belum di-commit (catat di laporan bila masih gagal).

- [ ] **Step 5: README.** Tambah `DASHBOARD_PASSWORD` ke daftar variabel: kosong = tanpa kunci (dev lokal), wajib selama Funnel aktif; username bebas.

- [ ] **Step 6: Commit**

```bash
git add backend/src/app.js backend/src/index.js backend/README.md backend/test/app.test.js
git commit -m "Backend: kunci dashboard dan API dengan password untuk akses publik"
```

---

### Task 2: Laptop menyala terus dan pulih sendiri

**Files:**
- Create: `backend/scripts/start-server.cmd`
- Modify: `backend/README.md` (subbagian "Menjalankan sebagai server")
- Local only: `backend/.env` (`DASHBOARD_PASSWORD`, dan variabel HiveMQ bila dipakai)

**Interfaces:**
- Produces: `backend/scripts/start-server.cmd`, dipanggil Task Scheduler saat login.

- [ ] **Step 1: `start-server.cmd`.** Pindah ke folder `backend` (relatif terhadap lokasi skrip, `%~dp0..`), lalu ulang tanpa henti: `npm start` dengan output ditambahkan ke `backend\data\server.log` (folder `backend/data/` sudah di-ignore), jeda 10 detik (`timeout /t 10 /nobreak`), mulai lagi. Pengulangan ini yang menunggu Postgres siap setelah boot dan menyalakan ulang backend bila crash.
- [ ] **Step 2: Uji skrip.** Matikan Laragon Postgres, jalankan skrip, lalu nyalakan Postgres.
Expected: `server.log` berisi beberapa `ECONNREFUSED`, lalu baris `IrriSense backend: http://localhost:3000` tanpa campur tangan. Hentikan skrip (Ctrl+C, lalu `Y`).
- [ ] **Step 3: Pengaturan Windows (pengguna).** Saat tersambung charger: tidak pernah sleep atau hibernate, dan menutup layar = tidak melakukan apa-apa. Perintahnya untuk dijalankan pengguna:

```
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setactive SCHEME_CURRENT
```

Atur juga jam aktif Windows Update supaya restart otomatis terjadi di luar jam demo.
- [ ] **Step 4: Auto start (pengguna).** Docker Desktop: aktifkan "Start Docker Desktop when you sign in" (container Mosquitto sudah `restart: unless-stopped`; lewati bila memakai HiveMQ). Laragon: aktifkan "Run Laragon when Windows starts" dan "Start All automatically". Backend: Task Scheduler, tugas baru saat logon yang menjalankan `backend\scripts\start-server.cmd`. Semua ini butuh login Windows; setelah restart, laptop harus sampai di desktop (login sendiri, atau aktifkan login otomatis dengan menyadari risikonya).
- [ ] **Step 5: Uji restart sungguhan.** Restart Windows, login, tunggu 2 menit tanpa menyentuh apa pun.
Expected: `curl http://localhost:3000/api/health` → `{"ok":true,"mqtt":true}`. Tutup layar laptop 10 menit (charger terpasang), buka lagi: baris `readings` tidak punya celah lebih dari ±10 detik pada rentang itu.
- [ ] **Step 6: README** subbagian "Menjalankan sebagai server": isi `.env`, skrip start, pengaturan Windows di atas.
- [ ] **Step 7: Commit**

```bash
git add backend/scripts/start-server.cmd backend/README.md
git commit -m "Backend: skrip start yang pulih sendiri untuk laptop sebagai server"
```

---

### Task 3: Buka lewat Tailscale Funnel

Instalasi, login akun Tailscale, dan izin Funnel di admin console dilakukan pengguna.

- [ ] **Step 1: Pasang Tailscale** untuk Windows dan login. Catat versinya (`tailscale version`).
- [ ] **Step 2: Nyalakan Funnel.** Run: `tailscale funnel --bg 3000`. Bila CLI memberi tautan untuk mengaktifkan HTTPS/Funnel di tailnet, buka dan setujui. `--bg` menyimpan pengaturan sehingga tetap aktif setelah restart.
Expected: `tailscale funnel status` menampilkan `https://<laptop>.<tailnet>.ts.net` → `http://127.0.0.1:3000`, ditandai Funnel on.
- [ ] **Step 3: Uji dari luar** (HP dengan data seluler, Wi-Fi mati; `<FUNNEL>` = URL di atas): buka `<FUNNEL>/api/health`.
Expected: `{"ok":true,"mqtt":true}`. Bila tidak terjangkau padahal status Funnel on, cek versi Tailscale (lihat Review Focus 5) dan coba versi lain sebelum mencari cara lain.
- [ ] **Step 4: Dashboard lewat Funnel.** Di HP yang sama buka `<FUNNEL>/dashboard/`, masukkan password.
Expected: angka hidup berganti tiap ±5 detik tanpa reload (SSE lewat Funnel); perintah pompa sampai ke ESP32 dalam ±2 detik; `<FUNNEL>/api/latest` tanpa login → 401.
- [ ] **Step 5: Setelah restart.** Ulangi Step 3 setelah uji restart di Task 2 Step 5. Expected: tetap terjangkau tanpa menjalankan perintah Funnel lagi.

---

### Task 4: Vercel mengarah ke dashboard di laptop

**Files:**
- Create: `landing/vercel.json`
- Delete: `landing/app/dashboard/` (halaman pengganti dari plan Vercel tidak lagi dipakai)

- [ ] **Step 1: Redirect.** `landing/vercel.json` dengan `redirects` dari `/dashboard` dan `/dashboard/` ke `<FUNNEL>/dashboard/`, `permanent: false`.
- [ ] **Step 2: Hapus halaman pengganti** `landing/app/dashboard/`. Lewat backend, `/dashboard/` tetap dashboard asli; lewat Vercel, redirect yang menangani. Kalimat API di `/spesifikasi/` ("Backend (Express) yang berjalan di laptop ...") tetap benar, jadi tidak diubah.
- [ ] **Step 3: Build.** Run: `cd landing && npm run build`. Expected: sukses, tidak ada route `/dashboard`.
- [ ] **Step 4: Commit, push, cek preview Vercel**

Run: `curl -sI <PREVIEW>/dashboard/ | grep -iE "^HTTP|^location"`
Expected: `307` ke `<FUNNEL>/dashboard/`.

```bash
git add landing/vercel.json
git rm -r landing/app/dashboard
git commit -m "Landing: dashboard di Vercel dialihkan ke laptop lewat Tailscale Funnel"
```
