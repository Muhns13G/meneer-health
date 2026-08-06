import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { PilotRouteGate } from "@/components/PilotRouteGate";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Private pilot access — Meneer" },
      {
        name: "description",
        content: "Meneer's private transactional pilot is currently access restricted.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StartRoute,
});

function StartRoute() {
  return (
    <PilotRouteGate
      eyebrow="Controlled pilot"
      title="Private pilot access is currently restricted."
      description="The account and consultation journey will open only through an approved cohort-access process once secure, durable submission handling is in place."
      assurance="No account, consent, health questionnaire, payment, or order is created from this page."
    />
  );
}

type Condition = "hair" | "ed" | "weight" | "trt";

const conditions: { id: Condition; label: string; body: string }[] = [
  {
    id: "hair",
    label: "Hair Loss",
    body: "Slow loss and regrow with finasteride and minoxidil protocols.",
  },
  {
    id: "ed",
    label: "Erectile Dysfunction",
    body: "PDE5 inhibitors prescribed and dosed for you, discreetly.",
  },
  {
    id: "weight",
    label: "Weight Management",
    body: "Medical-grade weight loss support, doctor-led plans.",
  },
  {
    id: "trt",
    label: "Testosterone / TRT",
    body: "Full bloodwork and TRT with proper monitoring.",
  },
];

const phaseLabels = ["Choose condition", "Consent", "Create account", "Questionnaire"];

// Preserved prototype: keep inaccessible until an approved replacement is verified and cut over.
function StartFlow() {
  // step: 0 = condition, 1 = consent, 2 = account, 3 = questionnaire, 4 = confirmation
  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [consent, setConsent] = useState(false);
  const [account, setAccount] = useState({ firstName: "", email: "", whatsapp: "", password: "" });

  const totalSteps = 4; // 4 interactive steps; step 5 (index 4) is the confirmation state
  const currentProgress =
    step >= totalSteps ? 100 : Math.round(((step + 1) / (totalSteps + 1)) * 100);

  const canNext = useMemo(() => {
    if (step === 0) return !!condition;
    if (step === 1) return consent;
    if (step === 2) {
      return (
        account.firstName.trim() &&
        account.email.includes("@") &&
        account.whatsapp.length >= 7 &&
        account.password.length >= 6
      );
    }
    if (step === 3) return true;
    return false;
  }, [step, condition, consent, account]);

  if (step === totalSteps) {
    return <Confirmation />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container-x flex items-center justify-between h-16">
          <Link to="/" className="font-serif text-xl">
            Meneer<span className="text-gold">.</span>
          </Link>
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of 5 · {phaseLabels[step]}
          </span>
        </div>
        <div className="h-1 bg-surface">
          <div
            className="h-full bg-gold transition-all duration-500"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-5">
        <div className="w-full max-w-2xl">
          {step === 0 && <ConditionStep condition={condition} onSelect={setCondition} />}

          {step === 1 && <ConsentStep consent={consent} setConsent={setConsent} />}

          {step === 2 && <AccountStep account={account} setAccount={setAccount} />}

          {step === 3 && <QuestionnaireStep />}

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-2 rounded-full bg-gold text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-gold-soft transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {step === 2 ? "Create account" : step === 3 ? "Submit" : "Continue"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ConditionStep({
  condition,
  onSelect,
}: {
  condition: Condition | null;
  onSelect: (c: Condition) => void;
}) {
  return (
    <div>
      <p className="label-caps">Step 01</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">What would you like help with?</h1>
      <p className="mt-3 text-muted-foreground">Pick one. You can always change later.</p>

      <div className="mt-10 grid sm:grid-cols-2 gap-3">
        {conditions.map((c) => {
          const selected = condition === c.id;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`text-left p-6 rounded-2xl border transition-colors ${
                selected ? "border-gold bg-gold/5" : "border-border bg-surface hover:border-gold/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-xl">{c.label}</h3>
                {selected && (
                  <span className="shrink-0 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                    <Check size={12} className="text-primary-foreground" />
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.body}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConsentStep({
  consent,
  setConsent,
}: {
  consent: boolean;
  setConsent: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="label-caps">Step 02</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">POPIA & informed consent.</h1>
      <p className="mt-3 text-muted-foreground">
        Before we go further, we need your explicit consent to process your health information and
        provide care.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground leading-relaxed max-h-80 overflow-y-auto">
        <p className="italic">[POPIA and informed consent language pending legal review]</p>
        <p className="mt-4">
          [Placeholder — this section will describe how Meneer collects, stores and processes your
          personal and health information under POPIA, the nature of the telehealth consultation,
          the risks and benefits of treatment, your right to withdraw, and how your data is
          protected.]
        </p>
        <p className="mt-4">
          [Placeholder — informed consent to a virtual doctor consultation, prescription issuance
          where clinically appropriate, and delivery of medication to your address.]
        </p>
      </div>

      <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-border bg-surface accent-[color:var(--gold,#c9a961)] cursor-pointer"
        />
        <span className="text-sm text-foreground leading-relaxed">
          I have read and understood the above. I consent to Meneer processing my personal and
          health information under POPIA, and to a telehealth consultation with a registered doctor.
        </span>
      </label>
    </div>
  );
}

function AccountStep({
  account,
  setAccount,
}: {
  account: { firstName: string; email: string; whatsapp: string; password: string };
  setAccount: React.Dispatch<
    React.SetStateAction<{ firstName: string; email: string; whatsapp: string; password: string }>
  >;
}) {
  const inputCls =
    "w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors";

  return (
    <div>
      <p className="label-caps">Step 03</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">Create your private account.</h1>
      <p className="mt-3 text-muted-foreground">
        We'll use this to send your consult details and keep your records locked down.
      </p>

      <div className="mt-8 grid gap-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-2">First name</label>
          <input
            type="text"
            value={account.firstName}
            maxLength={50}
            onChange={(e) => setAccount((a) => ({ ...a, firstName: e.target.value }))}
            className={inputCls}
            placeholder="Themba"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Email</label>
          <input
            type="email"
            value={account.email}
            maxLength={255}
            onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
            className={inputCls}
            placeholder="you@private.co.za"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">WhatsApp number</label>
          <input
            type="tel"
            value={account.whatsapp}
            maxLength={20}
            onChange={(e) => setAccount((a) => ({ ...a, whatsapp: e.target.value }))}
            className={inputCls}
            placeholder="+27 82 000 0000"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-2">Password</label>
          <input
            type="password"
            value={account.password}
            maxLength={100}
            onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
            className={inputCls}
            placeholder="At least 6 characters"
          />
        </div>
      </div>
    </div>
  );
}

function QuestionnaireStep() {
  return (
    <div>
      <p className="label-caps">Step 04</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">A few questions about you.</h1>
      <p className="mt-3 text-muted-foreground">
        Your doctor will use your answers to prepare for your consultation.
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted-foreground italic">
          [Full clinical questionnaire coming soon]
        </p>
        <p className="mt-3 text-xs text-muted-foreground/70">
          This step will collect condition-specific medical history, current medications, and
          lifestyle factors — reviewed by your doctor before your consult.
        </p>
      </div>
    </div>
  );
}

const confirmationTimeline = [
  { title: "Blood work, if required", when: "Before review" },
  { title: "Your doctor reviews your questionnaire and results", when: "Within 48h" },
  { title: "Video consultation with your doctor", when: "Required, 15–20 minutes" },
  { title: "Prescription and treatment plan", when: "Same day as consult" },
  { title: "Medication delivered to your door", when: "2–3 business days" },
];

function Confirmation() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50">
        <div className="container-x flex items-center justify-between h-16">
          <Link to="/" className="font-serif text-xl">
            Meneer<span className="text-gold">.</span>
          </Link>
        </div>
        <div className="h-1 bg-gold" />
      </header>

      <main className="flex-1 flex items-center justify-center py-16 px-5">
        <div className="w-full max-w-2xl">
          <div className="w-14 h-14 rounded-full bg-gold/15 flex items-center justify-center mb-8">
            <Check size={26} className="text-gold" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight">You're in, meneer.</h1>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            One of our doctors will be in touch within 48 hours to schedule your virtual
            consultation. We'll reach out via WhatsApp — keep an eye out.
          </p>

          <div className="mt-12">
            <p className="label-caps mb-6">In the meantime, here's what to expect</p>
            <ol className="relative border-l border-border/70 pl-8 space-y-8">
              {confirmationTimeline.map((e, i) => (
                <li key={e.title} className="relative">
                  <span className="absolute -left-[37px] top-1 flex items-center justify-center w-4 h-4 rounded-full bg-gold ring-4 ring-background" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif text-lg text-foreground">
                      <span className="text-gold/80 mr-3">0{i + 1}</span>
                      {e.title}
                    </h3>
                    <span className="text-sm text-muted-foreground">{e.when}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-12">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground hover:bg-surface transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
