import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import {
  activationCommandSchema,
  activationViewSchema,
  type ActivationView,
} from "@/domain/identity/pilot-activation";

export const Route = createFileRoute("/account/activate")({
  head: () => ({
    meta: [
      { title: "Set up your account — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ActivateAccountPage,
});

function ActivateAccountPage() {
  const [view, setView] = useState<ActivationView | null>(null);
  const [stage, setStage] = useState<
    "loading" | "unavailable" | "documents" | "profile" | "complete"
  >("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const profileHeading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const commandAttempt = useRef<{ payload: string; key: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await fetch("/account/activate/instruments", {
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal: controller.signal,
        });
        if (!result.ok) throw new Error();
        const parsed = activationViewSchema.parse(await result.json());
        if (!controller.signal.aborted) {
          setView(parsed);
          setStage("documents");
        }
      } catch {
        if (!controller.signal.aborted) setStage("unavailable");
      }
    })();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (stage === "profile") profileHeading.current?.focus();
    else if (stage !== "loading") heading.current?.focus();
  }, [stage]);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !view) return;
    setError(null);
    setFieldErrors({});
    const data = new FormData(event.currentTarget);
    const terms = view.documents.find((d) => d.instrumentId === "pilot-account-terms")!;
    const privacy = view.documents.find((d) => d.instrumentId === "pilot-privacy-notice")!;
    const input = {
      givenName: String(data.get("givenName") ?? ""),
      familyName: String(data.get("familyName") ?? ""),
      mobileE164: String(data.get("mobileE164") ?? ""),
      contactPreference: String(data.get("contactPreference") ?? ""),
      termsPublicationId: terms.publicationId,
      termsHash: terms.contentHash,
      privacyPublicationId: privacy.publicationId,
      privacyHash: privacy.contentHash,
      termsAccepted: data.get("termsAccepted") === "on",
      privacyAcknowledged: data.get("privacyAcknowledged") === "on",
    };
    const payload = JSON.stringify(input);
    if (!commandAttempt.current || commandAttempt.current.payload !== payload)
      commandAttempt.current = { payload, key: crypto.randomUUID() };
    const command = activationCommandSchema.safeParse({
      ...input,
      requestKey: commandAttempt.current.key,
    });
    if (!command.success) {
      const messages: Record<string, string> = {
        givenName: "Enter your given name (up to 100 characters).",
        familyName: "Enter your family name (up to 100 characters).",
        mobileE164: "Enter a mobile number with + and country code, without spaces.",
        termsAccepted:
          "Accept the account terms to create your account, or leave setup without accepting.",
        privacyAcknowledged:
          "Acknowledge receiving the privacy notice, or leave setup without acknowledging.",
      };
      setFieldErrors(
        Object.fromEntries(
          command.error.issues.map((issue) => [
            String(issue.path[0]),
            messages[String(issue.path[0])] ?? "Review this field.",
          ]),
        ),
      );
      setError(
        "Check your names, international mobile number and both account actions. Nothing has been saved.",
      );
      return;
    }
    setPending(true);
    try {
      const result = await fetch("/account/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": command.data.requestKey },
        body: JSON.stringify(command.data),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      });
      if (result.status === 204) setStage("complete");
      else
        setError(
          result.status === 422
            ? "Account setup could not be confirmed. Your invitation or document version may have changed. Reload to review the current documents."
            : "We could not confirm account setup. Try again with the same details; do not assume it was saved.",
        );
    } catch {
      setError(
        "We could not confirm account setup. Try again with the same details; do not assume it was saved.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Nav />
      <main className="container-x max-w-3xl py-16 lg:py-24">
        <p className="label-caps text-gold">Private account</p>
        <h1 ref={heading} tabIndex={-1} className="mt-6 font-serif text-4xl text-foreground">
          Set up your account
        </h1>
        {stage === "loading" && (
          <p role="status" className="mt-6">
            Loading account documents…
          </p>
        )}
        {stage === "unavailable" && (
          <p role="status" className="mt-6">
            Account setup is currently unavailable. Verify your invitation first. Setup also
            requires approved account terms and privacy documents.
          </p>
        )}
        {(stage === "documents" || stage === "profile") && view && (
          <>
            <p role="status" aria-live="polite" className="mt-4 text-sm">
              Step {stage === "documents" ? "1" : "2"} of 2 —{" "}
              {stage === "documents" ? "Review documents" : "Profile and account actions"}
            </p>
            <p className="mt-6 text-muted-foreground">
              Read the account terms and privacy notice before providing your details. You can print
              or save these exact versions. Declining leaves your invitation unused and creates no
              active profile.
            </p>
            {view.documents.map((document) => (
              <section
                key={document.publicationId}
                aria-labelledby={`document-${document.instrumentId}`}
                className="mt-8 rounded-xl border border-border p-6"
              >
                <h2 id={`document-${document.instrumentId}`} className="font-serif text-2xl">
                  {document.instrumentId === "pilot-account-terms"
                    ? "Account and service terms"
                    : "Transactional privacy notice"}
                </h2>
                <p className="mt-2 text-sm">
                  Version {document.version} · {document.locale} · Effective{" "}
                  {document.effectiveAt.slice(0, 10)}
                </p>
                <p className="mt-4 whitespace-pre-wrap leading-relaxed">{document.body}</p>
                <a
                  className="mt-4 inline-block text-gold underline"
                  download={`${document.instrumentId}-${document.version}.txt`}
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(document.body)}`}
                >
                  Save this exact version
                </a>
              </section>
            ))}
            {stage === "documents" && (
              <button
                className="mt-8 rounded-full bg-gold px-6 py-3 text-primary-foreground"
                onClick={() => setStage("profile")}
              >
                Continue to profile
              </button>
            )}
            {stage === "profile" && (
              <form onSubmit={submit} noValidate className="mt-8 space-y-5" aria-busy={pending}>
                <h2 ref={profileHeading} tabIndex={-1} className="font-serif text-2xl">
                  Your minimum profile
                </h2>
                <p>Verified email: {view.verifiedEmail}</p>
                <p className="text-sm text-muted-foreground">
                  Your mobile number is not yet verified and cannot be used for account recovery.
                  WhatsApp preference is for operational contact only, not marketing or clinical
                  consent. Do not enter health information.
                </p>
                <fieldset disabled={pending} className="space-y-5">
                  <legend className="sr-only">Profile and account actions</legend>
                  {(
                    [
                      { key: "givenName", label: "Given name", complete: "given-name" },
                      { key: "familyName", label: "Family name", complete: "family-name" },
                    ] as const
                  ).map((field) => (
                    <div key={field.key}>
                      <label htmlFor={field.key}>{field.label}</label>
                      <input
                        id={field.key}
                        name={field.key}
                        autoComplete={field.complete}
                        required
                        aria-invalid={!!fieldErrors[field.key]}
                        aria-describedby={fieldErrors[field.key] ? `${field.key}-error` : undefined}
                        maxLength={100}
                        className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3"
                      />
                      {fieldErrors[field.key] && (
                        <p id={`${field.key}-error`} className="mt-2 text-sm">
                          {fieldErrors[field.key]}
                        </p>
                      )}
                    </div>
                  ))}
                  <div>
                    <label htmlFor="mobileE164">
                      Mobile or WhatsApp number (international format)
                    </label>
                    <input
                      id="mobileE164"
                      name="mobileE164"
                      type="tel"
                      autoComplete="tel"
                      required
                      pattern="\+[1-9][0-9]{1,14}"
                      placeholder="+27821234567"
                      maxLength={16}
                      aria-invalid={!!fieldErrors.mobileE164}
                      aria-describedby={
                        fieldErrors.mobileE164 ? "mobile-help mobileE164-error" : "mobile-help"
                      }
                      className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3"
                    />
                    <p id="mobile-help" className="mt-2 text-sm">
                      Include + and country code, without spaces.
                    </p>
                    {fieldErrors.mobileE164 && (
                      <p id="mobileE164-error" className="mt-2 text-sm">
                        {fieldErrors.mobileE164}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contactPreference">Operational contact preference</label>
                    <select
                      id="contactPreference"
                      name="contactPreference"
                      className="mt-2 block rounded-xl border border-border bg-surface px-4 py-3"
                    >
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <label className="flex items-start gap-3">
                    <input
                      id="termsAccepted"
                      type="checkbox"
                      name="termsAccepted"
                      required
                      aria-invalid={!!fieldErrors.termsAccepted}
                      aria-describedby={
                        fieldErrors.termsAccepted ? "termsAccepted-error" : undefined
                      }
                      className="mt-1"
                    />
                    <span>
                      I accept the account and service terms, version{" "}
                      {
                        view.documents.find((d) => d.instrumentId === "pilot-account-terms")
                          ?.version
                      }
                      .
                    </span>
                  </label>
                  {fieldErrors.termsAccepted && (
                    <p id="termsAccepted-error" className="text-sm">
                      {fieldErrors.termsAccepted}
                    </p>
                  )}
                  <label className="flex items-start gap-3">
                    <input
                      id="privacyAcknowledged"
                      type="checkbox"
                      name="privacyAcknowledged"
                      required
                      aria-invalid={!!fieldErrors.privacyAcknowledged}
                      aria-describedby={
                        fieldErrors.privacyAcknowledged ? "privacyAcknowledged-error" : undefined
                      }
                      className="mt-1"
                    />
                    <span>
                      I acknowledge receiving the transactional privacy notice, version{" "}
                      {
                        view.documents.find((d) => d.instrumentId === "pilot-privacy-notice")
                          ?.version
                      }
                      .
                    </span>
                  </label>
                  {fieldErrors.privacyAcknowledged && (
                    <p id="privacyAcknowledged-error" className="text-sm">
                      {fieldErrors.privacyAcknowledged}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="rounded-full bg-gold px-6 py-3 text-primary-foreground"
                  >
                    {pending ? "Saving…" : "Set up account"}
                  </button>
                </fieldset>
                {pending && <p role="status">Saving your account details and document actions…</p>}
                {error && (
                  <div
                    ref={errorSummary}
                    tabIndex={-1}
                    role="alert"
                    className="rounded-xl border border-border p-4"
                  >
                    {error}
                    {Object.keys(fieldErrors).length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {Object.entries(fieldErrors).map(([field, message]) => (
                          <li key={field}>
                            <a
                              href={`#${field}`}
                              className="underline"
                              onClick={(event) => {
                                event.preventDefault();
                                document.getElementById(field)?.focus();
                              }}
                            >
                              {message}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </form>
            )}
          </>
        )}
        {stage === "complete" && (
          <div role="status" className="mt-8">
            <p>
              Your account profile and both document actions have been saved. No payment or clinical
              consent has been collected.
            </p>
            <Link to="/account/sign-in" className="mt-4 inline-block text-gold underline">
              Sign in to continue
            </Link>
          </div>
        )}
        <Link to="/" className="mt-8 inline-block text-gold underline">
          Back to home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
