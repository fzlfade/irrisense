# Backend + Dashboard IrriSense

Menerima telemetri MQTT dari ESP32, menyimpannya ke PostgreSQL, dan menyajikan dashboard web.

## Menjalankan (semua di laptop)
1. Broker MQTT: `cd infra && docker compose up -d` (Docker Desktop harus menyala).
2. PostgreSQL: nyalakan lewat Laragon (**Start All**). Buat database sekali saja:
   `psql -h localhost -U postgres -c "CREATE DATABASE irrisense" -c "CREATE DATABASE irrisense_test"`
   (psql ada di `C:\laragon\bin\postgresql\postgresql\bin`). Tabel dibuat otomatis saat backend start.
3. Landing page (sekali, atau setiap isinya berubah): `cd landing && npm install && npm run build`. Hasilnya di `landing/out/`.
4. Backend: `cd backend && npm install && npm start`
5. Buka http://localhost:3000 (landing page), http://localhost:3000/dashboard/ (dashboard), dan http://localhost:3000/prototipe/ (prototipe 3D dengan live test).

Prototipe 3D (`backend/prototipe/`) memakai Three.js dari `node_modules` (tanpa internet). Live test-nya simulasi di browser yang meniru logika `PumpController` firmware (`prototipe/sim.js`, dites di `test/sim.test.js`), bukan data dari alat. File lama `docs/prototype/prototipe-3d.html` tetap ada karena dipakai untuk membuat gambar banner.

Bila `landing/out/` belum ada, backend tetap jalan dan `/` diarahkan ke dashboard. Tema warna ada di `design/tokens.css`; setelah mengubahnya jalankan `npm run sync:tokens` di `backend/` dan di `landing/`.

Variabel bisa diisi di `backend/.env` (dibaca otomatis oleh `npm start`, sudah di-.gitignore). Variabel opsional: `DATABASE_URL` (default `postgres://postgres@localhost:5432/irrisense`; tambahkan password bila Postgres Anda memakainya), `MQTT_URL` (default `mqtt://localhost:1883`), `NODE_ID` (`node1`), `PORT` (`3000`), `FLOW_ML_PER_MIN` (`100`).

`DASHBOARD_PASSWORD`: bila diisi, `/dashboard` dan `/api/*` meminta password (username bebas); `/api/health`, landing, dan prototipe tetap terbuka. Kosongkan untuk dev lokal, **wajib** diisi selama backend dibuka ke internet (misalnya lewat Tailscale Funnel), karena dashboard bisa menyalakan pompa.

## Menjalankan sebagai server (laptop menyala terus)
Untuk membuka dashboard ke internet lewat Tailscale Funnel. Isi `backend/.env` minimal dengan `DASHBOARD_PASSWORD=...`.

1. `scripts/start-server.cmd` menjalankan `npm start` terus-menerus: bila backend berhenti (misalnya Postgres belum siap saat Windows baru menyala), skrip menunggu 10 detik lalu mencoba lagi. Log ada di `data/server.log`.
2. Task Scheduler: buat tugas yang berjalan **saat login** dan menjalankan `backend\scripts\start-server.cmd`.
3. Docker Desktop: aktifkan *Start Docker Desktop when you sign in* (container Mosquitto sudah `restart: unless-stopped`). Laragon: aktifkan *Run Laragon when Windows starts* dan *Start All automatically*.
4. Daya (charger terpasang): jangan tidur, jangan hibernate, tutup layar tidak melakukan apa-apa. Jalankan di PowerShell:
   `powercfg /change standby-timeout-ac 0`, `powercfg /change hibernate-timeout-ac 0`,
   `powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0`, lalu `powercfg /setactive SCHEME_CURRENT`.
5. Windows Update: atur jam aktif agar restart otomatis tidak terjadi saat demo. Setelah restart, semua baru jalan lagi setelah ada yang login ke Windows.

## Tes
`npm test` (26 tes). Tes database memakai PostgreSQL asli (`irrisense_test`, schema acak per tes yang dibuang setelahnya); ubah lewat `TEST_DATABASE_URL`. Postgres harus menyala.

## API
`GET /api/health` · `/api/latest` · `/api/readings?from&to&limit` · `/api/stats?from&to` · `/api/node` · `/api/stream` (SSE) · `POST /api/command {mode?, pump?}`

Catatan: latensi MQTT dihitung dari `ts` ESP32 (NTP) dan jam laptop. Bila jam laptop tertinggal dari NTP, latensi negatif dibuang (tampil `–`). Sinkronkan jam Windows agar statistik latensi terisi.
