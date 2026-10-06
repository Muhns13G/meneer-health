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
const baselineVersion = "493fcd6f-b91a-419a-b3cc-732dce97c444";
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
    ) &&
      !owner.resources.bindings.some(
        (b) => b.name.startsWith("COMMERCE_") || b.name.startsWith("STRIPE_"),
      ),
    "BASELINE_CONFIGURATION_CHANGED",
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
  const setup = template("sprint-11-journey-setup", {
    ...Object.fromEntries([...actors].map(([role, a]) => [role, a.subjectId!])),
    patientAuth: patient.id,
    providerSession: claims.session_id,
  });
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
  // Exactly one propagation retry, only while the approved configuration is still 100% active.
  if (anonymous.status === 412) {
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
  const review = orderReviewResultSchema.parse(await reviewResponse.json()).review;
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
  const body = (await checkout.json()) as { checkoutUrl: string };
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
      `select count(*)=1 as funded from commerce_private.deposit_funding f join commerce_private.settlements s on s.intent_id=f.source_intent_id where f.tenant_id='${tenant}' and s.paid_confirmed and f.amount_minor=99900`,
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
      genuineSignedFunding: true,
      amountMinor: 99900,
    }),
  );
  // Assignment and financial approval are separate prerequisites; never infer either from AAL2.
  const caseId = "e1191000-0000-4000-8000-000000000010";
  const unassigned = await request("/staff/payments/read", { cursor: null, caseId }, "operations");
  invariant(unassigned.status === 403, `UNASSIGNED_STATUS_${unassigned.status}`);
  await sql(
    `insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
    values('${tenant}','${caseId}','${patient.subjectId}','${actors.get("operations")!.subjectId}','${actors.get("admin")!.subjectId}',now()-interval '1 minute',now()+interval '2 hours')`,
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
      product.creditMinor === 80000 &&
      product.deliveryMinor === 10000 &&
      product.amountTotalMinor === 10000 &&
      product.unusedDepositRefundMinor === 19900 &&
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
  const productPaid = await stripe.checkout.sessions.retrieve(productSession);
  invariant(
    !productPaid.livemode &&
      productPaid.amount_total === 10000 &&
      productPaid.payment_status === "paid",
    "PRODUCT_CAPTURE_MISSING",
  );
  let productApplied = false;
  for (let i = 0; i < 12; i++) {
    const result = await sql(
      `select exists(select 1 from commerce_private.credit_reservations r join commerce_private.offers o on o.id=r.offer_id join commerce_private.checkout_intents ci on ci.offer_id=o.id join commerce_private.settlements s on s.intent_id=ci.id where o.id='${product.offerId}' and r.state='applied' and r.credit_minor=80000 and r.unused_refund_minor=19900 and s.paid_confirmed) as applied`,
    );
    if (result[0]?.applied === true) {
      productApplied = true;
      break;
    }
    await delay(5000);
  }
  invariant(productApplied, "PRODUCT_ALLOCATION_NOT_APPLIED");
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
  const noFinance = await request("/staff/payments/refund", reviewCommand, "operations");
  invariant(noFinance.status === 403, `FINANCE_GRANT_DENIAL_STATUS_${noFinance.status}`);
  await sql(
    `insert into commerce_private.refund_authorities values('${caseId}','${actors.get("operations")!.subjectId}',gen_random_uuid(),'${actors.get("admin")!.subjectId}',now()+interval '2 hours',null)`,
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
      invariant(dispatched.status === 200, `PRODUCT_REFUND_DISPATCH_STATUS_${dispatched.status}`);
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
  passed = true;
  console.log(
    JSON.stringify({
      exercise: "hosted-commerce-product",
      actualDeliveryCapture: true,
      verifiedCreditAppliedOnce: true,
      unusedDepositRefund: true,
      productRefundOriginalMethods: true,
      independentlyGrantedAal2: true,
    }),
  );
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
      if (current.payment_status === "paid") {
        const id =
          typeof current.payment_intent === "string"
            ? current.payment_intent
            : current.payment_intent?.id;
        invariant(id, "CAPTURE_INTENT_MISSING");
        const intent = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
        const charge = intent.latest_charge;
        invariant(charge && typeof charge !== "string", "CLEANUP_CAPTURE_MISSING");
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
    if (activationAttempted && (await activeVersion()) === configuredVersion)
      await wrangler([
        "versions",
        "deploy",
        `${baselineVersion}@100`,
        "--yes",
        "--message",
        "Restore disabled owner configuration after isolated commerce proof",
      ]);
    invariant((await activeVersion()) === baselineVersion, "WORKER_RESTORE_FAILED");
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
      secretsLogged: false,
      fullTaskComplete: false,
    }),
  );
  process.exitCode = passed && failures.length === 0 ? 0 : 1;
}
