// Simulasi live test IrriSense. Meniru PumpController di firmware/lib/irrisense_core/controller.cpp
// (histeresis 60/80 %, batas nyala 10 menit, galat MAX RUN terkunci sampai mode diganti).
// Murni logika, tanpa DOM, supaya bisa dites dengan `node --test`.

export const M_SET = 60;
export const M_MAX = 80;
export const MAX_RUN_S = 600;

// Pin ADC1 yang dipakai firmware (firmware/src/config.h, docs/hardware/perkabelan.md).
export const SENSOR_GPIO = [36, 39, 34, 35, 32, 33];

const START_PCT = [66, 60, 57, 64, 69, 59];   // rata-rata 62,5 %: dekat ambang, jadi pompa menyala sendiri dalam beberapa detik
const DRY_RATE = [0.011, 0.013, 0.012, 0.010, 0.014, 0.012];   // % per detik simulasi
const WET_RATE = [0.125, 0.110, 0.120, 0.115, 0.105, 0.130];   // % per detik simulasi saat pompa menyala
const TANK_USE = 0.02;                                         // % tandon per detik simulasi saat pompa menyala

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createSim() {
  return {
    t: 0,
    mode: 'auto',
    pump: false,
    onSince: 0,
    fault: 'none',            // 'none' | 'no_sensor' | 'max_run'
    sensors: START_PCT.map((pct) => ({ pct, valid: true })),
    tank: 100,
    temp: 29,
    hum: 65,
  };
}

/** Rata-rata hanya dari sensor valid; NaN bila tidak ada. */
export function average(sensors) {
  const ok = sensors.filter((s) => s.valid);
  return ok.length ? ok.reduce((a, s) => a + s.pct, 0) / ok.length : NaN;
}

function control(s) {
  if (s.fault === 'max_run') { s.pump = false; return; }
  if (s.mode === 'auto') {
    const m = average(s.sensors);
    if (Number.isNaN(m)) {
      s.pump = false;
      s.fault = 'no_sensor';
    } else {
      if (s.fault === 'no_sensor') s.fault = 'none';
      if (m < M_SET) turnOn(s);
      else if (m >= M_MAX) s.pump = false;
    }
  }
  if (s.pump && s.t - s.onSince >= MAX_RUN_S) {
    s.pump = false;
    s.fault = 'max_run';
  }
}

function turnOn(s) {
  if (!s.pump) { s.pump = true; s.onSince = s.t; }
}

/** Majukan simulasi `dt` detik (waktu simulasi). Dipecah per 1 detik agar stabil pada kecepatan tinggi. */
export function stepSim(s, dt) {
  let left = dt;
  while (left > 0) {
    const h = Math.min(1, left);
    left -= h;
    s.t += h;
    const flowing = s.pump && s.tank > 0;
    const heat = 1 + (s.temp - 28) * 0.03;
    s.sensors.forEach((sen, i) => {
      if (!sen.valid) return;
      sen.pct = clamp(sen.pct - DRY_RATE[i] * heat * h + (flowing ? WET_RATE[i] * h : 0), 0, 100);
    });
    if (flowing) s.tank = clamp(s.tank - TANK_USE * h, 0, 100);
    s.temp = 29 + 2 * Math.sin(s.t / 900);
    s.hum = clamp(65 - (s.temp - 29) * 4, 0, 100);
    control(s);
  }
}

export function setMode(s, mode) {
  if (mode !== 'auto' && mode !== 'manual') return;
  s.mode = mode;
  s.pump = false;
  s.fault = 'none';
}

export function manualPump(s, on) {
  if (s.mode !== 'manual' || s.fault === 'max_run') return false;
  if (on) turnOn(s); else s.pump = false;
  return true;
}

export function shiftSensors(s, delta, indices) {
  (indices ?? s.sensors.map((_, i) => i)).forEach((i) => {
    const sen = s.sensors[i];
    if (sen?.valid) sen.pct = clamp(sen.pct + delta, 0, 100);
  });
}

export function toggleSensorValid(s, i) {
  if (s.sensors[i]) s.sensors[i].valid = !s.sensors[i].valid;
}

export function setTank(s, pct) {
  s.tank = clamp(pct, 0, 100);
}

/** Empat baris layar LCD 20x4, format sama dengan firmware (display.cpp). */
export function lcdLines(s, wifiOk = true, mqttOk = true) {
  const m = average(s.sensors);
  const pad = (t) => t.padEnd(20).slice(0, 20);
  const soil = Number.isNaN(m) ? 'Soil : --- %' : `Soil : ${m.toFixed(1)} %`;
  const temp = `Temp : ${s.temp.toFixed(1).padStart(4)}C Hum:${s.hum.toFixed(0)}%`;
  const pump = `Pump:${(s.pump ? 'ON' : 'OFF').padEnd(3)} Mode:${s.mode === 'auto' ? 'AUTO' : 'MANUAL'}`;
  const last = s.fault === 'no_sensor' ? 'FAULT: NO SENSOR'
    : s.fault === 'max_run' ? 'FAULT: MAX RUN'
    : `W:${wifiOk ? 'OK' : 'NO'} M:${mqttOk ? 'OK' : 'NO'} Buf:  0`;
  return [soil, temp, pump, last].map(pad);
}
