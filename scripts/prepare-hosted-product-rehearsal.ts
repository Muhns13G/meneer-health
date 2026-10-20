import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import Stripe from "stripe";
import {
  assertProductPreparationEnvironment,
  preparationManifestSchema,
  productRehearsalAccount,
  productRehearsalConfiguration,
  productRehearsalInitialVersion,
  productRehearsalOrigin,
  productRehearsalWorker,
  type ProductRehearsalPreparation,
} from "./lib/product-rehearsal-preparation";
import { validProductRehearsalBindings } from "../src/server/security/product-rehearsal-boundary";

// Explicitly approved separate target only. No source upload, promotion, Auth fixtures or captures.
const manifestPath = ".sprint15-product-rehearsal.local";
const temporaryPath = ".sprint15-product-rehearsal.pending.local";
const configPath = "dist-product-rehearsal/server/wrangler.json";
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw Error(code);
}
function wrangler(args: string[], input?: string): string {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) =>
        !/^(STRIPE_|SUPABASE_|BREVO_|TELNYX_|MEDICAL_|PRODUCT_|COMMERCE_|IDENTITY_|RECOVERY_|R2_|BACKUP_)/.test(
          name,
        ),
    ),
  );
  const result = spawnSync("node_modules/.bin/wrangler", [...args, "--config", configPath], {
    encoding: "utf8",
    input,
    // The CLI deliberately does not inherit the application's augmented required bindings.
    env: environment as NodeJS.ProcessEnv,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 120000,
    maxBuffer: 2 * 1024 * 1024,
  });
  invariant(result.status === 0, "PRODUCT_REHEARSAL_CLOUDFLARE_REQUEST_FAILED");
  return result.stdout;
}
function activeVersion(name: string): string {
  const rows = JSON.parse(wrangler(["deployments", "list", "--name", name, "--json"]));
  const latest = rows.at(-1);
  invariant(
    latest?.versions?.length === 1 && latest.versions[0].percentage === 100,
    "PRODUCT_REHEARSAL_TRAFFIC_SPLIT_REJECTED",
  );
  return latest.versions[0].version_id;
}
function version(id: string) {
  const value = JSON.parse(
    wrangler(["versions", "view", id, "--name", productRehearsalWorker, "--json"]),
  );
  invariant(
    value.id === id && value.resources?.script?.handlers?.join(",") === "fetch",
    "PRODUCT_REHEARSAL_SOURCE_REJECTED",
  );
  return value as {
    id: string;
    resources: {
      script: { etag: string; handlers: string[] };
      script_runtime: { assets: { raw_run_worker_first?: unknown } };
      bindings: { name: string; type: string; text?: string }[];
    };
  };
}
function checkpoint(manifest: ProductRehearsalPreparation) {
  preparationManifestSchema.parse(manifest);
  writeFileSync(temporaryPath, JSON.stringify(manifest), { mode: 0o600 });
  invariant(
    (statSync(temporaryPath).mode & 0o777) === 0o600,
    "PRODUCT_REHEARSAL_MANIFEST_PERMISSIONS_REJECTED",
  );
  renameSync(temporaryPath, manifestPath);
}
async function main() {
  assertProductPreparationEnvironment(process.env);
  invariant(
    JSON.parse(readFileSync(configPath, "utf8")).name === productRehearsalWorker,
    "PRODUCT_REHEARSAL_CONFIG_TARGET_REJECTED",
  );
  const stage = activeVersion(productRehearsalWorker);
  const mainVersion = activeVersion("meneer-health");
  invariant(stage === productRehearsalInitialVersion, "PRODUCT_REHEARSAL_BASELINE_RELEASE_CHANGED");
  const source = version(stage);
  invariant(
    source.resources.script_runtime.assets.raw_run_worker_first === true,
    "PRODUCT_REHEARSAL_ASSET_BOUNDARY_REJECTED",
  );
  const baseline = new Map(source.resources.bindings.map((binding) => [binding.name, binding]));
  for (const name of [
    "PUBLIC_REGISTRATION_MODE",
    "MOBILE_INVITATIONS_MODE",
    "MOBILE_INVITATIONS_EMAIL_MODE",
    "MOBILE_INVITATIONS_REDEMPTION_MODE",
    "MOBILE_INVITATIONS_WEBHOOK_MODE",
    "TRANSACTIONAL_NOTIFICATIONS_MODE",
    "OPERATIONS_ALERTS_MODE",
  ])
    invariant(
      baseline.get(name)?.text === "disabled",
      "PRODUCT_REHEARSAL_NO_SEND_BASELINE_REJECTED",
    );
  invariant(
    !source.resources.bindings.some((binding) => /STRIPE_|SUPABASE_|IDENTITY_/.test(binding.name)),
    "PRODUCT_REHEARSAL_BASELINE_HAS_CREDENTIALS",
  );
  const probe = await fetch(productRehearsalOrigin + "/portal/order", {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  invariant(
    probe.status === 503 && (await probe.text()) === "Rehearsal unavailable.",
    "PRODUCT_REHEARSAL_BASELINE_NOT_CLOSED",
  );
  const manifest: ProductRehearsalPreparation = existsSync(manifestPath)
    ? preparationManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")))
    : {
        contract: "sprint15.product-rehearsal",
        version: 1,
        state: "initialised",
        exerciseId: randomUUID(),
        tenantId: randomUUID(),
        serviceId: randomUUID(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 23 * 3600000).toISOString(),
        mainVersion,
        sourceVersion: productRehearsalInitialVersion,
        sourceEtag: source.resources.script.etag,
        accessKey: randomBytes(32).toString("hex"),
        sessionKey: randomBytes(32).toString("base64"),
        shippingKey: randomBytes(32).toString("base64"),
      };
  invariant(
    manifest.mainVersion === mainVersion &&
      manifest.sourceEtag === source.resources.script.etag &&
      Date.parse(manifest.expiresAt) > Date.now() + 30 * 60000,
    "PRODUCT_REHEARSAL_LEASE_OR_BASELINE_CHANGED",
  );
  checkpoint(manifest);
  const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
    apiVersion: "2026-07-29.dahlia",
    maxNetworkRetries: 0,
    timeout: 15000,
    telemetry: false,
  });
  invariant(
    (await stripe.accounts.retrieveCurrent()).id === productRehearsalAccount,
    "PRODUCT_REHEARSAL_STRIPE_ACCOUNT_REJECTED",
  );
  if (!manifest.webhookId) {
    const hook = await stripe.webhookEndpoints.create(
      {
        url: productRehearsalOrigin + "/api/payments/stripe/webhook",
        api_version: "2026-07-29.dahlia",
        description: "Disposable Sprint 15.9 isolated product acceptance",
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
      },
      { idempotencyKey: `sprint15-webhook:${manifest.exerciseId}` },
    );
    invariant(
      !hook.livemode &&
        hook.secret?.startsWith("whsec_") &&
        hook.url === productRehearsalOrigin + "/api/payments/stripe/webhook",
      "PRODUCT_REHEARSAL_TEST_WEBHOOK_REJECTED",
    );
    manifest.webhookId = hook.id;
    manifest.webhookSecret = hook.secret;
    manifest.state = "webhook-created";
    checkpoint(manifest);
  } else {
    const hook = await stripe.webhookEndpoints.retrieve(manifest.webhookId);
    invariant(
      !hook.livemode && hook.url === productRehearsalOrigin + "/api/payments/stripe/webhook",
      "PRODUCT_REHEARSAL_WEBHOOK_SCOPE_CHANGED",
    );
  }
  const values = productRehearsalConfiguration(manifest, process.env);
  // Keep this exact test endpoint dormant while waiting for the owner's configuration release.
  // The acceptance driver enables it only immediately before its approved sandbox captures.
  const dormant = await stripe.webhookEndpoints.update(manifest.webhookId!, { disabled: true });
  invariant(
    dormant.status === "disabled" && !dormant.livemode,
    "PRODUCT_REHEARSAL_WEBHOOK_NOT_DORMANT",
  );
  invariant(validProductRehearsalBindings(values), "PRODUCT_REHEARSAL_CONFIGURATION_REJECTED");
  if (!manifest.configurationVersion) {
    invariant(
      activeVersion("meneer-health") === mainVersion &&
        activeVersion(productRehearsalWorker) === stage,
      "PRODUCT_REHEARSAL_CONCURRENT_RELEASE_CHANGED",
    );
    const output = wrangler(
      [
        "versions",
        "secret",
        "bulk",
        "--name",
        productRehearsalWorker,
        "--message",
        "Approved isolated Sprint 15.9 sandbox configuration - owner promotion required",
      ],
      JSON.stringify(values),
    );
    const id = output.match(/Created version ([a-f0-9-]{36})/)?.[1];
    invariant(id, "PRODUCT_REHEARSAL_PREPARED_VERSION_UNCONFIRMED");
    manifest.configurationVersion = id;
    checkpoint(manifest);
  }
  const prepared = version(manifest.configurationVersion);
  invariant(
    prepared.resources.script.etag === manifest.sourceEtag &&
      prepared.resources.script_runtime.assets.raw_run_worker_first === true &&
      Object.keys(values).every((name) =>
        prepared.resources.bindings.some((binding) => binding.name === name),
      ) &&
      !prepared.resources.bindings.some((binding) =>
        /STRIPE_LIVE_|BREVO_|TELNYX_|RECOVERY_|R2_/.test(binding.name),
      ) &&
      activeVersion("meneer-health") === mainVersion &&
      activeVersion(productRehearsalWorker) === stage,
    "PRODUCT_REHEARSAL_READBACK_OR_RELEASE_CHANGED",
  );
  manifest.state = "configuration-prepared";
  checkpoint(manifest);
  console.log(
    JSON.stringify({
      exercise: "sprint15-product-rehearsal-preparation",
      configurationVersion: manifest.configurationVersion,
      mainVersionPreserved: mainVersion,
      separateActiveVersion: stage,
      expiresAt: manifest.expiresAt,
      sourceUnchanged: true,
      ownerPromotionRequired: true,
      authFixtures: 0,
      emails: 0,
      sms: 0,
      captures: 0,
      testWebhookCreated: true,
      testWebhookDisabledUntilAcceptance: true,
    }),
  );
}
await main().catch((error) => {
  console.error(
    JSON.stringify({
      error:
        error instanceof Error && /^PRODUCT_REHEARSAL_[A-Z_]+$/.test(error.message)
          ? error.message
          : "PRODUCT_REHEARSAL_PREPARATION_FAILED",
      privateManifest: manifestPath,
    }),
  );
  process.exitCode = 1;
});
