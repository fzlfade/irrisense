#include <Arduino.h>
#include <Wire.h>
#include "config.h"
#include "controller.h"
#include "display.h"
#include "hw.h"
#include "moisture.h"
#if !(defined(BRINGUP) || defined(CALIBRATION_MODE) || defined(STANDALONE))
#include "net.h"
#include "offline_buffer.h"
#include "protocol.h"
#include "storage_spiffs.h"
#endif

#if defined(BRINGUP)
// ============================================================================
// MODE BRINGUP: cek wiring. PERINGATAN: LEPAS POMPA (atau putus kabel pompa dari relay)
// saat tes ini, karena relay akan hidup-mati sendiri tiap 3 detik.
// ============================================================================
static bool relayOn = false;

static void scanI2c() {
  Serial.println("Pindai I2C...");
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("  ditemukan: 0x%02X%s\n", addr,
                    (addr == 0x27 || addr == 0x3F) ? "  <- alamat LCD" : "");
      found++;
    }
  }
  if (!found) Serial.println("  TIDAK ADA perangkat I2C. Cek kabel SDA/SCL/VCC/GND LCD.");
  Serial.printf("config.h memakai LCD_ADDR = 0x%02X\n", LCD_ADDR);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  hwBegin();                                      // relay OFF paling awal, lalu LCD & sensor
  Serial.println("\n=== BRINGUP IrriSense (lepas pompa!) ===");
  scanI2c();
  char lines[4][21] = {"BRINGUP IrriSense   ", "LCD OK bila terbaca ", "Relay klik tiap 3 s ", "Lihat Serial Monitor"};
  hwLcdShow(lines);
}

void loop() {
  static uint32_t last = 0;
  uint32_t now = millis();
  if (last != 0 && now - last < 3000) return;
  last = now ? now : 1;

  relayOn = !relayOn;
  hwSetRelay(relayOn);
  Serial.println(relayOn ? "RELAY ON" : "RELAY OFF");

  float t = NAN, h = NAN;
  if (hwReadDht(t, h)) Serial.printf("DHT11: suhu=%.1f C  RH=%.0f %%\n", t, h);
  else Serial.println("DHT11: GAGAL");

  Serial.print("ADC mentah:");
  for (uint8_t i = 0; i < SOIL_COUNT; i++) Serial.printf("  S%u=%4d", i + 1, hwReadSoilAdc(i));
  Serial.println();
}

#elif defined(CALIBRATION_MODE)
// ============================================================================
// MODE KALIBRASI lewat Serial Monitor. Perintah: d (kering), w (basah), p (cetak hasil)
// ============================================================================
static int dryVal[SOIL_COUNT], wetVal[SOIL_COUNT];
static bool haveDry[SOIL_COUNT], haveWet[SOIL_COUNT];
static const int MIN_SPAN = 500;

static void readAveraged(int out[SOIL_COUNT]) {   // rata-rata 10 bacaan
  long sum[SOIL_COUNT] = {0};
  for (int n = 0; n < 10; n++) {
    for (uint8_t i = 0; i < SOIL_COUNT; i++) sum[i] += hwReadSoilAdc(i);
    delay(50);
  }
  for (uint8_t i = 0; i < SOIL_COUNT; i++) out[i] = (int)(sum[i] / 10);
}

static void printHelp() {
  Serial.println("\n=== KALIBRASI SENSOR TANAH ===");
  Serial.println("1. Sensor di UDARA (kering, jangan disentuh) lalu ketik  d  + Enter");
  Serial.println("2. Celup sensor ke AIR sampai garis batas sensor, lalu ketik  w  + Enter");
  Serial.println("3. Ketik  p  untuk melihat tabel dan blok siap-tempel ke src/config.h");
  Serial.println("(Anda boleh merekam d dan w berulang kali; nilai terakhir dipakai.)");
}

static bool sensorOk(uint8_t i) {
  return haveDry[i] && haveWet[i] && dryVal[i] > wetVal[i] && dryVal[i] - wetVal[i] >= MIN_SPAN;
}

static void printResult() {
  Serial.println("\nSensor   dry   wet  selisih  status");
  for (uint8_t i = 0; i < SOIL_COUNT; i++) {
    if (haveDry[i] && haveWet[i])
      Serial.printf("S%u     %5d %5d  %6d   %s\n", i + 1, dryVal[i], wetVal[i],
                    dryVal[i] - wetVal[i], sensorOk(i) ? "OK" : "BAD");
    else
      Serial.printf("S%u     %5s %5s  %6s   BAD (belum direkam)\n", i + 1,
                    haveDry[i] ? "ok" : "-", haveWet[i] ? "ok" : "-", "-");
  }
  Serial.println("\n// Tempel ke src/config.h menggantikan SOIL_CAL yang lama:");
  Serial.println("constexpr SensorCal SOIL_CAL[SOIL_COUNT] = {");
  for (uint8_t i = 0; i < SOIL_COUNT; i++) {
    bool rec = haveDry[i] && haveWet[i];
    Serial.printf("  {%d, %d},%s\n", rec ? dryVal[i] : 3000, rec ? wetVal[i] : 1200,
                  rec ? (sensorOk(i) ? "" : "  // BAD: selisih kecil/terbalik, periksa sensor")
                      : "  // S belum direkam (placeholder)");
  }
  Serial.println("};");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  hwBegin();
  printHelp();
}

void loop() {
  static uint32_t last = 0;
  while (Serial.available()) {
    char c = Serial.read();
    if (c == 'd') {
      readAveraged(dryVal);
      for (uint8_t i = 0; i < SOIL_COUNT; i++) haveDry[i] = true;
      Serial.print("KERING terekam:");
      for (uint8_t i = 0; i < SOIL_COUNT; i++) Serial.printf("  S%u=%d", i + 1, dryVal[i]);
      Serial.println();
    } else if (c == 'w') {
      readAveraged(wetVal);
      for (uint8_t i = 0; i < SOIL_COUNT; i++) haveWet[i] = true;
      Serial.print("BASAH terekam:");
      for (uint8_t i = 0; i < SOIL_COUNT; i++) Serial.printf("  S%u=%d", i + 1, wetVal[i]);
      Serial.println();
    } else if (c == 'p') {
      printResult();
    } else if (c == 'h' || c == '?') {
      printHelp();
    }
  }
  uint32_t now = millis();
  if (now - last >= 500) {
    last = now;
    for (uint8_t i = 0; i < SOIL_COUNT; i++) Serial.printf("S%u=%4d  ", i + 1, hwReadSoilAdc(i));
    Serial.println();
  }
}

#else
// ============================================================================
// MODE NORMAL (MQTT) dan MODE STANDALONE/bench (tanpa jaringan)
// ============================================================================
static PumpController ctrl(Thresholds{M_SET, M_MAX, MAX_RUN_MS});
static uint32_t lastTick = 0;

#ifdef STANDALONE
static void tick(uint32_t now) {
  int adc[SOIL_COUNT];
  for (uint8_t i = 0; i < SOIL_COUNT; i++) adc[i] = hwReadSoilAdc(i);
  MoistureResult m = aggregateMoisture(adc, SOIL_CAL, SOIL_COUNT);

  float temp = NAN, hum = NAN;
  if (!hwReadDht(temp, hum)) { temp = NAN; hum = NAN; }

  bool pump = ctrl.update(m, now);
  hwSetRelay(pump);

  Telemetry t{0, 0, 0, m.percent, m.validCount, temp, hum, pump, ctrl.mode(), false, ctrl.fault()};
  char lines[4][21];
  LcdStatus st{false, false, 0};
  st.standalone = true;
  formatLcd(t, st, lines);
  hwLcdShow(lines);

  Serial.printf("[%lu s]\n", (unsigned long)(now / 1000));
  for (uint8_t i = 0; i < SOIL_COUNT; i++) {
    float p = adcToMoisture(adc[i], SOIL_CAL[i]);
    if (std::isnan(p)) Serial.printf("  S%u adc=%4d  ---\n", i + 1, adc[i]);
    else Serial.printf("  S%u adc=%4d  %5.1f %%\n", i + 1, adc[i], p);
  }
  if (m.valid) Serial.printf("  rata-rata=%.1f %% (n=%u)", m.percent, m.validCount);
  else Serial.print("  rata-rata=--- (tidak ada sensor valid)");
  if (std::isnan(temp)) Serial.print("  suhu=---  RH=---");
  else Serial.printf("  suhu=%.1f C  RH=%.0f %%", temp, hum);
  Serial.printf("  pompa=%s fault=%d\n", pump ? "ON" : "OFF", (int)ctrl.fault());
}

void setup() {
  Serial.begin(115200);
  hwBegin();                                      // relay OFF paling awal
  Serial.println("\n=== BENCH IrriSense (tanpa Wi-Fi/MQTT) ===");
  lastTick = millis() - SENSOR_INTERVAL_MS;       // tik pertama langsung
}

void loop() {
  uint32_t now = millis();
  if (now - lastTick >= SENSOR_INTERVAL_MS) { lastTick = now; tick(now); }
}

#else  // ---------------- MODE NORMAL (MQTT) ----------------
static SpiffsLineStore store;
static OfflineBuffer* buffer = nullptr;
static uint32_t bootId = 0, seq = 0;

static void onCommand(const Command& c) { applyCommand(ctrl, c, millis()); }

static void tick(uint32_t now) {
  int adc[SOIL_COUNT];
  for (uint8_t i = 0; i < SOIL_COUNT; i++) adc[i] = hwReadSoilAdc(i);
  MoistureResult m = aggregateMoisture(adc, SOIL_CAL, SOIL_COUNT);

  float temp = NAN, hum = NAN;
  if (!hwReadDht(temp, hum)) { temp = NAN; hum = NAN; }

  bool pump = ctrl.update(m, now);
  hwSetRelay(pump);

  Telemetry t{bootId, seq++, netEpochMs(), m.percent, m.validCount, temp, hum,
              pump, ctrl.mode(), false, ctrl.fault()};
  char json[320];

  bool sent = false;
  if (netConnected()) {
    buffer->drain(DRAIN_PER_TICK, [](const std::string& l) { return netPublish(l.c_str()); });
    if (serializeTelemetry(t, json, sizeof json)) sent = netPublish(json);
  }
  if (!sent) {                                    // offline / publish gagal -> simpan ke SPIFFS
    t.buffered = true;
    if (serializeTelemetry(t, json, sizeof json)) buffer->push(json);
  }

  char lines[4][21];
  formatLcd(t, LcdStatus{netWifiConnected(), netConnected(), buffer->size()}, lines);
  hwLcdShow(lines);

  Serial.printf("[%lu] M=%.1f%% (n=%u) T=%.1f H=%.0f pump=%d mode=%s fault=%d buf=%u %s\n",
                (unsigned long)(now / 1000), m.percent, m.validCount, temp, hum, pump,
                ctrl.mode() == Mode::Auto ? "auto" : "manual", (int)ctrl.fault(),
                (unsigned)buffer->size(), sent ? "sent" : "buffered");
}

void setup() {
  Serial.begin(115200);
  hwBegin();                                      // relay OFF paling awal
  bootId = esp_random();
  if (!store.begin()) Serial.println("SPIFFS gagal");
  buffer = new OfflineBuffer(store, BUFFER_CAPACITY);
  netOnCommand(onCommand);
  netBegin();
  lastTick = millis() - SENSOR_INTERVAL_MS;       // tik pertama langsung
}

void loop() {
  netLoop();
  uint32_t now = millis();
  if (now - lastTick >= SENSOR_INTERVAL_MS) { lastTick = now; tick(now); }
}
#endif  // STANDALONE
#endif  // mode
