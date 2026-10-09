import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { workforceEnrollmentView as enrollmentView } from "@/lib/workforce-enrollment-view";
import { StaffDestinationApprovalPanel } from "./StaffDestinationApprovalPanel";

const sessionView = z
  .object({ role: z.string(), purpose: z.string(), expiresAt: z.string() })
  .strict();
const contextChoicesView = z
  .object({
    contexts: z
      .array(
        z
          .object({
            subjectId: z.uuid(),
            tenantId: z.uuid(),
            role: z.enum([
              "operations",
              "support",
              "auditor",
              "admin",
              "release",
              "clinician",
              "pharmacy",
            ]),
            purpose: z.string(),
          })
          .strict(),
      )
      .min(1)
      .max(32),
  })
  .strict();
const fieldClass =
  "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground";

export function WorkforceSignInPage() {
  const [stage, setStage] = useState<"request" | "verify" | "mfa" | "context" | "complete">(
    "request",
  );
  const [contexts, setContexts] = useState<z.infer<typeof contextChoicesView>["contexts"]>([]);
  const [email, setEmail] = useState("");
  const [invitationMode, setInvitationMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState("");
  const [enrollment, setEnrollment] = useState<z.infer<typeof enrollmentView>["enrollment"]>(null);
  const [session, setSession] = useState<z.infer<typeof sessionView> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const requestKey = useRef<string | null>(null);
  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (stage !== "request") formRef.current?.querySelector<HTMLElement>("input, select")?.focus();
  }, [stage]);
  useEffect(() => {
    // A successful step keeps focus on its new code field; failures and session results are focused.
    if (
      !busy &&
      message &&
      (stage === "request" || stage === "complete" || message.startsWith("Access could"))
    ) {
      status.current?.focus();
    }
  }, [busy, message, stage]);

  async function post(path: string, fields: Record<string, string>) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
    });
  }
  async function readSession() {
    const response = await fetch("/staff/session", {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new Error("SESSION_UNAVAILABLE");
    setSession(sessionView.parse(await response.json()));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      if (stage === "request") {
        const nextEmail = String(fields.get("email") ?? "");
        const response = await post("/staff/sign-in", { action: "request", email: nextEmail });
        if (response.status !== 202) throw new Error("UNAVAILABLE");
        setEmail(nextEmail);
        setInvitationMode(false);
        setStage("verify");
        setMessage(
          "If an eligible account exists, a six-digit code has been sent. If the email says invitation code, select the staff invitation checkbox below.",
        );
      } else if (stage === "verify") {
        const response = await post("/staff/sign-in", {
          action: fields.has("invitation") ? "invitation" : "verify",
          email,
          code: String(fields.get("code") ?? ""),
        });
        if (!response.ok) throw new Error("VERIFY_FAILED");
        setEnrollment(enrollmentView.parse(await response.json()).enrollment);
        setStage("mfa");
      } else if (stage === "mfa") {
        const response = await post("/staff/mfa", { code: String(fields.get("code") ?? "") });
        if (response.status === 200) {
          const next = contextChoicesView.parse(await response.json()).contexts;
          setEnrollment(null);
          setContexts(next);
          setStage("context");
          setMessage(
            "Authenticator verified. Choose one approved work context; staff access is not active yet.",
          );
          return;
        }
        if (response.status !== 204) throw new Error("VERIFY_FAILED");
        setEnrollment(null);
        await readSession();
        setStage("complete");
      } else if (stage === "context") {
        const selected = contexts[Number(fields.get("context"))];
        if (!selected) throw new Error("CONTEXT_UNAVAILABLE");
        const response = await post("/staff/context", {
          tenantId: selected.tenantId,
          role: selected.role,
        });
        if (response.status !== 204) throw new Error("CONTEXT_UNAVAILABLE");
        setContexts([]);
        await readSession();
        setStage("complete");
        setMessage("Approved work context active. Only assigned work is available.");
      }
    } catch {
      setMessage(
        "Access could not be verified. Check your code or contact the security administrator. No staff access has been granted by this screen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function action(kind: "renew" | "sign-out" | "invite" | "resume", form?: HTMLFormElement) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (kind === "resume") {
        await readSession();
        setStage("complete");
        return;
      }
      let response: Response;
      if (kind === "invite") {
        requestKey.current ??= crypto.randomUUID();
        response = await post("/staff/invite", {
          email: String(new FormData(form!).get("email") ?? ""),
          requestKey: requestKey.current,
        });
      } else
        response = await post(kind === "renew" ? "/staff/session" : "/staff/sign-out", {
          action: kind,
        });
      if (response.status !== 204) throw new Error("ACTION_REJECTED");
      if (kind === "sign-out") {
        setSession(null);
        setEnrollment(null);
        setContexts([]);
        setStage("request");
        setEmail("");
        setMessage("You are signed out.");
      } else if (kind === "renew") {
        await readSession();
        setMessage("Session renewed within its original time limit.");
      } else {
        requestKey.current = null;
        form?.reset();
        setMessage(
          "The provider accepted the invitation request. This is not proof of mailbox delivery or staff activation.",
        );
      }
    } catch {
      setMessage(
        "The request could not be confirmed. Contact the security administrator; do not blindly resend an invitation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="container-x max-w-xl py-16">
      <p className="label-caps text-gold">Individual workforce access</p>
      <h1 className="mt-6 font-serif text-4xl text-foreground">Staff sign-in</h1>
      <p className="mt-5 text-muted-foreground">
        Reviewed staff accounts only. Email verification does not grant access; an authenticator and
        current role approval are required. MFA recovery must be handled by a separate authorised
        administrator.
      </p>
      {stage !== "complete" ? (
        <form key={stage} ref={formRef} onSubmit={submit} className="mt-8 space-y-5">
          {stage === "request" ? (
            <div>
              <label htmlFor="staff-email">Staff email address</label>
              <input
                className={fieldClass}
                id="staff-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </div>
          ) : stage === "context" ? (
            <div>
              <label htmlFor="staff-context">Approved work context</label>
              <select
                id="staff-context"
                name="context"
                required
                className={fieldClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose your work context
                </option>
                {contexts.map((context, index) => (
                  <option key={`${context.tenantId}:${context.role}`} value={index}>
                    {context.role} — {context.purpose} — {context.tenantId}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-muted-foreground">
                This selection does not create permissions. To change context later, sign out and
                verify again.
              </p>
            </div>
          ) : (
            <>
              {stage === "mfa" && enrollment ? (
                <section aria-label="Authenticator setup">
                  <h2 className="font-serif text-2xl">Set up your authenticator</h2>
                  {enrollment.qrCode.startsWith("data:image/svg+xml") ? (
                    <img
                      src={enrollment.qrCode}
                      alt="Scan this setup code with your authenticator app"
                      className="mt-4 h-48 w-48"
                    />
                  ) : null}
                  <p className="mt-4 break-all">
                    Manual setup key: <code>{enrollment.secret}</code>
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Keep this key private. Enter a fresh code below to finish setup.
                  </p>
                </section>
              ) : null}
              <div>
                <label htmlFor="staff-code">
                  {stage === "mfa" ? "Authenticator code" : "Six-digit email code"}
                </label>
                <input
                  className={fieldClass}
                  id="staff-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </div>
              {stage === "verify" ? (
                <label className="flex gap-3">
                  <input name="invitation" type="checkbox" defaultChecked={invitationMode} />
                  This code came from a staff invitation.
                </label>
              ) : null}
            </>
          )}
          <button
            disabled={!hydrated || busy}
            className="rounded-full bg-gold px-6 py-3 text-primary-foreground disabled:opacity-50"
          >
            {busy
              ? "Checking…"
              : stage === "request"
                ? "Send code"
                : stage === "verify"
                  ? "Verify email"
                  : stage === "context"
                    ? "Use approved context"
                    : "Verify authenticator"}
          </button>
          {stage === "request" ? (
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                disabled={!hydrated || busy}
                className="rounded-full border border-border px-6 py-3"
                onClick={() => {
                  const form = formRef.current;
                  if (!form?.reportValidity()) return;
                  setEmail(String(new FormData(form).get("email") ?? ""));
                  setInvitationMode(true);
                  setStage("verify");
                }}
              >
                I already have an invitation code
              </button>
              <button
                type="button"
                disabled={!hydrated || busy}
                className="rounded-full border border-border px-6 py-3"
                onClick={() => void action("resume")}
              >
                Resume existing session
              </button>
            </div>
          ) : null}
        </form>
      ) : (
        <section className="mt-8 space-y-5" aria-label="Staff session">
          <p>
            Staff authentication complete. Active role: {session?.role}. This does not grant
            unassigned case access.
          </p>
          {session?.role === "operations" ? (
            <a href="/staff/queue" className="underline">
              Open assigned queue
            </a>
          ) : (
            <p>This role does not grant operations queue access.</p>
          )}
          <p>Session idle deadline: {session?.expiresAt}.</p>
          {session?.role === "admin" ? (
            <a href="/staff/alerts" className="underline">
              Review operations alerts
            </a>
          ) : null}
          <button
            disabled={busy}
            onClick={() => void action("renew")}
            className="rounded-full border border-border px-6 py-3"
          >
            Renew session
          </button>
          <button
            disabled={busy}
            onClick={() => void action("sign-out")}
            className="ml-3 rounded-full border border-border px-6 py-3"
          >
            Sign out
          </button>
          <p>
            To change work context, sign out here and sign in again with your individual account.
          </p>
          <a href="/staff/support" className="underline">
            Open assigned support work
          </a>
          {session?.role === "admin" && session.purpose === "security_administration" ? (
            <StaffDestinationApprovalPanel key={session.expiresAt} />
          ) : null}
          {session?.role === "admin" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void action("invite", event.currentTarget);
              }}
              className="space-y-4"
            >
              <h2 className="font-serif text-2xl">Invite reviewed staff</h2>
              <p>
                The recipient must already have independently approved, time-limited membership and
                an assigned security-administration scope. This does not create roles.
              </p>
              <label htmlFor="staff-invite-email">Recipient email</label>
              <input
                className={fieldClass}
                id="staff-invite-email"
                type="email"
                name="email"
                required
                maxLength={254}
              />
              <button disabled={busy} className="rounded-full border border-border px-6 py-3">
                Send staff invitation
              </button>
            </form>
          ) : null}
        </section>
      )}
      <p
        ref={status}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="mt-6 text-muted-foreground"
      >
        {busy ? "Checking workforce access…" : message}
      </p>
    </main>
  );
}
