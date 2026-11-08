#pragma once
#include <cstddef>
void hwBegin();                                   // relay OFF dulu, lalu sensor & LCD
int hwReadSoilAdc(size_t idx);                    // rata-rata 16 sampel, 0..4095
bool hwReadDht(float& tempC, float& hum);         // false bila gagal baca
void hwSetRelay(bool on);
void hwLcdShow(const char lines[4][21]);
