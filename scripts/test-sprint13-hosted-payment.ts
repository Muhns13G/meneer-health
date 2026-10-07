import { execFileSync, spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { orderReviewResultSchema } from "../src/domain/payments/order-review";
import { paymentStatusPageSchema } from "../src/domain/payments/payment-status";
import { queueCommandResultSchema } from "../src/application/operations/queue-command";

// Explicitly authorised deposit-only hosted exercise. Never CI, source deployment or live money.
const origin = "https://meneerhealth.co.za";
const tenant = "e1340000-0000-4000-8000-000000000001";
const caseId = "e1340000-0000-4000-8000-000000000010";
const service = "e1340000-0000-4000-8000-000000000020";
const realPilot = "80000000-0000-4000-8000-000000000001";
const account = "acct_1U32UbFfj16Nnr1i";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const key = process.env.STRIPE_RESTRICTED_KEY;
const savedService = process.env.STRIPE_WEBHOOK_SERVICE_IDENTITY_ID;
const savedSigningSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
const expectedVersion = process.env.SPRINT13_PAYMENT_BASELINE_VERSION;
const nodeDirectory = process.env.SPRINT13_NODE_DIRECTORY;
invariant(
  process.stdin.isTTY &&
    !process.env.CI &&
    process.env.SPRINT13_PAYMENT_CONFIRM === "isolated-deposit-capture-refund-only" &&
    process.env.SPRINT13_PAYMENT_RESTORE_CONFIRM === "saved-stripe-disabled-suspended-pilot" &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_SECRET_KEY &&
    key?.startsWith("rk_test_") &&
    savedService &&
    uuid.test(savedService) &&
    savedSigningSecret?.startsWith("whsec_") &&
    expectedVersion &&
    uuid.test(expectedVersion) &&
    nodeDirectory?.endsWith("/node/v22.23.2/bin"),
  "SPRINT13_PAYMENT_GUARD_REJECTED",
);
invariant(
  key && savedService && savedSigningSecret && expectedVersion && nodeDirectory,
  "RESTORATION_INPUT_MISSING",
);
const managementToken = execFileSync(
  "security",
  ["find-generic-password", "-s", "Supabase CLI", "-w"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
).trim();
invariant(managementToken.startsWith("sbp_"), "MANAGEMENT_AUTH_UNAVAILABLE");
async function sql(query: string, readOnly = true): Promise<Record<string, unknown>[]> {
  const response = await fetch(
    "https://api.supabase.com/v1/projects/gibfpolrdjotwvewgfsz/database/query",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${managementToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: readOnly }),
      signal: AbortSignal.timeout(30000),
    },
  );
  invariant(response.ok, `SPRINT13_SQL_STATUS_${response.status}`);
  return response.json();
}
function wrangler(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("bunx", ["wrangler", ...args], {
      env: { ...process.env, PATH: `${nodeDirectory}:${process.env.PATH}` },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, 60000);
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.resume();
    child.on("error", () => {
      clearTimeout(timeout);
      reject(new Error("CONFIGURATION_COMMAND_FAILED"));
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(output);
      else reject(new Error("CONFIGURATION_COMMAND_FAILED"));
    });
    child.stdin.end(input);
  });
}
type Version = { resources: { script: { etag: string } } };
async function activeVersion() {
  const entries = JSON.parse(await wrangler(["deployments", "list", "--json"])) as {
    versions: { version_id: string; percentage: number }[];
  }[];
  const versions = entries.at(-1)?.versions;
  invariant(versions?.length === 1 && versions[0]?.percentage === 100, "SPLIT_DEPLOYMENT_REJECTED");
  return versions[0].version_id;
}
async function version(id: string): Promise<Version> {
  invariant(uuid.test(id), "VERSION_ID_INVALID");
  return JSON.parse(await wrangler(["versions", "view", id, "--json"])) as Version;
}
const stripe = new Stripe(key, {
  apiVersion: "2026-07-29.dahlia",
  telemetry: false,
  timeout: 15000,
  maxNetworkRetries: 1,
});
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
type Actor = { id: string; email: string; subjectId?: string; cookie?: string };
const actors = new Map<string, Actor>();
const tokens = new Set<string>();
const directory = mkdtempSync(join(tmpdir(), "meneer-sprint13-payment-"));
const manifestPath = join(directory, "manifest.json");
const checkoutPath = join(directory, "checkout.json");
let baseline: Record<string, unknown>[] = [];
let baselineTriggers: Record<string, unknown>[] = [];
let endpoint: string | undefined;
let session: string | undefined;
let configurationVersion: string | undefined;
let restoredVersion = expectedVersion;
let etag: string | undefined;
let configurationAttempted = false;
let passed = false;
const cleanupFailures: string[] = [];
function manifest(stage: string) {
  writeFileSync(
    manifestPath,
    JSON.stringify({
      task: "2.13.4",
      stage,
      tenant,
      caseId,
      service,
      account,
      expectedVersion,
      configurationVersion,
      restoredVersion,
      scriptETag: etag,
      endpoint,
      session,
      actors: [...actors].map(([role, actor]) => ({
        role,
        id: actor.id,
        subjectId: actor.subjectId,
      })),
      baseline,
      baselineTriggers,
      cleanupFailures,
    }),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({ exercise: "sprint13-payment", stage, manifestPath, secretsLogged: false }),
  );
}
function template(name: string, values: Record<string, string>) {
  let result = readFileSync(`scripts/sql/${name}.sql`, "utf8");
  for (const [name, value] of Object.entries(values))
    result = result.replaceAll(`{{${name}}}`, value);
  invariant(!result.includes("{{"), "SQL_TEMPLATE_INCOMPLETE");
  return result;
}
function cleanupSql() {
  const roots = [
    tenant,
    service,
    ...[...actors.values()].flatMap((actor) => [
      actor.id,
      ...(actor.subjectId ? [actor.subjectId] : []),
    ]),
    ...[2, 3, 4, 5, 6, 10, 11, 12, 20].map(
      (n) => `e1340000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    ),
  ];
  invariant(
    roots.every((id) => uuid.test(id)),
    "CLEANUP_ROOT_INVALID",
  );
  invariant(
    baseline.length > 0 &&
      baseline.every(
        (row) =>
          /^[a-z_]+\.[a-z_]+$/.test(String(row.relation)) &&
          /^[a-f0-9]{32}$/.test(String(row.fingerprint)) &&
          Number.isSafeInteger(Number(row.n)),
      ),
    "BASELINE_INVALID",
  );
  return template("sprint-13-onboarding-cleanup", {
    roots: JSON.stringify([...new Set(roots)]),
    baseline: JSON.stringify(baseline),
  });
}
async function inventory() {
  return sql(readFileSync("scripts/sql/sprint-13-onboarding-baseline.sql", "utf8"));
}
async function triggers() {
  return sql(`select n.nspname||'.'||c.relname as relation,t.tgname,t.tgenabled
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and n.nspname in('public','identity_private','intake_private','commerce_private',
    'audit_private','payments_private','fulfilment_private','lifecycle_private','measurement_private')
    order by relation,t.tgname`);
}
async function request(path: string, body: Record<string, unknown>, role?: string, form = false) {
  const response = await fetch(origin + path, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json",
      "Idempotency-Key": String(body.requestKey ?? randomUUID()),
      ...(role && actors.get(role)?.cookie ? { Cookie: actors.get(role)!.cookie! } : {}),
    },
    body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  invariant(response.headers.get("cache-control")?.includes("no-store"), "NO_STORE_MISSING");
  invariant(!response.headers.has("access-control-allow-origin"), "UNEXPECTED_CORS");
  return response;
}
function remember(response: Response, actor: Actor) {
  const cookie = response.headers.get("set-cookie");
  invariant(cookie, "SECURE_COOKIE_MISSING");
  invariant(
    cookie?.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=Strict"),
    "SECURE_COOKIE_MISSING",
  );
  actor.cookie = cookie.split(";", 1)[0];
}
async function code(actor: Actor) {
  const result = await admin.auth.admin.generateLink({ type: "magiclink", email: actor.email });
  invariant(!result.error && result.data.user.id === actor.id, "SESSION_PREREQUISITE_FAILED");
  return result.data.properties.email_otp;
}
function totp(secret: string) {
  let bits = "";
  for (const character of secret.replaceAll("=", "").toUpperCase()) {
    const index = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(character);
    invariant(index >= 0, "FACTOR_INVALID");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function login(role: string) {
  const actor = actors.get(role)!;
  const response = await request(
    role === "patient" ? "/account/sign-in" : "/staff/sign-in",
    { action: "verify", email: actor.email, code: await code(actor) },
    undefined,
    true,
  );
  invariant(
    response.status === (role === "patient" ? 204 : 200),
    `LOGIN_${role.toUpperCase()}_${response.status}`,
  );
  remember(response, actor);
  if (role !== "patient") {
    const body = (await response.json()) as { enrollment?: { secret: string } };
    invariant(body.enrollment?.secret, "MFA_ENROLLMENT_MISSING");
    invariant(
      (await request("/staff/payments/read", { cursor: null, caseId }, role)).status === 403,
      "EMAIL_ONLY_ACCESS_ALLOWED",
    );
    const mfa = await request("/staff/mfa", { code: totp(body.enrollment.secret) }, role, true);
    invariant(mfa.status === 204, `MFA_${mfa.status}`);
    remember(mfa, actor);
  }
}
async function prepareConfiguration(
  values: Record<string, string>,
  current: string,
  message: string,
) {
  invariant((await activeVersion()) === current, "CONCURRENT_DEPLOYMENT_CHANGED");
  const output = await wrangler(
    ["versions", "secret", "bulk", "--message", message],
    JSON.stringify(values),
  );
  const created = output.match(/Created version ([a-f0-9-]{36})/)?.[1];
  invariant(
    created &&
      (await version(created)).resources.script.etag === etag &&
      (await activeVersion()) === current,
    "CONFIGURATION_CODE_OR_DEPLOYMENT_CHANGED",
  );
  return created;
}
async function deployedStatus(reviewStatus: number, webhookStatus: number, active: string) {
  for (let attempt = 0; attempt < 18; attempt++) {
    invariant((await activeVersion()) === active, "CONCURRENT_DEPLOYMENT_CHANGED");
    if (
      (await request("/portal/order/command", { action: "read" })).status === reviewStatus &&
      (await request("/api/payments/stripe/webhook", {})).status === webhookStatus
    )
      return;
    if (attempt < 17) await delay(5000);
  }
  throw new Error("CONFIGURATION_PROPAGATION_UNCONFIRMED");
}
try {
  invariant((await stripe.accounts.retrieveCurrent()).id === account, "STRIPE_ACCOUNT_MISMATCH");
  invariant(
    (await stripe.webhookEndpoints.list({ limit: 1 })).data.length === 0,
    "WEBHOOK_BASELINE_CHANGED",
  );
  invariant((await activeVersion()) === expectedVersion, "DEPLOYMENT_BASELINE_CHANGED");
  etag = (await version(expectedVersion)).resources.script.etag;
  invariant(
    (await request("/portal/order/command", { action: "read" })).status === 412 &&
      (await request("/portal/payments/refund", { action: "read" })).status === 412 &&
      (await request("/api/payments/stripe/webhook", {})).status === 404,
    "COMMERCE_NOT_DISABLED",
  );
  const scope = await sql(`select (select count(*)=0 from auth.users) as auth_empty,
    (select count(*)=0 from auth.sessions) as sessions_empty,
    (select count(*)=1 from public.tenants) and exists(select 1 from public.tenants
      where id='${realPilot}' and status='suspended') as suspended_pilot,
    exists(select 1 from supabase_migrations.schema_migrations where version='20261007220000') as correction_applied`);
  invariant(
    Object.values(scope[0] ?? {}).length === 4 && Object.values(scope[0]!).every((v) => v === true),
    "HOSTED_SCOPE_CHANGED",
  );
  baseline = await inventory();
  baselineTriggers = await triggers();
  invariant(
    baseline.length === 125 &&
      baseline
        .filter(
          (row) =>
            !["public.tenants", "public.fulfilment_provider_gates"].includes(String(row.relation)),
        )
        .every((row) => Number(row.n) === 0),
    "APPLICATION_BASELINE_CHANGED",
  );
  manifest("baseline-verified");
  const alertModes = JSON.parse(
    await wrangler(["versions", "view", expectedVersion, "--json"]),
  ) as {
    resources: { bindings: { name: string; type: string; text?: string }[] };
  };
  invariant(
    alertModes.resources.bindings.some(
      (binding) =>
        binding.name === "OPERATIONS_ALERTS_MODE" &&
        binding.type === "plain_text" &&
        binding.text === "disabled",
    ),
    "OUTBOUND_ALERTS_NOT_PROVEN_DISABLED",
  );
  for (const role of ["patient", "operations", "alternate", "admin", "clinician"]) {
    const email = `s13-${role}-${randomUUID()}@example.invalid`;
    const result = await admin.auth.admin.createUser({ email, email_confirm: true });
    invariant(!result.error && result.data.user, "AUTH_CREATE_FAILED");
    const actor: Actor = { id: result.data.user.id, email };
    actors.set(role, actor);
    manifest("auth-created");
    const mapped = await sql(`select subject_id from public.external_identities
      where provider='supabase' and provider_subject='${actor.id}'`);
    invariant(
      mapped.length === 1 && uuid.test(String(mapped[0]?.subject_id)),
      "AUTH_SUBJECT_MISSING",
    );
    actor.subjectId = String(mapped[0]!.subject_id);
    manifest("auth-linked");
  }
  const patient = actors.get("patient")!;
  const bootstrap = await admin.auth.verifyOtp({
    email: patient.email,
    token: await code(patient),
    type: "email",
  });
  invariant(!bootstrap.error && bootstrap.data.session, "PROVIDER_SESSION_FAILED");
  tokens.add(bootstrap.data.session.access_token);
  const jwt = JSON.parse(
    Buffer.from(bootstrap.data.session.access_token.split(".")[1]!, "base64url").toString(),
  ) as { session_id: string };
  invariant(uuid.test(jwt.session_id), "PROVIDER_SESSION_INVALID");
  const setup = template("sprint-13-payment-setup", {
    ...Object.fromEntries([...actors].map(([role, actor]) => [role, actor.subjectId!])),
    patientAuth: patient.id,
    providerSession: jwt.session_id,
  });
  await sql(
    setup.replace(/commit;\s*$/, "") +
      cleanupSql()
        .replace(/^([\s\S]*?)begin;/, "")
        .replace(/commit;/, "rollback;"),
    false,
  );
  manifest("setup-cleanup-rollback-passed");
  await sql(setup, false);
  manifest("fixtures-created");
  const hook = await stripe.webhookEndpoints.create({
    url: origin + "/api/payments/stripe/webhook",
    api_version: "2026-07-29.dahlia",
    enabled_events: [
      "checkout.session.completed",
      "checkout.session.expired",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "payment_intent.payment_failed",
      "charge.refunded",
      "refund.created",
      "refund.updated",
      "refund.failed",
    ],
    description: "Disposable Sprint 13.4 deposit-only rehearsal",
  });
  endpoint = hook.id;
  manifest("webhook-created");
  invariant(hook.secret, "SANDBOX_WEBHOOK_SECRET_MISSING");
  invariant(!hook.livemode && hook.secret?.startsWith("whsec_"), "SANDBOX_WEBHOOK_INVALID");
  configurationVersion = await prepareConfiguration(
    {
      COMMERCE_REVIEW_MODE: "enabled",
      COMMERCE_CHECKOUT_MODE: "sandbox",
      COMMERCE_WEBHOOK_MODE: "sandbox",
      COMMERCE_REFUND_MODE: "disabled",
      COMMERCE_REVIEW_TENANT_ID: tenant,
      STRIPE_CHECKOUT_ACCOUNT_ID: account,
      STRIPE_RESTRICTED_KEY: key,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: service,
      STRIPE_WEBHOOK_SIGNING_SECRET: hook.secret,
    },
    expectedVersion,
    "Authorised Sprint 13.4 isolated deposit configuration",
  );
  configurationAttempted = true;
  manifest("configuration-prepared");
  await wrangler([
    "versions",
    "deploy",
    `${configurationVersion}@100`,
    "--yes",
    "--message",
    "Authorised synthetic deposit rehearsal only",
  ]);
  await deployedStatus(401, 400, configurationVersion);
  await login("patient");
  await login("operations");
  await login("alternate");
  await login("clinician");
  invariant(
    (await request("/staff/payments/read", { cursor: null, caseId }, "operations")).status === 403,
    "UNASSIGNED_PAYMENT_ALLOWED",
  );
  await sql(
    `insert into public.operations_assignments
    (tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
    values('${tenant}','${caseId}','${patient.subjectId}','${actors.get("operations")!.subjectId}',
      '${actors.get("admin")!.subjectId}',now()-interval '1 minute',now()+interval '2 hours'),
    ('${tenant}','${caseId}','${patient.subjectId}','${actors.get("alternate")!.subjectId}',
      '${actors.get("admin")!.subjectId}',now()-interval '1 minute',now()+interval '2 hours');`,
    false,
  );
  invariant(
    (await request("/staff/payments/read", { cursor: null, caseId }, "operations")).status === 200,
    "ASSIGNED_PAYMENT_REJECTED",
  );
  invariant(
    (await request("/staff/payments/read", { cursor: null, caseId }, "clinician")).status === 403,
    "WRONG_ROLE_ALLOWED",
  );
  invariant(
    (await request("/staff/payments/read", { cursor: null, caseId: randomUUID() }, "operations"))
      .status === 403,
    "WRONG_CASE_ALLOWED",
  );
  const command = { action: "claim", caseId, expectedVersion: "1", requestKey: randomUUID() };
  const claim = await request("/staff/queue/command", command, "operations", true);
  invariant(
    claim.status === 200 && queueCommandResultSchema.parse(await claim.json()).version === 2,
    "QUEUE_CLAIM_FAILED",
  );
  const replay = await request("/staff/queue/command", command, "operations", true);
  invariant(
    replay.status === 200 && queueCommandResultSchema.parse(await replay.json()).version === 2,
    "QUEUE_REPLAY_FAILED",
  );
  invariant(
    (
      await request(
        "/staff/queue/command",
        { ...command, requestKey: randomUUID() },
        "operations",
        true,
      )
    ).status === 409,
    "QUEUE_STALE_CONFLICT_FAILED",
  );
  invariant(
    (
      await request(
        "/staff/queue/command",
        { ...command, action: "release", expectedVersion: "2" },
        "operations",
        true,
      )
    ).status === 409,
    "QUEUE_CHANGED_REPLAY_CONFLICT_FAILED",
  );
  invariant(
    (
      await request(
        "/staff/queue/command",
        { ...command, action: "release", expectedVersion: "2", requestKey: randomUUID() },
        "alternate",
        true,
      )
    ).status === 403,
    "QUEUE_FOREIGN_RELEASE_ALLOWED",
  );
  const claimProof = await sql(`select
    (select version=2 from public.operations_cases where id='${caseId}') as unchanged_version,
    (select count(*)=1 from public.operations_claims where case_id='${caseId}' and released_at is null
      and workforce_subject_id='${actors.get("operations")!.subjectId}') as sole_owner,
    (select count(*)=1 from identity_private.operations_commands where tenant_id='${tenant}') as one_receipt`);
  invariant(
    Object.values(claimProof[0]!).every((v) => v === true),
    "QUEUE_CONFLICT_STATE_CHANGED",
  );
  for (const [role, action, expected, next] of [
    ["operations", "release", 2, 3],
    ["alternate", "claim", 3, 4],
    ["alternate", "release", 4, 5],
    ["operations", "claim", 5, 6],
  ] as const) {
    const response = await request(
      "/staff/queue/command",
      {
        action,
        caseId,
        expectedVersion: String(expected),
        requestKey: randomUUID(),
      },
      role,
      true,
    );
    invariant(
      response.status === 200 &&
        queueCommandResultSchema.parse(await response.json()).version === next,
      "QUEUE_RELEASE_RECLAIM_FAILED",
    );
  }
  manifest("assignment-aal2-claims-conflicts-passed");
  const read = await request("/portal/order/command", { action: "read" }, "patient");
  invariant(read.status === 200, "ORDER_READ_FAILED");
  const review = orderReviewResultSchema.parse(await read.json()).review;
  invariant(
    review?.amountTotalMinor === 99900 && !review.acceptance && !review.checkoutEnabled,
    "DEPOSIT_REVIEW_INVALID",
  );
  const accepted = await request(
    "/portal/order/command",
    {
      action: "accept",
      offerId: review.offerId,
      publicationId: review.terms.publicationId,
      snapshotHash: review.snapshotHash,
      contentHash: review.terms.contentHash,
      accepted: true,
      requestKey: randomUUID(),
    },
    "patient",
  );
  invariant(
    accepted.status === 200 &&
      orderReviewResultSchema.parse(await accepted.json()).review?.checkoutEnabled,
    "DEPOSIT_ACCEPTANCE_FAILED",
  );
  const checkout = await request(
    "/portal/order/command",
    {
      action: "checkout",
      offerId: review.offerId,
      requestKey: randomUUID(),
    },
    "patient",
  );
  invariant(checkout.status === 200, "CHECKOUT_FAILED");
  const body = (await checkout.json()) as { checkoutUrl: string };
  invariant(
    new URL(body.checkoutUrl).origin === "https://checkout.stripe.com",
    "CHECKOUT_ORIGIN_INVALID",
  );
  const linked = await sql(
    `select session_id from commerce_private.checkout_intents where tenant_id='${tenant}'`,
  );
  invariant(
    linked.length === 1 && /^cs_test_/.test(String(linked[0]?.session_id)),
    "CHECKOUT_SESSION_INVALID",
  );
  session = String(linked[0]!.session_id);
  manifest("checkout-created");
  const unpaid = await stripe.checkout.sessions.retrieve(session);
  invariant(
    !unpaid.livemode &&
      unpaid.amount_total === 99900 &&
      unpaid.currency === "zar" &&
      unpaid.payment_status === "unpaid",
    "UNPAID_CHECKOUT_INVALID",
  );
  const lineage = await sql(`select id from commerce_private.checkout_intents
    where tenant_id='${tenant}' and session_id='${session}'`);
  invariant(
    lineage.length === 1 &&
      uuid.test(String(lineage[0]?.id)) &&
      unpaid.client_reference_id === lineage[0]!.id &&
      unpaid.metadata?.orderId === lineage[0]!.id &&
      unpaid.metadata?.tenantId === tenant,
    "OPAQUE_CHECKOUT_LINEAGE_INVALID",
  );
  // The management read-only role cannot execute this deliberately private function.
  // Use the approved operator role for this SELECT only; do not broaden the function ACL.
  const before = await sql(
    `select not commerce_private.deposit_ready('${caseId}') as held,
    (select count(*)=0 from commerce_private.deposit_funding where tenant_id='${tenant}') as unfunded`,
    false,
  );
  invariant(
    before[0]?.held === true && before[0]?.unfunded === true,
    "CHECKOUT_FABRICATED_PAYMENT",
  );
  writeFileSync(checkoutPath, JSON.stringify({ checkoutUrl: body.checkoutUrl }), { mode: 0o600 });
  console.log(
    JSON.stringify({
      exercise: "sprint13-payment",
      awaitingOfficialTestCheckout: true,
      checkoutPath,
    }),
  );
  const lines = createInterface({ input: process.stdin, terminal: false });
  const timeout = setTimeout(() => lines.close(), 15 * 60 * 1000);
  let confirmed = false;
  for await (const line of lines)
    if (line.trim() === "paid") {
      confirmed = true;
      break;
    }
  clearTimeout(timeout);
  lines.close();
  invariant(confirmed, "CHECKOUT_NOT_CONFIRMED");
  const paid = await stripe.checkout.sessions.retrieve(session);
  const paymentId =
    typeof paid.payment_intent === "string" ? paid.payment_intent : paid.payment_intent?.id;
  invariant(
    !paid.livemode &&
      paid.status === "complete" &&
      paid.payment_status === "paid" &&
      paid.amount_total === 99900 &&
      paid.currency === "zar" &&
      paymentId,
    "CAPTURE_UNPROVEN",
  );
  let signed = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    const result = await sql(`select exists(select 1 from commerce_private.checkout_intents i
      join commerce_private.settlements s on s.intent_id=i.id
      join commerce_private.intent_payment_bindings b on b.intent_id=i.id
      join commerce_private.receipt_applications a on a.intent_id=i.id
      join commerce_private.provider_receipts p on p.account_id=a.account_id and p.event_id=a.event_id
      join commerce_private.deposit_funding f on f.source_intent_id=i.id
      where i.tenant_id='${tenant}' and i.session_id='${session}' and s.paid_confirmed
      and not s.reconciliation_required and p.event_type='checkout.session.completed'
      and p.amount_minor=99900 and b.payment_intent_id='${paymentId}'
      and p.payment_intent_id=b.payment_intent_id and p.account_id='${account}'
      and f.amount_minor=99900) as signed`);
    if (result[0]?.signed === true) {
      signed = true;
      break;
    }
    await delay(5000);
  }
  invariant(signed, "GENUINE_SIGNED_FUNDING_MISSING");
  const bridge = await sql(
    `select commerce_private.deposit_ready('${caseId}') as deposit_ready,
    intake_private.review_payment_ready('e1340000-0000-4000-8000-000000000003') as review_ready,
    (select count(*)=1 from commerce_private.deposit_funding where tenant_id='${tenant}') as exactly_one_funding,
    (select state='onboarding_pending' and version=6 from public.operations_cases where id='${caseId}') as no_advance,
    (select count(*)=0 from public.handoff_attempts where tenant_id='${tenant}') as no_transfer,
    (select count(*)=0 from public.fulfilment_cases where tenant_id='${tenant}') as no_supply`,
    false,
  );
  invariant(
    Object.values(bridge[0]!).every((value) => value === true),
    "PAID_REVIEW_BRIDGE_INVALID",
  );
  for (const [role, path, payload] of [
    ["patient", "/portal/payments/read", { cursor: null }],
    ["operations", "/staff/payments/read", { cursor: null, caseId }],
  ] as const) {
    const response = await request(path, payload, role);
    invariant(response.status === 200, "SETTLED_PROJECTION_FAILED");
    const projection = paymentStatusPageSchema.parse(await response.json());
    invariant(
      projection.payments.length === 1 &&
        projection.payments[0]?.scenario === "review_deposit" &&
        projection.payments[0].status === "confirmed" &&
        projection.payments[0].amountTotalMinor === 99900 &&
        !projection.payments[0].requiresReview &&
        !projection.payments[0].dispute &&
        projection.payments[0].refundedMinor === 0,
      "SETTLED_PROJECTION_FACTS_INVALID",
    );
  }
  passed = true;
  manifest("capture-signed-funding-paid-review-passed");
} catch (error) {
  console.error(
    error instanceof Error && /^[A-Z_0-9]+$/.test(error.message)
      ? error.message
      : "SPRINT13_PAYMENT_FAILED",
  );
} finally {
  try {
    // A failed response must not hide an already attached provider Session from cleanup.
    if (!session && actors.size > 0) {
      const attached = await sql(
        `select session_id from commerce_private.checkout_intents where tenant_id='${tenant}'`,
      );
      invariant(attached.length <= 1, "CLEANUP_CHECKOUT_SCOPE_CHANGED");
      if (attached.length === 1) {
        invariant(/^cs_test_/.test(String(attached[0]?.session_id)), "CLEANUP_CHECKOUT_UNCERTAIN");
        session = String(attached[0]!.session_id);
        manifest("cleanup-session-recovered");
      }
    }
    if (session) {
      const current = await stripe.checkout.sessions.retrieve(session);
      invariant(
        !current.livemode && current.amount_total === 99900 && current.currency === "zar",
        "CLEANUP_SESSION_CHANGED",
      );
      if (current.status === "open") await stripe.checkout.sessions.expire(session);
      if (current.payment_status === "paid") {
        const paymentId =
          typeof current.payment_intent === "string"
            ? current.payment_intent
            : current.payment_intent?.id;
        invariant(paymentId, "CLEANUP_CAPTURE_MISSING");
        const payment = await stripe.paymentIntents.retrieve(paymentId, {
          expand: ["latest_charge"],
        });
        const charge = payment.latest_charge;
        invariant(
          !payment.livemode &&
            payment.amount_received === 99900 &&
            charge &&
            typeof charge !== "string" &&
            !charge.livemode &&
            !charge.disputed,
          "CLEANUP_CAPTURE_INVALID",
        );
        if (charge.amount_refunded < charge.amount) {
          let refund = await stripe.refunds.create(
            { payment_intent: paymentId, amount: charge.amount - charge.amount_refunded },
            { idempotencyKey: `s13-4-cleanup-${session}` },
          );
          for (let attempt = 0; refund.status === "pending" && attempt < 18; attempt++) {
            await delay(5000);
            refund = await stripe.refunds.retrieve(refund.id);
          }
          invariant(
            refund.status === "succeeded" &&
              refund.payment_intent === paymentId &&
              refund.amount === charge.amount - charge.amount_refunded,
            "CLEANUP_REFUND_UNCONFIRMED",
          );
        }
      }
    }
  } catch {
    cleanupFailures.push("provider-session");
  }
  try {
    if (endpoint) await stripe.webhookEndpoints.del(endpoint);
  } catch {
    cleanupFailures.push("webhook");
  }
  try {
    if (configurationAttempted && configurationVersion) {
      const current = await activeVersion();
      invariant(
        current === configurationVersion || current === expectedVersion,
        "CONCURRENT_DEPLOYMENT_CHANGED",
      );
      restoredVersion = await prepareConfiguration(
        {
          COMMERCE_REVIEW_MODE: "disabled",
          COMMERCE_CHECKOUT_MODE: "disabled",
          COMMERCE_REFUND_MODE: "disabled",
          COMMERCE_WEBHOOK_MODE: "disabled",
          COMMERCE_REVIEW_TENANT_ID: realPilot,
          STRIPE_CHECKOUT_ACCOUNT_ID: account,
          STRIPE_RESTRICTED_KEY: key,
          STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: savedService,
          STRIPE_WEBHOOK_SIGNING_SECRET: savedSigningSecret,
        },
        current,
        "Approved saved-Stripe disabled suspended-pilot restoration",
      );
      manifest("restoration-prepared");
      await wrangler([
        "versions",
        "deploy",
        `${restoredVersion}@100`,
        "--yes",
        "--message",
        "Restore disabled commerce after deposit-only rehearsal",
      ]);
      await deployedStatus(412, 404, restoredVersion);
    }
  } catch {
    cleanupFailures.push("worker");
  }
  try {
    for (const [role, actor] of actors)
      if (actor.cookie) {
        const response = await request(
          role === "patient" ? "/account/sign-out" : "/staff/sign-out",
          { action: "sign-out" },
          role,
          true,
        );
        invariant(response.status === 204, "ROUTED_SESSION_CLEANUP_FAILED");
      }
    for (const token of tokens) {
      const result = await admin.auth.admin.signOut(token, "global");
      if (result.error) {
        // Routed sign-out may already remove the bootstrap session. Prove zero provider
        // sessions for every manifested identity rather than treating an absent session as live.
        const ids = [...actors.values()].map((actor) => `'${actor.id}'`).join(",");
        const remaining = await sql(
          `select count(*)=0 as empty from auth.sessions where user_id in(${ids})`,
        );
        invariant(remaining[0]?.empty === true, "PROVIDER_SESSION_CLEANUP_FAILED");
      }
    }
    if (actors.size > 0) {
      for (const actor of actors.values())
        if (!actor.subjectId) {
          const linked = await sql(
            `select subject_id from public.external_identities where provider='supabase' and provider_subject='${actor.id}'`,
          );
          invariant(
            linked.length === 1 && uuid.test(String(linked[0]?.subject_id)),
            "CLEANUP_SUBJECT_UNCERTAIN",
          );
          actor.subjectId = String(linked[0]!.subject_id);
        }
      invariant(!cleanupFailures.includes("provider-session"), "PAYMENT_RECONCILIATION_REQUIRED");
      await sql(cleanupSql(), false);
      for (const actor of actors.values()) {
        const result = await admin.auth.admin.deleteUser(actor.id);
        invariant(!result.error, "AUTH_CLEANUP_FAILED");
      }
      invariant(
        JSON.stringify(await inventory()) === JSON.stringify(baseline),
        "BASELINE_RESTORE_FAILED",
      );
      invariant(
        JSON.stringify(await triggers()) === JSON.stringify(baselineTriggers),
        "TRIGGER_RESTORE_FAILED",
      );
      const final = await sql(`select (select count(*)=0 from auth.users) as auth_empty,
        (select count(*)=0 from auth.sessions) as sessions_empty,
        (select count(*)=1 from public.tenants) and exists(select 1 from public.tenants
          where id='${realPilot}' and status='suspended') as suspended_pilot`);
      invariant(
        Object.values(final[0]!).every((value) => value === true),
        "FINAL_SCOPE_RESTORE_FAILED",
      );
    }
  } catch {
    cleanupFailures.push("database-auth");
  }
  manifest(passed && cleanupFailures.length === 0 ? "passed-and-restored" : "incomplete");
  console.log(
    JSON.stringify({
      exercise: "sprint13-payment-restoration",
      passed,
      restored: cleanupFailures.length === 0,
      failedBoundaries: cleanupFailures,
      restoredVersion,
      realPilotActivated: false,
      StripeTestRecordsRetained: Boolean(session),
      secretsLogged: false,
    }),
  );
  process.exitCode = passed && cleanupFailures.length === 0 ? 0 : 1;
}
