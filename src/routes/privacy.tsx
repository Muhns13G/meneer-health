import { createFileRoute } from "@tanstack/react-router";
import { publicContent } from "@content/public-content";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getCanonicalPublicUrl } from "@/lib/public-route-policy";
import { supportChannels } from "@/lib/support-channels";
import { companyProfile } from "@content/company-profile";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: publicContent.metadata.privacy.title },
      {
        name: "description",
        content: publicContent.metadata.privacy.description,
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
        <p className="mt-5 text-sm text-muted-foreground">
          Effective 13 October 2026 · Version 1.2
        </p>

        <div className="mt-10 space-y-10 text-muted-foreground leading-relaxed">
          <section aria-labelledby="privacy-operator">
            <h2 id="privacy-operator" className="font-serif text-2xl text-foreground">
              Who operates this website
            </h2>
            <p className="mt-3">
              {companyProfile.legalName}, registration number {companyProfile.registrationNumber},
              operates Meneer Health and is the responsible party for its platform collection and
              administration of personal information. Its registered office is{" "}
              {companyProfile.registeredAddress}. In this notice, “Meneer”, “we”, and “us” refer to
              this company.
            </p>
          </section>

          <section aria-labelledby="privacy-boundary">
            <h2 id="privacy-boundary" className="font-serif text-2xl text-foreground">
              Current website boundary
            </h2>
            <p className="mt-3">
              Public pages provide general information. Enabled private journeys separately verify
              accounts, collect profile details and securely collect questionnaire answers, with
              their applicable notices and consent. Enabled payments have separate terms. This
              website notice is not medical consent, clinical approval or permission to transfer
              your answers to an external protocol generator.
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
                Information you supply in an enabled private account or questionnaire journey,
                document acknowledgements and relevant support/payment references. Medical answers
                are not permission to create an advertising profile. Payment-card details are
                entered into Stripe's hosted interface, not the questionnaire.
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
              secure the website. The site also requests its display fonts from Google Fonts, so
              Google may receive the technical connection information required to serve those font
              files. No health questionnaire or form data is sent with that request.
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
              request access, correction, deletion, or an objection to processing. Email{" "}
              <a
                className="text-gold underline underline-offset-4"
                href={`mailto:${companyProfile.privacyEmail}`}
              >
                {companyProfile.privacyEmail}
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
              Private services and providers
            </h2>
            <p className="mt-3">
              Private journeys provide their applicable versioned notices and consent actions.
              Technology services include Cloudflare, Supabase, Brevo, Telnyx and Stripe; some
              processing occurs outside South Africa. {companyProfile.paymentCollector}
              collects payments for {companyProfile.legalName}. Medical review, external transfer
              and dispensing remain separately governed. This notice does not authorise them.
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
