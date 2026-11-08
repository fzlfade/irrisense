import { CaraKerja, Hero, Masalah, Target, Tim } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <Masalah />
        <CaraKerja />
        <Target />
      </main>
      <Tim />
    </>
  );
}
