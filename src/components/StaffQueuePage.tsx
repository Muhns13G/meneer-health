import { useEffect, useRef, useState } from "react";
import { operationsStateSchema } from "../../contracts/operations";
import {
  queuePageSchema,
  queueDetailSchema,
  type QueuePage,
  type QueueDetail,
  type QueueFilter,
} from "@/application/operations/queue-projection";

const labels = Object.fromEntries(
  operationsStateSchema.options.map((state) => [state, state.replaceAll("_", " ")]),
);
const buttonClass = "rounded-full border border-border px-5 py-3 disabled:opacity-50";
function failure(status: number) {
  if (status === 401) return "Sign in with staff MFA to view assigned cases.";
  if (status === 403)
    return "Access is unavailable. Check your session and assigned operations scope.";
  if (status === 429) return "Too many requests. Wait before retrying.";
  return "The queue is temporarily unavailable. No case information is displayed.";
}

export function StaffQueuePage() {
  const [state, setState] = useState<QueueFilter["state"]>(null);
  const [page, setPage] = useState<QueuePage | null>(null);
  const [detail, setDetail] = useState<QueueDetail | null>(null);
  const [message, setMessage] = useState("Loading assigned cases…");
  const [busy, setBusy] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const sequence = useRef(0);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(filter: QueueFilter, caseId?: string) {
    requestRef.current?.abort();
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    const controller = new AbortController();
    requestRef.current = controller;
    const current = ++sequence.current;
    setBusy(true);
    setDetail(null);
    // Drop all prior private data before every read, including denial/expiry paths.
    setPage(null);
    setMessage(caseId ? "Loading assigned case…" : "Loading assigned cases…");
    try {
      const response = await fetch(caseId ? "/staff/queue/detail" : "/staff/queue/read", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(
          caseId
            ? { caseId }
            : {
                state: filter.state ?? "",
                afterCreatedAt: filter.cursor?.createdAt ?? "",
                afterId: filter.cursor?.id ?? "",
              },
        ),
      });
      if (current !== sequence.current) return;
      if (!response.ok) {
        setMessage(failure(response.status));
        return;
      }
      const value: unknown = await response.json();
      if (current !== sequence.current) return;
      const deadline = Date.parse(response.headers.get("X-Session-Expires-At") ?? "");
      if (Number.isFinite(deadline) && deadline <= Date.now()) {
        setMessage(failure(401));
        return;
      }
      expiryTimer.current = setTimeout(
        () => {
          ++sequence.current;
          requestRef.current?.abort();
          setPage(null);
          setDetail(null);
          setBusy(false);
          setMessage(failure(401));
        },
        Number.isFinite(deadline) ? Math.min(deadline - Date.now(), 900_000) : 900_000,
      );
      if (caseId) {
        const parsed = queueDetailSchema.parse(value);
        if (parsed.caseId !== caseId) throw new Error("Unexpected case");
        setDetail(parsed);
        setMessage("Assigned case loaded. Contacts remain masked.");
      } else {
        const parsed = queuePageSchema.parse(value);
        setPage(parsed);
        setMessage(
          parsed.cases.length
            ? `${parsed.cases.length} assigned cases on this page.`
            : "No assigned cases match this filter.",
        );
      }
    } catch {
      if (current === sequence.current && !controller.signal.aborted) setMessage(failure(503));
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    void load({ state: null, cursor: null });
    return () => {
      requestRef.current?.abort();
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
    };
  }, []);
  useEffect(() => {
    if (detail) detailHeading.current?.focus();
  }, [detail]);

  return (
    <main className="container-x max-w-5xl py-16">
      <h1 className="font-serif text-4xl">Assigned operations queue</h1>
      <p className="mt-4 text-muted-foreground">
        Only your current assigned cases are shown. Case state is not clinical approval or payment
        clearance.
      </p>
      <a href="/staff/sign-in" className="mt-4 inline-block underline">
        Staff session and sign-out
      </a>
      <form
        className="mt-8 flex flex-wrap items-end gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void load({ state, cursor: null });
        }}
      >
        <div>
          <label htmlFor="queue-state" className="block">
            Operational state
          </label>
          <select
            id="queue-state"
            value={state ?? ""}
            disabled={busy}
            className="mt-2 rounded border border-border bg-surface p-3"
            onChange={(event) => {
              setState(event.target.value ? operationsStateSchema.parse(event.target.value) : null);
              setPage(null);
              setDetail(null);
              setMessage("Apply the filter to load assigned cases.");
            }}
          >
            <option value="">All assigned states</option>
            {operationsStateSchema.options.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </div>
        <button className={buttonClass} disabled={busy} type="submit">
          Apply filter / refresh
        </button>
      </form>
      <p role="status" aria-live="polite" className="mt-6">
        {message}
      </p>
      {page && (
        <section aria-label="Assigned cases" className="mt-6" aria-busy={busy}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">
                Assigned cases, oldest first. Maximum 25 per page.
              </caption>
              <thead>
                <tr>
                  {[
                    "Case reference",
                    "State",
                    "Assigned owner",
                    "Created",
                    "Facts",
                    "Exception",
                    "Details",
                  ].map((label) => (
                    <th className="p-3" scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {page.cases.map((item) => (
                  <tr key={item.caseId} className="border-t border-border">
                    <th scope="row" className="p-3 font-mono text-xs break-all">
                      {item.caseId}
                    </th>
                    <td className="p-3">{labels[item.state]}</td>
                    <td className="p-3">You</td>
                    <td className="p-3">
                      <time dateTime={item.createdAt}>{item.createdAt}</time>
                    </td>
                    <td className="p-3">
                      Profile {item.profileActive ? "active" : "not active"}; email{" "}
                      {item.emailVerified ? "verified" : "not verified"}
                    </td>
                    <td className="p-3">
                      {item.exceptionCode?.replaceAll("_", " ") ?? "None recorded"}
                    </td>
                    <td className="p-3">
                      <button
                        className={buttonClass}
                        disabled={busy}
                        onClick={() => void load({ state, cursor: null }, item.caseId)}
                        aria-label={`View case ${item.caseId}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {page.nextCursor && (
            <button
              className={`${buttonClass} mt-6`}
              disabled={busy}
              onClick={() => void load({ state, cursor: page.nextCursor })}
            >
              Next page
            </button>
          )}
        </section>
      )}
      {detail && (
        <section
          aria-label="Assigned case detail"
          className="mt-8 rounded border border-border p-6"
        >
          <h2 ref={detailHeading} tabIndex={-1} className="font-serif text-2xl">
            Case {detail.caseId}
          </h2>
          <p className="mt-3">
            State: {labels[detail.state]}. Record version: {detail.version}.
          </p>
          <p>
            Created: {detail.createdAt}. Updated: {detail.updatedAt}.
          </p>
          {detail.profile ? (
            <dl className="mt-4 grid gap-2">
              <dt>Name</dt>
              <dd>
                {[detail.profile.givenName, detail.profile.familyName].filter(Boolean).join(" ") ||
                  "Not retained"}
              </dd>
              <dt>Account status</dt>
              <dd>{detail.profile.status.replaceAll("_", " ")}</dd>
              <dt>Email</dt>
              <dd>{detail.profile.maskedEmail ?? "Not verified"}</dd>
              <dt>Mobile</dt>
              <dd>
                {detail.profile.maskedMobile ?? "Not retained"} (
                {detail.profile.mobileVerificationStatus})
              </dd>
              <dt>Contact preference</dt>
              <dd>{detail.profile.contactPreference}</dd>
            </dl>
          ) : (
            <p className="mt-4">No client profile has been activated.</p>
          )}
          <p className="mt-5">
            Hand-off and payment readiness have not been evaluated. This view cannot claim, invite,
            send contact data or change case state.
          </p>
          <button
            className={`${buttonClass} mt-6`}
            onClick={() => void load({ state, cursor: null })}
          >
            Back to assigned queue
          </button>
        </section>
      )}
    </main>
  );
}
