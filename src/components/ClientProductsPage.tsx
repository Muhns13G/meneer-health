import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import {
  clientCatalogueViewSchema,
  type ClientCatalogueView,
} from "@/domain/payments/client-product-catalogue";

const money = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
export function ClientProductsPage() {
  const [view, setView] = useState<ClientCatalogueView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking your private catalogue…");
  const [hydrated, setHydrated] = useState(false);
  const sequence = useRef(0),
    controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keys = useRef(new Map<string, string>());
  const result = useRef<HTMLParagraphElement>(null);
  const clear = useCallback(() => {
    sequence.current++;
    controller.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const load = useCallback(
    async (productId?: string, catalogueId?: string) => {
      clear();
      const current = sequence.current;
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      setView(null);
      setMessage(
        productId ? "Recording your interest privately…" : "Checking your private catalogue…",
      );
      const identity = `${catalogueId}:${productId}`;
      if (productId && !keys.current.has(identity)) keys.current.set(identity, crypto.randomUUID());
      const requestKey = productId ? keys.current.get(identity)! : crypto.randomUUID();
      try {
        const response = await fetch("/portal/products/command", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal: abort.signal,
          headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey },
          body: JSON.stringify(
            productId
              ? { action: "register_interest", catalogueId, productId, requestKey }
              : { action: "read" },
          ),
        });
        if (current !== sequence.current) return;
        if (!response.ok)
          throw new Error(
            response.status === 409
              ? "changed"
              : response.status === 401
                ? "session"
                : response.status === 412
                  ? "disabled"
                  : "unavailable",
          );
        const next = clientCatalogueViewSchema.parse(await response.json());
        if (current !== sequence.current || document.hidden) return;
        if (Date.parse(next.expiresAt) <= Date.now()) throw new Error("session");
        if (productId && !next.items.some((i) => i.productId === productId && i.interested))
          throw new Error("unconfirmed");
        setView(next);
        setMessage(
          productId
            ? "Your interest is recorded. This is not an order or clinical approval; no payment or stock reservation was made."
            : next.items.length
              ? "Current customer prices are shown below. Delivery is quoted separately."
              : "No products are available to browse right now. Contact support for help.",
        );
        timer.current = setTimeout(
          () => {
            clear();
            keys.current.clear();
            setView(null);
            setBusy(false);
            setMessage("Your catalogue session expired. Reload to recheck your access.");
          },
          Date.parse(next.expiresAt) - Date.now(),
        );
      } catch (error) {
        if (current !== sequence.current) return;
        setView(null);
        setMessage(
          error instanceof Error && error.message === "changed"
            ? "The catalogue changed. Reload and review the current prices before trying again."
            : error instanceof Error && error.message === "session"
              ? "Sign in again to view your private catalogue."
              : error instanceof Error && error.message === "disabled"
                ? "Product browsing is not available yet. Your account and deposit are unchanged."
                : "The request could not be confirmed. No new order or payment is assumed. Reload or contact support; do not blindly resend.",
        );
      } finally {
        if (current === sequence.current) setBusy(false);
      }
    },
    [clear],
  );
  useEffect(() => {
    const requestKeys = keys.current;
    setHydrated(true);
    void load();
    const hide = () => {
      clear();
      keys.current.clear();
      setView(null);
      setBusy(false);
      setMessage("Private catalogue information has been hidden. Reload to recheck your access.");
    };
    const visibility = () => {
      if (document.hidden) hide();
    };
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clear();
      requestKeys.clear();
      window.removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [clear, load]);
  useEffect(() => {
    if (hydrated && !busy) result.current?.focus();
  }, [hydrated, busy, message]);
  return (
    <>
      <Nav />
      <main className="container-x max-w-4xl py-16">
        <p className="label-caps">Your private account</p>
        <h1 className="mt-4 font-serif text-4xl">Browse products</h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          Express interest in a product for the team to review. A listing is not a recommendation, a
          prescription or guaranteed availability. An approved quote and separate acceptance are
          required before a product payment.
        </p>
        <p ref={result} tabIndex={-1} role="status" aria-live="polite" className="mt-6">
          {message}
        </p>
        {view?.synthetic ? (
          <p className="mt-4 rounded-xl border border-gold/50 p-4">
            Test catalogue — synthetic items and prices only. Not available for real purchase.
          </p>
        ) : null}
        <section
          aria-label="Product catalogue"
          aria-busy={busy}
          className="mt-8 grid gap-5 sm:grid-cols-2"
        >
          {view?.items.map((item) => (
            <article
              key={item.productId}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <h2 className="font-serif text-2xl break-words">{item.description}</h2>
              <p className="mt-4 text-xl">{money.format(item.unitAmountMinor / 100)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Customer RRP · delivery separately quoted
              </p>
              <button
                type="button"
                className="action-secondary mt-5"
                disabled={!hydrated || busy || item.interested}
                onClick={() => void load(item.productId, view?.catalogueId ?? undefined)}
                aria-label={`${item.interested ? "Interest recorded" : "Express interest"}: ${item.description}`}
              >
                {item.interested ? "Interest recorded" : "Express interest"}
              </button>
            </article>
          ))}
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="action-secondary"
            disabled={!hydrated || busy}
            onClick={() => void load()}
          >
            Reload catalogue
          </button>
          <Link to="/portal" className="action-secondary">
            Back to your account
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
