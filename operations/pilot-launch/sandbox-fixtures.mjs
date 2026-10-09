// Isolated prerequisites only. No client, completed intake or financial evidence is seeded.
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { SQL } from "bun";

const manifestPath = new URL("../../.pilot-sandbox-rehearsal.local", import.meta.url);
const inventoryPath = new URL(
  "../../scripts/sql/sprint-13-onboarding-baseline.sql",
  import.meta.url,
);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function invariant(value, code) {
  if (!value) throw new Error(code);
}
const apply = process.argv.includes("--apply");
const validate = process.argv.includes("--validate");
if (!apply && !validate) {
  console.log(
    JSON.stringify({
      mode: "no-network-plan",
      sends: 0,
      charges: 0,
      seedsClients: false,
      seedsQuestionnaires: false,
      seedsFinancialEvidence: false,
    }),
  );
} else {
  invariant(
    !process.env.CI &&
      process.env.PILOT_SANDBOX_CONFIRM === "isolated-one-sms-test-capture-refund-cleanup" &&
      process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz") &&
      process.env.TELNYX_MESSAGING_PROFILE_ID === "40019e2b-9dc8-43bf-a32f-9a4c4786e836" &&
      process.env.TELNYX_FROM_NUMBER === "+15127377491",
    "SANDBOX_FIXTURE_GUARD_REJECTED",
  );
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  invariant(
    m.task === "pilot-isolated-sandbox-acceptance" &&
      m.stage === "configuration-verified-fixtures-pending" &&
      !m.fixturesCreated &&
      uuid.test(m.tenant) &&
      uuid.test(m.service) &&
      m.account === "acct_1U32UbFfj16Nnr1i",
    "SANDBOX_MANIFEST_SCOPE_REJECTED",
  );
  m.fixtureIds ??= {
    approver: randomUUID(),
    clinician: randomUUID(),
    intake: randomUUID(),
    price: randomUUID(),
    terms: randomUUID(),
    authority: randomUUID(),
  };
  invariant(
    Object.values(m.fixtureIds).every((id) => uuid.test(id)),
    "FIXTURE_IDS_INVALID",
  );
  const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
  const inventory = () => db.unsafe(readFileSync(inventoryPath, "utf8"));
  const save = () =>
    writeFileSync(manifestPath, JSON.stringify(m, null, 2) + "\n", { mode: 0o600 });
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  const ids = m.fixtureIds;
  const t = quote(m.tenant);
  const setup = `
    INSERT INTO public.tenants(id,slug,display_name,status)
      VALUES(${t},'sandbox-'||${t},'SYNTHETIC PILOT ACCEPTANCE','active');
    INSERT INTO public.subjects(id) VALUES(${quote(ids.approver)}),(${quote(ids.clinician)});
    INSERT INTO intake_private.publications(id,tenant_id,collection_version,control_version,
      catalogue_hash,privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,
      primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,
      urgent_guidance,after_hours_guidance,effective_at,expires_at,status,transfer_notice)
    VALUES(${quote(ids.intake)},${t},'1.1.0','1.0.0',
      '06db05e0eac46bebb855f4aa9afca05769603ce0c4f19282931904216cbd5a34',
      'SYNTHETIC ACCEPTANCE ONLY: dummy answers, not clinical care.',
      'I consent to this synthetic questionnaire exercise only.',gen_random_uuid(),
      ${quote(ids.clinician)},${quote(ids.approver)},${quote(ids.clinician)},${quote(ids.approver)},
      86400,gen_random_uuid(),'Seek immediate emergency care for urgent symptoms.',
      'Synthetic rehearsal; no clinical service.',now()-interval '1 minute',
      now()+interval '4 hours','published',NULL);
    INSERT INTO commerce_private.prices(id,kind,version,description,unit_amount_minor,
      tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at)
    VALUES(${quote(ids.price)},'review_deposit','sandbox-'||${t},'SYNTHETIC review deposit',99900,
      'vat-inclusive-planning',repeat('a',64),${quote(ids.authority)},'local-synthetic',
      now()-interval '1 minute',now()+interval '4 hours');
    INSERT INTO commerce_private.order_publications(id,tenant_id,scenario,instrument_version,
      supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
    VALUES(${quote(ids.terms)},${t},'review_deposit','1.0.0','SYNTHETIC TEST ONLY',
      'SYNTHETIC TEST ONLY: R999 sandbox deposit, fully refunded; no clinical or product service.',
      repeat('0',64),${quote(ids.authority)},now()-interval '1 minute',now()+interval '4 hours','published');
    INSERT INTO commerce_private.checkout_releases(tenant_id,provider_account_id,approval_reference,
      expires_at,enabled,payment_environment)
    VALUES(${t},${quote(m.account)},${quote(ids.authority)},now()+interval '4 hours',true,'sandbox');
    INSERT INTO public.service_identities(id,tenant_id,name,environment,purpose,status,expires_at)
    VALUES(${quote(m.service)},${t},'synthetic-pilot-sandbox','preview','operations','active',now()+interval '4 hours');
    INSERT INTO public.service_identity_scopes(service_identity_id,resource,action)
    VALUES(${quote(m.service)},'payment','append'),(${quote(m.service)},'payment','update');
    INSERT INTO identity_private.mobile_invitation_policies(tenant_id,daily_reservation_limit,
      sending_enabled,delivery_ready,provider_profile_id,from_phone,per_segment_usd_micros,
      per_message_usd_micros,daily_usd_micros)
    VALUES(${t},1,true,true,${quote(process.env.TELNYX_MESSAGING_PROFILE_ID)},
      ${quote(process.env.TELNYX_FROM_NUMBER)},250000,500000,500000);
  `;
  try {
    invariant(
      JSON.stringify(await inventory()) === JSON.stringify(m.baseline.inventory),
      "UNRELATED_BASELINE_CHANGED",
    );
    const accountRows = await db.unsafe(
      "SELECT 1 FROM commerce_private.payment_account_environments WHERE provider_account_id=$1",
      [m.account],
    );
    const roots = [
      m.tenant,
      m.service,
      ...Object.values(ids),
      ...(accountRows.length === 0 ? [m.account] : []),
    ];
    m.fixtureRoots = roots;
    save();
    const originalGuard = `if not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='suspended')
 or exists(select 1 from auth.users where id::text not in(select id from exercise_roots)) then`;
    const preserved = m.baseline.authIds.map(({ id }) => {
      invariant(uuid.test(id), "PRESERVED_AUTH_ID_INVALID");
      return quote(id);
    });
    invariant(preserved.length === 4, "PRESERVED_STAFF_BASELINE_INVALID");
    // A separate bounded packet: historical source/guards are not edited or executed unchanged.
    // The unchanged original-row fingerprints still reject deletion/modification of real data.
    const replacement = `if not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='active')
 or (select count(*) from auth.users)<>4
 or exists(select 1 from auth.users where id not in(${preserved.join(",")})) then`;
    const template = readFileSync(
      new URL("../../scripts/sql/sprint-13-onboarding-cleanup.sql", import.meta.url),
      "utf8",
    );
    invariant(template.includes(originalGuard), "CLEANUP_TEMPLATE_CHANGED");
    const cleanup = template
      .replace(originalGuard, replacement)
      .replaceAll("{{baseline}}", JSON.stringify(m.baseline.inventory).replaceAll("'", "''"))
      .replaceAll("{{roots}}", JSON.stringify(roots))
      .replace(/^([\s\S]*?)begin;/, "")
      .replace(/commit;\s*select true as scoped_cleanup_committed;\s*$/, "");
    invariant(!cleanup.includes("{{"), "CLEANUP_TEMPLATE_INVALID");
    // Prove creation AND exact scoped removal under one transaction before persisting anything.
    try {
      await db.begin(async (tx) => {
        await tx.unsafe("SET LOCAL lock_timeout='5s'");
        await tx.unsafe(setup);
        await tx.unsafe(cleanup);
        throw new Error("SANDBOX_ROLLBACK_VALIDATED");
      });
    } catch (error) {
      invariant(
        error instanceof Error && error.message === "SANDBOX_ROLLBACK_VALIDATED",
        "SETUP_CLEANUP_VALIDATION_FAILED",
      );
    }
    invariant(
      JSON.stringify(await inventory()) === JSON.stringify(m.baseline.inventory),
      "ROLLBACK_BASELINE_CHANGED",
    );
    m.fixtureRollbackValidated = true;
    save();
    if (apply) {
      // Refuse stale baseline after validation; no other exercise may run concurrently.
      await db.begin(async (tx) => {
        await tx.unsafe("SET LOCAL lock_timeout='5s'");
        invariant(
          JSON.stringify(await tx.unsafe(readFileSync(inventoryPath, "utf8"))) ===
            JSON.stringify(m.baseline.inventory),
          "UNRELATED_BASELINE_CHANGED",
        );
        await tx.unsafe(setup);
      });
      m.fixturesCreated = true;
      m.stage = "prerequisites-created-awaiting-owner-promotion";
      save();
    }
    console.log(
      JSON.stringify({
        rollbackValidated: true,
        fixturesCreated: m.fixturesCreated,
        tenant: m.tenant,
        configurationVersion: m.configurationVersion,
        clientsCreated: 0,
        completedIntakesSeeded: 0,
        paymentEvidenceSeeded: 0,
        sends: 0,
        charges: 0,
      }),
    );
  } catch (error) {
    const reason =
      error instanceof Error && /^[A-Z_]{8,80}$/.test(error.message)
        ? error.message
        : "PROVIDER_OR_DATABASE_FAILURE";
    console.error(`SANDBOX_FIXTURE_PREPARATION_FAILED: ${reason}`);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}
