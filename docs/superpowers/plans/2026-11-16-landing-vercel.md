# Landing di Vercel: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing IrriSense (termasuk prototipe 3D yang di-embed) bisa dibuka publik di Vercel, sementara backend, database, dan dashboard tetap di laptop.

**Architecture:** `landing/` sudah `output: "export"` (HTML statis), jadi Vercel cukup membangun dan menyajikannya. Masalahnya, landing memakai tiga alamat yang sekarang hanya disajikan Express: `/prototipe/` (iframe di hero dan bagian Cara), `/vendor/three/...` (Three.js untuk prototipe), dan `/dashboard/`. Prototipe murni simulasi di browser, jadi berkasnya disalin ke `landing/public/` saat build. Dashboard butuh backend, jadi di build Vercel `/dashboard/` berisi halaman singkat yang menjelaskan bahwa dashboard berjalan lokal. Di laptop, Express mendaftarkan `/dashboard`, `/prototipe`, dan `/vendor/three` **sebelum** berkas landing, jadi dashboard dan prototipe asli tetap menang.

**Tech Stack:** Next.js 16 static export, Vercel (Git integration, repo `fzlfade/irrisense`), Three.js 0.160.0.

**Spec:** Tidak ada dokumen spec terpisah. Sumbernya permintaan pengguna (2026-11-16): "Vercel cuma landing". Broker MQTT diatur di plan terpisah `2026-11-16-hosting-hivemq.md`; kedua plan tidak saling bergantung.

## Global Constraints

- Perilaku lokal tidak berubah: `npm start` di `backend/` tetap menyajikan landing di `/`, dashboard asli di `/dashboard/`, prototipe di `/prototipe/`.
- Versi Three.js di landing **persis** `0.160.0`, sama dengan `backend/package.json`.
- Berkas hasil salinan tidak di-commit; sumber kebenarannya tetap `backend/prototipe/` dan `design/tokens.css`.
- Tanpa env, secret, atau API di Vercel. Situs Vercel murni statis.
- Kerja UI dan teks mengikuti `CLAUDE.md`: baca `.ux-profile.md`, skill antislop, dan `page-patterns` sebelum menulis halaman; lolos `viewports` 375 px dan 1280 px; `ux-audit` sebelum selesai.

## Review Focus

1. **Build Vercel tidak bisa membaca berkas di luar `landing/`.** `prebuild` membaca `../design/tokens.css` dan `../backend/prototipe/`. Pengaturan Vercel "Include files outside the Root Directory" harus aktif; dicek di Task 3 Step 3.
2. **`/prototipe` tanpa garis miring.** `index.html` prototipe memuat `scene.js` secara relatif. Kalau tersaji di `/prototipe` (tanpa `/`), browser memuat `/scene.js` dan scene kosong. Harus redirect ke `/prototipe/`; dicek di Task 3 Step 4.
3. **Dashboard asli tertimpa di laptop.** Halaman pengganti `/dashboard/` tidak boleh muncul saat lewat backend. Dicek di Task 2 Step 5.
4. **Versi Three.js bergeser.** Kalau `landing` memakai versi lain, prototipe di Vercel berbeda dari lokal. Dikunci di Task 1 Step 1.
5. **Teks spesifikasi tidak benar lagi.** Bagian API di `/spesifikasi/` menulis "Backend (Express) menyajikan halaman ini"; di Vercel itu salah. Diperbaiki di Task 2 Step 4.

---

### Task 1: Prototipe 3D ikut di build landing

**Files:**
- Create: `landing/scripts/copy-prototipe.mjs`
- Modify: `landing/package.json` (devDependency `three`, `prebuild`/`predev`)
- Modify: `landing/.gitignore`

**Interfaces:**
- Produces di `landing/public/` (lalu `landing/out/`): `prototipe/{index.html,scene.js,sim.js,stroked-toon.js,style.css}`, `vendor/three/build/three.module.min.js`, `vendor/three/examples/jsm/controls/OrbitControls.js`, `vendor/three/examples/jsm/utils/BufferGeometryUtils.js`, `vendor/three/examples/jsm/effects/OutlineEffect.js`, `dashboard/css/tokens.css`. Jalur ini sama persis dengan yang dipakai `backend/prototipe/index.html`, jadi berkas prototipe tidak diubah.

- [ ] **Step 1: Kunci Three.js.** `cd landing && npm install --save-dev --save-exact three@0.160.0`.
- [ ] **Step 2: `copy-prototipe.mjs`.** Salin semua berkas di `../backend/prototipe/` ke `public/prototipe/`, tiga addon di atas dan `three.module.min.js` dari `node_modules/three/` ke `public/vendor/three/`, serta `../design/tokens.css` ke `public/dashboard/css/tokens.css`. Pakai `cpSync`/`copyFileSync` + `mkdirSync({ recursive: true })`; berkas sumber yang hilang harus membuat build gagal (biarkan error-nya naik). Cek dulu dengan `grep "from '" node_modules/three/examples/jsm/{controls/OrbitControls,utils/BufferGeometryUtils,effects/OutlineEffect}.js`: kalau ada addon yang mengimpor berkas addon lain, salin juga berkas itu.
- [ ] **Step 3: Jalankan otomatis.** `prebuild` dan `predev` menjadi `node scripts/sync-tokens.mjs && node scripts/copy-prototipe.mjs`.
- [ ] **Step 4: Abaikan hasil salinan.** Tambah ke `landing/.gitignore`: `/public/prototipe/`, `/public/vendor/`, `/public/dashboard/css/`.
- [ ] **Step 5: Build dan cek berkas**

Run: `cd landing && npm run build && ls out/prototipe out/vendor/three/build out/dashboard/css`
Expected: build sukses; ketiga folder berisi berkas di daftar Interfaces.

- [ ] **Step 6: Cek di browser tanpa backend.** `npm run serve`, buka `/` dan `/prototipe/`.
Expected: iframe hero menampilkan scene 3D, `/prototipe/` bisa diputar dan live test jalan, konsol tanpa error 404/module. Tutup server `serve` setelahnya.

- [ ] **Step 7: Commit**

```bash
git add landing/scripts/copy-prototipe.mjs landing/package.json landing/package-lock.json landing/.gitignore
git commit -m "Landing: prototipe 3D ikut ter-build agar bisa jalan tanpa backend"
```

---

### Task 2: Halaman `/dashboard/` untuk situs publik

**Files:**
- Create: `landing/app/dashboard/page.tsx` (+ `page.module.css` bila perlu)
- Modify: `landing/app/spesifikasi/page.tsx:295` (kalimat pengantar bagian API)

**Interfaces:**
- Consumes: `SiteHeader`, `SiteFooter`, dan pola halaman `app/spesifikasi/page.tsx` yang sudah ada.

- [ ] **Step 1: Baca aturan UI.** `.ux-profile.md`, skill antislop (umumkan mode sesuai `CLAUDE.md`), `page-patterns` (sebutkan nama polanya), `copy`, `empty-states`.
- [ ] **Step 2: Tulis halaman.** Isinya fakta berikut, teks final mengikuti skill copy: dashboard membaca data langsung dari alat, jadi hanya bisa dibuka di laptop yang menjalankan backend IrriSense; tautan utama ke `/prototipe/` (simulasi yang bisa dicoba sekarang) dan tautan ke `/spesifikasi/`. `metadata.title` `Dashboard`; tambahkan `robots: { index: false }` karena halaman ini cuma penjelasan.
- [ ] **Step 3: Viewport.** Cek 375 px dan 1280 px: tanpa scroll horizontal, tautan bisa diketuk (min 44 px).
- [ ] **Step 4: Perbaiki teks spesifikasi.** Pengantar bagian API menjadi kalimat yang benar di Vercel maupun lokal, misalnya: backend (Express) di laptop menyajikan dashboard dan alamat berikut.
- [ ] **Step 5: Pastikan lokal tidak berubah**

Run: `cd landing && npm run build`, lalu `cd ../backend && npm start`, buka `http://localhost:3000/dashboard/` dan `http://localhost:3000/prototipe/`
Expected: `/dashboard/` tetap dashboard asli (grafik dan status node), bukan halaman pengganti; prototipe tetap jalan. Hentikan backend setelahnya.

- [ ] **Step 6: `ux-audit`**, perbaiki temuan, lalu commit.

```bash
git add landing/app/dashboard landing/app/spesifikasi/page.tsx
git commit -m "Landing: halaman dashboard untuk situs publik, teks API disesuaikan"
```

---

### Task 3: Deploy ke Vercel

Langkah akun dilakukan pengguna (agen tidak membuat akun atau memberi izin OAuth).

- [ ] **Step 1: Push branch** berisi Task 1–2 ke GitHub.
- [ ] **Step 2: Import project** di vercel.com → Add New Project → repo `fzlfade/irrisense`.
- [ ] **Step 3: Atur project:** Root Directory `landing`, Framework Next.js, perintah build dan output bawaan, **Include files outside the Root Directory: aktif**. Deploy.
Expected: log build mencetak `tokens.css disalin` dan build sukses. Kalau gagal karena `../design` atau `../backend` tidak ditemukan, pengaturan ini belum aktif.
- [ ] **Step 4: Cek URL preview** (`<PREVIEW>` = alamat `*.vercel.app` dari Vercel)

Run: `curl -sI <PREVIEW>/ <PREVIEW>/spesifikasi/ <PREVIEW>/prototipe/ <PREVIEW>/dashboard/ <PREVIEW>/vendor/three/build/three.module.min.js | grep -E "^HTTP|^location"` dan `curl -sI <PREVIEW>/prototipe | grep -E "^HTTP|^location"`
Expected: lima alamat pertama `200`; `/prototipe` tanpa garis miring `308` ke `/prototipe/`. Kalau bukan 308, tambahkan `vercel.json` di `landing/` dengan `"trailingSlash": true` dan ulangi.

- [ ] **Step 5: Cek di browser** pada URL preview: hero 3D tampil, `/prototipe/` jalan, konsol bersih, tampilan 375 px dan 1280 px rapi. Tutup tab uji.
- [ ] **Step 6: Produksi.** Merge ke `main`; Vercel men-deploy produksi otomatis. Ulangi Step 4 pada domain produksi.
