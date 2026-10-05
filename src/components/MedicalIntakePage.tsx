import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import catalogue from "../../content/medical-intake-catalogue.json";
import {
  intakeCategories,
  intakeConditions,
  submittedIntake,
  intakeSubmissionErrors,
  type IntakeAnswers,
} from "../../contracts/medical-intake";
import {
  intakePatientViewSchema,
  intakeWriteResultSchema,
  intakeExportSchema,
  type IntakePatientView,
} from "@/application/intake/medical-intake-service";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
type Status = "loading" | "ready" | "unavailable" | "signed-out" | "expired";
const control = "mt-3 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground";
const rightsViewSchema = z
  .object({
    record: z
      .object({
        intakeId: z.uuid(),
        state: z.enum(["draft", "submitted", "restricted", "deleted"]),
      })
      .strict()
      .nullable(),
    expiresAt: z.number().int().positive(),
  })
  .strict();
const narrative = new Set([
  "health_history",
  "medications",
  "allergies",
  "family_history",
  "lifestyle",
  "mental_history",
  "sexual_history",
  ...intakeCategories.map((x) => `category_${x}`),
]);
const categoryLabels = {
  ed: "Erectile dysfunction",
  hair: "Hair loss",
  weight: "Weight management",
  trt: "Testosterone / TRT",
  peptides: "Peptides",
};
function displayAnswer(value: unknown): string {
  if (value === undefined) return "Not answered";
  if (typeof value === "boolean") return value ? "Confirmed" : "Not confirmed";
  if (typeof value === "string" || typeof value === "number")
    return String(value).replaceAll("_", " ");
  if (Array.isArray(value)) return value.map(displayAnswer).join(", ");
  if (value && typeof value === "object") {
    const a = value as Record<string, unknown>;
    if (a.disposition)
      return a.disposition === "provided"
        ? typeof a.text === "string"
          ? a.text
          : displayAnswer(a.values)
        : a.disposition === "none"
          ? "None"
          : a.disposition === "unknown"
            ? "Not known"
            : "Prefer not to answer";
    if ("heightCm" in a || "weightKg" in a)
      return `Height: ${a.heightCm ?? "not answered"} cm; weight: ${a.weightKg ?? "not answered"} kg`;
    if ("number" in a) return `${a.type}: ${a.number}`;
  }
  return "Not answered";
}
async function request(body: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch("/portal/intake/command", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": String(body.requestKey ?? crypto.randomUUID()),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status !== 200)
    throw new Error(
      response.status === 401
        ? "signed-out"
        : response.status === 409
          ? "conflict"
          : response.status === 422
            ? "validation"
            : "unavailable",
    );
  return response.json() as Promise<unknown>;
}

export function MedicalIntakePage() {
  const [status, setStatus] = useState<Status>("loading");
  const [view, setView] = useState<IntakePatientView | null>(null);
  const [rightsView, setRightsView] = useState<z.infer<typeof rightsViewSchema> | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [step, setStep] = useState(1);
  const [review, setReview] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [noticeChoice, setNoticeChoice] = useState(false);
  const [transferChoice, setTransferChoice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorSummary = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const live = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const id = useRef<string | null>(null);
  const load = useCallback(async () => {
    const seq = ++live.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setView(null);
    setRightsView(null);
    setAnswers({});
    setBusy(false);
    setStatus("loading");
    setMessage("");
    setNoticeChoice(false);
    setTransferChoice(false);
    try {
      const value = intakePatientViewSchema.parse(
        await request({ action: "read", intakeId: null }, controller.signal),
      );
      if (seq !== live.current) return;
      if (value.expiresAt <= Date.now()) throw new Error("expired");
      id.current = value.record?.id ?? crypto.randomUUID();
      setView(value);
      setAnswers(value.record?.answers ?? {});
      setAck(value.record !== null);
      setEditing(value.record?.state !== "submitted");
      setStatus("ready");
    } catch (error) {
      if (seq === live.current && !controller.signal.aborted) {
        try {
          const retained = rightsViewSchema.parse(
            await request({ action: "rights_read" }, controller.signal),
          );
          if (seq !== live.current || controller.signal.aborted) return;
          if (retained.expiresAt <= Date.now()) throw new Error("expired");
          if (retained.record?.state === "restricted" || retained.record?.state === "deleted") {
            setRightsView(retained);
            setStatus("unavailable");
            setMessage(
              "Ordinary questionnaire access is unavailable. You may export your own retained information or disposition receipts.",
            );
            return;
          }
        } catch {
          /* Rights access must independently authorise; never infer it from a failed read. */
        }
        setStatus(
          error instanceof Error && error.message === "signed-out" ? "signed-out" : "unavailable",
        );
      }
    }
  }, []);
  useEffect(() => {
    void load();
    const clear = () => {
      live.current++;
      abort.current?.abort();
      setAnswers({});
      setView(null);
      setRightsView(null);
      setStatus("expired");
    };
    const visibility = () => {
      if (document.hidden) clear();
      else void load();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", clear);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", clear);
    };
  }, [load]);
  useEffect(() => {
    if (focusNext.current) {
      const element = document.getElementById(focusNext.current);
      focusNext.current = null;
      const target = element?.matches("input,select,textarea,button")
        ? element
        : element?.querySelector<HTMLElement>("input,select,textarea,button");
      if (target) {
        target.focus();
        return;
      }
    }
    heading.current?.focus();
  }, [step, review, status, focusRequest]);
  useEffect(() => {
    if (Object.keys(errors).length) errorSummary.current?.focus();
  }, [errors]);
  useEffect(() => {
    const expiresAt = view?.expiresAt ?? rightsView?.expiresAt;
    if (!expiresAt) return;
    const timer = setTimeout(
      () => {
        live.current++;
        abort.current?.abort();
        setAnswers({});
        setView(null);
        setRightsView(null);
        setStatus("expired");
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [view, rightsView]);
  async function rights(action: "export" | "restrict" | "authorise_transfer") {
    if (busy) return;
    const record = view?.record;
    const intakeId = record?.id ?? rightsView?.record?.intakeId;
    const expiresAt = view?.expiresAt ?? rightsView?.expiresAt;
    if (!intakeId || !expiresAt || expiresAt <= Date.now()) return;
    if (action !== "export" && (!record || !view)) return;
    const seq = live.current;
    setBusy(true);
    setMessage("");
    try {
      const value = await request(
        action === "export"
          ? { action, intakeId }
          : action === "restrict"
            ? {
                action,
                intakeId,
                expectedVersion: record!.version,
                requestKey: crypto.randomUUID(),
              }
            : {
                action,
                intakeId,
                snapshotId: record!.snapshotId,
                publicationId: view!.publication.id,
                requestKey: crypto.randomUUID(),
              },
        abort.current?.signal,
      );
      if (seq !== live.current || expiresAt <= Date.now()) return;
      if (action === "export") {
        const download = intakeExportSchema.parse(value);
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(download, null, 2)], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "meneer-medical-intake.json";
        link.click();
        URL.revokeObjectURL(url);
        setMessage(
          "Your questionnaire export was prepared. Store the downloaded medical information privately.",
        );
      } else if (action === "restrict") {
        const result = intakeWriteResultSchema.parse(value);
        if (result.state !== "restricted") throw new Error("unconfirmed");
        setView(null);
        setRightsView({ record: { intakeId, state: "restricted" }, expiresAt });
        setAnswers({});
        setStatus("unavailable");
        setMessage(
          "Restriction is recorded. This is not deletion or confirmation that legal retention has ended.",
        );
      } else {
        const receipt = value as { reference?: unknown; outcome?: unknown };
        if (typeof receipt.reference !== "string" || receipt.outcome !== "recorded")
          throw new Error("unconfirmed");
        setTransferChoice(false);
        setMessage(
          "Your disclosure authorisation is recorded for this submitted version. No transfer, payment or clinical approval is confirmed.",
        );
      }
    } catch {
      if (seq === live.current)
        setMessage("The request could not be confirmed. No completed action is assumed.");
    } finally {
      if (seq === live.current) setBusy(false);
    }
  }
  async function persist(action: "save" | "save_amendment" | "submit" | "amend", next = answers) {
    if (!view || !id.current || busy) return;
    const seq = live.current;
    setBusy(true);
    setMessage("");
    try {
      if (!["save", "save_amendment"].includes(action)) submittedIntake(next);
      const result = intakeWriteResultSchema.parse(
        await request(
          {
            action,
            intakeId: id.current,
            publicationId: view.publication.id,
            expectedVersion: view.record?.version ?? 0,
            privacyAcknowledged: true,
            requestKey: crypto.randomUUID(),
            answers: next,
          },
          abort.current?.signal,
        ),
      );
      if (seq !== live.current) return;
      const updated = intakePatientViewSchema.parse(
        await request({ action: "read", intakeId: id.current }, abort.current?.signal),
      );
      if (seq !== live.current) return;
      setView(updated);
      setAnswers(updated.record?.answers ?? next);
      setAck(true);
      setEditing(result.state !== "submitted");
      setReview(false);
      setMessage(
        ["save", "save_amendment"].includes(action)
          ? "Your draft is saved."
          : "Your questionnaire is received. This is not clinical approval or confirmation of treatment.",
      );
      setErrors({});
    } catch (error) {
      if (seq === live.current) {
        if (error instanceof Error && error.message === "signed-out") {
          setView(null);
          setAnswers({});
          setStatus("signed-out");
        } else
          setMessage(
            error instanceof Error && error.message === "conflict"
              ? "This record changed. Reload before making another change."
              : ["save", "save_amendment"].includes(action)
                ? "The save could not be confirmed. Your changes are not recorded until a save succeeds."
                : "Submission could not be confirmed. Check every required response, declaration and signature, then try again.",
          );
      }
    } finally {
      if (seq === live.current) setBusy(false);
    }
  }
  function update(key: keyof IntakeAnswers, value: unknown) {
    const next = { ...answers, [key]: value } as IntakeAnswers;
    setAnswers(next);
    if ((key === "mental_safety" || key === "sti_symptoms") && value === "yes" && editing)
      void persist(view?.record?.hasSubmitted ? "save_amendment" : "save", next);
  }
  function renderItem(item: { id: string; prompt: string }) {
    const key = item.id as keyof IntakeAnswers;
    const label = item.prompt;
    if (narrative.has(item.id)) {
      if (
        item.id.startsWith("category_") &&
        !answers.categories?.includes(item.id.slice(9) as (typeof intakeCategories)[number])
      )
        return null;
      const v = answers[key] as { disposition: string; text: string } | undefined;
      return (
        <div key={key} className="mt-8">
          <label htmlFor={key + "-disposition"} className="block text-foreground">
            {label}
          </label>
          <select
            id={key + "-disposition"}
            className={control}
            value={v?.disposition ?? ""}
            onChange={(e) => {
              const selected = e.target.value;
              if (
                v?.text &&
                selected !== "provided" &&
                !window.confirm(
                  "Changing this response will remove its previous text from the draft. Continue?",
                )
              )
                return;
              update(key, {
                disposition: selected,
                text: selected === "provided" ? (v?.text ?? "") : "",
              });
            }}
          >
            <option value="" disabled>
              Choose a response
            </option>
            <option value="provided">Provide details</option>
            <option value="none">None</option>
            <option value="unknown">Not known</option>
            <option value="declined">Prefer not to answer</option>
          </select>
          {v?.disposition === "provided" ? (
            <textarea
              aria-label={label}
              className={control}
              maxLength={4000}
              value={v.text}
              onChange={(e) => update(key, { ...v, text: e.target.value })}
            />
          ) : null}
        </div>
      );
    }
    if (key === "mental_safety" || key === "sti_symptoms")
      return (
        <div key={key} className="mt-8">
          <label htmlFor={key}>{label}</label>
          <select
            id={key}
            className={control}
            value={answers[key] ?? ""}
            onChange={(e) => update(key, e.target.value)}
          >
            <option value="" disabled>
              Choose an answer
            </option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      );
    if (item.id === "contact")
      return (
        <div key={item.id} className="mt-8">
          <p>{label}</p>
          <p className="mt-3 break-words">
            {view?.contact.email} · {view?.contact.mobile}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your verified account email is used. Mobile verification is separate.
          </p>
        </div>
      );
    if (key === "measurements")
      return (
        <fieldset id={key} key={key} className="mt-8">
          <legend>{label}</legend>
          {(["heightCm", "weightKg"] as const).map((k) => (
            <label className="mt-3 block" key={k}>
              {k === "heightCm" ? "Height (cm)" : "Weight (kg)"}
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={control}
                value={answers.measurements?.[k] ?? ""}
                onChange={(e) =>
                  update(key, {
                    ...answers.measurements,
                    [k]: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
          ))}
        </fieldset>
      );
    if (key === "identity_document")
      return (
        <fieldset id={key} key={key} className="mt-8">
          <legend>{label} (optional)</legend>
          <label className="block">
            Document type
            <select
              className={control}
              value={answers.identity_document?.type ?? ""}
              onChange={(e) =>
                update(
                  key,
                  e.target.value
                    ? {
                        type: e.target.value,
                        number: answers.identity_document?.number ?? "",
                      }
                    : undefined,
                )
              }
            >
              <option value="">Not provided</option>
              <option value="id">ID</option>
              <option value="passport">Passport</option>
            </select>
          </label>
          {answers.identity_document?.type ? (
            <label className="block">
              Document number
              <input
                className={control}
                maxLength={64}
                value={answers.identity_document.number}
                onChange={(e) =>
                  update(key, { ...answers.identity_document, number: e.target.value })
                }
              />
            </label>
          ) : null}
        </fieldset>
      );
    if (key === "diagnosed_conditions")
      return (
        <fieldset id={key} key={key} className="mt-8">
          <legend>{label}</legend>
          <label>
            Response
            <select
              className={control}
              value={answers.diagnosed_conditions?.disposition ?? ""}
              onChange={(e) => update(key, { disposition: e.target.value, values: [] })}
            >
              <option value="" disabled>
                Choose a response
              </option>
              <option value="provided">Select diagnosed conditions</option>
              <option value="none">None</option>
              <option value="unknown">Not known</option>
            </select>
          </label>
          {answers.diagnosed_conditions?.disposition === "provided"
            ? intakeConditions.map((c) => (
                <label key={c} className="mt-3 block">
                  <input
                    type="checkbox"
                    checked={answers.diagnosed_conditions?.values.includes(c) ?? false}
                    onChange={(e) =>
                      update(key, {
                        disposition: "provided",
                        values: e.target.checked
                          ? [...answers.diagnosed_conditions!.values, c]
                          : answers.diagnosed_conditions!.values.filter((x) => x !== c),
                      })
                    }
                  />{" "}
                  {c.replaceAll("_", " ")}
                </label>
              ))
            : null}
        </fieldset>
      );
    if (key === "accuracy_declaration" || key === "doctor_review_consent")
      return (
        <label key={key} className="mt-8 flex gap-3">
          <input
            id={key}
            type="checkbox"
            checked={answers[key] === true}
            onChange={(e) => update(key, e.target.checked)}
          />
          <span>
            {key === "doctor_review_consent" ? view?.publication.reviewDeclaration : label}
          </span>
        </label>
      );
    if (key === "signature")
      return (
        <div key={key} className="mt-8 block">
          <label htmlFor="signature">{label}</label>
          <input
            className={control}
            id="signature"
            aria-describedby="signature-help"
            maxLength={200}
            autoComplete="off"
            value={answers.signature ?? ""}
            onChange={(e) => update(key, e.target.value)}
          />
          <span id="signature-help" className="mt-2 block text-sm text-muted-foreground">
            Type your full name. The submission date is recorded by the server.
          </span>
        </div>
      );
    return (
      <label key={key} className="mt-8 block">
        {label}
        <input
          className={control}
          type={key === "date_of_birth" ? "date" : "text"}
          maxLength={key === "gp_contact" ? 500 : 200}
          id={key}
          value={String(answers[key] ?? "")}
          onChange={(e) => update(key, e.target.value)}
        />
      </label>
    );
  }
  return (
    <div>
      <Nav />
      <main className="container-x max-w-3xl py-16">
        <h1 ref={heading} tabIndex={-1} className="font-serif text-4xl text-foreground">
          Your medical questionnaire
        </h1>
        {status !== "ready" || !view ? (
          <section className="mt-8" aria-live="polite">
            <p role="status">
              {status === "loading"
                ? "Checking your private questionnaire…"
                : status === "signed-out"
                  ? "Sign in to an active invited account to continue."
                  : status === "expired"
                    ? "Your session needs to be checked again. Questionnaire information has been hidden."
                    : message ||
                      "The questionnaire is not currently available. No medical information is collected here."}
            </p>
            {rightsView?.record ? (
              <button
                type="button"
                disabled={busy}
                className="mt-6 block text-gold underline"
                onClick={() => void rights("export")}
              >
                Export retained questionnaire information
              </button>
            ) : null}
            <button className="mt-6 text-gold underline" onClick={() => void load()}>
              Check again
            </button>
          </section>
        ) : !ack ? (
          <section className="mt-8">
            <h2 className="font-serif text-2xl">Before you begin</h2>
            <p className="mt-5 whitespace-pre-wrap">{view.publication.privacy}</p>
            <label className="mt-6 flex gap-3">
              <input
                type="checkbox"
                checked={noticeChoice}
                onChange={(e) => setNoticeChoice(e.target.checked)}
              />
              I acknowledge this medical-intake privacy notice.
            </label>
            <button
              disabled={!noticeChoice || busy}
              className="mt-6 rounded-full border px-6 py-3"
              onClick={() => void persist("save", {})}
            >
              Continue
            </button>
            <p role="status" aria-live="polite" className="mt-5">
              {busy ? "Recording your acknowledgement…" : message}
            </p>
          </section>
        ) : (
          <>
            {answers.mental_safety === "yes" ||
            answers.sti_symptoms === "yes" ||
            view.record?.safetyHold ? (
              <section role="alert" className="mt-8 rounded-xl border p-5">
                <p>{view.publication.urgentGuidance}</p>
                <p className="mt-3">{view.publication.afterHoursGuidance}</p>
                <p className="mt-3">
                  Your information requires private review. This site does not provide an emergency
                  response.
                </p>
              </section>
            ) : null}
            <p className="mt-6 text-sm text-muted-foreground">
              Save your draft before leaving this page. Unsaved changes are not stored in your
              browser. Blood results and a deposit are not required to submit this questionnaire.
            </p>
            {Object.keys(errors).length ? (
              <div
                ref={errorSummary}
                tabIndex={-1}
                role="alert"
                className="mt-8 rounded-xl border p-5"
              >
                <h2 className="font-serif text-xl">Check these responses</h2>
                <ul className="mt-4 space-y-3">
                  {Object.entries(errors).map(([key, error]) => {
                    const item = catalogue.items.find((x) => x.id === key);
                    const section = item?.section ?? (key === "categories" ? 7 : 1);
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          className="text-left text-gold underline"
                          onClick={() => {
                            focusNext.current = narrative.has(key) ? key + "-disposition" : key;
                            setFocusRequest((request) => request + 1);
                            setReview(false);
                            setStep(section);
                          }}
                        >
                          {item?.prompt ??
                            (key === "sex"
                              ? "Sex"
                              : key === "categories"
                                ? "Categories"
                                : "Questionnaire")}
                          : {error}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {!editing ? (
              <section className="mt-8">
                <h2 className="font-serif text-2xl">Questionnaire received</h2>
                <p className="mt-3">
                  Receipt is not clinical approval, a prescription, payment or delivery
                  confirmation.
                </p>
                <button
                  className="mt-5 text-gold underline"
                  onClick={() => {
                    setEditing(true);
                    setAnswers({
                      ...answers,
                      accuracy_declaration: false,
                      doctor_review_consent: false,
                      signature: "",
                    });
                    setStep(1);
                  }}
                >
                  Amend submitted answers
                </button>
                {view.publication.transferNotice && !view.record?.safetyHold ? (
                  <fieldset className="mt-8 border p-5">
                    <legend>Separate disclosure authorisation</legend>
                    <p className="whitespace-pre-wrap">{view.publication.transferNotice}</p>
                    <label className="mt-5 flex gap-3">
                      <input
                        type="checkbox"
                        checked={transferChoice}
                        onChange={(e) => setTransferChoice(e.target.checked)}
                      />
                      I authorise the described disclosure of this submitted version.
                    </label>
                    <button
                      type="button"
                      className="mt-5 text-gold underline"
                      disabled={!transferChoice || busy}
                      onClick={() => void rights("authorise_transfer")}
                    >
                      Record disclosure authorisation
                    </button>
                  </fieldset>
                ) : null}
              </section>
            ) : (
              <form
                method="post"
                onSubmit={(e) => {
                  e.preventDefault();
                  const found = intakeSubmissionErrors(answers);
                  setErrors(found);
                  setReview(Object.keys(found).length === 0);
                  setMessage("");
                }}
              >
                <fieldset disabled={busy}>
                  <legend className="sr-only">Questionnaire answers</legend>
                  <div
                    role="progressbar"
                    aria-label="Questionnaire progress"
                    aria-valuemin={1}
                    aria-valuemax={8}
                    aria-valuenow={step}
                    className="mt-6 text-sm"
                  >
                    Section {step} of 8
                  </div>
                  {review ? (
                    <section className="mt-8">
                      <h2 className="font-serif text-2xl">Review your answers</h2>
                      <p className="mt-3">
                        Only selected category answers will be submitted. Unselected category
                        answers stay in the private draft only.
                      </p>
                      <dl className="mt-5 space-y-4">
                        {catalogue.items
                          .filter(
                            (x) =>
                              x.id !== "contact" &&
                              (!x.id.startsWith("category_") ||
                                answers.categories?.includes(
                                  x.id.slice(9) as (typeof intakeCategories)[number],
                                )),
                          )
                          .map((x) => (
                            <div key={x.id}>
                              <dt>{x.prompt}</dt>
                              <dd className="mt-2 whitespace-pre-wrap break-words">
                                {displayAnswer(answers[x.id as keyof IntakeAnswers])}
                              </dd>
                            </div>
                          ))}
                        <div>
                          <dt>Sex</dt>
                          <dd>{displayAnswer(answers.sex)}</dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        disabled={busy}
                        className="mt-6 rounded-full border px-6 py-3"
                        onClick={() => void persist(view.record?.hasSubmitted ? "amend" : "submit")}
                      >
                        Confirm and submit questionnaire
                      </button>
                      <button
                        type="button"
                        className="ml-5 text-gold underline"
                        onClick={() => setReview(false)}
                      >
                        Back to answers
                      </button>
                    </section>
                  ) : (
                    <section className="mt-8">
                      <h2 className="font-serif text-2xl">{catalogue.sections[step - 1]!.title}</h2>
                      {step === 7 ? (
                        <fieldset id="categories" className="mt-6">
                          <legend>Choose the categories you want to discuss</legend>
                          {intakeCategories.map((c) => (
                            <label className="mt-3 block" key={c}>
                              <input
                                type="checkbox"
                                checked={answers.categories?.includes(c) ?? false}
                                onChange={(e) =>
                                  update(
                                    "categories",
                                    e.target.checked
                                      ? [...(answers.categories ?? []), c]
                                      : (answers.categories ?? []).filter((x) => x !== c),
                                  )
                                }
                              />{" "}
                              {categoryLabels[c]}
                            </label>
                          ))}
                        </fieldset>
                      ) : null}
                      {catalogue.items.filter((x) => x.section === step).map(renderItem)}
                      {step === 1 ? (
                        <label className="mt-8 block">
                          Sex
                          <select
                            id="sex"
                            className={control}
                            value={answers.sex ?? ""}
                            onChange={(e) => update("sex", e.target.value)}
                          >
                            <option value="" disabled>
                              Choose an answer
                            </option>
                            {catalogue.extensions[0]!.choices.map((label, index) => (
                              <option key={label} value={catalogue.extensions[0]!.values[index]}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <div className="mt-8 flex flex-wrap gap-6">
                        <button
                          type="button"
                          disabled={busy || step === 1}
                          onClick={() => setStep(step - 1)}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void persist(view.record?.hasSubmitted ? "save_amendment" : "save")
                          }
                        >
                          Save draft
                        </button>
                        {step < 8 ? (
                          <button type="button" disabled={busy} onClick={() => setStep(step + 1)}>
                            Next section
                          </button>
                        ) : (
                          <button type="submit" disabled={busy}>
                            Review answers
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                </fieldset>
              </form>
            )}
            <p role="status" aria-live="polite" className="mt-6">
              {busy ? "Checking and saving privately…" : message}
            </p>
            {view.record ? (
              <section className="mt-8 flex flex-wrap gap-6" aria-label="Questionnaire rights">
                <button type="button" disabled={busy} onClick={() => void rights("export")}>
                  Download my questionnaire and submitted history
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Restrict ordinary access to this questionnaire? This does not erase retained medical records.",
                      )
                    )
                      void rights("restrict");
                  }}
                >
                  Restrict questionnaire access
                </button>
              </section>
            ) : null}
          </>
        )}
        <Link to="/portal" className="mt-10 inline-block text-gold underline">
          Back to your account
        </Link>
      </main>
      <Footer />
    </div>
  );
}
