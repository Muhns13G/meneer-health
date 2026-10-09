import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { encryptIntake, decryptIntake } from "../src/server/intake/intake-envelope";
import type { IntakeScope } from "../contracts/medical-intake";
import {
  encryptRecoveryArchive,
  decryptRecoveryArchive,
} from "../src/application/recovery/recovery-archive";
import {
  assertLocalRecoveryEnvironment,
  recoveryBaselineSql,
  validateRecoveryBaseline,
} from "./lib/sprint13-recovery-rehearsal";

// Custodian-only local restore evidence. Direct synthetic fixtures are not onboarding/grant proof.
assertLocalRecoveryEnvironment(process.env);
const container = "supabase_db_meneer-health-local";
const source = `questionnaire_source_${randomUUID().replaceAll("-", "")}`;
const destination = `questionnaire_restore_${randomUUID().replaceAll("-", "")}`;
const created: string[] = [];
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
const artifactSchema = z
  .object({
    source: z.literal("approved-td065-hosted-synthetic"),
    project: z.literal("gibfpolrdjotwvewgfsz"),
    tenant: z.uuid(),
    subject: z.uuid(),
    ids: z
      .array(
        z
          .object({
            intake: z.uuid(),
            publication: z.uuid(),
            case: z.uuid(),
            snapshots: z.array(z.uuid()).length(2),
            approval: z.uuid(),
          })
          .strict(),
      )
      .length(2),
    archive: z.unknown(),
    recoveryKey: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    medicalKey: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    fingerprint: z.string().regex(/^[a-f0-9]{32}$/),
    ledger: z
      .array(
        z
          .object({
            intakeId: z.uuid(),
            tenantId: z.uuid(),
            subjectId: z.uuid(),
            version: z.literal(3),
            state: z.enum(["deleted", "restricted"]),
            safetyHold: z.boolean(),
            lifecycleHold: z.boolean(),
          })
          .strict(),
      )
      .length(2),
  })
  .strict();
const imported = process.argv.includes("--approved-hosted-artifact")
  ? artifactSchema.parse(JSON.parse(readFileSync(0, "utf8")))
  : undefined;
const tenant = imported?.tenant ?? "10000000-0000-4000-8000-000000000001";
const subject = imported?.subject ?? "20000000-0000-4000-8000-000000000001";
const clinical = "20000000-0000-4000-8000-000000000002";
const security = "20000000-0000-4000-8000-000000000003";
const ids =
  imported?.ids ??
  Array.from({ length: 2 }, () => ({
    intake: randomUUID(),
    publication: randomUUID(),
    case: randomUUID(),
    snapshots: [randomUUID(), randomUUID()],
    approval: randomUUID(),
  }));
const ring = {
  current: "synthetic-recovery",
  keys: {
    "synthetic-recovery": imported
      ? Uint8Array.from(Buffer.from(imported.medicalKey, "base64"))
      : crypto.getRandomValues(new Uint8Array(32)),
  },
};
const recoveryKey = imported
  ? Uint8Array.from(Buffer.from(imported.recoveryKey, "base64"))
  : crypto.getRandomValues(new Uint8Array(32));
const started = Date.now();

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
function docker(args: string[], input?: string | Buffer) {
  try {
    return execFileSync("docker", args, {
      input,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120_000,
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    // Database diagnostics may contain decrypted fixtures or keys; never expose them.
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    const reason =
      [
        "permission denied",
        "does not exist",
        "already exists",
        "violates foreign key",
        "violates check constraint",
        "syntax error",
      ].find((value) => stderr.includes(value)) ?? "command failed";
    throw new Error(`QUESTIONNAIRE_RECOVERY_LOCAL_COMMAND_FAILED:${reason.replaceAll(" ", "_")}`);
  }
}
function sql(statement: string, database = "postgres") {
  invariant(
    database === "postgres" || created.includes(database),
    "QUESTIONNAIRE_RECOVERY_TARGET_REJECTED",
  );
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
    `set statement_timeout='45s'; set lock_timeout='5s'; ${statement}`,
  )
    .toString()
    .trim();
}
function literal(value: unknown) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
}
function dump(database: string) {
  invariant(
    database === "postgres" || created.includes(database),
    "QUESTIONNAIRE_RECOVERY_TARGET_REJECTED",
  );
  return docker([
    "exec",
    container,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    database,
    "-Fc",
    ...schemas.flatMap((schema) => ["-n", schema]),
  ]);
}
function restore(database: string, payload: Buffer) {
  invariant(
    [source, destination].includes(database) &&
      /^questionnaire_(source|restore)_[a-f0-9]{32}$/.test(database),
    "QUESTIONNAIRE_RECOVERY_TARGET_REJECTED",
  );
  docker(["exec", container, "createdb", "-U", "postgres", database]);
  created.push(database);
  sql(
    "drop schema public; create schema extensions; create extension pgcrypto with schema extensions;",
    database,
  );
  // Provider ACL grantors are not portable. Restore only into offline disposable databases,
  // then explicitly deny every application role before any evidence/read or release decision.
  docker(
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      database,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
    ],
    payload,
  );
  sql(
    schemas
      .map(
        (schema) => `revoke all on schema ${schema} from public,anon,authenticated,service_role;
    revoke all on all tables in schema ${schema} from public,anon,authenticated,service_role;
    revoke all on all functions in schema ${schema} from public,anon,authenticated,service_role;`,
      )
      .join("\n"),
    database,
  );
}
const fingerprint = `select md5(string_agg(row_data,'|' order by row_data)) from (
 select 'intake:'||to_jsonb(i)::text row_data from intake_private.intakes i union all
 select 'snapshot:'||to_jsonb(s)::text from intake_private.snapshots s union all
 select 'grant:'||to_jsonb(g)::text from intake_private.access_grants g union all
 select 'approval:'||to_jsonb(a)::text from intake_private.grant_approvals a) rows;`;
async function rejection(action: () => Promise<unknown>, code: string) {
  let rejected = false;
  try {
    await action();
  } catch {
    rejected = true;
  }
  invariant(rejected, code);
}
let baseline: string | undefined;
try {
  baseline = validateRecoveryBaseline(sql(recoveryBaselineSql));
  invariant(
    sql(`select (select count(*) from auth.users)=0
    and (select count(*) from intake_private.intakes)=0
    and not exists(select 1 from public.subject_contacts where kind='email' and normalized_value not like '%.invalid')
    and (select count(*) from public.tenants)=3
    and not exists(select 1 from public.tenants where slug not in('synthetic-alpha','synthetic-beta')
      and not (slug='meneer-pilot' and status='suspended'));`) === "t",
    "QUESTIONNAIRE_RECOVERY_REQUIRES_SYNTHETIC_BASELINE",
  );
  if (imported) {
    invariant(
      imported.ledger.every(
        (row) =>
          row.tenantId === tenant &&
          row.subjectId === subject &&
          ids.some((id) => id.intake === row.intakeId),
      ),
      "QUESTIONNAIRE_RECOVERY_ARTIFACT_SCOPE_REJECTED",
    );
    const recovered = await decryptRecoveryArchive(
      imported.archive as Parameters<typeof decryptRecoveryArchive>[0],
      recoveryKey,
    );
    invariant(
      createHash("sha256").update(recovered.payload).digest("hex") === recovered.manifest.checksum,
      "QUESTIONNAIRE_RECOVERY_IMPORTED_CHECKSUM_FAILED",
    );
    restore(source, Buffer.from(recovered.payload));
    invariant(
      sql(fingerprint, source) === imported.fingerprint,
      "QUESTIONNAIRE_RECOVERY_IMPORTED_ROWS_MISMATCH",
    );
  } else restore(source, dump("postgres"));
  for (const [index, id] of (imported ? [] : ids).entries()) {
    const envelopes = await Promise.all(
      id.snapshots.map(async (snapshotId, version) => {
        const scope: IntakeScope = {
          tenantId: tenant,
          subjectId: subject,
          intakeId: id.intake,
          snapshotId,
          collectionVersion: "1.1.0",
          controlVersion: "1.0.0",
        };
        return encryptIntake(
          { syntheticOnly: true, marker: `questionnaire-${index}-${version}` },
          scope,
          ring,
        );
      }),
    );
    sql(
      `begin;
      insert into public.operations_cases(id,tenant_id,subject_id) values('${id.case}','${tenant}','${subject}');
      insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,
        privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,primary_responder,
        fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at)
      values('${id.publication}','${tenant}','1.1.0','1.0.0',repeat('a',64),'Synthetic only','Synthetic only',
        gen_random_uuid(),'${clinical}','${security}','${clinical}','${security}',300,gen_random_uuid(),
        'Synthetic only','Synthetic only',clock_timestamp(),clock_timestamp()+interval '1 day');
      insert into intake_private.intakes(id,tenant_id,subject_id,case_id,publication_id,version,snapshot_id,envelope,state)
      values('${id.intake}','${tenant}','${subject}','${id.case}','${id.publication}',2,'${id.snapshots[1]}',${literal(envelopes[1])},'submitted');
      insert into intake_private.snapshots(id,intake_id,version,envelope,publication_id,profile_version,receipt_hash,previous_snapshot_id,actor_subject_id)
      values('${id.snapshots[0]}','${id.intake}',1,${literal(envelopes[0])},'${id.publication}',1,repeat('a',64),null,'${subject}'),
        ('${id.snapshots[1]}','${id.intake}',2,${literal(envelopes[1])},'${id.publication}',1,repeat('b',64),'${id.snapshots[0]}','${subject}');
      insert into intake_private.grant_approvals(id,intake_id,snapshot_id,target_subject_id,purpose,fields,roster_reference,clinical_approver,expires_at,request_key)
      values('${id.approval}','${id.intake}','${id.snapshots[1]}','${subject}','medical_rights',array['contact'],gen_random_uuid(),
        '${clinical}',clock_timestamp()+interval '1 hour',gen_random_uuid());
      insert into intake_private.access_grants(intake_id,actor_subject_id,purpose,fields,expires_at,clinical_approver,security_approver,roster_reference,snapshot_id,approval_id)
      values('${id.intake}','${subject}','medical_rights',array['contact'],clock_timestamp()+interval '1 hour',
        '${clinical}','${security}',gen_random_uuid(),'${id.snapshots[1]}','${id.approval}'); commit;`,
      source,
    );
  }
  const sourceFingerprint = sql(fingerprint, source);
  const payload = dump(source);
  const checksum = createHash("sha256").update(payload).digest("hex");
  const archive = await encryptRecoveryArchive(
    {
      contract: "recovery.manifest",
      version: 1,
      backupId: randomUUID(),
      createdAt: new Date().toISOString(),
      environment: "local",
      schemaVersion: sql("select max(version) from supabase_migrations.schema_migrations;"),
      recordCounts: { intakes: 2, snapshots: 4, medical_grants: 2, grant_approvals: 2 },
      checksum,
    },
    Uint8Array.from(payload),
    recoveryKey,
    "disposable-questionnaire-recovery",
  );
  await rejection(
    () => decryptRecoveryArchive(archive, crypto.getRandomValues(new Uint8Array(32))),
    "QUESTIONNAIRE_RECOVERY_WRONG_KEY_ACCEPTED",
  );
  const recovered = await decryptRecoveryArchive(archive, recoveryKey);
  invariant(
    createHash("sha256").update(recovered.payload).digest("hex") === checksum,
    "QUESTIONNAIRE_RECOVERY_ARCHIVE_CHECKSUM_FAILED",
  );
  // Independent current source state is newer than the archive: one deletion and one held restriction.
  const ledger =
    imported?.ledger ??
    ids.map((id, index) => ({
      intakeId: id.intake,
      tenantId: tenant,
      subjectId: subject,
      version: 3,
      state: index === 0 ? "deleted" : "restricted",
      safetyHold: index === 1,
      lifecycleHold: index === 1,
    }));
  sql("select intake_private.quarantine_restored_medical_intakes();", source);
  sql(
    `select intake_private.reconcile_restored_medical_intakes('${randomUUID()}','${randomUUID()}',${literal(ledger)});`,
    source,
  );
  const currentLedger = JSON.parse(
    sql(
      `select jsonb_agg(jsonb_build_object('intakeId',id,'tenantId',tenant_id,
    'subjectId',subject_id,'version',version,'state',state,'safetyHold',safety_hold,'lifecycleHold',lifecycle_hold) order by id)
    from intake_private.intakes;`,
      source,
    ),
  );
  restore(destination, Buffer.from(recovered.payload));
  invariant(
    sql(fingerprint, destination) === sourceFingerprint,
    "QUESTIONNAIRE_RECOVERY_ROWS_MISMATCH",
  );
  invariant(
    sql(
      "select not exists(select 1 from pg_namespace where nspname in ('auth','storage'));",
      destination,
    ) === "t",
    "QUESTIONNAIRE_RECOVERY_PROVIDER_SCHEMA_RESTORED",
  );
  const snapshots = JSON.parse(
    sql("select jsonb_agg(envelope order by id) from intake_private.snapshots;", destination),
  );
  for (const envelope of snapshots) {
    const plain = (await decryptIntake(envelope, envelope.scope, ring)) as {
      syntheticOnly?: boolean;
      marker?: string;
    };
    invariant(
      plain.syntheticOnly === true && /^questionnaire-[01]-[01]$/.test(plain.marker ?? ""),
      "QUESTIONNAIRE_RECOVERY_PAYLOAD_MISMATCH",
    );
    await rejection(
      () => decryptIntake(envelope, { ...envelope.scope, subjectId: randomUUID() }, ring),
      "QUESTIONNAIRE_RECOVERY_WRONG_SCOPE_ACCEPTED",
    );
  }
  sql("select intake_private.quarantine_restored_medical_intakes();", destination);
  sql(
    `update public.tenants set status='suspended';
    update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),
      revocation_reason='isolated offline questionnaire restore' where status='active';
    update public.tenant_memberships set status='revoked' where status='active';
    update public.access_assignments set status='revoked' where status='active';`,
    destination,
  );
  const beforeInvalid = sql(fingerprint, destination);
  sql(
    `do $$ begin
    begin perform intake_private.reconcile_restored_medical_intakes(gen_random_uuid(),gen_random_uuid(),'[]');
      raise exception 'EXPECTED_MISSING_LEDGER_DENIAL'; exception when insufficient_privilege then null; end;
    begin perform intake_private.reconcile_restored_medical_intakes(gen_random_uuid(),gen_random_uuid(),
      ${literal(ledger.map((row) => ({ ...row, version: 1 })))});
      raise exception 'EXPECTED_STALE_LEDGER_DENIAL'; exception when insufficient_privilege then null; end;
    end $$;`,
    destination,
  );
  invariant(
    sql(fingerprint, destination) === beforeInvalid,
    "QUESTIONNAIRE_RECOVERY_INVALID_LEDGER_MUTATED_ROWS",
  );
  sql(
    `select intake_private.reconcile_restored_medical_intakes('${randomUUID()}','${randomUUID()}',${literal(currentLedger)});`,
    destination,
  );
  invariant(
    sql(
      `select (select count(*) from intake_private.intakes)=2
    and (select count(*) from intake_private.snapshots)=4
    and (select count(*) from intake_private.grant_approvals)=2
    and (select count(*) from intake_private.access_grants)=2
    and not exists(select 1 from intake_private.access_grants where revoked_at is null)
    and not exists(select 1 from intake_private.intakes where not restore_quarantined or restore_authority_cutoff is null)
    and exists(select 1 from intake_private.intakes where id='${ids[0]!.intake}' and state='deleted' and envelope is null and version=3)
    and not exists(select 1 from intake_private.snapshots where intake_id='${ids[0]!.intake}' and envelope is not null)
    and exists(select 1 from intake_private.intakes where id='${ids[1]!.intake}' and state='restricted' and envelope is not null
      and safety_hold and lifecycle_hold and version=3)
    and (select count(*) from intake_private.snapshots where intake_id='${ids[1]!.intake}' and envelope is not null)=2
    and not has_function_privilege('service_role','intake_private.reconcile_restored_medical_intakes(uuid,uuid,jsonb)','execute');`,
      destination,
    ) === "t",
    "QUESTIONNAIRE_RECOVERY_CURRENT_DISPOSITION_FAILED",
  );
  invariant(Date.now() - started < 4 * 60 * 60 * 1000, "QUESTIONNAIRE_RECOVERY_RTO_EXCEEDED");
} finally {
  for (const database of created.reverse())
    docker(["exec", container, "dropdb", "-U", "postgres", database]);
  if (baseline)
    invariant(
      validateRecoveryBaseline(sql(recoveryBaselineSql)) === baseline,
      "QUESTIONNAIRE_RECOVERY_BASELINE_CHANGED",
    );
}
console.log(
  JSON.stringify({
    exercise: imported
      ? "isolated-hosted-questionnaire-archive-restore"
      : "local-populated-questionnaire-recovery",
    intakes: 2,
    snapshots: 4,
    encryptedArchiveRestored: true,
    countsAndFingerprintsMatched: true,
    payloadsDecrypted: true,
    newerDeletionAndHoldsReconciled: true,
    historicErasureApplied: true,
    oldGrantsRevoked: true,
    quarantineRetained: true,
    baselineUnchanged: true,
    disposableDatabasesRemoved: true,
    elapsedMilliseconds: Date.now() - started,
    providerAuthRestored: false,
    freshDomainAuthorityUnderRecoveredMfaProven: false,
    hostedRecoveryProven: false,
    emailsSent: 0,
  }),
);
