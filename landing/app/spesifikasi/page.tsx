import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import {
  api,
  faultLcd,
  firmware as f,
  komponen,
  lcdBaris,
  modeFirmware,
  soilBoardLabels,
  topikMqtt,
} from "@/content/spesifikasi";
import s from "./page.module.css";

export const metadata: Metadata = {
  title: "Spesifikasi | IrriSense",
  description:
    "Aturan pompa, komponen, pin ESP32, data, API, dan mode firmware prototipe IrriSense, diambil dari kode proyek.",
};

const BAGIAN = [
  { id: "aturan", judul: "Aturan pompa" },
  { id: "komponen", judul: "Komponen" },
  { id: "pin", judul: "Pin ESP32" },
  { id: "data", judul: "Data dan jaringan" },
  { id: "api", judul: "API server" },
  { id: "mode", judul: "Mode firmware" },
] as const;

const detik = f.sensorIntervalMs / 1000;
const menit = f.maxRunMs / 60000;

const PIN = [
  ...f.soilPins.map((gpio, i) => ({ komponen: `Sensor tanah S${i + 1}`, gpio, label: soilBoardLabels[i] })),
  { komponen: "DHT11 (DATA)", gpio: f.dhtPin, label: `D${f.dhtPin}` },
  { komponen: "Relay (IN)", gpio: f.relayPin, label: `D${f.relayPin}` },
  { komponen: "LCD I2C (SDA)", gpio: f.i2cSda, label: `D${f.i2cSda}` },
  { komponen: "LCD I2C (SCL)", gpio: f.i2cScl, label: `D${f.i2cScl}` },
];

type BagianProps = { id: (typeof BAGIAN)[number]["id"]; pengantar: ReactNode; sumber: string[]; children: ReactNode };

/** Satu bagian: judul, pengantar, dan sumber di kolom kiri (desktop); isi di kolom kanan. */
function Bagian({ id, pengantar, sumber, children }: BagianProps) {
  const judul = BAGIAN.find((b) => b.id === id)?.judul;
  return (
    <section id={id} className={s.section} aria-labelledby={`${id}-judul`}>
      <div className={`${s.wrap} ${s.grid}`}>
        <div className={s.side}>
          <h2 id={`${id}-judul`} className={s.h2}>
            {judul}
          </h2>
          {pengantar}
        </div>
        <div className={s.body}>{children}</div>
        <p className={s.source}>
          Sumber:{" "}
          {sumber.map((file, i) => (
            <Fragment key={file}>
              {i > 0 && ", "}
              <code>{file}</code>
            </Fragment>
          ))}
        </p>
      </div>
    </section>
  );
}

export default function Spesifikasi() {
  return (
    <main id="konten" className={s.page}>
      <div className={s.head}>
        <div className={s.wrap}>
          <h1 className={s.title}>Spesifikasi</h1>
          <p className={s.lead}>
            Aturan kerja, komponen, pin, data, dan mode firmware prototipe IrriSense. Angkanya diambil dari kode dan
            dokumen perkabelan proyek, lalu dicek tes otomatis.
          </p>
          <nav className={s.toc} aria-label="Isi halaman">
            <ol>
              {BAGIAN.map((b) => (
                <li key={b.id}>
                  <a href={`#${b.id}`}>{b.judul}</a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      <Bagian
        id="aturan"
        sumber={["firmware/src/config.h", "firmware/lib/irrisense_core/controller.cpp"]}
        pengantar={
          <p>
            Tiap {detik} detik ESP32 membaca {f.soilPins.length} sensor tanah, lalu merata-ratakan sensor yang
            bacaannya valid. Sensor yang macet atau belum dikalibrasi tidak ikut dihitung. Di mode Auto, rata-rata
            inilah yang menentukan pompa.
          </p>
        }
      >
        <dl className={s.rules}>
          <div>
            <dt>Pompa menyala</dt>
            <dd>Rata-rata kelembapan di bawah {f.mSet} %.</dd>
          </div>
          <div>
            <dt>Pompa mati</dt>
            <dd>Rata-rata {f.mMax} % atau lebih.</dd>
          </div>
          <div>
            <dt>
              Di antara {f.mSet} dan {f.mMax} %
            </dt>
            <dd>Pompa tetap pada keadaan terakhirnya (histeresis), jadi tidak menyala dan mati terus-menerus.</dd>
          </div>
          <div>
            <dt>Batas nyala</dt>
            <dd>
              {menit} menit tanpa henti. Setelah itu pompa dimatikan dan LCD menampilkan <code>{faultLcd.maxRun}</code>{" "}
              sampai mode dipilih ulang dari dashboard.
            </dd>
          </div>
          <div>
            <dt>Tidak ada sensor valid</dt>
            <dd>
              Di mode Auto pompa dimatikan dan LCD menampilkan <code>{faultLcd.noSensor}</code> sampai ada sensor
              yang valid lagi.
            </dd>
          </div>
          <div>
            <dt>Mode Manual</dt>
            <dd>Pompa hanya mengikuti perintah dari dashboard. Batas nyala {menit} menit tetap berlaku.</dd>
          </div>
          <div>
            <dt>Ganti mode</dt>
            <dd>Selalu mematikan pompa dan menghapus status FAULT.</dd>
          </div>
        </dl>
      </Bagian>

      <Bagian
        id="komponen"
        sumber={["backend/prototipe/scene.js"]}
        pengantar={
          <>
            <p>Nomornya sama dengan daftar dan penanda di prototipe 3D.</p>
            <a className={s.link} href="/prototipe/">
              Lihat letaknya di prototipe 3D
            </a>
          </>
        }
      >
        <table className={s.table} aria-labelledby="komponen-judul">
          <thead>
            <tr>
              <th scope="col" className={s.no}>
                No.
              </th>
              <th scope="col">Komponen</th>
              <th scope="col">Jumlah dan letak</th>
            </tr>
          </thead>
          <tbody>
            {komponen.map((k, i) => (
              <tr key={k.nama}>
                <td className={s.no}>{i + 1}</td>
                <th scope="row">{k.nama}</th>
                <td>{k.keterangan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bagian>

      <Bagian
        id="pin"
        sumber={["firmware/src/config.h", "docs/hardware/perkabelan.md"]}
        pengantar={<p>GPIO adalah nomor pin di kode firmware; label adalah tulisan di board tempat kabelnya dipasang.</p>}
      >
        <table className={s.table} aria-labelledby="pin-judul">
          <thead>
            <tr>
              <th scope="col">Komponen</th>
              <th scope="col">GPIO</th>
              <th scope="col">Label di board</th>
            </tr>
          </thead>
          <tbody>
            {PIN.map((p) => (
              <tr key={p.komponen}>
                <th scope="row">{p.komponen}</th>
                <td className={s.mono}>{p.gpio}</td>
                <td className={s.mono}>{p.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className={s.notes}>
          <li>Sensor tanah hanya memakai ADC1, karena ADC2 tidak bisa dipakai bersamaan dengan Wi-Fi.</li>
          <li>
            Relay {f.relayActiveLow ? "aktif-LOW" : "aktif-HIGH"}: pompa menyala saat GPIO {f.relayPin} bernilai{" "}
            {f.relayActiveLow ? "rendah" : "tinggi"}.
          </li>
          <li>
            Alamat I2C LCD: <code>0x{f.lcdAddr.toString(16)}</code>.
          </li>
        </ul>
      </Bagian>

      <Bagian
        id="data"
        sumber={[
          "firmware/src/config.h",
          "firmware/src/main.cpp",
          "firmware/lib/irrisense_core/display.cpp",
          "backend/README.md",
        ]}
        pengantar={
          <p>
            Tiap {detik} detik ESP32 mengirim telemetri lewat MQTT. Backend menyimpannya di PostgreSQL dan
            meneruskannya ke dashboard.
          </p>
        }
      >
        <h3 id="mqtt-judul" className={s.h3}>
          Topik MQTT
        </h3>
        <table className={s.table} aria-labelledby="mqtt-judul">
          <thead>
            <tr>
              <th scope="col">Topik</th>
              <th scope="col">Isi</th>
            </tr>
          </thead>
          <tbody>
            {topikMqtt.map((t) => (
              <tr key={t.akhiran}>
                <th scope="row">
                  {/* <wbr> setelah tiap garis miring: di ponsel topik boleh turun baris, jadi kolom Isi tidak menyempit. */}
                  <code>
                    {`irrisense/${f.nodeId}/${t.akhiran}`.split("/").map((part, i, all) => (
                      <Fragment key={part}>
                        {part}
                        {i < all.length - 1 && (
                          <>
                            /<wbr />
                          </>
                        )}
                      </Fragment>
                    ))}
                  </code>
                </th>
                <td>{t.isi}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className={s.h3}>Saat jaringan putus</h3>
        <p className={s.text}>
          Telemetri disimpan di memori flash ESP32 (SPIFFS), paling banyak {f.bufferCapacity} bacaan terbaru. Setelah
          tersambung lagi, tiap {detik} detik ESP32 mengirim sampai {f.drainPerTick} bacaan lama sebelum bacaan baru.
        </p>

        <h3 id="lcd-judul" className={s.h3}>
          Layar LCD
        </h3>
        <table className={s.table} aria-labelledby="lcd-judul">
          <thead>
            <tr>
              <th scope="col" className={s.no}>
                Baris
              </th>
              <th scope="col">Isi</th>
              <th scope="col">Tulisan di layar</th>
            </tr>
          </thead>
          <tbody>
            {lcdBaris.map((b, i) => (
              <tr key={b.isi}>
                <td className={s.no}>{i + 1}</td>
                <th scope="row">{b.isi}</th>
                <td className={s.mono}>{b.tulisan.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bagian>

      <Bagian
        id="api"
        sumber={["backend/src/app.js", "backend/src/index.js", "backend/src/stats.js"]}
        pengantar={<p>Backend (Express) menyajikan halaman ini, dashboard, dan alamat berikut untuk dashboard.</p>}
      >
        <table className={s.table} aria-labelledby="api-judul">
          <thead>
            <tr>
              <th scope="col">Alamat</th>
              <th scope="col">Isi</th>
            </tr>
          </thead>
          <tbody>
            {api.map((r) => (
              <tr key={`${r.metode} ${r.alamat}`}>
                <th scope="row">
                  <code className={s.route}>{`${r.metode} ${r.alamat}`}</code>
                  {r.parameter && <code className={s.param}>{r.parameter}</code>}
                </th>
                <td>{r.isi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bagian>

      <Bagian
        id="mode"
        sumber={["firmware/platformio.ini", "docs/hardware/wiring.md"]}
        pengantar={
          <p>
            Firmware dibangun dengan PlatformIO. Mode pertama adalah bawaan; {modeFirmware.length - 1} mode lain
            untuk uji bangku dan tidak memakai Wi-Fi.
          </p>
        }
      >
        <table className={s.table} aria-labelledby="mode-judul">
          <thead>
            <tr>
              <th scope="col">Mode</th>
              <th scope="col">Untuk apa</th>
            </tr>
          </thead>
          <tbody>
            {modeFirmware.map((m) => (
              <tr key={m.env}>
                <th scope="row" className={s.mono}>
                  {m.env}
                </th>
                <td>{m.isi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Bagian>
    </main>
  );
}
