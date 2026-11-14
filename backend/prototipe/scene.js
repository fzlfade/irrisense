import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStrokedToon, setToonOutline } from './stroked-toon.js';
import * as Sim from './sim.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
// Mode embed (?embed=1): hanya model 3D, dipakai landing page. Kamera berputar mengikuti pesan 'irri-orbit' dari halaman induk.
const q = new URLSearchParams(location.search);
const embed = q.get('embed') === '1';
// Mode embed hanya butuh kanvas: panel samping, toolbar, kartu, dan catatan dibuang dari DOM agar ringan.
if (embed) document.querySelectorAll('aside, .toolbar, #card, .note').forEach((el) => el.remove());
const vec = (str, def) => { const a = (str || '').split(',').map(Number); return a.length === 3 && a.every(Number.isFinite) ? a : def; };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- renderer, kamera, cahaya (satuan adegan: cm) ----------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
const look = createStrokedToon(renderer);
renderer.domElement.setAttribute('aria-label', 'Model 3D prototipe IrriSense di rangka paralon. Gunakan tombol di samping untuk mengontrol simulasi.');
view.insertBefore(renderer.domElement, view.firstChild);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe8dc);
const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
camera.position.set(...vec(q.get('cam'), [-150, 160, 300]));
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(...vec(q.get('tgt'), [-14, 26, 8]));
controls.enableDamping = !reduceMotion;
controls.maxPolarAngle = Math.PI * 0.48;
const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.55);
keyLight.position.set(140, 260, 180); keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.bias = -0.0004; keyLight.shadow.normalBias = 1;
Object.assign(keyLight.shadow.camera, { left: -130, right: 130, top: 110, bottom: -110, near: 50, far: 600 });
const fillLight = new THREE.DirectionalLight(0xdfe9ff, 0.72); fillLight.position.set(-200, 120, -100);
scene.add(new THREE.HemisphereLight(0xfff6e6, 0x7a6a58, 1.55), keyLight, fillLight);

// ---------- pembantu geometri ----------
// Model rangka paralon dari docs/prototype/diorama/src/main.js ditulis dalam meter; grup `world` berskala 100
// membuatnya cm seperti sisa adegan (kamera, label, panel, parameter URL cam/tgt).
const world = new THREE.Group(); world.scale.setScalar(100); scene.add(world);
// Objek yang ditambahkan sesudah part('x') dicatat di kelompok rakit 'x'; mode cerita (bawah) merakit model per kelompok.
const parts = {};
let curPart = null;
const part = (key) => { curPart = key; };
function add(o, parent = world) {
  if (o.isMesh) o.castShadow = o.receiveShadow = true;
  parent.add(o); if (parent === world && curPart) (parts[curPart] ||= []).push(o); return o;
}
const toon = (c, o) => look.toon(c, o);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function box(w, h, d, mat, x, y, z, parent) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent); m.position.set(x, y, z); return m; }
function cyl(r, h, mat, x, y, z, parent, seg = 24) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat), parent); m.position.set(x, y, z); return m; }
function rod(a, b, r, mat, parent, seg = 20) {
  const d = b.clone().sub(a), m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat), parent);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function tube(points, r, mat, parent, seg = 80) {
  return add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal'), seg, r, 10), mat), parent);
}
function group(x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); return add(g); }

// ---------- hotspot (bagian yang bisa diklik) ----------
const hot = {};            // key -> { title, meshes, text, live, acts }
const hotMeshes = [];
function reg(key, meshes, def) {
  // Material diklon per hotspot: sorotan (emissive) satu bagian tidak boleh ikut menyalakan bagian lain yang berbagi material.
  meshes.forEach((m) => { m.material = m.material.clone(); m.userData.hot = key; hotMeshes.push(m); });
  hot[key] = { meshes, ...def };
}

// ---------- ukuran rangka (meter, PERKIRAAN dari foto; sama dengan diorama) ----------
const L = 1.0, W = 0.6, H = 0.75, POST = 0.25, R = 0.0135;  // pipa 3/4" (OD ~27 mm)
const BY = R * 1.45;              // sumbu pipa alas: fitting menapak lantai
const HY = BY + R * 1.45 + 0.009; // sumbu selang utama di atas rel tengah
const GX = -0.82;                 // posisi galon
const SOIL_Y = 0.1845, POT_R = 0.098;
const PZ = W / 2, BOX_Z = PZ + R + 0.006 + 0.02, BOX_Y = 0.15;
const C = {
  pvc: toon(0xf1f0ea), fit: toon(0x7d8287), floor: toon(0xb5644f), grout: toon(0x8e4a3a, { outline: false }),
  bag: toon(0x232320), stake: toon(0xc9a46a), leaf: toon(0x3f8f55), leaf2: toon(0x2f7647), vine: toon(0x4f9a58, { outline: false }),
  pcb: toon(0x1d1d1d), prong: toon(0xc9a24a, { outline: false }), scase: toon(0x2e5f86),
  cable: toon(0x262626, { outline: false }), hose: toon(0x161616), micro: toon(0x1c1c1c, { outline: false }),
  drip: toon(0x6b3fa0), cap: toon(0xb52a2a), conn: toon(0x2a2a2a),
  box: toon(0x2b3a36), lid: toon(0x3a4a45), bezel: toon(0x0f2a20), screw: toon(0x9aa3a0, { outline: false }),
  dht: toon(0x4fa0d8), black: toon(0x151515), strip: toon(0xefeee8), socket: toon(0x6b6b6b, { outline: false }),
  pump: toon(0xb9892b),
  glass: toon(0xcfe8f2, { outline: false, transparent: true, opacity: 0.28, depthWrite: false }),
  water: toon(0x2d8fc0, { outline: false, transparent: true, opacity: 0.55, depthWrite: false }),
  board: toon(0x1f6b3a), esp: toon(0x15203a), chip: toon(0xc0c0c0, { outline: false }), relay: toon(0x2358a6),
};
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

// ---------- lantai ----------
const floor = box(10, 0.005, 8, toon(0xcfd9cb, { outline: false }), -0.15, -0.0425, 0.1); floor.castShadow = false;
const SLAB = { x0: -1.04, x1: 0.74, z0: -0.46, z1: 0.68 };
box(SLAB.x1 - SLAB.x0, 0.04, SLAB.z1 - SLAB.z0, C.floor, (SLAB.x0 + SLAB.x1) / 2, -0.02, (SLAB.z0 + SLAB.z1) / 2).castShadow = false;
for (let x = -0.84; x < SLAB.x1; x += 0.4) box(0.006, 0.0012, SLAB.z1 - SLAB.z0, C.grout, x, 0.0006, (SLAB.z0 + SLAB.z1) / 2).castShadow = false;
for (let z = -0.26; z < SLAB.z1; z += 0.4) box(SLAB.x1 - SLAB.x0, 0.0012, 0.006, C.grout, (SLAB.x0 + SLAB.x1) / 2, 0.0006, z).castShadow = false;
part('bed');

// ---------- rangka paralon: alas kisi, 3 kuda-kuda, bubungan ----------
const frame = group(0, 0, 0);
function pipe(a, b) { // pipa + selongsong fitting di kedua ujung
  rod(a, b, R, C.pvc, frame);
  const dir = b.clone().sub(a).normalize();
  for (const [p, s] of [[a, 1], [b, -1]]) rod(p.clone().addScaledVector(dir, s * 0.004), p.clone().addScaledVector(dir, s * 0.034), R * 1.26, C.fit, frame, 18);
}
const joint = (p) => { add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.45, 18, 12), C.fit), frame).position.copy(p); };
const XS = [-0.5, -0.25, 0, 0.25, 0.5], ZS = [-W / 2, 0, W / 2], TRUSS = [-0.5, 0, 0.5];
for (const z of ZS) for (let i = 0; i < XS.length - 1; i++) pipe(V(XS[i], BY, z), V(XS[i + 1], BY, z));
for (const x of XS) { pipe(V(x, BY, -W / 2), V(x, BY, 0)); pipe(V(x, BY, 0), V(x, BY, W / 2)); for (const z of ZS) joint(V(x, BY, z)); }
for (const x of TRUSS) {
  for (const z of [-W / 2, W / 2]) { pipe(V(x, BY, z), V(x, POST, z)); pipe(V(x, POST, z), V(x, H, 0)); joint(V(x, POST, z)); }
  joint(V(x, H, 0));
}
for (let i = 0; i < TRUSS.length - 1; i++) pipe(V(TRUSS[i], H, 0), V(TRUSS[i + 1], H, 0));

// ---------- 6 polybag vanili, sensor tanah, dripper ----------
const POTS = []; for (const x of [-0.375, -0.125, 0.125]) for (const z of [-0.15, 0.15]) POTS.push([x, z]);
const xs = POTS.map(([x]) => x * 100);   // posisi tanaman dalam cm (dipakai label)
const patches = [], leds = [], drips = [];
const dryColor = new THREE.Color(0x8a6a48), wetColor = new THREE.Color(0x2a1a10);
POTS.forEach(([px, pz], i) => {
  part('bed');
  const g = group(px, 0, pz);
  const prof = [[0.001, 0], [0.083, 0], [0.087, 0.012], [0.095, 0.192], [POT_R, 0.2], [0.094, 0.2], [0.091, 0.183], [0.001, 0.183]].map(([a, b]) => new THREE.Vector2(a, b));
  add(new THREE.Mesh(new THREE.LatheGeometry(prof, 36), C.bag), g);
  for (const y of [0.07, 0.13]) { const fold = add(new THREE.Mesh(new THREE.TorusGeometry(0.087 + y * 0.04, 0.0018, 6, 36), C.black), g); fold.rotation.x = Math.PI / 2; fold.position.y = y; }
  const soil = add(new THREE.Mesh(new THREE.CircleGeometry(0.0905, 32), toon(0x7b5a3c, { outline: false })), g);
  soil.rotation.x = -Math.PI / 2; soil.position.y = SOIL_Y;
  // ajir + sulur spiral + daun
  rod(V(0.035, 0.12, 0), V(0.035, 0.62, 0), 0.0055, C.stake, g, 10);
  const turns = 2.1 + hash(i) * 0.5, ph = hash(i + 9) * Math.PI * 2, spiral = [];
  for (let k = 0; k <= 40; k++) { const u = k / 40, a = ph + u * turns * Math.PI * 2; spiral.push(V(0.035 + Math.cos(a) * 0.011, SOIL_Y + 0.004 + u * 0.4, Math.sin(a) * 0.011)); }
  tube(spiral, 0.0032, C.vine, g, 120);
  for (let k = 0; k < 7; k++) {
    const u = 0.12 + k * 0.125, a = ph + u * turns * Math.PI * 2;
    const lg = new THREE.Group(); lg.position.set(0.035 + Math.cos(a) * 0.011, SOIL_Y + 0.004 + u * 0.4, Math.sin(a) * 0.011); lg.rotation.y = -a; g.add(lg);
    rod(V(0, 0, 0), V(0.014, -0.002, 0), 0.0016, C.vine, lg, 6);
    const leaf = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), k % 2 ? C.leaf : C.leaf2), lg);
    leaf.scale.set(0.034 + hash(i * 7 + k) * 0.01, 0.0045, 0.017); leaf.position.set(0.045, -0.006, 0); leaf.rotation.z = -0.28;
  }
  // sensor kapasitif: garpu di tanah, PCB, casing, lampu status di atasnya
  part('sensor');
  const sg = group(px, 0, pz), sx = -0.05;
  const prongs = [-0.006, 0.006].map((dx) => box(0.004, 0.08, 0.0018, C.prong, sx + dx, SOIL_Y - 0.035, 0, sg));
  const pcb = box(0.024, 0.045, 0.0018, C.pcb, sx, SOIL_Y + 0.028, 0, sg);
  const scase = box(0.028, 0.026, 0.012, C.scase, sx, SOIL_Y + 0.044, 0, sg);
  const led = add(new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), look.flat(0x5fbf85)), sg); led.position.set(sx, SOIL_Y + 0.061, 0);
  // dripper stik: kepala ungu di atas tanah, stik tertancap
  part('air');
  const s = Math.sign(pz), dg = group(px, 0, pz - s * 0.06);
  cyl(0.008, 0.011, C.drip, 0, SOIL_Y + 0.034, 0, dg);
  const stick = add(new THREE.Mesh(new THREE.ConeGeometry(0.0038, 0.07, 10), C.drip), dg); stick.rotation.x = Math.PI; stick.position.y = SOIL_Y - 0.007;
  drips.push([px + 0.0075, pz - s * 0.06]);
  patches.push(soil); leds.push(led);
  reg(`s${i}`, [soil, scase, pcb, ...prongs, led], {
    title: `Sensor tanah S${i + 1}`,
    text: `Terhubung ke GPIO ${Sim.SENSOR_GPIO[i]} (ADC1). Lampu di atas sensor: kuning di bawah 60 %, hijau 60 sampai 80 %, biru di atas 80 %, abu-abu bila sensor rusak.`,
    live: () => {
      const s2 = sim.sensors[i];
      return s2.valid ? `Kelembapan: ${s2.pct.toFixed(1)} %` : 'Sensor rusak (diabaikan dari rata-rata)';
    },
    acts: [
      { label: 'Keringkan', act: 'sensor-dry', arg: i },
      { label: 'Basahi', act: 'sensor-wet', arg: i },
      { label: 'Rusak / pulih', act: 'sensor-toggle', arg: i },
    ],
  });
});
// kabel sensor: menyusuri rel melintang di sebelah polybag, melompati selang di rel tengah, masuk duct
part('sensor');
const DUCT_Y = 0.0125, DUCT_Z = PZ + 0.03;
POTS.forEach(([px, pz]) => {
  const rx = px - 0.125, sx = px - 0.05, y = BY + R + 0.0028, pts = [V(sx, SOIL_Y + 0.057, pz), V(sx - 0.012, SOIL_Y + 0.07, pz), V(px - POT_R - 0.004, 0.214, pz), V(px - 0.115, 0.1, pz), V(rx, y + 0.004, pz)];
  if (pz < 0) pts.push(V(rx, y, -0.05), V(rx, HY + 0.014, -0.012), V(rx, HY + 0.014, 0.012), V(rx, y, 0.05));
  pts.push(V(rx, y, PZ - 0.045), V(rx + 0.03, y + 0.002, PZ - 0.035), V(rx + 0.03, BY + R + 0.0058, PZ), V(rx + 0.03, 0.0265, DUCT_Z));
  tube(pts, 0.0026, C.cable, world, 90);
});

// ---------- selang utama, klip, cabang, galon, pompa celup ----------
part('air');
const hoses = [];
const hoseEnd = 0.2;
hoses.push(tube([V(GX, 0.045, 0), V(GX, 0.3, 0), V(GX, 0.49, 0), V(GX + 0.045, 0.53, 0), V(GX + 0.12, 0.47, 0), V(GX + 0.16, 0.42, 0),
  V(GX + 0.175, 0.2, 0), V(GX + 0.2, 0.012, 0), V(-0.6, 0.009, 0), V(-0.545, 0.02, 0), V(-0.5, HY, 0)], 0.008, C.hose, world, 160));
hoses.push(rod(V(-0.5, HY, 0), V(hoseEnd, HY, 0), 0.008, C.hose));
rod(V(hoseEnd - 0.004, HY, 0), V(hoseEnd + 0.016, HY, 0), 0.0095, C.cap);
for (const x of [-0.44, -0.19, 0.06]) box(0.01, HY - BY - R, 0.022, C.black, x, (BY + R + HY) / 2, 0);
POTS.forEach(([px, pz]) => {
  const s = Math.sign(pz);
  cyl(0.005, 0.016, C.conn, px, HY + 0.012, 0);
  hoses.push(tube([V(px, HY + 0.018, 0), V(px, 0.1, s * 0.02), V(px, 0.2, s * 0.038), V(px, 0.232, s * 0.062), V(px + 0.004, SOIL_Y + 0.045, pz - s * 0.06)], 0.0028, C.micro, world, 60));
});
const galonProf = [[0.001, 0], [0.12, 0], [0.135, 0.02], [0.135, 0.38], [0.11, 0.425], [0.04, 0.45], [0.03, 0.465], [0.03, 0.49], [0.034, 0.495], [0.034, 0.505], [0.028, 0.505]].map(([a, b]) => new THREE.Vector2(a, b));
const tank = add(new THREE.Mesh(new THREE.LatheGeometry(galonProf, 48), C.glass)); tank.position.set(GX, 0, 0); tank.castShadow = false;
tank.userData.seeThrough = true;   // klik menembus dinding galon ke pompa di dalamnya
for (const y of [0.12, 0.24]) { const rib = add(new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.0025, 6, 48), C.glass)); rib.rotation.x = Math.PI / 2; rib.position.set(GX, y, 0); rib.castShadow = false; }
const WATER_TOP = 0.3;
const water = add(new THREE.Mesh(new THREE.CylinderGeometry(0.131, 0.131, WATER_TOP - 0.004, 48), C.water)); water.position.set(GX, (WATER_TOP + 0.004) / 2, 0);
water.castShadow = false; water.userData.seeThrough = true;
const ripple = add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.0025, 6, 40), look.flat(0x4fb0de, { transparent: true, opacity: 0.9 })));
ripple.rotation.x = Math.PI / 2; ripple.position.set(GX, WATER_TOP + 0.001, 0); ripple.scale.set(0.05, 0.05, 1); ripple.castShadow = false;
const pump = group(GX, 0, 0);
const pumpParts = [box(0.05, 0.034, 0.04, C.pump, 0, 0.021, 0, pump), cyl(0.007, 0.012, C.pump, 0, 0.044, 0, pump, 12)];
// kabel pompa: ikut selang keluar lewat mulut galon, menyusur lantai ke ujung kiri kabel duct
tube([V(GX + 0.025, 0.03, 0.01), V(GX + 0.015, 0.25, 0.012), V(GX + 0.012, 0.49, 0.012), V(GX + 0.05, 0.525, 0.012), V(GX + 0.125, 0.47, 0.012), V(GX + 0.165, 0.42, 0.012), V(GX + 0.18, 0.2, 0.012), V(GX + 0.205, 0.006, 0.02), V(-0.62, 0.004, 0.2), V(-0.56, 0.006, 0.33), V(-0.5, 0.0125, 0.33)], 0.0022, C.cable, world, 140);
reg('tank', [tank, water], {
  title: 'Tandon air (galon)',
  text: 'Level turun saat pompa menyala. Bila tandon kosong, pompa berputar tanpa membasahi tanah, sehingga pengaman 10 menit memicu FAULT: MAX RUN.',
  live: () => `Isi tandon: ${sim.tank.toFixed(0)} %`,
  acts: [{ label: 'Kosongkan', act: 'tank-empty' }, { label: 'Isi penuh', act: 'tank-fill' }],
});
reg('pump', pumpParts, {
  title: 'Mini pompa 5 VDC',
  text: 'Pompa celup di dasar galon, dialiri adaptor lewat terminal relay, dengan dioda 1N4007 paralel di pompa. Di mode Manual, klik pompa atau tombol di bawah untuk menyalakannya.',
  live: () => `Pompa: ${sim.pump ? 'ON' : 'OFF'} (mode ${sim.mode === 'auto' ? 'Auto' : 'Manual'})`,
  acts: [{ label: 'Tekan pompa', act: 'pump-toggle' }],
});

// ---------- casing 16 × 14 × 4 cm di tiang depan kuda-kuda tengah ----------
// Casing berongga (dinding belakang + 4 sisi); tutup depan berengsel di sisi kanan, membawa LCD dan LED pompa.
// Engsel kanan: tutup terbuka ke kanan depan, menjauh dari kamera bawaan yang melihat dari kiri.
part('kontrol');
const enclosureParts = [
  box(0.16, 0.14, 0.004, C.box, 0, BOX_Y, BOX_Z - 0.018),
  box(0.16, 0.004, 0.04, C.box, 0, BOX_Y + 0.068, BOX_Z), box(0.16, 0.004, 0.04, C.box, 0, BOX_Y - 0.068, BOX_Z),
  box(0.004, 0.132, 0.04, C.box, -0.078, BOX_Y, BOX_Z), box(0.004, 0.132, 0.04, C.box, 0.078, BOX_Y, BOX_Z),
];
for (const y of [0.11, 0.19]) box(0.04, 0.006, 0.036, C.black, 0, y, PZ + 0.002); // cable tie mengikat casing ke tiang
for (const x of [0.0, 0.045]) cyl(0.0065, 0.012, C.black, x, BOX_Y - 0.076, BOX_Z); // kelenjar kabel di bawah casing
// isi casing: PCB prototipe di dinding belakang, ESP32 dan relay di atasnya, kabel jumper
const IN_Z = BOX_Z - 0.016;
const pcbBoard = box(0.14, 0.12, 0.002, C.board, 0, BOX_Y, IN_Z + 0.001);
const esp = box(0.03, 0.054, 0.004, C.esp, -0.035, BOX_Y + 0.008, IN_Z + 0.004);
const espChip = box(0.017, 0.019, 0.002, C.chip, -0.035, BOX_Y + 0.02, IN_Z + 0.007);
const relay = box(0.04, 0.026, 0.016, C.relay, 0.037, BOX_Y + 0.025, IN_Z + 0.01);
const relayBase = box(0.044, 0.05, 0.002, C.pcb, 0.037, BOX_Y + 0.012, IN_Z + 0.003);
const relayLed = add(new THREE.Mesh(new THREE.SphereGeometry(0.003, 10, 8), look.flat(0x331111))); relayLed.position.set(0.05, BOX_Y - 0.004, IN_Z + 0.005);
[[0xd23b2b, -0.01], [0x2b2b2b, -0.004], [0xe0a94d, 0.002]].forEach(([c, dy]) => tube(
  [V(-0.019, BOX_Y + 0.01 + dy, IN_Z + 0.005), V(0, BOX_Y + 0.004 + dy, IN_Z + 0.009), V(0.016, BOX_Y + 0.006 + dy, IN_Z + 0.005)], 0.0011, toon(c, { outline: false }), world, 16));
// kabel duct di lantai depan rel depan + berkas kabel naik ke casing
const duct = box(L, 0.025, 0.025, C.strip, 0, DUCT_Y, DUCT_Z);
tube([V(0.03, 0.025, DUCT_Z), V(0.024, 0.05, DUCT_Z + 0.004), V(0.004, BOX_Y - 0.082, BOX_Z)], 0.0045, C.cable, world, 24);

part('data');
const lidGroup = group(0.08, BOX_Y, BOX_Z + 0.02);   // engsel di tepi kanan depan casing
const lid = box(0.16, 0.14, 0.004, C.lid, -0.08, 0, -0.002, lidGroup);
for (const [x, y] of [[-0.07, 0.06], [0.07, 0.06], [-0.07, -0.06], [0.07, -0.06]]) { const sc = cyl(0.0035, 0.003, C.screw, -0.08 + x, y, 0.0015, lidGroup); sc.rotation.x = Math.PI / 2; }
const lcdBody = box(0.098, 0.06, 0.006, C.bezel, -0.08, 0.015, 0.003, lidGroup);
const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 420; lcdCanvas.height = 150;
const lcdTex = new THREE.CanvasTexture(lcdCanvas); lcdTex.colorSpace = THREE.SRGBColorSpace;
function drawLcd() {
  const g = lcdCanvas.getContext('2d');
  g.fillStyle = '#0d3b2e'; g.fillRect(0, 0, 420, 150);
  g.fillStyle = '#8cffb8'; g.font = 'bold 30px monospace'; g.textBaseline = 'alphabetic';
  Sim.lcdLines(sim).forEach((t, i) => g.fillText(t, 6, 31 + i * 36));
  lcdTex.needsUpdate = true;
}
const lcdScr = add(new THREE.Mesh(new THREE.PlaneGeometry(0.084, 0.03), setToonOutline(new THREE.MeshBasicMaterial({ map: lcdTex, toneMapped: false }), false)), lidGroup);
lcdScr.position.set(-0.08, 0.016, 0.0062); lcdScr.castShadow = false;
const pumpLed = add(new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), look.flat(0x24452f)), lidGroup); pumpLed.position.set(-0.025, -0.038, 0.002);
box(0.018, 0.004, 0.002, C.screw, -0.05, -0.038, 0.0005, lidGroup); // label kecil di samping LED
reg('casing', [...enclosureParts, lid], {
  title: 'Casing 16 × 14 × 4 cm',
  text: 'Wadah elektronik, diikat dua cable tie ke tiang depan. Klik untuk membuka atau menutup tutupnya dan melihat ESP32, relay, dan PCB di dalam. Lampu hijau di tutup menyala saat pompa ON.',
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
reg('relay', [relay, relayBase], {
  title: 'Relay 1 channel',
  text: 'IN ke D26, VCC ke 5 V (baris VIN). Saat ON, relay menyambungkan adaptor ke pompa. Lampu kecil di bawahnya menyala merah saat pompa ON.',
  live: () => `Relay: ${sim.pump ? 'ON' : 'OFF'}`,
  opensLid: true,
});
reg('pcb', [pcbBoard], {
  title: 'PCB prototipe + kabel jumper',
  text: 'Papan tempat ESP32 dan relay dipasang. Kabel jumper menyambung pin D26 ke IN relay serta jalur 5 V dan GND.',
  opensLid: true,
});

// ---------- DHT11 di tiang atas casing, adaptor + stopkontak ----------
part('data');
const DHT_Z = PZ + 0.027;
const dht = box(0.017, 0.023, 0.008, C.dht, 0, 0.238, DHT_Z);
for (let k = 0; k < 4; k++) box(0.012, 0.0012, 0.0005, C.box, 0, 0.231 + k * 0.004, DHT_Z + 0.0042);
box(0.03, 0.005, 0.03, C.black, 0, 0.238, PZ + 0.006);
tube([V(0.004, 0.2265, DHT_Z), V(0.012, 0.223, DHT_Z + 0.004), V(0.03, 0.2205, BOX_Z)], 0.0018, C.cable, world, 20);
part('air');
box(0.2, 0.024, 0.05, C.strip, 0.27, 0.012, 0.55);
for (const x of [0.2, 0.26, 0.32]) box(0.022, 0.002, 0.03, C.socket, x, 0.0245, 0.55);
const adaptor = box(0.05, 0.04, 0.035, C.black, 0.215, 0.044, 0.55);
tube([V(0.19, 0.04, 0.55), V(0.12, 0.008, 0.5), V(0.06, 0.008, 0.42), V(0.046, 0.04, BOX_Z + 0.03), V(0.045, BOX_Y - 0.082, BOX_Z)], 0.003, C.cable, world, 40);
tube([V(0.37, 0.012, 0.55), V(0.5, 0.006, 0.6), V(SLAB.x1 - 0.002, 0.006, 0.62), V(SLAB.x1 + 0.004, -0.03, 0.62)], 0.0035, C.cable, world, 24);
reg('adaptor', [adaptor], {
  title: 'Adaptor 5 VDC 2 A',
  text: 'Pada rangkaian yang dibangun, adaptor hanya menyuplai jalur pompa lewat relay. ESP32 dipasok kabel USB, dan keduanya tidak boleh disambung bersamaan ke pin VIN.',
});
reg('dht', [dht], {
  title: 'Sensor DHT11',
  text: 'DATA ke D4. Diikat ke tiang tepat di atas casing; mengukur suhu dan kelembapan udara, nilainya tampil di LCD dan dashboard.',
  live: () => `Suhu ${sim.temp.toFixed(1)} °C, RH ${sim.hum.toFixed(0)} %`,
});
reg('duct', [duct], {
  title: 'Kabel duct',
  text: 'Di lantai tepat di depan rel depan. Merapikan enam kabel sensor dan kabel pompa sebelum naik ke casing.',
});

// ---------- tetesan air ----------
part('air');
const DROPS_PER = 5;
const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0042, 8, 6), look.flat(0x4fb0de, { transparent: true, opacity: 0.9 }), 6 * DROPS_PER);
drops.frustumCulled = false; add(drops); drops.castShadow = false;
const dummy = new THREE.Object3D();

// ---------- panel tombol virtual ----------
part(null);
const panelStart = scene.children.length;
const panelZ = 92, panelX = -20, FY = -4.25;   // FY: permukaan lantai di luar lempeng teras
const M = (c) => toon(c);
const sbox = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
sbox(46, 2, 14, 0x2b3a36, panelX, FY + 1, panelZ);
function textPlane(w, h, draw, x, y, z, rotX) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d'); draw(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), setToonOutline(new THREE.MeshBasicMaterial({ map: t, transparent: true }), false));
  m.rotation.x = rotX; m.position.set(x, y, z); scene.add(m); return m;
}
textPlane(42, 6, (g, w, h) => {
  g.fillStyle = '#f3ecd8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 34px sans-serif'; g.fillText('PANEL SIMULASI', w / 2, h * 0.36);
  g.font = '24px sans-serif'; g.fillText('alat asli dikontrol lewat dashboard', w / 2, h * 0.74);
}, panelX, FY + 2.05, panelZ - 3.8, -Math.PI / 2);

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
  const cap = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), setToonOutline(new THREE.MeshBasicMaterial({ map: btnTexture(key.toUpperCase(), '', bg) }), false));
  cap.rotation.x = -Math.PI / 2; cap.position.y = 1.02; m.add(cap); m.userData.cap = cap;
  m.position.set(panelX + x, FY + 3, panelZ + 3.2); m.castShadow = true; scene.add(m);
  m.userData.btn = key; m.userData.baseY = FY + 3; m.userData.press = 0; m.userData.bg = bg;
  buttons[key] = m; hotMeshes.push(m); return m;
}
makeButton('mode', -18, '#b9892b'); makeButton('pompa', -6, '#1f6f9c');
makeButton('kering', 6, '#8a6339'); makeButton('basah', 18, '#1f4a31');
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
  ['Mini pompa 5 VDC', '1 buah, pompa celup di dalam galon'],
  ['Adaptor 5 VDC 2 A', '1 buah, menyuplai jalur pompa (ESP32 lewat USB)'],
  ['Enclosure 16 × 14 × 4 cm', '1 buah, wadah elektronik di tiang depan'],
  ['Kabel duct', '1 meter, merapikan kabel sensor'],
  ['Selang irigasi tetes + emitter', '1 set, satu dripper stik per tanaman'],
  ['Kabel jumper, PCB prototipe', 'di dalam casing (buka tutup untuk melihat)'],
];
const lg = $('legend');
if (lg) items.forEach((it, i) => {
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
label(1, -12, 18, 40); label(2, 3, 25, 41); label(3, xs[0] - 9, 23, -15); label(4, xs[2] - 5, 28, -15);
label(5, -6, 25, 35); label(6, 11, 19, 40); label(7, -82, 10, 18); label(8, 21.5, 11, 55);
label(9, 12, 7, 40); label(10, 38, 5, 37); label(11, -32, 7, 4); label(12, -4, 9, 39);
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
if (sensorsBox) for (let i = 0; i < 6; i++) {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.sensor = i; sensorsBox.appendChild(b);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.act) act(b.dataset.act, b.dataset.arg !== undefined ? Number(b.dataset.arg) : undefined);
  else if (b.dataset.mode) act('mode', b.dataset.mode);
  else if (b.dataset.sensor !== undefined) act('sensor-toggle', Number(b.dataset.sensor));
  else if (b.closest('#speed') && b.dataset.v) act('speed', Number(b.dataset.v));
});
if (!embed) {
$('lid').onclick = () => act('lid');
$('spin').onclick = (e) => { spin = !spin; e.target.textContent = spin ? 'Berhenti putar' : 'Putar otomatis'; };
$('labels').onclick = (e) => {
  const show = !labelSprites[0].visible; labelSprites.forEach((s) => { s.visible = show; });
  e.target.textContent = show ? 'Sembunyikan nomor' : 'Tampilkan nomor'; e.target.setAttribute('aria-pressed', String(show));
};
}

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
  if (embed) return;   // mode embed tidak punya panel samping
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
function closeCard() { if (!card) return; card.hidden = true; selected = null; }
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
  const hits = ray.intersectObjects(hotMeshes, false).filter((h) => h.object.visible && h.object.parent.visible);
  // Dinding galon dan air tembus pandang: bagian di baliknya (pompa) yang dipilih, galon hanya bila tidak ada yang lain.
  return (hits.find((h) => !h.object.userData.seeThrough) ?? hits[0])?.object ?? null;
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
if (!embed) setInterval(refreshUI, 250);

// ---------- mode embed: putar kamera mengikuti scroll halaman induk ----------
let dragAngle = 0, dragging = false, dragIdleAt = 0;
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
// ---------- mode cerita (?story=1): progres gulir 0..1 dari landing merakit model dan menerbangkan kamera ----------
const story = embed && q.get('story') === '1';
// Progres saat kamera tiba di tiap langkah. Harus sama dengan landing/lib/storyProgress.ts (dijaga backend/test/story.test.js).
const WAYPOINTS = [0.15, 0.4, 0.65, 0.9];
const HOLD = 0.05;   // kamera diam selama ±HOLD di sekitar tiap waypoint
const STORY = [
  { cam: [-20, 140, 225], tgt: [-14, 28, 0], lid: 0, keys: ['s0', 's1', 's2', 's3', 's4', 's5'] },   // 1 sensor tanah
  { cam: [35, 50, 120], tgt: [0, 15, 32], lid: 1, keys: ['esp', 'relay', 'pcb'] },                  // 2 ESP32 + relay (casing belum bertutup)
  { cam: [-150, 75, 120], tgt: [-72, 18, 0], lid: 0, keys: ['pump', 'tank'] },                      // 3 pompa + galon
  { cam: [40, 125, 255], tgt: [-12, 26, 10], lid: 0, keys: ['lcd', 'dht'] },                        // 4 data: model utuh, LCD dan DHT11
];
// Kunci kamera: pose awal (progres 0) memperlihatkan lantai teras dengan rangka, polybag, dan sensor yang masih melayang,
// lalu satu pose per langkah.
const KEYS = [{ t: 0, cam: [0, 150, 270], tgt: [-12, 40, 6] }, ...STORY.map((s, i) => ({ t: WAYPOINTS[i], cam: s.cam, tgt: s.tgt }))];
// Tiap kelompok turun lurus dari atas (rise) dan mendarat tepat di waypoint langkah yang membahasnya. Kelompok langkah 2
// sampai 4 disembunyikan sampai gilirannya, supaya tidak melayang di depan kamera atau membuat bayangan lebih dulu.
const ASSEMBLY = [
  { key: 'bed', from: 0, to: 0.1, rise: 25 },
  { key: 'sensor', from: 0.03, to: 0.15, rise: 40 },
  { key: 'kontrol', from: 0.25, to: 0.4, rise: 60, hide: true },
  { key: 'air', from: 0.5, to: 0.65, rise: 80, hide: true },
  { key: 'data', from: 0.75, to: 0.9, rise: 80, hide: true },
];
if (story) ASSEMBLY.forEach((a) => {
  a.group = new THREE.Group(); world.add(a.group);
  (parts[a.key] || []).forEach((o) => a.group.add(o));
});
let storyGoal = 0, storyNow = 0, storyIdx = -1;
const ease3 = (x) => x * x * (3 - 2 * x);
const easeOut3 = (x) => 1 - (1 - x) ** 3;
// Langkah aktif = waypoint terdekat; batasnya di tengah antara dua waypoint.
const stepAt = (p) => { let i = 0; while (i < WAYPOINTS.length - 1 && p > (WAYPOINTS[i] + WAYPOINTS[i + 1]) / 2) i++; return i; };
function storyPose(p) {
  let j = 0; while (j < KEYS.length - 2 && p > KEYS[j + 1].t) j++;
  const a = KEYS[j], b = KEYS[j + 1], from = a.t + (j ? HOLD : 0), to = b.t - HOLD;
  const f = ease3(clamp((p - from) / (to - from), 0, 1)), mix = (x, y) => x.map((v, k) => v + (y[k] - v) * f);
  return { cam: mix(a.cam, b.cam), tgt: mix(a.tgt, b.tgt) };
}
function assemble(p) {
  ASSEMBLY.forEach((a) => {
    a.group.position.y = (a.rise / 100) * (1 - easeOut3(clamp((p - a.from) / (a.to - a.from), 0, 1)));
    a.group.visible = !a.hide || p > a.from;
  });
}
function highlight(keys) {
  Object.values(hot).forEach((h) => h.meshes.forEach((m) => { if (m.material?.emissive) m.material.emissive.setHex(0x000000); }));
  keys.forEach((k) => hot[k]?.meshes.forEach((m) => { if (m.material?.emissive) m.material.emissive.setHex(0x55460f); }));
}

if (embed) {
  const hex = q.get('bg') || '12301f';
  document.body.classList.add('embed'); controls.enabled = false;
  // Seret ditangkap lapisan di halaman induk (Spin3D.tsx) dan datang sebagai pesan 'irri-drag' / 'irri-dragend',
  // karena gulir halus (lenis.css) mematikan pointer di iframe ini.
  // Lantai besar disembunyikan: warna toon-nya tidak pernah persis sama dengan latar halaman induk; lempeng teras jadi alasnya.
  scene.background = new THREE.Color('#' + hex); floor.visible = false;
  document.documentElement.style.background = '#' + hex;
  labelSprites.forEach((sp) => { sp.visible = false; }); panelObjs.forEach((o) => { o.visible = false; });
  if (q.get('open') === '1') open = true;
  resize();
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== parent) return;
    const d = e.data;
    if (d?.type === 'irri-orbit' && Number.isFinite(d.p)) orbitGoal = clamp(d.p, 0, 1);
    if (d?.type === 'irri-progress' && Number.isFinite(d.p)) storyGoal = clamp(d.p, 0, 1);
    if (d?.type === 'irri-visible') paused = !d.v;
    if (d?.type === 'irri-drag' && Number.isFinite(d.dx)) { dragging = true; dragAngle += d.dx * 0.012; }
    if (d?.type === 'irri-dragend') { dragging = false; dragIdleAt = performance.now(); }
  });
}

let lcdKey = '', pumpSince = -1, flowStill = reduceMotion;
renderer.setAnimationLoop(() => {
  if (paused) return;
  const flowing = sim.pump && sim.tank > 0, now = performance.now() / 1000;
  // Di landing (embed) tetesan dan getar pompa bergerak paling lama 5 detik sejak pompa menyala, lalu diam (WCAG 2.2.2).
  if (!sim.pump) pumpSince = -1; else if (pumpSince < 0) pumpSince = now;
  flowStill = reduceMotion || (embed && sim.pump && now - pumpSince > 5);

  patches.forEach((p, i) => { p.material.color.lerpColors(dryColor, wetColor, clamp(sim.sensors[i].pct / 100, 0, 1)); leds[i].material.color.setHex(ledColor(sim.sensors[i])); });
  const lvl = Math.max(sim.tank / 100, 0.001); water.scale.y = lvl; water.position.y = 0.004 + (WATER_TOP - 0.004) * lvl / 2; water.visible = sim.tank > 0.5;
  ripple.visible = flowing; ripple.position.y = 0.006 + (WATER_TOP - 0.004) * lvl;
  { const ru = flowStill ? 0.5 : (now * 0.9) % 1; ripple.scale.set(0.02 + ru * 0.09, 0.02 + ru * 0.09, 1); }
  hoses.forEach((h) => h.material.emissive.setHex(flowing ? 0x1a6a96 : 0x000000));
  relayLed.material.color.setHex(sim.pump ? 0xff3b30 : 0x331111); pumpLed.material.color.setHex(sim.pump ? 0x3ad06b : 0x24452f);
  pump.position.x = GX + (sim.pump && !flowStill ? Math.sin(now * 90) * 0.0007 : 0);
  for (let i = 0; i < 6 * DROPS_PER; i++) {
    const k = Math.floor(i / DROPS_PER), ph = flowStill ? (i % DROPS_PER) / DROPS_PER : (now * 1.6 + i * 0.37) % 1;
    dummy.position.set(drips[k][0], SOIL_Y + 0.03 - ph * 0.03, drips[k][1]); dummy.scale.setScalar(flowing ? 1 : 0.0001); dummy.updateMatrix(); drops.setMatrixAt(i, dummy.matrix);
  }
  drops.instanceMatrix.needsUpdate = true;
  Object.values(buttons).forEach((b) => { b.userData.press *= 0.86; b.position.y = b.userData.baseY - 0.9 * b.userData.press; });

  const ty = open ? 1.9 : 0; lidGroup.rotation.y = reduceMotion ? ty : lidGroup.rotation.y + (ty - lidGroup.rotation.y) * 0.12;
  if (spin) { const a = 0.004, p = camera.position.clone().sub(controls.target); camera.position.set(controls.target.x + p.x * Math.cos(a) - p.z * Math.sin(a), p.y + controls.target.y, controls.target.z + p.x * Math.sin(a) + p.z * Math.cos(a)); }

  const key = Sim.lcdLines(sim).join('|'); if (key !== lcdKey) { lcdKey = key; drawLcd(); }
  if (embed) {
    // Setelah dilepas 1,5 detik, putaran manual perlahan kembali agar model menghadap depan lagi.
    if (!dragging && (reduceMotion || performance.now() - dragIdleAt > 1500)) dragAngle *= reduceMotion ? 0 : 0.93;
    if (story) {
      storyNow += (storyGoal - storyNow) * (reduceMotion ? 1 : 0.15);
      assemble(storyNow);
      const idx = stepAt(storyNow);
      if (idx !== storyIdx) {                                   // langkah berganti: casing, sorotan, dan pompa
        const prev = storyIdx; storyIdx = idx;
        open = STORY[idx].lid === 1; highlight(STORY[idx].keys);
        if (idx === 2) { act('mode', 'manual'); act('pump-on'); } else if (prev === 2) act('mode', 'auto');
      }
      const { cam, tgt } = storyPose(storyNow), c = Math.cos(dragAngle), sn = Math.sin(dragAngle);
      const ox = cam[0] - tgt[0], oz = cam[2] - tgt[2];
      camera.position.set(tgt[0] + ox * c + oz * sn, cam[1], tgt[2] - ox * sn + oz * c);
      camera.lookAt(tgt[0], tgt[1], tgt[2]);
    } else {
      orbitNow += (orbitGoal - orbitNow) * (reduceMotion ? 1 : 0.12);
      const th = th0 + orbitAngle(orbitNow) + dragAngle;
      camera.position.set(controls.target.x + r0 * Math.sin(th), controls.target.y + h0, controls.target.z + r0 * Math.cos(th));
      camera.lookAt(controls.target);
    }
  } else controls.update();
  look.render(scene, camera); window.__ready = true;
  sendReady();
});
drawLcd(); refreshUI();
window.__prototype = { act, scene, camera, get sim() { return sim; }, hot, get orbit() { return orbitNow; }, get orbitGoal() { return orbitGoal; }, get paused() { return paused; }, get dragAngle() { return dragAngle; }, get flowStill() { return flowStill; }, get story() { return { on: story, now: storyNow, goal: storyGoal, idx: storyIdx }; }, get assembled() { return story ? ASSEMBLY.map((a) => +(1 - a.group.position.y * 100 / a.rise).toFixed(3)) : null; }, get open() { return open; }, get lidAngle() { return lidGroup.rotation.y; } };
