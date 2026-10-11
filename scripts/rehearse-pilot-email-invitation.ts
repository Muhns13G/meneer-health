import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Owner-approved, one-mailbox acceptance only. Never CI or a general cohort send tool.
const origin = "https://meneerhealth.co.za";
const project = "gibfpolrdjotwvewgfsz";
const realTenant = "80000000-0000-4000-8000-000000000001";
let tenant = realTenant;
const recipient = "support@meneerhealth.co.za";
const manifestPath = ".pilot-email-rehearsal.local";
function check(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
check(
  !process.env.CI &&
    process.env.PILOT_EMAIL_REHEARSAL_CONFIRM === "one-support-email-disposable-fixtures" &&
    process.env.SUPABASE_URL === `https://${project}.supabase.co` &&
    process.env.SUPABASE_SECRET_KEY &&
    readFileSync("supabase/.temp/project-ref", "utf8").trim() === project,
  "EMAIL_REHEARSAL_TARGET_REJECTED",
);
const mode = process.argv[2] ?? "status";
check(
  ["prepare", "send", "status", "cleanup", "cleanup-check"].includes(mode),
  "EMAIL_REHEARSAL_MODE_REJECTED",
);
type Manifest = {
  task: "pilot-email-fallback";
  stage: string;
  operatorEmail: string;
  approver: string;
  operatorAuth?: string;
  operatorSubject?: string;
  invitation?: string;
  requestKey: string;
  originalAuthIds: string[];
  proof: Record<string, unknown>;
  tenant?: string;
  preparedVersion?: string;
};
const management = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
check(management.startsWith("sbp_"), "EMAIL_REHEARSAL_MANAGEMENT_UNAVAILABLE");
async function sql(query: string, readOnly = true): Promise<Record<string, unknown>[]> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${management}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(30000),
  });
  check(r.ok, `EMAIL_REHEARSAL_SQL_${r.status}`);
  return r.json();
}
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
let manifest: Manifest;
function save(stage: string) {
  manifest.stage = stage;
  writeFileSync(manifestPath, JSON.stringify(manifest), { mode: 0o600 });
}
function uuid(value: unknown): string {
  check(typeof value === "string" && /^[a-f0-9-]{36}$/.test(value), "FIXTURE_ID_INVALID");
  return value;
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    check(n >= 0, "SYNTHETIC_TOTP_SECRET_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((hash.readUInt32BE(hash[hash.length - 1]! & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
let cookie = "";
async function post(path: string, fields: Record<string, string>) {
  const r = await fetch(origin + path, {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(30000),
  });
  check(r.headers.get("cache-control")?.includes("no-store"), "HOSTED_NO_STORE_MISSING");
  const setCookie = r.headers.get("set-cookie");
  if (setCookie) {
    check(
      setCookie.includes("Secure") &&
        setCookie.includes("HttpOnly") &&
        setCookie.includes("SameSite=Strict"),
      "HOSTED_COOKIE_ATTRIBUTES_INVALID",
    );
    cookie = setCookie.split(";", 1)[0]!;
  }
  return r;
}

if (mode === "prepare") {
  check(
    !existsSync(manifestPath) || JSON.parse(readFileSync(manifestPath, "utf8")).stage === "cleaned",
    "PRIOR_EMAIL_REHEARSAL_REQUIRES_RECONCILIATION",
  );
  tenant = randomUUID();
  manifest = {
    task: "pilot-email-fallback",
    stage: "preparing-isolated-tenant",
    tenant,
    operatorEmail: `email-fallback-${randomUUID()}@example.invalid`,
    approver: randomUUID(),
    requestKey: randomUUID(),
    originalAuthIds: (await sql("select id::text from auth.users order by id")).map((r) =>
      uuid(r.id),
    ),
    proof: {},
  };
  save(manifest.stage);
  await sql(
    `begin;
    insert into public.tenants(id,slug,display_name,status) values('${tenant}','email-fallback-${tenant}','Synthetic email fallback rehearsal','active');
    insert into identity_private.mobile_invitation_policies(tenant_id,email_delivery_enabled) values('${tenant}',true);
    commit;`,
    false,
  );
  save("isolated-tenant-created");
  const output = execFileSync(
    "bunx",
    [
      "wrangler",
      "versions",
      "secret",
      "bulk",
      "--name",
      "meneer-health",
      "--message",
      "Isolated support-mailbox email acceptance - owner promotion required",
    ],
    {
      input: JSON.stringify({
        MOBILE_INVITATIONS_TENANT_ID: tenant,
        MOBILE_INVITATIONS_MODE: "disabled",
        MOBILE_INVITATIONS_DELIVERY_READY: "false",
        MOBILE_INVITATIONS_WEBHOOK_MODE: "disabled",
      }),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  manifest.preparedVersion = uuid(output.match(/Created version ([a-f0-9-]{36})/)?.[1]);
  save("prepared-owner-promotion-required");
  console.log(
    JSON.stringify({
      exercise: manifest.task,
      isolatedVersion: manifest.preparedVersion,
      restorationVersion: "27e6dcb5-957f-4e52-a6e8-db1785e680bd",
      emailsSent: 0,
    }),
  );
  process.exit(0);
}
if (mode === "status" || mode === "cleanup" || mode === "cleanup-check") {
  check(existsSync(manifestPath), "EMAIL_REHEARSAL_MANIFEST_MISSING");
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  check(manifest.task === "pilot-email-fallback", "EMAIL_REHEARSAL_MANIFEST_INVALID");
  tenant = manifest.tenant ? uuid(manifest.tenant) : realTenant;
  if (mode === "cleanup" || mode === "cleanup-check") {
    const roots = [
      manifest.approver,
      manifest.operatorAuth,
      manifest.operatorSubject,
      manifest.invitation,
      manifest.requestKey,
    ]
      .filter((id): id is string => Boolean(id))
      .map(uuid);
    if (manifest.tenant) roots.push(uuid(manifest.tenant));
    const providerIds = manifest.operatorAuth ? [uuid(manifest.operatorAuth)] : [];
    if (manifest.invitation) {
      const linked =
        await sql(`select e.email_invitation_id::text,r.provider_subject_id::text,r.subject_id::text
        from identity_private.mobile_email_exchanges e
        left join identity_private.mobile_identity_creation_receipts r on r.email_invitation_id=e.email_invitation_id
        where e.mobile_invitation_id='${uuid(manifest.invitation)}' and e.tenant_id='${tenant}'`);
      for (const row of linked) {
        for (const key of ["email_invitation_id", "provider_subject_id", "subject_id"])
          if (row[key]) roots.push(uuid(row[key]));
        if (row.provider_subject_id) providerIds.push(uuid(row.provider_subject_id));
      }
    }
    check(
      !roots.includes(realTenant) &&
        !providerIds.some((id) => manifest.originalAuthIds.includes(id)),
      "CLEANUP_REAL_ROOT_REJECTED",
    );
    const source = readFileSync("scripts/sql/pilot-email-rehearsal-cleanup.sql", "utf8");
    if (mode === "cleanup-check") {
      await sql(
        source
          .replace("{{roots}}", JSON.stringify(roots))
          .replaceAll(
            "{{isolated_tenant}}",
            manifest.tenant ?? "00000000-0000-0000-0000-000000000000",
          )
          .replace("commit;", "rollback;"),
        false,
      );
      console.log(
        JSON.stringify({
          exercise: manifest.task,
          scopedCleanupDryRunPassed: true,
          changesCommitted: false,
        }),
      );
      process.exit(0);
    }
    save("cleanup-started");
    await sql(
      source
        .replace("{{roots}}", JSON.stringify(roots))
        .replaceAll(
          "{{isolated_tenant}}",
          manifest.tenant ?? "00000000-0000-0000-0000-000000000000",
        ),
      false,
    );
    for (const id of providerIds) {
      // These are exact manifested/newly captured creation-provenance identities only.
      await sql(`delete from auth.sessions where user_id='${id}'`, false);
      const removed = await admin.auth.admin.deleteUser(id);
      check(!removed.error, "EXACT_AUTH_CLEANUP_FAILED");
    }
    const remaining = new Set(
      (await sql("select id::text from auth.users")).map((r) => String(r.id)),
    );
    check(
      manifest.originalAuthIds.every((id) => remaining.has(id)) &&
        providerIds.every((id) => !remaining.has(id)),
      "AUTH_CLEANUP_READBACK_FAILED",
    );
    manifest.proof.scopedCleanupVerified = true;
    save("cleaned");
    console.log(
      JSON.stringify({
        exercise: manifest.task,
        scopedCleanupVerified: true,
        originalAccountsPreserved: true,
      }),
    );
    process.exit(0);
  }
  if (manifest.invitation) {
    const rows = await sql(`select i.status,a.state as email_state,
      (select count(*)::int from identity_private.mobile_invitation_claims c where c.invitation_id=i.id) claims,
      (select count(*)::int from public.client_profiles p where p.subject_id=i.converted_subject_id) profiles,
      (select count(*)::int from public.pilot_instrument_receipts r where r.subject_id=i.converted_subject_id) document_receipts
      from identity_private.mobile_invitations i
      left join identity_private.pilot_email_invitation_attempts a on a.invitation_id=i.id
      where i.id='${uuid(manifest.invitation)}' and i.tenant_id='${tenant}'`);
    console.log(JSON.stringify({ exercise: manifest.task, stage: manifest.stage, rows }));
  }
} else {
  check(existsSync(manifestPath), "ISOLATED_REHEARSAL_PREPARATION_REQUIRED");
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  check(
    manifest.task === "pilot-email-fallback" &&
      manifest.stage === "prepared-owner-promotion-required",
    "PRIOR_EMAIL_REHEARSAL_REQUIRES_RECONCILIATION",
  );
  tenant = uuid(manifest.tenant);
  check(tenant !== realTenant, "REAL_PILOT_FIXTURE_REJECTED");
  const current = JSON.parse(
    execFileSync("bunx", ["wrangler", "deployments", "list", "--name", "meneer-health", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  ).at(-1)?.versions;
  check(
    current?.length === 1 &&
      current[0]?.version_id === manifest.preparedVersion &&
      current[0]?.percentage === 100,
    "APPROVED_WORKER_VERSION_NOT_ACTIVE",
  );
  check(
    (await sql(`select id from auth.users where lower(email)='${recipient}'`)).length === 0,
    "TEST_MAILBOX_ALREADY_HAS_ACCOUNT",
  );
  save("creating-disposable-operator");
  try {
    const created = await admin.auth.admin.createUser({
      email: manifest.operatorEmail,
      email_confirm: true,
    });
    check(!created.error && created.data.user, "SYNTHETIC_OPERATOR_CREATION_FAILED");
    manifest.operatorAuth = uuid(created.data.user.id);
    save("operator-created");
    manifest.operatorSubject = uuid(
      (
        await sql(
          `select subject_id::text from public.external_identities where provider='supabase' and provider_subject='${manifest.operatorAuth}'`,
        )
      )[0]?.subject_id,
    );
    save("seeding-disposable-authority");
    await sql(
      `begin;
      insert into public.subjects(id) values('${manifest.approver}');
      insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
      values('${tenant}','${manifest.operatorSubject}','operations','active',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '30 minutes','${manifest.approver}');
      insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
      values('${tenant}','${manifest.operatorSubject}','identity_contact','${tenant}','operations','active',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '30 minutes');
      commit;`,
      false,
    );
    save("authenticating-disposable-operator");
    const generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: manifest.operatorEmail,
    });
    check(!generated.error, "NO_SEND_OPERATOR_CODE_FAILED");
    const verified = await post("/staff/sign-in", {
      action: "verify",
      email: manifest.operatorEmail,
      code: generated.data.properties.email_otp,
    });
    check(verified.status === 200, `OPERATOR_VERIFY_${verified.status}`);
    const body = (await verified.json()) as { enrollment?: { secret: string } };
    check(body.enrollment?.secret, "OPERATOR_TOTP_ENROLLMENT_MISSING");
    const mfa = await post("/staff/mfa", { code: totp(body.enrollment.secret) });
    check([200, 204].includes(mfa.status), `OPERATOR_MFA_${mfa.status}`);
    if (mfa.status === 200) {
      const selected = await post("/staff/context", { tenantId: tenant, role: "operations" });
      check(selected.status === 204, `OPERATOR_CONTEXT_${selected.status}`);
    }
    manifest.proof.genuineTotp = true;
    save("creating-reviewed-test-participant");
    const createdInvitation = await post("/staff/mobile-invitations/command", {
      action: "create",
      requestKey: randomUUID(),
      givenName: "Synthetic",
      familyName: "Email Rehearsal",
      phone: "+999" + String(Date.now()).slice(-10),
      provenanceReference: randomUUID(),
      contactAuthorityReference: randomUUID(),
    });
    check(createdInvitation.status === 200, `PARTICIPANT_CREATE_${createdInvitation.status}`);
    const invitation = (await createdInvitation.json()) as {
      invitationId: string;
      version: number;
    };
    manifest.invitation = uuid(invitation.invitationId);
    save("reviewing-test-participant");
    const reviewed = await post("/staff/mobile-invitations/command", {
      action: "review",
      invitationId: manifest.invitation,
      expectedVersion: String(invitation.version),
      requestKey: randomUUID(),
    });
    check(reviewed.status === 200, `PARTICIPANT_REVIEW_${reviewed.status}`);
    const reviewedBody = (await reviewed.json()) as { version: number };
    const fields = {
      invitationId: manifest.invitation,
      expectedVersion: String(reviewedBody.version),
      requestKey: manifest.requestKey,
      email: recipient,
    };
    // Persist before the one send: process loss must never become authority to resend.
    save("send-attempt-started-do-not-retry");
    const sent = await post("/staff/mobile-invitations/email", fields);
    check(sent.status === 200, `EMAIL_SEND_${sent.status}`);
    const outcome = (await sent.json()) as { outcome: string };
    manifest.proof.providerOutcome = outcome.outcome;
    save("email-disposition-recorded");
    check(outcome.outcome === "accepted", "EMAIL_NOT_ACCEPTED_DO_NOT_RETRY");
    const replay = await post("/staff/mobile-invitations/email", fields);
    check(
      replay.status === 200 &&
        ((await replay.json()) as { outcome: string }).outcome === "already_attempted",
      "EMAIL_REPLAY_NOT_HELD",
    );
    manifest.proof.replayHeld = true;
    save("awaiting-recipient-observation");
    console.log(
      JSON.stringify({
        exercise: manifest.task,
        providerAccepted: true,
        replayHeld: true,
        genuineTotp: true,
        recipient,
        realCohortInvitationsSent: 0,
        receiptAndOnboardingNotYetVerified: true,
      }),
    );
  } finally {
    // Remove temporary authority immediately, even if a network response was lost.
    if (cookie) await post("/staff/sign-out", { action: "sign-out" }).catch(() => undefined);
    if (manifest.operatorAuth && manifest.operatorSubject) {
      await sql(
        `begin;
        delete from auth.sessions where user_id='${uuid(manifest.operatorAuth)}';
        update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='synthetic-email-rehearsal' where subject_id='${uuid(manifest.operatorSubject)}' and status='active';
        update public.tenant_memberships set status='revoked' where subject_id='${manifest.operatorSubject}' and tenant_id='${tenant}';
        update public.access_assignments set status='revoked' where subject_id='${manifest.operatorSubject}' and tenant_id='${tenant}';
        commit;`,
        false,
      );
      manifest.proof.operatorAuthorityRevoked = true;
      save(manifest.stage);
    }
  }
}
