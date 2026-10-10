import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  productEvidenceViewSchema,
  productEvidenceCommandSchema,
  type ProductEvidenceView,
} from "@/domain/payments/product-quote-evidence";

export function ProductEvidencePanel({
  target,
}: {
  target: { caseId: string } | { intakeId: string };
}) {
  const [view, setView] = useState<ProductEvidenceView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Load the exact draft before reviewing evidence.");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const sequence = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const clear = useCallback(() => {
    sequence.current++;
    abort.current?.abort();
    setView(null);
    setBusy(false);
    setReference("");
    setConfirmed(false);
    setMessage("Private evidence hidden. Reload to check current access.");
  }, []);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) clear();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", clear);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", clear);
    };
  }, [clear]);
  useEffect(() => {
    if (!view) return;
    const timer = setTimeout(
      () => {
        clear();
        setMessage("Evidence view expired. Reload and verify your authenticator if needed.");
      },
      Math.max(0, Date.parse(view.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [view, clear]);
  useEffect(() => {
    if (!busy) status.current?.focus();
  }, [message, busy]);
  async function send(command?: Record<string, unknown>) {
    const key = crypto.randomUUID();
    const body = command ? { ...command, target, requestKey: key } : { action: "read", target };
    if (!productEvidenceCommandSchema.safeParse(body).success) {
      setMessage("Enter a valid private source reference and expiry before recording evidence.");
      return;
    }
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const seq = ++sequence.current;
    setBusy(true);
    setView(null);
    setReference("");
    setConfirmed(false);
    setMessage(command ? "Recording attributed evidence…" : "Checking exact draft and access…");
    try {
      const response = await fetch("/staff/products/evidence", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(String(response.status));
      const next = productEvidenceViewSchema.parse(await response.json());
      if (seq !== sequence.current || document.hidden) return;
      if (Date.parse(next.expiresAt) <= Date.now() || (command && command.draftId !== next.draftId))
        throw new Error("403");
      if (
        command?.action === "record" &&
        !next.evidence.some((e) => e.kind === command.kind && e.current && e.canRevoke)
      )
        throw new Error("uncertain");
      if (
        command?.action === "revoke" &&
        !next.evidence.some((e) => e.id === command.evidenceId && !e.current)
      )
        throw new Error("uncertain");
      setView(next);
      setMessage(
        command
          ? "Attributed evidence recorded. No quote, payment or dispensing was issued."
          : "Review the exact products and quantities against your private source records.",
      );
    } catch (error) {
      if (seq !== sequence.current) return;
      setMessage(
        error instanceof Error && error.message === "409"
          ? "The draft or references changed. Reload before acting."
          : error instanceof Error && ["401", "403"].includes(error.message)
            ? "Current role, assignment or medical-purpose grant and fresh authenticator verification are required."
            : error instanceof Error && error.message === "412"
              ? "Product evidence is not enabled."
              : error instanceof Error && error.message === "422"
                ? "The reference or validity interval was not accepted. Reload and check them before recording."
                : "The evidence result is uncertain. Reload to reconcile; do not blindly repeat the action.",
      );
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view || !confirmed || !view.canRecord) return;
    const fields = new FormData(event.currentTarget);
    void send({
      action: "record",
      draftId: view.draftId,
      kind: fields.get("kind"),
      evidenceReference: reference.trim(),
      expiresAt: new Date(
        Math.min(Date.now() + Number(fields.get("hours")) * 3600_000, Date.parse(view.recordUntil)),
      ).toISOString(),
    });
  }
  return (
    <section
      aria-label="Independent product evidence"
      className="mt-6 rounded-xl border border-border p-5"
    >
      <h3 className="font-serif text-2xl">Independent product evidence</h3>
      <p className="mt-3">
        Operations records provider-source evidence, not clinical decisions. No generator result or
        stock confirmation is assumed from payment.
      </p>
      <p ref={status} role="status" tabIndex={-1} aria-live="polite" className="mt-4">
        {message}
      </p>
      <button
        type="button"
        className="action-secondary mt-4"
        disabled={busy}
        onClick={() => void send()}
      >
        Load / reconcile product evidence
      </button>
      {view ? (
        <div className="mt-4">
          <p>
            Workspace: {view.tenantName}
            {view.synthetic ? " — synthetic evidence only" : ""}. Draft version {view.version}.
          </p>
          <ul>
            {view.items.map((item, n) => (
              <li key={n}>
                {item.description} × {item.quantity}
              </li>
            ))}
          </ul>
          <label className="mt-4 block">
            Private source evidence reference
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
              maxLength={36}
              pattern="[a-fA-F0-9-]{36}"
              className="mt-2 w-full rounded border bg-surface p-3"
            />
          </label>
          <form onSubmit={record} className="mt-4 grid gap-4">
            <label>
              Evidence category
              <select name="kind" className="mt-2 w-full rounded border bg-surface p-3">
                {view.role === "clinician" ? (
                  <option value="clinical">Exact clinical approval</option>
                ) : (
                  <>
                    <option value="provider_stock">Provider stock</option>
                    <option value="pharmacy_authority">Pharmacy authority</option>
                    <option value="address_custody">Address and custody</option>
                  </>
                )}
              </select>
            </label>
            <label>
              Evidence validity
              <select name="hours" className="mt-2 w-full rounded border bg-surface p-3">
                <option value="1">One hour</option>
                <option value="4">Four hours</option>
                <option value="12">Twelve hours</option>
              </select>
            </label>
            <label className="flex gap-3">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I independently reviewed the exact draft against the current source evidence.
            </label>
            {!view.canRecord ? (
              <p>The draft preparer cannot provide independent evidence.</p>
            ) : null}
            <button
              className="action-secondary"
              disabled={busy || !confirmed || !reference.trim() || !view.canRecord}
            >
              {view.role === "clinician"
                ? "Record exact clinical approval"
                : "Record independent provider evidence"}
            </button>
          </form>
          <ul className="mt-4 space-y-4">
            {view.evidence.map((item) => (
              <li key={item.id}>
                {item.kind.replaceAll("_", " ")}: {item.current ? "current" : "not current"}. Valid
                until {item.expiresAt}.
                {item.canRevoke ? (
                  <button
                    type="button"
                    className="action-secondary mt-2"
                    disabled={!reference.trim() || busy}
                    onClick={() =>
                      void send({
                        action: "revoke",
                        draftId: view.draftId,
                        evidenceId: item.id,
                        evidenceReference: reference.trim(),
                      })
                    }
                  >
                    Revoke {item.kind.replaceAll("_", " ")} evidence
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
