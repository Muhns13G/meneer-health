// Explicitly approved one-account cleanup. No seed, tenant reset, messages or payment actions.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const mode = process.argv[2];
if (!["--rehearse", "--cleanup"].includes(mode)) {
  console.log(JSON.stringify({ mode: "no-network-plan", accounts: 1, sends: 0, charges: 0 }));
  process.exit(0);
}
const check = (ok, code) => {
  if (!ok) throw new Error(code);
};
check(
  !process.env.CI &&
    process.env.PUBLIC_SIGNUP_CLEANUP_CONFIRM === "approved-exact-synthetic-account-locked-guards",
  "APPROVAL_REQUIRED",
);
const project = "gibfpolrdjotwvewgfsz";
const path = ".public-registration-acceptance.local";
const m = JSON.parse(readFileSync(path, "utf8"));
const release = JSON.parse(readFileSync(".public-registration-release.local", "utf8"));
check(
  m.syntheticOnly &&
    m.contact === "mansoergallie@gmail.com" &&
    m.tenant === "80000000-0000-4000-8000-000000000001" &&
    m.stage === "questionnaire-submitted-awaiting-scoped-cleanup",
  "TEST_MANIFEST_REJECTED",
);
const roots = [m.authUserId, m.subjectId, m.profileId, m.intakeId];
check(
  roots.every((id) => /^[a-f0-9-]{36}$/.test(id)) &&
    !roots.includes(m.tenant) &&
    !release.acceptanceBaseline.authIds.includes(m.authUserId) &&
    !release.acceptanceBaseline.profileIds.includes(m.profileId),
  "ROOT_SCOPE_REJECTED",
);
const token = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
async function sql(query, readOnly = false) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) {
    const d = await r.json();
    throw new Error(`CLEANUP_SQL_${r.status}:${String(d.message ?? "rejected").slice(0, 180)}`);
  }
  return r.json();
}
function replaceOnce(text, old, next) {
  check(text.split(old).length === 2, "CLEANUP_TEMPLATE_CHANGED");
  return text.replace(old, next);
}
let packet = readFileSync("scripts/sql/pilot-email-rehearsal-cleanup.sql", "utf8");
packet = packet.replaceAll(
  "'public','identity_private','audit_private'",
  "'public','identity_private','audit_private','intake_private','commerce_private','fulfilment_private','lifecycle_private','payments_private'",
);
const start = packet.indexOf(" if exists(select 1 from fixture_roots");
const end = packet.indexOf(" for r in select c.oid", start);
check(start > 0 && end > start, "TEMPLATE_SCOPE_MISSING");
const guard = `
 if exists(select 1 from public.tenants where id::text in(select id from fixture_roots))
 or not exists(select 1 from auth.users where id='${m.authUserId}' and lower(email)='${m.contact}' and email_confirmed_at is not null)
 or not exists(select 1 from public.external_identities where provider='supabase' and provider_subject='${m.authUserId}' and subject_id='${m.subjectId}')
 or not exists(select 1 from public.client_profiles where id='${m.profileId}' and subject_id='${m.subjectId}' and tenant_id='${m.tenant}' and given_name='Synthetic' and family_name='Signup Test')
 or not exists(select 1 from intake_private.intakes where id='${m.intakeId}' and subject_id='${m.subjectId}' and tenant_id='${m.tenant}' and state='submitted')
 then raise exception 'PUBLIC_SIGNUP_CLEANUP_SCOPE_REJECTED';end if;
 -- Acquire locks before selecting ctids or hashing unaffected rows.
 for r in select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and n.nspname in('public','identity_private','audit_private','intake_private','commerce_private','fulfilment_private','lifecycle_private','payments_private') order by c.oid loop
 execute format('lock table %s in access exclusive mode',r.oid::regclass);end loop;
`;
packet = packet.slice(0, start) + guard + packet.slice(end);
packet = replaceOnce(
  packet,
  " if exists(select 1 from public.audit_events a join fixture_rows e on e.rel='public.audit_events'::regclass and e.tid=a.ctid where a.tenant_id<>'{{isolated_tenant}}'::uuid) then\n  raise exception 'EMAIL_CLEANUP_REQUIRES_ISOLATED_AUDIT_TENANT'; end if;",
  `
 if exists(select 1 from fixture_rows marked join pg_class c on c.oid=marked.rel join pg_namespace n on n.oid=c.relnamespace
 where c.relname in('tenants','pilot_instrument_publications','subjects') and c.relname<>'subjects'
 or n.nspname in('commerce_private','fulfilment_private','payments_private')) then raise exception 'NON_TEST_RESOURCE_SELECTED';end if;
 if exists(select 1 from public.subjects s join fixture_rows marked on marked.rel='public.subjects'::regclass and marked.tid=s.ctid where s.id<>'${m.subjectId}')
 or exists(select 1 from public.client_profiles p join fixture_rows marked on marked.rel='public.client_profiles'::regclass and marked.tid=p.ctid where p.id<>'${m.profileId}')
 then raise exception 'OTHER_CLIENT_SELECTED';end if;
`,
);
packet = replaceOnce(
  packet,
  " for r in select distinct rel from fixture_rows order by rel loop\n  execute format('lock table %s in access exclusive mode',r.rel::regclass);",
  " for r in select c.oid as rel from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in('public','identity_private','audit_private','intake_private','commerce_private','fulfilment_private','lifecycle_private','payments_private') order by c.oid loop\n  execute format('lock table %s in access exclusive mode',r.rel::regclass);",
);
packet = packet.replaceAll("{{roots}}", JSON.stringify(roots));
packet = replaceOnce(
  packet,
  "commit;\nselect true as scoped_cleanup_committed;",
  `select c.oid::regclass::text as relation,count(*) as removed_rows from fixture_rows f join pg_class c on c.oid=f.rel group by c.oid;
${mode === "--rehearse" ? "rollback" : "commit"};
select true as ${mode === "--rehearse" ? "scoped_cleanup_rolled_back" : "scoped_cleanup_committed"};`,
);
// Save guard metadata, not row payloads, for independent post-commit verification.
const guards = await sql(
  "select md5(string_agg(t.tgrelid::text||':'||t.tgname||':'||t.tgenabled::text||':'||pg_get_triggerdef(t.oid),'|' order by t.oid)) as hash from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','identity_private','audit_private','intake_private')",
  true,
);
if (mode === "--cleanup") {
  check(m.cleanupRehearsed === true, "ROLLBACK_REHEARSAL_REQUIRED");
  check(
    process.env.SUPABASE_URL === `https://${project}.supabase.co` &&
      process.env.SUPABASE_SECRET_KEY,
    "AUTH_TARGET_REJECTED",
  );
  await sql(
    `begin;update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='synthetic-exercise-cleanup' where subject_id='${m.subjectId}' and status='active';delete from auth.sessions where user_id='${m.authUserId}';commit;`,
  );
}
const result = await sql(packet);
check(
  result.at(-1)?.[
    mode === "--rehearse" ? "scoped_cleanup_rolled_back" : "scoped_cleanup_committed"
  ] === true,
  "CLEANUP_OUTCOME_UNCONFIRMED",
);
if (mode === "--rehearse") {
  m.cleanupRehearsed = true;
  writeFileSync(path, JSON.stringify(m, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify({ rollbackCleanupPassed: true, authDeleted: false }));
  process.exit(0);
}
// Application cleanup is committed; journal that fact before the irreversible provider call.
m.stage = "application-cleaned-auth-removal-pending";
writeFileSync(path, JSON.stringify(m, null, 2) + "\n", { mode: 0o600 });
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await client.auth.admin.deleteUser(m.authUserId);
check(!error, "EXACT_AUTH_REMOVAL_UNCONFIRMED");
const after = await sql(
  "select md5(string_agg(t.tgrelid::text||':'||t.tgname||':'||t.tgenabled::text||':'||pg_get_triggerdef(t.oid),'|' order by t.oid)) as hash from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','identity_private','audit_private','intake_private')",
  true,
);
check(after[0].hash === guards[0].hash, "GUARD_METADATA_CHANGED");
const preserved = await sql(
  `select (select count(*) from auth.users where id='${m.authUserId}') as test_auth,(select count(*) from auth.sessions where user_id='${m.authUserId}') as test_sessions,(select count(*) from public.subjects where id='${m.subjectId}') as test_subject,(select count(*) from public.client_profiles where id='${m.profileId}') as test_profile,(select count(*) from intake_private.intakes where id='${m.intakeId}') as test_intake,(select count(*) from auth.users where id in(${release.acceptanceBaseline.authIds.map((x) => "'" + x + "'").join(",")})) as original_auth,(select count(*) from public.client_profiles where id in(${release.acceptanceBaseline.profileIds.map((x) => "'" + x + "'").join(",")})) as original_profiles`,
  true,
);
const p = preserved[0];
check(
  [p.test_auth, p.test_sessions, p.test_subject, p.test_profile, p.test_intake].every(
    (x) => Number(x) === 0,
  ) &&
    Number(p.original_auth) === release.acceptanceBaseline.authIds.length &&
    Number(p.original_profiles) === release.acceptanceBaseline.profileIds.length,
  "FINAL_BASELINE_READBACK_FAILED",
);
m.stage = "scoped-cleanup-verified";
m.cleanupRequired = false;
m.cleanupVerifiedAt = new Date().toISOString();
m.cleanupProof = p;
writeFileSync(path, JSON.stringify(m, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ cleanupVerified: true, guardsUnchanged: true, ...p }));
