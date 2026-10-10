// Owner-approved credential/configuration preparation only. Never promotes, sends or charges.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Stripe from "stripe";
import { SQL } from "bun";

const tenant = "80000000-0000-4000-8000-000000000001";
const account = "acct_1U32SWCBswMrhhx4";
const service = "c7a04672-992e-44fe-918b-76209f974adb";
const receiptPath = new URL("../../.pilot-live-refresh.local", import.meta.url);
const mode = process.argv[2];
function invariant(value, code) {
  if (!value) throw new Error(code);
}
if (!["--prepare", "--verify", "--verify-active"].includes(mode)) {
  console.log(JSON.stringify({ mode: "no-network-plan", sends: 0, charges: 0, promotes: false }));
  process.exit(0);
}
invariant(
  !process.env.CI &&
    process.env.PILOT_LIVE_REFRESH_CONFIRM === "verified-key-current-source-no-send-no-charge" &&
    process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.STRIPE_LIVE_ACCOUNT_ID === account &&
    process.env.STRIPE_LIVE_RESTRICTED_KEY?.startsWith("rk_live_") &&
    process.env.STRIPE_LIVE_WEBHOOK_SIGNING_SECRET?.startsWith("whsec_") &&
    process.env.STRIPE_LIVE_WEBHOOK_SIGNING_SECRET !== process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
  "LIVE_REFRESH_CONFIGURATION_REJECTED",
);
function command(args, input) {
  const result = spawnSync(
    "bun",
    [
      "--no-env-file",
      "x",
      "wrangler",
      ...args,
      "--name",
      "meneer-health",
      "--config",
      "wrangler.jsonc",
    ],
    {
      input,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false" },
    },
  );
  invariant(result.status === 0, "CLOUDFLARE_CONFIGURATION_COMMAND_FAILED");
  return result.stdout;
}
const active = () => {
  const deployments = JSON.parse(command(["deployments", "list", "--json"]));
  const v = deployments.at(-1)?.versions;
  invariant(v?.length === 1 && v[0].percentage === 100, "SPLIT_DEPLOYMENT_REJECTED");
  return v[0].version_id;
};
const view = (id) => JSON.parse(command(["versions", "view", id, "--json"]));
try {
  const stripe = new Stripe(process.env.STRIPE_LIVE_RESTRICTED_KEY, {
    apiVersion: "2026-07-29.dahlia",
    maxNetworkRetries: 0,
    timeout: 10000,
    telemetry: false,
  });
  const provider = await stripe.accounts.retrieveCurrent();
  invariant(
    provider.id === account &&
      provider.charges_enabled &&
      provider.payouts_enabled &&
      provider.capabilities?.card_payments === "active" &&
      !provider.requirements?.disabled_reason &&
      !provider.requirements?.currently_due?.length &&
      !provider.requirements?.pending_verification?.length,
    "LIVE_ACCOUNT_NOT_READY",
  );
  let receipt;
  if (mode === "--prepare") {
    invariant(!existsSync(receiptPath), "REFRESH_RECEIPT_ALREADY_EXISTS");
    const baselineVersion = active();
    const baseline = view(baselineVersion);
    invariant(baseline.resources?.script?.etag, "SCRIPT_FINGERPRINT_MISSING");
    const settings = {
      STRIPE_LIVE_RESTRICTED_KEY: process.env.STRIPE_LIVE_RESTRICTED_KEY,
      STRIPE_LIVE_ACCOUNT_ID: account,
      STRIPE_LIVE_WEBHOOK_SIGNING_SECRET: process.env.STRIPE_LIVE_WEBHOOK_SIGNING_SECRET,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: service,
      COMMERCE_REVIEW_MODE: "enabled",
      COMMERCE_REVIEW_TENANT_ID: tenant,
      COMMERCE_CHECKOUT_MODE: "live",
      COMMERCE_WEBHOOK_MODE: "live",
      COMMERCE_REFUND_MODE: "live",
      MEDICAL_INTAKE_MODE: "enabled",
      MEDICAL_INTAKE_TENANT_ID: tenant,
      MOBILE_INVITATIONS_MODE: "telnyx",
      MOBILE_INVITATIONS_REDEMPTION_MODE: "enabled",
      MOBILE_INVITATIONS_EMAIL_MODE: "enabled",
      MOBILE_INVITATIONS_WEBHOOK_MODE: "telnyx",
      MOBILE_INVITATIONS_DELIVERY_READY: "true",
      MOBILE_INVITATIONS_TENANT_ID: tenant,
    };
    receipt = {
      task: "pilot-live-key-current-source-refresh",
      createdAt: new Date().toISOString(),
      baselineVersion,
      etag: baseline.resources.script.etag,
      preservedBindings: (baseline.resources.bindings ?? []).map((b) => ({
        name: b.name,
        type: b.type,
      })),
      changedBindingNames: Object.keys(settings),
      realTenant: tenant,
      account,
      paymentService: service,
      databaseReleaseBlocked: true,
      blockedReason: "REAL_DEPOSIT_PRICE_NOT_CONFIGURED",
      promoted: false,
    };
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    invariant(active() === baselineVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
    const result = command(
      [
        "versions",
        "secret",
        "bulk",
        "--message",
        "Verified live key - deposit price prerequisite, owner promotion pending",
      ],
      JSON.stringify(settings),
    );
    receipt.preparedVersion = result.match(/Created version ([a-f0-9-]{36})/)?.[1];
    invariant(receipt.preparedVersion, "PREPARED_VERSION_NOT_RECORDED");
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600 });
  } else {
    receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    invariant(
      receipt.task === "pilot-live-key-current-source-refresh" && receipt.preparedVersion,
      "REFRESH_RECEIPT_INVALID",
    );
  }
  const prepared = view(receipt.preparedVersion);
  const bindings = prepared.resources?.bindings ?? [];
  invariant(prepared.resources?.script?.etag === receipt.etag, "SOURCE_CHANGED_BY_REFRESH");
  invariant(
    receipt.preservedBindings.every((b) =>
      bindings.some((x) => x.name === b.name && x.type === b.type),
    ),
    "EXISTING_BINDING_REMOVED_OR_CHANGED_TYPE",
  );
  invariant(
    receipt.changedBindingNames.every((n) => bindings.some((b) => b.name === n)),
    "RELEASE_BINDING_MISSING",
  );
  invariant(
    ["PRODUCT_CATALOGUE_MODE", "PRODUCT_QUOTES_MODE", "PRODUCT_ORDERING_MODE"].every((n) =>
      bindings.some((b) => b.name === n && b.type === "plain_text" && b.text === "disabled"),
    ),
    "PRODUCT_RELEASE_CHANGED",
  );
  invariant(
    active() === (mode === "--verify-active" ? receipt.preparedVersion : receipt.baselineVersion),
    "UNEXPECTED_PROMOTION_OR_CONCURRENT_DEPLOYMENT",
  );
  if (mode !== "--prepare") {
    invariant(
      process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz"),
      "DATABASE_TARGET_REJECTED",
    );
    const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
    try {
      const rows = await db.unsafe(`select r.expires_at, p.id as price_id,
        commerce_private.review_price_current(p.id,r.tenant_id) as price_current
        from commerce_private.checkout_releases r
        join commerce_private.review_price_bindings b on b.tenant_id=r.tenant_id
        join commerce_private.prices p on p.id=b.price_id
        where r.tenant_id='80000000-0000-4000-8000-000000000001'
        and r.provider_account_id='acct_1U32SWCBswMrhhx4' and r.payment_environment='live'
        and r.enabled and r.expires_at>clock_timestamp() and p.status='approved'
        and p.environment='approved-pilot-review' and p.unit_amount_minor=99900
        and p.expires_at>=r.expires_at and commerce_private.review_price_current(p.id,r.tenant_id)
        and exists(select 1 from public.service_identities s where
          s.id='c7a04672-992e-44fe-918b-76209f974adb' and s.tenant_id=r.tenant_id
          and s.status='active' and s.expires_at>=r.expires_at)
        and exists(select 1 from commerce_private.order_publications t where
          t.tenant_id=r.tenant_id and t.scenario='review_deposit' and t.status='published'
          and t.effective_at<=clock_timestamp() and t.expires_at>=r.expires_at)
        and not exists(select 1 from commerce_private.product_quote_releases where enabled)`);
      invariant(rows.length === 1 && rows[0].price_current, "DATABASE_RELEASE_NOT_READY");
      receipt.databaseReleaseBlocked = false;
      receipt.blockedReason = null;
      receipt.depositPriceId = rows[0].price_id;
      receipt.databaseReleaseExpiresAt = rows[0].expires_at;
    } finally {
      await db.close();
    }
  }
  receipt.verified = true;
  receipt.promoted = mode === "--verify-active";
  if (receipt.promoted) receipt.activeVerifiedAt = new Date().toISOString();
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600 });
  console.log(
    JSON.stringify({
      preparedVersion: receipt.preparedVersion,
      currentSourcePreserved: true,
      existingBindingNamesAndTypesPreserved: true,
      liveCredentialBindingsPresent: true,
      realTenantTargetsPrepared: true,
      productOrderingDisabled: true,
      promoted: receipt.promoted,
      databaseReleaseBlocked: receipt.databaseReleaseBlocked,
      databaseReleaseExpiresAt: receipt.databaseReleaseExpiresAt,
      reason: receipt.blockedReason,
      sends: 0,
      charges: 0,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      failure: /^[A-Z_]{8,100}$/.test(error?.message ?? "")
        ? error.message
        : "LIVE_REFRESH_FAILED_OR_UNCERTAIN",
      activeDeploymentVerified: false,
    }),
  );
  process.exitCode = 1;
}
