import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import {
  operationsAlertListSchema,
  type OperationsAlert,
} from "@/application/operations/alert-projection";

const subscribeHydration = () => () => {};
export function StaffAlertsPage() {
  // An SSR-visible button must not accept a click before its handlers are hydrated.
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [alerts, setAlerts] = useState<OperationsAlert[]>([]);
  const [message, setMessage] = useState("Use staff MFA, then load alerts.");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (expiry.current) clearTimeout(expiry.current);
    },
    [],
  );
  async function load(alertId?: string, action?: "acknowledged" | "resolved") {
    controller.current?.abort();
    if (expiry.current) clearTimeout(expiry.current);
    const current = new AbortController();
    controller.current = current;
    setAlerts([]);
    setBusy(true);
    setMessage("Checking live administrator authority…");
    try {
      const session = await fetch("/staff/session", {
        cache: "no-store",
        credentials: "same-origin",
        signal: current.signal,
      });
      if (!session.ok) throw new Error("Access unavailable. Sign in with staff MFA.");
      const sessionSchema = z.object({
        role: z.literal("admin"),
        expiresAt: z.iso.datetime({ offset: true }),
      });
      const authority = sessionSchema.parse(await session.json());
      const deadline = Date.parse(authority.expiresAt);
      if (deadline <= Date.now()) throw new Error("Session expired. Sign in with staff MFA.");
      const post = (path: string, fields: Record<string, string>) =>
        fetch(path, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          signal: current.signal,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fields),
        });
      if (alertId && action) {
        const receipt = await post("/staff/alerts/respond", {
          alertId,
          action,
          requestKey: crypto.randomUUID(),
        });
        if (!receipt.ok) throw new Error("Response not confirmed. Refresh before retrying.");
      }
      const response = await post("/staff/alerts/read", {});
      if (!response.ok)
        throw new Error("Alerts unavailable. Check your administrator session and retry.");
      const { alerts: value } = z
        .object({ alerts: operationsAlertListSchema })
        .parse(await response.json());
      if (current.signal.aborted || deadline <= Date.now()) return;
      setAlerts(value);
      setMessage(
        value.length ? "Alerts loaded. Reviewing is not acknowledgement." : "No alerts to review.",
      );
      expiry.current = setTimeout(
        () => {
          current.abort();
          setAlerts([]);
          setMessage("Session expired. Sign in with staff MFA.");
        },
        Math.min(deadline - Date.now(), 2_147_483_647),
      );
    } catch (error) {
      if (!current.signal.aborted)
        setMessage(
          error instanceof Error && error.message.startsWith("Access unavailable")
            ? error.message
            : "Alerts or response unavailable. Refresh your staff session before retrying.",
        );
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }
  return (
    <main className="container-x max-w-4xl py-16">
      <h1 className="font-serif text-4xl">Operations alert review</h1>
      <p className="mt-4">
        Internal, nonclinical alerts. Provider acceptance does not prove mailbox delivery or
        resolution.
      </p>
      <p role="status" className="my-4">
        {message}
      </p>
      <div className="flex gap-4">
        <button
          disabled={busy || !hydrated}
          className="rounded-full border border-border px-5 py-3"
          onClick={() => void load()}
        >
          Load alerts
        </button>
        <a className="underline" href="/staff/sign-in">
          Staff sign-in
        </a>
      </div>
      <ul className="mt-8 space-y-4">
        {alerts.map((alert) => (
          <li key={alert.id} className="rounded-xl border border-border p-5">
            <h2 className="text-lg">{alert.code.replaceAll("_", " ")}</h2>
            <p>
              {alert.severity} · {alert.owner} · Transport: {alert.delivery}
            </p>
            <p>Recorded: {alert.recorded_at}</p>
            <p>
              {alert.resolved
                ? "Resolved"
                : alert.acknowledged
                  ? "Acknowledged; review still open"
                  : "Awaiting acknowledgement"}
            </p>
            {!alert.resolved ? (
              <button
                className="mt-3 rounded-full border border-border px-5 py-3"
                disabled={busy}
                onClick={() =>
                  void load(alert.id, alert.acknowledged ? "resolved" : "acknowledged")
                }
              >
                {alert.acknowledged ? "Confirm resolution" : "Acknowledge alert"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
