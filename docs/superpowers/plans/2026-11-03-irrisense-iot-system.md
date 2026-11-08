# IrriSense IoT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem penyiraman tetes otomatis vanili berbasis IoT (node ESP32 + broker MQTT + backend + dashboard web) yang memenuhi Tabel 4 dokumen D-02.

**Architecture:** Satu node ESP32 membaca sensor tanah (kapasitif, ADC1) dan DHT11 tiap 5 detik, menjalankan kontrol threshold dengan histeresis (60%/80%), menggerakkan relay→pompa, lalu mem-publish telemetri JSON ke broker MQTT. Bila Wi-Fi/broker putus, telemetri disimpan ke buffer SPIFFS (≥100 data) dan dikirim ulang setelah pulih. Backend Node.js men-subscribe, menyimpan ke SQLite, dan menyajikan REST + SSE ke dashboard HTML/Chart.js, termasuk perintah manual override lewat topik MQTT. Logika firmware dipisah ke library C++ murni agar diuji di host (`pio test -e native`); simulator node membuat backend/dashboard bisa diuji tanpa hardware.

**Tech Stack:** Firmware: C++ (Arduino-ESP32 core via PlatformIO), PubSubClient, Adafruit DHT, LiquidCrystal_I2C, ArduinoJson 7, SPIFFS, Unity. Backend: Node.js ≥20, Express, `mqtt`, better-sqlite3, `node:test`, aedes (test broker). Dashboard: HTML/JS + Chart.js. Broker: Mosquitto (dev, docker) / HiveMQ Cloud (prod).

**Spec:** `docs/spec/D-02_Sistem_Penyiraman_Tetes_Otomatis_pada_Perkebunan_Vanili_Berbasis_IoT.docx` (D-02, Bab II, V, VI) dan `docs/spec/Laporan_Keuangan_Sistem_Penyiraman_Tetes_Otomatis_pada_Perkebunan_Vanili_Berbasis_IoT.md` (BOM terbaru, total Rp756.966). Keduanya disalin ke repo di Task 1.

## Global Constraints

Nilai di bawah disalin dari D-02; setiap task wajib mematuhinya.

- ADC ESP32 12-bit, rentang 0–4095. Konversi (Pers. 1): `M(t) = (ADC_kering − ADC(t)) / (ADC_kering − ADC_basah) × 100%`.
- Kontrol (Pers. 2–3): pompa ON jika `M(t) < M_set`; OFF jika `M(t) >= M_max`; di antaranya mempertahankan status (histeresis). `M_set = 60%`, `M_max = 80%`.
- Interval pembacaan sensor: 5 detik. Rentang ukur 0%–100%. Akurasi sensor tanah ≤ ±5% (kalibrasi dua titik: udara & jenuh).
- Delay pengiriman MQTT ≤ 200 ms. Uptime ≥ 95% per hari. Buffer offline ≥ 100 data points di SPIFFS. Efisiensi air ≥ 30% lebih hemat vs manual.
- Tegangan sistem 5 V ± 5%, konsumsi total ≤ 10 W (termasuk pompa aktif). Pompa mini DC 5 V, debit nominal 80–120 mL/menit.
- Sensor: kapasitif soil moisture (analog 0–3.3 V), DHT11 (RH ±5%, suhu ±2 °C). LCD 20×4 I2C. Relay 1 channel, koil 5 V. ESP32 Wi-Fi 802.11 b/g/n.
- MQTT: port 1883 (dev) / 8883 TLS (prod); ESP32 = publisher, dashboard/backend = subscriber. Library firmware: PubSubClient, DHT, SPIFFS.
- Backend Node.js/Express, database SQLite, dashboard HTML/JS/Chart.js (Tabel 6).

### Keputusan atas ketidakkonsistenan spec (konfirmasi saat review)

1. **Delay**: Intisari menulis "<2 detik", Tabel 4 menulis "≤200 ms". Pakai **≤200 ms**, dinilai pada **p95**.
2. **DS18B20**: ada di Intisari/Tabel 5 tetapi tidak ada di flowchart, RAB D-02 maupun Laporan Keuangan. **Tidak diimplementasi** (hanya DHT11).
3. **Jumlah komponen** (Laporan Keuangan: 10 sensor tanah, 5 DHT11, 10 pompa, 1 relay, adaptor 3 A vs D-02: 1 pompa, adaptor 2 A): prototipe = **1 zona, 1 relay → 1 pompa, 1 DHT11, 6 sensor tanah** (ADC1: GPIO 36, 39, 34, 35, 32, 33; ADC2 tidak dipakai karena bentrok dengan Wi-Fi). Sensor/pompa sisanya cadangan. 10 pompa tidak dapat dinyalakan bersamaan dalam batas 10 W / 1 relay.
4. **Pers. (4) evapotranspirasi E(t)** disebut di §3.4 tetapi tidak pernah didefinisikan → **tidak diimplementasi**; suhu/RH udara hanya ditampilkan dan disimpan.
5. **Batas waktu nyala pompa** tidak ada di spec → ditambahkan `maxRunMs = 600000` (10 menit, dapat dikonfigurasi) sebagai pengaman reservoir kosong/emitter tersumbat. Bukan nilai dari spec.
6. **PlatformIO** dipakai menggantikan Arduino IDE karena mengizinkan unit test host; core Arduino-ESP32 dan library sama, sehingga hasilnya tetap dapat dibuka di Arduino IDE.
7. **PubSubClient tidak mendukung publish QoS 1** → telemetri QoS 0; perintah (subscribe) QoS 1. Backend membuang duplikat dengan kunci `(node, boot, seq)`.

## Kontrak Bersama (firmware ↔ backend)

Node id default `node1`. Semua topik di bawah `irrisense/node1/`.

| Topik | Arah | QoS | Retained | Isi |
|---|---|---|---|---|
| `telemetry` | ESP32 → broker | 0 | tidak | JSON telemetri |
| `status` | ESP32 → broker | 1 | **ya** | `"online"` saat connect; LWT `"offline"` |
| `cmd` | backend → ESP32 | 1 | **tidak (wajib)** | JSON perintah |

Telemetri (≤ 256 byte; `null` bila tidak tersedia):

```json
{"boot":3735928559,"seq":42,"ts":1762170000000,"moisture":63.5,"valid":4,
 "temp":28.0,"hum":65.0,"pump":true,"mode":"auto","buffered":false,"fault":"none"}
```

- `boot`: uint32 acak saat boot; `seq`: uint32 naik 1 per sampel (reset saat reboot). `ts`: epoch ms hasil NTP, `0` bila belum sinkron.
- `moisture`: rata-rata % dari sensor valid, `null` bila `valid == 0`. `mode`: `"auto"|"manual"`. `fault`: `"none"|"no_sensor"|"max_run"`.
- Perintah: `{"mode":"auto"|"manual","pump":true|false}`; minimal satu field; `pump` hanya dihormati bila mode sedang `manual`.

## Review Focus

Kelima kondisi ini tidak disebut spec tetapi paling mungkin terjadi di lapangan; tiap baris punya tes di task yang disebut.

1. **Sensor tanah lepas/macet (ADC 0 atau 4095) atau semua sensor invalid** → pompa OFF, `fault:"no_sensor"`, tampilan `---` (bukan 0%). Tes: Task 1, 2, 3.
2. **Pompa menyala terus** (reservoir kosong, emitter tersumbat, M tak pernah mencapai 80%) → berhenti setelah `maxRunMs`, tetap OFF sampai ada perintah mode; tetap benar saat `millis()` rollover. Tes: Task 2.
3. **Offline lebih lama dari 100 sampel (≈8,3 menit)** → data tertua dibuang, tidak crash, kirim ulang FIFO, dan buffer bertahan setelah reboot. Tes: Task 4.
4. **Payload rusak atau duplikat** (bukan JSON, field hilang, `moisture` di luar 0–100, replay setelah reconnect) → backend mengabaikan/ men-dedup tanpa crash; latensi negatif (jam miring) tidak masuk statistik. Tes: Task 5, 6.
5. **Perintah manual basi/gagal**: `cmd` retained tidak boleh menyalakan pompa setelah reboot (boot selalu OFF+auto); `POST /api/command` saat MQTT putus harus 503, bukan sukses palsu. Tes: Task 2, 7, 9.

---

## Struktur File

```
irrisense/
  docs/spec/                      # salinan D-02 & Laporan Keuangan
  docs/hardware/{wiring,calibration}.md
  docs/validation/acceptance.md
  firmware/
    platformio.ini
    lib/irrisense_core/           # C++ murni, diuji di host
      types.h  moisture.{h,cpp}  controller.{h,cpp}  protocol.{h,cpp}
      offline_buffer.{h,cpp}  display.{h,cpp}
    test/test_*/test_*.cpp        # Unity
    src/{main.cpp,hw.{h,cpp},net.{h,cpp},storage_spiffs.{h,cpp},config.h,secrets.example.h}
  backend/
    package.json
    src/{db,ingest,bridge,stats,app,index}.js
    public/{index.html,css/app.css,js/{format.js,app.js}}
    test/*.test.js
  tools/{sim-node.js,acceptance-report.js}
  infra/{docker-compose.yml,mosquitto.conf}
```

---

### Task 1: Firmware — konversi kelembapan tanah (+ scaffold repo)

**Files:**
- Create: `.gitignore` (isi: `node_modules/`, `.pio/`, `firmware/src/secrets.h`, `backend/data/`), `docs/spec/*` (salin dua dokumen spec), `firmware/platformio.ini`
- Create: `firmware/lib/irrisense_core/types.h`, `moisture.h`, `moisture.cpp`
- Test: `firmware/test/test_moisture/test_moisture.cpp`

**Interfaces:**
- Produces (`types.h`, namespace global, `#include <cstdint>`, `<cmath>`):
  `enum class Mode : uint8_t { Auto, Manual };`
  `enum class Fault : uint8_t { None, NoSensor, MaxRun };`
  `struct SensorCal { int adcDry; int adcWet; };`
  `struct MoistureResult { bool valid; float percent; uint8_t validCount; };`
  `struct Thresholds { float mSet = 60.0f; float mMax = 80.0f; uint32_t maxRunMs = 600000; };`
  `struct Telemetry { uint32_t boot; uint32_t seq; int64_t ts; float moisture; uint8_t valid; float temp; float hum; bool pump; Mode mode; bool buffered; Fault fault; };` (`NAN` = null)
  `struct Command { bool hasMode; Mode mode; bool hasPump; bool pump; };`
- Produces (`moisture.h`): `float adcToMoisture(int adc, SensorCal cal);` (NAN bila adc tak valid atau `adcDry <= adcWet`; hasil di-clamp 0–100) dan `MoistureResult aggregateMoisture(const int* adc, const SensorCal* cal, size_t n);` (rata-rata sensor valid).

- [ ] **Step 1: Tulis `platformio.ini`** dengan env `native` (platform `native`, `build_flags = -std=gnu++17`, `lib_deps = bblanchon/ArduinoJson@^7`, `test_framework = unity`) dan env `esp32dev` (platform `espressif32`, board `esp32dev`, framework `arduino`, lib_deps: PubSubClient, `adafruit/DHT sensor library`, `adafruit/Adafruit Unified Sensor`, `marcoschwartz/LiquidCrystal_I2C`, ArduinoJson@^7; `board_build.filesystem = spiffs`).
- [ ] **Step 2: Tulis tes gagal** (cal `{3000, 1200}`):

```cpp
void test_midpoint()      { TEST_ASSERT_FLOAT_WITHIN(0.01f, 50.0f, adcToMoisture(2100, {3000,1200})); }
void test_endpoints()     { TEST_ASSERT_EQUAL_FLOAT(0.0f, adcToMoisture(3000,{3000,1200}));
                            TEST_ASSERT_EQUAL_FLOAT(100.0f, adcToMoisture(1200,{3000,1200})); }
void test_clamped()       { TEST_ASSERT_EQUAL_FLOAT(0.0f, adcToMoisture(3500,{3000,1200}));
                            TEST_ASSERT_EQUAL_FLOAT(100.0f, adcToMoisture(1000,{3000,1200})); }
void test_stuck_adc_is_nan() { TEST_ASSERT_TRUE(isnan(adcToMoisture(0,{3000,1200})));
                               TEST_ASSERT_TRUE(isnan(adcToMoisture(4095,{3000,1200}))); }
void test_bad_cal_is_nan()   { TEST_ASSERT_TRUE(isnan(adcToMoisture(2000,{1200,1200})));
                               TEST_ASSERT_TRUE(isnan(adcToMoisture(2000,{1000,3000}))); }
void test_aggregate_mean_of_valid() { int a[3]={2100,0,2640}; SensorCal c[3]={{3000,1200},{3000,1200},{3000,1200}};
  auto r=aggregateMoisture(a,c,3); TEST_ASSERT_TRUE(r.valid); TEST_ASSERT_EQUAL_UINT8(2,r.validCount);
  TEST_ASSERT_FLOAT_WITHIN(0.01f,35.0f,r.percent); }   // (50 + 20) / 2
void test_aggregate_none_valid() { int a[2]={0,4095}; SensorCal c[2]={{3000,1200},{3000,1200}};
  auto r=aggregateMoisture(a,c,2); TEST_ASSERT_FALSE(r.valid); TEST_ASSERT_EQUAL_UINT8(0,r.validCount); TEST_ASSERT_TRUE(isnan(r.percent)); }
```

- [ ] **Step 3: Jalankan, pastikan gagal.** Run: `cd firmware && pio test -e native -f test_moisture` → Expected: FAIL (compile error `adcToMoisture` belum ada).
- [ ] **Step 4: Implementasi** `adcToMoisture` / `aggregateMoisture` di `moisture.cpp` sesuai Pers. (1); ADC valid = `0 < adc < 4095`.
- [ ] **Step 5: Jalankan** `pio test -e native -f test_moisture` → Expected: 7 PASS.
- [ ] **Step 6: Commit** — `git init` lalu `git add -A && git commit -m "feat(firmware): moisture conversion and aggregation"`.

---

### Task 2: Firmware — kontroler pompa (histeresis, mode, pengaman)

**Files:**
- Create: `firmware/lib/irrisense_core/controller.h`, `controller.cpp`
- Test: `firmware/test/test_controller/test_controller.cpp`

**Interfaces:**
- Consumes: `types.h`, `MoistureResult`, `Thresholds`, `Command` dari Task 1.
- Produces (`controller.h`):
  `class PumpController { public: explicit PumpController(Thresholds t = {}); bool update(const MoistureResult& m, uint32_t nowMs); void setMode(Mode m, uint32_t nowMs); void manualPump(bool on, uint32_t nowMs); bool pumpOn() const; Mode mode() const; Fault fault() const; };`
  `void applyCommand(PumpController& c, const Command& cmd, uint32_t nowMs);`
  `update()` mengembalikan status pompa.

Aturan: boot = pompa OFF, `Mode::Auto`, `Fault::None`. `setMode()` selalu mematikan pompa dan menghapus fault. Mode manual mengabaikan threshold & validitas sensor. `maxRunMs` berlaku di kedua mode; setelah terpotong, `Fault::MaxRun` bertahan (pompa tetap OFF) sampai `setMode()` dipanggil. Selisih waktu memakai aritmetika `uint32_t` tanpa tanda.

- [ ] **Step 1: Tulis tes gagal** (`valid(x)` = `MoistureResult{true,x,4}`; `bad` = `{false,NAN,0}`):
  - `test_boot_state`: `!pumpOn()`, `mode()==Auto`, `fault()==None`.
  - `test_on_below_set`: `update(valid(59.9f),0)` → true.
  - `test_hysteresis_sequence`: 55→ON; 70→ON; 79.9→ON; 80.0→OFF; 70→OFF; 60.0→OFF (bukan `< 60`); 59.9→ON.
  - `test_invalid_sensor_forces_off` (Review Focus 1): ON pada 50; `update(bad)` → OFF dan `fault()==NoSensor`; `update(valid(50))` → ON lagi, `fault()==None`.
  - `test_max_run_cutoff` (Review Focus 2): ON di t=0 (M=50); t=599999 masih ON; t=600000 OFF + `MaxRun`; t=700000 M=50 tetap OFF.
  - `test_max_run_survives_millis_rollover`: ON di t=4294967000; update di `(uint32_t)(4294967000u+600000u)` → OFF + `MaxRun`.
  - `test_setmode_clears_fault`: setelah latch, `setMode(Auto,t)` → `fault()==None`; update M=50 → ON, timer mulai ulang.
  - `test_setmode_turns_pump_off`: ON lalu `setMode(Manual,t)` → OFF.
  - `test_manual_ignores_thresholds`: Manual; `manualPump(true)`; `update(valid(90))` → ON; `manualPump(false)`; `update(valid(10))` → OFF.
  - `test_manual_respects_max_run`.
  - `test_reboot_inside_band_stays_off` (Review Focus 5): controller baru, `update(valid(70))` → OFF.
  - `test_apply_command`: `{mode:Manual,pump:true}` → ON; `{hasPump,pump:true}` saat Auto → tetap OFF; `{mode:Auto}` → OFF.
- [ ] **Step 2: Jalankan** `pio test -e native -f test_controller` → Expected: FAIL (header tidak ada).
- [ ] **Step 3: Implementasi** `PumpController` + `applyCommand` di `controller.cpp` sesuai aturan di atas; simpan `onSinceMs_` untuk batas waktu.
- [ ] **Step 4: Jalankan** `pio test -e native -f test_controller` → Expected: 12 PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(firmware): pump controller with hysteresis and run limit"` (setelah `git add -A`).

---

### Task 3: Firmware — serialisasi telemetri & parser perintah

**Files:**
- Create: `firmware/lib/irrisense_core/protocol.h`, `protocol.cpp`
- Test: `firmware/test/test_protocol/test_protocol.cpp`

**Interfaces:**
- Consumes: `Telemetry`, `Command`, `Mode`, `Fault` (Task 1).
- Produces: `size_t serializeTelemetry(const Telemetry& t, char* out, size_t cap);` (mengembalikan panjang tanpa NUL; 0 bila `cap` kurang) dan `bool parseCommand(const char* json, size_t len, Command& out);`

- [ ] **Step 1: Tulis tes gagal.** Parse output `serializeTelemetry` dengan ArduinoJson di tes:
  - `test_serialize_fields`: `Telemetry{boot=7,seq=42,ts=1762170000000,moisture=63.5f,valid=4,temp=28.0f,hum=65.0f,pump=true,mode=Auto,buffered=false,fault=None}` → dokumen berisi `moisture==63.5`, `valid==4`, `pump==true`, `mode=="auto"`, `fault=="none"`, `ts==1762170000000`, `seq==42`, `buffered==false`.
  - `test_nan_becomes_null` (Review Focus 1): `moisture=NAN`, `temp=NAN`, `hum=NAN`, `fault=NoSensor` → ketiganya `isNull()`, `fault=="no_sensor"`.
  - `test_fits_256_bytes`: kasus nilai maksimum (`boot=UINT32_MAX`, `seq=UINT32_MAX`, `fault=MaxRun`) → panjang ≤ 256; `cap=10` → 0.
  - `test_parse_command_ok`: `{"mode":"manual","pump":true}` → `hasMode, Manual, hasPump, pump`; `{"pump":false}` → `hasMode==false, hasPump`; `{"mode":"auto"}`.
  - `test_parse_command_rejects`: `{"mode":"turbo"}`, `not json`, `{}`, `{"pump":"yes"}` → semuanya `false`.
- [ ] **Step 2: Jalankan** `pio test -e native -f test_protocol` → Expected: FAIL.
- [ ] **Step 3: Implementasi** dengan ArduinoJson 7 (`JsonDocument`, `serializeJson` ke buffer); urutan key sama dengan Kontrak Bersama; float dibulatkan 1 desimal.
- [ ] **Step 4: Jalankan** → Expected: 5 PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(firmware): telemetry serializer and command parser"`.

---

### Task 4: Firmware — buffer offline

**Files:**
- Create: `firmware/lib/irrisense_core/offline_buffer.h`, `offline_buffer.cpp`
- Test: `firmware/test/test_offline_buffer/test_offline_buffer.cpp` (berisi `FakeStore : LineStore` di memori)

**Interfaces:**
- Produces:
  `class LineStore { public: virtual ~LineStore() = default; virtual void append(const std::string& line) = 0; virtual std::vector<std::string> readAll() = 0; virtual void rewrite(const std::vector<std::string>& lines) = 0; };`
  `class OfflineBuffer { public: OfflineBuffer(LineStore& store, size_t capacity = 100); void push(const std::string& jsonLine); size_t size() const; size_t drain(size_t maxItems, const std::function<bool(const std::string&)>& send); };`
  `drain` mengirim FIFO, berhenti pada `send` pertama yang mengembalikan `false`, hanya menghapus yang terkirim, mengembalikan jumlah terkirim.

Desain: file append-only agar SPIFFS tidak ditulis ulang tiap 5 detik; `rewrite` (kompaksi) hanya bila baris di store > `2 × capacity` atau setelah `drain`.

- [ ] **Step 1: Tulis tes gagal:**
  - `test_push_and_size`: 3 push → `size()==3`.
  - `test_overflow_drops_oldest` (Review Focus 3): `capacity=100`, push "m1".."m105" → `size()==100`; drain semua mengembalikan urutan "m6".."m105".
  - `test_drain_stops_on_failure`: 5 item, `send` gagal pada item ke-3 → `drain` mengembalikan 2, `size()==3`, drain berikutnya mulai dari item ke-3.
  - `test_drain_respects_max_items`: 20 item, `maxItems=10` → mengembalikan 10, `size()==10`.
  - `test_survives_reboot`: push 105 lewat satu `OfflineBuffer`, buat `OfflineBuffer` baru di `FakeStore` yang sama → `size()==100`, item pertama "m6".
  - `test_compaction_bounds_store`: setelah 1000 push, `FakeStore.readAll().size() <= 200`.
- [ ] **Step 2: Jalankan** `pio test -e native -f test_offline_buffer` → Expected: FAIL.
- [ ] **Step 3: Implementasi** dengan `std::deque<std::string>` sebagai cermin di memori; load dari `store.readAll()` (ambil `capacity` terakhir) di konstruktor.
- [ ] **Step 4: Jalankan** → Expected: 6 PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(firmware): persistent offline ring buffer"`.

---

### Task 5: Backend — skema database & parser telemetri

**Files:**
- Create: `backend/package.json` (`"type":"module"`, script `"test":"node --test"`; deps: express, mqtt, better-sqlite3, chart.js; devDeps: aedes), `backend/src/db.js`, `backend/src/ingest.js`
- Test: `backend/test/db.test.js`, `backend/test/ingest.test.js`

**Interfaces:**
- Produces (`ingest.js`): `parseTelemetry(payload: Buffer|string, nodeId: string, recvMs: number): Reading|null`
  `Reading = { nodeId, boot, seq, ts, sentTs, recvTs, latencyMs: number|null, moisture: number|null, valid, temp: number|null, hum: number|null, pump: boolean, mode: 'auto'|'manual', buffered: boolean, fault: 'none'|'no_sensor'|'max_run' }`
  `ts` = `sentTs > 0 ? sentTs : recvMs`; `latencyMs` = `recvMs − sentTs` bila `!buffered && sentTs > 0 && hasil >= 0`, selain itu `null`.
- Produces (`db.js`): `openDb(path: string): Database` (`':memory:'` didukung; membuat tabel `readings` dengan `UNIQUE(node_id, boot, seq)`), `insertReading(db, r: Reading): boolean` (false bila duplikat), `queryReadings(db, {nodeId, from, to, limit}): Reading[]` (urut `ts` naik), `latestReading(db, nodeId): Reading|null`.

- [ ] **Step 1: Tulis tes gagal:**
  - `ingest`: payload valid Kontrak Bersama dengan `ts=1000`, `recvMs=1120` → `latencyMs===120`, `ts===1000`.
  - `ts:0` → `ts===recvMs`, `latencyMs===null`; `buffered:true` → `latencyMs===null`; `ts` lebih besar dari `recvMs` (jam miring) → `latencyMs===null` (Review Focus 4).
  - Menolak (`null`): `'not json'`, `'{}'`, `moisture:101`, `moisture:-1`, `mode:'turbo'`, `pump:'yes'`, `fault:'x'`, `seq:-1`; `moisture:null` diterima.
  - `db`: insert lalu query mengembalikan data sama; insert kedua dengan `(nodeId,boot,seq)` sama → `false` dan jumlah baris tetap; `queryReadings` menghormati `from/to/limit` dan urutan naik; `latestReading` pada DB kosong → `null`.
- [ ] **Step 2: Jalankan** `cd backend && npm install && npm test` → Expected: FAIL (modul tidak ada).
- [ ] **Step 3: Implementasi** `parseTelemetry` (validasi tipe ketat, tanpa throw) dan fungsi `db.js` dengan better-sqlite3 prepared statements, `INSERT OR IGNORE` untuk dedup.
- [ ] **Step 4: Jalankan** `npm test` → Expected: semua PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(backend): sqlite storage and telemetry parsing"`.

---

### Task 6: Backend — jembatan MQTT

**Files:**
- Create: `backend/src/bridge.js`
- Test: `backend/test/bridge.test.js` (broker `aedes` in-process di port acak)

**Interfaces:**
- Consumes: `parseTelemetry` (Task 5).
- Produces: `createBridge({ url: string, nodeId: string, onReading: (r: Reading) => void, onStatus: (online: boolean) => void, now?: () => number }): { publishCommand(cmd: {mode?: string, pump?: boolean}): Promise<void>, connected(): boolean, close(): Promise<void> }`
  Subscribe `irrisense/<nodeId>/telemetry` (QoS 0), `irrisense/<nodeId>/status` (QoS 1). `publishCommand` publish ke `cmd` QoS 1 **retain=false**; reject dengan `Error('mqtt disconnected')` bila tidak terhubung.

- [ ] **Step 1: Tulis tes gagal** (klien `mqtt` terpisah bertindak sebagai ESP32):
  - telemetri valid → `onReading` terpanggil sekali dengan `nodeId` benar.
  - payload `garbage` → `onReading` tidak terpanggil dan bridge tetap hidup (publish valid berikutnya diterima) (Review Focus 4).
  - `status` `"online"`/`"offline"` → `onStatus(true/false)`.
  - `publishCommand({mode:'manual',pump:true})` → klien ESP32 palsu menerima JSON tersebut pada `irrisense/node1/cmd` dengan `packet.retain === false` dan `qos === 1` (Review Focus 5).
  - `publishCommand` setelah `close()` → reject `mqtt disconnected`.
- [ ] **Step 2: Jalankan** `npm test -- test/bridge.test.js` → Expected: FAIL.
- [ ] **Step 3: Implementasi** `bridge.js` dengan paket `mqtt` (`reconnectPeriod: 2000`); `connected()` = `client.connected`.
- [ ] **Step 4: Jalankan** → Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(backend): MQTT bridge with command publishing"`.

---

### Task 7: Backend — REST API & SSE

**Files:**
- Create: `backend/src/app.js`, `backend/src/index.js`
- Test: `backend/test/app.test.js` (server di port 0, `fetch` bawaan Node, `bridge` palsu)

**Interfaces:**
- Consumes: `openDb/insertReading/queryReadings/latestReading` (Task 5); objek bridge (`publishCommand`, `connected`) (Task 6).
- Produces: `createApp({ db, bridge, bus: EventEmitter, nodeId: string, staticDir?: string }): express.Application`.
  - `GET /api/health` → `{ok:true, mqtt:boolean}`
  - `GET /api/latest` → reading terbaru, atau 404 `{error:'no data'}`
  - `GET /api/readings?from=&to=&limit=` → array ascending; `limit` default 500, maks 5000; nilai non-numerik → 400
  - `POST /api/command` body `{mode?, pump?}` → 200 `{sent:true}`; 400 bila kosong/`mode` bukan `auto|manual`/`pump` bukan boolean; 503 `{error:'mqtt disconnected'}` bila bridge menolak
  - `GET /api/stream` → SSE; event `reading` (JSON reading) dan `status` (`{online:boolean}`) dari `bus` (`bus.emit('reading', r)`, `bus.emit('status', bool)`)
  - `index.js` merangkai env: `MQTT_URL` (default `mqtt://localhost:1883`), `NODE_ID` (`node1`), `DB_PATH` (`data/irrisense.db`), `PORT` (`3000`); `onReading` → `insertReading` lalu `bus.emit` hanya bila baris baru.

- [ ] **Step 1: Tulis tes gagal:** health; latest 404 lalu 200 setelah insert; readings terurut dan menghormati `limit`, `limit=abc` → 400; command valid memanggil `bridge.publishCommand` dengan body yang sama; command `{}` → 400; `{mode:'turbo'}` → 400; bridge menolak → 503 (Review Focus 5); stream menerima event `reading` setelah `bus.emit`.
- [ ] **Step 2: Jalankan** `npm test -- test/app.test.js` → Expected: FAIL.
- [ ] **Step 3: Implementasi** `createApp` (express.json, route di atas, `express.static(staticDir)` bila diberikan) dan `index.js`.
- [ ] **Step 4: Jalankan** → Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(backend): REST API and SSE stream"`.

---

### Task 8: Backend — statistik (latensi, uptime, air)

**Files:**
- Create: `backend/src/stats.js`; modify `backend/src/app.js` (tambah route)
- Test: `backend/test/stats.test.js`

**Interfaces:**
- Consumes: `queryReadings` (Task 5).
- Produces: `computeStats(db, { nodeId, from, to, intervalSec = 5, flowMlPerMin = 100 }): { count, latency: { n, p50, p95, max } | null, uptimePct, pump: { onSeconds, estimatedMl } }`
  - `p95` = nearest-rank pada `latencyMs` non-null.
  - `uptimePct` = slot `intervalSec` dalam `[from,to)` yang berisi ≥1 reading (berdasarkan `ts`) ÷ total slot × 100.
  - `onSeconds` = jumlah reading `pump===true` × `intervalSec`; `estimatedMl = onSeconds/60 × flowMlPerMin`.
  - Route `GET /api/stats?from=&to=` memakai `FLOW_ML_PER_MIN` env (default 100).

- [ ] **Step 1: Tulis tes gagal:** 10 slot, 9 terisi → `uptimePct===90`; latensi `[100,110,120,130,200]` → `p50===120`, `p95===200`, `max===200`; semua `latencyMs` null → `latency===null`; 12 reading pompa ON → `onSeconds===60`, `estimatedMl===100`; DB kosong → `count===0`, `uptimePct===0` (tanpa NaN/throw).
- [ ] **Step 2: Jalankan** `npm test -- test/stats.test.js` → Expected: FAIL.
- [ ] **Step 3: Implementasi** `computeStats`; tambah route `/api/stats` (400 bila `from/to` tidak numerik atau `to <= from`).
- [ ] **Step 4: Jalankan** `npm test` → Expected: seluruh suite PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(backend): latency, uptime and water statistics"`.

---

### Task 9: Simulator node, infra broker, dan tes E2E

**Files:**
- Create: `tools/sim-node.js`, `infra/docker-compose.yml`, `infra/mosquitto.conf`
- Test: `backend/test/e2e.test.js`

**Interfaces:**
- Consumes: `createBridge` (Task 6), `createApp`, `openDb`, `insertReading` (Task 5, 7).
- Produces (`sim-node.js`): `createSimNode({ url, nodeId = 'node1', intervalMs = 5000, startMoisture = 70, now = Date.now }): { start(), stop(), state }`. Perilaku meniru firmware: telemetri sesuai Kontrak Bersama; kelembapan turun 0,5/tik saat pompa OFF dan naik 1,5/tik saat ON; histeresis 60/80; subscribe `cmd` dan menghormati aturan mode manual; publish `status` online + LWT offline; boot selalu OFF+auto. CLI: `node tools/sim-node.js --url mqtt://localhost:1883 --interval 5000`.
- `mosquitto.conf`: listener 1883, `allow_anonymous true` (khusus dev; komentar berisi langkah `password_file` dan listener 8883 TLS untuk produksi). `docker-compose.yml`: service `mosquitto` (`eclipse-mosquitto:2`) memetakan 1883.

- [ ] **Step 1: Tulis tes E2E gagal** (aedes + `createApp` + `createSimNode` interval 50 ms, `startMoisture=62`): (a) dalam ≤ 3 detik ada reading di DB; (b) setelah `POST /api/command {mode:'manual',pump:false}` reading berikutnya `mode==='manual'`, `pump===false`; (c) `{pump:true}` → `pump===true` pada reading berikutnya; (d) `{mode:'auto'}` → pompa OFF dan kembali mengikuti histeresis; (e) `GET /api/stats` memberi `latency.p95` angka (bukan null) dan `uptimePct > 0`; (f) hentikan broker → `POST /api/command` → 503.
- [ ] **Step 2: Jalankan** `npm test -- test/e2e.test.js` → Expected: FAIL.
- [ ] **Step 3: Implementasi** `sim-node.js` (ESM, export `createSimNode`, CLI hanya bila dijalankan langsung) dan file infra.
- [ ] **Step 4: Jalankan** `npm test` → Expected: PASS. Opsional manual: `docker compose -f infra/docker-compose.yml up -d`, `node tools/sim-node.js`, `MQTT_URL=mqtt://localhost:1883 node backend/src/index.js`, lalu `curl localhost:3000/api/latest` → JSON reading.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: node simulator, broker config and e2e test"`.

---

### Task 10: Dashboard web

**Files:**
- Create: `backend/public/index.html`, `backend/public/css/app.css`, `backend/public/js/format.js`, `backend/public/js/app.js`; modify `backend/src/app.js` (serve `node_modules/chart.js/dist` di `/vendor/chart`)
- Test: `backend/test/format.test.js`

**Interfaces:**
- Consumes: `/api/latest`, `/api/readings`, `/api/command`, `/api/stream` (Task 7).
- Produces (`format.js`, ES module, tanpa DOM):
  `formatMoisture(v: number|null): string` (`63.5 %`; `null` → `---`), `formatTemp(v)` (`28.0 °C`/`---`), `formatHum(v)` (`65 %`/`---`), `pumpLabel(pump: boolean, mode: string): string` (`ON · AUTO`, `OFF · MANUAL`), `faultMessage(fault: string): string|null` (`none` → `null`; `no_sensor` → `Sensor tanah tidak terbaca — pompa dimatikan`; `max_run` → `Pompa berhenti: melewati batas waktu nyala — cek reservoir/emitter`), `toSeries(readings): {t:number[], moisture:(number|null)[], temp:(number|null)[], hum:(number|null)[]}`.

Isi halaman: kartu nilai terkini (kelembapan tanah, suhu, RH, pompa+mode, status node online/offline), banner fault, grafik kelembapan (Chart.js, garis ambang 60 dan 80) dan grafik suhu/RH, pemilih rentang 1 jam/6 jam/24 jam, kontrol override (toggle Auto/Manual; tombol Pompa ON/OFF nonaktif saat Auto). Pembaruan lewat SSE; `EventSource` otomatis reconnect. Titik `null` ditampilkan sebagai celah pada grafik, bukan 0.

- [ ] **Step 1: Tulis tes gagal** `format.test.js`: `formatMoisture(63.5)==='63.5 %'`, `formatMoisture(null)==='---'`, `pumpLabel(true,'auto')==='ON · AUTO'`, `faultMessage('none')===null`, `faultMessage('max_run')` berisi `batas waktu`, `toSeries([{ts:1,moisture:null,temp:28,hum:65}]).moisture[0]===null`.
- [ ] **Step 2: Jalankan** `npm test -- test/format.test.js` → Expected: FAIL.
- [ ] **Step 3: Implementasi** `format.js`, lalu halaman/CSS/`app.js` (Chart.js lokal dari `/vendor/chart/chart.umd.js`, tanpa CDN; tata letak responsif, lebar 390 px tanpa scroll horizontal).
- [ ] **Step 4: Jalankan** `npm test` → Expected: PASS.
- [ ] **Step 5: Verifikasi visual**: jalankan broker, simulator (`--interval 1000`), dan backend; ambil screenshot Playwright lebar 390 dan 1280 ke `docs/validation/dashboard-{390,1280}.png`. Expected: kartu terisi angka, grafik bergaris, garis ambang 60/80 terlihat; klik "Manual" lalu "Pompa ON" → kartu pompa berubah `ON · MANUAL` dalam ≤ 2 detik; hentikan simulator → status `offline`.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(dashboard): live monitoring and manual override"`.

---

### Task 11: Firmware — glue perangkat (LCD, sensor, Wi-Fi/MQTT, SPIFFS)

**Files:**
- Create: `firmware/lib/irrisense_core/display.h`, `display.cpp`; `firmware/src/config.h`, `secrets.example.h`, `hw.h`, `hw.cpp`, `net.h`, `net.cpp`, `storage_spiffs.h`, `storage_spiffs.cpp`, `main.cpp`
- Test: `firmware/test/test_display/test_display.cpp`

**Interfaces:**
- Consumes: semua modul core (Task 1–4).
- Produces (`display.h`): `struct LcdStatus { bool wifi; bool mqtt; size_t buffered; };` dan `void formatLcd(const Telemetry& t, const LcdStatus& s, char out[4][21]);` — setiap baris persis 20 karakter + NUL, dipad spasi, dipotong bila lebih:
  - L0 `Soil : 63.5 %` (`---` bila NaN) · L1 `Temp : 28.0C Hum:65%` (`--.-`/`--` bila NaN) · L2 `Pump:ON  Mode:AUTO` / `Pump:OFF Mode:MANUAL` · L3 `W:OK M:OK Buf:  0` (`NO` bila putus), tetapi bila `fault != None`: `FAULT: NO SENSOR` / `FAULT: MAX RUN`.
- Produces (`hw.h`): `void hwBegin(); int hwReadSoilAdc(size_t idx); bool hwReadDht(float& tempC, float& hum); void hwSetRelay(bool on); void hwLcdShow(const char lines[4][21]);`
- Produces (`net.h`): `void netBegin(); void netLoop(); bool netConnected(); bool netPublish(const char* json); void netOnCommand(void (*cb)(const Command&)); int64_t netEpochMs();`
- Produces (`storage_spiffs.h`): `class SpiffsLineStore : public LineStore` (file `/buffer.jsonl`).
- `config.h`: pin (soil `{36,39,34,35,32,33}`, DHT11 `4`, relay `26` dengan `RELAY_ACTIVE_LOW = true`, SDA `21`, SCL `22`, LCD `0x27`), `SENSOR_INTERVAL_MS = 5000`, `SOIL_COUNT = 6`, `SoilCal` array per sensor (`{3000,1200}` placeholder sampai Task 12), `DRAIN_PER_TICK = 10`, topik sesuai Kontrak Bersama.

Perilaku `main.cpp` (non-blocking, berbasis `millis()`): boot → `hwSetRelay(false)` **sebelum apapun** → `netBegin()`; tiap 5 s: baca ADC semua sensor → `aggregateMoisture` → DHT11 (gagal → `NAN`) → `controller.update` → `hwSetRelay` → bentuk `Telemetry` (`seq++`, `ts = netEpochMs()`) → bila `netConnected()`: `drain(DRAIN_PER_TICK, netPublish)` lalu publish live; bila tidak/publish gagal: `buffer.push(serialize(buffered=true))` → `hwLcdShow(formatLcd(...))`. Callback perintah memanggil `applyCommand`. MQTT connect: LWT `status="offline"` retained, publish `"online"` retained, subscribe `cmd` QoS 1, tidak pernah meng-apply pesan retained saat connect. Wi-Fi/MQTT reconnect tanpa `delay()` panjang.

- [ ] **Step 1: Tulis tes gagal** `test_display`: tiap baris `strlen==20`; L0 diawali `Soil : 63.5 %`; NaN → `Soil : --- %`; L1 NaN → diawali `Temp : --.-C Hum:--%`; L2 pompa ON auto diawali `Pump:ON  Mode:AUTO`, OFF manual diawali `Pump:OFF Mode:MANUAL`; L3 normal diawali `W:OK M:OK Buf:  0`, `wifi=false` → `W:NO`; `fault=NoSensor` → diawali `FAULT: NO SENSOR`; `buffered=100` tidak melewati 20 karakter.
- [ ] **Step 2: Jalankan** `pio test -e native -f test_display` → Expected: FAIL.
- [ ] **Step 3: Implementasi** `formatLcd` (`snprintf` + pad).
- [ ] **Step 4: Jalankan** `pio test -e native` → Expected: seluruh tes firmware PASS.
- [ ] **Step 5: Implementasi glue** (`hw`, `net`, `storage_spiffs`, `main.cpp`) sesuai perilaku di atas; salin `secrets.example.h` ke `secrets.h` (berisi `WIFI_SSID`, `WIFI_PASS`, `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`).
- [ ] **Step 6: Verifikasi kompilasi**: `pio run -e esp32dev` → Expected: `SUCCESS`, penggunaan flash < 90%.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(firmware): device glue for ESP32 (sensors, relay, LCD, MQTT, SPIFFS)"`.

---

### Task 12: Hardware — perakitan, kalibrasi, uji bangku

**Files:**
- Create: `docs/hardware/wiring.md`, `docs/hardware/calibration.md`
- Modify: `firmware/platformio.ini` (env `esp32dev_cal` dengan `-DCALIBRATION_MODE`), `firmware/src/main.cpp` (cabang `#ifdef CALIBRATION_MODE`: tiap 1 detik cetak rata-rata 16 sampel ADC tiap sensor ke Serial), `firmware/src/config.h` (nilai `SoilCal` hasil kalibrasi)

**Interfaces:** Consumes pin map `config.h` (Task 11). Produces nilai `SoilCal[6]` final.

- [ ] **Step 1: Tulis `wiring.md`**: tabel pin (sesuai `config.h`), sensor tanah di 3.3 V (agar keluaran ≤ 3.3 V), ESP32 VIN dari adaptor 5 V, pompa dari 5 V lewat kontak relay (COM/NO), dioda flyback (mis. 1N4007) paralel pompa, GND bersama, enclosure 16×14×4 cm dengan kabel duct.
- [ ] **Step 2: Rakit di breadboard**, cek multimeter: rail 5 V terukur **4.75–5.25 V** (5 V ± 5%) dengan pompa ON; ESP32 tidak reset saat pompa menyala; relay **tidak berbunyi/klik saat boot** (jika klik, balik nilai `RELAY_ACTIVE_LOW` atau pindah pin).
- [ ] **Step 3: Kalibrasi dua titik** (`pio run -e esp32dev_cal -t upload && pio device monitor`): catat nilai ADC tiap sensor di udara kering (`ADC_kering`) dan di tanah jenuh air (`ADC_basah`), 3 kali ulang, ambil rata-rata; isi `SoilCal[]`. Syarat: `ADC_kering > ADC_basah` dengan selisih ≥ 500 untuk tiap sensor; sensor yang tidak memenuhi dicadangkan (diganti dari 4 sensor sisa).
- [ ] **Step 4: Uji bangku firmware penuh** (`pio run -e esp32dev -t upload`), backend + broker berjalan:
  - Celup sensor ke air → dalam ≤ 2 siklus (10 s) `moisture ≥ 80` dan pompa OFF; keringkan → `moisture < 60` dan pompa ON; di antara keduanya pompa tidak berubah.
  - Cabut semua sensor → LCD `---`, `fault:"no_sensor"`, pompa OFF.
  - Matikan Wi-Fi AP 2 menit → LCD `M:NO`, `Buf` naik; nyalakan → data `buffered:true` muncul di dashboard berurutan, `Buf` kembali 0.
  - Kirim `cmd` manual dari dashboard → pompa mengikuti; reset ESP32 → pompa OFF + mode auto.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "docs(hardware): wiring, calibration values and bench test record"`.

---

### Task 13: Validasi terhadap Tabel 4

**Files:**
- Create: `tools/acceptance-report.js`, `docs/validation/acceptance.md`
- Test: `backend/test/acceptance.test.js`

**Interfaces:**
- Consumes: respons `GET /api/stats` (Task 8).
- Produces: `evaluateAcceptance(stats: StatsResponse): Array<{ no: number, spec: string, target: string, measured: string, pass: boolean }>` untuk baris yang dapat diukur dari data (3: `latency.p95 ≤ 200`; 12: `uptimePct ≥ 95`; 4: median selisih `ts` antar reading berurutan 5000 ± 500 ms); dan `waterSavingPct(manualMl: number, autoMl: number): number` = `(manualMl − autoMl) / manualMl × 100` (melempar bila `manualMl <= 0`; dipakai baris 11, lulus bila ≥ 30). CLI: `node tools/acceptance-report.js --url http://localhost:3000 --from <ms> --to <ms>` mencetak tabel PASS/FAIL.

- [ ] **Step 1: Tulis tes gagal:** `p95=180` → baris 3 `pass===true`; `p95=250` → `false`; `p95` null → `pass===false` dan `measured==='n/a'`; `uptimePct=94.9` → baris 12 `false`, `95` → `true`; `waterSavingPct(1000,700)===30`; `waterSavingPct(0,0)` melempar.
- [ ] **Step 2: Jalankan** `npm test -- test/acceptance.test.js` → Expected: FAIL.
- [ ] **Step 3: Implementasi** `evaluateAcceptance`, `waterSavingPct`, dan CLI.
- [ ] **Step 4: Jalankan** `npm test` → Expected: PASS.
- [ ] **Step 5: Tulis `acceptance.md`**: satu tabel untuk ke-13 baris Tabel 4 (nomor, target, metode, alat, hasil, lulus/tidak). Baris yang dinilai manual: 1 akurasi (5 sampel tanah dengan fraksi kejenuhan dikenal 0/25/50/75/100%, selisih |M − referensi| ≤ 5), 2 rentang (0–100%), 5 DHT11 (banding hygrometer), 6 dan 7 (multimeter + pengukur daya USB, total ≤ 10 W dengan pompa ON), 8–9 (log pompa menyala pada < 60 dan mati pada ≥ 80), 10 debit (gelas ukur 1 menit, 80–120 mL), 11 efisiensi (dua petak/periode setara, manual vs otomatis, air diukur gelas ukur; `waterSavingPct`), 13 buffer (putus jaringan ≥ 8,5 menit → ≥ 100 data pulih setelah tersambung).
- [ ] **Step 6: Eksekusi uji lapangan 24 jam** pada prototipe, jalankan `acceptance-report.js` untuk jendela itu, lampirkan keluaran ke `acceptance.md`. Expected: baris 3, 4, 12 PASS; baris yang gagal dicatat beserta tindak lanjut.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(validation): acceptance evaluation against D-02 table 4"`.

---

## Self-Review

- **Cakupan spec:** Pers. 1 → T1; Pers. 2–3 + histeresis → T2; arsitektur 3 lapis, MQTT, flowchart (baca → konversi → keputusan → publish → dashboard → tunggu) → T3, T6, T11; offline buffering SPIFFS ≥100 → T4, T11; dashboard real-time + grafik + manual override + penyimpanan histori → T5, T7, T10; LCD 20×4 → T11; target Tabel 4 (13 baris) → T12 (hardware), T13 (validasi) dan pengukuran otomatis di T8. Tidak ada celah; DS18B20 dan Pers. (4) sengaja dikeluarkan (Keputusan 2 dan 4).
- **Konsistensi tipe:** `Telemetry`, `Command`, `MoistureResult`, `Thresholds` didefinisikan sekali di T1 dan dipakai identik di T2, T3, T11; `Reading` (T5) dipakai T6–T9; topik/payload hanya didefinisikan di Kontrak Bersama.
- **Review Focus:** kelima butir punya tes di task yang ditunjuk (T1–T4, T5–T7, T9).
- **Proporsi:** kode di plan terbatas pada tes dan signature; badan fungsi dibiarkan ke implementer.
