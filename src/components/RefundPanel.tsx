import { useEffect, useRef, useState } from "react";
import { refundViewSchema, type RefundView } from "@/domain/payments/refund";

export function RefundPanel({ offerId, staff = false }: { offerId: string; staff?: boolean }) {
  return <RefundContent key={offerId} offerId={offerId} staff={staff} />;
}
function RefundContent({ offerId, staff }: { offerId: string; staff: boolean }) {
  const [view, setView] = useState<RefundView | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("no_review");
  const [evidenceId, setEvidenceId] = useState("");
  const active = useRef<AbortController | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const clear = () => {
      active.current?.abort();
      if (expiry.current) clearTimeout(expiry.current);
      setView(null);
      setConfirmed(false);
      setEvidenceId("");
      setBusy(false);
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      active.current?.abort();
      if (expiry.current) clearTimeout(expiry.current);
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  async function send(command: Record<string, unknown>) {
    active.current?.abort();
    if (expiry.current) clearTimeout(expiry.current);
    const controller = new AbortController();
    active.current = controller;
    setView(null);
    setBusy(true);
    setMessage("Checking refund request…");
    try {
      const response = await fetch(staff ? "/staff/payments/refund" : "/portal/payments/refund", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, ...command }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("REFUND_UNAVAILABLE");
      const result = refundViewSchema.parse(await response.json());
      if (controller.signal.aborted || document.hidden) return;
      const remaining = Date.parse(result.expiresAt) - Date.now();
      if (remaining <= 0) throw new Error("REFUND_EXPIRED");
      setView(result);
      setConfirmed(false);
      setEvidenceId("");
      setMessage("Request evidence checked. A request or submission does not confirm a refund.");
      expiry.current = setTimeout(
        () => {
          controller.abort();
          setView(null);
          setConfirmed(false);
          setEvidenceId("");
          setMessage("Refund view expired. Refresh your session.");
        },
        Math.min(remaining, 2_147_483_647),
      );
    } catch {
      if (!controller.signal.aborted) {
        setView(null);
        setMessage("Refund request unavailable. Check your session or contact support.");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-sm">
        Cancellation and refund requests are reviewed separately from clinical and supply decisions.
      </p>
      <button
        className="mt-3 rounded-full border border-border px-4 py-2"
        disabled={busy}
        onClick={() => void send({ action: "read" })}
      >
        Check cancellation / refund request
      </button>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
      {view && (
        <>
          <p className="mt-3">Request: {view.requestState.replaceAll("_", " ")}</p>
          {staff && (
            <button
              className="mt-3 rounded-full border border-border px-4 py-2"
              disabled={busy}
              onClick={() => void send({ action: "reconcile", requestKey: crypto.randomUUID() })}
            >
              Reconcile verified payment evidence
            </button>
          )}
          {staff && view.exceptions.length > 0 && (
            <ul className="mt-3 text-sm">
              {view.exceptions.map((exception) => (
                <li key={exception.reference}>
                  {exception.code.replaceAll("_", " ")} — {exception.state}
                </li>
              ))}
            </ul>
          )}
          {staff && view.canReplaceDeposit && (
            <button
              className="mt-3 rounded-full border border-border px-4 py-2"
              disabled={busy}
              onClick={() =>
                void send({ action: "replace_deposit", requestKey: crypto.randomUUID() })
              }
            >
              Authorise replacement deposit Checkout
            </button>
          )}
          {view.replacementAuthorised && (
            <p className="mt-3 text-sm">
              Replacement deposit authorised. The client must review and accept the new offer. No
              payment is confirmed.
            </p>
          )}
          {view.disputes.length > 0 && (
            <ul className="mt-3 space-y-3">
              {view.disputes.map((dispute) => (
                <li key={dispute.reference}>
                  Dispute: {dispute.status.replaceAll("_", " ")} —{" "}
                  {dispute.reconciled ? "outcome reconciled" : "review required"}
                  {dispute.status === "lost" && (
                    <p className="text-sm">Lost funds cannot authorise paid progression.</p>
                  )}
                  {staff && !dispute.owned && (
                    <button
                      className="ml-3 rounded-full border border-border px-4 py-2"
                      disabled={busy}
                      onClick={() =>
                        void send({
                          action: "own_dispute",
                          reference: dispute.reference,
                          requestKey: crypto.randomUUID(),
                        })
                      }
                    >
                      Take ownership of dispute review
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!staff && view.requestState === "not_requested" && (
            <form
              className="mt-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (confirmed) void send({ action: "request", requestKey: crypto.randomUUID() });
              }}
            >
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  I want to request cancellation / a refund. This is not confirmation of
                  cancellation or refund.
                </span>
              </label>
              <button
                className="mt-3 rounded-full border border-border px-4 py-2 disabled:opacity-50"
                disabled={!confirmed || busy}
              >
                Submit cancellation / refund request
              </button>
            </form>
          )}
          {staff && (
            <form
              className="mt-3 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send({
                  action: "review",
                  requestKey: crypto.randomUUID(),
                  reason,
                  evidenceId,
                });
              }}
            >
              <label className="block">
                Verified disposition
                <select
                  className="mt-2 block w-full min-w-0 rounded border border-border bg-surface p-2"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                >
                  {[
                    ["no_review", "Review not performed"],
                    ["unsuitable", "Not suitable"],
                    ["expired_decision", "Decision expired"],
                    ["failed_handoff", "Hand-off failed"],
                    ["provider_unavailable", "Provider cannot complete"],
                    ["product_before_release", "Product cancellation before release"],
                    ["no_show", "No-show — exception review"],
                    ["late_cancellation", "Late cancellation — exception review"],
                    ["post_release", "Post-release — exception review"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Verified evidence reference
                <input
                  className="mt-2 block w-full min-w-0 rounded border border-border bg-surface p-2"
                  required
                  value={evidenceId}
                  onChange={(event) => setEvidenceId(event.target.value)}
                  placeholder="Evidence UUID — no clinical narrative"
                />
              </label>
              <p className="text-sm">
                Requires current assigned AAL2 authority and a separate refund grant. No fee or
                forfeiture is inferred.
              </p>
              <button className="rounded-full border border-border px-4 py-2" disabled={busy}>
                Review verified disposition
              </button>
            </form>
          )}
          <ul className="mt-3 space-y-3">
            {view.refunds.map((refund) => (
              <li key={refund.reference}>
                R{(refund.amountMinor / 100).toFixed(2)} — refund{" "}
                {refund.state.replaceAll("_", " ")}
                {staff && refund.state === "failed_verified" && (
                  <button
                    className="ml-3 rounded-full border border-border px-4 py-2"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "retry",
                        refundId: refund.reference,
                        requestKey: crypto.randomUUID(),
                      })
                    }
                  >
                    Queue retry after verified failure
                  </button>
                )}
                {staff && refund.state === "queued" && (
                  <button
                    className="ml-3 rounded-full border border-border px-4 py-2"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        action: "dispatch",
                        refundId: refund.reference,
                        requestKey: crypto.randomUUID(),
                      })
                    }
                  >
                    Submit original-method sandbox refund
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
