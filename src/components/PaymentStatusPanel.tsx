import { useEffect, useRef, useState } from "react";
import { paymentStatusPageSchema, type PaymentStatusPage } from "@/domain/payments/payment-status";
import { RefundPanel } from "./RefundPanel";

const labels = {
  not_started: "Checkout not started",
  pending: "Awaiting payment confirmation",
  confirmed: "Payment confirmed",
  not_required: "No additional payment required",
  failed: "Payment failed",
  expired: "Checkout expired",
};
const money = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });

export function PaymentStatusPanel({ caseId }: { caseId?: string }) {
  return <PaymentStatusContent key={caseId ?? "own-payments"} caseId={caseId} />;
}
function PaymentStatusContent({ caseId }: { caseId?: string }) {
  const [page, setPage] = useState<PaymentStatusPage | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (expiry.current) clearTimeout(expiry.current);
    expiry.current = null;
  };
  useEffect(() => {
    const clear = () => {
      active.current?.abort();
      clearTimer();
      setPage(null);
      setBusy(false);
    };
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      active.current?.abort();
      clearTimer();
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [caseId]);
  async function load(cursor: PaymentStatusPage["nextCursor"] = null) {
    active.current?.abort();
    clearTimer();
    const controller = new AbortController();
    active.current = controller;
    setPage(null);
    setBusy(true);
    setMessage("Checking payment evidence…");
    try {
      const response = await fetch(caseId ? "/staff/payments/read" : "/portal/payments/read", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursor, ...(caseId ? { caseId } : {}) }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("PAYMENT_STATUS_UNAVAILABLE");
      const result = paymentStatusPageSchema.parse(await response.json());
      if (controller.signal.aborted || document.hidden) return;
      const remaining = Date.parse(result.expiresAt) - Date.now();
      if (remaining <= 0) throw new Error("PAYMENT_STATUS_EXPIRED");
      setPage(result);
      setMessage(
        result.payments.length ? "Payment evidence checked." : "No payment records available.",
      );
      expiry.current = setTimeout(
        () => {
          active.current?.abort();
          setPage(null);
          setMessage("Payment view expired. Check your session and refresh.");
        },
        Math.min(remaining, 2_147_483_647),
      );
    } catch {
      if (!controller.signal.aborted) {
        setPage(null);
        setMessage("Payment status is unavailable. Check your session or contact support.");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section
      className="mt-10 rounded-xl border border-border bg-surface p-5"
      aria-label="Payment status"
    >
      <h2 className="font-serif text-2xl">Payment status</h2>
      <p className="mt-3 text-muted-foreground">
        These are payment facts only. They do not confirm clinical approval, a prescription,
        dispensing or delivery. A checkout or return from payment is not proof of payment.
      </p>
      <button
        className="mt-4 rounded-full border border-border px-5 py-3 disabled:opacity-50"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy ? "Checking…" : "Refresh payment status"}
      </button>
      {message && (
        <p role="status" aria-live="polite" className="mt-3">
          {message}
        </p>
      )}
      {page && (
        <>
          <ul className="mt-4 space-y-4">
            {page.payments.map((payment) => (
              <li key={payment.reference} className="rounded-lg border border-border p-4">
                <h3 className="font-medium">
                  {payment.scenario === "review_deposit"
                    ? "Review deposit"
                    : "Approved product order"}
                </h3>
                <p>
                  {money.format(payment.amountTotalMinor / 100)} — {labels[payment.status]}
                </p>
                {payment.refundedMinor > 0 && (
                  <p>Refund evidence received: {money.format(payment.refundedMinor / 100)}</p>
                )}
                {payment.dispute && <p>Dispute evidence received — staff review required.</p>}
                {payment.requiresReview && (
                  <p>Reconciliation review required. Contact support before repeating payment.</p>
                )}
                <RefundPanel offerId={payment.reference} staff={caseId !== undefined} />
              </li>
            ))}
          </ul>
          {page.nextCursor && (
            <button
              className="mt-4 rounded-full border border-border px-5 py-3"
              onClick={() => void load(page.nextCursor)}
            >
              Next payment records
            </button>
          )}
        </>
      )}
    </section>
  );
}
