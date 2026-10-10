import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  staffProductQuoteViewSchema,
  type StaffProductQuoteView,
} from "@/domain/payments/staff-product-quote";

const money = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
export function StaffProductQuotePanel({ caseId }: { caseId: string }) {
  const [view, setView] = useState<StaffProductQuoteView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Load the assigned case's product draft options.");
  const abort = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const invalidate = () => {
      sequence.current++;
    };
    const clear = () => {
      sequence.current++;
      abort.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      setView(null);
      setBusy(false);
      setMessage("Private draft information hidden. Reload to recheck access.");
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      invalidate();
      abort.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!busy) status.current?.focus();
  }, [message, busy]);
  async function send(command?: Record<string, unknown>) {
    abort.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    const current = ++sequence.current;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setMessage(command ? "Saving the immutable draft…" : "Checking assigned product options…");
    const key = crypto.randomUUID();
    const body = command
      ? JSON.stringify({ ...command, requestKey: key })
      : JSON.stringify({ action: "read", caseId });
    setView(null);
    try {
      const r = await fetch("/staff/products/command", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body,
      });
      if (!r.ok)
        throw new Error(
          r.status === 409
            ? "changed"
            : r.status === 412
              ? "disabled"
              : r.status === 401 || r.status === 403
                ? "access"
                : "unknown",
        );
      const next = staffProductQuoteViewSchema.parse(await r.json());
      if (current !== sequence.current || document.hidden) return;
      if (next.caseId !== caseId || Date.parse(next.expiresAt) <= Date.now())
        throw new Error("access");
      if (
        command &&
        (!next.draft || next.draft.version !== Number(command.expectedDraftVersion) + 1)
      )
        throw new Error("unknown");
      setView(next);
      setMessage(
        command
          ? "Draft saved. It is not issued, clinically approved or payable. No credit has been reserved."
          : next.deliveries.length
            ? "Choose quantities and an approved delivery/address reference."
            : "No current delivery/address binding is available. Do not invent a tariff or address confirmation.",
      );
      timer.current = setTimeout(
        () => {
          sequence.current++;
          controller.abort();
          setView(null);
          setBusy(false);
          setMessage("Access expired. Reload; fresh authenticator verification may be required.");
        },
        Date.parse(next.expiresAt) - Date.now(),
      );
    } catch (error) {
      if (current !== sequence.current) return;
      setView(null);
      setMessage(
        error instanceof Error && error.message === "changed"
          ? "The case, draft or references changed. Reload before preparing another version."
          : error instanceof Error && error.message === "disabled"
            ? "Product quote preparation is not enabled."
            : error instanceof Error && error.message === "access"
              ? "Assigned operations access and recent authenticator verification are required."
              : "The draft result is uncertain. Reload to reconcile it before making another request.",
      );
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!view?.catalogueId || busy) return;
    const fields = new FormData(event.currentTarget);
    const items = view.items
      .map((i) => ({ productId: i.productId, quantity: Number(fields.get(i.productId)) }))
      .filter((i) => i.quantity > 0);
    if (!items.length || items.length > 20) {
      setMessage("Select between one and twenty products.");
      return;
    }
    void send({
      action: "prepare_draft",
      caseId,
      catalogueId: view.catalogueId,
      expectedCaseVersion: view.caseVersion,
      expectedDraftVersion: view.draft?.version ?? 0,
      deliveryQuoteId: fields.get("delivery"),
      items,
    });
  }
  return (
    <section
      aria-label="Product quote preparation"
      className="mt-8 rounded-xl border border-border p-5"
    >
      <h3 className="font-serif text-2xl">Prepare product draft</h3>
      <p className="mt-3">
        Administrative preparation only. Independent product approval and quote issue are still
        required.
      </p>
      <p ref={status} tabIndex={-1} role="status" aria-live="polite" className="mt-4">
        {message}
      </p>
      <button
        type="button"
        className="action-secondary mt-4"
        disabled={busy}
        onClick={() => void send()}
      >
        Load / reconcile product draft
      </button>
      {view ? (
        <div className="mt-5" aria-busy={busy}>
          <p>
            Workspace: {view.tenantName}
            {view.synthetic ? " — synthetic test catalogue" : ""}
          </p>
          {view.draft ? (
            <div className="mt-4 rounded border border-border p-4">
              <h4>Latest saved draft · version {view.draft.version}</h4>
              <ul>
                {view.draft.items.map((i) => (
                  <li key={i.productId}>
                    {i.description} × {i.quantity}
                  </li>
                ))}
              </ul>
              <p>
                Products: {money.format(view.draft.productSubtotalMinor / 100)}; delivery:{" "}
                {money.format(view.draft.deliveryMinor / 100)}.
              </p>
              <p>
                Total before any deposit credit:{" "}
                {money.format(view.draft.totalBeforeCreditMinor / 100)}. Not a payment demand.
              </p>
            </div>
          ) : null}
          <form onSubmit={prepare} className="mt-5 grid gap-4">
            {view.items.map((i) => (
              <label key={i.productId} className="block">
                {i.description} · {money.format(i.unitAmountMinor / 100)}
                {i.interested ? " · client interest recorded" : ""}
                <input
                  aria-label={`Quantity: ${i.description}`}
                  name={i.productId}
                  type="number"
                  defaultValue={0}
                  min={0}
                  max={i.maxQuantity}
                  step={1}
                  className="mt-2 block w-full rounded border border-border bg-surface p-3"
                  disabled={busy}
                />
              </label>
            ))}
            <label>
              Approved delivery/address reference
              <select
                name="delivery"
                required
                disabled={busy || !view.deliveries.length}
                className="mt-2 block w-full rounded border border-border bg-surface p-3"
              >
                <option value="">Select approved reference</option>
                {view.deliveries.map((d, n) => (
                  <option key={d.deliveryQuoteId} value={d.deliveryQuoteId}>
                    Delivery option {n + 1} · {money.format(d.amountMinor / 100)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="action-secondary"
              disabled={busy || !view.catalogueId || !view.deliveries.length}
            >
              Save non-payable draft
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
