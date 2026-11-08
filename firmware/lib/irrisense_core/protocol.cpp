#include "protocol.h"
#include <ArduinoJson.h>

static float round1(float v) { return std::round(v * 10.0f) / 10.0f; }

size_t serializeTelemetry(const Telemetry& t, char* out, size_t cap) {
  JsonDocument d;
  d["boot"] = t.boot;
  d["seq"] = t.seq;
  d["ts"] = (long long)t.ts;
  if (std::isnan(t.moisture)) d["moisture"] = nullptr; else d["moisture"] = round1(t.moisture);
  d["valid"] = t.valid;
  if (std::isnan(t.temp)) d["temp"] = nullptr; else d["temp"] = round1(t.temp);
  if (std::isnan(t.hum)) d["hum"] = nullptr; else d["hum"] = round1(t.hum);
  d["pump"] = t.pump;
  d["mode"] = t.mode == Mode::Auto ? "auto" : "manual";
  d["buffered"] = t.buffered;
  d["fault"] = t.fault == Fault::None ? "none" : t.fault == Fault::NoSensor ? "no_sensor" : "max_run";
  if (measureJson(d) + 1 > cap) return 0;
  return serializeJson(d, out, cap);
}

bool parseCommand(const char* json, size_t len, Command& out) {
  JsonDocument d;
  if (deserializeJson(d, json, len)) return false;
  if (!d.is<JsonObject>()) return false;
  Command c{false, Mode::Auto, false, false};
  if (!d["mode"].isNull()) {
    if (!d["mode"].is<const char*>()) return false;
    const char* m = d["mode"];
    if (!strcmp(m, "auto")) c.mode = Mode::Auto;
    else if (!strcmp(m, "manual")) c.mode = Mode::Manual;
    else return false;
    c.hasMode = true;
  }
  if (!d["pump"].isNull()) {
    if (!d["pump"].is<bool>()) return false;
    c.pump = d["pump"]; c.hasPump = true;
  }
  if (!c.hasMode && !c.hasPump) return false;
  out = c;
  return true;
}
