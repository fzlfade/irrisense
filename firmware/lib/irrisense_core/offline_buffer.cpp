#include "offline_buffer.h"

OfflineBuffer::OfflineBuffer(LineStore& store, size_t capacity) : store_(store), cap_(capacity) {
  auto lines = store_.readAll();
  storeLines_ = lines.size();
  size_t start = lines.size() > cap_ ? lines.size() - cap_ : 0;
  for (size_t i = start; i < lines.size(); i++) q_.push_back(lines[i]);
}

void OfflineBuffer::push(const std::string& line) {
  store_.append(line);                             // append-only: hemat tulis SPIFFS
  storeLines_++;
  q_.push_back(line);
  if (q_.size() > cap_) q_.pop_front();
  if (storeLines_ > 2 * cap_) {                    // kompaksi berkala
    store_.rewrite(std::vector<std::string>(q_.begin(), q_.end()));
    storeLines_ = q_.size();
  }
}

size_t OfflineBuffer::drain(size_t maxItems, const std::function<bool(const std::string&)>& send) {
  size_t sent = 0;
  while (sent < maxItems && !q_.empty()) {
    if (!send(q_.front())) break;
    q_.pop_front();
    sent++;
  }
  if (sent > 0) {
    store_.rewrite(std::vector<std::string>(q_.begin(), q_.end()));
    storeLines_ = q_.size();
  }
  return sent;
}
