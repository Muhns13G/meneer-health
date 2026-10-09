// Approved pilot configuration preparation; sends nothing and never deploys a Worker.
import { SQL } from "bun";

const tenant = "80000000-0000-4000-8000-000000000001";
const service = "c7a04672-992e-44fe-918b-76209f974adb";
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      tenant,
      service,
      sends: 0,
      charges: 0,
      deployment: false,
      reservationBudgetUsd: 5,
      dailyAttempts: 9,
      perMessageReservationUsd: 0.5,
    }),
  );
} else {
  if (
    process.env.PILOT_RELEASE_CONFIRM !== "approved-pilot-preparation-no-send-no-charge" ||
    !process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz") ||
    process.env.TELNYX_MESSAGING_PROFILE_ID !== "40019e2b-9dc8-43bf-a32f-9a4c4786e836" ||
    process.env.TELNYX_FROM_NUMBER !== "+15127377491" ||
    process.env.TELNYX_ALPHA_SENDER !== "Octothorp"
  )
    throw new Error("RELEASE_GUARD_REJECTED");
  const profile = await fetch(
    `https://api.telnyx.com/v2/messaging_profiles/${process.env.TELNYX_MESSAGING_PROFILE_ID}`,
    {
      headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!profile.ok) throw new Error("SENDER_PREFLIGHT_FAILED");
  const { data } = await profile.json();
  if (
    data.id !== process.env.TELNYX_MESSAGING_PROFILE_ID ||
    data.alpha_sender !== "Octothorp" ||
    !data.whitelisted_destinations?.includes("ZA")
  )
    throw new Error("SENDER_CONFIGURATION_CHANGED");
  const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
  try {
    await db.begin(async (tx) => {
      await tx.unsafe("SET LOCAL lock_timeout='5s'");
      await tx.unsafe(
        "LOCK TABLE commerce_private.checkout_releases, public.service_identities, identity_private.mobile_invitation_policies IN SHARE ROW EXCLUSIVE MODE",
      );
      const checks = await tx.unsafe(
        `SELECT
        (SELECT count(*) FROM public.client_profiles)::int AS clients,
        (SELECT count(*) FROM commerce_private.checkout_intents)::int AS checkouts,
        (SELECT count(*) FROM public.pilot_instrument_publications)::int AS instruments,
        (SELECT count(*) FROM intake_private.publications WHERE tenant_id=$1 AND status='published' AND expires_at>now() AND transfer_notice IS NULL)::int AS intake,
        (SELECT count(*) FROM commerce_private.order_publications WHERE tenant_id=$1 AND scenario='review_deposit' AND status='published' AND expires_at>now())::int AS terms`,
        [tenant],
      );
      if (
        checks[0].clients !== 0 ||
        checks[0].checkouts !== 0 ||
        checks[0].instruments !== 2 ||
        checks[0].intake !== 1 ||
        checks[0].terms !== 1
      )
        throw new Error("RELEASE_BASELINE_CHANGED");
      const updated = await tx.unsafe(
        `UPDATE public.service_identities SET status='active'
        WHERE id=$1 AND tenant_id=$2 AND status='suspended' AND expires_at>now() RETURNING id`,
        [service, tenant],
      );
      if (updated.length !== 1) throw new Error("SERVICE_BASELINE_CHANGED");
      const release = await tx.unsafe(
        `UPDATE commerce_private.checkout_releases SET enabled=true
        WHERE tenant_id=$1 AND provider_account_id='acct_1U32SWCBswMrhhx4' AND payment_environment='live'
        AND enabled=false AND expires_at>now() RETURNING expires_at`,
        [tenant],
      );
      if (release.length !== 1) throw new Error("CHECKOUT_RELEASE_CHANGED");
      const policy = await tx.unsafe(
        `UPDATE identity_private.mobile_invitation_policies SET
        provider_profile_id=$2,from_phone=$3,per_segment_usd_micros=250000,
        per_message_usd_micros=500000,daily_usd_micros=5000000,daily_reservation_limit=9,
        delivery_ready=true,sending_enabled=true
        WHERE tenant_id=$1 AND sending_enabled=false AND delivery_ready=false RETURNING tenant_id`,
        [tenant, process.env.TELNYX_MESSAGING_PROFILE_ID, process.env.TELNYX_FROM_NUMBER],
      );
      if (policy.length !== 1) throw new Error("SMS_POLICY_CHANGED");
      if (process.argv.includes("--rollback")) throw new Error("RELEASE_ROLLBACK_ONLY");
    });
    console.log(
      JSON.stringify({ databaseReleaseReady: true, workerDeployment: false, sends: 0, charges: 0 }),
    );
  } catch (error) {
    if (error instanceof Error && error.message === "RELEASE_ROLLBACK_ONLY") {
      console.log(JSON.stringify({ rollbackValidated: true, sends: 0, charges: 0 }));
    } else {
      console.error("RELEASE_PREPARATION_FAILED; transaction rolled back.");
      process.exitCode = 1;
    }
  } finally {
    await db.close();
  }
}
