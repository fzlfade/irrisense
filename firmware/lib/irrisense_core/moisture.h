#pragma once
#include "types.h"
// Pers. (1). NAN bila adc macet (0 / 4095) atau kalibrasi tidak valid. Hasil di-clamp 0..100.
float adcToMoisture(int adc, SensorCal cal);
// Rata-rata sensor yang valid.
MoistureResult aggregateMoisture(const int* adc, const SensorCal* cal, size_t n);
