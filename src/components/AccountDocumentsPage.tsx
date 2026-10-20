import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { activationViewSchema, type ActivationView } from "@/domain/identity/pilot-activation";
import { AccountDocumentLinks } from "@/components/AccountDocumentLinks";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
export function AccountDocumentsPage() {
  const [view, setView] = useState<ActivationView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking your verified document-review access…");
  const [done, setDone] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const key = useRef<string | null>(null);
  const result = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/account/documents/current", {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: abort.signal,
    })
      .then(async (response) => {
        if (response.status !== 200) throw Error("unavailable");
        const value = activationViewSchema.parse(await response.json());
        if (!abort.signal.aborted) {
          setView(value);
          setMessage("");
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setMessage(
            "Document review is unavailable or expired. Sign in again to continue; no new acceptance is assumed.",
          );
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!busy && message) result.current?.focus();
  }, [busy, message]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!view || busy || !terms || !privacy) return;
    setBusy(true);
    setMessage("Saving your document actions…");
    key.current ??= crypto.randomUUID();
    const t = view.documents.find((d) => d.instrumentId === "pilot-account-terms")!;
    const p = view.documents.find((d) => d.instrumentId === "pilot-privacy-notice")!;
    try {
      const response = await fetch("/account/documents", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          requestKey: key.current,
          termsPublicationId: t.publicationId,
          termsHash: t.contentHash,
          privacyPublicationId: p.publicationId,
          privacyHash: p.contentHash,
          termsAccepted: "true",
          privacyAcknowledged: "true",
        }),
      });
      if (response.status !== 204) throw Error("unconfirmed");
      setDone(true);
      setView(null);
      setMessage(
        "Your document actions are saved. Continue to your account—no additional email code is needed.",
      );
    } catch {
      setMessage(
        "We could not confirm completion. Try again with the same choices, or sign in again if access expired. Your previous receipts remain unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Nav />
      <main className="container-x max-w-2xl py-20">
        <h1 className="font-serif text-4xl">Review your account documents</h1>
        <p className="mt-5">
          The company responsible for Meneer Health has changed. Review the current terms and
          privacy notice before continuing. Your earlier acknowledgements remain part of the record;
          we do not treat them as acceptance of the new company documents. Medical consent and
          payments remain separate.
        </p>
        {view && !done ? (
          <form className="mt-6" onSubmit={submit}>
            <p>Verified email: {view.verifiedEmail}</p>
            <AccountDocumentLinks documents={view.documents} />
            <fieldset disabled={busy} className="mt-6 space-y-5">
              <legend className="sr-only">Current document actions</legend>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  required
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
                I accept the current account and service terms, version{" "}
                {view.documents.find((d) => d.instrumentId === "pilot-account-terms")?.version}.
              </label>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  required
                  checked={privacy}
                  onChange={(e) => setPrivacy(e.target.checked)}
                />
                I acknowledge receiving the current privacy notice, version{" "}
                {view.documents.find((d) => d.instrumentId === "pilot-privacy-notice")?.version}.
              </label>
              <button
                type="submit"
                className="action-primary"
                disabled={busy || !terms || !privacy}
              >
                {busy ? "Saving…" : "Save and continue"}
              </button>
            </fieldset>
          </form>
        ) : null}
        <p ref={result} tabIndex={-1} role="status" aria-live="polite" className="mt-6">
          {message}
        </p>
        <Link to={done ? "/portal" : "/account/sign-in"} className="action-secondary mt-6">
          {done ? "Open your private account" : "Back to sign-in"}
        </Link>
      </main>
      <Footer />
    </>
  );
}
