import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const sprint09SecuritySuites = [
  "pilot_client_profile_instruments",
  "governed_patient_invitations",
  "pilot_account_activation",
  "patient_portal_projection",
  "patient_account_rights",
] as const;

export type Sprint09SecuritySuite = (typeof sprint09SecuritySuites)[number];

// Hosted fixtures are transaction-local. Never import the commercial/provider local seed.
const hostedFixture = `
insert into public.tenants(id,slug,display_name,status) values
('10000000-0000-4000-8000-000000000001','synthetic-alpha','Synthetic Alpha','active'),
('10000000-0000-4000-8000-000000000002','synthetic-beta','Synthetic Beta','active');
insert into public.subjects(id,status) values
('20000000-0000-4000-8000-000000000001','active'),
('20000000-0000-4000-8000-000000000002','active');
insert into public.tenant_memberships(tenant_id,subject_id,role,status) values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','patient','active');
`;

export const sprint09HostedInventorySql = `
select jsonb_build_object(
  'authUsers',(select count(*) from auth.users),
  'providerSessions',(select count(*) from auth.sessions),
  'subjects',(select count(*) from public.subjects),
  'tenants',(select count(*) from public.tenants),
  'suspendedPilotTenants',(select count(*) from public.tenants
    where id='80000000-0000-4000-8000-000000000001' and slug='meneer-pilot' and status='suspended'),
  'invitations',(select count(*) from public.identity_invitations),
  'memberships',(select count(*) from public.tenant_memberships),
  'sessions',(select count(*) from public.identity_sessions),
  'profiles',(select count(*) from public.client_profiles),
  'profileEvents',(select count(*) from public.client_profile_events),
  'publications',(select count(*) from public.pilot_instrument_publications),
  'receipts',(select count(*) from public.pilot_instrument_receipts),
  'receiptEvents',(select count(*) from public.pilot_instrument_receipt_events),
  'accountEvents',(select count(*) from public.pilot_account_lifecycle_events),
  'activationCommands',(select count(*) from identity_private.pilot_activation_commands),
  'accountCommands',(select count(*) from identity_private.patient_account_commands),
  'rightsRequests',(select count(*) from identity_private.patient_rights_requests),
  'auditEvents',(select count(*) from public.audit_events)
) as inventory;
`;

const hostedBaselineGuard = `
do $baseline$ begin
  if exists(select 1 from auth.users) or exists(select 1 from auth.sessions)
    or exists(select 1 from public.subjects) or exists(select 1 from public.identity_sessions)
    or exists(select 1 from public.identity_invitations) or exists(select 1 from public.tenant_memberships)
    or exists(select 1 from public.client_profiles) or exists(select 1 from public.client_profile_events)
    or exists(select 1 from public.pilot_instrument_publications)
    or exists(select 1 from public.pilot_instrument_receipts)
    or exists(select 1 from public.pilot_instrument_receipt_events)
    or exists(select 1 from public.pilot_account_lifecycle_events)
    or exists(select 1 from identity_private.pilot_activation_commands)
    or exists(select 1 from identity_private.patient_account_commands)
    or exists(select 1 from identity_private.patient_rights_requests)
    or exists(select 1 from public.audit_events)
    or (select count(*) from public.tenants)<>1
    or not exists(select 1 from public.tenants
      where id='80000000-0000-4000-8000-000000000001' and slug='meneer-pilot' and status='suspended')
  then raise exception 'SPRINT09_HOSTED_BASELINE_CHANGED'; end if;
end $baseline$;
`;

export function buildSprint09SecurityProof(
  suite: Sprint09SecuritySuite,
  target: "local" | "hosted-synthetic",
) {
  if (!sprint09SecuritySuites.includes(suite)) throw new Error("SPRINT09_SUITE_INVALID");
  const source = readFileSync(
    resolve(process.cwd(), `supabase/tests/database/${suite}.test.sql`),
    "utf8",
  );
  if (!/^begin;\s/i.test(source) || !/\nrollback;\s*$/i.test(source))
    throw new Error("SPRINT09_ROLLBACK_BOUNDARY_MISSING");
  const body = source
    .replace(/^begin;\s*/i, "")
    .replace(/\nrollback;\s*$/i, "")
    .replace("select * from finish();", "select * from finish(true);");
  if (/^\s*(begin|commit|rollback)\s*;/im.test(body))
    throw new Error("SPRINT09_NESTED_TRANSACTION_REJECTED");
  return `begin;
set local statement_timeout='45s';
set local lock_timeout='5s';
${target === "hosted-synthetic" ? hostedBaselineGuard + hostedFixture : ""}
${body}
select jsonb_build_object('suite','${suite}', 'assertions',extensions._get('curr_test'),
  'failures',extensions.num_failed(),'rollbackOnly',true) as proof;
rollback;`;
}
