import { Link } from "@tanstack/react-router";
import { ArrowLeft, CircleAlert, LockKeyhole, Phone } from "lucide-react";
import { pilotActivationBlockers } from "@/lib/compliance/pilot-profile";

export function SafetyEntryGate() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/50">
        <div className="container-x flex h-16 items-center">
          <Link to="/" className="font-serif text-xl text-foreground">
            Meneer<span className="text-gold">.</span>
          </Link>
        </div>
      </header>

      <main className="container-x flex-1 py-14 sm:py-20">
        <section className="mx-auto w-full max-w-3xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
            <LockKeyhole aria-hidden size={22} className="text-gold" />
          </div>
          <p className="label-caps mt-8 text-gold">Controlled pilot</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            Start your private consult
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Private pilot access remains restricted while the clinical, pharmacy, and urgent-support
            details required for activation are verified. No health information is collected from
            this page.
          </p>

          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-950/20 p-5">
            <div className="flex items-start gap-3">
              <CircleAlert aria-hidden className="mt-0.5 shrink-0 text-red-300" size={22} />
              <div>
                <h2 className="font-medium text-foreground">Do you need urgent medical help?</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Do not continue with an online consultation if you believe this is an emergency.
                  Call emergency services or go to the nearest emergency facility.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="tel:112"
                    className="inline-flex items-center rounded-full bg-red-300 px-4 py-2 text-sm font-semibold text-red-950"
                  >
                    <Phone aria-hidden className="mr-2" size={15} />
                    Mobile emergency: 112
                  </a>
                  <a
                    href="tel:10177"
                    className="inline-flex items-center rounded-full border border-red-300/40 px-4 py-2 text-sm font-medium text-red-100"
                  >
                    Ambulance: 10177
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-medium text-foreground">Pilot entry boundary</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>The initial transactional cohort is limited to the approved peptide pathway.</li>
              <li>
                Other treatment information remains available, but its transaction cannot start
                here.
              </li>
              <li>
                Age, location, condition-specific exclusions, consent, and clinical triage must pass
                before treatment or fulfilment.
              </li>
              <li>General email support is not an emergency or urgent clinical service.</li>
            </ul>
          </div>

          <div role="status" className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Activation remains blocked by {pilotActivationBlockers.length} required verification
              {pilotActivationBlockers.length === 1 ? "" : "s"}. Development placeholders are never
              presented as professional registrations.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="mailto:support@meneerhealth.co.za"
              className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              General support
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground"
            >
              <ArrowLeft aria-hidden className="mr-2" size={16} />
              Back to home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
