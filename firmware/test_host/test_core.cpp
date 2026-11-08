// Tes host (tanpa ESP32): g++ lihat README. Memakai assert sederhana.
#include <cassert>
#include <cstdio>
#include <cstring>
#include <ArduinoJson.h>
#include "controller.h"
#include "display.h"
#include "moisture.h"
#include "offline_buffer.h"
#include "protocol.h"

#define CHECK(c) do { if (!(c)) { printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #c); fails++; } } while (0)
static int fails = 0;
static MoistureResult V(float x) { return {true, x, 4}; }
static MoistureResult BAD() { return {false, NAN, 0}; }
struct FakeStore : LineStore {
  std::vector<std::string> v;
  void append(const std::string& l) override { v.push_back(l); }
  std::vector<std::string> readAll() override { return v; }
  void rewrite(const std::vector<std::string>& l) override { v = l; }
};

int main() {
  SensorCal c{3000, 1200};
  // --- moisture
  CHECK(fabsf(adcToMoisture(2100, c) - 50.0f) < 0.01f);
  CHECK(adcToMoisture(3000, c) == 0.0f && adcToMoisture(1200, c) == 100.0f);
  CHECK(adcToMoisture(3500, c) == 0.0f && adcToMoisture(1000, c) == 100.0f);
  CHECK(std::isnan(adcToMoisture(0, c)) && std::isnan(adcToMoisture(4095, c)));
  CHECK(std::isnan(adcToMoisture(2000, {1200, 1200})) && std::isnan(adcToMoisture(2000, {1000, 3000})));
  // sensor yang kering-nya saturasi 4095: 4095 = kering (0 %), 0 tetap macet, kalibrasi {0,0} diabaikan
  { SensorCal s{4095, 2100};
    CHECK(adcToMoisture(4095, s) == 0.0f && std::isnan(adcToMoisture(0, s)));
    CHECK(fabsf(adcToMoisture(3000, s) - 100.0f * (4095 - 3000) / (4095 - 2100)) < 0.01f);
    CHECK(std::isnan(adcToMoisture(4095, {0, 0})) && std::isnan(adcToMoisture(2000, {0, 0}))); }
  { int a[3] = {4095, 4095, 2100}; SensorCal cs[3] = {{4095, 2100}, {0, 0}, {4095, 2100}};
    auto r = aggregateMoisture(a, cs, 3);
    CHECK(r.valid && r.validCount == 2 && fabsf(r.percent - 50.0f) < 0.01f); }
  { int a[3] = {2100, 0, 2640}; SensorCal cs[3] = {c, c, c};
    auto r = aggregateMoisture(a, cs, 3);
    CHECK(r.valid && r.validCount == 2 && fabsf(r.percent - 35.0f) < 0.01f); }
  { int a[2] = {0, 4095}; SensorCal cs[2] = {c, c};
    auto r = aggregateMoisture(a, cs, 2); CHECK(!r.valid && r.validCount == 0 && std::isnan(r.percent)); }

  // --- controller
  { PumpController p; CHECK(!p.pumpOn() && p.mode() == Mode::Auto && p.fault() == Fault::None);
    CHECK(p.update(V(59.9f), 0)); }
  { PumpController p; CHECK(p.update(V(55), 0)); CHECK(p.update(V(70), 1)); CHECK(p.update(V(79.9f), 2));
    CHECK(!p.update(V(80.0f), 3)); CHECK(!p.update(V(70), 4)); CHECK(!p.update(V(60.0f), 5)); CHECK(p.update(V(59.9f), 6)); }
  { PumpController p; p.update(V(50), 0);
    CHECK(!p.update(BAD(), 1) && p.fault() == Fault::NoSensor);
    CHECK(p.update(V(50), 2) && p.fault() == Fault::None); }
  { PumpController p; p.update(V(50), 0);
    CHECK(p.update(V(50), 599999)); CHECK(!p.update(V(50), 600000) && p.fault() == Fault::MaxRun);
    CHECK(!p.update(V(50), 700000));
    p.setMode(Mode::Auto, 700001); CHECK(p.fault() == Fault::None); CHECK(p.update(V(50), 700002)); }
  { PumpController p; uint32_t t0 = 4294967000u; p.update(V(50), t0);
    CHECK(!p.update(V(50), (uint32_t)(t0 + 600000u)) && p.fault() == Fault::MaxRun); }
  { PumpController p; p.update(V(50), 0); p.setMode(Mode::Manual, 1); CHECK(!p.pumpOn()); }
  { PumpController p; p.setMode(Mode::Manual, 0); p.manualPump(true, 0);
    CHECK(p.update(V(90), 1)); p.manualPump(false, 2); CHECK(!p.update(V(10), 3));
    p.manualPump(true, 4); CHECK(!p.update(V(10), 4 + 600000) && p.fault() == Fault::MaxRun); }
  { PumpController p; CHECK(!p.update(V(70), 0)); }
  { PumpController p;
    applyCommand(p, {true, Mode::Manual, true, true}, 0); CHECK(p.pumpOn());
    applyCommand(p, {true, Mode::Auto, false, false}, 1); CHECK(!p.pumpOn());
    applyCommand(p, {false, Mode::Auto, true, true}, 2); CHECK(!p.pumpOn()); }

  // --- protocol
  { Telemetry t{7, 42, 1762170000000LL, 63.5f, 4, 28.0f, 65.0f, true, Mode::Auto, false, Fault::None};
    char o[300]; size_t n = serializeTelemetry(t, o, sizeof o); CHECK(n > 0);
    printf("%s\n", o);
    JsonDocument d; CHECK(!deserializeJson(d, o));
    CHECK(d["moisture"] == 63.5 && d["valid"] == 4 && d["pump"] == true && d["seq"] == 42);
    CHECK(!strcmp(d["mode"], "auto") && !strcmp(d["fault"], "none") && d["ts"].as<long long>() == 1762170000000LL);
    t.moisture = NAN; t.temp = NAN; t.hum = NAN; t.fault = Fault::NoSensor;
    serializeTelemetry(t, o, sizeof o); JsonDocument e; deserializeJson(e, o);
    CHECK(e["moisture"].isNull() && e["temp"].isNull() && e["hum"].isNull() && !strcmp(e["fault"], "no_sensor"));
    Telemetry m{UINT32_MAX, UINT32_MAX, 1762170000000LL, 100.0f, 6, 50.0f, 90.0f, true, Mode::Manual, true, Fault::MaxRun};
    CHECK(serializeTelemetry(m, o, sizeof o) <= 256); CHECK(serializeTelemetry(m, o, 10) == 0); }
  { Command c2{};
    auto P = [&](const char* s) { return parseCommand(s, strlen(s), c2); };
    CHECK(P("{\"mode\":\"manual\",\"pump\":true}") && c2.hasMode && c2.mode == Mode::Manual && c2.hasPump && c2.pump);
    CHECK(P("{\"pump\":false}") && !c2.hasMode && c2.hasPump && !c2.pump);
    CHECK(P("{\"mode\":\"auto\"}") && c2.hasMode && c2.mode == Mode::Auto);
    CHECK(!P("{\"mode\":\"turbo\"}") && !P("not json") && !P("{}") && !P("{\"pump\":\"yes\"}") && !P("[1]")); }

  // --- offline buffer
  { FakeStore s; OfflineBuffer b(s, 100);
    for (int i = 1; i <= 105; i++) b.push("m" + std::to_string(i));
    CHECK(b.size() == 100);
    OfflineBuffer b2(s, 100); CHECK(b2.size() == 100);                 // reboot
    std::vector<std::string> got; b2.drain(1000, [&](const std::string& l) { got.push_back(l); return true; });
    CHECK(got.size() == 100 && got.front() == "m6" && got.back() == "m105" && b2.size() == 0); }
  { FakeStore s; OfflineBuffer b(s, 100); for (int i = 1; i <= 5; i++) b.push("m" + std::to_string(i));
    int k = 0; size_t n = b.drain(10, [&](const std::string&) { return ++k < 3; });
    CHECK(n == 2 && b.size() == 3);
    std::string first; b.drain(1, [&](const std::string& l) { first = l; return true; }); CHECK(first == "m3"); }
  { FakeStore s; OfflineBuffer b(s, 100); for (int i = 0; i < 20; i++) b.push("x");
    CHECK(b.drain(10, [](const std::string&) { return true; }) == 10 && b.size() == 10); }
  { FakeStore s; OfflineBuffer b(s, 100); for (int i = 0; i < 1000; i++) b.push("x"); CHECK(s.v.size() <= 200); }

  // --- display
  { Telemetry t{1, 1, 0, 63.5f, 4, 28.0f, 65.0f, true, Mode::Auto, false, Fault::None};
    char L[4][21]; formatLcd(t, {true, true, 0}, L);
    for (int i = 0; i < 4; i++) CHECK(strlen(L[i]) == 20);
    CHECK(!strncmp(L[0], "Soil : 63.5 %", 13) && !strncmp(L[1], "Temp : 28.0C Hum:65%", 20));
    CHECK(!strncmp(L[2], "Pump:ON  Mode:AUTO", 18) && !strncmp(L[3], "W:OK M:OK Buf:  0", 17));
    t.moisture = NAN; t.temp = NAN; t.hum = NAN; t.pump = false; t.mode = Mode::Manual;
    formatLcd(t, {false, false, 100}, L);
    CHECK(!strncmp(L[0], "Soil : --- %", 12) && !strncmp(L[1], "Temp : --.-C Hum:--%", 20));
    CHECK(!strncmp(L[2], "Pump:OFF Mode:MANUAL", 20) && !strncmp(L[3], "W:NO M:NO Buf:100", 17));
    t.fault = Fault::NoSensor; formatLcd(t, {true, true, 0}, L); CHECK(!strncmp(L[3], "FAULT: NO SENSOR", 16));
    // mode bench: baris 4 = BENCH, tetapi FAULT tetap menang
    LcdStatus b{false, false, 0, true};
    formatLcd(t, b, L); CHECK(!strncmp(L[3], "FAULT: NO SENSOR", 16));
    t.fault = Fault::None; formatLcd(t, b, L);
    CHECK(!strncmp(L[3], "BENCH (tanpa WiFi)  ", 20) && strlen(L[3]) == 20);
    formatLcd(t, {true, true, 0}, L); CHECK(!strncmp(L[3], "W:OK M:OK Buf:  0", 17)); }

  printf(fails ? "\n%d GAGAL\n" : "\nSEMUA TES LULUS\n", fails);
  return fails ? 1 : 0;
}
