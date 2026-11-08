#pragma once
#include <cmath>
#include <cstddef>
#include <cstdint>

enum class Mode : uint8_t { Auto, Manual };
enum class Fault : uint8_t { None, NoSensor, MaxRun };

struct SensorCal { int adcDry; int adcWet; };            // ADC_kering > ADC_basah
struct MoistureResult { bool valid; float percent; uint8_t validCount; };
struct Thresholds {
  float mSet = 60.0f;            // pompa ON bila M < mSet   (Pers. 2)
  float mMax = 80.0f;            // pompa OFF bila M >= mMax (Pers. 3)
  uint32_t maxRunMs = 600000;    // pengaman 10 menit (bukan dari spec)
};
struct Telemetry {               // NAN = null pada JSON
  uint32_t boot; uint32_t seq; int64_t ts;
  float moisture; uint8_t valid; float temp; float hum;
  bool pump; Mode mode; bool buffered; Fault fault;
};
struct Command { bool hasMode; Mode mode; bool hasPump; bool pump; };
