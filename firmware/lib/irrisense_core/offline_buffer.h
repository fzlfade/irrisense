#pragma once
#include <deque>
#include <functional>
#include <string>
#include <vector>

class LineStore {                      // abstraksi file (SPIFFS di perangkat, memori di tes)
 public:
  virtual ~LineStore() = default;
  virtual void append(const std::string& line) = 0;
  virtual std::vector<std::string> readAll() = 0;
  virtual void rewrite(const std::vector<std::string>& lines) = 0;
};

class OfflineBuffer {
 public:
  OfflineBuffer(LineStore& store, size_t capacity = 100);
  void push(const std::string& jsonLine);          // penuh -> buang yang tertua
  size_t size() const { return q_.size(); }
  // Kirim FIFO; berhenti pada send() pertama yang false. Mengembalikan jumlah terkirim.
  size_t drain(size_t maxItems, const std::function<bool(const std::string&)>& send);
 private:
  LineStore& store_;
  size_t cap_;
  size_t storeLines_;                              // jumlah baris fisik di store
  std::deque<std::string> q_;
};
