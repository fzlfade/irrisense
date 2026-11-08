import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Sim from './sim.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
// Mode embed (?embed=1): hanya model 3D, dipakai landing page. Kamera berputar mengikuti pesan 'irri-orbit' dari halaman induk.
const q = new URLSearchParams(location.search);
const embed = q.get('embed') === '1';
const vec = (str, def) => { const a = (str || '').split(',').map(Number); return a.length === 3 && a.every(Number.isFinite) ? a : def; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- renderer, kamera, cahaya ----------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'Model 3D prototipe IrriSense. Gunakan tombol di samping untuk mengontrol simulasi.');
view.insertBefore(renderer.domElement, view.firstChild);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe8dc);
const camera = new THREE.PerspectiveCamera(38, 1, 1, 1000);
camera.position.set(...vec(q.get('cam'), [-64, 100, 142]));
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...vec(q.get('tgt'), [0, 6, 16]));
controls.enableDamping = !reduceMotion;
controls.maxPolarAngle = Math.PI * 0.48;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a85, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(60, 110, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 320 });
scene.add(sun);

// ---------- pembantu geometri ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, metalness: 0, ...o });
function box(w, h, d, c, x, y, z, o) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o?.mat || M(c, o));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
function cyl(r, h, c, x, y, z, o = {}, seg = 32) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), M(c, o));
  m.position.set(x, y, z); m.castShadow = true; scene.add(m); return m;
}
function tube(pts, r, c) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'chordal'), 64, r, 8);
  const m = new THREE.Mesh(g, M(c)); m.castShadow = true; scene.add(m); return m;
}

// ---------- hotspot (bagian yang bisa diklik) ----------
const hot = {};            // key -> { title, meshes, text, live, acts }
const hotMeshes = [];
function reg(key, meshes, def) {
  meshes.forEach((m) => { m.userData.hot = key; hotMeshes.push(m); });
  hot[key] = { meshes, ...def };
}

// ---------- lantai, papan dasar ----------
box(100, 2, 76, 0, 0, 1, 14, { mat: M(0xcaa877) });
const floor = box(240, 0.5, 160, 0, 0, -0.3, 0, { mat: M(0xcfd9cb) });

// ---------- bedengan ----------
const wood = M(0x8a6339);
const px = 20, pw = 54, pd = 18;
box(pw, 12, 1, 0, px, 8, -pd / 2, { mat: wood }); box(pw, 12, 1, 0, px, 8, pd / 2, { mat: wood });
box(1, 12, pd, 0, px - pw / 2, 8, 0, { mat: wood }); box(1, 12, pd, 0, px + pw / 2, 8, 0, { mat: wood });
box(pw - 1, 10, pd - 1, 0, px, 7.5, 0, { mat: M(0x4a3020) });

// ---------- 6 tanaman, emitter, sensor ----------
const leaf = M(0x3f9a5e), stem = M(0x2f7d4f);
const xs = []; for (let i = 0; i < 6; i++) xs.push(px - 20 + i * 8);
const patches = [], leds = [];
const dryColor = new THREE.Color(0x8c6a47), wetColor = new THREE.Color(0x2b1b11);
xs.forEach((x, i) => {
  cyl(0.35, 22, 0xb59a6a, x, 24, -4);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 8), stem); s.position.set(x + 0.4, 18, -4); scene.add(s);
  for (let k = 0; k < 4; k++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 8), leaf); l.scale.set(1.6, 0.22, 0.9);
    l.position.set(x + (k % 2 ? 2.6 : -2.2), 16 + k * 3.4, -4 + (k % 2 ? 0.6 : -0.6)); l.rotation.z = (k % 2 ? 1 : -1) * 0.35;
    l.castShadow = true; scene.add(l);
  }
  cyl(0.5, 1.4, 0x111111, x, 16.4, 0); cyl(0.12, 3, 0x4fb0de, x, 14.6, 0, { transparent: true, opacity: 0.7 });
  const patch = box(7.6, 0.15, pd - 2, 0, x, 12.58, 0, { mat: M(0x4a3020) });
  const casing = box(1.6, 4, 0.8, 0, x, 15, 4, { mat: M(0x1f3a52) });
  const blade = box(1.4, 2.6, 0.3, 0, x, 12.6, 4.4, { mat: M(0x222222) });
  const mod = box(2.2, 1.2, 0.8, 0, x, 17.4, 4, { mat: M(0xb52a2a) });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0x5fbf85 }));
  led.position.set(x, 18.5, 4); scene.add(led);
  patches.push(patch); leds.push(led);
  reg(`s${i}`, [patch, casing, blade, mod, led], {
    title: `Sensor tanah S${i + 1}`,
    text: `Terhubung ke GPIO ${Sim.SENSOR_GPIO[i]} (ADC1). Lampu di atas sensor: kuning di bawah 60 %, hijau 60 sampai 80 %, biru di atas 80 %, abu-abu bila sensor rusak.`,
    live: () => {
      const s = sim.sensors[i];
      return s.valid ? `Kelembapan: ${s.pct.toFixed(1)} %` : 'Sensor rusak (diabaikan dari rata-rata)';
    },
    acts: [
      { label: 'Keringkan', act: 'sensor-dry', arg: i },
      { label: 'Basahi', act: 'sensor-wet', arg: i },
      { label: 'Rusak / pulih', act: 'sensor-toggle', arg: i },
    ],
  });
});

// ---------- selang, tandon, pompa ----------
const hoses = [];
hoses.push(tube([[-30, 10, -12], [-20, 22, -8], [-8, 20, 0], [xs[0] - 3, 17.2, 0], [xs[5] + 3, 17.2, 0]], 0.55, 0x111111));
const tank = cyl(7.5, 18, 0x4fb0de, -37, 11, -12, { transparent: true, opacity: 0.35, roughness: 0.2 });
const water = cyl(7.1, 12, 0x2d8fc0, -37, 8, -12, { transparent: true, opacity: 0.75 });
const pump = cyl(2, 3.8, 0xb9892b, -37, 3.2, -1.5);
hoses.push(tube([[-37, 5, -1.5], [-37, 10, -5], [-30, 10, -12]], 0.5, 0x111111));
hoses.push(tube([[-37, 12, -12], [-37, 13, -6], [-37, 5.2, -1.5]], 0.4, 0x111111));
reg('tank', [tank, water], {
  title: 'Tandon air',
  text: 'Level turun saat pompa menyala. Bila tandon kosong, pompa berputar tanpa membasahi tanah, sehingga pengaman 10 menit memicu FAULT: MAX RUN.',
  live: () => `Isi tandon: ${sim.tank.toFixed(0)} %`,
  acts: [{ label: 'Kosongkan', act: 'tank-empty' }, { label: 'Isi penuh', act: 'tank-fill' }],
});
reg('pump', [pump], {
  title: 'Mini pompa 5 VDC',
  text: 'Dialiri adaptor lewat terminal relay, dengan dioda 1N4007 paralel di pompa. Di mode Manual, klik pompa atau tombol di bawah untuk menyalakannya.',
  live: () => `Pompa: ${sim.pump ? 'ON' : 'OFF'} (mode ${sim.mode === 'auto' ? 'Auto' : 'Manual'})`,
  acts: [{ label: 'Tekan pompa', act: 'pump-toggle' }],
});

// ---------- casing 16x14x4, LCD, isi ----------
const encX = -14, encZ = 22;
const enclosure = box(16, 4, 14, 0, encX, 4, encZ, { mat: M(0x2b3a36) });
const lidGroup = new THREE.Group(); lidGroup.position.set(encX, 6.2, encZ); scene.add(lidGroup);
const lid = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 14), M(0x3a4a45)); lid.castShadow = true; lidGroup.add(lid);
const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 400; lcdCanvas.height = 240;
const lcdTex = new THREE.CanvasTexture(lcdCanvas); lcdTex.colorSpace = THREE.SRGBColorSpace;
function drawLcd() {
  const g = lcdCanvas.getContext('2d');
  g.fillStyle = '#0d3b2e'; g.fillRect(0, 0, 400, 240);
  g.fillStyle = '#8cffb8'; g.font = 'bold 32px monospace'; g.textBaseline = 'alphabetic';
  Sim.lcdLines(sim).forEach((t, i) => g.fillText(t, 0, 48 + i * 54));
  lcdTex.needsUpdate = true;
}
const lcdBody = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.5, 4), M(0x0a2a20)); lcdBody.position.set(0, 0.45, -2.5); lidGroup.add(lcdBody);
const lcdScr = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 2.9), new THREE.MeshBasicMaterial({ map: lcdTex }));
lcdScr.rotation.x = -Math.PI / 2; lcdScr.position.set(0, 0.72, -2.5); lidGroup.add(lcdScr);
const esp = box(5.2, 0.5, 2.6, 0, encX - 4, 6.2 - 3.3 + 0.2, encZ + 2, { mat: M(0x15203a) });
const espChip = box(2.2, 0.25, 1.2, 0, encX - 4, 6.2 - 3, encZ + 2, { mat: M(0xc0c0c0) });
const relay = box(4.2, 1.6, 2.8, 0, encX + 3.5, 5.1, encZ + 2.5, { mat: M(0x2358a6) });
box(4.2, 0.3, 6, 0, encX + 3.5, 3.1, encZ + 1, { mat: M(0x1f6b3a) });
const relayLed = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0x331111 }));
relayLed.position.set(encX + 3.5 + 1.4, 6.0, encZ + 2.5); scene.add(relayLed);
reg('casing', [enclosure, lid], {
  title: 'Casing 16 × 14 × 4 cm',
  text: 'Wadah elektronik. Klik untuk membuka atau menutup tutupnya dan melihat ESP32 serta relay di dalam.',
  acts: [{ label: 'Buka / tutup', act: 'lid' }],
});
reg('lcd', [lcdBody, lcdScr], {
  title: 'LCD I2C 20 × 4',
  text: 'SCL ke D22 dan SDA ke D21. Isi layar di sini memakai format yang sama dengan firmware: kelembapan, suhu, status pompa, lalu status jaringan atau galat.',
  live: () => `Baris 3: ${Sim.lcdLines(sim)[2].trim()}`,
});
reg('esp', [esp, espChip], {
  title: 'ESP32 + base board',
  text: `Membaca 6 sensor lewat pin ADC1 (GPIO ${Sim.SENSOR_GPIO.join(', ')}), merata-ratakan, menjalankan histeresis pompa 60 / 80 %, dan mengirim telemetri ke MQTT tiap 5 detik. Dipasok kabel USB.`,
  live: () => `Rata-rata: ${Number.isNaN(Sim.average(sim.sensors)) ? '---' : Sim.average(sim.sensors).toFixed(1) + ' %'}`,
  opensLid: true,
});
reg('relay', [relay], {
  title: 'Relay 1 channel',
  text: 'IN ke D26, VCC ke 5 V (baris VIN). Saat ON, relay menyambungkan adaptor ke pompa. Lampu kecil di sebelahnya menyala merah saat pompa ON.',
  live: () => `Relay: ${sim.pump ? 'ON' : 'OFF'}`,
  opensLid: true,
});

// adaptor, kabel duct, DHT11
const adaptor = box(5, 4, 3, 0, -45, 3, 22, { mat: M(0x151515) });
tube([[-42.5, 3, 22], [-30, 2.3, 24], [encX - 8, 3.5, encZ]], 0.35, 0x111111);
box(66, 2, 2, 0, 18, 3, 34, { mat: M(0xf2f2f2) });
tube([[encX + 8, 3.5, encZ], [-3, 3, 30], [-4, 3, 34]], 0.3, 0x222222);
xs.forEach((x) => tube([[x, 3.2, 34], [x, 3.2, 11], [x, 15.6, 9.4], [x, 16, 4.4]], 0.12, 0x2a8d4f));
cyl(0.4, 12, 0xb59a6a, 52, 8, 12);
const dht = box(2.6, 3.4, 1.6, 0, 52, 15, 12, { mat: M(0x4fa0d8) });
tube([[52, 4, 12], [52, 3, 30], [40, 3, 34]], 0.2, 0x222222);
reg('adaptor', [adaptor], {
  title: 'Adaptor 5 VDC 2 A',
  text: 'Pada rangkaian yang dibangun, adaptor hanya menyuplai jalur pompa lewat relay. ESP32 dipasok kabel USB, dan keduanya tidak boleh disambung bersamaan ke pin VIN.',
});
reg('dht', [dht], {
  title: 'Sensor DHT11',
  text: 'DATA ke D4. Mengukur suhu dan kelembapan udara; nilainya tampil di LCD dan dashboard.',
  live: () => `Suhu ${sim.temp.toFixed(1)} °C, RH ${sim.hum.toFixed(0)} %`,
});

// ---------- tetesan air ----------
const DROPS_PER = 5;
const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 8, 6), M(0x4fb0de, { emissive: 0x1a6a96 }), 6 * DROPS_PER);
drops.frustumCulled = false; scene.add(drops);
const dummy = new THREE.Object3D();

// ---------- panel tombol virtual ----------
const panelStart = scene.children.length;
const panelZ = 60;
box(46, 2, 14, 0, -9, 1, panelZ, { mat: M(0x2b3a36) });
function textPlane(w, h, draw, x, y, z, rotX) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d'); draw(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
  m.rotation.x = rotX; m.position.set(x, y, z); scene.add(m); return m;
}
textPlane(42, 6, (g, w, h) => {
  g.fillStyle = '#f3ecd8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 34px sans-serif'; g.fillText('PANEL SIMULASI', w / 2, h * 0.36);
  g.font = '24px sans-serif'; g.fillText('alat asli dikontrol lewat dashboard', w / 2, h * 0.74);
}, -9, 2.05, panelZ - 3.8, -Math.PI / 2);

function btnTexture(l1, l2, bg) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#f3ecd8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 54px sans-serif'; g.fillText(l1, 128, l2 ? 100 : 128);
  if (l2) { g.font = 'bold 46px sans-serif'; g.fillText(l2, 128, 168); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const buttons = {};
function makeButton(key, x, bg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 2, 32), M(0x1b2a21));
  const cap = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), new THREE.MeshBasicMaterial({ map: btnTexture(key.toUpperCase(), '', bg) }));
  cap.rotation.x = -Math.PI / 2; cap.position.y = 1.02; m.add(cap); m.userData.cap = cap;
  m.position.set(x, 3, panelZ + 3.2); m.castShadow = true; scene.add(m);
  m.userData.btn = key; m.userData.baseY = 3; m.userData.press = 0; m.userData.bg = bg;
  buttons[key] = m; hotMeshes.push(m); return m;
}
makeButton('mode', -27, '#b9892b'); makeButton('pompa', -15, '#1f6f9c');
makeButton('kering', -3, '#8a6339'); makeButton('basah', 9, '#1f4a31');
const panelObjs = scene.children.slice(panelStart);
function relabelButtons() {
  const set = (k, l1, l2) => {
    const b = buttons[k], id = l1 + l2; if (b.userData.label === id) return; b.userData.label = id;
    const mat = b.userData.cap.material; mat.map?.dispose(); mat.map = btnTexture(l1, l2, b.userData.bg); mat.needsUpdate = true;
  };
  set('mode', 'MODE', sim.mode === 'auto' ? 'AUTO' : 'MANUAL');
  set('pompa', 'POMPA', sim.pump ? 'ON' : 'OFF');
  set('kering', 'KERING', ''); set('basah', 'BASAH', '');
}

// ---------- nomor penanda ----------
const items = [
  ['ESP32 + base board', '1 buah, di dalam casing'],
  ['LCD I2C 20×4', '1 buah, di tutup casing'],
  ['Sensor kelembapan tanah', '10 buah dibeli, 6 terpasang, 4 cadangan'],
  ['Casing sensor tanah', '10 buah, 1 per sensor'],
  ['Sensor DHT11', '6 dibeli, 1 terpasang di tiang'],
  ['Relay 1 channel', '1 buah, di dalam casing'],
  ['Mini pompa 5 VDC', '1 buah, mengalirkan air dari tandon'],
  ['Adaptor 5 VDC 2 A', '1 buah, menyuplai jalur pompa (ESP32 lewat USB)'],
  ['Enclosure 16 × 14 × 4 cm', '1 buah, wadah elektronik'],
  ['Kabel duct', '1 meter, merapikan kabel sensor'],
  ['Selang irigasi tetes + emitter', '1 set, satu emitter per tanaman'],
  ['Kabel jumper, PCB prototipe', 'di dalam casing (tidak terlihat)'],
];
const lg = $('legend');
items.forEach((it, i) => {
  const li = document.createElement('li');
  const n = document.createElement('i'); n.textContent = i + 1;
  const sp = document.createElement('span'); sp.textContent = it[0];
  const sm = document.createElement('small'); sm.textContent = it[1]; sp.appendChild(sm);
  li.append(n, sp); lg.appendChild(li);
});
const labelSprites = [];
function label(n, x, y, z) {
  const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
  g.fillStyle = '#12301f'; g.beginPath(); g.arc(48, 48, 44, 0, 7); g.fill();
  g.fillStyle = '#f3ecd8'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, 48, 52);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sp.position.set(x, y, z); sp.scale.set(4.4, 4.4, 1); sp.renderOrder = 9; scene.add(sp); labelSprites.push(sp);
}
label(1, encX - 6, 10, encZ - 1); label(2, encX + 3, 12, encZ - 4); label(3, xs[1] + 1, 21, 5); label(4, xs[3] + 3, 17, 8);
label(5, 52, 21, 12); label(6, encX + 7, 9, encZ + 1); label(7, -37, 11, 2); label(8, -45, 10, 22);
label(9, encX - 9, 6, encZ + 9); label(10, -12, 8, 35); label(11, xs[4], 21, -1);

// ---------- simulasi + aksi ----------
let sim = Sim.createSim();
let playing = true, speed = 30, open = false, spin = false, toast = '', toastUntil = 0;
const history = []; let lastSample = 0;
function say(msg) { toast = msg; toastUntil = performance.now() + 4000; }

function act(name, arg) {
  switch (name) {
    case 'play': playing = !playing; break;
    case 'speed': speed = arg; break;
    case 'mode': Sim.setMode(sim, arg); break;
    case 'pump-on': if (!Sim.manualPump(sim, true)) say(sim.fault === 'max_run' ? 'Pompa terkunci karena MAX RUN. Ganti mode untuk membukanya.' : 'Pompa hanya bisa dikontrol di mode Manual.'); break;
    case 'pump-off': if (!Sim.manualPump(sim, false)) say('Pompa hanya bisa dikontrol di mode Manual.'); break;
    case 'pump-toggle': act(sim.pump ? 'pump-off' : 'pump-on'); break;
    case 'dry': Sim.shiftSensors(sim, -15); break;
    case 'wet': Sim.shiftSensors(sim, 15); break;
    case 'sensor-dry': Sim.shiftSensors(sim, -15, [arg]); break;
    case 'sensor-wet': Sim.shiftSensors(sim, 15, [arg]); break;
    case 'sensor-toggle': Sim.toggleSensorValid(sim, arg); break;
    case 'tank-empty': Sim.setTank(sim, 0); break;
    case 'tank-fill': Sim.setTank(sim, 100); break;
    case 'lid': open = !open; break;
    case 'reset': sim = Sim.createSim(); history.length = 0; lastSample = 0; break;
    default: return;
  }
  refreshUI();
}
const buttonAction = { mode: () => act('mode', sim.mode === 'auto' ? 'manual' : 'auto'), pompa: () => act('pump-toggle'), kering: () => act('dry'), basah: () => act('wet') };

// ---------- UI samping ----------
const sensorsBox = $('sensors');
for (let i = 0; i < 6; i++) {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.sensor = i; sensorsBox.appendChild(b);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.act) act(b.dataset.act, b.dataset.arg !== undefined ? Number(b.dataset.arg) : undefined);
  else if (b.dataset.mode) act('mode', b.dataset.mode);
  else if (b.dataset.sensor !== undefined) act('sensor-toggle', Number(b.dataset.sensor));
  else if (b.closest('#speed') && b.dataset.v) act('speed', Number(b.dataset.v));
});
$('lid').onclick = () => act('lid');
$('spin').onclick = (e) => { spin = !spin; e.target.textContent = spin ? 'Berhenti putar' : 'Putar otomatis'; };
$('labels').onclick = (e) => {
  const show = !labelSprites[0].visible; labelSprites.forEach((s) => { s.visible = show; });
  e.target.textContent = show ? 'Sembunyikan nomor' : 'Tampilkan nomor'; e.target.setAttribute('aria-pressed', String(show));
};

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function alertText() {
  if (performance.now() < toastUntil) return { t: toast, bad: false };
  if (sim.fault === 'max_run') return { t: 'GALAT MAX RUN: pompa menyala 10 menit tanpa hasil (tandon kosong?). Pompa terkunci mati. Ganti mode untuk membukanya.', bad: true };
  if (sim.fault === 'no_sensor') return { t: 'GALAT NO SENSOR: semua sensor rusak, pompa dimatikan demi keamanan.', bad: true };
  if (sim.pump && sim.tank <= 0) return { t: 'Pompa menyala tetapi tandon kosong, tanah tidak bertambah basah.', bad: false };
  if (sim.mode === 'manual') return { t: 'Mode Manual: pompa hanya mengikuti tombol.', bad: false };
  return { t: sim.pump ? 'Pompa menyala sampai rata-rata mencapai 80 %.' : 'Pompa mati. Tanah mengering pelan; pompa menyala bila rata-rata di bawah 60 %. Tekan Keringkan untuk mempercepat.', bad: false };
}
function refreshUI() {
  const m = Sim.average(sim.sensors);
  $('v-avg').textContent = Number.isNaN(m) ? '---' : `${m.toFixed(1)} %`;
  $('v-pump').textContent = sim.pump ? 'ON' : 'OFF'; $('v-pump').className = sim.pump ? 'on' : '';
  $('v-mode').textContent = sim.mode === 'auto' ? 'Auto' : 'Manual';
  $('v-tank').textContent = `${sim.tank.toFixed(0)} %`;
  $('v-time').textContent = fmtTime(sim.t);
  const a = alertText(); const al = $('alert');
  if (al.textContent !== a.t) al.textContent = a.t; al.className = a.bad ? 'bad' : '';
  document.querySelectorAll('#mode button').forEach((b) => b.classList.toggle('on', b.dataset.mode === sim.mode));
  document.querySelectorAll('#speed button[data-v]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === speed));
  $('play').textContent = playing ? 'Jeda' : 'Lanjut';
  const manual = sim.mode === 'manual';
  document.querySelectorAll('#pump-ctl button').forEach((b) => { b.disabled = !manual; });
  sensorsBox.querySelectorAll('button').forEach((b, i) => {
    const s = sim.sensors[i]; b.textContent = `S${i + 1} ${s.valid ? s.pct.toFixed(0) + '%' : 'rusak'}`; b.classList.toggle('bad', !s.valid);
    b.setAttribute('aria-label', `Sensor ${i + 1}, ${s.valid ? s.pct.toFixed(0) + ' persen, tekan untuk menandai rusak' : 'rusak, tekan untuk memulihkan'}`);
  });
  updateCardLive(); relabelButtons(); drawChart();
}

function drawChart() {
  const c = $('chart'), g = c.getContext('2d'), W = c.width, H = c.height;
  const cs = getComputedStyle(document.documentElement), col = (n) => cs.getPropertyValue(n).trim();
  g.clearRect(0, 0, W, H);
  const lo = 20, hi = 100, y = (v) => H - 14 - ((clamp(v, lo, hi) - lo) / (hi - lo)) * (H - 28);
  g.font = '18px system-ui, sans-serif'; g.fillStyle = col('--muted'); g.textBaseline = 'middle';
  [[80, col('--blue')], [60, col('--amber')]].forEach(([v, c2]) => {
    g.strokeStyle = c2; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(44, y(v)); g.lineTo(W - 6, y(v)); g.stroke();
    g.fillStyle = c2; g.fillText(String(v), 6, y(v));
  });
  g.setLineDash([]);
  if (history.length < 2) return;
  const x = (i) => 44 + (i / 359) * (W - 50), off = 360 - history.length;
  g.fillStyle = col('--green-soft');
  history.forEach((p, i) => { if (p.pump) g.fillRect(x(i + off) - 1, 6, (W - 50) / 359 + 2, H - 20); });
  g.strokeStyle = col('--green'); g.lineWidth = 3; g.beginPath();
  history.forEach((p, i) => { if (Number.isNaN(p.avg)) return; const px2 = x(i + off), py = y(p.avg); i ? g.lineTo(px2, py) : g.moveTo(px2, py); });
  g.stroke();
}

// ---------- kartu keterangan + klik ----------
const card = $('card'); let selected = null;
function showCard(key) {
  const h = hot[key]; if (!h) return; selected = key;
  card.replaceChildren();
  const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', 'Tutup keterangan');
  x.onclick = closeCard;
  const t = document.createElement('h3'); t.textContent = h.title;
  const p = document.createElement('p'); p.textContent = h.text; card.append(x, t, p);
  if (h.live) { const l = document.createElement('p'); l.className = 'val'; l.dataset.live = '1'; l.textContent = h.live(); card.appendChild(l); }
  if (h.acts) {
    const row = document.createElement('div'); row.className = 'acts';
    h.acts.forEach((a) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = a.label; b.dataset.act = a.act; if (a.arg !== undefined) b.dataset.arg = a.arg; row.appendChild(b); });
    card.appendChild(row);
  }
  card.hidden = false;
}
function closeCard() { card.hidden = true; selected = null; }
function updateCardLive() {
  if (!selected || card.hidden) return;
  const l = card.querySelector('[data-live]'); if (l && hot[selected].live) l.textContent = hot[selected].live();
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });

const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(hotMeshes, false)[0]; return hit?.object ?? null;
}
let down = null, hovered = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (embed) return;
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
  down = null; const o = pick(e); if (!o) return;
  if (o.userData.btn) { o.userData.press = 1; buttonAction[o.userData.btn](); return; }
  const key = o.userData.hot;
  if (hot[key].opensLid && !open) open = true;
  if (key === 'casing') open = !open;
  if (key === 'pump') act('pump-toggle');
  showCard(key);
});
function setHover(o) {
  if (o === hovered) return;
  const paint = (obj, on) => { const key = obj?.userData.hot; if (!key) return; hot[key].meshes.forEach((m) => { if (m.material?.emissive) m.material.emissive.setHex(on ? 0x3a3a1a : 0x000000); }); };
  paint(hovered, false); hovered = o; paint(o, true);
  renderer.domElement.style.cursor = o ? 'pointer' : '';
}
renderer.domElement.addEventListener('pointermove', (e) => { if (embed || e.buttons) return; setHover(pick(e)); });

// ---------- loop ----------
function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const ledColor = (s) => !s.valid ? 0x777777 : s.pct < Sim.M_SET ? 0xe0a94d : s.pct >= Sim.M_MAX ? 0x6fb7e0 : 0x5fbf85;
// Simulasi dan UI berjalan di timer sendiri, bukan di loop gambar: loop gambar (requestAnimationFrame)
// berhenti saat tab tersembunyi atau panel tidak digambar, dan logika tidak boleh ikut berhenti.
let lastTick = performance.now();
setInterval(() => {
  const now = performance.now(), dt = Math.min((now - lastTick) / 1000, 1); lastTick = now;
  if (!playing) return;
  Sim.stepSim(sim, dt * speed);
  while (sim.t - lastSample >= 10) {
    lastSample += 10; history.push({ avg: Sim.average(sim.sensors), pump: sim.pump }); if (history.length > 360) history.shift();
  }
}, 100);
setInterval(refreshUI, 250);

// ---------- mode embed: putar kamera mengikuti scroll halaman induk ----------
let dragAngle = 0, dragging = false, dragLastX = 0, dragIdleAt = 0;
let orbitGoal = 0.5, orbitNow = 0.5, paused = false, readySent = false;   // 0.5 = elemen di tengah layar = tampak depan
// Dikirim setelah frame pertama tergambar, atau paling lambat 1 detik setelah dimuat (loop gambar bisa tertunda).
function sendReady() {
  if (!embed || readySent) return;
  readySent = true; parent.postMessage({ type: 'irri-ready' }, location.origin);
}
if (embed) setTimeout(sendReady, 1000);
const SWEEP = Math.PI * 1.5;   // total putaran dari ujung bawah sampai ujung atas layar
// Tampak depan (sudut 0) tepat saat elemen di tengah layar; kuadrat membuatnya bertahan menghadap depan agak lama.
const orbitAngle = (p) => { const u = (p - 0.5) * 2; return Math.sign(u) * u * u * (SWEEP / 2); };
const off0 = camera.position.clone().sub(controls.target);
const r0 = Math.hypot(off0.x, off0.z), th0 = Math.atan2(off0.x, off0.z), h0 = off0.y;
if (embed) {
  const hex = q.get('bg') || '12301f';
  document.body.classList.add('embed'); controls.enabled = false;
  // Seret mendatar memutar model; gesekan vertikal tetap menggulir halaman (touch-action: pan-y).
  const dom = renderer.domElement;
  dom.style.touchAction = 'pan-y'; dom.style.cursor = 'grab';
  dom.addEventListener('pointerdown', (e) => { dragging = true; dragLastX = e.clientX; dom.setPointerCapture(e.pointerId); dom.style.cursor = 'grabbing'; });
  dom.addEventListener('pointermove', (e) => { if (!dragging) return; dragAngle += (e.clientX - dragLastX) * 0.012; dragLastX = e.clientX; });
  const endDrag = () => { if (!dragging) return; dragging = false; dragIdleAt = performance.now(); dom.style.cursor = 'grab'; };
  dom.addEventListener('pointerup', endDrag); dom.addEventListener('pointercancel', endDrag);
  scene.background = new THREE.Color('#' + hex); floor.material.color.set('#' + hex);
  document.documentElement.style.background = '#' + hex;
  labelSprites.forEach((sp) => { sp.visible = false; }); panelObjs.forEach((o) => { o.visible = false; });
  if (q.get('open') === '1') open = true;
  resize();
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== parent) return;
    const d = e.data;
    if (d?.type === 'irri-orbit' && Number.isFinite(d.p)) orbitGoal = clamp(d.p, 0, 1);
    if (d?.type === 'irri-visible') paused = !d.v;
  });
}

let lcdKey = '';
renderer.setAnimationLoop(() => {
  if (paused) return;
  const flowing = sim.pump && sim.tank > 0, now = performance.now() / 1000;

  patches.forEach((p, i) => { p.material.color.lerpColors(dryColor, wetColor, clamp(sim.sensors[i].pct / 100, 0, 1)); leds[i].material.color.setHex(ledColor(sim.sensors[i])); });
  const lvl = Math.max(sim.tank / 100, 0.001); water.scale.y = lvl; water.position.y = 2 + 6 * lvl; water.visible = sim.tank > 0.5;
  hoses.forEach((h) => h.material.emissive.setHex(flowing ? 0x1a6a96 : 0x000000));
  relayLed.material.color.setHex(sim.pump ? 0xff3b30 : 0x331111);
  pump.position.x = -37 + (sim.pump && !reduceMotion ? Math.sin(now * 70) * 0.05 : 0);
  for (let i = 0; i < 6 * DROPS_PER; i++) {
    const k = Math.floor(i / DROPS_PER), ph = reduceMotion ? (i % DROPS_PER) / DROPS_PER : (now * 1.6 + i * 0.37) % 1;
    dummy.position.set(xs[k], 13.2 - ph * 0.8, 0); dummy.scale.setScalar(flowing ? 1 : 0.0001); dummy.updateMatrix(); drops.setMatrixAt(i, dummy.matrix);
  }
  drops.instanceMatrix.needsUpdate = true;
  Object.values(buttons).forEach((b) => { b.userData.press *= 0.86; b.position.y = b.userData.baseY - 0.9 * b.userData.press; });

  const ty = open ? 19 : 6.2; lidGroup.position.y = reduceMotion ? ty : lidGroup.position.y + (ty - lidGroup.position.y) * 0.12;
  if (spin) { const a = 0.004, p = camera.position.clone().sub(controls.target); camera.position.set(controls.target.x + p.x * Math.cos(a) - p.z * Math.sin(a), p.y + controls.target.y, controls.target.z + p.x * Math.sin(a) + p.z * Math.cos(a)); }

  const key = Sim.lcdLines(sim).join('|'); if (key !== lcdKey) { lcdKey = key; drawLcd(); }
  if (embed) {
    orbitNow += (orbitGoal - orbitNow) * (reduceMotion ? 1 : 0.12);
    // Setelah dilepas 1,5 detik, putaran manual perlahan kembali agar model menghadap depan lagi saat di tengah layar.
    if (!dragging && (reduceMotion || performance.now() - dragIdleAt > 1500)) dragAngle *= reduceMotion ? 0 : 0.93;
    const th = th0 + orbitAngle(orbitNow) + dragAngle;
    camera.position.set(controls.target.x + r0 * Math.sin(th), controls.target.y + h0, controls.target.z + r0 * Math.cos(th));
    camera.lookAt(controls.target);
  } else controls.update();
  renderer.render(scene, camera); window.__ready = true;
  sendReady();
});
drawLcd(); refreshUI();
window.__prototype = { act, get sim() { return sim; }, hot, get orbit() { return orbitNow; }, get orbitGoal() { return orbitGoal; }, get paused() { return paused; }, get dragAngle() { return dragAngle; } };
