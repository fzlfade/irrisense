#pragma once
#include "offline_buffer.h"
class SpiffsLineStore : public LineStore {
 public:
  bool begin();
  void append(const std::string& line) override;
  std::vector<std::string> readAll() override;
  void rewrite(const std::vector<std::string>& lines) override;
};
