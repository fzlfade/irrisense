import Image from "next/image";
import Spin3D from "./Spin3D";
import CountUp from "./reactbits/CountUp";
import Magnet from "./reactbits/Magnet";
import ScrollReveal from "./reactbits/ScrollReveal";
import HeroTitle from "./HeroTitle";
import s from "./sections.module.css";

export function Hero() {
  return (
    <header className={s.hero}>
      <div className={s.wrap}>
        <p className={s.meta}>Capstone Design 2026 · Universitas Tidar</p>
        <HeroTitle />
        <p className={s.lead}>
          Sistem penyiraman tetes otomatis untuk kebun vanili. Sensor membaca tanah, ESP32
          memutuskan, pompa menyiram.
        </p>
        <p className={s.en} lang="en">
          IoT-Based Automatic Drip Irrigation System for Vanilla Plantations
        </p>
        <div className={s.ctaRow}>
          <Magnet padding={60} magnetStrength={3} maxOffset={14}>
            <a className={s.cta} href="#cara-kerja">
              Lihat cara kerja
            </a>
          </Magnet>
          <a className={s.secondary} href="/dashboard/">
            Buka dashboard
          </a>
        </div>
      </div>
      <figure className={s.heroFigure}>
        <Spin3D
          src="/prototipe/?embed=1&bg=12301f&cam=0,52,104&tgt=0,12,6"
          poster="/img/prototipe-hero.png"
          alt="Rancangan 3D prototipe: bak tanah berisi enam tanaman vanili dengan selang tetes, tandon air, dan kotak elektronik berlayar kecil."
          width={1520}
          height={560}
          mobileRatio="4 / 3"
          sizes="100vw"
          eager
        />
        <figcaption className={s.caption}>Rancangan prototipe dalam 3D, bukan foto alat. Gulir atau seret untuk memutar.</figcaption>
      </figure>
    </header>
  );
}

export function Masalah() {
  return (
    <section className={s.masalah} aria-label="Masalah penyiraman manual">
      <div className={`${s.wrap} ${s.masalahGrid}`}>
        <div className={s.bigNumber} aria-label="60 sampai 80 persen">
          <span className={s.bigValue}>60–80 %</span>
          <span className={s.bigNote}>kelembapan tanah yang dibutuhkan tanaman vanili agar tumbuh baik</span>
        </div>
        <div>
          <ScrollReveal
            mode="enter"
            effect="rise"
            splitBy="words"
            baseRotation={0}
            enableBlur={false}
            baseOpacity={0.15}
            stagger={0.05}
            duration={0.7}
            containerClassName={s.reveal}
            textClassName={s.revealText}
          >
            Disiram menurut kira-kira, bukan menurut kebutuhan tanah
          </ScrollReveal>
          <p className={s.body}>
            Penyiraman manual memboroskan air, dan kelembapan tanah naik-turun tak menentu.
            IrriSense mengukur tanahnya langsung, lalu menyiram hanya saat tanah memang kering.
          </p>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Enam sensor membaca tanah",
    text: "Satu sensor kelembapan tanah untuk tiap tanaman. ESP32 merata-ratakan bacaannya, dan sensor yang rusak diabaikan.",
  },
  {
    title: "ESP32 memutuskan",
    text: "Pompa menyala saat rata-rata di bawah 60 % dan mati di 80 % atau lebih. Batas waktu 10 menit mencegah pompa menyala tanpa henti.",
  },
  {
    title: "Pompa menyiram tetes",
    text: "Pompa 5 V mengalirkan air dari tandon ke selang tetes, satu emitter untuk tiap tanaman.",
  },
  {
    title: "Data tampil di dashboard",
    text: "Setiap 5 detik ESP32 mengirim kelembapan tanah, suhu, kelembapan udara, dan status pompa lewat MQTT. Dashboard juga punya tombol kontrol manual.",
  },
];

export function CaraKerja() {
  return (
    <section id="cara-kerja" className={s.cara} aria-labelledby="cara-judul">
      <div className={`${s.wrap} ${s.caraGrid}`}>
        <div>
          <h2 id="cara-judul" className={s.h2}>
            Sensor membaca, ESP32 memutuskan, pompa menyiram
          </h2>
          <ol id="cara-langkah" className={s.steps}>
            {steps.map((step) => (
              <li key={step.title} className={s.step}>
                <h3 className={s.h3}>{step.title}</h3>
                <p className={s.body}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <figure className={s.caraFigure}>
          <div className={s.caraFrame}>
            <Spin3D
              src="/prototipe/?embed=1&bg=fbf8ee&open=1&cam=0,66,110&tgt=0,8,10"
              poster="/img/prototipe-terbuka.png"
              alt="Rancangan 3D susunan prototipe dengan casing terbuka, memperlihatkan ESP32, relay, pompa, sensor tanah, dan sensor suhu di atas papan dasar."
              width={1500}
              height={900}
              sizes="(min-width: 64rem) 60vw, 100vw"
              story={{ listId: "cara-langkah" }}
              storyRatio="5 / 4"
            />
          </div>
          <figcaption className={s.captionDark}>
            Susunan prototipe di atas papan 100 × 76 cm (rancangan 3D, casing terbuka). Gulir atau seret untuk memutar.
          </figcaption>
          <a className={s.link} href="/prototipe/">
            Coba prototipe 3D dengan live test
          </a>
        </figure>
      </div>
    </section>
  );
}

const targets = [
  { prefix: "< ", to: 2, suffix: " detik", label: "delay monitoring" },
  { prefix: "± ", to: 5, suffix: " %", label: "akurasi sensor" },
  { prefix: "", to: 30, suffix: " %", label: "target hemat air" },
];

export function Target() {
  return (
    <section className={s.target} aria-labelledby="target-judul">
      <div className={s.wrap}>
        <h2 id="target-judul" className={s.h2Light}>
          Tiga target yang akan diuji
        </h2>
        <dl className={s.targets}>
          {targets.map((t) => (
            <div key={t.label} className={s.targetItem}>
              <dt className={s.targetLabel}>{t.label}</dt>
              <dd className={s.targetValue}>
                <CountUp to={t.to} prefix={t.prefix} suffix={t.suffix} duration={1.6} easing="expo" />
              </dd>
            </div>
          ))}
        </dl>
        <p className={s.targetNote}>
          Ini target dari rancangan proyek, belum hasil pengukuran. Hasil pengujian ditulis di sini
          setelah data terkumpul.
        </p>
      </div>
    </section>
  );
}

const team = [
  "Faizal Deshta Nugraha (ketua)",
  "Muhamad Rifa'i",
  "Fahmi Aulia Mustofa",
  "Vincensius A. M. Prabaswara",
  "Ilhan Ha'is Munjazi",
];

export function Tim() {
  return (
    <footer className={s.tim} aria-labelledby="tim-judul">
      <div className={`${s.wrap} ${s.timGrid}`}>
        <div>
          <h2 id="tim-judul" className={s.h2}>
            Tim IrriSense
          </h2>
          <p className={s.body}>Capstone Design 2026, Fakultas Teknik, Universitas Tidar.</p>
          <ul className={s.team}>
            {team.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className={s.body}>
            Dosen pembimbing: <strong>Kukuh Trisna Pambudi, S.T., M.Eng.</strong>
          </p>
        </div>
        <Image
          src="/img/logo-untidar.png"
          alt="Logo Universitas Tidar"
          width={500}
          height={500}
          className={s.logo}
        />
      </div>
    </footer>
  );
}
