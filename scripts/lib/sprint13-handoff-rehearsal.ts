import { buildSprint10Rehearsal, sprint10RehearsalSuites } from "./sprint10-rehearsal";

// Reuse the reviewed fixtures; this packet is never a hosted execution authority.
export const sprint13HandoffSuites = sprint10RehearsalSuites;
export const buildSprint13HandoffSuite = buildSprint10Rehearsal;

export function assertLocalHandoffEnvironment(environment: Record<string, string | undefined>) {
  if (
    Object.entries(environment).some(
      ([name, value]) =>
        value &&
        /^(?:SUPABASE_|HOSTED_|SPRINT13_PAYMENT_|STRIPE_|BREVO_|MEDICAL_INTAKE_)/.test(name),
    )
  ) {
    throw new Error("SPRINT13_HANDOFF_HOSTED_ENVIRONMENT_REJECTED");
  }
}

// Fingerprints stay in memory. No answers, identifiers, keys or row values reach stdout.
// Include every application/Auth table plus security metadata and payment/transfer definitions.
export const handoffBaselineSql = `
set statement_timeout='45s';
set lock_timeout='5s';
with relations as (
 select c.oid,n.nspname||'.'||c.relname as relation,c.relrowsecurity,c.relforcerowsecurity,c.relacl
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and n.nspname in('public','auth','identity_private','intake_private',
 'commerce_private','payments_private','audit_private','fulfilment_private','lifecycle_private','measurement_private')
), rows as (
 select relation,query_to_xml(format(
 'select count(*) n,md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) h from %s t',
 oid::regclass),false,true,'') x,relrowsecurity,relforcerowsecurity,relacl from relations
)
select md5(string_agg(relation||':'||(xpath('/row/n/text()',x))[1]::text||':'||
 (xpath('/row/h/text()',x))[1]::text||':'||relrowsecurity::text||':'||relforcerowsecurity::text||':'||
 coalesce(relacl::text,''),'|' order by relation)) from rows;
select md5(coalesce(string_agg(n.nspname||'.'||c.relname||':'||t.tgname||':'||
 t.tgenabled::text||':'||pg_get_triggerdef(t.oid),'|' order by n.nspname,c.relname,t.tgname),''))
 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where not t.tgisinternal and n.nspname in('public','auth','identity_private','intake_private',
 'commerce_private','payments_private','audit_private','fulfilment_private','lifecycle_private','measurement_private');
select md5(string_agg(p.oid::regprocedure::text||':'||pg_get_functiondef(p.oid)||':'||
 p.proowner::text||':'||coalesce(p.proacl::text,'')||':'||coalesce(p.proconfig::text,''),
 '|' order by p.oid::regprocedure::text)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.prokind='f' and n.nspname in('public','identity_private','intake_private','commerce_private');
`;

export function validateHandoffBaseline(output: string) {
  const values = output.trim().split(/\r?\n/);
  if (values.length !== 3 || values.some((value) => !/^[a-f0-9]{32}$/.test(value))) {
    throw new Error("SPRINT13_HANDOFF_BASELINE_INVALID");
  }
  return values.join(":");
}
