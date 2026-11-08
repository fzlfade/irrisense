#pragma once
#include "types.h"
// Menulis JSON telemetri ke out. Mengembalikan panjang (tanpa NUL), 0 bila cap kurang.
size_t serializeTelemetry(const Telemetry& t, char* out, size_t cap);
// Parse {"mode":"auto|manual","pump":true|false}; minimal satu field, tipe harus tepat.
bool parseCommand(const char* json, size_t len, Command& out);
