import { execFile, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  encryptRecoveryArchive,
  decryptRecoveryArchive,
} from "../src/application/recovery/recovery-archive";
import { createHash } from "node:crypto";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";
import {
  assertLocalMobileEnvironment,
  mobileSecurityBaselineSql,
  validateMobileSecurityBaseline,
} from "./lib/sprint14-security";

// Fixed local target only. Historical elapsed-time fixtures are not hosted provenance proof.
assertLocalMobileEnvironment(process.env);
const environment = readSupabaseIntegrationEnvironment();
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
invariant(
  environment.target === "local" && environment.API_URL === "http://127.0.0.1:54321",
  "ORPHAN_RETIREMENT_LOCAL_ONLY",
);
const client = createClient(environment.API_URL, environment.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function sql(input: string) {
  try {
    return execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_meneer-health-local",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-X",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60_000 },
    ).trim();
  } catch {
    throw new Error("ORPHAN_RETIREMENT_LOCAL_SQL_FAILED");
  }
}
invariant(
  sql(
    "select (select count(*) from auth.users)+(select count(*) from identity_private.mobile_invitations)+(select count(*) from identity_private.mobile_orphan_retirements);",
  ) === "0",
  "ORPHAN_RETIREMENT_EMPTY_LOCAL_BASELINE_REQUIRED",
);
const baseline = validateMobileSecurityBaseline(sql(mobileSecurityBaselineSql));
const source = readFileSync("supabase/tests/database/mobile_orphan_retirement.test.sql", "utf8");
const boundary = source.indexOf("create function pg_temp.reserve(");
invariant(boundary > 0, "ORPHAN_RETIREMENT_FIXED_FIXTURE_REQUIRED");
const fixture = source
  .slice(source.indexOf("begin;"), boundary)
  .replace(/^create extension if not exists pgtap with schema extensions;\s*$/m, "")
  .replace(/^select no_plan\(\);\s*$/m, "");
const tables = [
  "identity_private.mobile_orphan_retirement_events",
  "identity_private.mobile_orphan_retirements",
  "identity_private.mobile_identity_creation_receipts",
  "identity_private.mobile_email_exchanges",
  "identity_private.mobile_invitation_claims",
  "identity_private.mobile_invitation_tokens",
  "identity_private.mobile_invitations",
  "public.identity_invitations",
  "public.identity_sessions",
  "public.access_assignments",
  "public.tenant_memberships",
  "public.subject_contacts",
  "public.external_identities",
  "public.subjects",
];
// Capture only enabled, named user guards on the exact fixture tables. Restore before commit.
const guards: Array<{ relation: string; name: string }> = JSON.parse(
  sql(
    `select coalesce(json_agg(json_build_object('relation',n.nspname||'.'||c.relname,'name',tgname) order by tgrelid,tgname),'[]') from pg_trigger join pg_class c on c.oid=tgrelid join pg_namespace n on n.oid=c.relnamespace where not tgisinternal and tgenabled='O' and tgrelid in(${tables.map((t) => `'${t}'::regclass`).join(",")});`,
  ),
);
invariant(
  guards.every((g) => /^[a-z_]+\.[a-z_]+$/.test(g.relation) && /^[a-z_]+$/.test(g.name)),
  "ORPHAN_RETIREMENT_GUARD_NAMES_INVALID",
);
let prepared = false;
let subject = "";
let operator = "";
let provider = "";
let operation = "";
let authority: Record<string, string> = {};
const restoredDatabase = `mobile_orphan_restore_${crypto.randomUUID().replaceAll("-", "")}`;
let restoreCreated = false;
function restoreSql(input: string) {
  try {
    return execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_meneer-health-local",
        "psql",
        "-U",
        "postgres",
        "-d",
        restoredDatabase,
        "-X",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 60_000 },
    ).trim();
  } catch {
    throw new Error("ORPHAN_RETIREMENT_OFFLINE_RESTORE_FAILED");
  }
}
try {
  const result = sql(
    fixture +
      `update auth.users set instance_id='00000000-0000-0000-0000-000000000000',aud='authenticated',role='authenticated',created_at=now()-interval '33 days',updated_at=now(),encrypted_password='',confirmation_token='',recovery_token='',email_change_token_new='',email_change='' where id in(md5('retirement-orphan')::uuid,md5('retirement-operator')::uuid);
       insert into public.subject_contacts(subject_id,kind,normalized_value,status,provider)
        select subject_id,'email','retirement-orphan@example.invalid','pending','supabase' from target;
       select (select subject_id from target)::text||':'||(select subject_id from actor)::text||':'||md5('retirement-orphan')::uuid::text; commit;`,
  );
  prepared = true;
  [subject, operator, provider] = result.split(":") as [string, string, string];
  invariant(
    [subject, operator, provider].every((id) => /^[a-f0-9-]{36}$/.test(id)),
    "ORPHAN_RETIREMENT_FIXTURE_IDS_INVALID",
  );
  authority = JSON.parse(
    sql(
      `select json_build_object('p_provider_subject',md5('retirement-operator')::uuid,'p_provider_session_id',md5('retirement-operator-session')::uuid,'p_verified_email','retirement-operator@example.invalid','p_session_id',md5('retirement-application-session')::uuid,'p_subject_id','${operator}','p_tenant_id','10000000-0000-4000-8000-000000000001');`,
    ),
  );
  const dump = execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_meneer-health-local",
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-Fc",
      "--no-owner",
      "--no-acl",
      ...[
        "public",
        "identity_private",
        "intake_private",
        "commerce_private",
        "audit_private",
        "payments_private",
        "fulfilment_private",
        "lifecycle_private",
        "measurement_private",
      ].flatMap((schema) => ["-n", schema]),
    ],
    { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 },
  );
  const archiveKey = crypto.getRandomValues(new Uint8Array(32));
  const archive = await encryptRecoveryArchive(
    {
      contract: "recovery.manifest",
      version: 1,
      backupId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      environment: "local",
      schemaVersion: "20261009114715",
      recordCounts: { orphan_contact: 1 },
      checksum: createHash("sha256").update(dump).digest("hex"),
    },
    Uint8Array.from(dump),
    archiveKey,
    "disposable-local-orphan-key",
  );
  const command = JSON.parse(
    sql(
      `select json_build_object('p_email_invitation_id',md5('retirement-email')::uuid,'p_request_key',md5('retirement-command')::uuid);`,
    ),
  );
  const requests = await Promise.allSettled(
    Array.from({ length: 8 }, () =>
      client.rpc("reserve_mobile_orphan_retirement", { ...authority, ...command }),
    ),
  );
  invariant(
    requests.every((r) => r.status === "fulfilled" && !r.value.error),
    "ORPHAN_RETIREMENT_CONCURRENT_REQUEST_FAILED",
  );
  const reservations = requests.map((r) => (r.status === "fulfilled" ? r.value.data : null));
  invariant(
    reservations.filter((r) => r?.dispatch === true).length === 1 &&
      reservations.every((r) => r?.operationId === reservations[0]?.operationId),
    "ORPHAN_RETIREMENT_ONE_DISPATCH_REQUIRED",
  );
  operation = reservations[0].operationId;
  // Concurrent Auth confirmation and domain insertion are rejected while quarantine is durable.
  const races = await Promise.allSettled([
    client.auth.admin.updateUserById(provider, { email_confirm: true }),
    new Promise<{ error: boolean }>((resolve, reject) => {
      const child = execFile(
        "docker",
        [
          "exec",
          "-i",
          "supabase_db_meneer-health-local",
          "psql",
          "-U",
          "postgres",
          "-d",
          "postgres",
          "-X",
          "-qAt",
          "-v",
          "ON_ERROR_STOP=1",
        ],
        { timeout: 30_000 },
        (error, _stdout, stderr) => {
          if (error && stderr.includes("MOBILE_ORPHAN_QUARANTINED")) resolve({ error: true });
          else reject(new Error("ORPHAN_RETIREMENT_EXPECTED_NATIVE_QUARANTINE"));
        },
      );
      child.stdin?.end(
        `begin; insert into public.tenant_memberships(tenant_id,subject_id,role,status) values('${authority.p_tenant_id}','${subject}','patient','invited'); commit;`,
      );
    }),
  ]);
  invariant(
    races.every((r) => r.status === "fulfilled" && r.value.error),
    "ORPHAN_RETIREMENT_QUARANTINE_BYPASSED",
  );
  invariant(
    sql(
      `select count(*) from auth.users where id='${provider}' and email_confirmed_at is null;`,
    ) === "1",
    "ORPHAN_RETIREMENT_CONFIRMATION_CHANGED",
  );
  const uncertain = await client.rpc("advance_mobile_orphan_retirement", {
    ...authority,
    p_operation_id: operation,
    p_action: "uncertain",
  });
  invariant(
    !uncertain.error && uncertain.data === "uncertain",
    "ORPHAN_RETIREMENT_UNCERTAINTY_REQUIRED",
  );
  // Managed Auth API, not a SQL DELETE. No email, OTP or real user is involved.
  const removed = await client.auth.admin.deleteUser(provider);
  invariant(!removed.error, "ORPHAN_RETIREMENT_MANAGED_DELETE_FAILED");
  const absent = await client.auth.admin.getUserById(provider);
  invariant(
    absent.error?.status === 404 && absent.error.code === "user_not_found",
    "ORPHAN_RETIREMENT_INDEPENDENT_ABSENCE_REQUIRED",
  );
  const finish = await client.rpc("advance_mobile_orphan_retirement", {
    ...authority,
    p_operation_id: operation,
    p_action: "provider_absent",
    p_target_provider_subject: provider,
  });
  invariant(
    !finish.error && finish.data === "copies_pending",
    "ORPHAN_RETIREMENT_COPY_RECONCILIATION_REQUIRED",
  );
  invariant(
    sql(`select status from public.subjects where id='${subject}';`) === "erased",
    "ORPHAN_RETIREMENT_TOMBSTONE_REQUIRED",
  );
  const replay = await client.rpc("reserve_mobile_orphan_retirement", { ...authority, ...command });
  invariant(
    !replay.error && replay.data.dispatch === false && replay.data.state === "copies_pending",
    "ORPHAN_RETIREMENT_NO_REPEAT_REQUIRED",
  );
  // Restore the encrypted older snapshot OFFLINE, then apply a fresh independent disposition.
  const current = sql(
    `select jsonb_build_object('observedAt',clock_timestamp(),'retirements',jsonb_agg(jsonb_build_object('operationId',id,'tenantId',tenant_id,'emailInvitationId',email_invitation_id,'subjectId',subject_id,'providerSubjectId',provider_subject_id,'contactDigest',contact_digest,'providerAbsentAt',provider_absent_at))) from identity_private.mobile_orphan_retirements where id='${operation}' and state='copies_pending';`,
  );
  const recovered = await decryptRecoveryArchive(archive, archiveKey);
  invariant(
    createHash("sha256").update(recovered.payload).digest("hex") ===
      createHash("sha256").update(dump).digest("hex"),
    "ORPHAN_RETIREMENT_ARCHIVE_CHECKSUM_FAILED",
  );
  execFileSync(
    "docker",
    ["exec", "supabase_db_meneer-health-local", "createdb", "-U", "postgres", restoredDatabase],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  restoreCreated = true;
  restoreSql(
    "drop schema public; create schema extensions; create extension pgcrypto with schema extensions;",
  );
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_meneer-health-local",
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      restoredDatabase,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
    ],
    {
      input: Buffer.from(recovered.payload),
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  invariant(
    restoreSql(`select count(*) from public.subject_contacts where subject_id='${subject}';`) ===
      "1",
    "ORPHAN_RETIREMENT_OLD_CONTACT_FIXTURE_REQUIRED",
  );
  invariant(
    restoreSql("select count(*) from pg_namespace where nspname='auth';") === "0",
    "ORPHAN_RETIREMENT_AUTH_MUST_NOT_BE_RESTORED",
  );
  restoreSql(
    `begin; update public.tenants set status='suspended' where status='active'; update public.identity_sessions set status='revoked',revoked_at=clock_timestamp() where status='active'; update public.tenant_memberships set status='revoked' where status='active'; update public.access_assignments set status='revoked' where status='active'; commit;`,
  );
  const literal = current.replaceAll("'", "''");
  invariant(
    restoreSql(
      `select identity_private.reconcile_restored_mobile_orphans('${literal}'::jsonb);`,
    ) === "1",
    "ORPHAN_RETIREMENT_CURRENT_DISPOSITION_REQUIRED",
  );
  invariant(
    restoreSql(`select count(*) from public.subject_contacts where subject_id='${subject}';`) ===
      "0" && restoreSql(`select status from public.subjects where id='${subject}';`) === "erased",
    "ORPHAN_RETIREMENT_OLD_CONTACT_RESURRECTED",
  );
  invariant(
    restoreSql(
      `select identity_private.reconcile_restored_mobile_orphans('${literal}'::jsonb);`,
    ) === "1",
    "ORPHAN_RETIREMENT_RESTORE_RETRY_UNSAFE",
  );
} finally {
  if (restoreCreated)
    execFileSync(
      "docker",
      ["exec", "supabase_db_meneer-health-local", "dropdb", "-U", "postgres", restoredDatabase],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  if (prepared) {
    sql(`begin; set local lock_timeout='5s'; lock table ${tables.join(",")} in access exclusive mode;
      ${guards.map((g) => `alter table ${g.relation} disable trigger ${g.name};`).join("\n")}
      delete from identity_private.mobile_orphan_retirement_events where operation_id in(select id from identity_private.mobile_orphan_retirements where email_invitation_id=md5('retirement-email')::uuid);
      delete from identity_private.mobile_orphan_retirements where email_invitation_id=md5('retirement-email')::uuid;
      delete from identity_private.mobile_identity_creation_receipts where email_invitation_id=md5('retirement-email')::uuid;
      delete from identity_private.mobile_email_exchanges where email_invitation_id=md5('retirement-email')::uuid;
      delete from identity_private.mobile_invitation_claims where id=md5('retirement-claim')::uuid;
      delete from identity_private.mobile_invitation_tokens where id=md5('retirement-token')::uuid;
      delete from identity_private.mobile_invitations where id=md5('retirement-mobile')::uuid;
      delete from public.identity_invitations where id=md5('retirement-email')::uuid;
      delete from public.identity_sessions where id=md5('retirement-application-session')::uuid;
      delete from public.access_assignments where subject_id='${operator}';
      delete from public.tenant_memberships where subject_id in('${operator}','${subject}');
      delete from auth.users where id in(md5('retirement-operator')::uuid,md5('retirement-orphan')::uuid);
      delete from auth.audit_log_entries where payload->>'action'='user_deleted'
        and payload->'traits'->>'user_id'='${provider}' and payload->'traits'->>'user_email'='retirement-orphan@example.invalid';
      delete from public.subject_contacts where subject_id in('${operator}','${subject}');
      delete from public.external_identities where subject_id in('${operator}','${subject}');
      delete from public.subjects where id in('${operator}','${subject}');
      ${guards.map((g) => `alter table ${g.relation} enable trigger ${g.name};`).join("\n")}
      commit;`);
    invariant(
      validateMobileSecurityBaseline(sql(mobileSecurityBaselineSql)) === baseline,
      "ORPHAN_RETIREMENT_BASELINE_NOT_RESTORED",
    );
  }
}
console.log(
  JSON.stringify({
    exercise: "local-mobile-orphan-retirement",
    competingReservations: 8,
    dispatchOwners: 1,
    quarantinedConfirmation: true,
    managedProviderDelete: true,
    independentAbsence: true,
    encryptedOlderRestoreReconciled: true,
    state: "copies_pending",
    baselineRestored: true,
    emailsSent: 0,
    hosted: false,
  }),
);
