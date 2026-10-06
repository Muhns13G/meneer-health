import { readFileSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import Stripe from "stripe";
import { PilotCheckoutProvider } from "../src/server/payments/pilot-checkout";

// Separately authorised operator exercise, never ordinary CI. No captured payment or Auth user.
// Credentials, provider payloads and Checkout URLs remain in memory and are never printed.
const tenant = "e1190000-0000-4000-8000-000000000001";
const service = "e1190000-0000-4000-8000-000000000002";
const account = "acct_1U32UbFfj16Nnr1i";
const origin = "https://meneerhealth.co.za";
const baselineVersion = process.env.HOSTED_PILOT_BASELINE_VERSION;
const nodeDirectory = process.env.HOSTED_PILOT_NODE_DIRECTORY;
const key = process.env.STRIPE_RESTRICTED_KEY;
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
invariant(
  process.env.HOSTED_PILOT_WEBHOOK_CONFIRM === "isolated-expiry-only" &&
    key?.startsWith("rk_test_") &&
    baselineVersion &&
    /^[a-f0-9-]{36}$/.test(baselineVersion) &&
    nodeDirectory?.endsWith("/node/v22.23.2/bin"),
  "HOSTED_WEBHOOK_GUARD_REJECTED",
);
invariant(key, "TEST_KEY_REQUIRED");
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
  invariant(r.ok, `HOSTED_SQL_STATUS_${r.status}`);
  return (await r.json()) as Record<string, unknown>[];
}
async function wrangler(args: string[], input?: string): Promise<string> {
  const p = spawn("bunx", ["wrangler", ...args], {
    env: {
      ...process.env,
      PATH: `${nodeDirectory}:${process.env.PATH}`,
      WRANGLER_LOG_PATH: "/private/tmp/meneer-11-9-wrangler.log",
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
async function activeVersion(): Promise<string> {
  const deployments = JSON.parse(await wrangler(["deployments", "list", "--json"])) as {
    versions: { version_id: string; percentage: number }[];
  }[];
  const active = deployments.at(-1)?.versions;
  invariant(active?.length === 1 && active[0]?.percentage === 100, "SPLIT_DEPLOYMENT_REJECTED");
  return active[0].version_id;
}
const stripe = new Stripe(key, {
  apiVersion: "2026-07-29.dahlia",
  telemetry: false,
  maxNetworkRetries: 2,
  timeout: 10000,
});
let endpoint: string | undefined;
let session: string | undefined;
let configuredVersion: string | undefined;
let activationAttempted = false;
let fixtureAttempted = false;
let exercisePassed = false;
const restorationFailures: string[] = [];
try {
  invariant((await stripe.accounts.retrieveCurrent()).id === account, "ACCOUNT_MISMATCH");
  invariant(
    (await stripe.webhookEndpoints.list({ limit: 100 })).data.length === 0,
    "ENDPOINT_BASELINE_CHANGED",
  );
  invariant((await activeVersion()) === baselineVersion, "DEPLOYMENT_BASELINE_CHANGED");
  const baselineConfiguration = JSON.parse(
    await wrangler(["versions", "view", baselineVersion, "--json"]),
  ) as { resources: { bindings: { name: string; type: string; text?: string }[] } };
  invariant(
    baselineConfiguration.resources.bindings.some(
      (binding) => binding.name === "OPERATIONS_ALERTS_MODE" && binding.text === "disabled",
    ) &&
      !baselineConfiguration.resources.bindings.some(
        (binding) => binding.name.startsWith("COMMERCE_") || binding.name.startsWith("STRIPE_"),
      ),
    "BASELINE_CONFIGURATION_CHANGED",
  );
  const versions = JSON.parse(await wrangler(["versions", "list", "--json"])) as {
    id: string;
    metadata: { created_on: string };
  }[];
  versions.sort((a, b) => b.metadata.created_on.localeCompare(a.metadata.created_on));
  invariant(versions[0]?.id === baselineVersion, "LATEST_VERSION_NOT_OWNER_DEPLOYED");
  const baseline = await sql(readFileSync("scripts/sql/sprint-11-hosted-baseline.sql", "utf8"));
  invariant((baseline[0]?.evidence as { passed?: boolean })?.passed, "HOSTED_BASELINE_CHANGED");
  fixtureAttempted = true;
  await sql(readFileSync("scripts/sql/sprint-11-webhook-setup.sql", "utf8"), false);
  const hook = await stripe.webhookEndpoints.create({
    url: origin + "/api/payments/stripe/webhook",
    enabled_events: ["checkout.session.expired"],
    api_version: "2026-07-29.dahlia",
    description: "Disposable Sprint 11.9 expiry transport proof",
  });
  endpoint = hook.id;
  invariant(hook.livemode === false && hook.secret?.startsWith("whsec_"), "TEST_ENDPOINT_INVALID");
  const prepared = await wrangler(
    [
      "versions",
      "secret",
      "bulk",
      "--message",
      "Sprint 11.9 isolated expiry transport configuration",
    ],
    JSON.stringify({
      COMMERCE_REVIEW_MODE: "disabled",
      COMMERCE_CHECKOUT_MODE: "disabled",
      COMMERCE_REFUND_MODE: "disabled",
      COMMERCE_WEBHOOK_MODE: "sandbox",
      COMMERCE_REVIEW_TENANT_ID: tenant,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: service,
      STRIPE_CHECKOUT_ACCOUNT_ID: account,
      STRIPE_RESTRICTED_KEY: key,
      STRIPE_WEBHOOK_SIGNING_SECRET: hook.secret,
    }),
  );
  configuredVersion = prepared.match(/Created version ([a-f0-9-]{36})/)?.[1];
  invariant(configuredVersion, "CONFIGURATION_VERSION_NOT_IDENTIFIED");
  invariant((await activeVersion()) === baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
  activationAttempted = true;
  await wrangler([
    "versions",
    "deploy",
    `${configuredVersion}@100`,
    "--yes",
    "--message",
    "Authorised isolated Stripe expiry transport rehearsal",
  ]);
  invariant((await activeVersion()) === configuredVersion, "CONFIGURATION_NOT_ACTIVE");
  const invalid = await fetch(origin + "/api/payments/stripe/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": "invalid" },
    body: "{}",
  });
  invariant(invalid.status === 400, `INVALID_SIGNATURE_STATUS_${invalid.status}`);
  const checkout = await new PilotCheckoutProvider(key, account, stripe).create({
    intentId: crypto.randomUUID(),
    tenantId: tenant,
    accountId: account,
    scenario: "review_deposit",
    currency: "zar",
    amountTotalMinor: 99900,
    productBalanceMinor: 0,
    deliveryMinor: 0,
    expiresEpoch: Math.floor(Date.now() / 1000) + 3600,
    sessionId: null,
    checkoutUrl: null,
  });
  session = checkout.id;
  const expired = await stripe.checkout.sessions.expire(session);
  invariant(expired.status === "expired" && expired.payment_status === "unpaid", "EXPIRY_INVALID");
  let observed = false;
  for (let i = 0; i < 12; i++) {
    const rows = await sql(`select jsonb_build_object(
      'receipt',count(*)=1,'pending',bool_and(a.outcome='pending'),
      'orphan',bool_and(e.reason='UNMATCHED'),'noSettlement',
      (select count(*) from commerce_private.settlements)=0) as evidence
      from commerce_private.provider_receipts p
      join commerce_private.receipt_applications a using(account_id,event_id)
      join commerce_private.provider_exceptions e using(account_id,event_id)
      where p.tenant_boundary='${tenant}' and p.service_id='${service}'
        and p.event_type='checkout.session.expired'`);
    const proof = rows[0]?.evidence as Record<string, boolean>;
    if (proof?.receipt && proof.pending && proof.orphan && proof.noSettlement) {
      observed = true;
      break;
    }
    console.log(
      JSON.stringify({ exercise: "hosted-stripe-expiry", awaitingProviderDelivery: true }),
    );
    await delay(5000);
  }
  invariant(observed, "REAL_PROVIDER_DELIVERY_NOT_OBSERVED");
  exercisePassed = true;
  console.log(
    JSON.stringify({
      exercise: "hosted-stripe-expiry",
      genuineSignedDelivery: true,
      invalidSignatureDenied: true,
      unmatchedHeld: true,
      noSettlement: true,
      noAuthUsers: true,
    }),
  );
} catch (error) {
  // Never forward raw SDK/CLI errors; controlled local invariant codes contain no secrets.
  const code =
    error instanceof Error && /^[A-Z_0-9]+$/.test(error.message)
      ? error.message
      : "HOSTED_STRIPE_TRANSPORT_FAILED";
  console.error(code);
} finally {
  try {
    if (session) {
      const current = await stripe.checkout.sessions.retrieve(session);
      const terminal =
        current.status === "open" ? await stripe.checkout.sessions.expire(session) : current;
      invariant(
        terminal.status === "expired" && terminal.payment_status === "unpaid",
        "SESSION_RESTORE_FAILED",
      );
    }
  } catch {
    restorationFailures.push("session");
  }
  try {
    if (endpoint) await stripe.webhookEndpoints.del(endpoint);
    invariant(
      (await stripe.webhookEndpoints.list({ limit: 100 })).data.length === 0,
      "ENDPOINT_RESTORE_FAILED",
    );
  } catch {
    restorationFailures.push("endpoint");
  }
  try {
    const active = await activeVersion();
    if (activationAttempted && active === configuredVersion) {
      await wrangler([
        "versions",
        "deploy",
        `${baselineVersion}@100`,
        "--yes",
        "--message",
        "Restore owner-deployed disabled configuration after isolated transport proof",
      ]);
    }
    invariant((await activeVersion()) === baselineVersion, "WORKER_RESTORE_FAILED");
  } catch {
    restorationFailures.push("worker");
  }
  if (restorationFailures.length === 0 && fixtureAttempted) {
    try {
      const exists = await sql(
        `select exists(select 1 from public.tenants where id='${tenant}') as present`,
      );
      if (exists[0]?.present)
        await sql(readFileSync("scripts/sql/sprint-11-webhook-cleanup.sql", "utf8"), false);
      const baseline = await sql(readFileSync("scripts/sql/sprint-11-hosted-baseline.sql", "utf8"));
      invariant((baseline[0]?.evidence as { passed?: boolean })?.passed, "BASELINE_RESTORE_FAILED");
    } catch {
      restorationFailures.push("database");
    }
  }
  console.log(
    JSON.stringify({
      exercise: "hosted-stripe-expiry-restoration",
      restored: restorationFailures.length === 0,
      failedBoundaries: restorationFailures,
      secretsLogged: false,
      capturedPaymentProof: false,
    }),
  );
  if (!exercisePassed || restorationFailures.length) process.exitCode = 1;
}
