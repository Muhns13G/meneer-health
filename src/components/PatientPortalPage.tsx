import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { portalViewSchema, type PortalView } from "@/domain/identity/patient-portal";
import { PatientRightsPanel } from "./PatientRightsPanel";
import { PortalHandoffPanel } from "./PortalHandoffPanel";
import { ClientCaseProgress } from "./ClientCaseProgress";

type ViewState =
  | { stage: "loading" | "signed-out" | "unavailable" | "expired" }
  | { stage: "ready"; view: PortalView };
const dateFormat = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});
const stateLabels = {
  not_ready: "Not ready",
  ready: "Ready",
  dispatched: "Dispatched",
  blocked: "Blocked",
  not_started: "Not started",
  in_transit: "In transit",
  delivered: "Delivered",
  failed: "Failed",
  active: "Active",
  requested: "Requested",
  cancelled: "Cancelled",
  declined: "Declined",
};

export function PatientPortalPage({ mode }: { mode: "overview" | "profile" | "rights" }) {
  const [state, setState] = useState<ViewState>({ stage: "loading" });
  const controller = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const sequence = useRef(0);
  const load = useCallback(async (renew = false) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const requestSequence = ++sequence.current;
    setState({ stage: "loading" });
    try {
      if (renew) {
        const response = await fetch("/account/session/renew", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "action=renew",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          signal: current.signal,
        });
        if (response.status !== 204) {
          if (requestSequence === sequence.current)
            setState({ stage: response.status === 401 ? "signed-out" : "unavailable" });
          return;
        }
      }
      const response = await fetch("/portal/account", {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: current.signal,
      });
      if (requestSequence !== sequence.current) return;
      if (response.status === 401) {
        setState({ stage: "signed-out" });
        return;
      }
      if (response.status !== 200) {
        setState({ stage: "unavailable" });
        return;
      }
      const parsed = portalViewSchema.safeParse(await response.json());
      if (requestSequence !== sequence.current) return;
      setState(
        parsed.success && Date.parse(parsed.data.expiresAt) > Date.now()
          ? { stage: "ready", view: parsed.data }
          : { stage: "unavailable" },
      );
    } catch {
      if (!current.signal.aborted && requestSequence === sequence.current)
        setState({ stage: "unavailable" });
    }
  }, []);
  useEffect(() => {
    void load();
    const invalidate = () => {
      sequence.current++;
      controller.current?.abort();
    };
    const clear = () => {
      invalidate();
      setState({ stage: "loading" });
    };
    const visibility = () => {
      if (document.hidden) clear();
      else void load();
    };
    const show = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", show);
    return () => {
      invalidate();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", show);
    };
  }, [load]);
  useEffect(() => {
    if (state.stage === "loading") return;
    heading.current?.focus();
    if (state.stage !== "ready") return;
    const timer = setTimeout(
      () => setState({ stage: "expired" }),
      Math.max(0, Date.parse(state.view.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <div className="relative">
      <Nav />
      <main className="container-x max-w-4xl py-16 lg:py-24">
        <p className="label-caps text-gold">Private account</p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-6 font-serif text-4xl text-foreground sm:text-5xl"
        >
          {mode === "profile"
            ? "Your profile"
            : mode === "rights"
              ? "Your account and data requests"
              : "Your Meneer account"}
        </h1>
        {state.stage !== "ready" ? (
          <section className="mt-8" aria-live="polite">
            <p role="status" className="text-muted-foreground">
              {state.stage === "loading"
                ? "Checking your private account…"
                : state.stage === "signed-out"
                  ? "Sign in with an active invited account to view your information."
                  : state.stage === "expired"
                    ? "Your session needs to be checked again. Account information has been hidden."
                    : "Your account is temporarily unavailable. No account information is displayed."}
            </p>
            {state.stage !== "loading" ? (
              <div className="mt-6 flex flex-wrap gap-5">
                <Link to="/account/sign-in" className="text-gold underline underline-offset-4">
                  Sign in
                </Link>
                {state.stage !== "signed-out" ? (
                  <button
                    type="button"
                    onClick={() => void load(state.stage === "expired")}
                    className="text-gold underline underline-offset-4"
                  >
                    {state.stage === "expired" ? "Check session" : "Try again"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <nav aria-label="Account navigation" className="mt-8 flex flex-wrap gap-6 text-sm">
              <Link
                to="/portal"
                className="text-gold underline underline-offset-4"
                aria-current={mode === "overview" ? "page" : undefined}
              >
                Account overview
              </Link>
              <Link
                to="/portal/profile"
                className="text-gold underline underline-offset-4"
                aria-current={mode === "profile" ? "page" : undefined}
              >
                View profile
              </Link>
              <Link to="/account/sign-out" className="text-gold underline underline-offset-4">
                Sign out
              </Link>
              <Link
                to="/portal/rights"
                className="text-gold underline underline-offset-4"
                aria-current={mode === "rights" ? "page" : undefined}
              >
                Corrections and requests
              </Link>
            </nav>
            {mode === "rights" ? (
              <PatientRightsPanel
                profile={state.view.account.profile}
                onInvalidate={() => void load()}
              />
            ) : mode === "profile" ? (
              <section className="mt-10">
                <h2 className="font-serif text-2xl text-foreground">Your minimum profile</h2>
                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[
                    ["Given name", state.view.account.profile.givenName],
                    ["Family name", state.view.account.profile.familyName],
                    ["Verified email", state.view.account.profile.verifiedEmail],
                    ["Mobile / WhatsApp", state.view.account.profile.mobileE164],
                    [
                      "Mobile verification",
                      state.view.account.profile.mobileVerificationStatus === "verified"
                        ? "Verified"
                        : "Not verified",
                    ],
                    [
                      "Operational contact preference",
                      state.view.account.profile.contactPreference === "email"
                        ? "Email"
                        : "WhatsApp",
                    ],
                    ["Account status", "Active"],
                    ["Profile version", String(state.view.account.profile.version)],
                    ["Created", dateFormat.format(new Date(state.view.account.profile.createdAt))],
                    ["Updated", dateFormat.format(new Date(state.view.account.profile.updatedAt))],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-6 text-sm text-muted-foreground">
                  Use Corrections and requests to correct names or contact preference. Your contact
                  preference is for operational messages, not marketing. An unverified mobile number
                  cannot be used for account recovery.
                </p>
              </section>
            ) : (
              <>
                <section className="mt-10">
                  <h2 className="font-serif text-2xl text-foreground">Account status</h2>
                  <p className="mt-4 text-foreground">
                    Active account · {state.view.account.profile.givenName}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Account access does not imply clinical approval, an order, or payment.
                  </p>
                </section>
                <section className="mt-10" aria-labelledby="account-instruments">
                  <h2 id="account-instruments" className="font-serif text-2xl text-foreground">
                    Your recorded account documents
                  </h2>
                  {state.view.account.instruments.map((item) => (
                    <article
                      key={item.instrumentId}
                      className="mt-6 rounded-xl border border-border bg-surface p-5"
                    >
                      <h3 className="font-serif text-xl text-foreground">
                        {item.instrumentId === "pilot-account-terms"
                          ? "Pilot Account and Service Terms"
                          : "Pilot Transactional Privacy Notice"}
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Version {item.version} · {item.locale} ·{" "}
                        {item.action === "accepted" ? "Accepted" : "Acknowledged"}{" "}
                        {dateFormat.format(new Date(item.recordedAt))}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Effective {dateFormat.format(new Date(item.effectiveAt))}
                      </p>
                      <details className="mt-4">
                        <summary className="cursor-pointer text-gold">
                          Read this exact version
                        </summary>
                        <p className="mt-4 whitespace-pre-wrap text-sm text-foreground">
                          {item.body}
                        </p>
                      </details>
                      <a
                        className="mt-4 inline-block text-sm text-gold underline underline-offset-4"
                        download={`${item.instrumentId}-${item.version}.txt`}
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(item.body)}`}
                      >
                        Save this exact version
                      </a>
                    </article>
                  ))}
                </section>
                <ClientCaseProgress cases={state.view.account.operationsCases} />
                <Link
                  to="/portal/intake"
                  className="mt-8 inline-block text-gold underline underline-offset-4"
                >
                  Your medical questionnaire
                </Link>
                <PortalHandoffPanel />
                <Link
                  to="/portal/order"
                  className="mt-8 block text-gold underline underline-offset-4"
                >
                  Review your order
                </Link>
                <section className="mt-10" aria-labelledby="account-progress">
                  <h2 id="account-progress" className="font-serif text-2xl text-foreground">
                    Non-clinical progress
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    These are recorded operational states, not treatment recommendations or
                    confirmation of clinical approval.
                  </p>
                  {state.view.account.workflows.length === 0 ? (
                    <p className="mt-4 text-foreground">
                      No workflow has been started for this account.
                    </p>
                  ) : (
                    <ul className="mt-6 space-y-5">
                      {state.view.account.workflows.map((item) => (
                        <li key={item.reference} className="rounded-xl border border-border p-5">
                          <p className="break-all text-sm text-muted-foreground">
                            Reference: {item.reference}
                          </p>
                          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                            {[
                              ["Dispatch", stateLabels[item.dispatchState]],
                              ["Delivery", stateLabels[item.deliveryState]],
                              ["Cancellation", stateLabels[item.cancellationState]],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <dt className="text-sm text-muted-foreground">{label}</dt>
                                <dd className="text-foreground">{value}</dd>
                              </div>
                            ))}
                          </dl>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Updated {dateFormat.format(new Date(item.updatedAt))}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
            <button
              type="button"
              onClick={() => void load(true)}
              className="mt-10 rounded-full border border-border px-6 py-3 text-sm text-foreground"
            >
              Refresh account and session
            </button>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
