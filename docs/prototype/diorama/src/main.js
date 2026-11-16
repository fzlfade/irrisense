// IrriSense di rangka paralon: diorama edukasi, preset stroked-toon, semua geometri dibuat sendiri.
// Satuan meter. +Z = sisi pengunjung. Semua gerak fungsi murni dari t (lihat cycle.js).
import * as THREE from 'three';
import { createStrokedToon } from './core/stroked-toon.js';
import { createDioramaOrbit } from './core/orbit.js';
import { LOOP, T, avgAt, sensorsAt, pumpOnAt, flowAt } from './cycle.js';

// Ukuran rangka: PERKIRAAN dari foto. Ganti setelah diukur.
const L = 1.0, W = 0.6, H = 0.75, POST = 0.25, R = 0.0135; // pipa 3/4" (OD ~27 mm)
const BY = R * 1.45;              // sumbu pipa alas: fitting (r = 1.45R) yang menapak lantai, pipa sedikit terangkat
const HY = BY + R * 1.45 + 0.009; // sumbu selang utama: lolos di atas fitting rel tengah
const GX = -0.82;                 // posisi galon
const q = new URLSearchParams(location.search);
const inject = q.get('inject');   // QA: 'dripper' | 'pot' harus membuat cek konstruksi gagal

// ---------- renderer + preset ----------
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
const look = createStrokedToon(renderer);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 50);

const hemi = new THREE.HemisphereLight(0xfff6e6, 0x7a6a58, 1.55);
const key = new THREE.DirectionalLight(0xfff1dc, 2.55);
key.position.set(1.4, 2.6, 1.8); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.0, bottom: -1.0, near: 0.5, far: 6 });
const fill = new THREE.DirectionalLight(0xdfe9ff, 0.72); fill.position.set(-2, 1.2, -1);
scene.add(hemi, key, fill);

// ---------- material ----------
const M = {
  pvc: look.toon(0xf1f0ea), fit: look.toon(0x7d8287),
  floor: look.toon(0xb5644f), grout: look.toon(0x8e4a3a, { outline: false }),
  bag: look.toon(0x232320), stake: look.toon(0xc9a46a),
  leaf: look.toon(0x3f8f55), leaf2: look.toon(0x2f7647), vine: look.toon(0x4f9a58, { outline: false }),
  pcb: look.toon(0x1d1d1d), prong: look.toon(0xc9a24a, { outline: false }), scase: look.toon(0x2e5f86),
  cable: look.toon(0x262626, { outline: false }), hose: look.toon(0x161616), micro: look.toon(0x1c1c1c, { outline: false }),
  drip: look.toon(0x6b3fa0), cap: look.toon(0xb52a2a), conn: look.toon(0x2a2a2a),
  box: look.toon(0x2b3a36), bezel: look.toon(0x0f2a20), screw: look.toon(0x9aa3a0, { outline: false }),
  dht: look.toon(0x4f9fd6), black: look.toon(0x151515), strip: look.toon(0xefeee8), socket: look.toon(0x6b6b6b, { outline: false }),
  pump: look.toon(0x1e1e1e),
  glass: look.toon(0xcfe8f2, { outline: false, transparent: true, opacity: 0.28, depthWrite: false }),
  water: look.toon(0x2d8fc0, { outline: false, transparent: true, opacity: 0.55, depthWrite: false }),
  wetFloor: look.toon(0x9a5141, { outline: false }),
  drop: look.flat(0x4fb0de, { transparent: true, opacity: 0.9 }),
  wetSoil: look.toon(0x2a1a10, { outline: false }),
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function add(mesh, parent = scene) { mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; }
function box(w, h, d, mat, x, y, z, parent) { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent); m.position.set(x, y, z); return m; }
function cyl(r, h, mat, x, y, z, parent, seg = 24) { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat), parent); m.position.set(x, y, z); return m; }
function rod(a, b, r, mat, parent, seg = 20) {
  const d = b.clone().sub(a), m = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), seg), mat), parent);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function tube(points, r, mat, parent, seg = 80) {
  const c = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  return add(new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 10), mat), parent);
}
const marker = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

// ---------- lantai teras ----------
const SLAB = { x0: -1.04, x1: 0.74, z0: -0.46, z1: 0.68 };
box(SLAB.x1 - SLAB.x0, 0.04, SLAB.z1 - SLAB.z0, M.floor, (SLAB.x0 + SLAB.x1) / 2, -0.02, (SLAB.z0 + SLAB.z1) / 2).castShadow = false;
for (let x = -0.84; x < SLAB.x1; x += 0.4) box(0.006, 0.0012, SLAB.z1 - SLAB.z0, M.grout, x, 0.0006, (SLAB.z0 + SLAB.z1) / 2).castShadow = false;
for (let z = -0.26; z < SLAB.z1; z += 0.4) box(SLAB.x1 - SLAB.x0, 0.0012, 0.006, M.grout, (SLAB.x0 + SLAB.x1) / 2, 0.0006, z).castShadow = false;
// noda basah bekas tumpahan di dekat galon (detail cerita)
const stain = add(new THREE.Mesh(new THREE.CircleGeometry(0.07, 28), M.wetFloor)); stain.rotation.x = -Math.PI / 2; stain.position.set(GX + 0.2, 0.0014, 0.12); stain.scale.set(1.3, 0.8, 1);

// ---------- rangka paralon ----------
const QA = { pipes: [], pots: [], drippers: [], sensors: [], stakes: [], branches: [], groundObjects: [] };
const frame = new THREE.Group(); frame.name = 'frame'; scene.add(frame);
function pipe(a, b) { // pipa + selongsong fitting di kedua ujung
  QA.pipes.push(rod(a, b, R, M.pvc, frame));
  const dir = b.clone().sub(a).normalize();
  for (const [p, s] of [[a, 1], [b, -1]]) rod(p.clone().addScaledVector(dir, s * 0.004), p.clone().addScaledVector(dir, s * 0.034), R * 1.26, M.fit, frame, 18);
}
const joint = (p) => { const m = add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.45, 18, 12), M.fit), frame); m.position.copy(p); };
const XS = [-0.5, -0.25, 0, 0.25, 0.5], ZS = [-W / 2, 0, W / 2], TRUSS = [-0.5, 0, 0.5];
for (const z of ZS) for (let i = 0; i < XS.length - 1; i++) pipe(V(XS[i], BY, z), V(XS[i + 1], BY, z));
for (const x of XS) { pipe(V(x, BY, -W / 2), V(x, BY, 0)); pipe(V(x, BY, 0), V(x, BY, W / 2)); for (const z of ZS) joint(V(x, BY, z)); }
for (const x of TRUSS) {
  for (const z of [-W / 2, W / 2]) { pipe(V(x, BY, z), V(x, POST, z)); pipe(V(x, POST, z), V(x, H, 0)); joint(V(x, POST, z)); }
  joint(V(x, H, 0));
}
for (let i = 0; i < TRUSS.length - 1; i++) pipe(V(TRUSS[i], H, 0), V(TRUSS[i + 1], H, 0));

// ---------- polybag, tanah, vanili, sensor, dripper ----------
const POTS = []; for (const x of [-0.375, -0.125, 0.125]) for (const z of [-0.15, 0.15]) POTS.push([x, z]);
const SOIL_Y = 0.1845, POT_R = 0.098;
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const potGroups = [];
POTS.forEach(([px, pz], i) => {
  const g = new THREE.Group(); g.position.set(px, 0, pz); g.name = `pot-${i + 1}`; scene.add(g); potGroups.push(g);
  const prof = [[0.001, 0], [0.083, 0], [0.087, 0.012], [0.095, 0.192], [POT_R, 0.2], [0.094, 0.2], [0.091, 0.183], [0.001, 0.183]].map(([a, b]) => new THREE.Vector2(a, b));
  const bag = add(new THREE.Mesh(new THREE.LatheGeometry(prof, 36), M.bag), g); bag.name = `bag-${i + 1}`;
  for (const y of [0.07, 0.13]) { const fold = add(new THREE.Mesh(new THREE.TorusGeometry(0.087 + y * 0.04, 0.0018, 6, 36), M.black), g); fold.rotation.x = Math.PI / 2; fold.position.y = y; }
  const soilMat = look.toon(0x7b5a3c, { outline: false });
  const soil = add(new THREE.Mesh(new THREE.CircleGeometry(0.0905, 32), soilMat), g); soil.rotation.x = -Math.PI / 2; soil.position.y = SOIL_Y;
  const wet = add(new THREE.Mesh(new THREE.CircleGeometry(1, 24), M.wetSoil), g); wet.rotation.x = -Math.PI / 2; wet.scale.set(0.03, 0.03, 1); wet.userData.noFit = true;
  const s = Math.sign(pz);
  wet.position.set(0.004, SOIL_Y + 0.0008, -s * 0.06);
  // ajir + sulur spiral + daun
  rod(V(0.035, 0.12, 0), V(0.035, 0.62, 0), 0.0055, M.stake, g, 10);
  QA.stakes.push(marker(g, 0.035, 0.12, 0));
  const turns = 2.1 + hash(i) * 0.5, ph = hash(i + 9) * Math.PI * 2, spiral = [];
  for (let k = 0; k <= 40; k++) { const u = k / 40, a = ph + u * turns * Math.PI * 2; spiral.push(V(0.035 + Math.cos(a) * 0.011, SOIL_Y + 0.004 + u * 0.4, Math.sin(a) * 0.011)); }
  tube(spiral, 0.0032, M.vine, g, 120);
  for (let k = 0; k < 7; k++) {
    const u = 0.12 + k * 0.125, a = ph + u * turns * Math.PI * 2;
    const node = V(0.035 + Math.cos(a) * 0.011, SOIL_Y + 0.004 + u * 0.4, Math.sin(a) * 0.011);
    const lg = new THREE.Group(); lg.position.copy(node); lg.rotation.y = -a; g.add(lg);
    rod(V(0, 0, 0), V(0.014, -0.002, 0), 0.0016, M.vine, lg, 6);
    const leaf = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), k % 2 ? M.leaf : M.leaf2), lg);
    leaf.scale.set(0.034 + hash(i * 7 + k) * 0.01, 0.0045, 0.017); leaf.position.set(0.045, -0.006, 0); leaf.rotation.z = -0.28;
  }
  // sensor kapasitif: garpu di tanah, PCB, casing
  const sx = -0.05;
  for (const dx of [-0.006, 0.006]) box(0.004, 0.08, 0.0018, M.prong, sx + dx, SOIL_Y - 0.035, 0, g);
  box(0.024, 0.045, 0.0018, M.pcb, sx, SOIL_Y + 0.028, 0, g);
  box(0.028, 0.026, 0.012, M.scase, sx, SOIL_Y + 0.044, 0, g);
  QA.sensors.push(marker(g, sx, SOIL_Y - 0.075, 0));
  // dripper stik: kepala ungu di atas tanah, stik tertancap
  const dz = -s * 0.06, dg = new THREE.Group(); dg.position.set(0, 0, dz); g.add(dg);
  cyl(0.008, 0.011, M.drip, 0, SOIL_Y + 0.034, 0, dg);
  const stick = add(new THREE.Mesh(new THREE.ConeGeometry(0.0038, 0.07, 10), M.drip), dg); stick.rotation.x = Math.PI; stick.position.y = SOIL_Y - 0.007;
  QA.drippers.push(marker(dg, 0, SOIL_Y - 0.04, 0));
  const drops = [0, 1].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 10, 8), M.drop); d.scale.y = 1.35; dg.add(d); return d; });
  QA.pots.push({ group: g, bag, soilMat, wet, drops, dripperGroup: dg, s });
});

// ---------- selang utama, klip, cabang ----------
const hoseEnd = 0.2;
tube([V(GX, 0.045, 0), V(GX, 0.3, 0), V(GX, 0.49, 0), V(GX + 0.045, 0.53, 0), V(GX + 0.12, 0.47, 0), V(GX + 0.16, 0.42, 0),
  V(GX + 0.175, 0.2, 0), V(GX + 0.2, 0.012, 0), V(-0.6, 0.009, 0), V(-0.545, 0.02, 0), V(-0.5, HY, 0)], 0.008, M.hose, scene, 160);
rod(V(-0.5, HY, 0), V(hoseEnd, HY, 0), 0.008, M.hose, scene);
const cap = rod(V(hoseEnd - 0.004, HY, 0), V(hoseEnd + 0.016, HY, 0), 0.0095, M.cap, scene);
for (const x of [-0.44, -0.19, 0.06]) box(0.01, HY - BY - R, 0.022, M.black, x, (BY + R + HY) / 2, 0);
QA.hoseStart = marker(scene, GX, 0.045, 0);
POTS.forEach(([px, pz], i) => {
  const s = Math.sign(pz);
  cyl(0.005, 0.016, M.conn, px, HY + 0.012, 0);
  QA.branches.push(marker(scene, px, HY, 0));
  tube([V(px, HY + 0.018, 0), V(px, 0.1, s * 0.02), V(px, 0.2, s * 0.038), V(px, 0.232, s * 0.062), V(px + 0.004, SOIL_Y + 0.045, pz - s * 0.06)], 0.0028, M.micro, scene, 60);
});

// ---------- galon + pompa celup ----------
const galonProf = [[0.001, 0], [0.12, 0], [0.135, 0.02], [0.135, 0.38], [0.11, 0.425], [0.04, 0.45], [0.03, 0.465], [0.03, 0.49], [0.034, 0.495], [0.034, 0.505], [0.028, 0.505]].map(([a, b]) => new THREE.Vector2(a, b));
add(new THREE.Mesh(new THREE.LatheGeometry(galonProf, 48), M.glass)).position.set(GX, 0, 0);
for (const y of [0.12, 0.24]) { const rib = add(new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.0025, 6, 48), M.glass)); rib.rotation.x = Math.PI / 2; rib.position.set(GX, y, 0); }
const WATER_TOP = 0.3;
const water = add(new THREE.Mesh(new THREE.CylinderGeometry(0.131, 0.131, WATER_TOP - 0.004, 48), M.water)); water.position.set(GX, (WATER_TOP + 0.004) / 2, 0);
const ripple = add(new THREE.Mesh(new THREE.TorusGeometry(1, 0.0025, 6, 40), M.drop)); ripple.rotation.x = Math.PI / 2; ripple.position.set(GX, WATER_TOP + 0.001, 0); ripple.scale.set(0.05, 0.05, 1); ripple.userData.noFit = true;
const pump = new THREE.Group(); pump.position.set(GX, 0, 0); scene.add(pump);
box(0.05, 0.034, 0.04, M.pump, 0, 0.021, 0, pump); cyl(0.007, 0.012, M.pump, 0, 0.044, 0, pump, 12);
// kabel pompa: ikut selang keluar lewat mulut galon, menyusur lantai ke ujung kiri kabel duct
tube([V(GX + 0.025, 0.03, 0.01), V(GX + 0.015, 0.25, 0.012), V(GX + 0.012, 0.49, 0.012), V(GX + 0.05, 0.525, 0.012), V(GX + 0.125, 0.47, 0.012), V(GX + 0.165, 0.42, 0.012), V(GX + 0.18, 0.2, 0.012), V(GX + 0.205, 0.006, 0.02), V(-0.62, 0.004, 0.2), V(-0.56, 0.006, 0.33), V(-0.5, 0.0125, 0.33)], 0.0022, M.cable, scene, 140);
QA.water = { x: GX, r: 0.131, top: WATER_TOP };

// ---------- casing + LCD + LED + DHT11 di tiang depan kuda-kuda tengah ----------
const PZ = W / 2, BOX_Z = PZ + R + 0.006 + 0.02, BOX_Y = 0.15;
const boxMesh = box(0.16, 0.14, 0.04, M.box, 0, BOX_Y, BOX_Z); boxMesh.name = 'box';
for (const y of [0.11, 0.19]) box(0.04, 0.006, 0.036, M.black, 0, y, PZ + 0.002); // cable tie mengikat casing ke tiang
for (const [x, y] of [[-0.07, 0.21], [0.07, 0.21], [-0.07, 0.09], [0.07, 0.09]]) { const s = cyl(0.0035, 0.003, M.screw, x, y, BOX_Z + 0.0215); s.rotation.x = Math.PI / 2; }
box(0.098, 0.06, 0.006, M.bezel, 0, 0.165, BOX_Z + 0.023);
const lcdCanvas = document.createElement('canvas'); lcdCanvas.width = 640; lcdCanvas.height = 192;
const lcdTex = new THREE.CanvasTexture(lcdCanvas); lcdTex.colorSpace = THREE.SRGBColorSpace;
const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.084, 0.028), new THREE.MeshBasicMaterial({ map: lcdTex, toneMapped: false }));
lcd.position.set(0, 0.166, BOX_Z + 0.0262); scene.add(lcd);
const ledMat = new THREE.MeshBasicMaterial({ color: 0x24452f });
const led = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), ledMat); led.position.set(0.055, 0.112, BOX_Z + 0.02); scene.add(led);
box(0.018, 0.004, 0.002, M.screw, 0.03, 0.112, BOX_Z + 0.0205); // label kecil di samping LED
for (const x of [0.0, 0.045]) cyl(0.0065, 0.012, M.black, x, BOX_Y - 0.076, BOX_Z); // kelenjar kabel di bawah casing
// DHT11 diikat ke tiang tepat di atas casing; kabel pendek masuk ke atas casing
const DHT_Z = PZ + 0.027;
box(0.017, 0.023, 0.008, M.dht, 0, 0.238, DHT_Z);
for (let k = 0; k < 4; k++) box(0.012, 0.0012, 0.0005, M.box, 0, 0.231 + k * 0.004, DHT_Z + 0.0042);
box(0.03, 0.005, 0.03, M.black, 0, 0.238, PZ + 0.006);
tube([V(0.004, 0.2265, DHT_Z), V(0.012, 0.223, DHT_Z + 0.004), V(0.03, 0.2205, BOX_Z)], 0.0018, M.cable, scene, 20);
// kabel duct di lantai, tepat di depan rel depan (tidak menembus tiang) + berkas kabel naik ke casing
const DUCT_Y = 0.0125, DUCT_Z = PZ + 0.03;
box(L, 0.025, 0.025, M.strip, 0, DUCT_Y, DUCT_Z);
tube([V(0.03, 0.025, DUCT_Z), V(0.024, 0.05, DUCT_Z + 0.004), V(0.004, BOX_Y - 0.082, BOX_Z)], 0.0045, M.cable, scene, 24);
// kabel sensor: menyusuri rel melintang di sebelah polybag, melompati selang di rel tengah, masuk duct
POTS.forEach(([px, pz]) => {
  const rx = px - 0.125, sx = px - 0.05, y = BY + R + 0.0028, pts = [V(sx, SOIL_Y + 0.057, pz), V(sx - 0.012, SOIL_Y + 0.07, pz), V(px - POT_R - 0.004, 0.214, pz), V(px - 0.115, 0.1, pz), V(rx, y + 0.004, pz)];
  if (pz < 0) pts.push(V(rx, y, -0.05), V(rx, HY + 0.014, -0.012), V(rx, HY + 0.014, 0.012), V(rx, y, 0.05));
  pts.push(V(rx, y, PZ - 0.045), V(rx + 0.03, y + 0.002, PZ - 0.035), V(rx + 0.03, BY + R + 0.0058, PZ), V(rx + 0.03, 0.0265, DUCT_Z));
  tube(pts, 0.0026, M.cable, scene, 90);
});
// adaptor di stopkontak, kabel DC ke casing; kabel stopkontak keluar ke tepi lantai
box(0.2, 0.024, 0.05, M.strip, 0.27, 0.012, 0.55);
for (const x of [0.2, 0.26, 0.32]) box(0.022, 0.002, 0.03, M.socket, x, 0.0245, 0.55);
box(0.05, 0.04, 0.035, M.black, 0.215, 0.044, 0.55);
tube([V(0.19, 0.04, 0.55), V(0.12, 0.008, 0.5), V(0.06, 0.008, 0.42), V(0.046, 0.04, BOX_Z + 0.03), V(0.045, BOX_Y - 0.082, BOX_Z)], 0.003, M.cable, scene, 40);
tube([V(0.37, 0.012, 0.55), V(0.5, 0.006, 0.6), V(SLAB.x1 - 0.002, 0.006, 0.62), V(SLAB.x1 + 0.004, -0.03, 0.62)], 0.0035, M.cable, scene, 24);

// ---------- injeksi QA (harus membuat cek gagal) ----------
if (inject === 'dripper') QA.pots[0].dripperGroup.position.y += 0.08;
if (inject === 'pot') potGroups[0].position.x = -0.25;

// ---------- kamera: jarak dihitung dari batas adegan ----------
const CAM = { fov: 26, azimuth: 38, elevation: 27.5, fill: 0.88 };
// Batas fit: geometri tetap saja; efek yang diskala per waktu (noda basah, riak, tetes) dikecualikan.
const bounds = new THREE.Box3();
scene.updateMatrixWorld(true);
scene.traverse((o) => { if (o.isMesh && !o.userData.noFit && !o.parent.userData.noFit) bounds.expandByObject(o); });
const center = bounds.getCenter(new THREE.Vector3());
const target = V(center.x, center.y - 0.03, center.z);
const dir = V(Math.sin(CAM.azimuth * Math.PI / 180) * Math.cos(CAM.elevation * Math.PI / 180), Math.sin(CAM.elevation * Math.PI / 180), Math.cos(CAM.azimuth * Math.PI / 180) * Math.cos(CAM.elevation * Math.PI / 180));
const corners = []; for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(V(x, y, z));
function fitDistance(aspect) {
  const tan = Math.tan(CAM.fov * Math.PI / 360), fwd = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, fwd);
  const fits = (d) => corners.every((p) => { const v = p.clone().sub(target); const z = d - v.dot(dir); return Math.abs(v.dot(right)) / (z * tan * aspect) <= CAM.fill && Math.abs(v.dot(up)) / (z * tan) <= CAM.fill; });
  let lo = 0.3, hi = 30; for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; } return hi;
}
let orbit;
function resize() {
  const w = Math.max(2, canvas.clientWidth), h = Math.max(2, canvas.clientHeight);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const d = fitDistance(camera.aspect);
  camera.userData.fitDistance = d; camera.userData.subjectScale = 1; camera.userData.distance = d / camera.userData.subjectScale; // jarak pose hero
  if (!orbit) { camera.position.copy(target).addScaledVector(dir, d); camera.lookAt(target); }
  else { orbit.heroPosition.copy(target).addScaledVector(dir, d); orbit.controls.maxDistance = d * 2.2; }
  render();
}

// ---------- evaluasi waktu ----------
let time = 0, lastText = '';
const dry = new THREE.Color(0x8a6a48), wetC = new THREE.Color(0x3a2616), tmp = new THREE.Color();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function drawLcd(text) {
  const g = lcdCanvas.getContext('2d');
  g.fillStyle = '#0d3b2e'; g.fillRect(0, 0, 640, 192);
  g.fillStyle = '#9dffbf'; g.font = 'bold 40px Consolas, "Courier New", monospace';
  text.split('\n').forEach((line, i) => g.fillText(line, 14, 42 + i * 46));
  lcdTex.needsUpdate = true;
}
function evaluate(t) {
  time = t;
  const avg = avgAt(t), sens = sensorsAt(t), on = pumpOnAt(t), flow = flowAt(t);
  QA.pots.forEach((p, i) => {
    p.soilMat.color.copy(tmp.copy(dry).lerp(wetC, clamp((sens[i] - 56) / 26, 0, 1)));
    const r = 0.012 + 0.05 * clamp((avg - 58) / 22, 0, 1); p.wet.scale.set(r, r, 1);
    p.drops.forEach((d, k) => {
      const u = ((t - T.flow) * 1.7 + k * 0.5 + i * 0.137) % 1;
      d.visible = flow; d.position.set(0.0075, SOIL_Y + 0.03 - u * 0.03, 0);
    });
  });
  pump.position.set(GX + (on ? Math.sin(t * 90) * 0.0007 : 0), 0, on ? Math.cos(t * 77) * 0.0007 : 0);
  const ru = (t * 0.9) % 1; ripple.visible = on; ripple.scale.set(0.02 + ru * 0.09, 0.02 + ru * 0.09, 1);
  ledMat.color.setHex(on ? 0x3ad06b : 0x24452f);
  const r = sens.map((v) => String(Math.round(v)).padStart(2));
  const text = `IrriSense  Rata ${Math.round(avg)}%\nS1 ${r[0]} S2 ${r[1]} S3 ${r[2]}\nS4 ${r[3]} S5 ${r[4]} S6 ${r[5]}\nPompa ${on ? 'ON ' : 'OFF'}  29C 68%`;
  if (text !== lastText) { drawLcd(text); lastText = text; }
}
function render() { look.render(scene, camera); }

// ---------- konstruksi: cek dari posisi dunia yang hidup ----------
function construction() {
  const res = [], wp = (o) => o.getWorldPosition(new THREE.Vector3());
  scene.updateMatrixWorld(true);
  let bad = 0; scene.traverse((o) => { if (o.isMesh) { const a = o.geometry.attributes.position.array; for (let k = 0; k < a.length; k++) if (!Number.isFinite(a[k])) { bad++; break; } } });
  res.push({ id: 'geometri berhingga', pass: bad === 0, detail: `${bad} mesh dengan NaN` });
  const inSoil = (p, i) => { const c = wp(potGroups[i]); return p.y < SOIL_Y - 0.005 && p.y > 0.01 && Math.hypot(p.x - c.x, p.z - c.z) < 0.088; };
  QA.drippers.forEach((m, i) => res.push({ id: `dripper-${i + 1} tertancap di tanah`, pass: inSoil(wp(m), i), detail: wp(m).toArray().map((v) => v.toFixed(3)).join(',') }));
  QA.sensors.forEach((m, i) => res.push({ id: `sensor-${i + 1} garpu di tanah`, pass: inSoil(wp(m), i), detail: wp(m).y.toFixed(3) }));
  QA.stakes.forEach((m, i) => res.push({ id: `ajir-${i + 1} tertancap`, pass: inSoil(wp(m), i), detail: wp(m).y.toFixed(3) }));
  const pipeBoxes = QA.pipes.map((p) => new THREE.Box3().setFromObject(p));
  QA.pots.forEach((p, i) => {
    const b = new THREE.Box3().setFromObject(p.bag), hits = pipeBoxes.filter((pb) => pb.intersectsBox(b)).length;
    res.push({ id: `polybag-${i + 1} tidak menembus pipa`, pass: hits === 0, detail: `${hits} pipa beririsan` });
    res.push({ id: `polybag-${i + 1} menapak lantai`, pass: Math.abs(b.min.y) < 0.002, detail: b.min.y.toFixed(4) });
  });
  QA.branches.forEach((m, i) => { const p = wp(m); res.push({ id: `cabang-${i + 1} berpangkal di selang utama`, pass: Math.abs(p.y - HY) < 0.008 && Math.abs(p.z) < 0.008 && p.x > -0.5 && p.x < hoseEnd, detail: p.x.toFixed(3) }); });
  const hs = wp(QA.hoseStart), w = QA.water;
  res.push({ id: 'ujung selang terendam di galon', pass: hs.y < w.top && Math.hypot(hs.x - w.x, hs.z) < w.r, detail: hs.y.toFixed(3) });
  const frameBox = new THREE.Box3().setFromObject(frame);
  res.push({ id: 'rangka menapak lantai', pass: Math.abs(frameBox.min.y) < 0.004, detail: frameBox.min.y.toFixed(4) });
  return { pass: res.every((r) => r.pass), results: res };
}

// ---------- loop, kontrol, hook QA ----------
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduce && !q.has('t'), clockStart = performance.now() / 1000 - (q.has('t') ? parseFloat(q.get('t')) : 0);
const playBtn = document.getElementById('play'), resetBtn = document.getElementById('reset');
function setPlaying(v) {
  playing = v; playBtn.textContent = v ? 'Jeda' : 'Putar'; playBtn.setAttribute('aria-pressed', String(!v));
  if (v) clockStart = performance.now() / 1000 - time;
}
playBtn.addEventListener('click', () => setPlaying(!playing));
resetBtn.addEventListener('click', () => orbit.reset());
addEventListener('keydown', (e) => { if (e.key === ' ' && e.target === canvas) { e.preventDefault(); setPlaying(!playing); } });
orbit = createDioramaOrbit(camera, canvas, { target, minDistance: 0.6, maxDistance: 8, minPolarAngle: 0.15, maxPolarAngle: Math.PI / 2 - 0.04, onChange: render });
addEventListener('resize', resize);
evaluate(q.has('t') ? parseFloat(q.get('t')) : reduce ? 9 : 0);
resize(); setPlaying(playing);
function tick() {
  if (playing) { evaluate((performance.now() / 1000 - clockStart) % LOOP); render(); }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.__diorama = {
  THREE, scene, camera, renderer, orbit, construction,
  freeze(t) { setPlaying(false); orbit.reset(); evaluate(t); render(); },
  play() { setPlaying(true); },
  audit: { loop: LOOP, slab: { x0: SLAB.x0, x1: SLAB.x1, z0: SLAB.z0, z1: SLAB.z1, margin: 0.35 } },
};
window.__dioramaReady = true;
