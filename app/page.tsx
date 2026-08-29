import { HeroSection } from "@/components/landing/hero-section";
import { Navbar } from "@/components/landing/navbar";

export default function Home() {
  return (
    <div className="h-svh overflow-hidden">
      <Navbar />
      <main className="h-full">
        <HeroSection />
      </main>
    </div>
  );
}
