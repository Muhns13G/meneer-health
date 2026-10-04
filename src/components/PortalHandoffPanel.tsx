import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const linkResponse = z.object({ url: z.url().startsWith("https://") }).strict();
export function PortalHandoffPanel({
  navigate = (url: string) => window.location.assign(url),
}: {
  navigate?: (url: string) => void;
}) {
  const requestKey = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  return (
    <section className="mt-10" aria-label="Private provider intake">
      <h2 className="font-serif text-2xl">Your provider intake</h2>
      <p className="mt-3 text-muted-foreground">
        Continue to the provider's private intake when your hand-off is ready. Opening the link does
        not confirm provider receipt or clinical approval.
      </p>
      <button
        disabled={busy}
        className="mt-4 rounded-full border border-border px-5 py-3 disabled:opacity-50"
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setMessage("");
          active.current?.abort();
          const controller = new AbortController();
          active.current = controller;
          try {
            const result = await fetch("/portal/handoff/open", {
              method: "POST",
              credentials: "same-origin",
              cache: "no-store",
              redirect: "error",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({ requestKey: requestKey.current }),
              signal: controller.signal,
            });
            if (controller.signal.aborted || document.hidden) return;
            if (!result.ok) {
              setMessage(
                result.status === 412
                  ? "Your hand-off is not ready yet. Contact support if you need help."
                  : result.status === 409
                    ? "This link was already issued. Contact support; do not repeat your intake."
                    : "Private intake is unavailable. Check your session or contact support.",
              );
              return;
            }
            const parsed = linkResponse.safeParse(await result.json());
            if (!parsed.success || controller.signal.aborted || document.hidden)
              throw new Error("LINK_UNAVAILABLE");
            navigate(parsed.data.url);
          } catch {
            setMessage("Private intake could not be confirmed. Contact support before retrying.");
          } finally {
            if (!controller.signal.aborted) setBusy(false);
          }
        }}
      >
        Continue to private intake
      </button>
      <p className="mt-3" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
