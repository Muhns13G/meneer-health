import { createFileRoute } from "@tanstack/react-router";
import { publicContent } from "@content/public-content";
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
import { getCanonicalPublicUrl } from "@/lib/public-route-policy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: publicContent.metadata.homepage.title },
      {
        name: "description",
        content: publicContent.metadata.homepage.description,
      },
      { property: "og:title", content: publicContent.metadata.homepage.socialTitle },
      {
        property: "og:description",
        content: publicContent.metadata.homepage.socialDescription,
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: getCanonicalPublicUrl("/") }],
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
