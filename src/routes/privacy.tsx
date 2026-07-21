import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Meneer" },
      { name: "description", content: "How Meneer handles your personal and health information." },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="relative">
      <Nav />
      <main className="container-x py-20 lg:py-28 max-w-3xl">
        <p className="label-caps">Legal</p>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
          Privacy Policy
        </h1>
        <div className="mt-10 space-y-6 text-muted-foreground leading-relaxed">
          <p>[Privacy policy content pending final legal review]</p>
          <p>
            Meneer is committed to POPIA-compliant handling of your personal and health information.
            The full policy — including how we collect, store, share, and delete data — will appear
            here once it has been signed off by our legal team.
          </p>
          <p>
            In the meantime, questions about your data can be sent through our contact page.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
