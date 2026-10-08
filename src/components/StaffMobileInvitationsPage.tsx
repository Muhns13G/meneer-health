import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  mobileInvitationCommandSchema,
  mobileInvitationPageSchema,
  mobileInvitationResultSchema,
  type MobileInvitationCommand,
  type MobileInvitationPage,
} from "@/application/identity/mobile-invitation";

const emptyForm = {
  givenName: "",
  familyName: "",
  phone: "",
  provenanceReference: "",
  contactAuthorityReference: "",
};
const buttonClass = "rounded-full border border-border px-5 py-3 disabled:opacity-50";
function failure(status: number) {
  if (status === 401 || status === 403)
    return "Access unavailable. Sign in with staff MFA and current invitation scope.";
  if (status === 409)
    return "Invitation changed or contact conflicts. Refresh and review; do not resend blindly.";
  if (status === 429)
    return "Reservation or request limit reached. No SMS was sent. Wait or ask the scope owner.";
  return "Invitation register unavailable. No private records are displayed.";
}

export function StaffMobileInvitationsPage() {
  const [page, setPage] = useState<MobileInvitationPage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading invitation register…");
  const requestRef = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const deadline = useRef(0);

  const clearPrivate = useCallback(() => {
    setPage(null);
    setForm(emptyForm);
    setConfirmed(false);
  }, []);
  const expire = useCallback(() => {
    ++sequence.current;
    requestRef.current?.abort();
    clearPrivate();
    setBusy(false);
    setMessage(failure(401));
  }, [clearPrivate]);
  const load = useCallback(
    async (afterId: string | null = null, command?: MobileInvitationCommand) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      const current = ++sequence.current;
      setBusy(true);
      clearPrivate();
      setMessage(command ? "Recording invitation command…" : "Loading invitation register…");
      const post = (path: string, fields: Record<string, string>) =>
        fetch(`/staff/mobile-invitations/${path}`, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fields),
        });
      try {
        if (command) {
          const response = await post(
            "command",
            Object.fromEntries(Object.entries(command).map(([key, value]) => [key, String(value)])),
          );
          if (current !== sequence.current) return;
          if (!response.ok) {
            setMessage(failure(response.status));
            return;
          }
          const result = mobileInvitationResultSchema.parse(await response.json());
          if (
            result.action !== command.action ||
            (command.action !== "create" && result.invitationId !== command.invitationId)
          )
            throw new Error("Unexpected invitation result");
        }
        const response = await post("read", { afterId: afterId ?? "" });
        if (current !== sequence.current) return;
        if (!response.ok) {
          setMessage(failure(response.status));
          return;
        }
        const parsed = mobileInvitationPageSchema.parse(await response.json());
        if (current !== sequence.current) return;
        const expires = Date.parse(response.headers.get("X-Session-Expires-At") ?? "");
        if (!Number.isFinite(expires) || expires <= Date.now()) {
          expire();
          return;
        }
        deadline.current = expires;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(expire, Math.min(expires - Date.now(), 900_000));
        setPage(parsed);
        setMessage(
          command
            ? "Command recorded. Register refreshed. No SMS was sent."
            : `${parsed.invitations.length} invitations shown. Phone numbers remain masked. Sending is not connected.`,
        );
      } catch {
        if (current === sequence.current && !controller.signal.aborted)
          setMessage(
            command
              ? "Command result uncertain. Refresh before taking another action. No automatic retry was sent."
              : failure(503),
          );
      } finally {
        if (current === sequence.current) setBusy(false);
      }
    },
    [clearPrivate, expire],
  );
  useEffect(() => {
    void load();
    const sequenceRef = sequence;
    const activeRequest = requestRef;
    const activeTimer = timer;
    window.addEventListener("pagehide", expire);
    return () => {
      ++sequenceRef.current;
      activeRequest.current?.abort();
      if (activeTimer.current) clearTimeout(activeTimer.current);
      window.removeEventListener("pagehide", expire);
    };
  }, [load, expire]);
  useEffect(() => {
    if (!busy) statusRef.current?.focus();
  }, [busy, message]);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deadline.current <= Date.now()) {
      expire();
      return;
    }
    if (!confirmed) {
      setMessage("Confirm that this participant expects an invitation.");
      return;
    }
    const parsed = mobileInvitationCommandSchema.safeParse({
      action: "create",
      requestKey: crypto.randomUUID(),
      ...form,
    });
    if (!parsed.success) {
      setMessage(
        "Check names, the international phone format and both private evidence references.",
      );
      return;
    }
    void load(null, parsed.data);
  }
  function act(
    row: MobileInvitationPage["invitations"][number],
    action: "review" | "send" | "resend" | "revoke",
  ) {
    if (deadline.current <= Date.now()) {
      expire();
      return;
    }
    if (action !== "revoke" && !confirmed) {
      setMessage("Confirm current contact authority before review or reservation.");
      return;
    }
    void load(null, {
      action,
      invitationId: row.id,
      expectedVersion: row.version,
      requestKey: crypto.randomUUID(),
    });
  }
  return (
    <main className="container-x max-w-4xl py-16">
      <h1 className="font-serif text-4xl">Mobile pilot invitations</h1>
      <p className="mt-4 text-muted-foreground">
        Prepare only expected pilot invitations. A reservation is not an SMS, delivery, registration
        or consent. Sending is not connected yet.
      </p>
      <nav aria-label="Staff navigation" className="my-5 flex flex-wrap gap-5">
        <a href="/staff/sign-in" className="underline">
          Staff session and sign-out
        </a>
        <a href="/staff/queue" className="underline">
          Operations queue
        </a>
      </nav>
      <p
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="my-5"
      >
        {message}
      </p>
      <button className={buttonClass} disabled={busy} onClick={() => void load()}>
        Refresh invitation register
      </button>
      {page ? (
        <>
          <label className="my-6 flex gap-3 items-start">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>
              I have current contact authority and confirm the intended participant expects this
              pilot invitation.
            </span>
          </label>
          <form onSubmit={create} className="my-8 space-y-4" aria-label="Prepare invitation">
            <fieldset disabled={busy}>
              <legend className="font-serif text-2xl">New participant invitation</legend>
              <p id="mobile-invitation-help" className="my-3 text-sm text-muted-foreground">
                Use an international phone number, for example +27 followed by the number without
                its leading zero. Evidence references are UUIDs from your private
                authority/provenance records; do not paste documents or health information.
              </p>
              {(
                [
                  ["givenName", "Given name", "text"],
                  ["familyName", "Surname", "text"],
                  ["phone", "Phone number (international)", "tel"],
                  ["provenanceReference", "Contact provenance reference", "text"],
                  ["contactAuthorityReference", "Invitation authority reference", "text"],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key} className="my-4">
                  <label htmlFor={`mobile-${key}`} className="block">
                    {label}
                  </label>
                  <input
                    id={`mobile-${key}`}
                    type={type}
                    value={form[key]}
                    required
                    autoComplete="off"
                    maxLength={key === "phone" ? 16 : key.endsWith("Reference") ? 36 : 100}
                    aria-describedby="mobile-invitation-help"
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, [key]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3"
                  />
                </div>
              ))}
              <button className={buttonClass} type="submit" disabled={busy || !confirmed}>
                Save draft invitation
              </button>
            </fieldset>
          </form>
          <h2 className="font-serif text-2xl">Private register</h2>
          <ul className="mt-5 space-y-5">
            {page.invitations.map((row) => {
              const terminal = ["converted", "expired", "revoked", "declined"].includes(row.status);
              const expired = row.expiresAt !== null && Date.parse(row.expiresAt) <= Date.now();
              return (
                <li key={row.id} className="rounded-xl border border-border p-5 break-words">
                  <h3 className="font-serif text-xl">
                    {row.givenName} {row.familyName}
                  </h3>
                  <p className="my-3">
                    Phone {row.maskedPhone}. Status: {row.status}. Version {row.version}.{" "}
                    {row.reviewed ? "Reviewed." : "Review required."}{" "}
                    {row.sendReserved
                      ? "Send reserved; no SMS dispatch in this task."
                      : "No send reservation."}
                  </p>
                  {row.expiresAt ? (
                    <p>
                      Link expiry:{" "}
                      <time dateTime={row.expiresAt}>
                        {new Date(row.expiresAt).toLocaleString("en-ZA")}
                      </time>
                    </p>
                  ) : null}
                  {!terminal ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {row.status === "draft" && !row.reviewed ? (
                        <button
                          className={buttonClass}
                          disabled={busy || !confirmed}
                          onClick={() => act(row, "review")}
                        >
                          Review invitation for {row.givenName}
                        </button>
                      ) : null}
                      {row.reviewed && !expired && page.reservationEnabled ? (
                        <button
                          className={buttonClass}
                          disabled={busy || !confirmed}
                          onClick={() => act(row, row.sendReserved ? "resend" : "send")}
                        >
                          {row.sendReserved ? "Reserve replacement" : "Reserve send"} for{" "}
                          {row.givenName}
                        </button>
                      ) : null}
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => act(row, "revoke")}
                      >
                        Revoke invitation for {row.givenName}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {!page.reservationEnabled ? (
            <p className="my-5">
              Reservations are disabled until the scope owner configures a bounded quota. No SMS can
              be sent from this screen.
            </p>
          ) : null}
          {page.nextId ? (
            <button
              className={`${buttonClass} mt-5`}
              disabled={busy}
              onClick={() => void load(page.nextId)}
            >
              Next invitation page
            </button>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
