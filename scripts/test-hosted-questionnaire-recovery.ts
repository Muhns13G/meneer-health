import { execFileSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { encryptIntake } from "../src/server/intake/intake-envelope";
import { encryptRecoveryArchive } from "../src/application/recovery/recovery-archive";
import { createSupabaseManagedIdentityProvider } from "../src/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseIdentitySessionRepository } from "../src/adapters/identity/supabase/supabase-identity-session-repository";
import { recoveryBaselineSql, validateRecoveryBaseline } from "./lib/sprint13-recovery-rehearsal";

// Explicitly approved TD-065 fixture/cleanup scope only. No Worker release, emails or live data.
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
invariant(
  process.env.QUESTIONNAIRE_RECOVERY_HOSTED_CONFIRM === "isolated-synthetic-export-restore-cleanup",
  "HOSTED_QUESTIONNAIRE_RECOVERY_CONFIRM_REQUIRED",
);
const project = "gibfpolrdjotwvewgfsz";
const api = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const dbUrl = process.env.SUPABASE_DB_URL;
invariant(
  api === `https://${project}.supabase.co` && secret && publishable && dbUrl,
  "HOSTED_QUESTIONNAIRE_RECOVERY_CONFIGURATION_INVALID",
);
const connection = new URL(dbUrl);
invariant(
  ["postgresql:", "postgres:"].includes(connection.protocol) &&
    connection.searchParams.get("sslmode") === "require" &&
    ((connection.hostname === `db.${project}.supabase.co` && connection.username === "postgres") ||
      (connection.hostname === "aws-0-eu-west-2.pooler.supabase.com" &&
        connection.username === `postgres.${project}` &&
        connection.port === "5432")),
  "HOSTED_QUESTIONNAIRE_RECOVERY_DATABASE_REJECTED",
);
// Pass individual libpq defaults, not a URI as PGDATABASE. Keep credentials out of argv
// in both the host Docker command and the database process inside its disposable container.
const databaseEnvironment = {
  ...process.env,
  PGHOST: connection.hostname,
  PGPORT: connection.port || "5432",
  PGUSER: decodeURIComponent(connection.username),
  PGPASSWORD: decodeURIComponent(connection.password),
  PGDATABASE: decodeURIComponent(connection.pathname.slice(1)),
  PGSSLMODE: "require",
};
const databaseEnvironmentArguments = [
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
  "PGSSLMODE",
].flatMap((name) => ["-e", name]);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(api, secret, options);
const provider = createSupabaseManagedIdentityProvider({ url: api, secretKey: secret });
const sessions = new SupabaseIdentitySessionRepository(admin);
const tenant = randomUUID();
const ids: {
  intake: string;
  publication: string;
  case: string;
  snapshots: string[];
  approval: string;
}[] = Array.from({ length: 2 }, () => ({
  intake: randomUUID(),
  publication: randomUUID(),
  case: randomUUID(),
  snapshots: [randomUUID(), randomUUID()],
  approval: randomUUID(),
}));
const ring = {
  current: "synthetic-recovery",
  keys: { "synthetic-recovery": crypto.getRandomValues(new Uint8Array(32)) },
};
const recoveryKey = crypto.getRandomValues(new Uint8Array(32));
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
type Session = Awaited<ReturnType<typeof provider.verifyWorkforceTotp>>;
type Actor = {
  role: "patient" | "clinician" | "admin" | "auditor";
  email: string;
  providerId: string;
  subject: string;
  session?: Session;
  appSession?: string;
  factor?: string;
  verifiedProviderSession?: string;
};
const actors: Actor[] = [];
const providerIds: string[] = [];
let baseline: string | undefined;
let tenantCreated = false;
const started = Date.now();
function command(args: string[], input?: string | Buffer, env?: NodeJS.ProcessEnv) {
  try {
    return execFileSync("docker", args, {
      input,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    const diagnostic = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    const category =
      [
        "password authentication failed",
        "could not translate host name",
        "Network is unreachable",
        "Connection refused",
        "permission denied",
        "does not exist",
        "violates check constraint",
        "violates foreign key",
        "syntax error",
        "SSL error",
        "invalid URI query parameter",
        "Tenant or user not found",
        "could not connect",
        "Connection timed out",
        "server closed the connection",
        "Cannot connect to the Docker daemon",
      ].find((text) => diagnostic.includes(text)) ?? "command failed";
    throw new Error(
      `HOSTED_QUESTIONNAIRE_RECOVERY_DATABASE_FAILED:${category.replaceAll(" ", "_")}`,
    );
  }
}
function sql(statement: string) {
  return command(
    [
      "run",
      "--rm",
      "-i",
      ...databaseEnvironmentArguments,
      "postgres:17.6-alpine",
      "psql",
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    `set statement_timeout='45s';set lock_timeout='5s';${statement}`,
    databaseEnvironment,
  )
    .toString()
    .trim();
}
function literal(value: unknown) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}
function totp(secret: string) {
  let bits = "";
  for (const c of secret.replaceAll("=", "").toUpperCase()) {
    const i = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    invariant(i >= 0, "HOSTED_RECOVERY_TOTP_INVALID");
    bits += i.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  return ((h.readUInt32BE(h[h.length - 1]! & 15) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
async function signIn(actor: Actor) {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: actor.email });
  invariant(!link.error, "HOSTED_RECOVERY_CODE_FAILED");
  const client = createClient(api!, publishable!, options);
  const result = await client.auth.verifyOtp({
    type: "email",
    token_hash: link.data.properties.hashed_token,
  });
  invariant(!result.error && result.data.session, "HOSTED_RECOVERY_VERIFICATION_FAILED");
  return {
    accessToken: result.data.session.access_token,
    refreshToken: result.data.session.refresh_token,
    expiresAt: new Date(result.data.session.expires_at! * 1000),
  };
}
async function enrol(actor: Actor) {
  const emailSession = await signIn(actor);
  invariant(
    (await provider.verifyAccessToken(emailSession.accessToken)).assurance === "aal1",
    "HOSTED_RECOVERY_OLD_ASSURANCE_RESTORED",
  );
  invariant(
    (await provider.listWorkforceTotp(emailSession)).length === 0,
    "HOSTED_RECOVERY_OLD_FACTOR_RESTORED",
  );
  const factor = await provider.enrollWorkforceTotp(emailSession, "Synthetic TD065 recovery");
  invariant(factor.factorId !== actor.factor, "HOSTED_RECOVERY_FACTOR_REUSED");
  const challenge = await provider.challengeWorkforceTotp(emailSession, factor.factorId);
  actor.session = await provider.verifyWorkforceTotp(
    emailSession,
    factor.factorId,
    challenge,
    totp(factor.secret),
  );
  actor.factor = factor.factorId;
  const identity = await provider.verifyAccessToken(actor.session.accessToken);
  actor.verifiedProviderSession = identity.providerSessionId;
  invariant(identity.assurance === "aal2", "HOSTED_RECOVERY_FRESH_MFA_FAILED");
  actor.appSession = (
    await sessions.start({
      subjectId: actor.subject,
      providerIdentity: identity,
      sessionClass: actor.role === "admin" ? "privileged" : "workforce",
      observedAt: new Date(),
    })
  ).id;
}
function context(actor: Actor) {
  invariant(actor.appSession && actor.session, "HOSTED_RECOVERY_CONTEXT_MISSING");
  invariant(actor.verifiedProviderSession, "HOSTED_RECOVERY_PROVIDER_SESSION_MISSING");
  return {
    tenantId: tenant,
    subjectId: actor.subject,
    sessionId: actor.appSession,
    providerSubject: actor.providerId,
    providerSessionId: actor.verifiedProviderSession,
    verifiedEmail: actor.email,
    purpose:
      actor.role === "clinician"
        ? "care_delivery"
        : actor.role === "admin"
          ? "security_administration"
          : "privacy_review",
  };
}
async function rpc(name: string, input: Record<string, unknown>, deny = false) {
  const result = await admin.rpc(name, input);
  if (deny) {
    invariant(result.error?.code === "42501", "HOSTED_RECOVERY_EXPECTED_AUTHORITY_DENIAL");
    return null;
  }
  invariant(!result.error, `HOSTED_RECOVERY_RPC_FAILED_${name}`);
  return result.data;
}
try {
  baseline = validateRecoveryBaseline(sql(recoveryBaselineSql));
  invariant(
    sql(`select (select count(*) from auth.users)=0 and (select count(*) from public.subjects)=0
    and (select count(*) from intake_private.intakes)=0 and (select count(*) from public.tenants)=1
    and exists(select 1 from public.tenants where slug='meneer-pilot' and status='suspended');`) ===
      "t",
    "HOSTED_RECOVERY_REQUIRES_EMPTY_PILOT_BASELINE",
  );
  for (const role of ["patient", "clinician", "admin", "auditor"] as const) {
    const email = `td065-${role}-${tenant}@example.invalid`;
    const created = await admin.auth.admin.createUser({ email, email_confirm: false });
    invariant(!created.error && created.data.user, "HOSTED_RECOVERY_AUTH_CREATE_FAILED");
    providerIds.push(created.data.user.id);
    const actor: Actor = {
      role,
      email,
      providerId: created.data.user.id,
      subject: sql(
        `select subject_id from public.external_identities where provider='supabase' and provider_subject='${created.data.user.id}';`,
      ),
    };
    invariant(/^[a-f0-9-]{36}$/.test(actor.subject), "HOSTED_RECOVERY_SUBJECT_MISSING");
    actors.push(actor);
    if (role !== "patient") await enrol(actor);
    else await signIn(actor);
  }
  const [patient, clinical, security, auditor] = actors as [Actor, Actor, Actor, Actor];
  sql(
    `insert into public.tenants(id,slug,display_name,status)values('${tenant}','synthetic-td065-${tenant}','Synthetic recovery only','active');`,
  );
  tenantCreated = true;
  for (const a of actors)
    sql(`insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
    values('${tenant}','${a.subject}','${a.role}','active',clock_timestamp(),clock_timestamp()+interval '1 hour','${a.role === "admin" ? clinical.subject : security.subject}');`);
  for (const [index, id] of ids.entries()) {
    const envelopes = await Promise.all(
      id.snapshots.map((snapshotId, version) =>
        encryptIntake(
          { syntheticOnly: true, marker: `questionnaire-${index}-${version}` },
          {
            tenantId: tenant,
            subjectId: patient.subject,
            intakeId: id.intake,
            snapshotId,
            collectionVersion: "1.1.0",
            controlVersion: "1.0.0",
          },
          ring,
        ),
      ),
    );
    sql(`begin;
    insert into public.operations_cases(id,tenant_id,subject_id)values('${id.case}','${tenant}','${patient.subject}');
    insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,
      recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,
      urgent_guidance,after_hours_guidance,effective_at,expires_at,status)
    values('${id.publication}','${tenant}','1.1.0','1.0.0',repeat('a',64),'Synthetic recovery only','Synthetic recovery only',gen_random_uuid(),
      '${clinical.subject}','${security.subject}','${clinical.subject}','${security.subject}',300,gen_random_uuid(),'Synthetic only','Synthetic only',
      clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','published');
    insert into intake_private.intakes(id,tenant_id,subject_id,case_id,publication_id,version,snapshot_id,envelope,state)
    values('${id.intake}','${tenant}','${patient.subject}','${id.case}','${id.publication}',2,'${id.snapshots[1]}',${literal(envelopes[1])},'submitted');
    insert into intake_private.snapshots(id,intake_id,version,envelope,publication_id,profile_version,receipt_hash,previous_snapshot_id,actor_subject_id)
    values('${id.snapshots[0]}','${id.intake}',1,${literal(envelopes[0])},'${id.publication}',1,repeat('a',64),null,'${patient.subject}'),
      ('${id.snapshots[1]}','${id.intake}',2,${literal(envelopes[1])},'${id.publication}',1,repeat('b',64),'${id.snapshots[0]}','${patient.subject}'); commit;`);
    // Initial approval/activation uses genuine provider MFA, not a directly inserted paid/access flag.
    const approval = await rpc("approve_medical_grant", {
      p_context: context(clinical),
      p_command: {
        intakeId: id.intake,
        snapshotId: id.snapshots[1],
        targetSubjectId: auditor.subject,
        purpose: "medical_rights",
        fields: ["contact"],
        rosterReference: randomUUID(),
        expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
        requestKey: randomUUID(),
      },
    });
    id.approval = String(approval);
    await rpc("activate_medical_grant", { p_context: context(security), p_approval_id: approval });
  }
  const fingerprint = sql(`select md5(string_agg(row_data,'|' order by row_data)) from (
    select 'intake:'||to_jsonb(i)::text row_data from intake_private.intakes i union all
    select 'snapshot:'||to_jsonb(s)::text from intake_private.snapshots s union all
    select 'grant:'||to_jsonb(g)::text from intake_private.access_grants g union all
    select 'approval:'||to_jsonb(a)::text from intake_private.grant_approvals a) rows;`);
  const dump = command(
    [
      "run",
      "--rm",
      ...databaseEnvironmentArguments,
      "postgres:17.6-alpine",
      "pg_dump",
      "-Fc",
      ...schemas.flatMap((s) => ["-n", s]),
    ],
    undefined,
    databaseEnvironment,
  );
  const archive = await encryptRecoveryArchive(
    {
      contract: "recovery.manifest",
      version: 1,
      backupId: randomUUID(),
      createdAt: new Date().toISOString(),
      environment: "production",
      schemaVersion: sql("select max(version) from supabase_migrations.schema_migrations;"),
      recordCounts: { intakes: 2, snapshots: 4, medical_grants: 2, grant_approvals: 2 },
      checksum: createHash("sha256").update(dump).digest("hex"),
    },
    Uint8Array.from(dump),
    recoveryKey,
    "disposable-questionnaire-recovery",
  );
  const ledger = ids.map((id, i) => ({
    intakeId: id.intake,
    tenantId: tenant,
    subjectId: patient.subject,
    version: 3,
    state: i === 0 ? "deleted" : "restricted",
    safetyHold: i === 1,
    lifecycleHold: i === 1,
  }));
  sql(`begin; lock table intake_private.intakes,intake_private.access_grants in access exclusive mode;
    do $$begin if (select count(*) from intake_private.intakes)<>2 or exists(select 1 from intake_private.intakes where tenant_id<>'${tenant}')
      then raise exception 'HOSTED_RECOVERY_FIXTURE_SCOPE_CHANGED';end if;end$$;
    select intake_private.quarantine_restored_medical_intakes();
    select intake_private.reconcile_restored_medical_intakes('${randomUUID()}','${randomUUID()}',${literal(ledger)});commit;`);
  const currentLedger = JSON.parse(
    sql(`select jsonb_agg(jsonb_build_object(
    'intakeId',id,'tenantId',tenant_id,'subjectId',subject_id,'version',version,
    'state',state,'safetyHold',safety_hold,'lifecycleHold',lifecycle_hold) order by id)
    from intake_private.intakes where tenant_id='${tenant}';`),
  );
  invariant(currentLedger.length === 2, "HOSTED_RECOVERY_CURRENT_LEDGER_MISSING");
  const output = execFileSync(
    "bun",
    [
      "--no-env-file",
      "run",
      "scripts/test-questionnaire-disaster-recovery.ts",
      "--approved-hosted-artifact",
    ],
    {
      input: JSON.stringify({
        source: "approved-td065-hosted-synthetic",
        project,
        tenant,
        subject: patient.subject,
        ids,
        archive,
        recoveryKey: Buffer.from(recoveryKey).toString("base64"),
        medicalKey: Buffer.from(ring.keys[ring.current as "synthetic-recovery"]).toString("base64"),
        fingerprint,
        ledger: currentLedger,
      }),
      // Deliberately omit all application/provider variables despite the global env augmentation.
      env: { PATH: process.env.PATH, HOME: process.env.HOME } as unknown as NodeJS.ProcessEnv,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
      maxBuffer: 128 * 1024 * 1024,
    },
  )
    .toString()
    .trim();
  invariant(JSON.parse(output).baselineUnchanged === true, "HOSTED_RECOVERY_LOCAL_RESTORE_FAILED");
  for (const actor of actors.filter((a) => a.role !== "patient")) {
    const oldSession = actor.session!;
    await admin.auth.admin.signOut(oldSession.accessToken, "global");
    sql(`update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='synthetic provider loss'
      where subject_id='${actor.subject}' and status='active';update public.tenant_memberships set status='revoked' where tenant_id='${tenant}' and subject_id='${actor.subject}';`);
    const removed = await admin.auth.admin.deleteUser(actor.providerId);
    invariant(!removed.error, "HOSTED_RECOVERY_PROVIDER_REMOVAL_FAILED");
    let rejected = false;
    try {
      await provider.verifyAccessToken(oldSession.accessToken);
    } catch {
      rejected = true;
    }
    invariant(rejected, "HOSTED_RECOVERY_OLD_TOKEN_ACCEPTED");
    const replacement = await admin.auth.admin.createUser({
      email: actor.email,
      email_confirm: false,
    });
    invariant(
      !replacement.error && replacement.data.user,
      "HOSTED_RECOVERY_PROVIDER_RECREATE_FAILED",
    );
    providerIds.push(replacement.data.user.id);
    actor.providerId = replacement.data.user.id;
    invariant(
      sql(
        `select subject_id from public.external_identities where provider='supabase' and provider_subject='${actor.providerId}';`,
      ) === actor.subject,
      "HOSTED_RECOVERY_STABLE_SUBJECT_CHANGED",
    );
    await enrol(actor);
    await rpc(
      "read_medical_intake",
      { p_context: context(actor), p_intake_id: ids[1]!.intake, p_purpose: "medical_rights" },
      true,
    );
    sql(`update public.tenant_memberships set status='active',valid_from=clock_timestamp(),expires_at=clock_timestamp()+interval '15 minutes',
      approved_by_subject_id='${actor.role === "admin" ? clinical.subject : security.subject}' where tenant_id='${tenant}' and subject_id='${actor.subject}';`);
  }
  sql(
    `update intake_private.intakes set restore_quarantined=false where tenant_id='${tenant}' and state='restricted';`,
  );
  await rpc(
    "activate_medical_grant",
    { p_context: context(security), p_approval_id: ids[1]!.approval },
    true,
  );
  await rpc(
    "read_medical_intake",
    { p_context: context(auditor), p_intake_id: ids[1]!.intake, p_purpose: "medical_rights" },
    true,
  );
  const fresh = await rpc("approve_medical_grant", {
    p_context: context(clinical),
    p_command: {
      intakeId: ids[1]!.intake,
      snapshotId: ids[1]!.snapshots[1],
      targetSubjectId: auditor.subject,
      purpose: "medical_rights",
      fields: ["contact"],
      rosterReference: randomUUID(),
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
      requestKey: randomUUID(),
    },
  });
  await rpc(
    "read_medical_intake",
    { p_context: context(auditor), p_intake_id: ids[1]!.intake, p_purpose: "medical_rights" },
    true,
  );
  await rpc("activate_medical_grant", { p_context: context(security), p_approval_id: fresh });
  const view = await rpc("read_medical_intake", {
    p_context: context(auditor),
    p_intake_id: ids[1]!.intake,
    p_purpose: "medical_rights",
  });
  invariant(
    JSON.stringify(view.fields) === '["contact"]',
    "HOSTED_RECOVERY_FRESH_FIELD_SCOPE_FAILED",
  );
  await rpc(
    "read_medical_intake",
    { p_context: context(auditor), p_intake_id: ids[0]!.intake, p_purpose: "medical_rights" },
    true,
  );
} finally {
  // Resolve manifested identities before deletion, including a partially provisioned actor.
  const cleanupSubjects: string[] = providerIds.length
    ? JSON.parse(
        sql(`select coalesce(jsonb_agg(distinct subject_id),'[]'::jsonb)
      from public.external_identities where provider='supabase' and provider_subject in
      (${providerIds.map((id) => `'${id}'`).join(",")});`),
      )
    : [];
  for (const actor of actors)
    if (/^[a-f0-9-]{36}$/.test(actor.subject) && !cleanupSubjects.includes(actor.subject))
      cleanupSubjects.push(actor.subject);
  tenantCreated =
    baseline !== undefined &&
    (tenantCreated ||
      sql(`select exists(select 1 from public.tenants where id='${tenant}');`) === "t");
  // Revoke current sessions before provider deletion. Old provider IDs may already be absent.
  for (const a of actors)
    if (a.session) await admin.auth.admin.signOut(a.session.accessToken, "global");
  if (cleanupSubjects.length)
    sql(`update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='synthetic cleanup'
    where subject_id in(${cleanupSubjects.map((id) => `'${id}'`).join(",")}) and status='active';`);
  for (const id of providerIds) {
    const removed = await admin.auth.admin.deleteUser(id);
    if (removed.error)
      invariant(
        sql(`select count(*) from auth.users where id='${id}';`) === "0",
        "HOSTED_RECOVERY_AUTH_CLEANUP_FAILED",
      );
  }
  if (tenantCreated)
    sql(`begin;
    lock table intake_private.access_grants,intake_private.grant_approvals,intake_private.restore_dispositions,intake_private.snapshots,
      intake_private.intakes,intake_private.publications,public.audit_events,public.audit_chain_heads,public.operations_cases,
      public.identity_sessions,public.tenant_memberships in access exclusive mode;
    alter table intake_private.access_grants disable trigger intake_grant_immutable;
    alter table intake_private.grant_approvals disable trigger grant_approvals_append_only;
    alter table intake_private.restore_dispositions disable trigger restore_dispositions_append_only;
    alter table intake_private.snapshots disable trigger snapshots_append_only;
    alter table intake_private.publications disable trigger intake_publication_immutable;
    alter table public.audit_events disable trigger audit_events_append_only;
    delete from intake_private.access_grants where intake_id in(select id from intake_private.intakes where tenant_id='${tenant}');
    delete from intake_private.grant_approvals where intake_id in(select id from intake_private.intakes where tenant_id='${tenant}');
    delete from intake_private.restore_dispositions where intake_id in(select id from intake_private.intakes where tenant_id='${tenant}');
    delete from intake_private.snapshots where intake_id in(select id from intake_private.intakes where tenant_id='${tenant}');
    delete from intake_private.intakes where tenant_id='${tenant}';delete from intake_private.publications where tenant_id='${tenant}';
    delete from public.audit_events where tenant_id='${tenant}';delete from public.audit_chain_heads where tenant_id='${tenant}';
    delete from public.operations_cases where tenant_id='${tenant}';delete from public.tenant_memberships where tenant_id='${tenant}';
    delete from public.tenants where id='${tenant}';
    alter table intake_private.access_grants enable trigger intake_grant_immutable;
    alter table intake_private.grant_approvals enable trigger grant_approvals_append_only;
    alter table intake_private.restore_dispositions enable trigger restore_dispositions_append_only;
    alter table intake_private.snapshots enable trigger snapshots_append_only;
    alter table intake_private.publications enable trigger intake_publication_immutable;
    alter table public.audit_events enable trigger audit_events_append_only;commit;`);
  if (cleanupSubjects.length)
    sql(`begin;delete from public.identity_sessions where subject_id in(${cleanupSubjects.map((id) => `'${id}'`).join(",")});
    delete from public.external_identities where subject_id in(${cleanupSubjects.map((id) => `'${id}'`).join(",")});
    delete from public.subject_contacts where subject_id in(${cleanupSubjects.map((id) => `'${id}'`).join(",")});
    delete from public.subjects where id in(${cleanupSubjects.map((id) => `'${id}'`).join(",")});commit;`);
  if (baseline)
    invariant(
      validateRecoveryBaseline(sql(recoveryBaselineSql)) === baseline,
      "HOSTED_RECOVERY_BASELINE_CHANGED",
    );
}
console.log(
  JSON.stringify({
    exercise: "td065-hosted-questionnaire-recovery",
    syntheticIntakes: 2,
    syntheticSnapshots: 4,
    encryptedHostedExportAndIsolatedRestore: true,
    currentErasureAndHoldsReconciled: true,
    providerLossStableRelink: true,
    freshTotpAndIndependentMedicalGrant: true,
    oldTokenAndApprovalDenied: true,
    exactBaselineRestored: true,
    elapsedMilliseconds: Date.now() - started,
    emailsSent: 0,
    paymentsCreated: 0,
    workerSettingsChanged: false,
    pilotActivated: false,
  }),
);
