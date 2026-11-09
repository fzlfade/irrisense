import { CaraKerja, Hero, Masalah, Target } from "@/components/Sections";
import ScrollMotion from "@/components/ScrollMotion";

export default function Home() {
  return (
    <main id="konten">
      <Hero />
      <Masalah />
      <CaraKerja />
      <Target />
      <ScrollMotion />
    </main>
  );
}
