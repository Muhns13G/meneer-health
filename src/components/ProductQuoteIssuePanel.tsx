import { useCallback, useEffect, useRef, useState } from "react";
import {
  productQuoteIssueViewSchema,
  type ProductQuoteIssueView,
} from "@/domain/payments/product-quote-issue";
export function ProductQuoteIssuePanel({ caseId }: { caseId: string }) {
  const [view, setView] = useState<ProductQuoteIssueView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Check current evidence, funding and product terms before issuing.",
  );
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const key = useRef<{ draftId: string; key: string } | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const clear = useCallback(() => {
    sequence.current++;
    controller.current?.abort();
    key.current = null;
    setView(null);
    setBusy(false);
  }, []);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clear();
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [caseId, clear]);
  useEffect(() => {
    if (!view) return;
    const timer = setTimeout(
      () => {
        clear();
        setMessage("Issue view expired. Reload and check your authenticator.");
      },
      Math.max(0, Date.parse(view.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [view, clear]);
  useEffect(() => {
    if (!busy) status.current?.focus();
  }, [message, busy]);
  async function send(issue?: ProductQuoteIssueView) {
    if (busy || (issue && (!issue.canIssue || !issue.draftId))) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const seq = ++sequence.current;
    if (issue?.draftId && key.current?.draftId !== issue.draftId)
      key.current = { draftId: issue.draftId, key: crypto.randomUUID() };
    const requestKey = issue ? key.current!.key : crypto.randomUUID();
    setBusy(true);
    setView(null);
    setMessage(issue ? "Checking and issuing the exact quote…" : "Checking quote readiness…");
    try {
      const r = await fetch("/staff/products/issue", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: abort.signal,
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
        body: JSON.stringify(
          issue
            ? { action: "issue", caseId, draftId: issue.draftId, requestKey }
            : { action: "read", caseId },
        ),
      });
      if (!r.ok) throw new Error(String(r.status));
      const next = productQuoteIssueViewSchema.parse(await r.json());
      if (seq !== sequence.current || document.hidden) return;
      if (
        next.caseId !== caseId ||
        Date.parse(next.expiresAt) <= Date.now() ||
        (issue && (next.draftId !== issue.draftId || next.status !== "issued" || !next.offerId))
      )
        throw new Error("unknown");
      setView(next);
      setMessage(
        next.status === "issued"
          ? "Quote issued for exact client review. It is not paid or dispensing authority."
          : next.canIssue
            ? "All current issue prerequisites are present. Issuing reserves only the available deposit credit."
            : "A current draft, independent evidence, available funding, product terms and release are required. Reconcile any previous Checkout first.",
      );
    } catch (error) {
      if (seq === sequence.current)
        setMessage(
          error instanceof Error && error.message === "412"
            ? "Product ordering is not enabled."
            : error instanceof Error && ["401", "403"].includes(error.message)
              ? "Current assigned operations access, fresh authenticator verification and issue prerequisites are required."
              : "The issue result is uncertain or changed. Reload to reconcile before another attempt.",
        );
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  return (
    <section aria-label="Issue product quote" className="mt-6 rounded-xl border border-border p-5">
      <h3 className="font-serif text-2xl">Issue product quote</h3>
      <p ref={status} role="status" tabIndex={-1} aria-live="polite" className="mt-4">
        {message}
      </p>
      <button
        type="button"
        className="action-secondary mt-4"
        disabled={busy}
        onClick={() => void send()}
      >
        Check / reconcile quote issue
      </button>
      {view ? (
        <div className="mt-4">
          <p>
            Workspace: {view.tenantName}
            {view.synthetic ? " — synthetic quote only" : ""}. Draft version {view.version}.
          </p>
          <p>
            Product terms: {view.termsVersion ?? "not published"}. Status:{" "}
            {view.status.replaceAll("_", " ")}.
          </p>
          <button
            type="button"
            className="action-secondary mt-4"
            disabled={busy || !view.canIssue}
            onClick={() => void send(view)}
          >
            Issue this exact quote
          </button>
        </div>
      ) : null}
    </section>
  );
}
