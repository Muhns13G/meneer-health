export function OnboardingSteps({ current }: { current: "account" | "questionnaire" | "payment" }) {
  const steps = [
    ["account", "Your account"],
    ["questionnaire", "Questionnaire"],
    ["payment", "Review deposit"],
  ] as const;
  return (
    <nav aria-label="Onboarding steps" className="my-8">
      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map(([key, label], index) => (
          <li
            key={key}
            aria-current={current === key ? "step" : undefined}
            className={`rounded-xl border px-4 py-3 text-sm ${current === key ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"}`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
