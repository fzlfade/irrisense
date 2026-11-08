import { formatMoisture, formatTemp, formatHum, pumpLabel, faultMessage, toSeries } from './format.js';

const $ = (id) => document.getElementById(id);
const M_SET = 60, M_MAX = 80;
let hours = 1;
let current = null;

// ---------- grafik ----------
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const timeLabel = (t) => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function mkChart(el, datasets, yOpts) {
  return new Chart(el, {
    type: 'line',
    data: { labels: [], datasets },
    options: {
      animation: false, responsive: true, maintainAspectRatio: false, spanGaps: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: datasets.length > 1, labels: { color: css('--muted'), boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: css('--muted'), maxTicksLimit: 6, maxRotation: 0 }, grid: { display: false } },
        ...yOpts,
      },
    },
  });
}
const line = (label, color, extra = {}) => ({ label, data: [], borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, tension: 0.25, ...extra });
const ref = (label, v, color) => ({ label, data: [], borderColor: color, borderWidth: 1, borderDash: [6, 4], pointRadius: 0, _v: v });

const moistChart = mkChart($('chart-moisture'),
  [line('Kelembapan tanah (%)', css('--green')), ref('ON 60 %', M_SET, css('--amber')), ref('OFF 80 %', M_MAX, css('--blue'))],
  { y: { min: 0, max: 100, ticks: { color: css('--muted') }, grid: { color: css('--line') } } });
const airChart = mkChart($('chart-air'),
  [line('Suhu (°C)', css('--amber'), { yAxisID: 'y' }), line('RH (%)', css('--blue'), { yAxisID: 'y1' })],
  { y: { position: 'left', ticks: { color: css('--muted') }, grid: { color: css('--line') } },
    y1: { position: 'right', min: 0, max: 100, ticks: { color: css('--muted') }, grid: { display: false } } });

function fillCharts(readings) {
  const s = toSeries(readings);
  const labels = s.t.map(timeLabel);
  moistChart.data.labels = labels;
  moistChart.data.datasets[0].data = s.moisture;
  moistChart.data.datasets[1].data = labels.map(() => M_SET);
  moistChart.data.datasets[2].data = labels.map(() => M_MAX);
  airChart.data.labels = labels;
  airChart.data.datasets[0].data = s.temp;
  airChart.data.datasets[1].data = s.hum;
  moistChart.update(); airChart.update();
}

// ---------- kartu ----------
function showReading(r) {
  current = r;
  $('v-moisture').textContent = formatMoisture(r.moisture);
  $('v-valid').textContent = `sensor valid: ${r.valid}`;
  $('v-temp').textContent = formatTemp(r.temp);
  $('v-hum').textContent = formatHum(r.hum);
  $('v-pump').textContent = pumpLabel(r.pump, r.mode);
  $('pump-card').classList.toggle('on', r.pump);
  $('v-time').textContent = `diperbarui ${new Date(r.ts).toLocaleTimeString('id-ID')}${r.buffered ? ' (data tertunda)' : ''}`;
  const f = faultMessage(r.fault);
  $('fault').hidden = !f;
  if (f) $('fault').textContent = f;
  syncControls(r.mode);
}

function setOnline(on) {
  const el = $('node-status');
  el.className = `pill ${on ? 'pill-on' : 'pill-off'}`;
  $('node-text').textContent = on ? 'node online' : 'node offline';
}

// ---------- kontrol ----------
function syncControls(mode) {
  for (const b of $('mode').children) b.classList.toggle('on', b.dataset.mode === mode);
  for (const b of $('pump-ctl').children) b.disabled = mode !== 'manual';
  $('cmd-msg').textContent = mode === 'manual'
    ? 'Mode Manual: pompa mengikuti tombol di atas. Pompa tetap berhenti otomatis setelah batas waktu nyala.'
    : 'Mode Auto: pompa mengikuti ambang 60 % / 80 %.';
}

async function send(cmd) {
  const msg = $('cmd-msg');
  try {
    const res = await fetch('/api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
    if (!res.ok) msg.textContent = res.status === 503 ? 'Gagal: broker MQTT tidak terhubung.' : 'Gagal mengirim perintah.';
  } catch { msg.textContent = 'Gagal: server tidak terjangkau.'; }
}
$('mode').addEventListener('click', (e) => { const m = e.target.dataset?.mode; if (m) send({ mode: m }); });
$('pump-ctl').addEventListener('click', (e) => { const p = e.target.dataset?.pump; if (p && !e.target.disabled) send({ pump: p === 'true' }); });

$('range').addEventListener('click', (e) => {
  const h = Number(e.target.dataset?.h);
  if (!h) return;
  hours = h;
  for (const b of $('range').children) b.classList.toggle('on', b === e.target);
  loadHistory();
});

// ---------- data ----------
async function loadHistory() {
  const to = Date.now(), from = to - hours * 3600_000;
  const res = await fetch(`/api/readings?from=${from}&to=${to}&limit=2000`);
  if (res.ok) fillCharts(await res.json());
}

async function loadStats() {
  const to = Date.now(), from = to - 3600_000;
  const res = await fetch(`/api/stats?from=${from}&to=${to}`);
  if (!res.ok) return;
  const s = await res.json();
  $('s-p95').textContent = s.latency ? `${s.latency.p95} ms` : '–';
  $('s-up').textContent = `${s.uptimePct.toFixed(1)} %`;
  $('s-on').textContent = `${s.pump.onSeconds} detik`;
  $('s-ml').textContent = `${Math.round(s.pump.estimatedMl)} mL`;
}

function pushLive(r) {
  const within = r.ts >= Date.now() - hours * 3600_000;
  if (!within) return;
  moistChart.data.labels.push(timeLabel(r.ts));
  moistChart.data.datasets[0].data.push(r.moisture);
  moistChart.data.datasets[1].data.push(M_SET);
  moistChart.data.datasets[2].data.push(M_MAX);
  airChart.data.labels.push(timeLabel(r.ts));
  airChart.data.datasets[0].data.push(r.temp);
  airChart.data.datasets[1].data.push(r.hum);
  moistChart.update(); airChart.update();
}

async function init() {
  try { const r = await fetch('/api/latest'); if (r.ok) showReading(await r.json()); } catch {}
  try { const n = await (await fetch('/api/node')).json(); setOnline(n.online); } catch {}
  await loadHistory();
  loadStats();
  setInterval(loadStats, 30000);

  const es = new EventSource('/api/stream');   // reconnect otomatis
  es.addEventListener('reading', (e) => { const r = JSON.parse(e.data); showReading(r); pushLive(r); });
  es.addEventListener('status', (e) => setOnline(JSON.parse(e.data).online));
}
init();
