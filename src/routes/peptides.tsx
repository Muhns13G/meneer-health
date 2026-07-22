import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/peptides")({
  head: () => ({
    meta: [
      { title: "Peptides — Meneer" },
      {
        name: "description",
        content:
          "Doctor-led peptide therapy for recovery, performance, and longevity. Delivered discreetly across South Africa.",
      },
      { property: "og:title", content: "Peptides — Meneer" },
      {
        property: "og:description",
        content:
          "Precision, at a cellular level. Doctor-led peptide therapy, delivered.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PeptidesPage,
});

function PeptidesPage() {
  return (
    <div className="relative">
      <Nav />
      <main className="container-x py-20 lg:py-28 max-w-3xl">
        <p className="label-caps text-gold">New · Peptide therapy</p>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
          Precision, at a cellular level.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Peptides are short chains of amino acids that signal your body to do
          specific things — recover faster, sleep deeper, lean out, hold onto
          muscle. Used well, under a doctor's eye, they're one of the sharpest
          tools in modern men's health.
        </p>

        <div className="mt-14 grid sm:grid-cols-2 gap-4">
          {[
            { tag: "Recovery", title: "BPC-157, TB-500" },
            { tag: "Performance", title: "CJC-1295, Ipamorelin" },
            { tag: "Body composition", title: "Tesofensine, Retatrutide" },
            { tag: "Longevity", title: "Epithalon, NAD+ protocols" },
          ].map((p) => (
            <div
              key={p.tag}
              className="p-6 rounded-2xl bg-surface border border-border/60"
            >
              <p className="label-caps text-muted-foreground">{p.tag}</p>
              <h3 className="mt-3 font-serif text-2xl text-foreground">
                {p.title}
              </h3>
            </div>
          ))}
        </div>

        <div className="mt-14 space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Every peptide protocol on Meneer is prescribed by an
            HPCSA-registered doctor after reviewing your intake and, where
            required, blood work. No shortcuts. No grey-market vials.
          </p>
          <p className="text-xs">
            [Detailed indications, contraindications, and protocol pricing
            pending final medical review.]
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            to="/start"
            className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-gold-soft transition-colors"
          >
            See if you qualify
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-gold/50 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
