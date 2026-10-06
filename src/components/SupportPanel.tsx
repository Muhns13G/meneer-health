import { useEffect, useRef, useState } from "react";
import { supportLabels, supportResultSchema, type SupportPurpose } from "@/domain/support/support";

export function SupportPanel({ onInvalidate }: { onInvalidate: () => void }) {
  const [view, setView] = useState<Extract<
    ReturnType<typeof supportResultSchema.parse>,
    { outcome: "view" }
  > | null>(null);
  const [purpose, setPurpose] = useState<SupportPurpose>("privacy");
  const [urgent, setUrgent] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(true);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const request = useRef<{ purpose: SupportPurpose; key: string } | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
      request.current = null;
    };
  }, []);
  useEffect(() => {
    if (message) status.current?.focus();
  }, [message]);
  async function execute(action: "read" | "request") {
    if (busy.current) return;
    if (action === "request" && urgent) {
      setMessage(
        "Do not wait for support. Call 112 from a mobile, 10177 for an ambulance, or go to the nearest emergency facility.",
      );
      return;
    }
    const key = request.current?.purpose === purpose ? request.current.key : crypto.randomUUID();
    if (action === "request") request.current = { purpose, key };
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/portal/support/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(action === "request" ? { "Idempotency-Key": key } : {}),
        },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: current.signal,
        body: JSON.stringify(
          action === "read" ? { action } : { action, purpose, urgent: false, requestKey: key },
        ),
      });
      if (!active.current) return;
      if ([401, 403].includes(response.status)) {
        setView(null);
        onInvalidate();
        return;
      }
      if (response.status !== 200) {
        setView(null);
        setMessage(
          "Support could not be confirmed. Retry to check the same request; do not assume it was received.",
        );
        return;
      }
      const parsed = supportResultSchema.safeParse(await response.json());
      if (!parsed.success) {
        setView(null);
        setMessage("Support could not be confirmed. Please retry.");
        return;
      }
      if (parsed.data.outcome === "view") {
        setView(parsed.data);
        setMessage("Support availability and request status updated.");
      } else if (parsed.data.outcome === "received") {
        setMessage(
          "Your request was recorded for secure follow-up. This is not human acknowledgement, clinical review or a completed refund.",
        );
        request.current = null;
      } else if (parsed.data.outcome === "unavailable") {
        setView(null);
        setMessage(
          purpose === "clinical"
            ? "Clinical support is not currently available. Do not send medical information to general support; urgent symptoms require emergency care."
            : "This purpose route is not currently available. General support can arrange non-sensitive follow-up.",
        );
        request.current = null;
      } else
        setMessage("Do not wait for support. Use 112, 10177 or the nearest emergency facility.");
    } catch {
      if (active.current && !current.signal.aborted) {
        setView(null);
        setMessage(
          "Support could not be confirmed. Retry to check the same request; do not assume it was received.",
        );
      }
    } finally {
      busy.current = false;
      if (active.current) setPending(false);
    }
  }
  return (
    <section aria-labelledby="support-heading" className="mt-8 space-y-5">
      <h2 id="support-heading" className="font-serif text-2xl">
        Secure support requests
      </h2>
      <p>
        No fixed mailbox hours are published. We aim to answer queries within 24 hours where
        possible; this is not continuous staffing or an emergency service.
      </p>
      <p>
        Request secure follow-up without entering medical information, identity documents, payment
        details or complaint text here. Email must not carry that information.
      </p>
      <p>
        For urgent or severe symptoms, call <a href="tel:112">112</a> from a mobile,{" "}
        <a href="tel:10177">10177</a> for an ambulance, or use the nearest emergency facility. Do
        not wait for a support reply.
      </p>
      <p>
        <a href="mailto:support@meneerhealth.co.za" className="underline">
          General support
        </a>{" "}
        is only a non-sensitive privacy/service fallback, not a clinical fallback. Privacy
        complaints may also use the{" "}
        <a
          href="https://inforegulator.org.za/contact-us/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Information Regulator
        </a>
        .
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void execute("read")}
        className="rounded-full border px-5 py-3"
      >
        {pending ? "Checking…" : "Refresh support availability and status"}
      </button>
      <label className="block">
        Support purpose
        <select
          value={purpose}
          disabled={pending}
          onChange={(e) => {
            setPurpose(e.target.value as SupportPurpose);
            setMessage("");
            request.current = null;
          }}
          className="mt-2 block w-full rounded-xl border bg-surface px-4 py-3"
        >
          {Object.entries(supportLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {view && !view.routes.some((route) => route.purpose === purpose && route.available) ? (
        <p>
          This purpose route is not currently available. General support can arrange non-sensitive
          privacy/service follow-up, but cannot replace clinical or emergency care.
        </p>
      ) : null}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={urgent}
          onChange={(e) => setUrgent(e.target.checked)}
          disabled={pending}
        />
        This concerns urgent or severe symptoms.
      </label>
      {urgent ? (
        <p role="alert">
          Do not submit an asynchronous support request for an emergency. Use 112, 10177 or the
          nearest emergency facility.
        </p>
      ) : null}
      <button
        type="button"
        disabled={
          pending || urgent || !view?.routes.some((r) => r.purpose === purpose && r.available)
        }
        onClick={() => void execute("request")}
        className="rounded-full border px-5 py-3"
      >
        Request secure follow-up
      </button>
      <p ref={status} tabIndex={-1} role="status" aria-live="polite">
        {message}
      </p>
      {view ? (
        <ul aria-label="Your support requests">
          {view.requests.map((item) => (
            <li key={item.reference}>
              {supportLabels[item.purpose]} —{" "}
              {item.state === "received"
                ? "Recorded; awaiting owner acknowledgement"
                : item.state === "acknowledged"
                  ? "Acknowledged by the accountable owner"
                  : item.state === "escalated"
                    ? "Alternate-owner follow-up required"
                    : "Resolved by the accountable owner"}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
