import { useState } from "react";
import { destinationApprovalSchema } from "@/application/operations/handoff-boundary";
import { z } from "zod";

export function StaffDestinationApprovalPanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="mt-8" aria-label="Approve configured private intake destination">
      <h2 className="font-serif text-2xl">Approve configured private intake destination</h2>
      <p className="mt-3">
        Only approve after independently reviewing the configured patient-intake destination,
        recipient and privacy notice. This approves its current server-configured digest/version for
        30 days, not treatment or pilot activation. No URL is entered here.
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          const value = destinationApprovalSchema.safeParse({
            ...Object.fromEntries(new FormData(event.currentTarget)),
            requestKey: crypto.randomUUID(),
          });
          if (!value.success) {
            setMessage("Use an opaque approval UUID reference.");
            return;
          }
          if (
            !window.confirm(
              "Approve the independently reviewed, server-configured recipient destination for 30 days?",
            )
          )
            return;
          setBusy(true);
          try {
            const response = await fetch("/staff/queue/destination", {
              method: "POST",
              cache: "no-store",
              credentials: "same-origin",
              redirect: "error",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(value.data),
            });
            if (
              !response.ok ||
              !z
                .object({ destinationId: z.uuid() })
                .strict()
                .safeParse(await response.json()).success
            )
              throw new Error("APPROVAL_UNCONFIRMED");
            setMessage(
              "Configured destination approval recorded. Delivery still requires client authorisation and payment readiness.",
            );
          } catch {
            setMessage(
              "Approval could not be confirmed. Check your security-administration session and configuration before retrying.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="destination-approval">Independent approval reference</label>
        <input
          id="destination-approval"
          name="approvalReference"
          required
          maxLength={36}
          autoComplete="off"
          disabled={busy}
          className="rounded border border-border bg-surface p-3"
        />
        <button
          disabled={busy}
          className="rounded-full border border-border px-5 py-3 disabled:opacity-50"
        >
          Approve configured destination
        </button>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </form>
    </section>
  );
}
