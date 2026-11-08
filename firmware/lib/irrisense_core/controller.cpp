#include "controller.h"

void PumpController::turnOn(uint32_t nowMs) {
  if (!pump_) { pump_ = true; onSinceMs_ = nowMs; }
}

bool PumpController::update(const MoistureResult& m, uint32_t nowMs) {
  if (fault_ == Fault::MaxRun) { pump_ = false; return false; }   // latched sampai setMode()

  if (mode_ == Mode::Auto) {
    if (!m.valid || std::isnan(m.percent)) {                      // fail-safe
      pump_ = false;
      fault_ = Fault::NoSensor;
    } else {
      if (fault_ == Fault::NoSensor) fault_ = Fault::None;
      if (m.percent < t_.mSet) turnOn(nowMs);
      else if (m.percent >= t_.mMax) pump_ = false;               // di antaranya: histeresis
    }
  }
  if (pump_ && (uint32_t)(nowMs - onSinceMs_) >= t_.maxRunMs) {   // aman terhadap rollover millis()
    pump_ = false;
    fault_ = Fault::MaxRun;
  }
  return pump_;
}

void PumpController::setMode(Mode m, uint32_t) {
  mode_ = m; pump_ = false; fault_ = Fault::None;
}

void PumpController::manualPump(bool on, uint32_t nowMs) {
  if (mode_ != Mode::Manual || fault_ == Fault::MaxRun) return;
  if (on) turnOn(nowMs); else pump_ = false;
}

void applyCommand(PumpController& c, const Command& cmd, uint32_t nowMs) {
  if (cmd.hasMode) c.setMode(cmd.mode, nowMs);
  if (cmd.hasPump && c.mode() == Mode::Manual) c.manualPump(cmd.pump, nowMs);
}
