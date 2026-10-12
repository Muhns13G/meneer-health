import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

// Only fixed, non-sensitive action feedback belongs in transient notifications.
const messages = {
  draftSaved: "Your draft is saved.",
  codeRequested: "If an eligible account exists, a six-digit code has been sent.",
  paymentRefreshed: "Payment status refreshed.",
  supportRefreshed: "Support availability and request status updated.",
} as const;

export function useActionToast() {
  const id = useRef<string | number | null>(null);
  const active = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const dismiss = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    if (id.current !== null) toast.dismiss(id.current);
    id.current = null;
  }, []);
  const begin = useCallback(() => {
    dismiss();
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [dismiss]);
  useEffect(() => {
    active.current = true;
    const hidden = () => {
      if (document.hidden) dismiss();
    };
    window.addEventListener("pagehide", dismiss);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      active.current = false;
      dismiss();
      window.removeEventListener("pagehide", dismiss);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [dismiss]);
  const notify = useCallback(
    (action: keyof typeof messages) => {
      dismiss();
      if (active.current && !document.hidden) {
        id.current = toast.success(messages[action]);
        // A native disabled button loses focus while a request is pending. Restore it only
        // when focus fell to the body, never when the user moved to another control.
        let attempts = 0;
        const restoreFocus = () => {
          frame.current = null;
          if (active.current && !document.hidden && document.activeElement === document.body) {
            const element = trigger.current;
            if (element?.isConnected) {
              // Notification may precede React's commit that re-enables the action.
              // Wait a bounded number of paints, stopping if the user moves focus.
              if (element.matches(":disabled")) {
                if (attempts++ < 20) frame.current = requestAnimationFrame(restoreFocus);
              } else element.focus();
            }
          }
        };
        frame.current = requestAnimationFrame(restoreFocus);
      }
    },
    [dismiss],
  );
  return { notify, dismiss, begin };
}
