import Spin3D from "./Spin3D";
import CaraStory from "./CaraStory";
import CountUp from "./reactbits/CountUp";
import Magnet from "./reactbits/Magnet";
import ScrollReveal from "./reactbits/ScrollReveal";
import HeroTitle from "./HeroTitle";
import s from "./sections.module.css";

export function Hero() {
  return (
    // data-motion: sasaran gerak gulir di ScrollMotion.tsx (hero menyempit saat ditinggalkan).
    <section className={s.hero} data-motion="hero">
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
          src="/prototipe/?embed=1&bg=12301f&cam=-12,138,243&tgt=-12,28,8"
          poster="/img/prototipe-hero.webp"
          alt="Rancangan 3D prototipe: rangka paralon atap pelana berisi enam polybag vanili dengan selang tetes, galon air, dan kotak elektronik berlayar kecil di tiang depan."
          width={1520}
          height={560}
          mobileRatio="4 / 3"
          sizes="100vw"
          eager
          reportsLoad
        />
        <figcaption className={s.caption}>Rancangan prototipe dalam 3D, bukan foto alat. Gulir atau seret untuk memutar.</figcaption>
      </figure>
    </section>
  );
}

export function Masalah() {
  return (
    <section className={s.masalah} aria-label="Masalah penyiraman manual">
      <div className={`${s.wrap} ${s.masalahGrid}`}>
        <div className={s.bigNumber} aria-label="60 sampai 80 persen">
          <span className={s.bigValue} data-motion="drift">
            60–80 %
          </span>
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
      <div className={`${s.wrap} ${s.caraHead}`}>
        <h2 id="cara-judul" className={s.h2}>
          Sensor membaca, ESP32 memutuskan, pompa menyiram
        </h2>
      </div>
      <CaraStory steps={steps} />
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
