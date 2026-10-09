// Bounded owner-approved sandbox preparation. Never deploys, sends or charges.
// Unlike historical rehearsals, real staff and an active pilot are expected and preserved.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { SQL } from "bun";
import Stripe from "stripe";

const account = "acct_1U32UbFfj16Nnr1i";
const realTenant = "80000000-0000-4000-8000-000000000001";
const manifestPath = new URL("../../.pilot-sandbox-rehearsal.local", import.meta.url);
const events = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "refund.created",
  "refund.updated",
  "refund.failed",
];
function invariant(value, code) {
  if (!value) throw new Error(code);
}
function wrangler(args, input) {
  const result = spawnSync("bunx", ["wrangler", ...args, "--name", "meneer-health"], {
    input,
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 8 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
  invariant(result.status === 0, "SANDBOX_CONFIGURATION_COMMAND_FAILED");
  return result.stdout;
}
function activeVersion() {
  const deployments = JSON.parse(wrangler(["deployments", "list", "--json"]));
  const versions = deployments.at(-1)?.versions;
  invariant(versions?.length === 1 && versions[0].percentage === 100, "SPLIT_RELEASE_REJECTED");
  return versions[0].version_id;
}
function version(id) {
  return JSON.parse(wrangler(["versions", "view", id, "--json"]));
}
const preparing = process.argv.includes("--prepare");
const inspecting = process.argv.includes("--inspect");
const verifying = process.argv.includes("--verify");
if (!preparing && !inspecting && !verifying) {
  console.log(
    JSON.stringify({
      stage: "no-network-plan",
      isolatedTenant: true,
      account,
      maximumSms: 1,
      maximumCaptures: 1,
      amountMinor: 99900,
      currency: "zar",
      ownerPromotionRequired: true,
      sends: 0,
      charges: 0,
    }),
  );
} else {
  invariant(
    !process.env.CI &&
      process.env.PILOT_SANDBOX_CONFIRM === "isolated-one-sms-test-capture-refund-cleanup" &&
      process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
      process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz") &&
      process.env.STRIPE_CHECKOUT_ACCOUNT_ID === account &&
      process.env.STRIPE_RESTRICTED_KEY?.startsWith("rk_test_"),
    "SANDBOX_GUARD_REJECTED",
  );
  invariant(!preparing || !existsSync(manifestPath), "SANDBOX_MANIFEST_ALREADY_EXISTS");
  const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
  const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY, {
    apiVersion: "2026-07-29.dahlia",
    maxNetworkRetries: 0,
    timeout: 15000,
  });
  let manifest;
  const save = () => {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", {
      mode: 0o600,
      flag: manifest.saved ? "w" : "wx",
    });
    manifest.saved = true;
  };
  try {
    if (verifying) {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      invariant(
        manifest.task === "pilot-isolated-sandbox-acceptance" &&
          manifest.configurationVersion &&
          !manifest.fixturesCreated &&
          ["configuration-uploaded", "configuration-verified-fixtures-pending"].includes(
            manifest.stage,
          ),
        "SANDBOX_VERIFY_SCOPE_REJECTED",
      );
      invariant(activeVersion() === manifest.baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
      invariant(
        version(manifest.configurationVersion).resources?.script?.etag === manifest.baseEtag,
        "CONFIGURATION_CHANGED_SOURCE",
      );
      const hook = await stripe.webhookEndpoints.retrieve(manifest.webhookId);
      invariant(
        hook.livemode === false &&
          hook.metadata.exercise === manifest.tenant &&
          hook.url === "https://meneerhealth.co.za/api/payments/stripe/webhook" &&
          hook.status === "enabled",
        "TEST_HOOK_SCOPE_CHANGED",
      );
      manifest.saved = true;
      manifest.stage = "configuration-verified-fixtures-pending";
      save();
      console.log(
        JSON.stringify({
          stage: manifest.stage,
          configurationVersion: manifest.configurationVersion,
          ownerPromotionPerformed: false,
          fixturesCreated: false,
          sends: 0,
          charges: 0,
        }),
      );
      await db.close();
      process.exit(0);
    }
    const baselineVersion = activeVersion();
    const base = version(baselineVersion);
    invariant(base.resources?.script?.etag, "SCRIPT_FINGERPRINT_MISSING");
    const current = await stripe.accounts.retrieveCurrent();
    invariant(current.id === account, "SANDBOX_ACCOUNT_MISMATCH");
    const baseline = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const summary = (
        await tx.unsafe(`SELECT
        (SELECT count(*) FROM auth.users)::int AS staff,
        (SELECT count(*) FROM public.tenants)::int AS tenants,
        (SELECT count(*) FROM public.client_profiles)::int AS clients,
        (SELECT count(*) FROM intake_private.intakes)::int AS intakes,
        (SELECT count(*) FROM commerce_private.checkout_intents)::int AS checkouts,
        (SELECT count(*) FROM commerce_private.provider_receipts)::int AS receipts,
        (SELECT count(*) FROM commerce_private.refund_jobs)::int AS refunds,
        (SELECT count(*) FROM identity_private.mobile_invitation_delivery_intents)::int AS sms`)
      )[0];
      invariant(summary.staff === 4 && summary.tenants === 1, "STAFF_BASELINE_CHANGED");
      invariant(
        ["clients", "intakes", "checkouts", "receipts", "refunds", "sms"].every(
          (field) => summary[field] === 0,
        ),
        "NONEMPTY_CLIENT_PAYMENT_BASELINE",
      );
      const release = await tx.unsafe(
        `SELECT enabled FROM commerce_private.checkout_releases
        WHERE tenant_id=$1 AND payment_environment='live'`,
        [realTenant],
      );
      invariant(release.length === 1 && release[0].enabled === false, "LIVE_CHECKOUT_NOT_PAUSED");
      const pilot = await tx.unsafe("SELECT status FROM public.tenants WHERE id=$1", [realTenant]);
      invariant(pilot[0]?.status === "active", "REAL_TENANT_CHANGED");
      const inventory = await tx.unsafe(
        readFileSync(
          new URL("../../scripts/sql/sprint-13-onboarding-baseline.sql", import.meta.url),
          "utf8",
        ),
      );
      const authIds = await tx.unsafe("SELECT id FROM auth.users ORDER BY id");
      const guards = await tx.unsafe(`SELECT n.nspname,c.relname,t.tgname,t.tgenabled,
        pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t
        JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE NOT t.tgisinternal ORDER BY n.nspname,c.relname,t.tgname`);
      return { summary, inventory, authIds, guards };
    });
    const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
    invariant(!hooks.has_more, "WEBHOOK_INVENTORY_INCOMPLETE");
    invariant(activeVersion() === baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
    if (inspecting && !preparing) {
      console.log(
        JSON.stringify({
          stage: "preflight-passed",
          ...baseline.summary,
          sandboxAccountVerified: true,
          liveCheckoutPaused: true,
          webhookCount: hooks.data.length,
        }),
      );
    } else {
      manifest = {
        task: "pilot-isolated-sandbox-acceptance",
        stage: "baseline-recorded",
        createdAt: new Date().toISOString(),
        baselineVersion,
        baseEtag: base.resources.script.etag,
        baseline,
        tenant: randomUUID(),
        service: randomUUID(),
        account,
        maximumSms: 1,
        maximumCaptures: 1,
        dispatched: false,
        captured: false,
        refunded: false,
        fixtureRoots: [],
        fixturesCreated: false,
        saved: false,
      };
      save();
      const hook = await stripe.webhookEndpoints.create(
        {
          url: "https://meneerhealth.co.za/api/payments/stripe/webhook",
          api_version: "2026-07-29.dahlia",
          enabled_events: events,
          description: "Disposable isolated pilot sandbox acceptance; no live money",
          metadata: { exercise: manifest.tenant },
        },
        { idempotencyKey: `pilot-sandbox-hook-${manifest.tenant}` },
      );
      invariant(hook.livemode === false && hook.secret?.startsWith("whsec_"), "TEST_HOOK_INVALID");
      manifest.webhookId = hook.id;
      manifest.webhookSecret = hook.secret;
      manifest.stage = "sandbox-webhook-prepared";
      save();
      invariant(activeVersion() === baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
      const output = wrangler(
        [
          "versions",
          "secret",
          "bulk",
          "--message",
          "Isolated pilot sandbox acceptance - owner promotion required",
        ],
        JSON.stringify({
          COMMERCE_CHECKOUT_MODE: "sandbox",
          COMMERCE_WEBHOOK_MODE: "sandbox",
          COMMERCE_REFUND_MODE: "sandbox",
          COMMERCE_REVIEW_MODE: "enabled",
          COMMERCE_REVIEW_TENANT_ID: manifest.tenant,
          STRIPE_CHECKOUT_ACCOUNT_ID: account,
          STRIPE_RESTRICTED_KEY: process.env.STRIPE_RESTRICTED_KEY,
          STRIPE_WEBHOOK_SIGNING_SECRET: hook.secret,
          STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: manifest.service,
          MEDICAL_INTAKE_MODE: "enabled",
          MEDICAL_INTAKE_TENANT_ID: manifest.tenant,
          MOBILE_INVITATIONS_TENANT_ID: manifest.tenant,
        }),
      );
      const prepared = output.match(/Created version ([a-f0-9-]{36})/)?.[1];
      invariant(prepared, "SANDBOX_VERSION_MISSING");
      manifest.configurationVersion = prepared;
      manifest.stage = "configuration-uploaded";
      save();
      invariant(
        version(prepared).resources?.script?.etag === manifest.baseEtag,
        "CONFIGURATION_CHANGED_SOURCE",
      );
      invariant(activeVersion() === baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
      manifest.stage = "configuration-verified-fixtures-pending";
      save();
      console.log(
        JSON.stringify({
          stage: manifest.stage,
          configurationVersion: prepared,
          ownerPromotionPerformed: false,
          fixturesCreated: false,
          sends: 0,
          charges: 0,
        }),
      );
    }
  } catch (error) {
    // No automatic deletion or rollback. An interrupted preparation retains exact
    // identifiers in its ignored private manifest for reviewed recovery; never retry blindly.
    const reason =
      error instanceof Error && /^[A-Z_]{8,80}$/.test(error.message)
        ? error.message
        : "PROVIDER_OR_CONFIGURATION_FAILURE";
    console.error(
      `SANDBOX_PREPARATION_FAILED: ${reason}; inspect the private manifest before retrying.`,
    );
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}
