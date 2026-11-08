#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <sys/time.h>
#include "config.h"
#include "net.h"
#include "protocol.h"
#include "secrets.h"

static WiFiClient wifiClient;
static PubSubClient mqtt(wifiClient);
static void (*cmdCb)(const Command&) = nullptr;
static uint32_t lastWifiTry = 0, lastMqttTry = 0, subscribedAt = 0;

static void onMessage(char*, uint8_t* payload, unsigned int len) {
  if (!cmdCb || len > 128) return;
  // PubSubClient tidak memberi flag retained -> abaikan pesan yang datang tepat setelah subscribe.
  if (millis() - subscribedAt < CMD_IGNORE_AFTER_SUBSCRIBE_MS) return;
  Command c;
  if (parseCommand((const char*)payload, len, c)) cmdCb(c);
}

static void connectMqtt() {
  const char* user = strlen(MQTT_USER) ? MQTT_USER : nullptr;
  const char* pass = strlen(MQTT_USER) ? MQTT_PASS : nullptr;
  // LWT: broker menerbitkan "offline" (retained) bila ESP32 putus mendadak.
  if (mqtt.connect("irrisense-" NODE_ID, user, pass, TOPIC_STATUS, 1, true, "offline")) {
    mqtt.publish(TOPIC_STATUS, "online", true);
    mqtt.subscribe(TOPIC_CMD, 1);
    subscribedAt = millis();
  }
}

void netBegin() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setSocketTimeout(2);
  mqtt.setCallback(onMessage);
  configTime(0, 0, "pool.ntp.org", "time.google.com");   // epoch untuk field ts
}

void netLoop() {
  uint32_t now = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiTry > 15000) { lastWifiTry = now; WiFi.disconnect(); WiFi.begin(WIFI_SSID, WIFI_PASS); }
    return;
  }
  if (!mqtt.connected()) {
    if (now - lastMqttTry >= 5000) { lastMqttTry = now; connectMqtt(); }
    return;
  }
  mqtt.loop();
}

bool netWifiConnected() { return WiFi.status() == WL_CONNECTED; }
bool netConnected() { return netWifiConnected() && mqtt.connected(); }
bool netPublish(const char* json) { return mqtt.connected() && mqtt.publish(TOPIC_TELEMETRY, json); }
void netOnCommand(void (*cb)(const Command&)) { cmdCb = cb; }

int64_t netEpochMs() {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  if (tv.tv_sec < 1700000000) return 0;           // belum sinkron NTP
  return (int64_t)tv.tv_sec * 1000 + tv.tv_usec / 1000;
}
