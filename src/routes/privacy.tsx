import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getCanonicalPublicUrl } from "@/lib/public-route-policy";
import { supportChannels } from "@/lib/support-channels";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Website Privacy Notice — Meneer" },
      {
        name: "description",
        content: "How the current Meneer website handles personal information.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: getCanonicalPublicUrl("/privacy") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="relative">
      <Nav />
      <main className="container-x py-20 lg:py-28 max-w-3xl">
        <p className="label-caps">Privacy</p>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
          Website Privacy Notice
        </h1>
        <p className="mt-5 text-sm text-muted-foreground">Effective 7 August 2026 · Version 1.0</p>

        <div className="mt-10 space-y-10 text-muted-foreground leading-relaxed">
          <section aria-labelledby="privacy-operator">
            <h2 id="privacy-operator" className="font-serif text-2xl text-foreground">
              Who operates this website
            </h2>
            <p className="mt-3">
              Meneer is operated for this pre-transactional website by OCTOTHORP ZA, enterprise
              number K2024185008. In this notice, “Meneer”, “we”, and “us” refer to that website
              operation.
            </p>
          </section>

          <section aria-labelledby="privacy-boundary">
            <h2 id="privacy-boundary" className="font-serif text-2xl text-foreground">
              Current website boundary
            </h2>
            <p className="mt-3">
              This website currently provides public information only. It does not provide an active
              account, medical questionnaire, consultation, payment, prescription, or order service,
              and it does not intentionally collect health information through a website form.
            </p>
          </section>

          <section aria-labelledby="privacy-information">
            <h2 id="privacy-information" className="font-serif text-2xl text-foreground">
              Information that may be processed
            </h2>
            <ul className="mt-3 list-disc space-y-3 pl-5">
              <li>
                Basic technical request information needed to deliver and protect the website, such
                as an IP address, browser or device information, requested page, timestamp, and
                security or diagnostic events.
              </li>
              <li>
                Information you choose to include when emailing{" "}
                <a
                  className="text-gold underline underline-offset-4"
                  href={supportChannels.general.href}
                >
                  {supportChannels.general.email}
                </a>
                . Please do not send symptoms, medical records, identity documents, prescriptions,
                payment details, or other sensitive information to this general inbox.
              </li>
            </ul>
            <p className="mt-3">
              The application does not currently configure analytics or advertising trackers. A
              selected hosting provider may process limited technical information to deliver and
              secure the website; this notice must be updated when that provider is approved.
            </p>
          </section>

          <section aria-labelledby="privacy-purpose">
            <h2 id="privacy-purpose" className="font-serif text-2xl text-foreground">
              Purpose, sharing, and retention
            </h2>
            <p className="mt-3">
              We may use the limited information above to deliver and secure the website, diagnose
              faults, respond to a general enquiry, and comply with applicable law. It must be
              limited to what is necessary, shared only with authorised service providers or where
              legally required, and retained only for as long as its approved purpose requires. We
              do not sell personal information.
            </p>
          </section>

          <section aria-labelledby="privacy-rights">
            <h2 id="privacy-rights" className="font-serif text-2xl text-foreground">
              Your privacy rights
            </h2>
            <p className="mt-3">
              Subject to applicable law, you may ask whether we hold your personal information and
              request access, correction, deletion, or an objection to processing. A dedicated
              privacy channel and accountable privacy contact are not yet published. Email{" "}
              <a
                className="text-gold underline underline-offset-4"
                href={supportChannels.general.href}
              >
                {supportChannels.general.email}
              </a>{" "}
              only to request secure follow-up; do not include identifiers, documents, health
              information, or request details in ordinary email. You may also submit a complaint
              through the{" "}
              <a
                className="text-gold underline underline-offset-4"
                href="https://inforegulator.org.za/popia/"
                target="_blank"
                rel="noreferrer"
              >
                Information Regulator’s POPIA channels
              </a>
              .
            </p>
          </section>

          <section aria-labelledby="privacy-future">
            <h2 id="privacy-future" className="font-serif text-2xl text-foreground">
              Before transactional services open
            </h2>
            <p className="mt-3">
              A separate approved notice, consent boundary, responsible-party and operator record,
              retention schedule, and vendor disclosure must be published before this website
              collects health information or enables a consultation, payment, prescription, or
              order. This notice is not medical or telehealth consent.
            </p>
          </section>

          <section aria-labelledby="privacy-changes">
            <h2 id="privacy-changes" className="font-serif text-2xl text-foreground">
              Changes to this notice
            </h2>
            <p className="mt-3">
              Material changes will be published here with an updated effective date and version. A
              later notice cannot silently authorise a previously disabled health-data journey.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
