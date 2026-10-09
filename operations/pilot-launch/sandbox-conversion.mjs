// Actual controlled-mailbox mobile conversion. No generated contact proof or seeded client.
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { SQL } from "bun";
import { sandboxCleanupSql } from "./sandbox-cleanup.mjs";

const manifestPath = new URL("../../.pilot-sandbox-rehearsal.local", import.meta.url);
const origin = "https://meneerhealth.co.za";
function invariant(value, code) {
  if (!value) throw new Error(code);
}
const requestCode = process.argv.includes("--request-code");
const verify = process.argv.includes("--verify");
if (!requestCode && !verify) {
  console.log(JSON.stringify({ mode: "no-network-plan", sms: 0, charges: 0 }));
} else {
  invariant(
    !process.env.CI &&
      process.env.PILOT_SANDBOX_CONFIRM === "isolated-one-sms-test-capture-refund-cleanup" &&
      process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz"),
    "CONVERSION_GUARD_REJECTED",
  );
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  invariant(
    m.task === "pilot-isolated-sandbox-acceptance" &&
      m.dispatched &&
      m.dispatchResult?.outcome === "accepted" &&
      !m.converted,
    "CONVERSION_SCOPE_REJECTED",
  );
  const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
  const save = () =>
    writeFileSync(manifestPath, JSON.stringify(m, null, 2) + "\n", { mode: 0o600 });
  const cookie = (r, name) => {
    const h = r.headers.get("set-cookie") ?? "";
    invariant(
      h.includes("HttpOnly") && h.includes("Secure") && h.includes("SameSite=Strict"),
      "COOKIE_SECURITY_MISSING",
    );
    const v = h.match(new RegExp(name + "=([^;]+)"))?.[1];
    invariant(v, "COOKIE_MISSING");
    return name + "=" + v;
  };
  async function post(path, fields, cookieValue = "") {
    return fetch(origin + path, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: origin,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/x-www-form-urlencoded",
        ...(cookieValue ? { Cookie: cookieValue } : {}),
      },
      body: new URLSearchParams(fields),
      signal: AbortSignal.timeout(30000),
    });
  }
  try {
    if (requestCode) {
      invariant(
        !m.emailAttempted && process.env.PILOT_SMS_RECEIPT_CONFIRM === "received-page-loaded",
        "MAIL_SEND_SCOPE_REJECTED",
      );
      invariant(
        (await db.unsafe("SELECT id FROM auth.users WHERE email='support@meneerhealth.co.za'"))
          .length === 0,
        "CONTROLLED_MAILBOX_IDENTITY_ALREADY_EXISTS",
      );
      const messages = await db.unsafe(
        "SELECT provider_message_id FROM identity_private.mobile_invitation_delivery_intents WHERE invitation_id=$1",
        [m.mobileInvitationId],
      );
      invariant(messages.length === 1, "MESSAGE_BINDING_INVALID");
      const r = await fetch(
        "https://api.telnyx.com/v2/messages/" + messages[0].provider_message_id,
        {
          headers: { Authorization: "Bearer " + process.env.TELNYX_API_KEY },
          signal: AbortSignal.timeout(15000),
        },
      );
      invariant(r.ok, "MESSAGE_READ_FAILED");
      const { data } = await r.json();
      invariant(data.to?.[0]?.status === "delivered", "SMS_NOT_DELIVERED");
      const token = data.text?.match(/\/mobile-invitation#([A-Za-z0-9_-]{43})\./)?.[1];
      invariant(token, "INVITATION_BEARER_INVALID");
      m.handsetReceiptConfirmed = true;
      m.providerDisposition = "delivered";
      m.providerCost = data.cost;
      m.claimRequestKey = randomUUID();
      save();
      const claimed = await post("/mobile-invitation/redeem", {
        token,
        requestKey: m.claimRequestKey,
      });
      invariant(claimed.status === 200, "CLAIM_EXCHANGE_FAILED");
      const claim = await claimed.json();
      invariant(claim.status !== "unavailable", "CLAIM_UNAVAILABLE");
      m.claimCookie = cookie(claimed, "__Host-meneer-mobile-claim");
      save();
      const bound = await post(
        "/mobile-invitation/bind",
        { email: "support@meneerhealth.co.za" },
        m.claimCookie,
      );
      invariant(
        bound.status === 200 && (await bound.json()).emailBound === true,
        "EMAIL_BIND_FAILED",
      );
      m.emailAttempted = true;
      m.stage = "email-request-attempted";
      save();
      const email = await post("/mobile-invitation/email", {}, m.claimCookie);
      invariant(
        email.status === 200 && (await email.json()).status === "code-requested",
        "EMAIL_REQUEST_FAILED",
      );
      const users = await db.unsafe(
        "SELECT id FROM auth.users WHERE email='support@meneerhealth.co.za' AND created_at>$1",
        [m.createdAt],
      );
      invariant(users.length === 1, "PARTICIPANT_IDENTITY_SCOPE_INVALID");
      m.participantAuth = users[0].id;
      const subjects = await db.unsafe(
        "SELECT subject_id FROM public.external_identities WHERE provider='supabase' AND provider_subject=$1",
        [m.participantAuth],
      );
      invariant(subjects.length === 1, "PARTICIPANT_SUBJECT_MISSING");
      m.participantSubject = subjects[0].subject_id;
      m.fixtureAuthIds.push(m.participantAuth);
      m.fixtureRoots.push(m.participantAuth, m.participantSubject);
      m.stage = "awaiting-mailbox-code";
      save();
      // Rollback-only removal proof now includes the actual provider-created test participant.
      try {
        await db.begin(async (tx) => {
          await tx.unsafe("SET LOCAL lock_timeout='5s'");
          await tx.unsafe(sandboxCleanupSql(m));
          throw new Error("SCOPED_ROLLBACK_PASSED");
        });
      } catch (error) {
        invariant(
          error instanceof Error && error.message === "SCOPED_ROLLBACK_PASSED",
          "PARTICIPANT_CLEANUP_VALIDATION_FAILED",
        );
      }
      console.log(
        JSON.stringify({
          stage: m.stage,
          smsDelivered: true,
          emailRequested: true,
          actualReceiptNeedsOwnerConfirmation: true,
          smsAttempts: 1,
          charges: 0,
        }),
      );
    } else {
      invariant(m.stage === "awaiting-mailbox-code" && m.claimCookie, "OTP_VERIFICATION_NOT_READY");
      const code = readFileSync(0, "utf8").trim();
      invariant(/^\d{6}$/.test(code), "CODE_INPUT_INVALID");
      const checked = await post("/mobile-invitation/verify", { code }, m.claimCookie);
      invariant(
        checked.status === 200 && (await checked.json()).status === "verified",
        "MAILBOX_VERIFICATION_FAILED",
      );
      m.activationCookie = cookie(checked, "__Host-meneer-preactivation");
      save();
      const view = await fetch(origin + "/account/activate/instruments", {
        headers: { Cookie: m.activationCookie },
        signal: AbortSignal.timeout(30000),
      });
      invariant(view.status === 200, "DOCUMENT_PREPARE_FAILED");
      const { documents } = await view.json();
      invariant(documents?.length === 2, "DOCUMENT_COUNT_INVALID");
      const terms = documents.find((d) => d.instrumentId === "pilot-account-terms");
      const privacy = documents.find((d) => d.instrumentId === "pilot-privacy-notice");
      invariant(terms && privacy, "DOCUMENT_MAPPING_MISSING");
      const key = randomUUID();
      m.activationRequestKey = key;
      save();
      const activated = await fetch(origin + "/account/activate", {
        method: "POST",
        redirect: "manual",
        headers: {
          Origin: origin,
          Cookie: m.activationCookie,
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({
          givenName: "Synthetic",
          familyName: "Pilot",
          mobileE164: "+27836893650",
          contactPreference: "email",
          termsPublicationId: terms.publicationId,
          termsHash: terms.contentHash,
          privacyPublicationId: privacy.publicationId,
          privacyHash: privacy.contentHash,
          termsAccepted: true,
          privacyAcknowledged: true,
          requestKey: key,
        }),
        signal: AbortSignal.timeout(30000),
      });
      invariant(activated.status === 204, "ACCOUNT_ACTIVATION_FAILED");
      const proof = await db.unsafe(
        `SELECT
        (SELECT status FROM identity_private.mobile_invitations WHERE id=$1) invitation,
        (SELECT count(*) FROM public.client_profiles WHERE tenant_id=$2)::int profiles,
        (SELECT count(*) FROM public.pilot_instrument_receipts WHERE tenant_id=$2)::int receipts`,
        [m.mobileInvitationId, m.tenant],
      );
      invariant(
        proof[0].invitation === "converted" && proof[0].profiles === 1 && proof[0].receipts === 2,
        "ATOMIC_CONVERSION_NOT_CONFIRMED",
      );
      m.converted = true;
      m.mailboxVerified = true;
      m.stage = "account-converted";
      save();
      console.log(
        JSON.stringify({
          stage: m.stage,
          mailboxVerified: true,
          profiles: 1,
          documentReceipts: 2,
          smsAttempts: 1,
          charges: 0,
        }),
      );
    }
  } catch (error) {
    const reason =
      error instanceof Error && /^[A-Z_]{8,80}$/.test(error.message)
        ? error.message
        : "PROVIDER_OR_DATABASE_FAILURE";
    console.error(`SANDBOX_CONVERSION_STOPPED: ${reason}; retain the private manifest.`);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}
