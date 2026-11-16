#include <Arduino.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include "config.h"
#include "hw.h"

static DHT dht(DHT_PIN, DHT11);
static LiquidCrystal_I2C lcd(LCD_ADDR, 20, 4);

void hwSetRelay(bool on) {
  // Modul 5 V aktif-LOW tetap ON bila IN diberi HIGH 3,3 V, jadi OFF = pin mengambang.
  if (RELAY_ACTIVE_LOW && !on) { pinMode(RELAY_PIN, INPUT); return; }
  bool level = RELAY_ACTIVE_LOW ? !on : on;       // level HIGH/LOW pada pin IN relay
  digitalWrite(RELAY_PIN, level ? HIGH : LOW);
  pinMode(RELAY_PIN, OUTPUT);
}

void hwBegin() {
  hwSetRelay(false);                              // pompa OFF sebelum apa pun

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);                 // jangkauan ~0-3.3 V
  for (uint8_t i = 0; i < SOIL_COUNT; i++) pinMode(SOIL_PINS[i], INPUT);

  dht.begin();
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
}

int hwReadSoilAdc(size_t idx) {
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) { sum += analogRead(SOIL_PINS[idx]); delayMicroseconds(200); }
  return (int)(sum / 16);
}

bool hwReadDht(float& tempC, float& hum) {
  float t = dht.readTemperature(), h = dht.readHumidity();
  if (isnan(t) || isnan(h)) return false;
  tempC = t; hum = h;
  return true;
}

void hwLcdShow(const char lines[4][21]) {
  for (uint8_t r = 0; r < 4; r++) { lcd.setCursor(0, r); lcd.print(lines[r]); }
}
