import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const Route = createFileRoute("/account/sign-out")({
  head: () => ({
    meta: [
      { title: "Sign out — Meneer" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: SignOutPage,
});

function SignOutPage() {
  const [state, setState] = useState<"ready" | "pending" | "done" | "failed">("ready");
  async function signOut() {
    setState("pending");
    try {
      const response = await fetch("/account/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "action=sign-out",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      });
      setState(response.status === 204 ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }
  return (
    <div className="relative">
      <Nav />
      <main className="container-x max-w-xl py-16 lg:py-24">
        <h1 className="font-serif text-4xl text-foreground">Sign out</h1>
        <p className="mt-5 text-muted-foreground">End this account session on this device.</p>
        <button
          type="button"
          disabled={state === "pending" || state === "done"}
          onClick={signOut}
          className="mt-8 rounded-full bg-gold px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {state === "pending" ? "Signing out…" : "Sign out"}
        </button>
        <div role="status" aria-live="polite" className="mt-6 text-sm text-muted-foreground">
          {state === "done" && "You have signed out."}
          {state === "failed" &&
            "Sign-out could not be confirmed. Please try again or contact support."}
        </div>
        <Link to="/" className="mt-8 inline-block text-sm text-gold underline underline-offset-4">
          Back to home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
