// Explicitly approved real pilot preparation. No send, charge, permission activation or deployment.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { SQL } from "bun";

const tenantId = "80000000-0000-4000-8000-000000000001";
const approverId = "c72f29d8-a171-43bc-a942-47b07ce03246";
const accountId = "acct_1U32SWCBswMrhhx4";
const text = readFileSync(
  new URL(
    "../../docs/02-implementation-plans/phase-02/annexures/pilot-client-terms-v1.md",
    import.meta.url,
  ),
  "utf8",
);
function section(start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error("PUBLICATION_TEXT_INVALID");
  return text.slice(from + start.length, to).trim();
}
const bodies = [
  section("## A — Account and Pilot Terms", "## B — Privacy Collection Notice"),
  section("## B — Privacy Collection Notice", "## C — Questionnaire Acknowledgement"),
  section("## D — R999 Review Deposit and Payment Terms", "## Internal Publication"),
];
if (!text.includes("status: owner-approved-copy-")) {
  throw new Error("OWNER_APPROVED_COPY_REQUIRED");
}
const hashes = bodies.map((body) => createHash("sha256").update(body).digest("hex"));
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({ mode: "no-network-plan", tenantId, hashes, checkoutEnabled: false }),
  );
} else {
  if (process.env.PILOT_PREPARATION_CONFIRM !== "owner-approved-terms-disabled-authority") {
    throw new Error("EXPLICIT_PREPARATION_CONFIRMATION_REQUIRED");
  }
  const url = process.env.SUPABASE_DB_URL;
  if (!url || !url.includes("gibfpolrdjotwvewgfsz")) {
    throw new Error("EXACT_HOSTED_DATABASE_REQUIRED");
  }
  const db = new SQL(url, { max: 1, connectionTimeout: 15 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET LOCAL lock_timeout = '5s'");
      await tx.unsafe(`LOCK TABLE public.pilot_instrument_publications,
        commerce_private.order_publications, commerce_private.checkout_releases,
        public.service_identities, public.service_identity_scopes,
        identity_private.mobile_invitation_policies IN SHARE ROW EXCLUSIVE MODE`);
      const baseline = await tx.unsafe(`SELECT
        (SELECT count(*) FROM public.pilot_instrument_publications)::int AS instruments,
        (SELECT count(*) FROM commerce_private.order_publications)::int AS terms,
        (SELECT count(*) FROM commerce_private.checkout_releases)::int AS releases,
        (SELECT count(*) FROM public.service_identities)::int AS services,
        (SELECT count(*) FROM identity_private.mobile_invitation_policies)::int AS policies,
        (SELECT count(*) FROM public.client_profiles)::int AS clients,
        (SELECT count(*) FROM commerce_private.checkout_intents)::int AS intents,
        (SELECT count(*) FROM auth.users)::int AS auth_users`);
      if (Object.entries(baseline[0]).some(([key, value]) => key !== "auth_users" && value !== 0)) {
        throw new Error("EMPTY_PREPARATION_BASELINE_REQUIRED");
      }
      const authority = await tx.unsafe(
        `SELECT 1 FROM public.tenants t, public.subjects s
        JOIN public.subject_contacts c ON c.subject_id=s.id
        WHERE t.id=$1 AND t.slug='meneer-pilot' AND t.status='active'
        AND s.id=$2 AND s.status='active' AND c.kind='email'
        AND c.normalized_value='mansoer@meneerhealth.co.za' AND c.status='verified'`,
        [tenantId, approverId],
      );
      if (authority.length !== 1) throw new Error("RECORDED_OWNER_NOT_VERIFIED");
      const approval = randomUUID();
      for (const [index, instrumentId] of [
        "pilot-account-terms",
        "pilot-privacy-notice",
      ].entries()) {
        await tx.unsafe(
          `INSERT INTO public.pilot_instrument_publications
          (instrument_id,instrument_version,document_body,content_sha256,rendered_locator,
           approval_reference,approved_by_subject_id,approved_at,effective_at)
          VALUES($1,'1.0',$2,$3,'/account/activate',$4,$5,now(),now())`,
          [
            instrumentId,
            bodies[index],
            hashes[index],
            `owner-approval-2026-10-09:${approval}`,
            approverId,
          ],
        );
      }
      await tx.unsafe(
        `INSERT INTO commerce_private.order_publications
        (tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,
         effective_at,expires_at,status)
        VALUES($1,'review_deposit','1.0.0',$2,$3,$4,$5,now(),now()+interval '30 days','published')`,
        [
          tenantId,
          "OCTOTHORP ZA; Octothorp LLC payment collector, trading as Meneer Health",
          bodies[2],
          hashes[2],
          approval,
        ],
      );
      const serviceId = randomUUID();
      await tx.unsafe(
        `INSERT INTO public.service_identities
        (id,tenant_id,name,environment,purpose,status,expires_at)
        VALUES($1,$2,'meneer-live-payment-webhook','production','operations','suspended',
          now()+interval '30 days')`,
        [serviceId, tenantId],
      );
      await tx.unsafe(
        `INSERT INTO public.service_identity_scopes
        (service_identity_id,resource,action) VALUES($1,'payment','append'),($1,'payment','update')`,
        [serviceId],
      );
      await tx.unsafe(
        `INSERT INTO commerce_private.checkout_releases
        (tenant_id,provider_account_id,approval_reference,expires_at,enabled,payment_environment)
        VALUES($1,$2,$3,now()+interval '24 hours',false,'live')`,
        [tenantId, accountId, approval],
      );
      await tx.unsafe(
        `INSERT INTO identity_private.mobile_invitation_policies
        (tenant_id,daily_reservation_limit,sending_enabled,delivery_ready,daily_usd_micros)
        VALUES($1,9,false,false,5000000)`,
        [tenantId],
      );
      const after = await tx.unsafe(`SELECT
        (SELECT count(*) FROM auth.users)::int AS auth_users,
        (SELECT count(*) FROM public.client_profiles)::int AS clients,
        (SELECT count(*) FROM commerce_private.checkout_intents)::int AS intents`);
      if (
        after[0].auth_users !== baseline[0].auth_users ||
        after[0].clients !== 0 ||
        after[0].intents !== 0
      ) {
        throw new Error("UNRELATED_BASELINE_CHANGED");
      }
      if (process.argv.includes("--rollback")) {
        throw new Error("PILOT_PREPARATION_ROLLBACK_ONLY");
      }
      return {
        prepared: true,
        tenantId,
        serviceId,
        approval,
        hashes,
        checkoutEnabled: false,
        webhookAuthorityActive: false,
        smsEnabled: false,
      };
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    if (error instanceof Error && error.message === "PILOT_PREPARATION_ROLLBACK_ONLY") {
      const restored = await db.unsafe(`SELECT
        (SELECT count(*) FROM public.pilot_instrument_publications)::int AS instruments,
        (SELECT count(*) FROM commerce_private.order_publications)::int AS terms,
        (SELECT count(*) FROM commerce_private.checkout_releases)::int AS releases,
        (SELECT count(*) FROM public.service_identities)::int AS services,
        (SELECT count(*) FROM identity_private.mobile_invitation_policies)::int AS policies`);
      if (Object.values(restored[0]).some((value) => value !== 0)) {
        throw new Error("PREPARATION_ROLLBACK_BASELINE_CHANGED");
      }
      console.log(JSON.stringify({ rollbackValidated: true, baselineRestored: true, hashes }));
    } else {
      console.error("PILOT_PREPARATION_FAILED; transaction rolled back, no provider operation.");
      process.exitCode = 1;
    }
  } finally {
    await db.close();
  }
}
