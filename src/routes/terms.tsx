import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Meneer" },
      { name: "description", content: "The terms that govern your use of Meneer." },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="relative">
      <Nav />
      <main className="container-x py-20 lg:py-28 max-w-3xl">
        <p className="label-caps">Legal</p>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
          Terms of Service
        </h1>
        <div className="mt-10 space-y-6 text-muted-foreground leading-relaxed">
          <p>[Terms of service content pending final legal review]</p>
          <p>
            These terms will describe your rights and responsibilities when using Meneer — including
            eligibility, consultation conduct, prescription fulfilment, payment, cancellation, and
            our limitations of liability.
          </p>
          <p>
            The finalised terms will replace this placeholder once legal review is complete.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
