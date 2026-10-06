import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const Route = createFileRoute("/account/verify")({
  head: () => ({
    meta: [
      { title: "Verify your invitation — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: VerifyInvitationPage,
});

function VerifyInvitationPage() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<"accepted" | "rejected" | "unavailable" | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pending && result) resultRef.current?.focus();
  }, [pending, result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setResult(null);
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: String(form.get("email") ?? ""),
          code: String(form.get("code") ?? ""),
        }),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      });
      setResult(
        response.status === 204 ? "accepted" : response.status === 503 ? "unavailable" : "rejected",
      );
    } catch {
      setResult("unavailable");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative">
      <Nav />
      <main className="container-x max-w-xl py-16 lg:py-24">
        <p className="label-caps text-gold">Private invitation</p>
        <h1 className="mt-6 font-serif text-4xl text-foreground sm:text-5xl">
          Verify your invitation
        </h1>
        <p className="mt-5 text-muted-foreground leading-relaxed">
          Enter the email address and six-digit code from your invitation. This page does not
          collect health information.
        </p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground"
            />
          </div>
          <div>
            <label htmlFor="invite-code" className="block text-sm font-medium text-foreground">
              Six-digit code
            </label>
            <input
              id="invite-code"
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
          <button
            type="submit"
            disabled={!hydrated || pending}
            className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Checking…" : "Verify code"}
          </button>
        </form>
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="mt-6 text-sm text-muted-foreground"
        >
          {pending && "Checking…"}
          {result === "accepted" && (
            <>
              <p>Your code was verified.</p>
              <Link to="/account/activate" className="text-gold underline">
                Continue to account setup
              </Link>
            </>
          )}
          {result === "rejected" &&
            "We could not verify those details. Check the email and code, or contact support if you need help."}
          {result === "unavailable" &&
            "Verification is temporarily unavailable. Please try again later."}
        </div>
        <Link to="/" className="mt-8 inline-block text-sm text-gold underline underline-offset-4">
          Back to home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
