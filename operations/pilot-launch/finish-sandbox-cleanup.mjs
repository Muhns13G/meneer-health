// Exact owner-approved 9 October exercise only. No sends, charges, releases or schema migration.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { SQL } from "bun";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sandboxCleanupSql } from "./sandbox-cleanup.mjs";

const tenant = "4a0fc120-933c-4a1e-98d1-8aab7fdfeaa0";
const realTenant = "80000000-0000-4000-8000-000000000001";
const account = "acct_1U32UbFfj16Nnr1i";
const intent = "2c56958e-02d3-45cf-a9fa-36ffa1f0b6bd";
const paymentIntent = "pi_3UOjF1Ffj16Nnr1i0YWbnlnw";
const refundId = "re_3UOjF1Ffj16Nnr1i0P2QsLF0";
const disposable = ["65b6533e-d1c3-4a13-8fe5-12918acd9c1b", "2998c5c7-6021-4ae2-9dab-429ac17288d5"];
const preserved = [
  "04692dbb-06c2-435d-af78-8221526ccc3d",
  "08ed8421-8fcf-4be5-9503-755ae77c274d",
  "94867d47-414a-4d44-92d4-af072c0d96ef",
  "fc406f71-1086-499f-afe6-1080d681d251",
];
const manifestPath = new URL("../../.pilot-sandbox-rehearsal.local", import.meta.url);
const receiptPath = new URL("../../.pilot-sandbox-cleanup.local", import.meta.url);
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
function idArray(ids) {
  invariant(
    ids.every((id) => uuid.test(id)),
    "ARRAY_IDENTIFIER_INVALID",
  );
  return `{${ids.join(",")}}`;
}
function invariant(value, reason) {
  if (!value) throw new Error(reason);
}
const mode = process.argv[2];
if (!["--validate", "--apply", "--resume", "--verify"].includes(mode)) {
  console.log(
    JSON.stringify({
      mode: "no-network-plan",
      exactExerciseOnly: true,
      preservedStaff: 4,
      disposableAuth: 2,
      refundAlreadyConfirmed: true,
      sends: 0,
      charges: 0,
      deployments: 0,
    }),
  );
  process.exit(0);
}
invariant(
  !process.env.CI &&
    process.env.PILOT_SANDBOX_CLEANUP_CONFIRM === "exact-refunded-exercise-preserve-four-staff",
  "CLEANUP_APPROVAL_GUARD_REQUIRED",
);
invariant(
  process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
    process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz") &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.STRIPE_RESTRICTED_KEY?.startsWith("rk_test_"),
  "CLEANUP_TARGET_REJECTED",
);
const m = JSON.parse(readFileSync(manifestPath, "utf8"));
invariant(
  m.task === "pilot-isolated-sandbox-acceptance" &&
    m.tenant === tenant &&
    m.account === account &&
    m.fixturesCreated &&
    m.operatorAuth === disposable[0] &&
    JSON.stringify(m.baseline.authIds.map((x) => x.id).sort()) ===
      JSON.stringify([...preserved].sort()),
  "MANIFEST_SCOPE_REJECTED",
);
const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY, {
  apiVersion: "2026-07-29.dahlia",
  maxNetworkRetries: 0,
  timeout: 15000,
});
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let receipt = existsSync(receiptPath)
  ? JSON.parse(readFileSync(receiptPath, "utf8"))
  : { task: "exact-pilot-sandbox-cleanup", tenant, account, refund: refundId };
invariant(
  receipt.task === "exact-pilot-sandbox-cleanup" &&
    receipt.tenant === tenant &&
    receipt.account === account &&
    receipt.refund === refundId,
  "RECEIPT_SCOPE_REJECTED",
);
invariant(mode !== "--apply" || receipt.validationPassed === true, "ROLLBACK_VALIDATION_REQUIRED");
const save = () =>
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600 });
const inventorySql = readFileSync(
  new URL("../../scripts/sql/sprint-13-onboarding-baseline.sql", import.meta.url),
  "utf8",
);
const guardsSql = `select n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal order by n.nspname,c.relname,t.tgname`;
const protectedAuthSql = `select md5(string_agg(to_jsonb(u)::text,'|' order by u.id)) fingerprint from auth.users u where id=any($1::uuid[])`;
const protectedFactorsSql = `select md5(coalesce(string_agg(to_jsonb(f)::text,'|' order by f.id),'')) fingerprint from auth.mfa_factors f where user_id=any($1::uuid[])`;
try {
  invariant((await stripe.accounts.retrieveCurrent()).id === account, "SANDBOX_ACCOUNT_CHANGED");
  const refund = await stripe.refunds.retrieve(refundId);
  invariant(
    refund.status === "succeeded" &&
      refund.amount === 99900 &&
      refund.currency === "zar" &&
      refund.payment_intent === paymentIntent,
    "REFUND_NOT_CONFIRMED",
  );
  const captured = await stripe.paymentIntents.retrieve(paymentIntent, {
    expand: ["latest_charge"],
  });
  invariant(
    !captured.livemode && captured.latest_charge.amount_refunded === 99900,
    "CAPTURE_NOT_FULLY_REFUNDED",
  );
  if (["--validate", "--apply"].includes(mode)) {
    invariant(!receipt.applicationCleanupCommitted, "APPLICATION_CLEANUP_ALREADY_COMMITTED");
    const users = await db.unsafe("select id from auth.users order by id");
    invariant(
      JSON.stringify(users.map((x) => x.id).sort()) ===
        JSON.stringify([...preserved, ...disposable].sort()),
      "AUTH_SCOPE_CHANGED",
    );
    const records = await db.unsafe(
      "select i.id,i.subject_id,i.session_id,i.provider_account_id,i.payment_environment,s.paid_confirmed from commerce_private.checkout_intents i join commerce_private.settlements s on s.intent_id=i.id where i.tenant_id=$1",
      [tenant],
    );
    invariant(
      records.length === 1 &&
        records[0].id === intent &&
        records[0].provider_account_id === account &&
        records[0].payment_environment === "sandbox" &&
        records[0].paid_confirmed,
      "FINANCIAL_SCOPE_CHANGED",
    );
    const profiles = await db.unsafe(
      "select subject_id from public.client_profiles where tenant_id=$1",
      [tenant],
    );
    invariant(
      profiles.length === 1 && profiles[0].subject_id === records[0].subject_id,
      "CLIENT_SCOPE_CHANGED",
    );
    const sessions = await db.unsafe(
      "select provider_session_id from identity_private.workforce_context_selections where tenant_id=$1",
      [tenant],
    );
    const roots = [
      ...new Set([
        ...m.fixtureRoots.filter((x) => uuid.test(x)),
        records[0].subject_id,
        ...disposable,
        ...sessions.map((x) => x.provider_session_id),
      ]),
    ];
    const realSubjects = await db.unsafe(
      "select subject_id from public.external_identities where provider='supabase' and provider_subject=any($1::text[])",
      [idArray(preserved)],
    );
    invariant(
      !roots.includes(realTenant) &&
        realSubjects.length === 4 &&
        realSubjects.every((x) => !roots.includes(x.subject_id)),
      "PRESERVED_IDENTITY_IN_ROOTS",
    );
    const currentInventory = await db.unsafe(inventorySql);
    const guards = await db.unsafe(guardsSql);
    const authFingerprint = (await db.unsafe(protectedAuthSql, [idArray(preserved)]))[0]
      .fingerprint;
    const factorFingerprint = (await db.unsafe(protectedFactorsSql, [idArray(preserved)]))[0]
      .fingerprint;
    let cleanup = sandboxCleanupSql({
      ...m,
      fixtureRoots: roots,
      fixtureAuthIds: disposable,
      baseline: { ...m.baseline, inventory: currentInventory },
    });
    // The historical pre-exercise baseline is intentionally NOT restored: real staff have since
    // signed in. Capture the CURRENT non-fixture baseline under the affected table locks instead.
    const staleGuard =
      "if n<>r.n or h<>r.fingerprint then raise exception 'ONBOARDING_UNRELATED_DATA_CHANGED';end if;";
    invariant(cleanup.split(staleGuard).length === 2, "BASELINE_GUARD_DRIFT");
    cleanup = cleanup.replace(
      staleGuard,
      "execute 'update exercise_baseline set n=$1,fingerprint=$2 where relation=$3' using n,h,r.relation;",
    );
    const revoke = "where subject_id::text in(select id from exercise_roots) and status='active';";
    const rebuild = "where subject_id::text in(select id from exercise_roots);";
    invariant(cleanup.includes(revoke) && cleanup.includes(rebuild), "SESSION_MARKER_DRIFT");
    cleanup = cleanup.replace(
      revoke,
      "where (subject_id::text in(select id from exercise_roots) or provider_session_id::text in(select id from exercise_roots)) and status='active';",
    );
    cleanup = cleanup.replace(
      rebuild,
      "where subject_id::text in(select id from exercise_roots) or provider_session_id::text in(select id from exercise_roots);",
    );
    const marker = "-- Revoke only our app sessions;";
    invariant(cleanup.includes(marker), "SCOPE_MARKER_DRIFT");
    cleanup = cleanup.replace(
      marker,
      `for r in select distinct rel from exercise_rows loop
      execute format('select count(*) from %s t join exercise_rows e on e.rel=%s and e.tid=t.ctid where to_jsonb(t)->>''tenant_id'' is not null and to_jsonb(t)->>''tenant_id''<>%L',r.rel::regclass,r.rel,'${tenant}') into remaining;
      if remaining<>0 then raise exception 'NONEXERCISE_TENANT_IN_CLEANUP';end if;
    end loop;
    ${marker}`,
    );
    // The account-binding guard is not disabled. Its non-FK dependencies must be removed
    // before deleting only this exercise's release, even when the generic FK order permits it.
    invariant(cleanup.split("if not blocked then").length === 2, "DELETE_ORDER_MARKER_DRIFT");
    cleanup = cleanup.replace(
      "if not blocked then",
      `if r.rel='commerce_private.checkout_releases'::regclass and
      (exists(select 1 from commerce_private.checkout_intents where tenant_id='${tenant}') or
       exists(select 1 from commerce_private.provider_receipts where tenant_boundary='${tenant}')) then blocked:=true;end if;
      if not blocked then`,
    );
    // Validate-only always rolls back all data and guard changes; application step commits only
    // after exact non-fixture fingerprints and trigger restoration have passed inside the packet.
    let expected;
    try {
      await db.begin(async (tx) => {
        await tx.unsafe("set local lock_timeout='5s';set local statement_timeout='45s'");
        await tx.unsafe(cleanup);
        expected = await tx.unsafe(
          "select relation,n,fingerprint from exercise_baseline order by relation",
        );
        invariant(
          (await tx.unsafe("select count(*)::int n from public.tenants where id=$1", [tenant]))[0]
            .n === 0,
          "EXERCISE_TENANT_REMAINS",
        );
        invariant(
          JSON.stringify(await tx.unsafe(guardsSql)) === JSON.stringify(guards),
          "INTEGRITY_GUARDS_CHANGED",
        );
        // Revoke only disposable users' tokens and the exact provider sessions selected for
        // this sandbox. Other sessions/factors of the preserved four staff remain untouched.
        const selectedSessions = sessions.map((x) => x.provider_session_id);
        await tx.unsafe(
          "delete from auth.refresh_tokens where user_id=any($1::text[]) or session_id=any($2::uuid[])",
          [idArray(disposable), idArray(selectedSessions)],
        );
        await tx.unsafe(
          "delete from auth.sessions where user_id=any($1::uuid[]) or id=any($2::uuid[])",
          [idArray(disposable), idArray(selectedSessions)],
        );
        if (mode === "--validate") throw new Error("EXACT_CLEANUP_ROLLBACK_PASSED");
      });
    } catch (e) {
      if (mode !== "--validate" || e.message !== "EXACT_CLEANUP_ROLLBACK_PASSED") throw e;
    }
    invariant(
      (await db.unsafe(protectedAuthSql, [idArray(preserved)]))[0].fingerprint ===
        authFingerprint &&
        (await db.unsafe(protectedFactorsSql, [idArray(preserved)]))[0].fingerprint ===
          factorFingerprint,
      "REAL_AUTH_OR_FACTORS_CHANGED",
    );
    if (mode === "--validate") {
      invariant(
        JSON.stringify(await db.unsafe(inventorySql)) === JSON.stringify(currentInventory),
        "ROLLBACK_DID_NOT_RESTORE_CURRENT_BASELINE",
      );
      receipt.validationPassed = true;
      receipt.guards = guards;
      receipt.expectedInventory = expected;
      receipt.preservedAuthFingerprint = authFingerprint;
      receipt.preservedFactorFingerprint = factorFingerprint;
      receipt.fixtureRoots = roots;
      receipt.fixtureAuthIds = disposable;
      save();
      console.log(
        JSON.stringify({
          rollbackValidationPassed: true,
          realStaff: 4,
          currentRealDataPreserved: true,
          guardsRestored: true,
          permanentDeletes: 0,
        }),
      );
    } else {
      receipt.applicationCleanupCommitted = true;
      receipt.expectedInventory = expected;
      receipt.guards = guards;
      receipt.preservedAuthFingerprint = authFingerprint;
      receipt.preservedFactorFingerprint = factorFingerprint;
      receipt.fixtureAuthIds = disposable;
      save();
    }
  }
  if (mode !== "--validate") {
    invariant(receipt.applicationCleanupCommitted, "APPLICATION_CLEANUP_NOT_COMMITTED");
    for (const id of disposable) {
      if ((await db.unsafe("select id from auth.users where id=$1", [id])).length) {
        invariant(mode !== "--verify", "DISPOSABLE_AUTH_STILL_PRESENT");
        const removed = await admin.auth.admin.deleteUser(id);
        invariant(!removed.error, "DISPOSABLE_AUTH_REMOVAL_FAILED");
      }
    }
    const exists = await stripe.webhookEndpoints.list({ limit: 100 });
    invariant(!exists.has_more, "WEBHOOK_INVENTORY_INCOMPLETE");
    const hook = exists.data.find((h) => h.id === m.webhookId);
    if (hook) {
      invariant(mode !== "--verify", "TEST_WEBHOOK_STILL_PRESENT");
      invariant(
        !hook.livemode &&
          hook.metadata.exercise === tenant &&
          hook.url === "https://meneerhealth.co.za/api/payments/stripe/webhook",
        "WEBHOOK_SCOPE_CHANGED",
      );
      await stripe.webhookEndpoints.del(hook.id);
    }
    invariant(
      (await db.unsafe("select count(*)::int n from auth.users"))[0].n === 4 &&
        (
          await db.unsafe("select count(*)::int n from auth.users where id=any($1::uuid[])", [
            idArray(preserved),
          ])
        )[0].n === 4,
      "FINAL_AUTH_BASELINE_CHANGED",
    );
    invariant(
      (
        await db.unsafe("select count(*)::int n from auth.sessions where user_id=any($1::uuid[])", [
          idArray(disposable),
        ])
      )[0].n === 0,
      "DISPOSABLE_PROVIDER_SESSIONS_REMAIN",
    );
    invariant(
      JSON.stringify(await db.unsafe(inventorySql)) === JSON.stringify(receipt.expectedInventory),
      "FINAL_APPLICATION_BASELINE_CHANGED",
    );
    invariant(
      JSON.stringify(await db.unsafe(guardsSql)) === JSON.stringify(receipt.guards),
      "FINAL_GUARDS_CHANGED",
    );
    invariant(
      (await db.unsafe(protectedAuthSql, [idArray(preserved)]))[0].fingerprint ===
        receipt.preservedAuthFingerprint &&
        (await db.unsafe(protectedFactorsSql, [idArray(preserved)]))[0].fingerprint ===
          receipt.preservedFactorFingerprint,
      "FINAL_STAFF_AUTH_CHANGED",
    );
    receipt.cleanupVerified = true;
    receipt.completedAt = new Date().toISOString();
    save();
    console.log(
      JSON.stringify({
        cleanupVerified: true,
        preservedStaff: 4,
        removedDisposableAuth: 2,
        removedSandboxTenant: true,
        refundSucceeded: true,
        refundMinor: 99900,
        applicationFingerprintsPreserved: true,
        guardsRestored: true,
        removedExactTestWebhook: true,
        realPilotClients: 0,
        providerTestRecordsRetained: true,
        productionDeploymentChanged: false,
      }),
    );
  }
} catch (e) {
  console.error(
    JSON.stringify({
      failure: /^[A-Z_]{8,100}$/.test(e?.message ?? "")
        ? e.message
        : "PROVIDER_OR_DATABASE_CLEANUP_FAILED",
      code: e?.code ?? null,
      databaseReason:
        e?.code === "ERR_POSTGRES_SERVER_ERROR"
          ? String(e.message)
              .replace(/"[^"]*"|'[^']*'/g, "[redacted]")
              .slice(0, 180)
          : undefined,
      applicationCleanupCommitted: receipt.applicationCleanupCommitted === true,
    }),
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
