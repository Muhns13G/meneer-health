import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import catalogue from "../../content/medical-intake-catalogue.json";
import { medicalFieldIds } from "../../contracts/medical-intake";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
const purposes = [
  "medical_review",
  "medical_safety",
  "medical_transfer",
  "medical_rights",
] as const;
const listSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            intakeId: z.uuid(),
            snapshotId: z.uuid(),
            version: z.number().int(),
            state: z.enum(["draft", "submitted", "restricted"]),
            safetyHold: z.boolean(),
          })
          .strict(),
      )
      .max(20),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
const viewSchema = z
  .object({
    intakeId: z.uuid(),
    snapshotId: z.uuid(),
    version: z.number().int(),
    state: z.enum(["draft", "submitted", "restricted"]),
    safetyHold: z.boolean(),
    fields: z.record(z.string(), z.unknown()),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export function MedicalWorkPage() {
  const [purpose, setPurpose] = useState<(typeof purposes)[number]>("medical_review");
  const [items, setItems] = useState<z.infer<typeof listSchema>["items"]>([]);
  const [view, setView] = useState<z.infer<typeof viewSchema> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Load only work for which you have a current medical-purpose grant.",
  );
  const [evidence, setEvidence] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [operation, setOperation] = useState("prepare_transfer");
  const [references, setReferences] = useState<Record<string, string>>({});
  const [grantFields, setGrantFields] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!busy) {
      if (view) heading.current?.focus();
      else if (message) status.current?.focus();
    }
  }, [busy, view, message]);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const clear = useCallback(() => {
    sequence.current++;
    controller.current?.abort();
    setItems([]);
    setView(null);
    setEvidence("");
    setDeadline(null);
    setBusy(false);
    setReferences({});
    setGrantFields([]);
  }, []);
  useEffect(() => {
    setHydrated(true);
    const hide = () => {
      if (document.hidden) {
        clear();
        setMessage("Private data has been hidden. Reload to recheck your authority.");
      }
    };
    const leave = () => {
      clear();
      setMessage("Private data has been hidden. Reload to recheck your authority.");
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
    };
  }, [clear]);
  useEffect(() => {
    if (!deadline) return;
    const timer = setTimeout(
      () => {
        clear();
        setMessage("Your authority must be checked again. Private information is hidden.");
      },
      Math.max(0, Date.parse(deadline) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [deadline, clear]);
  async function send(body: Record<string, unknown>) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const seq = ++sequence.current;
    setBusy(true);
    setView(null);
    setMessage("");
    try {
      const r = await fetch("/staff/intake/command", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": String(body.requestKey ?? crypto.randomUUID()),
        },
        body: JSON.stringify(body),
        signal: current.signal,
      });
      if (seq !== sequence.current) return;
      if (r.status !== 200)
        throw new Error(
          r.status === 401 || r.status === 403
            ? "authority"
            : r.status === 409
              ? "conflict"
              : "unavailable",
        );
      const v: unknown = await r.json();
      if (seq !== sequence.current) return;
      if (body.action === "list") {
        const list = listSchema.parse(v);
        if (Date.parse(list.expiresAt) <= Date.now()) throw new Error("authority");
        setItems(list.items);
        setDeadline(list.expiresAt);
        setMessage(
          list.items.length
            ? "Granted work loaded."
            : "No current medical-purpose grants for this view.",
        );
      } else if (body.action === "read") {
        const detail = viewSchema.parse(v);
        if (Date.parse(detail.expiresAt) <= Date.now()) throw new Error("authority");
        setView(detail);
        setDeadline(detail.expiresAt);
      } else {
        z.object({ reference: z.uuid(), outcome: z.literal("recorded") })
          .strict()
          .parse(v);
        setMessage(
          body.action === "prepare_transfer"
            ? "Transfer preparation recorded. No information has been sent. Reload the queue for the current case version."
            : "The attributed response is recorded. This is not treatment approval.",
        );
        setItems([]);
        setEvidence("");
      }
    } catch (error) {
      if (seq === sequence.current && !current.signal.aborted) {
        setItems([]);
        setView(null);
        setMessage(
          error instanceof Error && error.message === "authority"
            ? "Current MFA, role, assignment and medical-purpose authority are required. No information is displayed."
            : error instanceof Error && error.message === "conflict"
              ? "This snapshot changed. Reload before responding."
              : "The private operation could not be confirmed. Required activation/payment gates may still be closed. No completed action is assumed.",
        );
      }
    } finally {
      if (seq === sequence.current) setBusy(false);
    }
  }
  return (
    <div>
      <Nav />
      <main className="container-x max-w-4xl py-16">
        <h1 ref={heading} tabIndex={-1} className="font-serif text-4xl">
          Private medical work
        </h1>
        <p className="mt-4 text-muted-foreground">
          Ordinary staff access does not grant medical-answer access. This screen does not prescribe
          or approve treatment.
        </p>
        <label className="mt-8 block">
          Medical purpose
          <select
            className="mt-3 block w-full rounded-xl border bg-surface px-4 py-3"
            value={purpose}
            disabled={!hydrated || busy}
            onChange={(e) => {
              clear();
              setPurpose(e.target.value as typeof purpose);
              setMessage("Reload to check this purpose.");
            }}
          >
            {purposes.map((p) => (
              <option key={p} value={p}>
                {p.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!hydrated || busy}
          className="mt-6 rounded-full border px-6 py-3"
          onClick={() => {
            clear();
            void send({ action: "list", purpose });
          }}
        >
          Load granted work
        </button>
        <p ref={status} tabIndex={-1} role="status" aria-live="polite" className="mt-6">
          {busy ? "Rechecking private authority…" : message}
        </p>
        <ul className="mt-8 space-y-4">
          {items.map((item) => (
            <li key={item.intakeId}>
              <button
                disabled={!hydrated || busy}
                className="break-all text-left text-gold underline"
                onClick={() => void send({ action: "read", intakeId: item.intakeId, purpose })}
              >
                Intake {item.intakeId} · version {item.version} · {item.state}
              </button>
            </li>
          ))}
        </ul>
        {view ? (
          <section className="mt-8">
            <h2 className="font-serif text-2xl">Granted snapshot fields</h2>
            <p className="mt-3 break-all">
              Snapshot {view.snapshotId} · version {view.version}
            </p>
            <dl className="mt-6 space-y-5">
              {Object.entries(view.fields).map(([key, value]) => (
                <div key={key}>
                  <dt>
                    {catalogue.items.find((x) => x.id === key)?.prompt ?? key.replaceAll("_", " ")}
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words">
                    {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
                  </dd>
                </div>
              ))}
            </dl>
            {purpose === "medical_safety" && view.safetyHold ? (
              <form method="post" className="mt-8" onSubmit={(e) => e.preventDefault()}>
                <label>
                  Private evidence reference
                  <input
                    className="mt-3 block w-full rounded-xl border bg-surface px-4 py-3"
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <p className="mt-3 text-sm text-muted-foreground">
                  Use an opaque reference to the professional review evidence, not clinical notes or
                  a URL. Acknowledgement does not release the hold.
                </p>
                {(["acknowledged", "reviewed"] as const).map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={busy || !z.uuid().safeParse(evidence).success}
                    className="mr-5 mt-5 rounded-full border px-6 py-3"
                    onClick={() =>
                      void send({
                        action,
                        intakeId: view.intakeId,
                        snapshotId: view.snapshotId,
                        evidenceReference: evidence,
                        requestKey: crypto.randomUUID(),
                      })
                    }
                  >
                    {action === "acknowledged"
                      ? "Acknowledge private review"
                      : "Record professional review and release hold"}
                  </button>
                ))}
              </form>
            ) : null}
          </section>
        ) : null}
        <section className="mt-12 border-t pt-8">
          <h2 className="font-serif text-2xl">Governed evidence commands</h2>
          <p className="mt-4 text-muted-foreground">
            These commands recheck server authority. References must identify existing approved
            records; entering a reference never grants access. Transcription requires the
            authoritative review deposit. Prepare the current submitted snapshot before external
            work; preparation does not send information or approve treatment. After preparation,
            reload the queue for its current case version. No protocol is generated or sent here.
          </p>
          <form
            method="post"
            className="mt-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const command: Record<string, unknown> = {
                action: operation,
                requestKey: crypto.randomUUID(),
                ...references,
              };
              if (operation === "approve_grant") {
                command.purpose = purpose;
                command.fields = grantFields;
              }
              if (operation === "prepare_transfer" || operation === "record_transfer")
                command.caseVersion = Number(references.caseVersion);
              void send(command);
            }}
          >
            <label className="block">
              Operation
              <select
                className="mt-3 block w-full rounded-xl border bg-surface px-4 py-3"
                value={operation}
                disabled={!hydrated || busy}
                onChange={(e) => {
                  setOperation(e.target.value);
                  setReferences({});
                  setGrantFields([]);
                }}
              >
                {[
                  ["approve_grant", "Clinical approval of medical grant"],
                  ["activate_grant", "Independent security activation"],
                  ["prepare_transfer", "Prepare authorised manual transfer"],
                  ["record_transfer", "Record deliberate manual transfer"],
                  ["reconcile_transfer", "Independently reconcile transfer"],
                  [
                    "reconcile_provider_disposition",
                    "Record independent provider disposition evidence",
                  ],
                  ["hold_placed", "Place medical lifecycle hold"],
                  ["hold_released", "Record reviewed lifecycle hold release"],
                  ["approve_disposition", "Clinical disposition approval"],
                  ["dispose", "Execute eligible independent disposition"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {(operation === "approve_grant"
              ? ["intakeId", "snapshotId", "targetSubjectId", "rosterReference", "expiresAt"]
              : operation === "activate_grant" || operation === "dispose"
                ? ["approvalId"]
                : operation === "prepare_transfer"
                  ? ["intakeId", "snapshotId", "caseVersion"]
                  : operation === "record_transfer"
                    ? ["intakeId", "snapshotId", "caseVersion", "externalReference"]
                    : operation === "reconcile_transfer"
                      ? ["transferId", "evidenceReference"]
                      : operation === "reconcile_provider_disposition"
                        ? ["transferId", "approvalId", "evidenceReference"]
                        : operation === "approve_disposition"
                          ? ["intakeId", "snapshotId", "eligibleAt", "evidenceReference"]
                          : ["intakeId", "evidenceReference"]
            ).map((key) => (
              <label className="block" key={key}>
                {key.replaceAll(/([A-Z])/g, " $1")}
                <input
                  required
                  disabled={!hydrated || busy}
                  autoComplete="off"
                  type={key === "caseVersion" ? "number" : "text"}
                  min={key === "caseVersion" ? 1 : undefined}
                  className="mt-3 block w-full rounded-xl border bg-surface px-4 py-3"
                  value={references[key] ?? ""}
                  onChange={(e) =>
                    setReferences((values) => ({ ...values, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
            {operation === "approve_grant" ? (
              <fieldset>
                <legend>Explicit allowed fields</legend>
                {medicalFieldIds.map((field) => (
                  <label className="mt-3 block" key={field}>
                    <input
                      type="checkbox"
                      checked={grantFields.includes(field)}
                      onChange={(e) =>
                        setGrantFields((values) =>
                          e.target.checked ? [...values, field] : values.filter((v) => v !== field),
                        )
                      }
                    />{" "}
                    {field.replaceAll("_", " ")}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Use UUID evidence references, not patient notes, credentials or URLs. Dates require an
              explicit ISO timestamp with timezone. Disposition preserves receipts and cannot erase
              records under retention or holds.
            </p>
            <button
              type="submit"
              disabled={
                !hydrated || busy || (operation === "approve_grant" && grantFields.length === 0)
              }
              className="rounded-full border px-6 py-3"
            >
              Submit governed command
            </button>
          </form>
        </section>
        <Link to="/staff/sign-in" className="mt-10 inline-block text-gold underline">
          Workforce sign-in
        </Link>
      </main>
      <Footer />
    </div>
  );
}
