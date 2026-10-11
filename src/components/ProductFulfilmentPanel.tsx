import { useCallback, useEffect, useRef, useState } from "react";
import {
  clientFulfilmentViewSchema,
  productFulfilmentViewSchema,
  type ProductFulfilmentView,
} from "@/domain/payments/product-fulfilment";

export function ProductFulfilmentPanel({ caseId }: { caseId?: string }) {
  const [view, setView] = useState<ProductFulfilmentView | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [evidence, setEvidence] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Check current fulfilment progress. Payment is not dispensing or delivery.",
  );
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const clear = useCallback(() => {
    sequence.current++;
    controller.current?.abort();
    retry.current = null;
    if (timer.current) clearTimeout(timer.current);
    setView(null);
    setProgress(null);
    setEvidence("");
    setAcknowledged(false);
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
    if (!busy) result.current?.focus();
  }, [message, busy]);
  async function send(event?: string) {
    if (busy || (event && (!view?.offerId || !acknowledged || !validEvidence))) return;
    const payload = JSON.stringify(
      event
        ? {
            action: "record",
            caseId,
            offerId: view!.offerId,
            expectedVersion: view!.version,
            event,
            evidenceReference: evidence,
          }
        : caseId
          ? { action: "read", caseId }
          : {},
    );
    if (event && retry.current?.payload !== payload)
      retry.current = { payload, key: crypto.randomUUID() };
    const key = event ? retry.current!.key : crypto.randomUUID();
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const seq = ++sequence.current;
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    setView(null);
    setProgress(null);
    setMessage(event ? "Recording exact fulfilment evidence…" : "Checking fulfilment progress…");
    try {
      const response = await fetch(
        caseId ? "/staff/products/fulfilment" : "/portal/order/fulfilment",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal: abort.signal,
          headers: { "Content-Type": "application/json", "Idempotency-Key": key },
          body: event ? JSON.stringify({ ...JSON.parse(payload), requestKey: key }) : payload,
        },
      );
      if (!response.ok) throw new Error(String(response.status));
      const next = caseId
        ? productFulfilmentViewSchema.parse(await response.json())
        : clientFulfilmentViewSchema.parse(await response.json());
      if (seq !== sequence.current || document.hidden) return;
      if (Date.parse(next.expiresAt) <= Date.now() || ("caseId" in next && next.caseId !== caseId))
        throw new Error("stale");
      if ("stage" in next) setView(next);
      else setProgress(next.progress.replaceAll("_", " "));
      setEvidence("");
      setAcknowledged(false);
      setMessage(
        event
          ? "Evidence recorded. No provider order, dispensing or courier action was performed automatically."
          : "Current progress checked. Use support for an unresolved exception.",
      );
      timer.current = setTimeout(
        () => {
          clear();
          setMessage("Private progress expired. Check access and reload.");
        },
        Date.parse(next.expiresAt) - Date.now(),
      );
    } catch (error) {
      if (seq === sequence.current)
        setMessage(
          error instanceof Error && error.message === "412"
            ? "Product fulfilment is not enabled."
            : "Progress is unavailable or the result is uncertain. Reload to reconcile; do not repeat a physical action.",
        );
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  const validEvidence =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(evidence);
  return (
    <section aria-label="Product fulfilment" className="mt-6 rounded-xl border border-border p-5">
      {caseId ? (
        <h3 className="font-serif text-2xl">Manual product fulfilment</h3>
      ) : (
        <h2 className="font-serif text-2xl">Your product delivery progress</h2>
      )}
      <p ref={result} role="status" tabIndex={-1} aria-live="polite" className="mt-4">
        {message}
      </p>
      <button
        type="button"
        className="action-secondary mt-4"
        disabled={busy}
        onClick={() => void send()}
      >
        Check fulfilment progress
      </button>
      {progress ? <p className="mt-4">Progress: {progress}.</p> : null}
      {view ? (
        <div className="mt-4">
          <p>
            Workspace: {view.tenantName}
            {view.synthetic ? " — synthetic only" : ""}. Record version {view.version}.
          </p>
          <p>
            Stage: {view.stage.replaceAll("_", " ")}.{" "}
            {view.exception ? "Exception requires review." : "No recorded exception."}
          </p>
          {view.offerId ? (
            <>
              <label className="mt-4 block">
                Private evidence reference
                <input
                  className="mt-2 w-full rounded border border-border bg-background p-3"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  disabled={busy}
                  autoComplete="off"
                />
              </label>
              <label className="mt-4 flex gap-3">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  disabled={busy}
                />
                I checked the exact order and private source evidence. This records an actual event,
                not clinical approval.
              </label>
              <div className="mt-4 flex flex-wrap gap-3">
                {view.nextEvent ? (
                  <button
                    type="button"
                    className="action-secondary"
                    disabled={busy || !view.canAdvance || !acknowledged || !validEvidence}
                    onClick={() => void send(view.nextEvent!)}
                  >
                    Record {view.nextEvent.replaceAll("_", " ")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="action-secondary"
                  disabled={busy || !acknowledged || !validEvidence}
                  onClick={() => void send(view.exception ? "exception_resolved" : "exception")}
                >
                  {view.exception ? "Record exception resolution" : "Record fulfilment exception"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
