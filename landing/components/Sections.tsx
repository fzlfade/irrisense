import Spin3D from "./Spin3D";
import CaraStory from "./CaraStory";
import Magnet from "./reactbits/Magnet";
import ScrollReveal from "./reactbits/ScrollReveal";
import HeroTitle from "./HeroTitle";
import s from "./sections.module.css";

export function Hero() {
  return (
    <section className={s.hero}>
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
          {/* Redaman 27 = kritis untuk kekakuan 170 (2·√170), jadi tombol kembali tanpa memantul (skill motion). */}
          <Magnet padding={60} magnetStrength={3} maxOffset={14} spring={{ stiffness: 170, damping: 27, mass: 1 }}>
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
      {/* Nomor bab: urutan cerita beranda (pola Storytelling-Driven), bukan isi judul. Di atas grid supaya
          tetap membuka bab di ponsel, tempat angka 60–80 % tampil lebih dulu. */}
      <div className={s.wrap}>
        <p className={s.chapter}>Bab 1 · Masalah</p>
      </div>
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
            stagger={0.03}
            duration={0.3}
            containerClassName={s.reveal}
            textClassName={s.revealText}
          >
            Disiram menurut kira-kira, bukan menurut kebutuhan tanah
          </ScrollReveal>
          <p className={s.body}>
            Penyiraman manual memboroskan air, dan kelembapan tanah naik-turun tak menentu.
            IrriSense mengukur tanahnya langsung, lalu menyiram hanya saat tanah memang kering.
          </p>
          <a className={s.link} href="#cara-kerja">
            Lihat cara kerjanya
          </a>
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
        <p className={s.chapter}>Bab 2 · Cara kerja</p>
        <h2 id="cara-judul" className={s.h2}>
          Sensor membaca, ESP32 memutuskan, pompa menyiram
        </h2>
      </div>
      <CaraStory steps={steps} />
    </section>
  );
}

const targets = [
  { value: "< 2 detik", label: "delay monitoring" },
  { value: "± 5 %", label: "akurasi sensor" },
  { value: "30 %", label: "target hemat air" },
];

export function Target() {
  return (
    <section className={s.target} aria-labelledby="target-judul">
      <div className={s.wrap}>
        <p className={s.chapter}>Bab 3 · Target</p>
        <h2 id="target-judul" className={s.h2Light}>
          Tiga target yang akan diuji
        </h2>
        <dl className={s.targets}>
          {targets.map((t) => (
            <div key={t.label} className={s.targetItem}>
              <dt className={s.targetLabel}>{t.label}</dt>
              <dd className={s.targetValue}>
                {t.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className={s.targetNote}>
          Ini target dari rancangan proyek, belum hasil pengukuran. Hasil pengujian ditulis di sini
          setelah data terkumpul.
        </p>
        {/* CTA hero diulang di dekat akhir halaman (pola marketing Home di skill page-patterns). */}
        <div className={s.ctaRow}>
          <a className={s.cta} href="/dashboard/">
            Buka dashboard
          </a>
          <a className={s.secondary} href="/spesifikasi/">
            Baca spesifikasi
          </a>
        </div>
      </div>
    </section>
  );
}
