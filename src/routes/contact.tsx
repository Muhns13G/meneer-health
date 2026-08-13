import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getCanonicalPublicUrl } from "@/lib/public-route-policy";
import { supportChannels } from "@/lib/support-channels";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Meneer" },
      { name: "description", content: "Get in touch with the Meneer team." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: getCanonicalPublicUrl("/contact") }],
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
        <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
          <section
            aria-labelledby="contact-general"
            className="rounded-2xl border border-border p-6"
          >
            <p className="label-caps text-gold">Available</p>
            <h2 id="contact-general" className="mt-3 font-serif text-2xl text-foreground">
              General support
            </h2>
            <p className="mt-3">
              For website access, general enquiries, partnerships, or press, email{" "}
              <a
                className="text-gold underline underline-offset-4"
                href={supportChannels.general.href}
              >
                {supportChannels.general.email}
              </a>
              . {supportChannels.general.owner} owns this channel, and it is monitored daily. No
              urgent or clinical response time is promised.
            </p>
            <p className="mt-3">
              Do not send symptoms, medical records, identity documents, prescriptions, payment
              details, or other sensitive information by ordinary email.
            </p>
          </section>

          <section
            aria-labelledby="contact-privacy"
            className="rounded-2xl border border-border p-6"
          >
            <p className="label-caps">Dedicated channel unavailable</p>
            <h2 id="contact-privacy" className="mt-3 font-serif text-2xl text-foreground">
              Privacy and data requests
            </h2>
            <p className="mt-3">
              A dedicated privacy channel and accountable privacy contact are not yet published. You
              may use the general support email only to ask for secure follow-up. Do not include
              identifiers, documents, health information, or the details of your request in that
              email.
            </p>
          </section>

          <section
            aria-labelledby="contact-complaints"
            className="rounded-2xl border border-border p-6"
          >
            <p className="label-caps">Dedicated channel unavailable</p>
            <h2 id="contact-complaints" className="mt-3 font-serif text-2xl text-foreground">
              Complaints
            </h2>
            <p className="mt-3">
              A dedicated complaints channel and accountable complaint owner are not yet published.
              A non-sensitive notice about the current website or general support may be sent to the
              general inbox for routing. Clinical and transactional complaint intake is not active.
            </p>
          </section>

          <section
            aria-labelledby="contact-clinical"
            className="rounded-2xl border border-border p-6"
          >
            <p className="label-caps">Unavailable</p>
            <h2 id="contact-clinical" className="mt-3 font-serif text-2xl text-foreground">
              Clinical questions
            </h2>
            <p className="mt-3">
              No clinical-question or adverse-event channel is active. Do not send symptoms or ask
              for patient-specific advice through the general inbox. Clinical journeys remain
              unavailable until an approved monitored channel, owner, hours, and fallback exist.
            </p>
          </section>

          <section
            aria-labelledby="contact-emergency"
            className="rounded-2xl border border-red-400/30 bg-red-950/20 p-6"
          >
            <p className="label-caps text-red-200">Urgent help</p>
            <h2 id="contact-emergency" className="mt-3 font-serif text-2xl text-foreground">
              Emergency services
            </h2>
            <p className="mt-3">
              The general inbox is not an emergency or urgent clinical service. Call{" "}
              <a
                className="text-red-100 underline underline-offset-4"
                href={supportChannels.emergency.mobile.href}
              >
                112 from a mobile
              </a>{" "}
              or{" "}
              <a
                className="text-red-100 underline underline-offset-4"
                href={supportChannels.emergency.ambulance.href}
              >
                10177 for an ambulance
              </a>
              , or go to the nearest emergency facility.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
