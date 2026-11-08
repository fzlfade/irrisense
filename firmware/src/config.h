#pragma once
#include <Arduino.h>
#include "types.h"

// ---------- Pin (lihat docs/hardware/wiring.md) ----------
constexpr uint8_t SOIL_COUNT = 6;
constexpr uint8_t SOIL_PINS[SOIL_COUNT] = {36, 39, 34, 35, 32, 33};   // ADC1 saja (ADC2 bentrok Wi-Fi)
constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t RELAY_PIN = 26;
constexpr bool RELAY_ACTIVE_LOW = true;    // ubah ke false bila modul relay aktif-HIGH
constexpr uint8_t I2C_SDA = 21, I2C_SCL = 22;
constexpr uint8_t LCD_ADDR = 0x27;         // coba 0x3F bila LCD kosong

// ---------- Kalibrasi dua titik per sensor ----------
// {ADC_kering (udara), ADC_basah (air)}; isi dari env esp32dev_cal. {0, 0} = sensor tidak terpasang (diabaikan).
constexpr SensorCal SOIL_CAL[SOIL_COUNT] = {
  {4095, 2128},  // S1
  {4095, 2084},  // S2
  {4095, 2167},  // S3
  {4095, 2033},  // S4
  {4095, 1636},  // S5
  {4095, 1742}};  // S6

// ---------- Kontrol (D-02 Pers. 2-3, Tabel 4) ----------
constexpr float M_SET = 60.0f;
constexpr float M_MAX = 80.0f;
constexpr uint32_t MAX_RUN_MS = 600000;    // pengaman, bukan dari spec
constexpr uint32_t SENSOR_INTERVAL_MS = 5000;

// ---------- Buffer offline ----------
constexpr size_t BUFFER_CAPACITY = 100;
constexpr size_t DRAIN_PER_TICK = 10;

// ---------- MQTT (Kontrak Bersama) ----------
#define NODE_ID "node1"
#define TOPIC_TELEMETRY "irrisense/" NODE_ID "/telemetry"
#define TOPIC_STATUS    "irrisense/" NODE_ID "/status"
#define TOPIC_CMD       "irrisense/" NODE_ID "/cmd"
constexpr uint32_t CMD_IGNORE_AFTER_SUBSCRIBE_MS = 1000;   // buang pesan retained basi saat connect
