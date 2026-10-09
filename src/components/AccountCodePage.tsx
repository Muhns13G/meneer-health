import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { useActionToast } from "@/hooks/use-action-toast";

export function AccountCodePage({ mode }: { mode: "sign-in" | "recover" }) {
  const { notify, dismiss } = useActionToast();
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const recovery = mode === "recover";
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const previousStage = useRef(stage);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    } else if (!pending && message) {
      resultRef.current?.focus();
    }
  }, [stage, pending, message]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    dismiss();
    try {
      const response = await fetch(`/account/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          action: stage,
          email: stage === "request" ? String(form.get("email") ?? "") : email,
          ...(stage === "verify" ? { code: String(form.get("code") ?? "") } : {}),
        }),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      });
      if (stage === "request" && response.status === 202) {
        setEmail(String(form.get("email") ?? ""));
        setStage("verify");
        notify("codeRequested");
      } else if (stage === "verify" && response.status === 204) {
        setCompleted(true);
        setMessage(
          recovery
            ? "Recovery is complete. All previous sessions have been revoked. You can sign in again."
            : "You are signed in. Continue to your private account.",
        );
      } else {
        setMessage(
          response.status === 503
            ? "Temporarily unavailable. Please try again later."
            : "We could not verify those details. Please check your code or contact support.",
        );
      }
    } catch {
      setMessage("Temporarily unavailable. Please try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Nav />
      <main className="container-x max-w-xl py-16 lg:py-24">
        <p className="label-caps text-gold">Private account</p>
        <h1 className="mt-6 font-serif text-4xl text-foreground sm:text-5xl">
          {recovery ? "Recover your account" : "Sign in to Meneer"}
        </h1>
        <p className="mt-5 text-muted-foreground leading-relaxed">
          {recovery
            ? "Request a code to revoke previous sessions. Recovery does not change your pilot access."
            : "Use the email address associated with your invited account. Public registration is not available."}
        </p>
        {!completed && (
          <form
            ref={formRef}
            method="post"
            action={`/account/${mode}`}
            className="mt-8 space-y-5"
            onSubmit={submit}
          >
            {stage === "request" ? (
              <div>
                <label
                  htmlFor="account-email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <input
                  key="email"
                  id="account-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="account-code" className="block text-sm font-medium text-foreground">
                  Six-digit code
                </label>
                <input
                  key="code"
                  id="account-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={!hydrated || pending}
              className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {pending
                ? "Checking…"
                : stage === "request"
                  ? "Send code"
                  : recovery
                    ? "Complete recovery"
                    : "Verify and sign in"}
            </button>
          </form>
        )}
        {stage === "verify" && !completed && (
          <p className="mt-5 text-sm text-muted-foreground">
            Enter the latest code from your email. It is valid for 15 minutes.
          </p>
        )}
        {stage === "verify" && !completed && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStage("request");
              setMessage("");
              dismiss();
            }}
            className="mt-5 block text-sm text-gold underline underline-offset-4"
          >
            Use another email address
          </button>
        )}
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="mt-6 text-sm text-muted-foreground"
        >
          {pending ? "Checking…" : message}
        </div>
        {completed && !recovery ? (
          <Link to="/portal" className="action-primary mt-6">
            Open your private account
          </Link>
        ) : null}
        <Link
          to={recovery ? "/account/sign-in" : "/account/recover"}
          className="mt-8 inline-block text-sm text-gold underline underline-offset-4"
        >
          {recovery ? "Back to sign-in" : "Need account recovery?"}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
