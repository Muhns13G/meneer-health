import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { OnboardingSteps } from "./OnboardingSteps";
import { PaymentStatusPanel } from "./PaymentStatusPanel";
import type { PaymentStatusPage } from "@/domain/payments/payment-status";
import {
  orderReviewResultSchema,
  checkoutResultSchema,
  type OrderReview,
} from "@/domain/payments/order-review";
const money = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
const amount = (minor: number) => money.format(minor / 100);
export function OrderReviewPage() {
  const [review, setReview] = useState<OrderReview | null>(null);
  const [status, setStatus] = useState("Loading your order…");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState<PaymentStatusPage | null>(null);
  const payment = payments?.payments.find((item) => item.reference === review?.offerId);
  const paymentChecked = payments !== null && Date.parse(payments.expiresAt) > Date.now();
  const paymentComplete = payment?.status === "confirmed" || payment?.status === "not_required";
  const paymentNeedsReview =
    payment?.requiresReview || payment?.dispute || (payment?.refundedMinor ?? 0) > 0;
  const paymentBlocked =
    !paymentChecked ||
    payments.nextCursor !== null ||
    paymentComplete ||
    payment?.status === "pending" ||
    payment?.requiresReview ||
    payment?.dispute ||
    (payment?.refundedMinor ?? 0) > 0;
  const resultRef = useRef<HTMLParagraphElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (paymentComplete && !paymentNeedsReview) confirmationRef.current?.focus();
    else if (!busy && status) resultRef.current?.focus();
  }, [busy, status, paymentComplete, paymentNeedsReview]);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const acceptKey = useRef<string | null>(null);
  const checkoutKey = useRef<{ offerId: string; key: string } | null>(null);
  const declineKey = useRef<{ offerId: string; key: string } | null>(null);
  async function decline(view: OrderReview) {
    if (
      busy ||
      view.scenario !== "approved_product_order" ||
      paymentComplete ||
      payment?.status === "pending" ||
      paymentNeedsReview
    )
      return;
    const seq = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    if (declineKey.current?.offerId !== view.offerId)
      declineKey.current = { offerId: view.offerId, key: crypto.randomUUID() };
    setBusy(true);
    setStatus("Checking quote decline…");
    try {
      const r = await fetch("/portal/order/command", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: abort.signal,
        headers: { "Content-Type": "application/json", "Idempotency-Key": declineKey.current.key },
        body: JSON.stringify({
          action: "decline",
          offerId: view.offerId,
          snapshotHash: view.snapshotHash,
          requestKey: declineKey.current.key,
        }),
      });
      if (!r.ok) throw new Error("DECLINE_UNCERTAIN");
      const result = orderReviewResultSchema.parse(await r.json());
      if (seq !== sequence.current) return;
      if (result.quoteOutcome !== "declined" || result.review !== null)
        throw new Error("DECLINE_UNCERTAIN");
      setReview(null);
      setAccepted(false);
      setStatus(
        "Product quote declined. No new payment or refund was created. Contact the team for a revised quote.",
      );
    } catch {
      if (seq === sequence.current) {
        setReview(null);
        setAccepted(false);
        setStatus(
          "Decline could not be confirmed. Reload before acting; an existing Checkout may need staff reconciliation.",
        );
      }
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  async function checkout(view: OrderReview) {
    if (!view.acceptance || !view.checkoutEnabled || busy || paymentBlocked) return;
    const current = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    if (checkoutKey.current?.offerId !== view.offerId)
      checkoutKey.current = { offerId: view.offerId, key: crypto.randomUUID() };
    const key = checkoutKey.current.key;
    setBusy(true);
    setStatus("Preparing secure Checkout…");
    try {
      const response = await fetch("/portal/order/command", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: abort.signal,
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ action: "checkout", offerId: view.offerId, requestKey: key }),
      });
      if (!response.ok) throw new Error("CHECKOUT_UNAVAILABLE");
      const result = checkoutResultSchema.parse(await response.json());
      if (current !== sequence.current || Date.parse(view.expiresAt) <= Date.now()) return;
      window.location.assign(result.checkoutUrl);
    } catch {
      if (current === sequence.current && !abort.signal.aborted)
        setStatus("Checkout is not confirmed. Reload your order before trying again.");
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  const send = useCallback(async (acceptReview?: OrderReview) => {
    const accept = acceptReview !== undefined;
    const current = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setStatus(accept ? "Checking…" : "Loading your order…");
    const key = accept ? (acceptKey.current ??= crypto.randomUUID()) : crypto.randomUUID();
    const body = acceptReview
      ? {
          action: "accept",
          offerId: acceptReview.offerId,
          publicationId: acceptReview.terms.publicationId,
          snapshotHash: acceptReview.snapshotHash,
          contentHash: acceptReview.terms.contentHash,
          requestKey: key,
          accepted: true,
        }
      : { action: "read" };
    try {
      const response = await fetch("/portal/order/command", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: abort.signal,
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session has ended. Sign in again."
            : response.status === 409
              ? "This order has changed. Reload and review it again."
              : "Your order is not available. Please try again later.",
        );
      const result = orderReviewResultSchema.parse(await response.json());
      if (current !== sequence.current) return;
      if (result.review && Date.parse(result.review.expiresAt) <= Date.now())
        throw new Error("Your order review has expired. Reload to continue.");
      setReview(result.review);
      setAccepted(false);
      setStatus(
        result.quoteOutcome === "declined"
          ? "Product quote declined. Contact the team if you need a revised quote."
          : result.review?.acceptance
            ? "Your acceptance has been recorded. Payment is not confirmed here."
            : result.review
              ? "Review the details and full terms before accepting."
              : "No order is currently available for review.",
      );
    } catch (error) {
      if (current !== sequence.current || abort.signal.aborted) return;
      setReview(null);
      setAccepted(false);
      setStatus(
        error instanceof Error &&
          (error.message.startsWith("Your ") || error.message.startsWith("This order"))
          ? error.message
          : "Your order is not available. Please try again later.",
      );
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }, []);
  const invalidate = useCallback(() => {
    sequence.current++;
    controller.current?.abort();
    declineKey.current = null;
  }, []);
  useEffect(() => {
    void send();
    return invalidate;
  }, [send, invalidate]);
  useEffect(() => {
    if (!review) return;
    const timer = setTimeout(
      () => {
        sequence.current++;
        controller.current?.abort();
        setReview(null);
        setAccepted(false);
        setBusy(false);
        setStatus("Your order review has expired. Reload to continue.");
      },
      Math.max(0, Date.parse(review.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [review]);
  return (
    <>
      <Nav />
      <main className="container-x max-w-3xl py-16">
        <h1 className="font-serif text-3xl">Review your order</h1>
        <OnboardingSteps current="payment" />
        <p className="text-muted-foreground">
          Review the amount and terms below. Accept the terms, then use secure Checkout. If you have
          already paid, your confirmed payment will appear here.
        </p>
        {paymentComplete &&
        !payment?.requiresReview &&
        !payment?.dispute &&
        payment?.refundedMinor === 0 ? (
          <section
            className="mt-6 rounded-2xl border border-gold/40 bg-surface p-6"
            aria-labelledby="payment-next"
          >
            <h2
              id="payment-next"
              ref={confirmationRef}
              tabIndex={-1}
              className="font-serif text-2xl"
            >
              {payment?.status === "not_required"
                ? "No additional payment needed"
                : "Payment confirmed — thank you"}
            </h2>
            <p className="mt-3">
              You do not need to pay this transaction again. The team will review your next steps.
              This is not clinical approval or confirmation of product supply.
            </p>
            <Link
              to="/portal"
              className="mt-5 inline-block rounded-full bg-gold px-6 py-3 font-medium text-primary-foreground"
            >
              View your account and progress
            </Link>
          </section>
        ) : null}
        <p
          id="order-feedback"
          ref={resultRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="mt-4"
        >
          {paymentNeedsReview
            ? "Payment needs staff review. Do not pay again; contact support for help."
            : paymentComplete
              ? payment?.status === "not_required"
                ? "No additional payment is needed for this transaction."
                : "Your payment has been confirmed. Do not pay this transaction again."
              : status}
        </p>
        {review ? (
          <details open={!paymentComplete} className="mt-8">
            <summary className="cursor-pointer text-gold">
              {paymentComplete ? "Order details and accepted terms" : "Amount and terms to review"}
            </summary>
            <section aria-label="Order details" className="mt-8 space-y-6">
              <p>
                {review.scenario === "review_deposit" ? "Review deposit" : "Approved product order"}
              </p>
              <p className="whitespace-pre-wrap">Supplier: {review.terms.supplier}</p>
              <ul className="space-y-3">
                {review.lines.map((line, index) => (
                  <li key={index}>
                    <p>
                      {line.description} · {line.quantity} × {amount(line.unitAmountMinor)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Price version: {line.priceVersion} · VAT-inclusive planning
                    </p>
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-2 gap-3">
                <dt>Delivery</dt>
                <dd>{amount(review.deliveryMinor)}</dd>
                <dt>Deposit credit</dt>
                <dd>{amount(review.creditMinor)}</dd>
                <dt>Unused deposit refund</dt>
                <dd>{amount(review.unusedDepositRefundMinor)}</dd>
                <dt>Total payable</dt>
                <dd>{amount(review.amountTotalMinor)}</dd>
              </dl>
              {review.deliveryVersion ? (
                <p>Delivery quote version: {review.deliveryVersion}</p>
              ) : null}
              <section aria-labelledby="order-terms-heading">
                <h2 id="order-terms-heading" className="text-xl">
                  Pilot Order and Payment Terms · {review.terms.version}
                </h2>
                <p className="mt-2 text-sm">
                  Effective:{" "}
                  {new Date(review.terms.effectiveAt).toLocaleDateString("en-ZA", {
                    timeZone: "Africa/Johannesburg",
                  })}
                </p>
                <p className="mt-4 whitespace-pre-wrap break-words">{review.terms.body}</p>
                <button
                  type="button"
                  className="action-secondary mt-4"
                  onClick={() => window.print()}
                >
                  Print or save these terms
                </button>
              </section>
              {review.quoteCurrent === false && !paymentComplete ? (
                <p>
                  This quote is not available for acceptance or Checkout. Ask the team to review it.
                </p>
              ) : paymentComplete ? null : !review.acceptance ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (accepted && !busy) void send(review);
                  }}
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={accepted}
                      disabled={busy}
                      onChange={(event) => setAccepted(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      I accept Pilot Order and Payment Terms version {review.terms.version} for this
                      displayed transaction, including the R999 review-deposit credit and refund
                      rules. I understand that payment does not guarantee clinical approval, product
                      supply or delivery.
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={!accepted || busy}
                    className="mt-6 rounded-full border px-6 py-3 disabled:opacity-50"
                  >
                    {busy ? "Recording acceptance…" : "Accept this order"}
                  </button>
                </form>
              ) : (
                <div>
                  <p>Acceptance recorded. Payment status requires independent confirmation.</p>
                  {review.checkoutEnabled && !paymentBlocked ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void checkout(review)}
                      className="mt-4 rounded-full bg-gold px-6 py-3 font-medium text-primary-foreground disabled:opacity-50"
                    >
                      Continue to secure Checkout
                    </button>
                  ) : (
                    <p className="mt-4">
                      {paymentBlocked
                        ? "Check your payment status above before continuing. If payment is pending or needs review, do not pay again; contact support for help."
                        : "Checkout is not available yet. Submit your questionnaire first, or contact support if it is already submitted."}
                    </p>
                  )}
                </div>
              )}
              {review.scenario === "approved_product_order" && !paymentComplete ? (
                <button
                  type="button"
                  className="action-secondary"
                  disabled={busy || payment?.status === "pending" || Boolean(paymentNeedsReview)}
                  onClick={() => void decline(review)}
                >
                  Decline this product quote
                </button>
              ) : null}
            </section>
          </details>
        ) : null}
        <details open={!paymentComplete || Boolean(paymentNeedsReview)} className="mt-8">
          <summary className="cursor-pointer text-gold">Payment status and refund requests</summary>
          <PaymentStatusPanel autoLoad onChange={setPayments} />
        </details>
        <div className="mt-8 flex flex-wrap gap-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              acceptKey.current = null;
              void send();
            }}
            className="action-secondary"
          >
            Reload order
          </button>
          <Link to="/portal" className="action-secondary">
            Back to your account
          </Link>
          <Link to="/portal/intake" className="action-secondary">
            Your questionnaire
          </Link>
          <Link to="/portal/support" className="action-secondary">
            Get help
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
