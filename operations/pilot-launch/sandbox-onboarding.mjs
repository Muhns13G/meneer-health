// Drives only the expressly approved disposable operator and single controlled SMS.
import { spawnSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { SQL } from "bun";
import { createClient } from "@supabase/supabase-js";
import { sandboxCleanupSql } from "./sandbox-cleanup.mjs";

const origin = "https://meneerhealth.co.za";
const manifestPath = new URL("../../.pilot-sandbox-rehearsal.local", import.meta.url);
function invariant(value, code) {
  if (!value) throw new Error(code);
}
const send = process.argv.includes("--send");
if (!send) {
  console.log(JSON.stringify({ mode: "no-network-plan", maximumSms: 1, charges: 0 }));
} else {
  invariant(
    !process.env.CI &&
      process.env.PILOT_SANDBOX_CONFIRM === "isolated-one-sms-test-capture-refund-cleanup" &&
      process.env.SUPABASE_URL === "https://gibfpolrdjotwvewgfsz.supabase.co" &&
      process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz") &&
      process.env.SUPABASE_SECRET_KEY,
    "ONBOARDING_GUARD_REJECTED",
  );
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  invariant(
    m.task === "pilot-isolated-sandbox-acceptance" &&
      m.fixturesCreated &&
      !m.dispatched &&
      m.maximumSms === 1 &&
      m.account === "acct_1U32UbFfj16Nnr1i",
    "ONBOARDING_MANIFEST_SCOPE_REJECTED",
  );
  const save = () =>
    writeFileSync(manifestPath, JSON.stringify(m, null, 2) + "\n", { mode: 0o600 });
  const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  function active() {
    const r = spawnSync(
      "bunx",
      ["wrangler", "deployments", "list", "--name", "meneer-health", "--json"],
      { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] },
    );
    invariant(r.status === 0, "DEPLOYMENT_READ_FAILED");
    const v = JSON.parse(r.stdout).at(-1)?.versions;
    invariant(
      v?.length === 1 && v[0].percentage === 100 && v[0].version_id === m.configurationVersion,
      "REHEARSAL_VERSION_NOT_ACTIVE",
    );
  }
  function cookie(r) {
    const h = r.headers.get("set-cookie") ?? "";
    invariant(
      h.includes("HttpOnly") && h.includes("Secure") && h.includes("SameSite=Strict"),
      "STAFF_COOKIE_SECURITY_MISSING",
    );
    const value = h.match(/__Host-meneer-workforce=([^;]+)/)?.[1];
    invariant(value, "STAFF_COOKIE_MISSING");
    return `__Host-meneer-workforce=${value}`;
  }
  async function request(path, fields, cookieValue = "") {
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
  function totp(secret) {
    let bits = "";
    for (const c of secret.replaceAll("=", "").toUpperCase()) {
      const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
      invariant(n >= 0, "FACTOR_INVALID");
      bits += n.toString(2).padStart(5, "0");
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
    return ((digest.readUInt32BE(digest[digest.length - 1] & 15) & 0x7fffffff) % 1000000)
      .toString()
      .padStart(6, "0");
  }
  try {
    active();
    const release = await db.unsafe(
      "SELECT 1 FROM commerce_private.checkout_releases WHERE tenant_id=$1 AND payment_environment='sandbox' AND enabled AND expires_at>now()",
      [m.tenant],
    );
    invariant(release.length === 1, "TEST_AUTHORITY_EXPIRED");
    m.operatorEmail ??= `pilot-sandbox-${m.tenant}@example.invalid`;
    save();
    if (!m.operatorAuth) {
      const existing = await db.unsafe("SELECT id FROM auth.users WHERE email=$1", [
        m.operatorEmail,
      ]);
      invariant(existing.length === 0, "UNMANIFESTED_OPERATOR_EXISTS");
      const created = await admin.auth.admin.createUser({
        email: m.operatorEmail,
        email_confirm: true,
      });
      invariant(!created.error && created.data.user, "SYNTHETIC_OPERATOR_CREATION_FAILED");
      m.operatorAuth = created.data.user.id;
      m.fixtureAuthIds = [m.operatorAuth];
      m.fixtureRoots.push(m.operatorAuth);
      save();
    }
    const subjects = await db.unsafe(
      "SELECT subject_id FROM public.external_identities WHERE provider='supabase' AND provider_subject=$1",
      [m.operatorAuth],
    );
    invariant(subjects.length === 1, "OPERATOR_SUBJECT_MISSING");
    m.operatorSubject = subjects[0].subject_id;
    if (!m.fixtureRoots.includes(m.operatorSubject)) m.fixtureRoots.push(m.operatorSubject);
    save();
    if (!m.operatorMembershipCreated) {
      await db.begin(async (tx) => {
        await tx.unsafe(
          `INSERT INTO public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
          VALUES($1,$2,'operations','active',now()-interval '1 minute',now()+interval '3 hours',$3)`,
          [m.tenant, m.operatorSubject, m.fixtureIds.approver],
        );
        await tx.unsafe(
          `INSERT INTO public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
          VALUES($1,$2,'identity_contact',$1,'operations','active',now()-interval '1 minute',now()+interval '3 hours')`,
          [m.tenant, m.operatorSubject],
        );
      });
      m.operatorMembershipCreated = true;
      save();
    }
    // Before any SMS, prove removal of current prerequisites/operator rows would preserve
    // the original real baseline. Rollback retains the test rows; no provider user is deleted.
    try {
      await db.begin(async (tx) => {
        await tx.unsafe("SET LOCAL lock_timeout='5s'");
        await tx.unsafe(sandboxCleanupSql(m));
        throw new Error("SCOPED_ROLLBACK_PASSED");
      });
    } catch (error) {
      invariant(
        error instanceof Error && error.message === "SCOPED_ROLLBACK_PASSED",
        "OPERATOR_CLEANUP_VALIDATION_FAILED",
      );
    }
    m.operatorCleanupRollbackPassed = true;
    save();
    const generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: m.operatorEmail,
    });
    invariant(
      !generated.error && generated.data.user.id === m.operatorAuth,
      "OPERATOR_CODE_FAILED",
    );
    const signed = await request("/staff/sign-in", {
      action: "verify",
      email: m.operatorEmail,
      code: generated.data.properties.email_otp,
    });
    invariant(signed.status === 200, `STAFF_SIGNIN_FAILED`);
    let staffCookie = cookie(signed);
    const body = await signed.json();
    if (body.enrollment?.secret) {
      m.operatorTotpSecret = body.enrollment.secret;
      save();
    }
    invariant(m.operatorTotpSecret, "DISPOSABLE_FACTOR_UNAVAILABLE");
    const denied = await request("/staff/mobile-invitations/read", { afterId: "" }, staffCookie);
    invariant(denied.status === 401, "EMAIL_ONLY_ACCESS_NOT_DENIED");
    const mfa = await request("/staff/mfa", { code: totp(m.operatorTotpSecret) }, staffCookie);
    invariant(mfa.status === 204, "STAFF_TOTP_FAILED");
    staffCookie = cookie(mfa);
    m.staffCookie = staffCookie;
    m.genuineAal2 = true;
    m.emailOnlyDenied = true;
    save();
    active();
    if (!m.mobileInvitationId) {
      const created = await request(
        "/staff/mobile-invitations/command",
        {
          action: "create",
          requestKey: randomUUID(),
          givenName: "Synthetic",
          familyName: "Pilot",
          phone: "+27836893650",
          provenanceReference: randomUUID(),
          contactAuthorityReference: randomUUID(),
        },
        staffCookie,
      );
      invariant(created.status === 200, "INVITATION_CREATE_FAILED");
      m.mobileInvitationId = (await created.json()).invitationId;
      invariant(/^[a-f0-9-]{36}$/.test(m.mobileInvitationId ?? ""), "INVITATION_ID_INVALID");
      m.fixtureRoots.push(m.mobileInvitationId);
      save();
    }
    for (const action of ["review", "send"]) {
      const key = randomUUID();
      const r = await request(
        "/staff/mobile-invitations/command",
        { action, requestKey: key, invitationId: m.mobileInvitationId, expectedVersion: "1" },
        staffCookie,
      );
      invariant(r.status === 200, "INVITATION_RESERVATION_FAILED");
      if (action === "send") m.reservationRequestKey = key;
      save();
    }
    m.dispatched = true;
    m.stage = "dispatch-attempted";
    save(); // BEFORE network; no uncertainty retry.
    const dispatch = await request(
      "/staff/mobile-invitations/dispatch",
      {
        invitationId: m.mobileInvitationId,
        expectedVersion: "1",
        reservationRequestKey: m.reservationRequestKey,
      },
      staffCookie,
    );
    m.dispatchStatus = dispatch.status;
    m.dispatchResult = await dispatch.json();
    m.stage = "sms-dispatch-returned";
    save();
    console.log(
      JSON.stringify({
        stage: m.stage,
        genuineAal2: m.genuineAal2,
        emailOnlyDenied: m.emailOnlyDenied,
        httpStatus: m.dispatchStatus,
        outcome: m.dispatchResult.outcome,
        smsAttempts: 1,
        charges: 0,
      }),
    );
  } catch (error) {
    const reason =
      error instanceof Error && /^[A-Z_]{8,80}$/.test(error.message)
        ? error.message
        : "PROVIDER_OR_DATABASE_FAILURE";
    console.error(
      `SANDBOX_ONBOARDING_STOPPED: ${reason}; private manifest retained, do not resend blindly.`,
    );
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}
