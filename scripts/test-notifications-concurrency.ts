import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseIntegrationEnvironment } from "./lib/supabase-integration-environment";

// Fixed local-only race packet: no Auth user, sender, hosted configuration or provider call.
if (
  [
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_INTEGRATION_TARGET",
  ].some((name) => process.env[name])
) {
  throw new Error("NOTIFICATION_RACE_LOCAL_ONLY");
}
const environment = readSupabaseIntegrationEnvironment();
if (environment.target !== "local" || new URL(environment.API_URL).hostname !== "127.0.0.1")
  throw new Error("NOTIFICATION_RACE_LOCAL_ONLY");
const client = createClient(environment.API_URL, environment.SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
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
      {
        input,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    ).trim();
  } catch {
    throw new Error("NOTIFICATION_RACE_DATABASE_FAILED");
  }
}
const tables = [
  "transactional_notifications",
  "transactional_dispatch",
  "transactional_attempts",
  "transactional_delivery_facts",
  "transactional_suppressions",
  "transactional_message_bindings",
  "transactional_provider_deliveries",
] as const;
function snapshot() {
  return sql(
    `select jsonb_build_array(${tables.map((table) => `(select count(*) from audit_private.${table})`).join(",")});`,
  );
}
const baseline = snapshot();
if (
  JSON.parse(baseline).some((value: number) => value !== 0) ||
  sql("select audit_private.notification_budget_used();") !== "0"
)
  throw new Error("NOTIFICATION_RACE_REQUIRES_EMPTY_LOCAL_JOURNAL");
const tenant = crypto.randomUUID();
const subject = crypto.randomUUID();
let prepared = false;
let winners = 0;
let cleanupVerified = true;
try {
  sql(`begin;
    insert into public.tenants(id,slug,display_name) values('${tenant}','notification-race-${tenant}','Synthetic notification race');
    insert into public.subjects(id) values('${subject}');
    insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from) values('${tenant}','${subject}','patient','active',now()-interval '1 hour');
    insert into public.client_profiles(tenant_id,subject_id,given_name,family_name,mobile_e164) values('${tenant}','${subject}','Synthetic','Race','+27820000122');
    insert into public.subject_contacts(subject_id,kind,normalized_value,status,provider,verified_at) values('${subject}','email','race-${subject}@example.invalid','verified','synthetic',now());
    insert into audit_private.transactional_notifications(tenant_id,subject_id,source_kind,source_id,source_version,template,owner)
      select '${tenant}','${subject}','profile',gen_random_uuid(),'1','account-v1','operations' from generate_series(1,52);
    insert into audit_private.transactional_dispatch(notification_id,state,attempt)
      select id,'accepted',1 from audit_private.transactional_notifications where tenant_id='${tenant}' order by id limit 49;
    insert into audit_private.transactional_attempts(lease_id,notification_id,attempt)
      select gen_random_uuid(),notification_id,1 from audit_private.transactional_dispatch;
    commit;`);
  prepared = true;
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      client.rpc("claim_transactional_notification", { p_tenant_id: tenant }),
    ),
  );
  if (results.some((result) => result.error)) throw new Error("NOTIFICATION_RACE_RPC_FAILED");
  winners = results.filter((result) => result.data !== null).length;
  if (winners !== 1 || sql("select audit_private.notification_budget_used();") !== "50")
    throw new Error("NOTIFICATION_RACE_BUDGET_FAILED");
  for (const name of ["claim_operations_alert_notification", "claim_medical_safety_notification"]) {
    const { data, error } = await client.rpc(name, { p_tenant_id: tenant });
    if (error || data !== null) throw new Error("NOTIFICATION_RACE_SENDER_BYPASS");
  }
} finally {
  if (prepared) {
    // Exact local fixture IDs only; original append-only definitions stay intact.
    sql(`begin;
      lock table ${tables.map((table) => `audit_private.${table}`).join(",")} in exclusive mode;
      ${tables
        .filter((table) => table !== "transactional_dispatch")
        .map((table) => `alter table audit_private.${table} disable trigger ${table}_immutable;`)
        .join("\n")}
      delete from audit_private.transactional_provider_deliveries where lease_id in(select a.lease_id from audit_private.transactional_attempts a join audit_private.transactional_notifications n on n.id=a.notification_id where n.tenant_id='${tenant}');
      delete from audit_private.transactional_message_bindings where lease_id in(select a.lease_id from audit_private.transactional_attempts a join audit_private.transactional_notifications n on n.id=a.notification_id where n.tenant_id='${tenant}');
      delete from audit_private.transactional_delivery_facts where lease_id in(select a.lease_id from audit_private.transactional_attempts a join audit_private.transactional_notifications n on n.id=a.notification_id where n.tenant_id='${tenant}');
      delete from audit_private.transactional_attempts where notification_id in(select id from audit_private.transactional_notifications where tenant_id='${tenant}');
      delete from audit_private.transactional_dispatch where notification_id in(select id from audit_private.transactional_notifications where tenant_id='${tenant}');
      delete from audit_private.transactional_suppressions where tenant_id='${tenant}' and subject_id='${subject}';
      delete from audit_private.transactional_notifications where tenant_id='${tenant}' and subject_id='${subject}';
      ${tables
        .filter((table) => table !== "transactional_dispatch")
        .map((table) => `alter table audit_private.${table} enable trigger ${table}_immutable;`)
        .join("\n")}
      delete from public.client_profiles where tenant_id='${tenant}' and subject_id='${subject}';
      delete from public.tenant_memberships where tenant_id='${tenant}' and subject_id='${subject}';
      delete from public.subject_contacts where subject_id='${subject}';
      delete from public.subjects where id='${subject}';
      delete from public.tenants where id='${tenant}';
      commit;`);
    cleanupVerified =
      snapshot() === baseline &&
      sql(
        `select count(*) from pg_trigger where tgname like 'transactional_%_immutable' and tgenabled<>'O';`,
      ) === "0";
  }
}
if (!cleanupVerified) throw new Error("NOTIFICATION_RACE_CLEANUP_FAILED");
console.log(
  JSON.stringify({
    exercise: "local-notification-budget-race",
    concurrentClaims: 8,
    winningClaims: winners,
    sharedBudget: 50,
    baselineRestored: true,
    hosted: false,
    providerContacted: false,
    emailSent: false,
  }),
);
