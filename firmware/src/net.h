#pragma once
#include <cstdint>
#include "types.h"
void netBegin();
void netLoop();                                   // panggil sesering mungkin; tanpa delay panjang
bool netWifiConnected();
bool netConnected();                              // MQTT tersambung
bool netPublish(const char* json);                // telemetri QoS 0; false bila gagal
void netOnCommand(void (*cb)(const Command&));
int64_t netEpochMs();                             // 0 bila NTP belum sinkron
