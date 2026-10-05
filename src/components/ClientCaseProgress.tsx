import type { ClientCaseProjection } from "@/domain/identity/patient-portal";

const labels = {
  waiting: ["Waiting", "Your administrative case is waiting to progress."],
  action_required: [
    "Action required",
    "An administrative action is needed. Contact support if you need help.",
  ],
  handoff_pending: ["Hand-off pending", "Your administrative hand-off has not yet been recorded."],
  handoff_recorded: [
    "Hand-off recorded",
    "An administrative hand-off is recorded. This does not confirm a consultation or clinical decision.",
  ],
  paused: ["Paused", "Administrative processing is paused. Contact support if you need help."],
  completed: [
    "Completed",
    "Administrative processing for this case is closed. This does not confirm treatment, payment or delivery.",
  ],
} as const;
const dateFormat = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

export function ClientCaseProgress({ cases }: { cases: ClientCaseProjection[] }) {
  return (
    <section className="mt-10" aria-labelledby="case-progress">
      <h2 id="case-progress" className="font-serif text-2xl text-foreground">
        Your case progress
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        These statuses describe administrative processing only, not clinical approval, payment or
        delivery.
      </p>
      {cases.length === 0 ? (
        <p className="mt-4 text-foreground">
          No administrative case has been started for this account.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {cases.map((item) => (
            <li key={item.reference} className="rounded-xl border border-border p-5">
              <p className="break-all text-sm text-muted-foreground">Reference: {item.reference}</p>
              <h3 className="mt-3 font-serif text-xl text-foreground">{labels[item.status][0]}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{labels[item.status][1]}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Updated {dateFormat.format(new Date(item.updatedAt))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
