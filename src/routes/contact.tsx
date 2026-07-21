import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Meneer" },
      { name: "description", content: "Get in touch with the Meneer team." },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="relative">
      <Nav />
      <main className="container-x py-20 lg:py-28 max-w-3xl">
        <p className="label-caps">Say hello</p>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
          Contact
        </h1>
        <div className="mt-10 space-y-6 text-muted-foreground leading-relaxed">
          <p>[Contact details pending — final channels to be confirmed]</p>
          <p>
            For general enquiries, partnerships, or press, reach out to{" "}
            <span className="text-gold">hello@meneer.co.za</span>. Existing patients should use the
            WhatsApp thread opened with their doctor for clinical questions.
          </p>
          <p>
            A proper contact form will land here shortly.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
