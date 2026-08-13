import { createFileRoute } from "@tanstack/react-router";
import { publicContent } from "@content/public-content";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getCanonicalPublicUrl } from "@/lib/public-route-policy";
import { supportChannels } from "@/lib/support-channels";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: publicContent.metadata.terms.title },
      { name: "description", content: publicContent.metadata.terms.description },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: getCanonicalPublicUrl("/terms") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="relative">
      <Nav />
      <main className="container-x py-20 lg:py-28 max-w-3xl">
        <p className="label-caps">Website use</p>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
          Website Terms
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">Effective 7 August 2026 · Version 1.0</p>

        <div className="mt-10 space-y-10 text-muted-foreground leading-relaxed">
          <section aria-labelledby="terms-operator">
            <h2 id="terms-operator" className="font-serif text-2xl text-foreground">
              Operator and scope
            </h2>
            <p className="mt-3">
              This website is operated by OCTOTHORP ZA, enterprise number K2024185008, using Meneer
              as the working website brand. These terms apply only to the current public website.
            </p>
          </section>

          <section aria-labelledby="terms-current-service">
            <h2 id="terms-current-service" className="font-serif text-2xl text-foreground">
              Current service boundary
            </h2>
            <p className="mt-3">
              The website currently provides general information and does not create an account,
              doctor-patient relationship, consultation, prescription, payment, order, delivery, or
              guarantee of treatment. Transactional routes remain unavailable until their clinical,
              privacy, operational, and technical controls are approved.
            </p>
          </section>

          <section aria-labelledby="terms-medical">
            <h2 id="terms-medical" className="font-serif text-2xl text-foreground">
              Medical and emergency boundary
            </h2>
            <p className="mt-3">
              Website content is general information and is not a diagnosis, prescription, or
              substitute for professional medical advice. Treatment suitability can be determined
              only through an approved clinical process. Do not use the website or general support
              inbox for an emergency; call{" "}
              <a
                className="text-gold underline underline-offset-4"
                href={supportChannels.emergency.mobile.href}
              >
                112 from a mobile
              </a>{" "}
              or{" "}
              <a
                className="text-gold underline underline-offset-4"
                href={supportChannels.emergency.ambulance.href}
              >
                10177 for an ambulance
              </a>
              , or go to the nearest emergency facility.
            </p>
          </section>

          <section aria-labelledby="terms-use">
            <h2 id="terms-use" className="font-serif text-2xl text-foreground">
              Acceptable website use
            </h2>
            <p className="mt-3">
              You may use the website for lawful personal information purposes. You may not attempt
              to disrupt it, bypass a disabled or restricted route, introduce malicious code,
              impersonate another person, or use its content or systems unlawfully.
            </p>
          </section>

          <section aria-labelledby="terms-content">
            <h2 id="terms-content" className="font-serif text-2xl text-foreground">
              Content, links, and availability
            </h2>
            <p className="mt-3">
              We may correct or update website content and cannot promise uninterrupted
              availability. Third-party links are provided for context and remain subject to their
              own terms and privacy practices. Unless otherwise stated, website content, design,
              branding, and code are owned by or licensed to the operator and may not be copied or
              commercially reused without permission.
            </p>
          </section>

          <section aria-labelledby="terms-liability">
            <h2 id="terms-liability" className="font-serif text-2xl text-foreground">
              Legal protections
            </h2>
            <p className="mt-3">
              Use the current informational website at your own risk and do not rely on it for an
              urgent or patient-specific clinical decision. Nothing in these terms excludes a right
              or liability that cannot lawfully be excluded under South African law.
            </p>
          </section>

          <section aria-labelledby="terms-changes">
            <h2 id="terms-changes" className="font-serif text-2xl text-foreground">
              Changes and contact
            </h2>
            <p className="mt-3">
              These terms are governed by South African law. Material changes will be published with
              a new effective date and version. Questions about the website may be sent to{" "}
              <a
                className="text-gold underline underline-offset-4"
                href={supportChannels.general.href}
              >
                {supportChannels.general.email}
              </a>
              . Separate approved transactional terms must be published before any consultation,
              payment, prescription, order, cancellation, refund, or delivery journey opens.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
