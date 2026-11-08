#pragma once
#include "types.h"
struct LcdStatus { bool wifi; bool mqtt; size_t buffered; bool standalone = false; };
// Mengisi 4 baris @ tepat 20 karakter + NUL (LCD 20x4).
void formatLcd(const Telemetry& t, const LcdStatus& s, char out[4][21]);
