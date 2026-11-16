import { formatMoisture, formatTemp, formatHum, faultMessage, toSeries, zone, ageText, screenState, pumpReason, M_SET, M_MAX, STALE_MS } from './format.js';

const $ = (id) => document.getElementById(id);
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };   // evita pengumuman ulang oleh pembaca layar tiap detik
const ACK_MS = 15_000;   // firmware kirim tiap 5 detik; 15 detik tanpa jawaban dianggap belum sampai

const S = {
  hours: 1,
  reading: null,
  online: false,
  loaded: false,
  apiError: false,
  live: 'connecting',     // 'connecting' | 'on' | 'off'
  confirming: false,
  busy: false,
  pending: null,          // { mode?, pump?, timer }
  note: null,             // pesan hasil perintah terakhir; null = teks bawaan sesuai mode
  refocus: null,          // tombol yang harus kembali difokus setelah dinonaktifkan sementara saat perintah dikirim
};

// ---------- grafik ----------
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = { green: css('--green'), amber: css('--amber'), blue: css('--blue'), ink: css('--ink'), muted: css('--muted'), line: css('--line'), soft: css('--green-soft') };
const timeLabel = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

// Area target 60-80 %: warna dan tepi sama dengan .band di gauge (benang merah visual).
const bandPlugin = {
  id: 'band',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea: a, scales: { y } } = chart;
    if (!y) return;
    const y80 = y.getPixelForValue(M_MAX), y60 = y.getPixelForValue(M_SET), w = a.right - a.left;
    ctx.save();
    ctx.fillStyle = C.soft; ctx.fillRect(a.left, y80, w, y60 - y80);
    ctx.fillStyle = C.green; ctx.fillRect(a.left, y80 - 1, w, 2); ctx.fillRect(a.left, y60 - 1, w, 2);
    ctx.restore();
  },
};

function mkChart(el, datasets, yOpts, plugins = [], legend = false) {
  return new Chart(el, {
    type: 'line',
    data: { labels: [], datasets },
    plugins,
    options: {
      animation: false, responsive: true, maintainAspectRatio: false, spanGaps: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: legend, labels: { color: C.ink, boxWidth: 24, usePointStyle: true, pointStyle: 'line' } } },
      scales: {
        x: { ticks: { color: C.muted, maxTicksLimit: 6, maxRotation: 0 }, grid: { display: false } },
        ...yOpts,
      },
    },
  });
}
const line = (label, color, extra = {}) => ({ label, data: [], borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, tension: 0.25, ...extra });

const moistChart = mkChart($('chart-moisture'),
  [line('Rata-rata kelembapan (%)', C.green, { segment: { borderColor: (c) => (c.p1.parsed.y < M_SET ? C.amber : C.green) } })],
  { y: { min: 0, max: 100, ticks: { color: C.muted, stepSize: 20 }, grid: { color: C.line } } }, [bandPlugin]);
const airChart = mkChart($('chart-air'),
  [line('Suhu (°C)', C.ink, { yAxisID: 'y' }), line('Kelembapan udara (%)', C.blue, { yAxisID: 'y1', borderDash: [6, 4] })],
  { y: { position: 'left', ticks: { color: C.muted }, grid: { color: C.line } },
    y1: { position: 'right', min: 0, max: 100, ticks: { color: C.muted }, grid: { display: false } } }, [], true);

function describeCharts(s) {
  const vals = s.moisture.filter((v) => v !== null);
  $('chart-moisture').setAttribute('aria-label', vals.length
    ? `Grafik riwayat kelembapan tanah, ${vals.length} pembacaan: terendah ${Math.min(...vals).toFixed(1)} %, tertinggi ${Math.max(...vals).toFixed(1)} %, terakhir ${vals[vals.length - 1].toFixed(1)} %. Target 60 sampai 80 %.`
    : 'Grafik riwayat kelembapan tanah belum ada data.');
  const t = s.temp.filter((v) => v !== null), h = s.hum.filter((v) => v !== null);
  $('chart-air').setAttribute('aria-label', t.length
    ? `Grafik suhu udara ${Math.min(...t).toFixed(1)} sampai ${Math.max(...t).toFixed(1)} °C dan kelembapan udara ${Math.round(Math.min(...h))} sampai ${Math.round(Math.max(...h))} %.`
    : 'Grafik suhu dan kelembapan udara belum ada data.');
}

function setChartMsg(text) { $('chart-msg').hidden = !text; setText($('chart-msg'), text ?? ''); }

function fillCharts(readings) {
  const s = toSeries(readings);
  const labels = s.t.map(timeLabel);
  moistChart.data.labels = labels;
  moistChart.data.datasets[0].data = s.moisture;
  airChart.data.labels = labels;
  airChart.data.datasets[0].data = s.temp;
  airChart.data.datasets[1].data = s.hum;
  moistChart.update(); airChart.update();
  describeCharts(s);
  setChartMsg(readings.length ? null : 'Belum ada data pada rentang ini. Grafik terisi sendiri setelah node mengirim pembacaan.');
}

function pushLive(r) {
  if (r.ts < Date.now() - S.hours * 3600_000) return;
  moistChart.data.labels.push(timeLabel(r.ts));
  moistChart.data.datasets[0].data.push(r.moisture);
  airChart.data.labels.push(timeLabel(r.ts));
  airChart.data.datasets[0].data.push(r.temp);
  airChart.data.datasets[1].data.push(r.hum);
  moistChart.update(); airChart.update();
  setChartMsg(null);
}

// ---------- tampilan ----------
const ZONE_TEXT = { low: 'Di bawah target', in: 'Di dalam target', high: 'Di atas target' };

function render() {
  const r = S.reading;
  const st = screenState({ loaded: S.loaded, apiError: S.apiError, reading: r, online: S.online });

  // node
  const unknown = !S.loaded || S.apiError;   // tanpa jawaban server, status node tidak boleh ditebak
  $('node-status').dataset.on = unknown ? 'unknown' : String(S.online);
  $('node-text').textContent = !S.loaded ? 'Menghubungkan ke node' : S.apiError ? 'Status node belum diketahui' : S.online ? 'Node online' : 'Node offline';

  // banner
  $('api-error').hidden = !S.apiError;
  const f = st === 'fault' ? faultMessage(r.fault) : null;
  $('fault').hidden = !f;
  if (f) $('fault').textContent = f;

  // status pompa
  const hero = $('pompa');
  hero.dataset.state = st;
  hero.dataset.pump = r?.pump ? 'on' : 'off';
  hero.setAttribute('aria-busy', String(st === 'loading'));
  const age = r ? ageText(Date.now() - r.ts) : '';
  const txt = {
    loading: ['Memuat data', 'Mengambil status terbaru dari node.', ''],
    error: ['Data tidak terbaca', 'Server IrriSense tidak menjawab.', 'Lihat layar LCD di alat untuk status pompa saat ini.'],
    empty: ['Belum ada data', 'Node belum mengirim pembacaan.', 'Nyalakan node IrriSense dan tunggu sekitar 10 detik. Data pertama muncul di sini sendiri.'],
    offline: ['Node terputus', r ? `Pompa terakhir tercatat ${r.pump ? 'menyala' : 'mati'}, ${age}.` : '', 'Angka di bawah mungkin sudah berubah. Cek daya dan Wi-Fi node; halaman ini terisi lagi begitu node tersambung.'],
    fault: ['Pompa berhenti', r ? `Galat, mode ${r.mode === 'manual' ? 'manual' : 'otomatis'}` : '', 'Penyebab dan cara memeriksanya ada di pesan di atas.'],
    ok: r ? [r.pump ? 'Pompa menyala' : 'Pompa mati',
      `Mode ${r.mode === 'manual' ? 'manual' : 'otomatis'} · rata-rata ${formatMoisture(r.moisture)}`, pumpReason(r)] : ['', '', ''],
  }[st];
  $('hero-state').textContent = txt[0];
  $('hero-mode').textContent = txt[1];
  setText($('hero-reason'), txt[2]);

  // gauge
  const z = zone(r?.moisture);
  $('v-moisture').textContent = formatMoisture(r?.moisture);
  $('v-zone').textContent = z ? ZONE_TEXT[z] + (st === 'offline' ? ', data lama' : '') : '';
  $('v-zone').dataset.zone = z ?? '';
  $('gauge').dataset.zone = z ?? '';
  const mk = $('marker');
  mk.hidden = z === null;
  if (z) mk.style.left = `${Math.min(100, Math.max(0, r.moisture))}%`;
  $('gauge').setAttribute('aria-label', z
    ? `Rata-rata kelembapan tanah ${formatMoisture(r.moisture)}, ${ZONE_TEXT[z].toLowerCase()}. Target 60 sampai 80 persen.`
    : 'Rata-rata kelembapan tanah belum ada.');
  $('v-valid').textContent = !r ? 'Sensor tanah terbaca: belum ada data'
    : r.valid >= 6 ? `Sensor tanah terbaca: ${r.valid} dari 6`
    : `Sensor tanah terbaca: ${r.valid} dari 6. Rata-rata dihitung dari sensor yang terbaca; cek kabel sensor lainnya.`;

  // kondisi lain
  $('v-temp').textContent = formatTemp(r?.temp);
  $('v-hum').textContent = formatHum(r?.hum);
  const old = r && Date.now() - r.ts > STALE_MS;
  $('v-time').textContent = r ? `${new Date(r.ts).toLocaleTimeString('id-ID')}${r.buffered ? ' (data tertunda)' : ''}` : 'belum ada';
  $('v-live').textContent = `${r ? ageText(Date.now() - r.ts) + ' · ' : ''}siaran langsung: ${{ connecting: 'menyambung', on: 'tersambung', off: 'terputus, mencoba lagi' }[S.live]}`;
  $('v-live').classList.toggle('stale', !!old && S.online);

  renderControls(st);
}

function defaultNote(mode) {
  return mode === 'manual'
    ? 'Mode manual: pompa mengikuti tombol di bawah, dan berhenti sendiri setelah 10 menit.'
    : 'Mode otomatis: pompa mengikuti target 60 sampai 80 %. Untuk menyalakan sendiri, pindah ke mode manual.';
}

function renderControls(st) {
  const r = S.reading;
  const reachable = st === 'ok' || st === 'fault';
  const mode = r?.mode ?? 'auto';
  for (const b of $('mode').children) {
    b.setAttribute('aria-pressed', String(reachable && b.dataset.mode === mode));
    b.disabled = !reachable || S.busy;
  }
  const manual = reachable && mode === 'manual';
  $('pump-actions').hidden = !manual;
  const on = !!r?.pump;
  if (!manual || on) S.confirming = false;
  const btn = $('btn-pump');
  btn.textContent = on ? 'Matikan pompa' : 'Nyalakan pompa';
  btn.hidden = S.confirming;
  btn.disabled = S.busy || st === 'fault';
  $('confirm').hidden = !S.confirming;
  $('confirm-yes').disabled = S.busy;
  const blocked = {
    loading: 'Kontrol aktif setelah data pertama masuk.',
    error: 'Kontrol belum bisa dipakai karena server tidak menjawab.',
    empty: 'Kontrol belum bisa dipakai karena node belum mengirim data.',
    offline: 'Node sedang terputus, jadi perintah belum bisa dikirim. Kontrol aktif lagi setelah node tersambung.',
  }[st];
  setText($('cmd-msg'), blocked ?? S.note ?? defaultNote(mode));
  if (S.refocus && !S.refocus.disabled && !S.refocus.hidden) { S.refocus.focus(); S.refocus = null; }
}

// ---------- kontrol ----------
function settle(text) {
  clearTimeout(S.pending?.timer);
  S.pending = null; S.busy = false; S.note = text;
}

async function send(cmd, okText) {
  if (S.busy) return;
  S.busy = true; S.note = 'Mengirim perintah ke node...';
  // Menunggu jawaban dipasang sebelum fetch: balasan node bisa tiba lewat siaran langsung sebelum respons POST.
  S.pending = {
    cmd, okText,
    timer: setTimeout(() => { settle('Perintah sudah terkirim, tapi node belum menjawab. Cek apakah node online, lalu coba lagi.'); render(); }, ACK_MS),
  };
  render();
  try {
    const res = await fetch('/api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
    if (!res.ok) {
      settle(res.status === 503
        ? 'Perintah belum terkirim karena server tidak tersambung ke broker MQTT. Cek apakah Mosquitto menyala, lalu coba lagi.'
        : 'Perintah belum terkirim. Coba lagi sebentar lagi.');
    } else if (S.pending) {
      S.note = 'Perintah terkirim. Menunggu node menjawab...';
    }
  } catch {
    settle('Perintah belum terkirim karena dashboard tidak bisa menjangkau server. Cek koneksi, lalu coba lagi.');
  }
  render();
}

function checkAck(r) {
  const p = S.pending;
  if (!p) return;
  const ok = (p.cmd.mode === undefined || p.cmd.mode === r.mode) && (p.cmd.pump === undefined || p.cmd.pump === r.pump);
  if (ok) settle(p.okText);
}

$('mode').addEventListener('click', (e) => {
  const m = e.target.closest('button')?.dataset.mode;
  if (!m || m === S.reading?.mode) return;
  S.confirming = false;
  S.refocus = e.target.closest('button');
  send({ mode: m }, m === 'manual' ? 'Mode manual aktif. Pompa mati sampai dinyalakan.' : 'Mode otomatis aktif. Pompa mengikuti target 60 sampai 80 %.');
});

$('btn-pump').addEventListener('click', () => {
  if (S.reading?.pump) { S.refocus = $('btn-pump'); send({ pump: false }, 'Pompa sudah dimatikan.'); return; }
  S.confirming = true; render();
  $('confirm-yes').focus();
});
$('confirm-yes').addEventListener('click', () => {
  S.confirming = false; S.refocus = $('btn-pump');
  send({ pump: true }, 'Pompa sudah menyala. Pompa berhenti sendiri setelah 10 menit atau saat dimatikan.');
});
function cancelConfirm() { S.confirming = false; render(); $('btn-pump').focus(); }
$('confirm-no').addEventListener('click', cancelConfirm);
$('confirm').addEventListener('keydown', (e) => { if (e.key === 'Escape') cancelConfirm(); });

$('range').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  const h = Number(b?.dataset.h);
  if (!h) return;
  S.hours = h;
  for (const x of $('range').children) x.setAttribute('aria-pressed', String(x === b));
  loadHistory().then(render);
});

// ---------- data ----------
const get = (url) => fetch(url, { signal: AbortSignal.timeout(8000) });

async function loadHistory() {
  setChartMsg('Memuat riwayat');
  const to = Date.now(), from = to - S.hours * 3600_000;
  try {
    const res = await get(`/api/readings?from=${from}&to=${to}&limit=2000`);
    if (!res.ok) throw new Error(String(res.status));
    fillCharts(await res.json());
  } catch {
    S.apiError = true;
    setChartMsg('Riwayat gagal dimuat. Pakai tombol Coba lagi di atas.');
  }
}

async function loadStats() {
  const to = Date.now(), from = to - 3600_000;
  try {
    const res = await get(`/api/stats?from=${from}&to=${to}`);
    if (!res.ok) return;
    const s = await res.json();
    $('s-p95').textContent = s.latency ? `${s.latency.p95} ms` : '–';
    $('s-up').textContent = `${s.uptimePct.toFixed(1)} %`;
    $('s-on').textContent = `${s.pump.onSeconds} detik`;
    $('s-ml').textContent = `${Math.round(s.pump.estimatedMl)} mL`;
  } catch { /* statistik hanya pelengkap; galat utama ditangani loadAll */ }
}

async function loadAll() {
  S.apiError = false;
  try {
    const res = await get('/api/latest');
    if (res.ok) S.reading = await res.json();
    else if (res.status === 404) S.reading = null;
    else throw new Error(String(res.status));
    const n = await get('/api/node');
    if (!n.ok) throw new Error(String(n.status));
    S.online = (await n.json()).online;
  } catch {
    S.apiError = true;
  }
  S.loaded = true;
  render();
  await loadHistory();
  loadStats();
  render();
}

$('retry').addEventListener('click', loadAll);
setInterval(() => { if (S.apiError) loadAll(); }, 15000);
setInterval(loadStats, 30000);
setInterval(render, 1000);   // umur data ("12 detik lalu") berjalan sendiri

function init() {
  loadAll();
  const es = new EventSource('/api/stream');   // reconnect otomatis
  es.onopen = () => { S.live = 'on'; if (S.apiError) loadAll(); else render(); };
  es.onerror = () => { S.live = 'off'; render(); };
  es.addEventListener('reading', (e) => {
    const r = JSON.parse(e.data);
    S.reading = r; S.loaded = true; S.apiError = false;
    checkAck(r); pushLive(r); render();
  });
  es.addEventListener('status', (e) => { S.online = JSON.parse(e.data).online; render(); });
}
init();
