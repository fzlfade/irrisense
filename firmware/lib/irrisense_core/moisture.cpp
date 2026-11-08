#include "moisture.h"

float adcToMoisture(int adc, SensorCal cal) {
  if (cal.adcDry <= cal.adcWet) return NAN;
  if (adc <= 0) return NAN;
  // Sensor yang saat kering memang saturasi di 4095: bacaan 4095 = kering (0 %), bukan macet.
  if (adc >= 4095) return cal.adcDry >= 4095 ? 0.0f : NAN;
  float m = (float)(cal.adcDry - adc) / (float)(cal.adcDry - cal.adcWet) * 100.0f;
  if (m < 0.0f) m = 0.0f;
  if (m > 100.0f) m = 100.0f;
  return m;
}

MoistureResult aggregateMoisture(const int* adc, const SensorCal* cal, size_t n) {
  float sum = 0; uint8_t cnt = 0;
  for (size_t i = 0; i < n; i++) {
    float m = adcToMoisture(adc[i], cal[i]);
    if (!std::isnan(m)) { sum += m; cnt++; }
  }
  if (cnt == 0) return {false, NAN, 0};
  return {true, sum / cnt, cnt};
}
