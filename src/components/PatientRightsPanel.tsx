import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PortalAccount } from "@/domain/identity/patient-portal";
import {
  patientRightsCommandSchema,
  patientRightsResultSchema,
  rightsRequestKinds,
} from "@/domain/identity/patient-rights";

const requestLabels = {
  export: "Access / export",
  restriction: "Restriction / objection",
  closure: "Account closure / deletion",
  contact_change: "Email / mobile change",
  support: "Account support",
};
export function PatientRightsPanel({
  profile,
  onInvalidate,
}: {
  profile: PortalAccount["profile"];
  onInvalidate: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [givenName, setGivenName] = useState(profile.givenName);
  const [familyName, setFamilyName] = useState(profile.familyName);
  const [preference, setPreference] = useState(profile.contactPreference);
  const [kind, setKind] = useState<(typeof rightsRequestKinds)[number]>("support");
  const [confirm, setConfirm] = useState(false);
  const heading = useRef<HTMLParagraphElement>(null);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
      retry.current = null;
    };
  }, []);
  useEffect(() => {
    if (message) heading.current?.focus();
  }, [message]);
  async function submit(event: FormEvent<HTMLFormElement>, action: "correct" | "request") {
    event.preventDefault();
    if (pending || (action === "request" && !confirm)) return;
    const payload =
      action === "correct"
        ? {
            action,
            expectedVersion: profile.version,
            givenName,
            familyName,
            contactPreference: preference,
          }
        : { action, expectedVersion: profile.version, kind };
    const encoded = JSON.stringify(payload);
    const key = retry.current?.payload === encoded ? retry.current.key : crypto.randomUUID();
    retry.current = { payload: encoded, key };
    const parsed = patientRightsCommandSchema.safeParse({ ...payload, requestKey: key });
    if (!parsed.success) {
      setMessage(
        "Check the name fields and try again. Names must contain 1–100 characters without control characters.",
      );
      return;
    }
    setPending(true);
    setMessage("");
    const current = new AbortController();
    controller.current = current;
    try {
      const response = await fetch("/portal/rights/command", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(parsed.data),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: current.signal,
      });
      if (!active.current) return;
      if (response.status === 401) {
        onInvalidate();
        return;
      }
      if (response.status === 409) {
        setMessage(
          "The profile or request has changed, or no correction was made. Reload your account before trying again.",
        );
        return;
      }
      const result =
        response.status === 200 ? patientRightsResultSchema.safeParse(await response.json()) : null;
      if (!active.current) return;
      if (
        !result?.success ||
        result.data.outcome !== (action === "correct" ? "corrected" : "received")
      ) {
        setMessage(
          "No completion was confirmed. Retry the unchanged request to safely check its outcome.",
        );
        return;
      }
      retry.current = null;
      if (action === "correct") {
        onInvalidate();
        return;
      }
      setMessage(
        `Request received. Reference: ${result.data.reference}. This confirms receipt only, not export, restriction, closure, contact change or resolution. A reviewed identity and processing check is still required.`,
      );
      setConfirm(false);
    } catch {
      if (active.current && !current.signal.aborted)
        setMessage(
          "No completion was confirmed. Retry the unchanged request to safely check its outcome.",
        );
    } finally {
      if (active.current) setPending(false);
    }
  }
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-foreground">
        Profile correction and account requests
      </h2>
      <p className="mt-4 text-sm text-muted-foreground">
        Change only your names and operational contact preference here. No clinical information,
        documents or free-text notes are collected.
      </p>
      <form
        method="post"
        action="/portal/rights/command"
        onSubmit={(event) => void submit(event, "correct")}
        className="mt-6 space-y-5"
      >
        <fieldset disabled={pending} className="space-y-5">
          <legend className="text-lg text-foreground">Correct your profile</legend>
          <label className="block text-sm text-foreground">
            Given name
            <input
              required
              maxLength={100}
              value={givenName}
              onChange={(event) => setGivenName(event.target.value)}
              autoComplete="given-name"
              className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3"
            />
          </label>
          <label className="block text-sm text-foreground">
            Family name
            <input
              required
              maxLength={100}
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
              autoComplete="family-name"
              className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3"
            />
          </label>
          <label className="block text-sm text-foreground">
            Operational contact preference
            <select
              value={preference}
              onChange={(event) => setPreference(event.target.value as "email" | "whatsapp")}
              className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
          <p className="text-sm text-muted-foreground">
            This is not marketing consent. Your verified email and mobile number cannot be edited
            here.
          </p>
          <button
            type="submit"
            className="rounded-full bg-gold px-6 py-3 text-sm text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Checking…" : "Save correction"}
          </button>
        </fieldset>
      </form>
      <form
        method="post"
        action="/portal/rights/command"
        onSubmit={(event) => void submit(event, "request")}
        className="mt-10 space-y-5"
      >
        <fieldset disabled={pending} className="space-y-5">
          <legend className="text-lg text-foreground">
            Request help with your account or data
          </legend>
          <label className="block text-sm text-foreground">
            Request type
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as (typeof rightsRequestKinds)[number]);
                setConfirm(false);
              }}
              className="mt-2 block w-full rounded-xl border border-border bg-surface px-4 py-3"
            >
              {rightsRequestKinds.map((value) => (
                <option key={value} value={value}>
                  {requestLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <p id="rights-request-explanation" className="text-sm text-muted-foreground">
            We record this request privately for reviewed processing. Exports require secure
            delivery; contact changes require renewed identity checks and channel confirmation.
            Restriction and closure are not automatic. Do not send health information or identity
            documents by ordinary email or WhatsApp. Account support is not an emergency service.
          </p>
          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              required
              checked={confirm}
              onChange={(event) => setConfirm(event.target.checked)}
              aria-describedby="rights-request-explanation"
              className="mt-1"
            />
            I understand this records a request only.
          </label>
          <button
            type="submit"
            disabled={!confirm}
            className="rounded-full bg-gold px-6 py-3 text-sm text-primary-foreground disabled:opacity-50"
          >
            Record request
          </button>
        </fieldset>
      </form>
      <p
        ref={heading}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="mt-6 break-words text-sm text-muted-foreground"
      >
        {pending ? "Checking…" : message}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={onInvalidate}
        className="mt-6 text-gold underline underline-offset-4"
      >
        Reload account
      </button>
    </section>
  );
}
