import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { TrustStrip } from "@/components/TrustStrip";
import { Benefits } from "@/components/Benefits";
import { Treatments } from "@/components/Treatments";
import { HowItWorks } from "@/components/HowItWorks";
import { Timeline } from "@/components/Timeline";
import { Doctor } from "@/components/Doctor";
import { Discretion } from "@/components/Discretion";
import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meneer — Sorted, sir. Men's health, delivered in ZA" },
      { name: "description", content: "South African men's telehealth. Real HPCSA-registered doctors. Hair loss, ED, weight, TRT — discreetly delivered to your door." },
      { property: "og:title", content: "Meneer — Sorted, sir." },
      { property: "og:description", content: "Real doctors, real prescriptions, dropped at your door. Wrapped in absolutely nothing interesting." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative">
      <Nav />
      <main>
        <Hero />
        <TrustStrip />
        <Benefits />
        <Treatments />
        <HowItWorks />
        <Timeline />
        <Doctor />
        <Discretion />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
