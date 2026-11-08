#include "display.h"
#include <cstdio>
#include <cstring>

static void put(char* dst, const char* src) {
  size_t n = strnlen(src, 20);
  memcpy(dst, src, n);
  memset(dst + n, ' ', 20 - n);
  dst[20] = '\0';
}

void formatLcd(const Telemetry& t, const LcdStatus& s, char out[4][21]) {
  char b[48];
  if (std::isnan(t.moisture)) snprintf(b, sizeof b, "Soil : --- %%");
  else snprintf(b, sizeof b, "Soil : %.1f %%", t.moisture);
  put(out[0], b);

  char tt[12], hh[12];
  if (std::isnan(t.temp)) snprintf(tt, sizeof tt, "--.-"); else snprintf(tt, sizeof tt, "%4.1f", t.temp);
  if (std::isnan(t.hum)) snprintf(hh, sizeof hh, "--"); else snprintf(hh, sizeof hh, "%.0f", t.hum);
  snprintf(b, sizeof b, "Temp : %sC Hum:%s%%", tt, hh);
  put(out[1], b);

  snprintf(b, sizeof b, "Pump:%-3s Mode:%s", t.pump ? "ON" : "OFF", t.mode == Mode::Auto ? "AUTO" : "MANUAL");
  put(out[2], b);

  if (t.fault == Fault::NoSensor) snprintf(b, sizeof b, "FAULT: NO SENSOR");
  else if (t.fault == Fault::MaxRun) snprintf(b, sizeof b, "FAULT: MAX RUN");
  else if (s.standalone) snprintf(b, sizeof b, "BENCH (tanpa WiFi)");
  else snprintf(b, sizeof b, "W:%s M:%s Buf:%3u", s.wifi ? "OK" : "NO", s.mqtt ? "OK" : "NO", (unsigned)s.buffered);
  put(out[3], b);
}
