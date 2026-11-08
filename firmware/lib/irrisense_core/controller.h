#pragma once
#include "types.h"

class PumpController {
 public:
  explicit PumpController(Thresholds t = {}) : t_(t) {}
  bool update(const MoistureResult& m, uint32_t nowMs);   // mengembalikan status pompa
  void setMode(Mode m, uint32_t nowMs);                   // selalu: pompa OFF, fault dihapus
  void manualPump(bool on, uint32_t nowMs);               // hanya bermakna di Mode::Manual
  bool pumpOn() const { return pump_; }
  Mode mode() const { return mode_; }
  Fault fault() const { return fault_; }
 private:
  void turnOn(uint32_t nowMs);
  Thresholds t_;
  bool pump_ = false;
  Mode mode_ = Mode::Auto;
  Fault fault_ = Fault::None;
  uint32_t onSinceMs_ = 0;
};

// mode dulu, lalu pump; pump diabaikan bila mode bukan Manual.
void applyCommand(PumpController& c, const Command& cmd, uint32_t nowMs);
