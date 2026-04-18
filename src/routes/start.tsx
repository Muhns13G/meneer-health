import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start your private consult — Meneer" },
      { name: "description", content: "A few private questions. A real doctor. Treatment at your door." },
    ],
  }),
  component: StartFlow,
});

type Condition = "hair" | "ed" | "weight" | "trt";

const conditions: { id: Condition; label: string; body: string }[] = [
  { id: "hair", label: "Hair Loss", body: "Slow loss and regrow with finasteride and minoxidil protocols." },
  { id: "ed", label: "Erectile Dysfunction", body: "PDE5 inhibitors prescribed and dosed for you, discreetly." },
  { id: "weight", label: "Weight Management", body: "Medical-grade weight loss support, doctor-led plans." },
  { id: "trt", label: "Testosterone / TRT", body: "Full bloodwork and TRT with proper monitoring." },
];

const questions: { q: string; options: string[] }[] = [
  {
    q: "How would you rate your energy levels on a typical day?",
    options: ["Firing on all cylinders", "Good, but I crash in the afternoons", "Running on empty most days", "Can barely get through the day"],
  },
  {
    q: "How well are you sleeping?",
    options: ["Well — I wake up rested", "Okay but still feel tired", "I struggle to fall or stay asleep", "Seriously affecting my life"],
  },
  {
    q: "Have you noticed changes in your body in the last 12 months?",
    options: ["No real changes", "Gaining weight despite training", "Losing muscle or strength", "Hair thinning or receding", "More than one of these"],
  },
  {
    q: "How would you describe your drive and motivation right now?",
    options: ["High — motivated and focused", "Not what it used to be", "Low — I struggle to feel motivated", "A real drop in all areas"],
  },
  {
    q: "If you could fix one thing about your health right now, what would it be?",
    options: ["More energy and less fatigue", "Better performance in the bedroom", "Stop losing my hair", "Lose weight and get in shape", "Sleep better and recover faster", "Just feel like myself again"],
  },
];

function StartFlow() {
  // step: 0 = condition, 1..5 = questions, 6 = account, 7 = done
  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [answers, setAnswers] = useState<(string | null)[]>(Array(questions.length).fill(null));
  const [account, setAccount] = useState({ firstName: "", email: "", whatsapp: "", password: "" });

  const totalSteps = 1 + questions.length + 1; // condition + Qs + account (internal step count)
  // Display progress as 4 logical phases: condition → intake → eligibility → account
  const phaseLabels = ["Choose condition", "Intake questions", "Eligibility check", "Create account"];
  const currentPhase = step === 0 ? 0 : step <= questions.length ? 1 : step === totalSteps - 1 ? 3 : 2;
  const currentProgress = step >= totalSteps ? 100 : Math.round(((step + 1) / totalSteps) * 100);

  const setAnswer = (idx: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const canNext = useMemo(() => {
    if (step === 0) return !!condition;
    if (step >= 1 && step <= questions.length) return !!answers[step - 1];
    if (step === totalSteps - 1) {
      return account.firstName.trim() && account.email.includes("@") && account.whatsapp.length >= 7 && account.password.length >= 6;
    }
    return false;
  }, [step, condition, answers, account, totalSteps]);

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
            Step {currentPhase + 1} of 4 · {phaseLabels[currentPhase]}
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
          {step === 0 && (
            <ConditionStep
              condition={condition}
              onSelect={setCondition}
            />
          )}

          {step >= 1 && step <= questions.length && (
            <QuestionStep
              index={step - 1}
              q={questions[step - 1]}
              answer={answers[step - 1]}
              onSelect={(v) => setAnswer(step - 1, v)}
            />
          )}

          {step === totalSteps - 1 && (
            <AccountStep account={account} setAccount={setAccount} />
          )}

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
              {step === totalSteps - 1 ? "Create account" : "Continue"}
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
                selected
                  ? "border-gold bg-gold/5"
                  : "border-border bg-surface hover:border-gold/50"
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

function QuestionStep({
  index,
  q,
  answer,
  onSelect,
}: {
  index: number;
  q: { q: string; options: string[] };
  answer: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <p className="label-caps">Question 0{index + 1}</p>
      <h1 className="mt-4 font-serif text-2xl sm:text-3xl leading-tight">{q.q}</h1>

      <div className="mt-8 grid gap-3">
        {q.options.map((opt) => {
          const selected = answer === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`text-left px-5 py-4 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                selected
                  ? "border-gold bg-gold/5 text-foreground"
                  : "border-border bg-surface hover:border-gold/50 text-foreground"
              }`}
            >
              <span>{opt}</span>
              {selected && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                  <Check size={12} className="text-primary-foreground" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AccountStep({
  account,
  setAccount,
}: {
  account: { firstName: string; email: string; whatsapp: string; password: string };
  setAccount: React.Dispatch<React.SetStateAction<{ firstName: string; email: string; whatsapp: string; password: string }>>;
}) {
  const inputCls =
    "w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold transition-colors";

  return (
    <div>
      <p className="label-caps">Almost there</p>
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

const confirmationTimeline = [
  { title: "Doctor reaches out via WhatsApp", when: "Within 48h" },
  { title: "Virtual consultation (video or phone)", when: "15–20 minutes" },
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
            One of our doctors will be in touch within 48 hours to schedule your
            virtual consultation. We'll reach out via WhatsApp — keep an eye out.
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
