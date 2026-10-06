import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { supportLabels } from "@/domain/support/support";
import {
  notificationReviewReasons,
  staffFollowupViewSchema,
  type StaffFollowupView,
} from "@/domain/support/staff-followup";

const subscribeHydration = () => () => {};
const sessionSchema = z.strictObject({
  role: z.enum(["auditor", "operations", "support", "clinician", "admin"]),
  purpose: z.enum([
    "privacy_review",
    "operations",
    "support",
    "care_delivery",
    "security_administration",
  ]),
  expiresAt: z.iso.datetime({ offset: true }),
});
const buttonClass = "rounded-full border border-border px-5 py-3 disabled:opacity-50";
const deliveryLabels = {
  pending: "Pending dispatch",
  leased: "Dispatch in progress",
  accepted: "Provider accepted; delivery unconfirmed",
  delivered: "Attributed delivery recorded",
  retryable: "Bounded retry pending",
  failed: "Definite failure; review required",
  uncertain: "Uncertain send; independent reconciliation required",
  suppressed: "Suppressed; resend unavailable",
  deferred: "Shared budget exhausted; deferred",
  delivery_failed: "Provider delivery failure; secure follow-up required",
};
const reasonLabels = {
  RECIPIENT_UNAVAILABLE: "Verified recipient unavailable",
  CHANNEL_UNAVAILABLE: "Approved channel unavailable",
  AUTHORITY_CHANGED: "Recipient authority changed",
  CONTACT_CHANGED: "Verified contact changed",
  SUPPRESSED: "Recipient suppressed",
  BUDGET_EXHAUSTED: "Shared daily budget exhausted",
  ATTEMPTS_EXHAUSTED: "Attempt limit reached",
  TRANSPORT_FAILED: "Transport did not accept",
  TRANSPORT_UNCERTAIN: "Transport acceptance uncertain",
};
type Mutation = {
  queue: "case" | "notification";
  reference: string;
  action: "acknowledged" | "resolved" | "resend";
};
export function StaffSupportPage() {
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [view, setView] = useState<StaffFollowupView | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(
    "Sign in with staff MFA, then load your purpose-scoped queues.",
  );
  const active = useRef(true);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
      if (expiry.current) clearTimeout(expiry.current);
      retry.current = null;
    };
  }, []);
  useEffect(() => {
    status.current?.focus();
  }, [message]);
  async function load(mutation?: Mutation) {
    if (busy.current) return;
    busy.current = true;
    controller.current?.abort();
    if (expiry.current) clearTimeout(expiry.current);
    const current = new AbortController();
    controller.current = current;
    setPending(true);
    setView(null);
    setMessage("Checking current staff authority…");
    let confirmed = false;
    try {
      const session = await fetch("/staff/session", {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: current.signal,
      });
      if (!session.ok) throw new Error("denied");
      const authority = sessionSchema.parse(await session.json());
      const deadline = Date.parse(authority.expiresAt);
      if (deadline <= Date.now()) throw new Error("expired");
      if (!active.current || current.signal.aborted) return;
      expiry.current = setTimeout(
        () => {
          current.abort();
          setView(null);
          setMessage("Session expired. Sign in with staff MFA; private queues have been hidden.");
          setPending(false);
          busy.current = false;
          retry.current = null;
        },
        Math.min(deadline - Date.now(), 2_147_483_647),
      );
      const post = (path: string, body: Record<string, string>) =>
        fetch(path, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal: current.signal,
          headers: {
            "Content-Type": "application/json",
            ...(body.requestKey ? { "Idempotency-Key": body.requestKey } : {}),
          },
          body: JSON.stringify(body),
        });
      if (mutation) {
        const signature = JSON.stringify(mutation);
        const key =
          retry.current?.signature === signature ? retry.current.key : crypto.randomUUID();
        retry.current = { signature, key };
        const body = {
          action: mutation.action,
          reference: mutation.reference,
          requestKey: key,
          ...(mutation.queue === "notification"
            ? { reason: notificationReviewReasons[mutation.action] }
            : {}),
        };
        const response = await post(
          mutation.queue === "case" ? "/staff/support/command" : "/staff/support/followup",
          body,
        );
        if (!response.ok || !z.uuid().safeParse(await response.json()).success)
          throw new Error("uncertain");
        confirmed = true;
        retry.current = null;
      }
      const response = await post("/staff/support/followup", { action: "read" });
      if (!response.ok) throw new Error("unavailable");
      const parsed = staffFollowupViewSchema.parse(await response.json());
      if (!active.current || current.signal.aborted || Date.now() >= deadline) return;
      setView(parsed);
      setMessage(
        confirmed
          ? mutation?.action === "resend"
            ? "Retry queued under the existing budget and attempt limit; no email delivery is claimed."
            : "Owner response recorded. Delivery, clinical review and financial outcomes remain separate."
          : "Purpose-scoped queues loaded. Viewing does not acknowledge or resolve an item.",
      );
    } catch {
      if (active.current && !current.signal.aborted) {
        setView(null);
        setMessage(
          confirmed
            ? "Response was recorded, but queues could not be refreshed. Reload before another action."
            : "Queue or response could not be confirmed. Check staff MFA and reload before retrying the same action.",
        );
      }
    } finally {
      if (active.current && controller.current === current) {
        busy.current = false;
        setPending(false);
      }
    }
  }
  return (
    <main className="container-x max-w-4xl py-16">
      <h1 className="font-serif text-4xl">Support and delivery follow-up</h1>
      <p className="mt-4">
        Private purpose-owner work only. No medical answers, contact addresses or payment details
        appear here.
      </p>
      <p className="mt-4">
        Email acceptance and delivery are not human acknowledgement, clinical approval or a refund.
        Use the existing clinical and payment workflows for those decisions.
      </p>
      <p ref={status} tabIndex={-1} role="status" aria-live="polite" className="my-4">
        {message}
      </p>
      <div className="flex flex-wrap gap-4">
        <button className={buttonClass} disabled={!hydrated || pending} onClick={() => void load()}>
          Load support queues
        </button>
        <a href="/staff/sign-in" className="underline">
          Staff sign-in
        </a>
        <a href="/staff/queue" className="underline">
          Assigned operations
        </a>
      </div>
      {view ? (
        <>
          <section className="mt-8" aria-labelledby="support-cases-heading">
            <h2 id="support-cases-heading" className="font-serif text-2xl">
              Support requests
            </h2>
            <p>
              Only your currently authorised purpose and roster are shown. Escalated requests
              require the alternate owner.
            </p>
            {view.cases.length === 0 ? <p>No current assigned support requests.</p> : null}
            <ul className="mt-4 space-y-4">
              {view.cases.map((item) => (
                <li key={item.reference} className="rounded-xl border p-5">
                  <h3>{supportLabels[item.purpose]}</h3>
                  <p>
                    {item.state === "received"
                      ? "Awaiting owner acknowledgement"
                      : item.state === "acknowledged"
                        ? "Acknowledged; follow-up open"
                        : item.state === "escalated"
                          ? "Alternate-owner follow-up required"
                          : "Resolved"}
                  </p>
                  <p>Recorded: {item.recordedAt}</p>
                  {item.canRespond && item.state !== "resolved" ? (
                    <button
                      className={buttonClass}
                      disabled={pending}
                      onClick={() =>
                        void load({
                          queue: "case",
                          reference: item.reference,
                          action: item.state === "acknowledged" ? "resolved" : "acknowledged",
                        })
                      }
                    >
                      {item.state === "acknowledged"
                        ? "Confirm support resolution"
                        : "Acknowledge support request"}
                    </button>
                  ) : (
                    <p>Current owner action unavailable; verify alternate coverage.</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-8" aria-labelledby="delivery-followup-heading">
            <h2 id="delivery-followup-heading" className="font-serif text-2xl">
              Notification follow-up
            </h2>
            <p>
              Up to 20 current items are shown, with failures and deferred work first. Refresh after
              completing review.
            </p>
            <p>
              Resend never removes suppression or resets attempts. Uncertain sends require
              independent evidence of non-acceptance. Resolve only after secure follow-up, not
              merely because an email was accepted.
            </p>
            {view.notifications.length === 0 ? (
              <p>No current assigned notification follow-up.</p>
            ) : null}
            <ul className="mt-4 space-y-4">
              {view.notifications.map((item) => (
                <li key={item.reference} className="rounded-xl border p-5">
                  <h3>{item.template.split("-", 1)[0]} notification</h3>
                  <p>{deliveryLabels[item.state]}</p>
                  {item.reason ? <p>{reasonLabels[item.reason]}</p> : null}
                  <p>
                    {item.reviewState === "unreviewed"
                      ? "Awaiting owner review"
                      : "Owner acknowledged; follow-up open"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      className={buttonClass}
                      disabled={pending}
                      onClick={() =>
                        void load({
                          queue: "notification",
                          reference: item.reference,
                          action: item.reviewState === "unreviewed" ? "acknowledged" : "resolved",
                        })
                      }
                    >
                      {item.reviewState === "unreviewed"
                        ? "Acknowledge delivery review"
                        : "Confirm secure follow-up completed"}
                    </button>
                    {item.canResend ? (
                      <button
                        className={buttonClass}
                        disabled={pending}
                        onClick={() =>
                          void load({
                            queue: "notification",
                            reference: item.reference,
                            action: "resend",
                          })
                        }
                      >
                        Queue confirmed non-acceptance retry
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-8" aria-labelledby="coverage-heading">
            <h2 id="coverage-heading" className="font-serif text-2xl">
              Coverage review
            </h2>
            <p>
              Administrators can review unavailable coverage without seeing client cases or acting
              as clinicians. Restore coverage only through the approved private roster process.
            </p>
            {view.coverage.length === 0 ? (
              <p>No unavailable coverage in your administrator scope.</p>
            ) : null}
            <ul>
              {view.coverage.map((item) => (
                <li key={item.reference ?? item.purpose}>
                  {supportLabels[item.purpose]} — unavailable coverage
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
