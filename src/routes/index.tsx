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
      { title: "Meneer — Back to your best. Men's health, delivered in ZA" },
      { name: "description", content: "Back to your best. South African men's telehealth with real HPCSA-registered doctors. Hair loss, ED, weight, TRT — discreetly delivered to your door." },
      { property: "og:title", content: "Meneer — Back to your best." },
      { property: "og:description", content: "Real doctors, real prescriptions, dropped at your door. Back to your best." },
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
