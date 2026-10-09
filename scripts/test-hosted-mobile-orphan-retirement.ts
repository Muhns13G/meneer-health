import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseWorkforceContextRepository } from "../src/adapters/identity/supabase/supabase-workforce-context-repository";
import { SupabaseIdentitySessionRepository } from "../src/adapters/identity/supabase/supabase-identity-session-repository";
import { WorkforceSessionService } from "../src/application/identity/workforce-session-service";
import { SupabaseMobileOrphanRetirementRepository } from "../src/adapters/identity/supabase/supabase-mobile-orphan-retirement-repository";
import { SupabaseMobileOrphanRetirementProvider } from "../src/adapters/identity/supabase/supabase-mobile-orphan-retirement-provider";
import { MobileOrphanRetirementService } from "../src/application/identity/mobile-orphan-retirement-service";
import { maintainMobileOrphanCopies } from "../src/application/identity/mobile-orphan-copy-maintenance";
import {
  CloudflareR2MaintenanceStore,
  readWranglerOAuthToken,
} from "./lib/cloudflare-r2-maintenance";

// Explicitly approved isolated acceptance. No Worker settings, sends or real-account mutation.
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
const project = "gibfpolrdjotwvewgfsz";
invariant(
  process.env.HOSTED_ORPHAN_RETIREMENT_CONFIRM === "isolated-no-send-four-staff-preserved" &&
    process.env.SUPABASE_URL === `https://${project}.supabase.co` &&
    process.env.SUPABASE_SECRET_KEY &&
    readFileSync("supabase/.temp/project-ref", "utf8").trim() === project,
  "HOSTED_ORPHAN_GUARD_REJECTED",
);
invariant(
  /^[A-Za-z0-9+/]{43}=$/.test(process.env.RECOVERY_ENCRYPTION_KEY_BASE64 ?? ""),
  "HOSTED_ORPHAN_RECOVERY_KEY_REQUIRED",
);
const journal = ".td066-hosted-retirement.local";
invariant(
  !existsSync(journal) || JSON.parse(readFileSync(journal, "utf8")).state === "cleaned",
  "HOSTED_ORPHAN_PRIOR_FIXTURES_REQUIRE_RECONCILIATION",
);
function sql(query: string): Array<Record<string, unknown>> {
  try {
    const output = execFileSync(
      "bun",
      ["--no-env-file", "x", "supabase", "db", "query", "--linked", "--", query],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024 },
    );
    return JSON.parse(output.slice(output.indexOf("{"))).rows;
  } catch (error) {
    const failure = error as { stderr?: unknown; stdout?: unknown };
    const diagnostic = `${String(failure.stderr ?? "")} ${String(failure.stdout ?? "")}`;
    const code = diagnostic.match(/(?:ERROR:\s+\w+:\s+)([A-Z][A-Z_]{5,})/)?.[1];
    throw new Error(`HOSTED_ORPHAN_SQL_FAILED${code ? `:${code}` : ""}`);
  }
}
const baselineQuery = readFileSync("scripts/sql/sprint-13-onboarding-baseline.sql", "utf8");
const baseline = sql(baselineQuery);
const realUsers = sql(
  "select id::text,md5(to_jsonb(u)::text) fingerprint from auth.users u order by id;",
);
invariant(
  realUsers.length === 4 &&
    sql(
      "select exists(select 1 from public.tenants where slug='meneer-pilot' and status='suspended') safe;",
    )[0]?.safe,
  "HOSTED_ORPHAN_BASELINE_CHANGED",
);
const ids = {
  tenant: crypto.randomUUID(),
  approver: crypto.randomUUID(),
  mobile: crypto.randomUUID(),
  token: crypto.randomUUID(),
  claim: crypto.randomUUID(),
  claimRequest: crypto.randomUUID(),
  request: crypto.randomUUID(),
  review: crypto.randomUUID(),
};
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const identities: Array<{ provider: string; subject: string; email: string }> = [];
const objectKeys: string[] = [];
const checks: string[] = [];
let emailInvitation = "";
let seeded = false;
let passed = false;
const store = new CloudflareR2MaintenanceStore(
  "b45542b7bab5ef436344304eee963358",
  "meneer-health-recovery-production",
  readWranglerOAuthToken(),
);
const r2Baseline = await store.inventory();
function checkpoint(state: string) {
  writeFileSync(
    journal,
    JSON.stringify({
      state,
      ids,
      emailInvitation,
      identities,
      objectKeys,
      baseline,
      realUsers,
      checks,
      seeded,
    }),
    { mode: 0o600 },
  );
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    invariant(n >= 0, "HOSTED_ORPHAN_TOTP_INVALID");
    bits += n.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
async function denied(action: () => Promise<unknown>, name: string) {
  let failed = false;
  try {
    await action();
  } catch {
    failed = true;
  }
  invariant(failed, name);
  checks.push(name);
}
async function createIdentity(label: string, confirmed: boolean, proof?: string) {
  const email = `td066-${label}-${crypto.randomUUID()}@example.invalid`;
  const result = await client.auth.admin.createUser({
    email,
    email_confirm: confirmed,
    ...(proof ? { user_metadata: { mobile_creation_proof: proof } } : {}),
  });
  invariant(!result.error && result.data.user, "HOSTED_ORPHAN_CREATE_FAILED");
  const actor = { email, provider: result.data.user.id, subject: "" };
  identities.push(actor);
  checkpoint("identity-created");
  actor.subject = String(
    sql(
      `select subject_id from public.external_identities where provider='supabase' and provider_subject='${actor.provider}';`,
    )[0]?.subject_id ?? "",
  );
  invariant(/^[a-f0-9-]{36}$/.test(actor.subject), "HOSTED_ORPHAN_SUBJECT_MISSING");
  checkpoint("identity-linked");
  return actor;
}
try {
  checkpoint("creating-isolated-fixtures");
  const operator = await createIdentity("operations", true);
  sql(`begin;insert into public.tenants(id,slug,display_name,status) values('${ids.tenant}','td066-${ids.tenant}','SYNTHETIC RETIREMENT ACCEPTANCE','active');
    insert into public.subjects(id) values('${ids.approver}');
    insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
    values('${ids.tenant}','${operator.subject}','operations','active',now()-interval '1 minute',now()+interval '2 hours','${ids.approver}');commit;select true seeded;`);
  seeded = true;
  checkpoint("tenant-created");
  const provider = createSupabaseManagedIdentityProvider({
    url: process.env.SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY,
  });
  const workforce = new WorkforceSessionService(
    provider,
    new SupabaseWorkforceContextRepository(client),
    new SupabaseIdentitySessionRepository(client),
  );
  const link = await client.auth.admin.generateLink({ type: "magiclink", email: operator.email });
  invariant(!link.error, "HOSTED_ORPHAN_NO_SEND_LINK_FAILED");
  const pending = await workforce.verifyCode(operator.email, link.data.properties.email_otp);
  invariant(
    pending.enrollment && !pending.proof.sessionId,
    "HOSTED_ORPHAN_EMAIL_GRANTED_AUTHORITY",
  );
  await denied(() => workforce.authorise(pending.proof), "email-only-denied");
  const complete = await workforce.completeMfa(pending.proof, totp(pending.enrollment.secret));
  const identity = await provider.verifyAccessToken(complete.proof.providerSession.accessToken);
  const repository = new SupabaseMobileOrphanRetirementRepository(client, identity, complete.proof);
  const adminProvider = new SupabaseMobileOrphanRetirementProvider(client);
  const authority = {
    p_provider_subject: identity.providerSubject,
    p_provider_session_id: identity.providerSessionId,
    p_verified_email: operator.email,
    p_session_id: complete.proof.sessionId,
    p_subject_id: operator.subject,
    p_tenant_id: ids.tenant,
  };
  await denied(
    () =>
      repository.reserve({
        tenantId: crypto.randomUUID(),
        emailInvitationId: crypto.randomUUID(),
        requestKey: ids.request,
      }),
    "wrong-tenant-denied",
  );
  const orphanEmail = `td066-orphan-${crypto.randomUUID()}@example.invalid`;
  const digest = createHash("sha256").update(orphanEmail).digest("hex");
  sql(`begin;
    insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
    values('${ids.tenant}','${operator.subject}','identity_contact','${ids.tenant}','operations','active',now()-interval '1 minute',now()+interval '2 hours');
    insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,provenance_reference,contact_authority_reference,request_key)
    values('${ids.mobile}','${ids.tenant}','${operator.subject}',gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
    update identity_private.mobile_invitations set status='issued',issued_at=now(),expires_at=now()+interval '48 hours' where id='${ids.mobile}';
    update identity_private.mobile_invitations set status='claimed',bound_email_digest='${digest}' where id='${ids.mobile}';
    insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,family_name,phone,claimed_email)
    values('${ids.mobile}','${ids.tenant}','Synthetic','Retirement','+27000000001','${orphanEmail}');
    insert into identity_private.mobile_invitation_tokens(id,invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at,state)
    values('${ids.token}','${ids.mobile}','${ids.tenant}',1,repeat('a',64),now(),now()+interval '48 hours','active');
    insert into identity_private.mobile_invitation_claims(id,invitation_id,tenant_id,token_id,claim_digest,request_key,email_digest,state,issued_at,expires_at)
    values('${ids.claim}','${ids.mobile}','${ids.tenant}','${ids.token}',repeat('b',64),'${ids.claimRequest}','${digest}','active',now(),now()+interval '15 minutes');commit;select true prepared;`);
  const exchange = await client.rpc("prepare_mobile_email_exchange", {
    p_tenant_id: ids.tenant,
    p_token_digest: "a".repeat(64),
    p_claim_digest: "b".repeat(64),
    p_request_key: ids.claimRequest,
  });
  invariant(
    !exchange.error &&
      exchange.data?.dispatch === true &&
      /^[a-f0-9]{64}$/.test(exchange.data.creationProof),
    "HOSTED_ORPHAN_CREATION_LEASE_FAILED",
  );
  emailInvitation = exchange.data.invitationId;
  checkpoint("lease-reserved");
  const created = await client.auth.admin.createUser({
    email: orphanEmail,
    email_confirm: false,
    user_metadata: { mobile_creation_proof: exchange.data.creationProof },
  });
  invariant(!created.error && created.data.user, "HOSTED_ORPHAN_CREATE_PROVENANCE_FAILED");
  const orphan = { provider: created.data.user.id, email: orphanEmail, subject: "" };
  identities.push(orphan);
  checkpoint("provenance-identity-created");
  orphan.subject = String(
    sql(
      `select subject_id from identity_private.mobile_identity_creation_receipts where email_invitation_id='${emailInvitation}' and provider_subject_id='${orphan.provider}';`,
    )[0]?.subject_id ?? "",
  );
  invariant(/^[a-f0-9-]{36}$/.test(orphan.subject), "HOSTED_ORPHAN_ACTUAL_INSERT_RECEIPT_MISSING");
  checks.push("actual-managed-insert-provenance");
  checkpoint("provenance-captured");
  const finished = await client.rpc("finish_mobile_email_exchange", {
    p_tenant_id: ids.tenant,
    p_token_digest: "a".repeat(64),
    p_claim_digest: "b".repeat(64),
    p_request_key: ids.claimRequest,
    p_provider_subject: orphan.provider,
  });
  invariant(!finished.error && finished.data === true, "HOSTED_ORPHAN_NATIVE_LINK_FAILED");
  // Frozen elapsed-time fixture only; actual creation receipt is already independently proven.
  // Named guards restored before any retirement call; unrelated records never enter this scope.
  sql(`begin;lock table identity_private.mobile_invitations,identity_private.mobile_identity_creation_receipts in access exclusive mode;
    alter table identity_private.mobile_invitations disable trigger mobile_invitation_guard;
    alter table identity_private.mobile_identity_creation_receipts disable trigger mobile_creation_receipt_immutable;
    update identity_private.mobile_invitations set created_at=now()-interval '33 days',issued_at=now()-interval '33 days',expires_at=now()-interval '31 days',status='revoked',terminal_at=now()-interval '31 days' where id='${ids.mobile}';
    update identity_private.mobile_identity_creation_receipts set recorded_at=now()-interval '33 days'+interval '1 minute' where email_invitation_id='${emailInvitation}';
    update public.identity_invitations set created_at=now()-interval '33 days',expires_at=now()-interval '31 days' where id='${emailInvitation}';
    update identity_private.mobile_invitation_claims set state='expired' where id='${ids.claim}';
    alter table identity_private.mobile_identity_creation_receipts enable trigger mobile_creation_receipt_immutable;
    alter table identity_private.mobile_invitations enable trigger mobile_invitation_guard;commit;select true elapsed_fixture;`);
  const command = {
    tenantId: ids.tenant,
    emailInvitationId: emailInvitation,
    requestKey: ids.request,
  };
  const diagnostic =
    sql(`with s as(select identity_private.mobile_orphan_snapshot('${ids.tenant}','${emailInvitation}') value)
    select value is not null snapshot_present,identity_private.mobile_orphan_candidate(value) candidate,
    value->'liveClaim' live_claim,value->'converted' converted,value->'domainRecordsExist' domain_records,
    value->'anotherInvitation' another_invitation,value->'providerOutcomeUncertain' provider_uncertain,
    (select extract(epoch from clock_timestamp()-max(updated_at))::int from auth.mfa_amr_claims where session_id='${identity.providerSessionId}' and authentication_method='totp') totp_age_seconds from s;`);
  console.log(JSON.stringify({ exercise: "orphan-preflight", checks: diagnostic }));
  const reservations = await Promise.allSettled(
    Array.from({ length: 8 }, () => repository.reserve(command)),
  );
  const results = reservations.map((r) => {
    invariant(
      r.status === "fulfilled" && r.value,
      `HOSTED_ORPHAN_RESERVATION_FAILED:${r.status === "fulfilled" ? "no-candidate" : r.reason instanceof Error ? r.reason.name : "rejected"}`,
    );
    return r.value as { dispatch: boolean; operationId: string };
  });
  invariant(
    results.filter((r) => r.dispatch).length === 1 &&
      new Set(results.map((r) => r.operationId)).size === 1,
    "HOSTED_ORPHAN_COMPETING_DISPATCH",
  );
  checks.push("eight-reservations-one-dispatch");
  const operation = results[0]!.operationId;
  const confirmation = await client.auth.admin.updateUserById(orphan.provider, {
    email_confirm: true,
  });
  invariant(confirmation.error, "HOSTED_ORPHAN_CONFIRMATION_RACE_NOT_BLOCKED");
  checks.push("managed-confirmation-quarantined");
  await denied(
    () => repository.reserve({ ...command, requestKey: crypto.randomUUID() }),
    "competing-request-key-denied",
  );
  await repository.markUncertain(operation);
  const state = await new MobileOrphanRetirementService(repository, adminProvider).retire(command);
  invariant(state === "uncertain", "HOSTED_ORPHAN_BLIND_REPEAT_DELETE");
  checks.push("uncertain-no-blind-provider-repeat");
  invariant(
    (await adminProvider.removeUnconfirmed(orphan.provider, digest)) === "attempted",
    "HOSTED_ORPHAN_MANAGED_DELETE_FAILED",
  );
  invariant(
    (await adminProvider.observe(orphan.provider)).status === "absent",
    "HOSTED_ORPHAN_INDEPENDENT_ABSENCE_FAILED",
  );
  invariant(
    (await new MobileOrphanRetirementService(repository, adminProvider).retire(command)) ===
      "copies_pending",
    "HOSTED_ORPHAN_NATIVE_TOMBSTONE_FAILED",
  );
  checks.push("managed-delete-and-independent-absence", "contact-only-tombstone");
  const maintenance = await client.rpc("read_mobile_orphan_maintenance", {
    ...authority,
    p_email_invitation_id: emailInvitation,
  });
  invariant(
    !maintenance.error && maintenance.data?.state === "copies_pending",
    "HOSTED_ORPHAN_MAINTENANCE_READ_FAILED",
  );
  const copied = await maintainMobileOrphanCopies(
    maintenance.data,
    Uint8Array.from(Buffer.from(process.env.RECOVERY_ENCRYPTION_KEY_BASE64!, "base64")),
    {
      store: {
        async put(key, body) {
          objectKeys.push(key);
          checkpoint("r2-write-attempt");
          await store.put(key, body);
        },
        get: (key) => store.get(key),
      },
      inventory: () => store.inventory(),
      async complete() {
        throw new Error("HOSTED_ORPHAN_COPY_EXPIRY_PREMATURE");
      },
    },
  );
  invariant(
    copied.state === "copies_pending" && copied.dispositionStored,
    "HOSTED_ORPHAN_FALSE_ERASURE_COMPLETION",
  );
  checks.push("encrypted-r2-disposition-round-trip", "premature-copy-completion-denied");
  const reissue = await repository.prepareReviewedReissue(operation, ids.review, {
    action: "create",
    requestKey: crypto.randomUUID(),
    givenName: "Synthetic",
    familyName: "Reissue",
    phone: "+27000000002",
    provenanceReference: crypto.randomUUID(),
    contactAuthorityReference: crypto.randomUUID(),
  });
  invariant(
    reissue.status === "draft" && reissue.invitationId !== ids.mobile,
    "HOSTED_ORPHAN_REISSUE_REVIVED_LINK",
  );
  checks.push("reviewed-new-draft-no-send");
  const noSends = sql(
    `select not exists(select 1 from identity_private.mobile_invitation_send_reservations where tenant_id='${ids.tenant}') and not exists(select 1 from public.subject_contacts where subject_id='${orphan.subject}') safe;`,
  );
  invariant(noSends[0]?.safe, "HOSTED_ORPHAN_UNEXPECTED_SEND_OR_CONTACT");
  passed = true;
  checkpoint("passed-awaiting-cleanup");
} finally {
  for (const key of objectKeys) await store.delete(key);
  const remaining = await store.inventory();
  invariant(
    objectKeys.every((key) => !remaining.some((o) => o.key === key)) &&
      r2Baseline.every((o) =>
        remaining.some((item) => item.key === o.key && item.lastModified === o.lastModified),
      ),
    "HOSTED_ORPHAN_R2_BASELINE_CHANGED",
  );
  for (const actor of identities) {
    sql(`delete from auth.sessions where user_id='${actor.provider}';select true revoked;`);
  }
  const roots = [
    ...Object.values(ids),
    emailInvitation,
    ...identities.flatMap((i) => [i.provider, i.subject]),
  ].filter(Boolean);
  invariant(
    roots.every((id) => /^[a-f0-9-]{36}$/.test(id)),
    "HOSTED_ORPHAN_CLEANUP_ROOT_INVALID",
  );
  let cleanup = readFileSync("scripts/sql/sprint-13-onboarding-cleanup.sql", "utf8")
    .replaceAll("{{baseline}}", JSON.stringify(baseline))
    .replaceAll("{{roots}}", JSON.stringify(roots));
  cleanup = cleanup
    .replace(
      "or exists(select 1 from auth.users where id::text not in(select id from exercise_roots))",
      `or exists(select 1 from auth.users where id::text not in(select id from exercise_roots) and id::text not in(${realUsers.map((u) => `'${u.id}'`).join(",")}))`,
    )
    .replace(
      "or (t.tgrelid='commerce_private.refund_jobs'::regclass and t.tgname='refund_jobs_guard'))",
      "or (t.tgrelid='commerce_private.refund_jobs'::regclass and t.tgname='refund_jobs_guard') or (t.tgrelid='identity_private.mobile_orphan_retirements'::regclass and t.tgname='mobile_orphan_operation_guard') or (t.tgrelid='identity_private.mobile_invitations'::regclass and t.tgname='mobile_invitation_guard') or (t.tgrelid='identity_private.mobile_invitation_tokens'::regclass and t.tgname='mobile_token_guard') or (t.tgrelid='identity_private.mobile_invitation_claims'::regclass and t.tgname='mobile_claim_guard'))",
    );
  invariant(
    !cleanup.includes("{{") && cleanup.includes("t.tgname='mobile_orphan_operation_guard'"),
    "HOSTED_ORPHAN_CLEANUP_GUARD_MISSING",
  );
  cleanup = cleanup.replace(
    "or (t.tgrelid='identity_private.mobile_invitation_claims'::regclass and t.tgname='mobile_claim_guard'))",
    "or (t.tgrelid='identity_private.mobile_invitation_claims'::regclass and t.tgname='mobile_claim_guard') or (t.tgrelid='identity_private.mobile_invitation_contacts'::regclass and t.tgname='mobile_contact_guard'))",
  );
  if (identities.length || seeded) sql(cleanup);
  for (const actor of identities) {
    const removed = await client.auth.admin.deleteUser(actor.provider);
    invariant(
      !removed.error || removed.error.status === 404,
      "HOSTED_ORPHAN_CLEANUP_PROVIDER_FAILED",
    );
  }
  invariant(
    JSON.stringify(sql(baselineQuery)) === JSON.stringify(baseline),
    "HOSTED_ORPHAN_BASELINE_NOT_RESTORED",
  );
  invariant(
    JSON.stringify(
      sql("select id::text,md5(to_jsonb(u)::text) fingerprint from auth.users u order by id;"),
    ) === JSON.stringify(realUsers),
    "HOSTED_ORPHAN_REAL_STAFF_CHANGED",
  );
  checkpoint("cleaned");
}
invariant(passed, "HOSTED_ORPHAN_ACCEPTANCE_FAILED");
console.log(
  JSON.stringify({
    exercise: "hosted-mobile-orphan-retirement",
    checks,
    realStaffPreserved: 4,
    realGrantsPreserved: 6,
    baselineRestored: true,
    syntheticR2ObjectsRemoved: objectKeys.length,
    messagesSent: 0,
    pilotActivated: false,
    elapsedTimeFixture: true,
    productionBackupExpiryClaimed: false,
  }),
);
