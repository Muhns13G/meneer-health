import { useState } from "react";
import {
  handoffCommandSchema,
  type HandoffCommand,
} from "@/application/operations/handoff-command";
import type { QueueDetail } from "@/application/operations/queue-projection";

const actions = [
  "prepare",
  "retry",
  "begin_delivery",
  "mark_uncertain",
  "reconcile_delivery",
  "acknowledge",
  "review",
  "outcome",
  "cancel_handoff",
  "resolve_exception",
] as const;
export function StaffHandoffControls({
  detail,
  busy,
  submit,
}: {
  detail: QueueDetail;
  busy: boolean;
  submit: (command: HandoffCommand) => void;
}) {
  const [action, setAction] = useState<(typeof actions)[number]>("prepare");
  const [message, setMessage] = useState("");
  const disabled =
    busy ||
    detail.claim !== "yours" ||
    ["onboarding_pending", "cancelled", "provider_outcome_recorded"].includes(detail.state);
  const fields =
    action === "prepare"
      ? ["authorisationId"]
      : action === "retry"
        ? ["attemptId", "authorisationId"]
        : action === "resolve_exception"
          ? ["exceptionId"]
          : [
              "attemptId",
              ...([
                "reconcile_delivery",
                "acknowledge",
                "review",
                "outcome",
                "cancel_handoff",
              ].includes(action)
                ? ["evidenceId"]
                : []),
            ];
  return (
    <section aria-label="Manual hand-off reconciliation" className="mt-6">
      <h3 className="font-serif text-xl">Manual hand-off reconciliation</h3>
      {detail.handoff?.attemptState && (
        <p className="mt-3">Current attempt: {detail.handoff.attemptState.replaceAll("_", " ")}.</p>
      )}
      <p className="mt-3 text-muted-foreground">
        Record only opaque references to independently verified evidence. These controls do not send
        a provider link, generate a protocol or approve treatment. Delivery requires the separately
        approved private channel and deposit gate.
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) return;
          const values = Object.fromEntries(new FormData(event.currentTarget));
          const parsed = handoffCommandSchema.safeParse({
            ...values,
            action,
            caseId: detail.caseId,
            expectedVersion: detail.version,
            requestKey: crypto.randomUUID(),
            ...(action === "cancel_handoff" && !values.evidenceId ? { evidenceId: null } : {}),
          });
          if (!parsed.success) {
            setMessage(
              "Use valid opaque UUID references only. Do not paste links, contacts or clinical information.",
            );
            return;
          }
          if (
            action === "cancel_handoff" &&
            !window.confirm(
              "Cancel this case? Previously delivered information cannot be retracted. Pending or uncertain delivery requires independent cancellation evidence.",
            )
          )
            return;
          setMessage("");
          submit(parsed.data);
        }}
      >
        <label htmlFor="handoff-action">Hand-off action</label>
        <select
          id="handoff-action"
          value={action}
          disabled={disabled}
          className="rounded border border-border bg-surface p-3"
          onChange={(event) => {
            setAction(event.target.value as typeof action);
            setMessage("");
          }}
        >
          {actions.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        {fields.map((field) => (
          <div key={`${action}:${field}`}>
            <label htmlFor={`handoff-${field}`}>{field.replaceAll(/([A-Z])/g, " $1")}</label>
            <input
              id={`handoff-${field}`}
              name={field}
              defaultValue={
                detail.handoff?.[field as "attemptId" | "authorisationId" | "exceptionId"] ?? ""
              }
              required={!(action === "cancel_handoff" && field === "evidenceId")}
              disabled={disabled}
              maxLength={36}
              autoComplete="off"
              spellCheck={false}
              className="mt-2 w-full rounded border border-border bg-surface p-3"
            />
          </div>
        ))}
        <button
          disabled={disabled}
          className="rounded-full border border-border px-5 py-3 disabled:opacity-50"
        >
          Record hand-off command
        </button>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </form>
    </section>
  );
}
