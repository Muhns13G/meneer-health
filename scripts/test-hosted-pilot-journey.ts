import { createHmac } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { orderReviewResultSchema } from "../src/domain/payments/order-review";
import { refundViewSchema } from "../src/domain/payments/refund";

// Authorised operator-only hosted proof. Never CI, live credentials, source deployment or real data.
const origin = "https://meneerhealth.co.za";
const tenant = "e1191000-0000-4000-8000-000000000001";
const service = "e1191000-0000-4000-8000-000000000020";
const account = "acct_1U32UbFfj16Nnr1i";
// Owner-confirmed current code, configuration-only disabled baseline; never restore older source.
const baselineVersion = "f7ddeaa9-e71a-46d3-872a-b740ed43c95b";
const scenario = process.env.HOSTED_PILOT_JOURNEY_SCENARIO ?? "credited-refund";
invariant(
  ["credited-refund", "zero-balance", "replacement", "dispute-won", "dispute-lost"].includes(
    scenario,
  ),
  "SCENARIO_INVALID",
);
const zeroBalance = scenario === "zero-balance";
const previousConfiguration = "d6662c59-8cf3-4786-acaa-0c202c094fd4";
const previousJourneyConfiguration = process.env.HOSTED_PILOT_PREVIOUS_CONFIGURATION_VERSION;
const nodeDirectory = process.env.HOSTED_PILOT_NODE_DIRECTORY;
const key = process.env.STRIPE_RESTRICTED_KEY;
const artifact = "/private/tmp/meneer-11-9-checkout.json";
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
invariant(
  process.env.HOSTED_PILOT_JOURNEY_CONFIRM === "isolated-sandbox-capture-only" &&
    key?.startsWith("rk_test_") &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_SECRET_KEY &&
    (!previousJourneyConfiguration || /^[a-f0-9-]{36}$/.test(previousJourneyConfiguration)) &&
    nodeDirectory?.endsWith("/node/v22.23.2/bin"),
  "HOSTED_JOURNEY_GUARD_REJECTED",
);
const token = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
invariant(token.startsWith("sbp_"), "CLI_AUTH_UNAVAILABLE");
async function sql(query: string, readOnly = true): Promise<Record<string, unknown>[]> {
  const r = await fetch(
    "https://api.supabase.com/v1/projects/gibfpolrdjotwvewgfsz/database/query",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: readOnly }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!r.ok) {
    const failure = (await r.json()) as { message?: string };
    // PostgreSQL's first diagnostic line only; never DETAIL, row values, SQL or provider payloads.
    const diagnostic = failure.message?.match(/ERROR:\s*([^\n]+)/)?.[1];
    throw new Error(
      diagnostic
        ? `JOURNEY_SQL_${diagnostic
            .replace(/[^A-Za-z0-9_]/g, "_")
            .toUpperCase()
            .slice(0, 180)}`
        : `JOURNEY_SQL_STATUS_${r.status}`,
    );
  }
  return (await r.json()) as Record<string, unknown>[];
}
async function wrangler(args: string[], input?: string) {
  const p = spawn("bunx", ["wrangler", ...args], {
    env: {
      ...process.env,
      PATH: `${nodeDirectory}:${process.env.PATH}`,
      WRANGLER_LOG_PATH: "/private/tmp/meneer-11-9-config.log",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  return await new Promise<string>((resolve, reject) => {
    let out = "";
    p.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    p.stderr.resume();
    p.on("error", () => reject(new Error("CONFIGURATION_COMMAND_FAILED")));
    p.stdin.on("error", () => reject(new Error("CONFIGURATION_INPUT_FAILED")));
    p.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error("CONFIGURATION_COMMAND_FAILED")),
    );
    p.stdin.end(input);
  });
}
async function activeVersion() {
  const deployments = JSON.parse(await wrangler(["deployments", "list", "--json"])) as {
    versions: { version_id: string; percentage: number }[];
  }[];
  const active = deployments.at(-1)?.versions;
  invariant(active?.length === 1 && active[0]?.percentage === 100, "SPLIT_DEPLOYMENT_REJECTED");
  return active[0].version_id;
}
type Version = {
  id: string;
  resources: { script: { etag: string }; bindings: { name: string; text?: string }[] };
};
async function version(id: string): Promise<Version> {
  return JSON.parse(await wrangler(["versions", "view", id, "--json"])) as Version;
}
invariant(key, "TEST_KEY_REQUIRED");
const stripe = new Stripe(key, {
  apiVersion: "2026-07-29.dahlia",
  telemetry: false,
  timeout: 10000,
  maxNetworkRetries: 2,
});
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
type Actor = { id: string; subjectId?: string; email: string; cookie?: string };
const actors = new Map<string, Actor>();
const tokens = new Set<string>();
let baseline: Record<string, unknown>[] = [];
let configuredVersion: string | undefined;
let endpoint: string | undefined;
let session: string | undefined;
const createdSessions = new Set<string>();
let fixtureAttempted = false;
let activationAttempted = false;
let restoredVersion = baselineVersion;
let passed = false;
const failures: string[] = [];
function template(name: string, values: Record<string, string>) {
  let text = readFileSync(`scripts/sql/${name}.sql`, "utf8");
  for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{{${name}}}`, value);
  invariant(!text.includes("{{"), "SQL_TEMPLATE_INCOMPLETE");
  return text;
}
function cleanup() {
  const roots = [
    tenant,
    service,
    ...[...actors.values()].flatMap((a) => [a.id, ...(a.subjectId ? [a.subjectId] : [])]),
    ...[2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16].map(
      (n) => `e1191000-0000-4000-8000-${n.toString().padStart(12, "0")}`,
    ),
  ];
  invariant(
    roots.every((id) => /^[a-f0-9-]{36}$/.test(id)),
    "CLEANUP_ROOT_INVALID",
  );
  // Inventory contains only relation names, counts and hex hashes, never row content or credentials.
  invariant(
    baseline.every(
      (r) =>
        /^[a-z_]+\.[a-z_]+$/.test(String(r.relation)) &&
        /^[a-f0-9]{32}$/.test(String(r.fingerprint)) &&
        Number.isSafeInteger(Number(r.n)),
    ),
    "BASELINE_INVALID",
  );
  return template("sprint-11-journey-cleanup", {
    roots: JSON.stringify(roots),
    baseline: JSON.stringify(baseline),
  });
}
async function codeFor(actor: Actor) {
  const result = await admin.auth.admin.generateLink({ type: "magiclink", email: actor.email });
  invariant(!result.error && result.data.user.id === actor.id, "CODE_FAILED");
  return result.data.properties.email_otp;
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    invariant(n >= 0, "FACTOR_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function request(path: string, body: Record<string, unknown>, actor?: string, form = false) {
  const response = await fetch(origin + path, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json",
      "Idempotency-Key": String(body.requestKey ?? crypto.randomUUID()),
      ...(actor && actors.get(actor)?.cookie ? { Cookie: actors.get(actor)!.cookie! } : {}),
    },
    body: form ? new URLSearchParams(body as Record<string, string>) : JSON.stringify(body),
  });
  invariant(response.headers.get("cache-control")?.includes("no-store"), "NO_STORE_MISSING");
  invariant(!response.headers.has("access-control-allow-origin"), "CORS_GRANT_UNEXPECTED");
  return response;
}
function remember(r: Response, actor: Actor) {
  const cookie = r.headers.get("set-cookie");
  invariant(cookie, "COOKIE_MISSING");
  invariant(
    cookie?.includes("HttpOnly") && cookie.includes("Secure") && cookie.includes("SameSite=Strict"),
    "COOKIE_INVALID",
  );
  actor.cookie = cookie.split(";", 1)[0];
}
async function login(role: string) {
  const a = actors.get(role)!;
  const r = await request(
    role === "patient" ? "/account/sign-in" : "/staff/sign-in",
    { action: "verify", email: a.email, code: await codeFor(a) },
    undefined,
    true,
  );
  invariant(
    r.status === (role === "patient" ? 204 : 200),
    `LOGIN_${role.toUpperCase()}_STATUS_${r.status}`,
  );
  remember(r, a);
  if (role !== "patient") {
    const body = (await r.json()) as { enrollment?: { secret: string } };
    invariant(body.enrollment?.secret, "MFA_ENROLLMENT_MISSING");
    const denied = await request(
      "/staff/payments/read",
      { cursor: null, caseId: "e1191000-0000-4000-8000-000000000010" },
      role,
    );
    invariant(denied.status === 403, `EMAIL_ONLY_PAYMENT_DENIAL_STATUS_${denied.status}`);
    const mfa = await request("/staff/mfa", { code: totp(body.enrollment.secret) }, role, true);
    invariant(mfa.status === 204, `MFA_STATUS_${mfa.status}`);
    remember(mfa, a);
  }
}
try {
  invariant((await stripe.accounts.retrieveCurrent()).id === account, "ACCOUNT_MISMATCH");
  invariant(
    (await stripe.webhookEndpoints.list({ limit: 100 })).data.length === 0,
    "ENDPOINT_BASELINE_CHANGED",
  );
  invariant((await activeVersion()) === baselineVersion, "DEPLOYMENT_BASELINE_CHANGED");
  const owner = await version(baselineVersion);
  invariant(
    owner.resources.bindings.some(
      (b) => b.name === "OPERATIONS_ALERTS_MODE" && b.text === "disabled",
    ),
    "BASELINE_CONFIGURATION_CHANGED",
  );
  // Secret binding values cannot be inspected: prove disabled modes through their actual routes.
  invariant(
    (await request("/portal/order/command", { action: "read" })).status === 412 &&
      (await request("/portal/payments/refund", { action: "read" })).status === 412 &&
      (await request("/api/payments/stripe/webhook", {})).status === 404,
    "BASELINE_COMMERCE_NOT_DISABLED",
  );
  const versions = JSON.parse(await wrangler(["versions", "list", "--json"])) as {
    id: string;
    metadata: { created_on: string };
  }[];
  versions.sort((a, b) => b.metadata.created_on.localeCompare(a.metadata.created_on));
  invariant(
    [baselineVersion, previousConfiguration, previousJourneyConfiguration].includes(
      versions[0]?.id ?? "",
    ),
    "LATEST_VERSION_UNRECOGNISED",
  );
  invariant(
    (await version(versions[0]!.id)).resources.script.etag === owner.resources.script.etag,
    "CODE_PROVENANCE_CHANGED",
  );
  const privateProof = await sql(readFileSync("scripts/sql/sprint-11-hosted-baseline.sql", "utf8"));
  invariant((privateProof[0]?.evidence as { passed?: boolean })?.passed, "HOSTED_BASELINE_CHANGED");
  baseline = await sql(`select n.nspname||'.'||c.relname as relation,
    ((xpath('/row/n/text()',x))[1]::text)::bigint as n,
    (xpath('/row/fingerprint/text()',x))[1]::text as fingerprint from pg_class c
    join pg_namespace n on n.oid=c.relnamespace cross join lateral query_to_xml(format(
    'select count(*) n,md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) fingerprint from %s t',c.oid::regclass),false,true,'') x
    where c.relkind='r' and n.nspname in('public','identity_private','intake_private','commerce_private','audit_private','payments_private','fulfilment_private','lifecycle_private')`);
  invariant(
    baseline
      .filter(
        (r) => !["public.tenants", "public.fulfilment_provider_gates"].includes(String(r.relation)),
      )
      .every((r) => Number(r.n) === 0),
    "APPLICATION_BASELINE_NOT_EMPTY",
  );
  for (const role of ["patient", "operations", "admin", "clinician"]) {
    const email = `s11-${role}-${crypto.randomUUID()}@example.invalid`;
    const result = await admin.auth.admin.createUser({ email, email_confirm: true });
    invariant(!result.error && result.data.user, "AUTH_CREATE_FAILED");
    actors.set(role, { id: result.data.user.id, email });
    fixtureAttempted = true;
    const linked = await sql(
      `select subject_id from public.external_identities where provider='supabase' and provider_subject='${result.data.user.id}'`,
    );
    invariant(
      linked.length === 1 && /^[a-f0-9-]{36}$/.test(String(linked[0]?.subject_id)),
      "LINKED_SUBJECT_MISSING",
    );
    actors.get(role)!.subjectId = String(linked[0]!.subject_id);
  }
  const patient = actors.get("patient")!;
  const auth = await admin.auth.verifyOtp({
    email: patient.email,
    token: await codeFor(patient),
    type: "email",
  });
  invariant(!auth.error && auth.data.session, "AUTH_BOOTSTRAP_FAILED");
  tokens.add(auth.data.session.access_token);
  const claims = JSON.parse(
    Buffer.from(auth.data.session.access_token.split(".")[1]!, "base64url").toString(),
  ) as { session_id: string };
  invariant(/^[a-f0-9-]{36}$/.test(claims.session_id), "PROVIDER_SESSION_INVALID");
  let setup = template("sprint-11-journey-setup", {
    ...Object.fromEntries([...actors].map(([role, a]) => [role, a.subjectId!])),
    patientAuth: patient.id,
    providerSession: claims.session_id,
  });
  if (zeroBalance) {
    // Only this isolated synthetic product and delivery price differ; no real tariff is changed.
    invariant(setup.includes("'SYNTHETIC TEST product',80000"), "ZERO_PRODUCT_FIXTURE_MISSING");
    invariant(setup.includes("'synthetic-delivery',10000"), "ZERO_DELIVERY_FIXTURE_MISSING");
    setup = setup
      .replace("'SYNTHETIC TEST product',80000", "'SYNTHETIC TEST product',99900")
      .replace("'synthetic-delivery',10000", "'synthetic-delivery',0");
  }
  // Prove setup and exact dependency-aware cleanup together before retaining any app fixture.
  await sql(
    setup.replace(/commit;\s*$/, "") +
      cleanup()
        .replace(/^([\s\S]*?)begin;/, "")
        .replace(/commit;/, "rollback;"),
    false,
  );
  console.log(JSON.stringify({ exercise: "hosted-commerce", setupCleanupRollbackPassed: true }));
  fixtureAttempted = true;
  await sql(setup, false);
  const hook = await stripe.webhookEndpoints.create({
    url: origin + "/api/payments/stripe/webhook",
    enabled_events: [
      "checkout.session.completed",
      "checkout.session.expired",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "payment_intent.payment_failed",
      "charge.refunded",
      "charge.dispute.created",
      "charge.dispute.updated",
      "charge.dispute.closed",
      "refund.created",
      "refund.updated",
      "refund.failed",
    ],
    api_version: "2026-07-29.dahlia",
    description: "Disposable Sprint 11.9 authenticated sandbox proof",
  });
  endpoint = hook.id;
  invariant(!hook.livemode && hook.secret?.startsWith("whsec_"), "TEST_ENDPOINT_INVALID");
  const prepared = await wrangler(
    [
      "versions",
      "secret",
      "bulk",
      "--message",
      "Sprint 11.9 isolated authenticated commerce configuration",
    ],
    JSON.stringify({
      COMMERCE_REVIEW_MODE: "enabled",
      COMMERCE_CHECKOUT_MODE: "sandbox",
      COMMERCE_REFUND_MODE: "sandbox",
      COMMERCE_WEBHOOK_MODE: "sandbox",
      COMMERCE_REVIEW_TENANT_ID: tenant,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: service,
      STRIPE_CHECKOUT_ACCOUNT_ID: account,
      STRIPE_RESTRICTED_KEY: key,
      STRIPE_WEBHOOK_SIGNING_SECRET: hook.secret,
    }),
  );
  configuredVersion = prepared.match(/Created version ([a-f0-9-]{36})/)?.[1];
  invariant(
    configuredVersion &&
      (await version(configuredVersion)).resources.script.etag === owner.resources.script.etag,
    "CONFIGURATION_CODE_CHANGED",
  );
  invariant((await activeVersion()) === baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
  activationAttempted = true;
  await wrangler([
    "versions",
    "deploy",
    `${configuredVersion}@100`,
    "--yes",
    "--message",
    "Authorised isolated authenticated Stripe sandbox rehearsal",
  ]);
  invariant((await activeVersion()) === configuredVersion, "CONFIGURATION_NOT_ACTIVE");
  let anonymous = await request("/portal/order/command", { action: "read" });
  // Bounded propagation polling; abort on any concurrent deployment or non-disabled error.
  for (let i = 0; anonymous.status === 412 && i < 18; i++) {
    await delay(5000);
    invariant((await activeVersion()) === configuredVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
    anonymous = await request("/portal/order/command", { action: "read" });
  }
  invariant(anonymous.status === 401, `ANONYMOUS_STATUS_${anonymous.status}`);
  await login("patient");
  await login("operations");
  console.log(
    JSON.stringify({
      exercise: "hosted-commerce",
      patientSession: true,
      workforceAal2: true,
      emailOnlyDenied: true,
    }),
  );
  const reviewResponse = await request("/portal/order/command", { action: "read" }, "patient");
  invariant(reviewResponse.status === 200, `ORDER_READ_STATUS_${reviewResponse.status}`);
  let review = orderReviewResultSchema.parse(await reviewResponse.json()).review;
  invariant(
    review?.amountTotalMinor === 99900 && !review.checkoutEnabled && !review.acceptance,
    "DEPOSIT_REVIEW_INVALID",
  );
  const accept = await request(
    "/portal/order/command",
    {
      action: "accept",
      offerId: review.offerId,
      publicationId: review.terms.publicationId,
      snapshotHash: review.snapshotHash,
      contentHash: review.terms.contentHash,
      accepted: true,
      requestKey: crypto.randomUUID(),
    },
    "patient",
  );
  invariant(accept.status === 200, `ORDER_ACCEPT_STATUS_${accept.status}`);
  const accepted = orderReviewResultSchema.parse(await accept.json()).review;
  invariant(accepted?.acceptance && accepted.checkoutEnabled, "ACCEPTED_CHECKOUT_NOT_READY");
  const checkout = await request(
    "/portal/order/command",
    { action: "checkout", offerId: review.offerId, requestKey: crypto.randomUUID() },
    "patient",
  );
  invariant(checkout.status === 200, `CHECKOUT_STATUS_${checkout.status}`);
  let body = (await checkout.json()) as { checkoutUrl: string };
  invariant(
    new URL(body.checkoutUrl).origin === "https://checkout.stripe.com",
    "CHECKOUT_URL_INVALID",
  );
  const rows = await sql(
    `select session_id from commerce_private.checkout_intents where tenant_id='${tenant}'`,
  );
  invariant(rows.length === 1 && typeof rows[0]?.session_id === "string", "SESSION_NOT_ATTACHED");
  session = rows[0].session_id;
  createdSessions.add(session);
  const providerSession = await stripe.checkout.sessions.retrieve(session);
  invariant(
    !providerSession.livemode &&
      providerSession.amount_total === 99900 &&
      providerSession.payment_status === "unpaid",
    "SANDBOX_SESSION_INVALID",
  );
  if (scenario === "replacement") {
    writeFileSync(artifact, JSON.stringify({ checkoutUrl: body.checkoutUrl }), { mode: 0o600 });
    console.log(
      JSON.stringify({
        exercise: "hosted-deposit-decline",
        awaitingOfficialDeclineCard: true,
        artifact,
      }),
    );
    const declineLines = createInterface({ input: process.stdin, terminal: false });
    const declineTimeout = setTimeout(() => declineLines.close(), 15 * 60 * 1000);
    let declined = false;
    for await (const line of declineLines)
      if (line.trim() === "declined") {
        declined = true;
        break;
      }
    clearTimeout(declineTimeout);
    declineLines.close();
    invariant(declined, "DECLINE_NOT_CONFIRMED");
    const failed = await stripe.checkout.sessions.retrieve(session);
    const failedPaymentId =
      typeof failed.payment_intent === "string" ? failed.payment_intent : failed.payment_intent?.id;
    invariant(
      !failed.livemode && failed.payment_status === "unpaid" && failedPaymentId,
      "DECLINE_SESSION_INVALID",
    );
    const failedPayment = await stripe.paymentIntents.retrieve(failedPaymentId);
    invariant(
      !failedPayment.livemode &&
        failedPayment.amount_received === 0 &&
        failedPayment.status === "requires_payment_method" &&
        failedPayment.last_payment_error?.code === "card_declined",
      "PROVIDER_DECLINE_UNPROVEN",
    );
    await stripe.checkout.sessions.expire(session);
    let expiredObserved = false;
    for (let i = 0; i < 18; i++) {
      const state = await sql(
        `select exists(select 1 from commerce_private.settlements s join commerce_private.checkout_intents i on i.id=s.intent_id where i.offer_id='${review.offerId}' and s.expiry_seen and not s.paid_confirmed) as expired`,
      );
      if (state[0]?.expired) {
        expiredObserved = true;
        break;
      }
      await delay(5000);
    }
    invariant(expiredObserved, "GENUINE_EXPIRY_MISSING");
    const replacementCase = "e1191000-0000-4000-8000-000000000010";
    await sql(
      `insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
      values('${tenant}','${replacementCase}','${patient.subjectId}','${actors.get("operations")!.subjectId}','${actors.get("admin")!.subjectId}',now()-interval '1 minute',now()+interval '2 hours');
      insert into commerce_private.refund_authorities values('${replacementCase}','${actors.get("operations")!.subjectId}',gen_random_uuid(),'${actors.get("admin")!.subjectId}',now()+interval '2 hours',null);`,
      false,
    );
    const reconciliation = await request(
      "/staff/payments/refund",
      { action: "reconcile", offerId: review.offerId, requestKey: crypto.randomUUID() },
      "operations",
    );
    invariant(reconciliation.status === 200, `DECLINE_RECONCILE_STATUS_${reconciliation.status}`);
    const replacement = await request(
      "/staff/payments/refund",
      { action: "replace_deposit", offerId: review.offerId, requestKey: crypto.randomUUID() },
      "operations",
    );
    invariant(replacement.status === 200, `REPLACEMENT_APPROVAL_STATUS_${replacement.status}`);
    const originalOffer = review.offerId;
    const replacementRead = await request("/portal/order/command", { action: "read" }, "patient");
    invariant(replacementRead.status === 200, "REPLACEMENT_READ_FAILED");
    review = orderReviewResultSchema.parse(await replacementRead.json()).review;
    invariant(
      review &&
        review.offerId !== originalOffer &&
        !review.acceptance &&
        !review.checkoutEnabled &&
        review.amountTotalMinor === 99900,
      "FRESH_ACCEPTANCE_REQUIRED",
    );
    const preAcceptance = await request(
      "/portal/order/command",
      { action: "checkout", offerId: review.offerId, requestKey: crypto.randomUUID() },
      "patient",
    );
    invariant(preAcceptance.status !== 200, "REPLACEMENT_BYPASSED_ACCEPTANCE");
    const freshAccept = await request(
      "/portal/order/command",
      {
        action: "accept",
        offerId: review.offerId,
        publicationId: review.terms.publicationId,
        snapshotHash: review.snapshotHash,
        contentHash: review.terms.contentHash,
        accepted: true,
        requestKey: crypto.randomUUID(),
      },
      "patient",
    );
    invariant(freshAccept.status === 200, "REPLACEMENT_ACCEPT_FAILED");
    const freshCheckout = await request(
      "/portal/order/command",
      { action: "checkout", offerId: review.offerId, requestKey: crypto.randomUUID() },
      "patient",
    );
    invariant(freshCheckout.status === 200, "REPLACEMENT_CHECKOUT_FAILED");
    body = (await freshCheckout.json()) as { checkoutUrl: string };
    invariant(
      new URL(body.checkoutUrl).origin === "https://checkout.stripe.com",
      "REPLACEMENT_URL_INVALID",
    );
    const linked = await sql(
      `select session_id from commerce_private.checkout_intents where offer_id='${review.offerId}'`,
    );
    invariant(typeof linked[0]?.session_id === "string", "REPLACEMENT_SESSION_MISSING");
    session = String(linked[0]!.session_id);
    createdSessions.add(session);
    console.log(
      JSON.stringify({
        exercise: "hosted-deposit-replacement",
        actualProviderDecline: true,
        genuineExpiry: true,
        providerInspectedUnpaid: true,
        independentStaffApproval: true,
        freshAcceptance: true,
      }),
    );
  }
  writeFileSync(artifact, JSON.stringify({ checkoutUrl: body.checkoutUrl }), { mode: 0o600 });
  console.log(
    JSON.stringify({
      exercise: "hosted-commerce",
      patientSession: true,
      workforceAal2: true,
      authenticatedAcceptance: true,
      awaitingOfficialTestCheckout: true,
      artifact,
    }),
  );
  const lines = createInterface({ input: process.stdin, terminal: false });
  const timeout = setTimeout(() => lines.close(), 15 * 60 * 1000);
  let confirmed = false;
  for await (const line of lines) {
    if (line.trim() === "paid") {
      confirmed = true;
      break;
    }
  }
  clearTimeout(timeout);
  lines.close();
  invariant(confirmed, "CHECKOUT_COMPLETION_NOT_CONFIRMED");
  const paid = await stripe.checkout.sessions.retrieve(session);
  invariant(
    paid.status === "complete" && paid.payment_status === "paid" && !paid.livemode,
    "REAL_TEST_CAPTURE_NOT_OBSERVED",
  );
  let observed = false;
  for (let i = 0; i < 12; i++) {
    const r = await sql(
      scenario.startsWith("dispute-")
        ? `select exists(select 1 from commerce_private.checkout_intents i join commerce_private.settlements s on s.intent_id=i.id join commerce_private.intent_payment_bindings b on b.intent_id=i.id join commerce_private.receipt_applications a on a.intent_id=i.id join commerce_private.provider_receipts p on p.account_id=a.account_id and p.event_id=a.event_id where i.tenant_id='${tenant}' and i.session_id='${session}' and s.paid_confirmed and p.event_type='checkout.session.completed' and p.amount_minor=99900 and p.payment_intent_id=b.payment_intent_id) as funded`
        : `select count(*)=1 as funded from commerce_private.deposit_funding f join commerce_private.settlements s on s.intent_id=f.source_intent_id where f.tenant_id='${tenant}' and s.paid_confirmed and f.amount_minor=99900`,
    );
    if (r[0]?.funded === true) {
      observed = true;
      break;
    }
    await delay(5000);
  }
  invariant(observed, "SIGNED_DEPOSIT_FUNDING_NOT_OBSERVED");
  console.log(
    JSON.stringify({
      exercise: "hosted-commerce",
      actualCapturedDeposit: true,
      genuineSignedFunding: !scenario.startsWith("dispute-"),
      genuineSignedCapture: true,
      amountMinor: 99900,
    }),
  );
  // Assignment and financial approval are separate prerequisites; never infer either from AAL2.
  const caseId = "e1191000-0000-4000-8000-000000000010";
  const unassigned = await request("/staff/payments/read", { cursor: null, caseId }, "operations");
  invariant(
    unassigned.status === (scenario === "replacement" ? 200 : 403),
    `UNASSIGNED_STATUS_${unassigned.status}`,
  );
  await sql(
    `insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
    select '${tenant}','${caseId}','${patient.subjectId}','${actors.get("operations")!.subjectId}','${actors.get("admin")!.subjectId}',now()-interval '1 minute',now()+interval '2 hours'
    where not exists(select 1 from public.operations_assignments where tenant_id='${tenant}' and case_id='${caseId}' and workforce_subject_id='${actors.get("operations")!.subjectId}')`,
    false,
  );
  const assigned = await request("/staff/payments/read", { cursor: null, caseId }, "operations");
  invariant(assigned.status === 200, `ASSIGNED_STATUS_${assigned.status}`);
  await login("clinician");
  const wrongRole = await request("/staff/payments/read", { cursor: null, caseId }, "clinician");
  invariant(wrongRole.status === 403, `WRONG_ROLE_STATUS_${wrongRole.status}`);
  const wrongCase = await request(
    "/staff/payments/read",
    { cursor: null, caseId: crypto.randomUUID() },
    "operations",
  );
  invariant(wrongCase.status === 403, `WRONG_CASE_STATUS_${wrongCase.status}`);
  if (scenario.startsWith("dispute-")) {
    const paymentId =
      typeof paid.payment_intent === "string" ? paid.payment_intent : paid.payment_intent?.id;
    invariant(paymentId, "DISPUTE_PAYMENT_MISSING");
    let dispute: Stripe.Dispute | undefined;
    for (let i = 0; i < 18; i++) {
      const list = await stripe.disputes.list({ payment_intent: paymentId, limit: 10 });
      invariant(list.data.length <= 1 && !list.has_more, "DISPUTE_LINEAGE_AMBIGUOUS");
      if (list.data[0]) {
        dispute = list.data[0];
        break;
      }
      await delay(5000);
    }
    invariant(
      dispute &&
        !dispute.livemode &&
        dispute.amount === 99900 &&
        dispute.currency === "zar" &&
        dispute.status === "needs_response",
      "OPEN_PROVIDER_DISPUTE_MISSING",
    );
    let view = refundViewSchema.parse(
      await (
        await request(
          "/staff/payments/refund",
          { action: "read", offerId: review.offerId },
          "operations",
        )
      ).json(),
    );
    for (let i = 0; view.disputes.length === 0 && i < 18; i++) {
      await delay(5000);
      const read = await request(
        "/staff/payments/refund",
        { action: "read", offerId: review.offerId },
        "operations",
      );
      invariant(read.status === 200, "DISPUTE_READ_FAILED");
      view = refundViewSchema.parse(await read.json());
    }
    invariant(
      view.disputes.length > 0 && view.disputes.every((d) => !d.owned && !d.reconciled),
      "SIGNED_OPEN_DISPUTE_MISSING",
    );
    const held = await sql(
      `select not commerce_private.deposit_ready('${caseId}') as review_held,not identity_private.handoff_payment_ready('${caseId}') as handoff_held,(select count(*)=0 from public.fulfilment_cases where tenant_id='${tenant}') as no_supply`,
    );
    invariant(
      held[0]?.review_held && held[0]?.handoff_held && held[0]?.no_supply,
      "OPEN_DISPUTE_NOT_HELD",
    );
    await sql(
      `insert into commerce_private.refund_authorities values('${caseId}','${actors.get("operations")!.subjectId}',gen_random_uuid(),'${actors.get("admin")!.subjectId}',now()+interval '2 hours',null)`,
      false,
    );
    const own = await request(
      "/staff/payments/refund",
      {
        action: "own_dispute",
        offerId: review.offerId,
        reference: view.disputes[0]!.reference,
        requestKey: crypto.randomUUID(),
      },
      "operations",
    );
    invariant(
      own.status === 200 && refundViewSchema.parse(await own.json()).disputes.every((d) => d.owned),
      "DISPUTE_OWNERSHIP_FAILED",
    );
    const outcome = scenario === "dispute-won" ? "won" : "lost";
    await stripe.disputes.update(dispute.id, {
      evidence: { uncategorized_text: outcome === "won" ? "winning_evidence" : "losing_evidence" },
      submit: true,
    });
    let terminal = await stripe.disputes.retrieve(dispute.id);
    for (let i = 0; terminal.status !== outcome && i < 18; i++) {
      await delay(5000);
      terminal = await stripe.disputes.retrieve(dispute.id);
    }
    invariant(
      !terminal.livemode && terminal.status === outcome,
      "PROVIDER_TERMINAL_DISPUTE_MISSING",
    );
    let terminalSigned = false;
    for (let i = 0; i < 18; i++) {
      const r = await sql(
        `select exists(select 1 from commerce_private.provider_receipts where account_id='${account}' and dispute_id='${dispute.id}' and dispute_status='${outcome}' and event_type='charge.dispute.closed') as present`,
      );
      if (r[0]?.present) {
        terminalSigned = true;
        break;
      }
      await delay(5000);
    }
    invariant(terminalSigned, "GENUINE_TERMINAL_DISPUTE_MISSING");
    const reconciled = await request(
      "/staff/payments/refund",
      { action: "reconcile", offerId: review.offerId, requestKey: crypto.randomUUID() },
      "operations",
    );
    invariant(reconciled.status === 200, "TERMINAL_DISPUTE_RECONCILE_FAILED");
    const result =
      await sql(`select exists(select 1 from commerce_private.dispute_outcomes where account_id='${account}' and dispute_id='${dispute.id}' and status='${outcome}' and actor_id='${actors.get("operations")!.subjectId}') as attributed,
      (select count(*)=0 from public.fulfilment_cases where tenant_id='${tenant}') as no_supply,
      not identity_private.handoff_payment_ready('${caseId}') as handoff_held`);
    invariant(
      result[0]?.attributed &&
        result[0]?.no_supply &&
        (outcome !== "lost" || result[0]?.handoff_held),
      "TERMINAL_DISPUTE_BOUNDARY_FAILED",
    );
    console.log(
      JSON.stringify({
        exercise: "hosted-dispute",
        genuineOpenDelivery: true,
        genuineTerminalDelivery: true,
        currentProviderCorroboration: true,
        outcome,
        attributedStaffReconciliation: true,
        noSupplyAdvancement: true,
        lostMoneyHeld: outcome === "lost",
      }),
    );
  } else {
    const bridge = await sql(
      `select intake_private.review_payment_ready('e1191000-0000-4000-8000-000000000003') as review_ready,
    identity_private.handoff_payment_ready('${caseId}') as handoff_ready,
    (select count(*)=0 from public.fulfilment_cases where tenant_id='${tenant}') as no_supply`,
      false,
    );
    invariant(
      bridge[0]?.review_ready === true &&
        bridge[0]?.handoff_ready === true &&
        bridge[0]?.no_supply === true,
      "PAID_BRIDGE_INVALID",
    );
    await sql(
      `select commerce_private.prepare_offer('${tenant}','${patient.subjectId}','${caseId}',
    jsonb_build_object('scenario','approved_product_order','items',jsonb_build_array(jsonb_build_object('priceId','e1191000-0000-4000-8000-000000000013','quantity',1)),
    'deliveryQuoteId','e1191000-0000-4000-8000-000000000014','requestKey',gen_random_uuid()))`,
      false,
    );
    const productRead = await request("/portal/order/command", { action: "read" }, "patient");
    invariant(productRead.status === 200, `PRODUCT_READ_STATUS_${productRead.status}`);
    const product = orderReviewResultSchema.parse(await productRead.json()).review;
    invariant(
      product?.scenario === "approved_product_order" &&
        product.creditMinor === (zeroBalance ? 99900 : 80000) &&
        product.deliveryMinor === (zeroBalance ? 0 : 10000) &&
        product.amountTotalMinor === (zeroBalance ? 0 : 10000) &&
        product.unusedDepositRefundMinor === (zeroBalance ? 0 : 19900) &&
        !product.acceptance,
      "PRODUCT_CREDIT_INVALID",
    );
    const acceptedProduct = await request(
      "/portal/order/command",
      {
        action: "accept",
        offerId: product.offerId,
        publicationId: product.terms.publicationId,
        snapshotHash: product.snapshotHash,
        contentHash: product.terms.contentHash,
        accepted: true,
        requestKey: crypto.randomUUID(),
      },
      "patient",
    );
    invariant(acceptedProduct.status === 200, `PRODUCT_ACCEPT_STATUS_${acceptedProduct.status}`);
    const productCheckout = await request(
      "/portal/order/command",
      { action: "checkout", offerId: product.offerId, requestKey: crypto.randomUUID() },
      "patient",
    );
    invariant(productCheckout.status === 200, `PRODUCT_CHECKOUT_STATUS_${productCheckout.status}`);
    const productBody = (await productCheckout.json()) as { checkoutUrl: string };
    invariant(
      new URL(productBody.checkoutUrl).origin === "https://checkout.stripe.com",
      "PRODUCT_CHECKOUT_URL_INVALID",
    );
    const productIntent = await sql(
      `select session_id from commerce_private.checkout_intents where offer_id='${product.offerId}'`,
    );
    invariant(typeof productIntent[0]?.session_id === "string", "PRODUCT_SESSION_MISSING");
    const productSession = String(productIntent[0]!.session_id);
    createdSessions.add(productSession);
    writeFileSync(artifact, JSON.stringify({ checkoutUrl: productBody.checkoutUrl }), {
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        exercise: "hosted-commerce-product",
        cappedCredit: true,
        separateDelivery: true,
        independentAssignment: true,
        wrongRoleDenied: true,
        awaitingOfficialTestCheckout: true,
        artifact,
      }),
    );
    const productLines = createInterface({ input: process.stdin, terminal: false });
    const productTimeout = setTimeout(() => productLines.close(), 15 * 60 * 1000);
    let productConfirmed = false;
    for await (const line of productLines)
      if (line.trim() === "paid") {
        productConfirmed = true;
        break;
      }
    clearTimeout(productTimeout);
    productLines.close();
    invariant(productConfirmed, "PRODUCT_COMPLETION_NOT_CONFIRMED");
    let productPaid = await stripe.checkout.sessions.retrieve(productSession);
    for (let i = 0; i < 12 && productPaid.status === "open"; i++) {
      await delay(5000);
      productPaid = await stripe.checkout.sessions.retrieve(productSession);
    }
    invariant(
      !productPaid.livemode &&
        productPaid.amount_total === (zeroBalance ? 0 : 10000) &&
        productPaid.status === "complete" &&
        (zeroBalance
          ? ["paid", "no_payment_required"].includes(productPaid.payment_status)
          : productPaid.payment_status === "paid") &&
        (!zeroBalance || productPaid.payment_intent === null),
      "PRODUCT_CAPTURE_MISSING",
    );
    let productApplied = false;
    for (let i = 0; i < 12; i++) {
      const result = await sql(
        `select exists(select 1 from commerce_private.credit_reservations r join commerce_private.offers o on o.id=r.offer_id join commerce_private.checkout_intents ci on ci.offer_id=o.id join commerce_private.settlements s on s.intent_id=ci.id where o.id='${product.offerId}' and r.state='applied' and r.credit_minor=${zeroBalance ? 99900 : 80000} and r.unused_refund_minor=${zeroBalance ? 0 : 19900} and ${zeroBalance ? "s.no_additional_payment and not s.paid_confirmed" : "s.paid_confirmed"}) as applied`,
      );
      if (result[0]?.applied === true) {
        productApplied = true;
        break;
      }
      await delay(5000);
    }
    invariant(productApplied, "PRODUCT_ALLOCATION_NOT_APPLIED");
    if (zeroBalance) {
      const zero = await sql(
        `select (select count(*)=1 from commerce_private.credit_reservations where offer_id='${product.offerId}' and state='applied') as allocated_once,
      (select count(*)=0 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id='${product.offerId}') as no_unused_refund,
      (select count(*)=0 from public.fulfilment_cases where tenant_id='${tenant}') as no_supply`,
      );
      invariant(
        zero[0]?.allocated_once && zero[0]?.no_unused_refund && zero[0]?.no_supply,
        "ZERO_BALANCE_BOUNDARY_FAILED",
      );
      console.log(
        JSON.stringify({
          exercise: "hosted-commerce-zero",
          genuineZeroTotalCompletion: true,
          additionalPaymentIntent: false,
          creditAppliedOnce: true,
          noSupplyAdvancement: true,
        }),
      );
    } else {
      const refundRead = await request(
        "/staff/payments/refund",
        { action: "read", offerId: product.offerId },
        "operations",
      );
      invariant(refundRead.status === 200, `REFUND_READ_STATUS_${refundRead.status}`);
      let refundView = refundViewSchema.parse(await refundRead.json());
      invariant(
        refundView.refunds.some((r) => r.amountMinor === 19900),
        "UNUSED_REFUND_NOT_RESERVED",
      );
      const reviewCommand = {
        action: "review",
        offerId: product.offerId,
        reason: "product_before_release",
        evidenceId: "e1191000-0000-4000-8000-000000000016",
        requestKey: crypto.randomUUID(),
      };
      if (scenario !== "replacement") {
        const noFinance = await request("/staff/payments/refund", reviewCommand, "operations");
        invariant(noFinance.status === 403, `FINANCE_GRANT_DENIAL_STATUS_${noFinance.status}`);
      }
      await sql(
        `insert into commerce_private.refund_authorities values('${caseId}','${actors.get("operations")!.subjectId}',gen_random_uuid(),'${actors.get("admin")!.subjectId}',now()+interval '2 hours',null) on conflict do nothing`,
        false,
      );
      // Complete the already queued unused refund first, using the actual deployed provider adapter.
      for (const refund of refundView.refunds)
        if (refund.state === "queued") {
          const dispatched = await request(
            "/staff/payments/refund",
            {
              action: "dispatch",
              offerId: product.offerId,
              refundId: refund.reference,
              requestKey: crypto.randomUUID(),
            },
            "operations",
          );
          invariant(dispatched.status === 200, `UNUSED_DISPATCH_STATUS_${dispatched.status}`);
        }
      let unusedConfirmed = false;
      for (let i = 0; i < 18; i++) {
        const result = await sql(
          `select exists(select 1 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id='${product.offerId}' and d.reason='unused_deposit' and j.amount_minor=19900 and j.state='confirmed') as confirmed`,
        );
        if (result[0]?.confirmed === true) {
          unusedConfirmed = true;
          break;
        }
        await delay(5000);
      }
      invariant(unusedConfirmed, "UNUSED_REFUND_NOT_CONFIRMED");
      const reviewed = await request("/staff/payments/refund", reviewCommand, "operations");
      invariant(reviewed.status === 200, `PRODUCT_REFUND_REVIEW_STATUS_${reviewed.status}`);
      refundView = refundViewSchema.parse(await reviewed.json());
      for (const refund of refundView.refunds)
        if (refund.state === "queued") {
          const dispatched = await request(
            "/staff/payments/refund",
            {
              action: "dispatch",
              offerId: product.offerId,
              refundId: refund.reference,
              requestKey: crypto.randomUUID(),
            },
            "operations",
          );
          if (dispatched.status !== 200) {
            // A response failure is not permission to resubmit money. Retain coarse database evidence
            // before scoped cleanup so provider success and persistence failure can be distinguished.
            const diagnostics = await sql(
              `select j.amount_minor,j.state,j.dispatch_started_at is not null as claimed,
          (select count(*) from commerce_private.refund_dispatch_facts f where f.job_id=j.id) as dispatch_facts,
          (select count(*) from commerce_private.refund_provider_facts f where f.job_reference=j.id) as provider_facts,
          s.reconciliation_required,s.refunded_minor
          from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id
          join commerce_private.settlements s on s.intent_id=j.source_intent_id
          where d.offer_id='${product.offerId}' order by j.amount_minor`,
            );
            console.log(JSON.stringify({ exercise: "refund-response-diagnostics", diagnostics }));
            const reread = await request(
              "/staff/payments/refund",
              { action: "read", offerId: product.offerId },
              "operations",
            );
            console.log(
              JSON.stringify({ exercise: "refund-response-reread", status: reread.status }),
            );
          }
          invariant(
            dispatched.status === 200,
            `PRODUCT_REFUND_DISPATCH_STATUS_${dispatched.status}`,
          );
        }
      let allConfirmed = false;
      for (let i = 0; i < 18; i++) {
        const result = await sql(
          `select count(*)=3 and bool_and(j.state='confirmed') and sum(j.amount_minor)=109900 as confirmed from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id='${product.offerId}'`,
        );
        if (result[0]?.confirmed === true) {
          allConfirmed = true;
          break;
        }
        await delay(5000);
      }
      invariant(allConfirmed, "ORIGINAL_METHOD_REFUNDS_NOT_CONFIRMED");
    }
    // SDK-signed adversarial envelopes are explicitly synthetic, not genuine Stripe deliveries.
    // Run only after money acceptance: intentional late/conflicting receipts must quarantine it.
    invariant(hook.secret, "REHEARSAL_SIGNING_SECRET_MISSING");
    const proofId = `evt_s11proof${crypto.randomUUID().replaceAll("-", "")}`;
    const envelope = {
      id: proofId,
      object: "event",
      api_version: "2026-07-29.dahlia",
      type: "checkout.session.completed",
      livemode: false,
      created: Math.floor(Date.now() / 1000),
      data: { object: productPaid },
    };
    const payload = JSON.stringify(envelope);
    const signature = await stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: hook.secret,
    });
    const sendProof = (body: string, signed: string) =>
      fetch(origin + "/api/payments/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Stripe-Signature": signed },
        body,
      });
    const badRaw = await sendProof(payload + " ", signature);
    invariant(badRaw.status === 400, `RAW_TAMPER_STATUS_${badRaw.status}`);
    const first = await sendProof(payload, signature);
    invariant(first.status === 200, `PROOF_FIRST_STATUS_${first.status}`);
    const replay = await sendProof(payload, signature);
    invariant(
      replay.status === 200 && ((await replay.json()) as { replayed?: boolean }).replayed === true,
      "DURABLE_REPLAY_FAILED",
    );
    const conflicting = JSON.stringify({
      ...envelope,
      data: { object: { ...productPaid, amount_total: 1 } },
    });
    const conflict = await sendProof(
      conflicting,
      await stripe.webhooks.generateTestHeaderStringAsync({
        payload: conflicting,
        secret: hook.secret,
      }),
    );
    invariant(conflict.status === 200, `CONFLICT_ACK_STATUS_${conflict.status}`);
    const lateId = `evt_s11late${crypto.randomUUID().replaceAll("-", "")}`;
    const late = JSON.stringify({
      ...envelope,
      id: lateId,
      type: "checkout.session.expired",
      created: envelope.created - 60,
      data: { object: { ...productPaid, status: "expired", payment_status: "unpaid" } },
    });
    const outOfOrder = await sendProof(
      late,
      await stripe.webhooks.generateTestHeaderStringAsync({ payload: late, secret: hook.secret }),
    );
    invariant(outOfOrder.status === 200, `OUT_OF_ORDER_ACK_STATUS_${outOfOrder.status}`);
    const held = await sql(`select
    (select count(*)=1 from commerce_private.provider_receipts where account_id='${account}' and event_id='${proofId}') as receipt_once,
    exists(select 1 from commerce_private.provider_exceptions where account_id='${account}' and event_id='${proofId}' and reason='EVENT_CONFLICT') as conflict_held,
    exists(select 1 from commerce_private.settlements s join commerce_private.checkout_intents i on i.id=s.intent_id where i.offer_id='${product.offerId}' and s.reconciliation_required) as settlement_held,
    (select count(*)=0 from public.fulfilment_cases where tenant_id='${tenant}') as no_supply`);
    invariant(
      held[0]?.receipt_once &&
        held[0]?.conflict_held &&
        held[0]?.settlement_held &&
        held[0]?.no_supply,
      "WEBHOOK_EXCEPTION_BOUNDARY_FAILED",
    );
    console.log(
      JSON.stringify({
        exercise: "hosted-webhook-adversarial",
        evidenceClass: "sdk-signed-synthetic-envelopes",
        rawTamperRejected: true,
        durableReplay: true,
        conflictHeld: true,
        outOfOrderAcknowledged: true,
        noSupplyAdvancement: true,
      }),
    );
    console.log(
      JSON.stringify({
        exercise: "hosted-commerce-product",
        actualDeliveryCapture: !zeroBalance,
        verifiedCreditAppliedOnce: true,
        unusedDepositRefund: !zeroBalance,
        productRefundOriginalMethods: !zeroBalance,
        independentlyGrantedAal2: !zeroBalance,
      }),
    );
  }
  passed = true;
} catch (error) {
  console.error(
    error instanceof Error && /^[A-Z_0-9]+$/.test(error.message)
      ? error.message
      : "HOSTED_COMMERCE_EXERCISE_FAILED",
  );
} finally {
  try {
    for (const createdSession of createdSessions) {
      const current = await stripe.checkout.sessions.retrieve(createdSession);
      if (current.status === "open") await stripe.checkout.sessions.expire(createdSession);
      if (current.amount_total === 0 && current.payment_intent === null) {
        invariant(
          current.status === "complete" || current.status === "expired",
          "ZERO_SESSION_NOT_TERMINAL",
        );
        continue;
      }
      if (current.payment_status === "paid") {
        const id =
          typeof current.payment_intent === "string"
            ? current.payment_intent
            : current.payment_intent?.id;
        invariant(id, "CAPTURE_INTENT_MISSING");
        const intent = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
        const charge = intent.latest_charge;
        invariant(charge && typeof charge !== "string", "CLEANUP_CAPTURE_MISSING");
        if (charge.disputed) {
          const disputes = await stripe.disputes.list({ payment_intent: id, limit: 10 });
          invariant(
            disputes.data.length === 1 && !disputes.has_more && !disputes.data[0]!.livemode,
            "CLEANUP_DISPUTE_LINEAGE_INVALID",
          );
          let d = disputes.data[0]!;
          if (d.status === "lost" && scenario === "dispute-lost") {
            // Authorised persistent sandbox loss: returned by the simulated issuer, not refundable.
            console.log(
              JSON.stringify({
                exercise: "sandbox-loss-cleanup",
                terminalProviderLoss: true,
                liveMoney: false,
              }),
            );
            continue;
          }
          if (d.status !== "won") {
            await stripe.disputes.update(d.id, {
              evidence: { uncategorized_text: "winning_evidence" },
              submit: true,
            });
            for (let i = 0; d.status !== "won" && i < 18; i++) {
              await delay(5000);
              d = await stripe.disputes.retrieve(d.id);
            }
            invariant(d.status === "won", "CLEANUP_DISPUTE_NOT_TERMINAL");
          }
        }
        if (charge.amount_refunded < charge.amount) {
          const refund = await stripe.refunds.create(
            { payment_intent: id, amount: charge.amount - charge.amount_refunded },
            { idempotencyKey: `s11-9-cleanup-${createdSession}` },
          );
          invariant(
            (await stripe.refunds.retrieve(refund.id)).status === "succeeded",
            "CLEANUP_REFUND_UNCONFIRMED",
          );
        }
      }
    }
  } catch {
    failures.push("provider-session");
  }
  try {
    if (endpoint) await stripe.webhookEndpoints.del(endpoint);
  } catch {
    failures.push("endpoint");
  }
  try {
    if (activationAttempted && (await activeVersion()) === configuredVersion) {
      // Cloudflare rejects older versions after secret changes. Restore modes forward without
      // force-rolling back secrets or overwriting a concurrent owner source deployment.
      const prepared = await wrangler(
        ["versions", "secret", "bulk", "--message", "Forward-only disabled commerce restoration"],
        JSON.stringify({
          COMMERCE_REVIEW_MODE: "disabled",
          COMMERCE_CHECKOUT_MODE: "disabled",
          COMMERCE_REFUND_MODE: "disabled",
          COMMERCE_WEBHOOK_MODE: "disabled",
        }),
      );
      const disabled = prepared.match(/Created version ([a-f0-9-]{36})/)?.[1];
      invariant(
        disabled &&
          (await version(disabled)).resources.script.etag ===
            (await version(baselineVersion)).resources.script.etag &&
          (await activeVersion()) === configuredVersion,
        "RESTORATION_CODE_OR_DEPLOYMENT_CHANGED",
      );
      restoredVersion = disabled;
      await wrangler([
        "versions",
        "deploy",
        `${restoredVersion}@100`,
        "--yes",
        "--message",
        "Restore disabled owner configuration after isolated commerce proof",
      ]);
    }
    invariant((await activeVersion()) === restoredVersion, "WORKER_RESTORE_FAILED");
    invariant(
      (await request("/portal/order/command", { action: "read" })).status === 412 &&
        (await request("/api/payments/stripe/webhook", {})).status === 404,
      "RESTORED_COMMERCE_NOT_DISABLED",
    );
  } catch {
    failures.push("worker");
  }
  try {
    for (const [role, a] of actors)
      if (a.cookie)
        await request(
          role === "patient" ? "/account/sign-out" : "/staff/sign-out",
          { action: "sign-out" },
          role,
          true,
        );
    for (const t of tokens) {
      const result = await admin.auth.admin.signOut(t, "global");
      invariant(!result.error, "AUTH_REVOKE_FAILED");
    }
    if (fixtureAttempted) await sql(cleanup(), false);
    for (const a of actors.values()) {
      const result = await admin.auth.admin.deleteUser(a.id);
      invariant(!result.error, "AUTH_DELETE_FAILED");
    }
    const proof = await sql(readFileSync("scripts/sql/sprint-11-hosted-baseline.sql", "utf8"));
    invariant((proof[0]?.evidence as { passed?: boolean })?.passed, "BASELINE_RESTORE_FAILED");
  } catch {
    failures.push("database-auth");
  }
  rmSync(artifact, { force: true });
  console.log(
    JSON.stringify({
      exercise: "hosted-commerce-restoration",
      restored: failures.length === 0,
      failedBoundaries: failures,
      restoredVersion,
      secretsLogged: false,
      fullTaskComplete: false,
    }),
  );
  process.exitCode = passed && failures.length === 0 ? 0 : 1;
}
