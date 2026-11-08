import { CaraKerja, Hero, Masalah, Target, Tim } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <main id="konten">
        <Hero />
        <Masalah />
        <CaraKerja />
        <Target />
      </main>
      <Tim />
    </>
  );
}
