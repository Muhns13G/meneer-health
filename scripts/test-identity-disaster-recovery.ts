import { execFileSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";
import { assertLocalRecoveryEnvironment } from "./lib/sprint13-recovery-rehearsal";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseIdentitySessionRepository } from "../src/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabaseWorkforceContextRepository } from "../src/adapters/identity/supabase/supabase-workforce-context-repository";
import { IdentityRejectedError } from "../src/application/identity/managed-identity-provider";
import {
  encryptRecoveryArchive,
  decryptRecoveryArchive,
} from "../src/application/recovery/recovery-archive";

// This deliberately uses only the fixed local stack. It is not a hosted recovery tool.
assertLocalRecoveryEnvironment(process.env);
const environment = readSupabaseIntegrationEnvironment();
invariant(
  environment.target === "local" && environment.API_URL === "http://127.0.0.1:54321",
  "IDENTITY_RECOVERY_LOCAL_ONLY",
);
const container = "supabase_db_meneer-health-local";
const restoredDatabase = `identity_recovery_${randomUUID().replaceAll("-", "")}`;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(environment.API_URL, environment.SECRET_KEY, options);
const provider = createSupabaseManagedIdentityProvider({
  url: environment.API_URL,
  secretKey: environment.SECRET_KEY,
});
const repository = new SupabaseIdentitySessionRepository(admin);
const workforce = new SupabaseWorkforceContextRepository(admin);
const email = `synthetic-disaster-${randomUUID()}@example.invalid`;
const providerIds: string[] = [];
let subjectId: string | undefined;
let databaseCreated = false;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
function docker(args: string[], input?: string | Buffer): Buffer {
  try {
    return execFileSync("docker", args, {
      input,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch {
    throw new Error("IDENTITY_RECOVERY_LOCAL_DATABASE_FAILED");
  }
}
function sql(statement: string, database = "postgres") {
  return docker(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-X",
      "-qAt",
      "-d",
      database,
      "--set=ON_ERROR_STOP=1",
    ],
    statement,
  )
    .toString()
    .trim();
}
async function denied(action: () => Promise<unknown>) {
  let rejected = false;
  try {
    await action();
  } catch (error) {
    if (!(error instanceof IdentityRejectedError)) throw error;
    rejected = true;
  }
  invariant(rejected, "IDENTITY_RECOVERY_EXPECTED_DENIAL");
}
function totp(secret: string) {
  let bits = "";
  for (const character of secret.replaceAll("=", "").toUpperCase()) {
    const index = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(character);
    invariant(index >= 0, "IDENTITY_RECOVERY_FACTOR_INVALID");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8)
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1_000_000)
    .toString()
    .padStart(6, "0");
}
async function signIn() {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  invariant(!link.error, "IDENTITY_RECOVERY_CODE_FAILED");
  const browser = createClient(environment.API_URL, environment.PUBLISHABLE_KEY, options);
  const result = await browser.auth.verifyOtp({
    type: "email",
    token_hash: link.data.properties.hashed_token,
  });
  invariant(!result.error && result.data.session, "IDENTITY_RECOVERY_REVERIFICATION_FAILED");
  return {
    accessToken: result.data.session.access_token,
    refreshToken: result.data.session.refresh_token,
    expiresAt: new Date(result.data.session.expires_at! * 1000),
  };
}
async function enrol(session: Awaited<ReturnType<typeof signIn>>) {
  const factor = await provider.enrollWorkforceTotp(session, "Synthetic disaster recovery");
  const challenge = await provider.challengeWorkforceTotp(session, factor.factorId);
  return {
    factor,
    session: await provider.verifyWorkforceTotp(
      session,
      factor.factorId,
      challenge,
      totp(factor.secret),
    ),
  };
}

try {
  invariant(
    sql("select count(*) from auth.users;") === "0",
    "IDENTITY_RECOVERY_REQUIRES_EMPTY_LOCAL_AUTH",
  );
  invariant(
    sql(
      "select count(*) from public.subject_contacts where kind='email' and normalized_value not like '%.invalid';",
    ) === "0",
    "IDENTITY_RECOVERY_NON_SYNTHETIC_CONTACT_REJECTED",
  );
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  invariant(!created.error && created.data.user, "IDENTITY_RECOVERY_CREATE_FAILED");
  providerIds.push(created.data.user.id);
  subjectId = sql(`select subject_id from public.external_identities
    where provider='supabase' and provider_subject='${created.data.user.id}';`);
  invariant(/^[a-f0-9-]{36}$/.test(subjectId), "IDENTITY_RECOVERY_SUBJECT_INVALID");
  const old = await enrol(await signIn());
  const oldIdentity = await provider.verifyAccessToken(old.session.accessToken);
  await repository.start({
    subjectId,
    providerIdentity: oldIdentity,
    sessionClass: "workforce",
    observedAt: new Date(),
  });

  // An actual custom-format logical application dump is restored into a separate database.
  // Auth credentials/sessions/factors are expressly not selected or exported.
  const schemas = [
    "public",
    "commerce_private",
    "audit_private",
    "fulfilment_private",
    "identity_private",
    "intake_private",
    "lifecycle_private",
    "measurement_private",
    "payments_private",
  ];
  const dump = docker([
    "exec",
    container,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-Fc",
    ...schemas.flatMap((schema) => ["-n", schema]),
  ]);
  const key = crypto.getRandomValues(new Uint8Array(32));
  const checksum = createHash("sha256").update(dump).digest("hex");
  const archive = await encryptRecoveryArchive(
    {
      contract: "recovery.manifest",
      version: 1,
      backupId: randomUUID(),
      createdAt: new Date().toISOString(),
      environment: "local",
      schemaVersion: sql("select max(version) from supabase_migrations.schema_migrations;"),
      recordCounts: { identity_fixture_subjects: 1, identity_fixture_sessions: 1 },
      checksum,
    },
    Uint8Array.from(dump),
    key,
    "disposable-local-identity-recovery",
  );
  const recovered = await decryptRecoveryArchive(archive, key);
  invariant(
    createHash("sha256").update(recovered.payload).digest("hex") === checksum,
    "IDENTITY_RECOVERY_ARCHIVE_CHECKSUM_FAILED",
  );
  docker(["exec", container, "createdb", "-U", "postgres", restoredDatabase]);
  databaseCreated = true;
  sql(
    "drop schema public; create schema extensions; create extension pgcrypto with schema extensions;",
    restoredDatabase,
  );
  docker(
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      restoredDatabase,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
    ],
    Buffer.from(recovered.payload),
  );
  invariant(
    sql(
      `select exists(select 1 from public.subject_contacts where subject_id='${subjectId}'
    and normalized_value='${email}') and exists(select 1 from public.identity_sessions
    where provider_session_id='${oldIdentity.providerSessionId}' and status='active');`,
      restoredDatabase,
    ) === "t",
    "IDENTITY_RECOVERY_SNAPSHOT_NOT_RESTORED",
  );
  invariant(
    sql("select not exists(select 1 from pg_namespace where nspname='auth');", restoredDatabase) ===
      "t",
    "IDENTITY_RECOVERY_EXPORTED_PROVIDER_AUTH",
  );

  // Independent current restriction is newer than the backup and must win over its active state.
  sql(`update public.subjects set status='suspended' where id='${subjectId}';`);
  const currentStatus = sql(`select status from public.subjects where id='${subjectId}';`);
  invariant(currentStatus === "suspended", "IDENTITY_RECOVERY_CURRENT_RESTRICTION_MISSING");
  sql(
    `begin;
    update public.tenants set status='suspended' where status='active';
    update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),
      revocation_reason='isolated disaster recovery' where status='active';
    update public.tenant_memberships set status='revoked' where status='active';
    update public.access_assignments set status='revoked' where status='active';
    select intake_private.quarantine_restored_medical_intakes();
    update public.subjects set status='${currentStatus}' where id='${subjectId}';
    commit;`,
    restoredDatabase,
  );
  invariant(
    sql(
      `select not exists(select 1 from public.identity_sessions where status='active')
    and not exists(select 1 from public.tenants where status='active')
    and not exists(select 1 from public.tenant_memberships where status='active')
    and not exists(select 1 from public.access_assignments where status='active')
    and not exists(select 1 from intake_private.intakes where not restore_quarantined
      or restore_authority_cutoff is null)
    and not exists(select 1 from intake_private.access_grants where revoked_at is null)
    and exists(select 1 from public.subjects where id='${subjectId}' and status='suspended');`,
      restoredDatabase,
    ) === "t",
    "IDENTITY_RECOVERY_RESTORED_AUTHORITY_ACTIVE",
  );

  const removed = await admin.auth.admin.deleteUser(created.data.user.id);
  invariant(!removed.error, "IDENTITY_RECOVERY_PROVIDER_LOSS_FAILED");
  await denied(() => provider.verifyAccessToken(old.session.accessToken));
  const replacement = await admin.auth.admin.createUser({ email, email_confirm: false });
  invariant(!replacement.error && replacement.data.user, "IDENTITY_RECOVERY_RECREATE_FAILED");
  providerIds.push(replacement.data.user.id);
  invariant(
    replacement.data.user.id !== created.data.user.id && !replacement.data.user.email_confirmed_at,
    "IDENTITY_RECOVERY_CONFIRMATION_BYPASSED",
  );
  invariant(
    sql(`select subject_id from public.external_identities where provider='supabase'
    and provider_subject='${replacement.data.user.id}';`) === subjectId,
    "IDENTITY_RECOVERY_STABLE_RELINK_FAILED",
  );
  const fresh = await signIn();
  invariant(
    (await provider.verifyAccessToken(fresh.accessToken)).assurance === "aal1",
    "IDENTITY_RECOVERY_OLD_ASSURANCE_RESTORED",
  );
  invariant(
    (await provider.listWorkforceTotp(fresh)).length === 0,
    "IDENTITY_RECOVERY_OLD_FACTOR_RESTORED",
  );
  const renewed = await enrol(fresh);
  invariant(
    renewed.factor.factorId !== old.factor.factorId &&
      renewed.factor.secret !== old.factor.secret &&
      (await provider.verifyAccessToken(renewed.session.accessToken)).assurance === "aal2",
    "IDENTITY_RECOVERY_FRESH_MFA_FAILED",
  );
  invariant(
    sql(`select status from public.subjects where id='${subjectId}';`) === "suspended",
    "IDENTITY_RECOVERY_RELINK_REMOVED_RESTRICTION",
  );
  const freshIdentity = await provider.verifyAccessToken(renewed.session.accessToken);
  await denied(() => workforce.resolve(freshIdentity));
  // Contact/MFA re-verification is not permission to revive old membership authority.
  sql(`update public.subjects set status='active' where id='${subjectId}';`);
  await denied(() => workforce.resolve(freshIdentity));
  sql(`insert into public.tenant_memberships
    (tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
    values('10000000-0000-4000-8000-000000000001','${subjectId}','operations','active',
      clock_timestamp(),clock_timestamp()+interval '15 minutes',
      '20000000-0000-4000-8000-000000000003');`);
  invariant(
    (await workforce.resolve(freshIdentity)).subjectId === subjectId,
    "IDENTITY_RECOVERY_FRESH_MEMBERSHIP_APPROVAL_FAILED",
  );
  sql(`update public.tenant_memberships set status='revoked' where subject_id='${subjectId}';`);
  await denied(() => workforce.resolve(freshIdentity));

  // This contact-only erasure probe is not a full medical/financial retention decision.
  sql(`begin; update public.subjects set status='erased' where id='${subjectId}';
    delete from public.subject_contacts where subject_id='${subjectId}' and normalized_value='${email}';
    commit;`);
  await denied(() => workforce.resolve(freshIdentity));
  invariant(
    sql(`select status from public.subjects where id='${subjectId}';`) === "erased",
    "IDENTITY_RECOVERY_CURRENT_ERASURE_MISSING",
  );
  sql(
    `begin; update public.subjects set status='erased' where id='${subjectId}';
    delete from public.subject_contacts where subject_id='${subjectId}' and normalized_value='${email}';
    commit;`,
    restoredDatabase,
  );
  invariant(
    sql(
      `select exists(select 1 from public.subjects where id='${subjectId}' and status='erased')
    and not exists(select 1 from public.subject_contacts where subject_id='${subjectId}')
    and not exists(select 1 from public.identity_sessions where subject_id='${subjectId}' and status='active');`,
      restoredDatabase,
    ) === "t",
    "IDENTITY_RECOVERY_STALE_CONTACT_RESURRECTED",
  );
} finally {
  try {
    await cleanupFixtures();
  } finally {
    if (databaseCreated) docker(["exec", container, "dropdb", "-U", "postgres", restoredDatabase]);
  }
}

async function cleanupFixtures() {
  for (const id of providerIds) {
    const result = await admin.auth.admin.deleteUser(id);
    // The original identity was deliberately removed earlier. Inspect the local database below.
    if (result.error && sql(`select count(*) from auth.users where id='${id}';`) !== "0")
      throw new Error("IDENTITY_RECOVERY_AUTH_CLEANUP_FAILED");
  }
  if (subjectId) {
    sql(`begin; delete from public.identity_sessions where subject_id='${subjectId}';
      delete from public.tenant_memberships where subject_id='${subjectId}';
      delete from public.subject_contacts where subject_id='${subjectId}' and normalized_value='${email}';
      delete from public.external_identities where subject_id='${subjectId}';
      delete from public.subjects where id='${subjectId}'; commit;`);
    invariant(
      sql(`select count(*) from public.subjects where id='${subjectId}';`) === "0",
      "IDENTITY_RECOVERY_APPLICATION_CLEANUP_FAILED",
    );
  }
}

console.log(
  JSON.stringify({
    exercise: "local-identity-disaster-recovery",
    encryptedApplicationDumpRestored: true,
    archiveChecksumMatched: true,
    providerAuthExcluded: true,
    stableSubjectPreserved: true,
    oldTokenRejected: true,
    contactReverified: true,
    workforceFactorReenrolled: true,
    currentRestrictionPreserved: true,
    restoredSessionsAndMembershipsRevoked: true,
    restoredAccessAssignmentsRevoked: true,
    restoredTenantsSuspended: true,
    medicalQuarantineApplied: true,
    medicalRecordRestoreProven: false,
    grantReapprovalRequired: true,
    membershipReapprovalAndRevocationProven: true,
    currentContactErasureApplied: true,
    domainSpecificGrantReapprovalProven: false,
    hostedRecoveryProven: false,
    generatedFixturesRemoved: true,
    restoreDatabaseRemoved: true,
    emailsSent: 0,
    secretsLogged: false,
  }),
);
