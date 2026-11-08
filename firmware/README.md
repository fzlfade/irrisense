# Firmware IrriSense (ESP32)

## Struktur
- `lib/irrisense_core/` — logika murni C++ (konversi kelembapan, kontroler histeresis, JSON, buffer offline, format LCD). Diuji di komputer.
- `src/` — kode khusus perangkat (`hw` sensor/relay/LCD, `net` Wi-Fi/MQTT/NTP, `storage_spiffs`, `main.cpp`).

## Langkah
1. `cp src/secrets.example.h src/secrets.h` lalu isi Wi-Fi (2.4 GHz) dan alamat broker MQTT.
2. Rakit sesuai `../docs/hardware/wiring.md`, lalu kalibrasi: `pio run -e esp32dev_cal -t upload` → isi `SOIL_CAL` di `src/config.h`.
3. Flash firmware: `pio run -e esp32dev -t upload && pio device monitor`.

Uji bangku tanpa jaringan (tidak butuh `secrets.h`): env `bringup`, `esp32dev_cal`, `bench` — lihat "Urutan uji bangku" di `../docs/hardware/wiring.md`.

## Tes di komputer (tanpa ESP32)
```
g++ -std=c++17 -I<path ArduinoJson>/src -Ilib/irrisense_core test_host/test_core.cpp lib/irrisense_core/*.cpp -o test_core && ./test_core
```

## Topik MQTT (node `node1`)
- `irrisense/node1/telemetry` — telemetri JSON tiap 5 detik (QoS 0)
- `irrisense/node1/status` — `online` / `offline` (retained, LWT)
- `irrisense/node1/cmd` — `{"mode":"auto|manual","pump":true|false}` (jangan retained)
