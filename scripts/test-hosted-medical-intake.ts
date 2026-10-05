import { createHmac } from "node:crypto";
import { createInterface } from "node:readline";
import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { completeSyntheticAnswers } from "../contracts/fixtures/medical-intake-synthetic";

// Owner-approved interactive exercise. SQL setup/cleanup are separately reviewed transactions.
// Codes, MFA secrets, tokens, cookies and questionnaire payloads are never logged.
const origin = "https://meneerhealth.co.za";
const tenantId = "e8100000-0000-4000-8000-000000000001";
const publicationId = "e8100000-0000-4000-8000-000000000002";
const intakeId = "e8100000-0000-4000-8000-000000000003";
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
invariant(
  process.env.HOSTED_MEDICAL_INTAKE_CONFIRM === "isolated-synthetic-only" &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_SECRET_KEY,
  "HOSTED_MEDICAL_GUARD_REJECTED",
);
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const actors = new Map<string, { email: string; id: string; cookie?: string }>();
const tokens = new Set<string>();
let version = 0;
let snapshotId = "";
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    invariant(n >= 0, "FACTOR_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
async function request(path: string, body: unknown, actor?: string, form = false) {
  const response = await fetch(origin + path, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json",
      ...(actor && actors.get(actor)?.cookie ? { Cookie: actors.get(actor)!.cookie! } : {}),
      "Idempotency-Key":
        typeof body === "object" && body && "requestKey" in body
          ? String(body.requestKey)
          : crypto.randomUUID(),
    },
    body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
  });
  invariant(response.headers.get("cache-control")?.includes("no-store"), "NO_STORE_MISSING");
  invariant(!response.headers.has("access-control-allow-origin"), "CORS_GRANT_UNEXPECTED");
  return response;
}
function remember(response: Response, actor: string) {
  const cookie = response.headers.get("set-cookie");
  invariant(cookie, "COOKIE_MISSING");
  invariant(
    cookie?.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=Strict"),
    "COOKIE_INVALID",
  );
  actors.get(actor)!.cookie = cookie.split(";", 1)[0];
}
async function codeFor(actor: string) {
  const value = actors.get(actor);
  invariant(value, "ACTOR_MISSING");
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: value.email });
  invariant(!link.error && link.data.user.id === value.id, "CODE_FAILED");
  return link.data.properties.email_otp;
}
const lines = createInterface({ input: process.stdin, terminal: false });
console.log(JSON.stringify({ ready: true, tenantId, secretsLogged: false }));
for await (const line of lines) {
  try {
    const input = JSON.parse(line) as {
      action: string;
      actor?: string;
      command?: Record<string, unknown>;
    };
    if (input.action === "create") {
      invariant(actors.size === 0, "ALREADY_CREATED");
      const baseline = await admin.auth.admin.listUsers({ perPage: 1 });
      invariant(!baseline.error && baseline.data.users.length === 0, "AUTH_BASELINE_CHANGED");
      for (const role of ["patient", "clinician", "reviewer", "admin", "operations"]) {
        const email =
          role === "clinician"
            ? "support@meneerhealth.co.za"
            : `i8-${role}-${crypto.randomUUID()}@example.invalid`;
        const created = await admin.auth.admin.createUser({ email, email_confirm: true });
        invariant(!created.error && created.data.user, "CREATE_FAILED");
        actors.set(role, { email, id: created.data.user.id });
      }
      console.log(
        JSON.stringify({
          action: "create",
          actors: [...actors].map(([role, value]) => ({ role, id: value.id })),
        }),
      );
    } else if (input.action === "browser-code") {
      invariant(input.actor === "patient", "BROWSER_ACTOR_REJECTED");
      writeFileSync(
        "/private/tmp/meneer-i8-browser-code.json",
        JSON.stringify({ email: actors.get("patient")!.email, code: await codeFor("patient") }),
        { mode: 0o600 },
      );
      console.log(JSON.stringify({ action: input.action, credentialLogged: false }));
    } else if (input.action === "patient-bootstrap") {
      const actor = actors.get("patient")!;
      const result = await admin.auth.verifyOtp({
        email: actor.email,
        token: await codeFor("patient"),
        type: "email",
      });
      invariant(!result.error && result.data.session, "BOOTSTRAP_AUTH_FAILED");
      tokens.add(result.data.session.access_token);
      const claims = JSON.parse(
        Buffer.from(result.data.session.access_token.split(".")[1]!, "base64url").toString(),
      );
      console.log(
        JSON.stringify({
          action: input.action,
          providerSubject: actor.id,
          providerSessionId: claims.session_id,
        }),
      );
    } else if (input.action === "login") {
      const actor = input.actor!;
      invariant(actors.has(actor), "ACTOR_MISSING");
      const response = await request(
        actor === "patient" ? "/account/sign-in" : "/staff/sign-in",
        { action: "verify", email: actors.get(actor)!.email, code: await codeFor(actor) },
        undefined,
        true,
      );
      invariant(
        response.status === (actor === "patient" ? 204 : 200),
        `LOGIN_STATUS_${response.status}`,
      );
      remember(response, actor);
      if (actor !== "patient") {
        const body = (await response.json()) as { enrollment?: { secret: string } };
        invariant(body.enrollment?.secret, "MFA_ENROLLMENT_MISSING");
        const denial = await request(
          "/staff/intake/command",
          { action: "list", purpose: "medical_review" },
          actor,
        );
        invariant(denial.status === 401, "EMAIL_ONLY_ACCESS_GRANTED");
        const mfa = await request(
          "/staff/mfa",
          { code: totp(body.enrollment.secret) },
          actor,
          true,
        );
        invariant(mfa.status === 204, `MFA_STATUS_${mfa.status}`);
        remember(mfa, actor);
      }
      console.log(
        JSON.stringify({
          action: input.action,
          actor,
          secureCookie: true,
          aal2: actor !== "patient",
        }),
      );
    } else if (input.action === "patient") {
      const command = input.command!;
      invariant(
        command &&
          [
            "read",
            "rights_read",
            "save",
            "submit",
            "amend",
            "export",
            "restrict",
            "authorise_transfer",
          ].includes(String(command.action)),
        "COMMAND_REJECTED",
      );
      const action = String(command.action);
      const body = ["save", "submit", "amend"].includes(action)
        ? {
            action,
            intakeId,
            publicationId,
            privacyAcknowledged: true,
            expectedVersion: version,
            requestKey: crypto.randomUUID(),
            answers: {
              ...completeSyntheticAnswers,
              ...(command.safety ? { mental_safety: "yes" } : {}),
            },
          }
        : action === "restrict"
          ? { action, intakeId, expectedVersion: version, requestKey: crypto.randomUUID() }
          : action === "authorise_transfer"
            ? { action, intakeId, snapshotId, publicationId, requestKey: crypto.randomUUID() }
            : action === "rights_read"
              ? { action }
              : { action, intakeId: action === "read" && version === 0 ? null : intakeId };
      const response = await request("/portal/intake/command", body, "patient");
      const expected = typeof command.expectedStatus === "number" ? command.expectedStatus : 200;
      invariant(response.status === expected, `PATIENT_${action}_STATUS_${response.status}`);
      if (response.status === 200) {
        const result = (await response.json()) as {
          version?: number;
          snapshotId?: string;
          record?: { version: number; snapshotId: string };
          history?: unknown[];
        };
        if (result.version ?? result.record?.version)
          version = (result.version ?? result.record?.version)!;
        if (result.snapshotId ?? result.record?.snapshotId)
          snapshotId = (result.snapshotId ?? result.record?.snapshotId)!;
        console.log(
          JSON.stringify({
            action,
            accepted: true,
            version,
            snapshotId,
            historyCount: result.history?.length,
          }),
        );
      } else console.log(JSON.stringify({ action, denied: true, status: response.status }));
    } else if (input.action === "staff") {
      invariant(
        input.actor && actors.has(input.actor) && input.actor !== "patient",
        "ACTOR_MISSING",
      );
      const command = { ...input.command };
      const expected = typeof command.expectedStatus === "number" ? command.expectedStatus : 200;
      const expectedFields = command.expectedFields;
      delete command.expectedStatus;
      delete command.expectedFields;
      const response = await request("/staff/intake/command", command, input.actor);
      invariant(response.status === expected, `STAFF_STATUS_${response.status}`);
      const body =
        response.status === 200 ? ((await response.json()) as Record<string, unknown>) : null;
      if (Array.isArray(expectedFields)) {
        invariant(body?.fields && typeof body.fields === "object", "FIELD_PROJECTION_MISSING");
        invariant(
          JSON.stringify(Object.keys(body.fields).sort()) ===
            JSON.stringify([...expectedFields].sort()),
          "FIELD_PROJECTION_MISMATCH",
        );
      }
      console.log(
        JSON.stringify({
          action: input.action,
          actor: input.actor,
          status: response.status,
          receipt: typeof body?.reference === "string" ? body.reference : undefined,
          fields:
            body && typeof body.fields === "object" && body.fields
              ? Object.keys(body.fields)
              : undefined,
          payloadLogged: false,
        }),
      );
    } else if (input.action === "revoke") {
      for (const actor of actors.keys()) {
        if (!actors.get(actor)!.cookie) continue;
        const response = await request(
          actor === "patient" ? "/account/sign-out" : "/staff/sign-out",
          { action: "sign-out" },
          actor,
          true,
        );
        invariant(response.status === 204, "SIGN_OUT_FAILED");
      }
      for (const token of tokens) await admin.auth.admin.signOut(token, "global");
      console.log(JSON.stringify({ action: input.action, completed: true }));
    } else if (input.action === "delete-auth") {
      // Execute only after the separately approved SQL fixture cleanup has been verified.
      for (const actor of actors.values()) {
        const deleted = await admin.auth.admin.deleteUser(actor.id);
        invariant(!deleted.error, "AUTH_CLEANUP_FAILED");
      }
      console.log(JSON.stringify({ action: input.action, deleted: actors.size }));
      break;
    } else throw new Error("ACTION_REJECTED");
  } catch (error) {
    console.log(
      JSON.stringify({
        failed: true,
        code: error instanceof Error ? error.message : "EXERCISE_FAILED",
      }),
    );
  }
}
