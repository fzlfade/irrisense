#include <SPIFFS.h>
#include "storage_spiffs.h"

static const char* PATH = "/buffer.jsonl";

bool SpiffsLineStore::begin() { return SPIFFS.begin(true); }   // true = format bila belum ada

void SpiffsLineStore::append(const std::string& line) {
  File f = SPIFFS.open(PATH, FILE_APPEND);
  if (!f) return;
  f.println(line.c_str());
  f.close();
}

std::vector<std::string> SpiffsLineStore::readAll() {
  std::vector<std::string> v;
  File f = SPIFFS.open(PATH, FILE_READ);
  if (!f) return v;
  while (f.available()) {
    String l = f.readStringUntil('\n');
    l.trim();
    if (l.length() > 1 && l[0] == '{' && l[l.length() - 1] == '}') v.emplace_back(l.c_str());  // buang baris terpotong
  }
  f.close();
  return v;
}

void SpiffsLineStore::rewrite(const std::vector<std::string>& lines) {
  File f = SPIFFS.open(PATH, FILE_WRITE);
  if (!f) return;
  for (auto& l : lines) f.println(l.c_str());
  f.close();
}
