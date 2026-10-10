import { useEffect, useRef, useState } from "react";
import { PaymentStatusPanel } from "./PaymentStatusPanel";
import { StaffProductQuotePanel } from "./StaffProductQuotePanel";
import { StaffHandoffControls } from "./StaffHandoffControls";
import { StaffHandoffEvidencePanel } from "./StaffHandoffEvidencePanel";
import { handoffResultSchema, type HandoffCommand } from "@/application/operations/handoff-command";
import { operationsStateSchema, operationsExceptionCodeSchema } from "../../contracts/operations";
import {
  queueCommandResultSchema,
  type QueueCommand,
} from "@/application/operations/queue-command";
import {
  queuePageSchema,
  queueDetailSchema,
  type QueuePage,
  type QueueDetail,
  type QueueFilter,
} from "@/application/operations/queue-projection";

const labels = Object.fromEntries(
  operationsStateSchema.options.map((state) => [state, state.replaceAll("_", " ")]),
);
const buttonClass = "rounded-full border border-border px-5 py-3 disabled:opacity-50";
function failure(status: number) {
  if (status === 401) return "Sign in with staff MFA to view assigned cases.";
  if (status === 403)
    return "Access is unavailable. Check your session and assigned operations scope.";
  if (status === 429) return "Too many requests. Wait before retrying.";
  if (status === 409)
    return "The case changed or is already claimed. Refresh before taking another action.";
  if (status === 412)
    return "Readiness or delivery reconciliation is incomplete. No state change was made.";
  return "The queue is temporarily unavailable. No case information is displayed.";
}

export function StaffQueuePage() {
  const [state, setState] = useState<QueueFilter["state"]>(null);
  const [page, setPage] = useState<QueuePage | null>(null);
  const [detail, setDetail] = useState<QueueDetail | null>(null);
  const [message, setMessage] = useState("Loading assigned cases…");
  const [busy, setBusy] = useState(false);
  const [exceptionCode, setExceptionCode] = useState(operationsExceptionCodeSchema.options[0]);
  const requestRef = useRef<AbortController | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const sequence = useRef(0);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(
    filter: QueueFilter,
    caseId?: string,
    command?: QueueCommand | HandoffCommand,
  ) {
    requestRef.current?.abort();
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const controller = new AbortController();
    requestRef.current = controller;
    const current = ++sequence.current;
    setBusy(true);
    setDetail(null);
    // Drop all prior private data before every read, including denial/expiry paths.
    setPage(null);
    setMessage(caseId ? "Loading assigned case…" : "Loading assigned cases…");
    try {
      if (command) {
        const handoff = !["claim", "release", "mark_ready", "cancel", "record_exception"].includes(
          command.action,
        );
        const mutation = await fetch(handoff ? "/staff/queue/handoff" : "/staff/queue/command", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(
            Object.entries(command).map(([key, value]) => [
              key,
              value === null ? "" : String(value),
            ]),
          ),
        });
        if (current !== sequence.current) return;
        if (!mutation.ok) {
          setMessage(failure(mutation.status));
          return;
        }
        const result = (handoff ? handoffResultSchema : queueCommandResultSchema).parse(
          await mutation.json(),
        );
        if (result.caseId !== command.caseId) throw new Error("Unexpected command result");
        // Re-read live state after the mutation; never treat a replay receipt as current authority.
      }
      const response = await fetch(caseId ? "/staff/queue/detail" : "/staff/queue/read", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(
          caseId
            ? { caseId }
            : {
                state: filter.state ?? "",
                afterCreatedAt: filter.cursor?.createdAt ?? "",
                afterId: filter.cursor?.id ?? "",
              },
        ),
      });
      if (current !== sequence.current) return;
      if (!response.ok) {
        setMessage(failure(response.status));
        return;
      }
      const value: unknown = await response.json();
      if (current !== sequence.current) return;
      const deadline = Date.parse(response.headers.get("X-Session-Expires-At") ?? "");
      if (Number.isFinite(deadline) && deadline <= Date.now()) {
        setMessage(failure(401));
        return;
      }
      expiryTimer.current = setTimeout(
        () => {
          ++sequence.current;
          requestRef.current?.abort();
          setPage(null);
          setDetail(null);
          setBusy(false);
          setMessage(failure(401));
        },
        Number.isFinite(deadline) ? Math.min(deadline - Date.now(), 900_000) : 900_000,
      );
      if (caseId) {
        const parsed = queueDetailSchema.parse(value);
        if (parsed.caseId !== caseId) throw new Error("Unexpected case");
        setDetail(parsed);
        setMessage("Assigned case loaded. Contacts remain masked.");
      } else {
        const parsed = queuePageSchema.parse(value);
        setPage(parsed);
        setMessage(
          parsed.cases.length
            ? `${parsed.cases.length} assigned cases on this page.`
            : "No assigned cases match this filter.",
        );
      }
    } catch {
      if (current === sequence.current && !controller.signal.aborted)
        setMessage(
          command
            ? "Command result uncertain. Refresh the assigned queue before retrying. No automatic retry was sent."
            : failure(503),
        );
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load({ state: null, cursor: null });
    return () => {
      requestRef.current?.abort();
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!busy) {
      if (detail) detailHeading.current?.focus();
      else status.current?.focus();
    }
  }, [busy, detail, message]);

  return (
    <main className="container-x max-w-5xl py-16">
      <h1 className="font-serif text-4xl">Assigned operations queue</h1>
      <p className="mt-4 text-muted-foreground">
        Only your current assigned cases are shown. Case state is not clinical approval or payment
        clearance.
      </p>
      <a href="/staff/sign-in" className="mt-4 inline-block underline">
        Staff session and sign-out
      </a>
      <a href="/staff/mobile-invitations" className="ml-5 inline-block underline">
        Mobile pilot invitations
      </a>
      <a href="/staff/support" className="ml-5 inline-block underline">
        Support and delivery follow-up
      </a>
      <form
        className="mt-8 flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void load({ state, cursor: null });
        }}
      >
        <div>
          <label htmlFor="queue-state" className="block">
            Operational state
          </label>
          <select
            id="queue-state"
            value={state ?? ""}
            disabled={busy}
            className="mt-2 rounded border border-border bg-surface p-3"
            onChange={(event) => {
              setState(event.target.value ? operationsStateSchema.parse(event.target.value) : null);
              setPage(null);
              setDetail(null);
              setMessage("Apply the filter to load assigned cases.");
            }}
          >
            <option value="">All assigned states</option>
            {operationsStateSchema.options.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </div>
        <button className={buttonClass} disabled={busy} type="submit">
          Apply filter / refresh
        </button>
      </form>
      <p ref={status} tabIndex={-1} role="status" aria-live="polite" className="mt-6">
        {message}
      </p>
      {page && (
        <section aria-label="Assigned cases" className="mt-6" aria-busy={busy}>
          <div
            role="region"
            aria-label="Assigned cases table"
            tabIndex={0}
            className="overflow-x-auto"
          >
            <table className="w-full text-left">
              <caption className="sr-only">
                Assigned cases, oldest first. Maximum 25 per page.
              </caption>
              <thead>
                <tr>
                  {[
                    "Case reference",
                    "State",
                    "Assigned owner",
                    "Created",
                    "Facts",
                    "Exception",
                    "Details",
                  ].map((label) => (
                    <th className="p-3" scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.cases.map((item) => (
                  <tr key={item.caseId} className="border-t border-border">
                    <th scope="row" className="p-3 font-mono text-xs break-all">
                      {item.caseId}
                    </th>
                    <td className="p-3">{labels[item.state]}</td>
                    <td className="p-3">You</td>
                    <td className="p-3">
                      <time dateTime={item.createdAt}>{item.createdAt}</time>
                    </td>
                    <td className="p-3">
                      Profile {item.profileActive ? "active" : "not active"}; email{" "}
                      {item.emailVerified ? "verified" : "not verified"}
                    </td>
                    <td className="p-3">
                      {item.exceptionCode?.replaceAll("_", " ") ?? "None recorded"}
                    </td>
                    <td className="p-3">
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => void load({ state, cursor: null }, item.caseId)}
                        aria-label={`View case ${item.caseId}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {page.nextCursor && (
            <button
              className={`${buttonClass} mt-6`}
              disabled={busy}
              onClick={() => void load({ state, cursor: page.nextCursor })}
            >
              Next page
            </button>
          )}
        </section>
      )}
      {detail && (
        <section
          aria-label="Assigned case detail"
          className="mt-8 rounded border border-border p-6"
        >
          <h2 ref={detailHeading} tabIndex={-1} className="break-all font-serif text-2xl">
            Case {detail.caseId}
          </h2>
          <details className="mt-5">
            <summary className="action-secondary cursor-pointer">Product quote preparation</summary>
            <StaffProductQuotePanel key={detail.caseId} caseId={detail.caseId} />
          </details>
          <p className="mt-3">
            State: {labels[detail.state]}. Record version: {detail.version}.
          </p>
          <p>
            Created: {detail.createdAt}. Updated: {detail.updatedAt}.
          </p>
          {detail.profile ? (
            <dl className="mt-4 grid gap-2">
              <dt>Name</dt>
              <dd>
                {[detail.profile.givenName, detail.profile.familyName].filter(Boolean).join(" ") ||
                  "Not retained"}
              </dd>
              <dt>Account status</dt>
              <dd>{detail.profile.status.replaceAll("_", " ")}</dd>
              <dt>Email</dt>
              <dd>{detail.profile.maskedEmail ?? "Not verified"}</dd>
              <dt>Mobile</dt>
              <dd>
                {detail.profile.maskedMobile ?? "Not retained"} (
                {detail.profile.mobileVerificationStatus})
              </dd>
              <dt>Contact preference</dt>
              <dd>{detail.profile.contactPreference}</dd>
            </dl>
          ) : (
            <p className="mt-4">No client profile has been activated.</p>
          )}
          <p className="mt-5">
            Reservation: {detail.claim}. Payment:{" "}
            {detail.readiness.paymentReadiness.replaceAll("_", " ")}. Recipient:{" "}
            {detail.readiness.recipientReadiness.replaceAll("_", " ")}. A claim is not clinical
            approval, payment clearance or permission to send contact data.
          </p>
          <dl className="mt-4 grid gap-2">
            {Object.entries(detail.readiness)
              .filter(([key]) => !["paymentReadiness", "recipientReadiness", "ready"].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replaceAll(/([A-Z])/g, " $1")}</dt>
                  <dd>{value ? "Confirmed" : "Not confirmed"}</dd>
                </div>
              ))}
          </dl>
          {!["cancelled", "provider_outcome_recorded"].includes(detail.state) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {detail.claim === "unclaimed" && (
                <button
                  className={buttonClass}
                  disabled={busy}
                  onClick={() =>
                    void load({ state, cursor: null }, detail.caseId, {
                      action: "claim",
                      caseId: detail.caseId,
                      expectedVersion: detail.version,
                      requestKey: crypto.randomUUID(),
                    })
                  }
                >
                  Claim case
                </button>
              )}
              {detail.claim === "yours" && (
                <>
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() =>
                      void load({ state, cursor: null }, detail.caseId, {
                        action: "release",
                        caseId: detail.caseId,
                        expectedVersion: detail.version,
                        requestKey: crypto.randomUUID(),
                      })
                    }
                  >
                    Release claim
                  </button>
                  <button
                    className={buttonClass}
                    disabled={busy || !detail.readiness.ready}
                    title="Requires approved recipient and authoritative deposit ledger"
                    onClick={() =>
                      void load({ state, cursor: null }, detail.caseId, {
                        action: "mark_ready",
                        caseId: detail.caseId,
                        expectedVersion: detail.version,
                        requestKey: crypto.randomUUID(),
                      })
                    }
                  >
                    Mark ready for hand-off
                  </button>
                </>
              )}
            </div>
          )}
          {detail.claim === "yours" &&
            !["cancelled", "provider_outcome_recorded"].includes(detail.state) && (
              <form
                className="mt-6 flex flex-wrap gap-3 items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  void load({ state, cursor: null }, detail.caseId, {
                    action: "record_exception",
                    caseId: detail.caseId,
                    expectedVersion: detail.version,
                    requestKey: crypto.randomUUID(),
                    code: exceptionCode,
                  });
                }}
              >
                <div>
                  <label htmlFor="queue-exception" className="block">
                    Pause reason
                  </label>
                  <select
                    id="queue-exception"
                    className="mt-2 rounded border border-border bg-surface p-3"
                    value={exceptionCode}
                    disabled={busy || detail.state === "handoff_exception"}
                    onChange={(event) =>
                      setExceptionCode(operationsExceptionCodeSchema.parse(event.target.value))
                    }
                  >
                    {operationsExceptionCodeSchema.options.map((code) => (
                      <option key={code} value={code}>
                        {code.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className={buttonClass}
                  disabled={busy || detail.state === "handoff_exception"}
                >
                  Pause with coded exception
                </button>
                {["onboarding_pending", "ready_for_handoff", "handoff_exception"].includes(
                  detail.state,
                ) && (
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Cancel this case? Any existing external delivery still requires reconciliation.",
                        )
                      )
                        void load({ state, cursor: null }, detail.caseId, {
                          action: "cancel",
                          caseId: detail.caseId,
                          expectedVersion: detail.version,
                          requestKey: crypto.randomUUID(),
                        });
                    }}
                  >
                    Cancel case
                  </button>
                )}
              </form>
            )}
          {detail.claim === "yours" && (
            <StaffHandoffControls
              key={`${detail.caseId}:${detail.version}`}
              detail={detail}
              busy={busy}
              submit={(command) => void load({ state, cursor: null }, detail.caseId, command)}
            />
          )}
          <StaffHandoffEvidencePanel
            key={`evidence:${detail.caseId}:${detail.version}`}
            detail={detail}
            onInvalidate={() => void load({ state, cursor: null }, detail.caseId)}
          />
          <PaymentStatusPanel
            key={`payments:${detail.caseId}:${detail.version}`}
            caseId={detail.caseId}
          />
          <button
            className={`${buttonClass} mt-6`}
            onClick={() => void load({ state, cursor: null })}
          >
            Back to assigned queue
          </button>
        </section>
      )}
    </main>
  );
}
