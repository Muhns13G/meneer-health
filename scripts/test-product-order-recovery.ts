import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  encryptShippingAddress,
  decryptShippingAddress,
} from "../src/server/payments/shipping-envelope";
import {
  encryptRecoveryArchive,
  decryptRecoveryArchive,
} from "../src/application/recovery/recovery-archive";
import {
  assertLocalRecoveryEnvironment,
  recoveryBaselineSql,
  validateRecoveryBaseline,
} from "./lib/sprint13-recovery-rehearsal";
import { countRehearsalAssertions } from "./lib/sprint10-rehearsal";
import {
  productRecoverySchemas,
  buildProductRecoveryFixture,
  assertProductRecoveryDatabase,
} from "./lib/product-order-recovery";

// Fixed local custodian exercise. No provider calls, hosted environment or production restore.
assertLocalRecoveryEnvironment(process.env);
const container = "supabase_db_meneer-health-local";
const source = `product_source_${randomUUID().replaceAll("-", "")}`;
const restored = `product_restore_${randomUUID().replaceAll("-", "")}`;
const created: string[] = [];
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw Error(code);
}
function command(args: string[], input?: string | Buffer): Buffer {
  try {
    return execFileSync("docker", args, {
      input,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    // Never print database diagnostics, decrypted addresses, archives or key material.
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    const reason =
      [
        "permission denied",
        "does not exist",
        "already exists",
        "violates foreign key",
        "violates check constraint",
        "syntax error",
        "must be member",
        "must be owner",
      ].find((value) => stderr.includes(value)) ?? "command failed";
    throw Error(
      `PRODUCT_RECOVERY_LOCAL_COMMAND_FAILED:${args.includes("pg_restore") ? "restore" : "sql"}:${reason.replaceAll(" ", "_")}`,
    );
  }
}
function sql(query: string, database = "postgres") {
  invariant(
    database === "postgres" || created.includes(database),
    "PRODUCT_RECOVERY_TARGET_REJECTED",
  );
  return command(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    `set statement_timeout='45s';set lock_timeout='5s';${query}`,
  )
    .toString()
    .trim();
}
function dump(database: string, auth = false) {
  assertProductRecoveryDatabase(database, created);
  return command([
    "exec",
    container,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    database,
    "-Fc",
    ...[...productRecoverySchemas, ...(auth ? ["auth"] : [])].flatMap((schema) => ["-n", schema]),
  ]);
}
function restore(database: string, payload: Buffer, auth: boolean) {
  invariant([source, restored].includes(database), "PRODUCT_RECOVERY_RESTORE_TARGET_REJECTED");
  command(["exec", container, "createdb", "-U", "postgres", database]);
  created.push(database);
  sql(
    "drop schema public;create schema extensions;create extension pgcrypto with schema extensions;create extension pgtap with schema extensions;",
    database,
  );
  let authSchema: Buffer | undefined;
  if (!auth) {
    // Empty provider schema only, not archived sessions or MFA. Source postgres has no Auth users.
    authSchema = command([
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--schema-only",
      "--no-owner",
      "--no-acl",
      "-n",
      "auth",
    ]);
  }
  command(
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
  if (authSchema) sql(authSchema.toString(), database);
  if (auth) {
    // Provider ACL grantors are not portable. Replay effective application privileges as the
    // disposable database owner, without changing the baseline or granting broad test access.
    const schemas = [...productRecoverySchemas, "auth", "extensions"]
      .map((name) => `'${name}'`)
      .join(",");
    const acl = sql(`select coalesce(string_agg(command,E'\\n'), '') from (
      select format('revoke all on schema %I from public,anon,authenticated,service_role;',nspname) command
      from pg_namespace where nspname in (${schemas})
      union all select format('revoke all on all tables in schema %I from public,anon,authenticated,service_role;',nspname)
      from pg_namespace where nspname in (${schemas})
      union all select format('revoke all on all functions in schema %I from public,anon,authenticated,service_role;',nspname)
      from pg_namespace where nspname in (${schemas})
    ) revocations;`);
    sql(acl, database);
    const grants = sql(`select coalesce(string_agg(command,E'\\n'), '') from (
      select format('grant %s on schema %I to %s;',a.privilege_type,n.nspname,
        case when a.grantee=0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end) command
      from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a
      where n.nspname in (${schemas})
      union all select format('grant %s on %s %I.%I to %s;',a.privilege_type,
        case when c.relkind='S' then 'sequence' else 'table' end,n.nspname,c.relname,
        case when a.grantee=0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      cross join lateral aclexplode(coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner))) a
      where n.nspname in (${schemas}) and n.nspname <> 'extensions' and c.relkind in ('r','p','v','m','f','S')
      union all select format('grant %s on function %s to %s;',a.privilege_type,p.oid::regprocedure,
        case when a.grantee=0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end)
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      where n.nspname in (${schemas}) and n.nspname <> 'extensions'
    ) privileges;`);
    sql(grants, database);
  }
  if (!auth)
    sql(
      productRecoverySchemas
        .map(
          (schema) => `revoke all on schema ${schema} from public,anon,authenticated,service_role;
revoke all on all tables in schema ${schema} from public,anon,authenticated,service_role;
revoke all on all functions in schema ${schema} from public,anon,authenticated,service_role;`,
        )
        .join("\n"),
      database,
    );
}
const fingerprintSql = `select md5(coalesce(string_agg(row_data,'|' order by row_data),'')) from (
 select 'address:'||to_jsonb(t)::text row_data from commerce_private.shipping_address_snapshots t
 union all select 'delivery:'||to_jsonb(t)::text from commerce_private.product_delivery_bindings t
 union all select 'draft:'||to_jsonb(t)::text from commerce_private.product_quote_drafts t
 union all select 'evidence:'||to_jsonb(t)::text from commerce_private.product_quote_evidence t
 union all select 'issued:'||to_jsonb(t)::text from commerce_private.issued_product_quotes t
 union all select 'offer:'||to_jsonb(t)::text from commerce_private.offers t
 union all select 'acceptance:'||to_jsonb(t)::text from commerce_private.order_acceptances t
 union all select 'funding:'||to_jsonb(t)::text from commerce_private.deposit_funding t
 union all select 'credit:'||to_jsonb(t)::text from commerce_private.credit_reservations t
 union all select 'settlement:'||to_jsonb(t)::text from commerce_private.settlements t
 union all select 'fulfilment:'||to_jsonb(t)::text from commerce_private.product_fulfilment_events t
 union all select 'notice:'||to_jsonb(t)::text from audit_private.transactional_notifications t
 union all select 'audit:'||to_jsonb(t)::text from public.audit_events t) records;`;
let baseline: string | undefined;
try {
  baseline = validateRecoveryBaseline(sql(recoveryBaselineSql));
  invariant(
    sql(`select (select count(*) from auth.users)=0 and
    (select count(*) from commerce_private.product_fulfilment_events)=0 and
    (select count(*) from commerce_private.shipping_address_snapshots)=0 and
    not exists(select 1 from public.subject_contacts where kind='email' and normalized_value not like '%.invalid')
    and not exists(select 1 from public.tenants where slug not in('synthetic-alpha','synthetic-beta')
     and not (slug='meneer-pilot' and status='suspended'));`) === "t",
    "PRODUCT_RECOVERY_SYNTHETIC_BASELINE_REQUIRED",
  );
  // Only the disposable source gets the existing fixed local test setup; never adapt it to hosted.
  restore(source, dump("postgres", true), true);
  const assertions = countRehearsalAssertions(
    sql(
      buildProductRecoveryFixture(
        readFileSync("supabase/tests/database/manual_product_fulfilment.test.sql", "utf8"),
      ),
      source,
    ),
  );
  const original = JSON.parse(
    sql("select to_jsonb(t) from commerce_private.shipping_address_snapshots t limit 1;", source),
  );
  const scope = {
    tenantId: original.tenant_id,
    subjectId: original.subject_id,
    caseId: original.case_id,
    snapshotId: randomUUID(),
    version: 2,
  };
  const address = {
    recipient: "Synthetic Recovery Client",
    line1: "1 Synthetic Test Lane",
    locality: "Synthetic",
    province: "Western Cape",
    postalCode: "0001",
    country: "ZA",
  };
  const shippingKey = crypto.getRandomValues(new Uint8Array(32));
  const envelope = await encryptShippingAddress(
    address,
    scope,
    "synthetic-product-recovery",
    shippingKey,
  );
  const quote = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  sql(
    `insert into commerce_private.shipping_address_snapshots(id,tenant_id,subject_id,case_id,version,envelope,captured_by)
   values('${scope.snapshotId}','${scope.tenantId}','${scope.subjectId}','${scope.caseId}',2,${quote(envelope)},'${original.captured_by}');`,
    source,
  );
  const fingerprint = sql(fingerprintSql, source);
  const payload = dump(source);
  const checksum = createHash("sha256").update(payload).digest("hex");
  const key = crypto.getRandomValues(new Uint8Array(32));
  const archive = await encryptRecoveryArchive(
    {
      contract: "recovery.manifest",
      version: 1,
      backupId: randomUUID(),
      createdAt: new Date().toISOString(),
      environment: "local",
      schemaVersion: "20261020113457",
      recordCounts: { shipping_snapshots: 2, fulfilment_events: 7 },
      checksum,
    },
    Uint8Array.from(payload),
    key,
    "disposable-product-recovery",
  );
  let wrongKeyDenied = false;
  try {
    await decryptRecoveryArchive(archive, crypto.getRandomValues(new Uint8Array(32)));
  } catch {
    wrongKeyDenied = true;
  }
  invariant(wrongKeyDenied, "PRODUCT_RECOVERY_ARCHIVE_WRONG_KEY_ACCEPTED");
  const decoded = await decryptRecoveryArchive(archive, key);
  invariant(
    createHash("sha256").update(decoded.payload).digest("hex") === checksum,
    "PRODUCT_RECOVERY_CHECKSUM_FAILED",
  );
  restore(restored, Buffer.from(decoded.payload), false);
  invariant(
    sql(fingerprintSql, restored) === fingerprint,
    "PRODUCT_RECOVERY_POPULATED_CHAIN_MISMATCH",
  );
  const readEnvelope = JSON.parse(
    sql(
      `select envelope from commerce_private.shipping_address_snapshots where id='${scope.snapshotId}';`,
      restored,
    ),
  );
  const keys = { "synthetic-product-recovery": shippingKey };
  invariant(
    JSON.stringify(await decryptShippingAddress(readEnvelope, scope, keys)) ===
      JSON.stringify(address),
    "PRODUCT_RECOVERY_ADDRESS_MISMATCH",
  );
  for (const [expected, ring] of [
    [{ ...scope, subjectId: randomUUID() }, keys],
    [scope, { "synthetic-product-recovery": crypto.getRandomValues(new Uint8Array(32)) }],
  ] as const) {
    let denied = false;
    try {
      await decryptShippingAddress(readEnvelope, expected, ring);
    } catch {
      denied = true;
    }
    invariant(denied, "PRODUCT_RECOVERY_ADDRESS_SCOPE_OR_KEY_ACCEPTED");
  }
  // Independent newer source disposition: never reactivate withdrawn address/custody authority.
  sql(
    `update commerce_private.shipping_address_snapshots set status='withdrawn' where id='${scope.snapshotId}';`,
    source,
  );
  invariant(
    sql(
      `select status='withdrawn' from commerce_private.shipping_address_snapshots where id='${scope.snapshotId}';`,
      source,
    ) === "t",
    "PRODUCT_RECOVERY_CURRENT_DISPOSITION_MISSING",
  );
  sql(
    `begin;
   update commerce_private.shipping_address_snapshots set status='withdrawn' where id='${scope.snapshotId}';
   update commerce_private.product_quote_releases set enabled=false;
   update commerce_private.checkout_releases set enabled=false;
   update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='offline product restore' where status='active';
   select intake_private.quarantine_restored_medical_intakes();commit;`,
    restored,
  );
  invariant(
    sql(
      `select (select count(*) from auth.users)=0 and (select count(*) from auth.sessions)=0
   and (select count(*) from commerce_private.product_fulfilment_events)=7
   and not exists(select 1 from commerce_private.product_quote_releases where enabled)
   and not exists(select 1 from commerce_private.checkout_releases where enabled)
   and not exists(select 1 from public.identity_sessions where status='active')
   and exists(select 1 from commerce_private.shipping_address_snapshots where id='${scope.snapshotId}' and status='withdrawn')
   and not has_function_privilege('service_role','public.staff_product_fulfilment(jsonb,jsonb,text)','execute');`,
      restored,
    ) === "t",
    "PRODUCT_RECOVERY_QUARANTINE_FAILED",
  );
  console.log(
    JSON.stringify({
      exercise: "local-populated-product-order-recovery",
      assertions,
      archiveChecksum: true,
      populatedChainRestored: true,
      shippingDecryption: true,
      wrongKeyAndScopeDenied: true,
      newerAddressWithdrawalReconciled: true,
      sessionsNotRestored: true,
      supplyAndPaymentsDisabled: true,
      sends: 0,
      providerRecords: 0,
    }),
  );
} finally {
  for (const database of created.reverse()) {
    assertProductRecoveryDatabase(database, created);
    command(["exec", container, "dropdb", "-U", "postgres", "--force", database]);
  }
  if (baseline)
    invariant(
      validateRecoveryBaseline(sql(recoveryBaselineSql)) === baseline,
      "PRODUCT_RECOVERY_BASELINE_CHANGED",
    );
}
