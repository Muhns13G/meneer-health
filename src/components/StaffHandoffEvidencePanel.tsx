import { useEffect, useRef, useState } from "react";
import {
  evidenceKindSchema,
  handoffEvidenceCommandSchema,
  evidenceResultSchema,
} from "@/application/operations/handoff-boundary";
import type { QueueDetail } from "@/application/operations/queue-projection";

export function StaffHandoffEvidencePanel({
  detail,
  onInvalidate,
}: {
  detail: QueueDetail;
  onInvalidate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const status = useRef<HTMLParagraphElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!busy && message) status.current?.focus();
  }, [busy, message]);
  const disabled =
    busy ||
    !detail.handoff?.attemptId ||
    detail.claim === "yours" ||
    ["cancelled", "provider_outcome_recorded"].includes(detail.state);
  return (
    <section className="mt-6" aria-label="Independent provider record verification">
      <h3 className="font-serif text-xl">Independent provider record verification</h3>
      <p className="mt-3 text-muted-foreground">
        A second assigned staff member must check the actual provider record, not dashboard totals.
        Use opaque record references only; no links, names, questionnaire answers or protocol
        content. You cannot verify your own delivery.
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (disabled) return;
          const parsed = handoffEvidenceCommandSchema.safeParse({
            ...Object.fromEntries(new FormData(event.currentTarget)),
            caseId: detail.caseId,
            attemptId: detail.handoff?.attemptId,
            requestKey: crypto.randomUUID(),
          });
          if (!parsed.success) {
            setMessage("Use valid opaque UUID references and an ISO date/time only.");
            return;
          }
          setBusy(true);
          setMessage("Checking inspected record evidence…");
          const current = new AbortController();
          controller.current = current;
          try {
            const result = await fetch("/staff/queue/evidence", {
              method: "POST",
              credentials: "same-origin",
              cache: "no-store",
              redirect: "error",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(parsed.data),
              signal: current.signal,
            });
            if (current.signal.aborted) return;
            if (!result.ok) {
              onInvalidate();
              return;
            }
            const value = evidenceResultSchema.parse(await result.json());
            if (current.signal.aborted) return;
            setMessage(
              `Verified evidence reference: ${value.evidenceId}. Give this reference to the case claimant for reconciliation.`,
            );
          } catch {
            if (!current.signal.aborted) onInvalidate();
          } finally {
            if (!current.signal.aborted) setBusy(false);
          }
        }}
      >
        <label htmlFor="evidence-kind">Observed administrative state</label>
        <select
          id="evidence-kind"
          name="kind"
          disabled={disabled}
          className="rounded border border-border bg-surface p-3"
        >
          {evidenceKindSchema.options.map((kind) => (
            <option key={kind} value={kind}>
              {kind.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        {[
          ["externalReference", "Opaque external record reference"],
          ["sourceReference", "Opaque observation reference"],
          ["observedAt", "Observed at (ISO date/time with timezone)"],
        ].map(([name, label]) => (
          <div key={name}>
            <label htmlFor={`evidence-${name}`}>{label}</label>
            <input
              id={`evidence-${name}`}
              name={name}
              required
              disabled={disabled}
              maxLength={name === "observedAt" ? 35 : 36}
              autoComplete="off"
              className="mt-2 w-full rounded border border-border bg-surface p-3"
            />
          </div>
        ))}
        <button
          disabled={disabled}
          className="rounded-full border border-border px-5 py-3 disabled:opacity-50"
        >
          Verify inspected record
        </button>
        <p ref={status} tabIndex={-1} role="status" aria-live="polite" className="break-all">
          {message}
        </p>
      </form>
    </section>
  );
}
