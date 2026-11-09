/**
 * Isi halaman Spesifikasi. Semua nilai diambil dari repo, dan tes backend/test/content.test.js membandingkannya
 * dengan sumbernya: tes gagal bila berbeda. Bila alat berubah, ubah sumbernya dulu, lalu samakan berkas ini.
 */

/** Dari firmware/src/config.h. */
export const firmware = {
  mSet: 60,
  mMax: 80,
  maxRunMs: 600000,
  sensorIntervalMs: 5000,
  bufferCapacity: 100,
  drainPerTick: 10,
  soilPins: [36, 39, 34, 35, 32, 33],
  dhtPin: 4,
  relayPin: 26,
  relayActiveLow: true,
  i2cSda: 21,
  i2cScl: 22,
  lcdAddr: 0x27,
  nodeId: "node1",
} as const;

/** Label baris di board untuk sensor tanah S1 sampai S6, dari docs/hardware/perkabelan.md. */
export const soilBoardLabels = ["VP", "VN", "D34", "D35", "D32", "D33"] as const;

export type Komponen = { nama: string; keterangan: string };

/** Dari daftar items di backend/prototipe/scene.js; urutannya sama dengan nomor penanda di prototipe 3D. */
export const komponen: readonly Komponen[] = [
  { nama: "ESP32 + base board", keterangan: "1 buah, di dalam casing" },
  { nama: "LCD I2C 20×4", keterangan: "1 buah, di tutup casing" },
  { nama: "Sensor kelembapan tanah", keterangan: "10 buah dibeli, 6 terpasang, 4 cadangan" },
  { nama: "Casing sensor tanah", keterangan: "10 buah, 1 per sensor" },
  { nama: "Sensor DHT11", keterangan: "6 dibeli, 1 terpasang di tiang" },
  { nama: "Relay 1 channel", keterangan: "1 buah, di dalam casing" },
  { nama: "Mini pompa 5 VDC", keterangan: "1 buah, mengalirkan air dari tandon" },
  { nama: "Adaptor 5 VDC 2 A", keterangan: "1 buah, menyuplai jalur pompa (ESP32 lewat USB)" },
  { nama: "Enclosure 16 × 14 × 4 cm", keterangan: "1 buah, wadah elektronik" },
  { nama: "Kabel duct", keterangan: "1 meter, merapikan kabel sensor" },
  { nama: "Selang irigasi tetes + emitter", keterangan: "1 set, satu emitter per tanaman" },
  { nama: "Kabel jumper, PCB prototipe", keterangan: "di dalam casing (tidak terlihat)" },
];

export type Topik = { akhiran: string; isi: string };

/** Topik MQTT irrisense/<node>/<akhiran>, dari firmware/src/config.h dan firmware/README.md. */
export const topikMqtt: readonly Topik[] = [
  {
    akhiran: "telemetry",
    isi: `Telemetri JSON tiap ${firmware.sensorIntervalMs / 1000} detik: kelembapan tanah rata-rata, suhu, kelembapan udara, pompa, mode, FAULT, dan waktu.`,
  },
  {
    akhiran: "status",
    isi: "online atau offline. Disimpan broker (retained); bila ESP32 putus, broker mengirim offline sendiri (LWT).",
  },
  {
    akhiran: "cmd",
    isi: "Perintah dari dashboard: mode Auto atau Manual, dan pompa nyala atau mati (hanya di mode Manual). Tidak disimpan broker.",
  },
];

/** Isi tiap baris LCD 20 × 4 dan pesan FAULT-nya, dari firmware/lib/irrisense_core/display.cpp. */
export const lcdBaris = [
  { isi: "Kelembapan tanah rata-rata", tulisan: ["Soil"] },
  { isi: "Suhu dan kelembapan udara (DHT11)", tulisan: ["Temp", "Hum"] },
  { isi: "Status pompa dan mode", tulisan: ["Pump", "Mode"] },
  { isi: "Wi-Fi, MQTT, dan jumlah bacaan di buffer; atau pesan FAULT", tulisan: ["W", "M", "Buf"] },
] as const;

export const faultLcd = { maxRun: "FAULT: MAX RUN", noSensor: "FAULT: NO SENSOR" } as const;

/** Batas dan nilai bawaan API, dari backend/src/app.js (aliran air bawaan juga di backend/src/index.js). */
export const apiBatas = { limitBawaan: 500, limitMaks: 5000, aliranMlPerMenit: 100 } as const;

export type Rute = { metode: "GET" | "POST"; alamat: string; parameter?: string; isi: string };

/** Rute /api di backend/src/app.js dan backend/src/index.js (isi statistik dari backend/src/stats.js). */
export const api: readonly Rute[] = [
  { metode: "GET", alamat: "/api/health", isi: "Server menyala dan status sambungan ke broker MQTT." },
  { metode: "GET", alamat: "/api/node", isi: "Node sedang online atau tidak, menurut pesan status MQTT terakhir." },
  { metode: "GET", alamat: "/api/latest", isi: "Bacaan terakhir dari node." },
  {
    metode: "GET",
    alamat: "/api/readings",
    parameter: "?from&to&limit",
    isi: `Riwayat bacaan dalam rentang waktu; limit bawaan ${apiBatas.limitBawaan}, paling banyak ${apiBatas.limitMaks}.`,
  },
  {
    metode: "GET",
    alamat: "/api/stats",
    parameter: "?from&to",
    isi: `Jumlah bacaan, latensi (p50, p95, maks), uptime, lama pompa menyala, dan perkiraan air terpakai (bawaan ${apiBatas.aliranMlPerMenit} ml per menit).`,
  },
  {
    metode: "POST",
    alamat: "/api/command",
    parameter: '{"mode", "pump"}',
    isi: "Meneruskan perintah mode atau pompa ke ESP32 lewat MQTT.",
  },
  {
    metode: "GET",
    alamat: "/api/stream",
    isi: "Aliran langsung (Server-Sent Events): bacaan baru dan status online node.",
  },
];

export type ModeFirmware = { env: string; isi: string };

/** Env PlatformIO di firmware/platformio.ini; yang pertama adalah bawaan (default_envs). */
export const modeFirmware: readonly ModeFirmware[] = [
  { env: "esp32dev", isi: "Firmware utama: sensor, pompa, LCD, Wi-Fi, dan MQTT. Butuh pengaturan Wi-Fi dan broker (secrets.h)." },
  { env: "bringup", isi: "Cek perkabelan: pindai I2C, LCD, relay, DHT11, dan ADC mentah. Lepas pompa saat tes ini." },
  { env: "esp32dev_cal", isi: "Kalibrasi dua titik sensor tanah lewat Serial Monitor (perintah d, w, p)." },
  {
    env: "bench",
    isi: `Firmware utama tanpa jaringan: sensor, histeresis ${firmware.mSet}/${firmware.mMax} %, relay, LCD, dan Serial.`,
  },
];
