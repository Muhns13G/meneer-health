-- Pure SELECT/count/schema-only preflight and restoration check; no row content or DDL.
with private_tables as (
  select c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,
    ((xpath('/row/n/text()',query_to_xml(
      format('select count(*) as n from commerce_private.%I',c.relname),
      false,true,'')))[1]::text)::bigint as rows
  from pg_class c join pg_namespace s on s.oid=c.relnamespace
  where s.nspname='commerce_private' and c.relkind='r'
), table_checks as (
  select count(*) as tables,coalesce(sum(rows),0) as rows,
    bool_and(rows is not null) as counts_complete,
    coalesce(bool_and(relrowsecurity and relforcerowsecurity),false) as forced_rls,
    coalesce(bool_and(
      not has_table_privilege('anon',oid,'select,insert,update,delete') and
      not has_table_privilege('authenticated',oid,'select,insert,update,delete') and
      not has_table_privilege('service_role',oid,'select,insert,update,delete')),false) as denied
  from private_tables
), rpc_checks as (
  select count(*) as rpcs from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'patient_order_review','patient_prepare_deposit_offer','patient_prepare_checkout',
    'patient_attach_checkout','apply_pilot_provider_event','read_patient_payment_status',
    'read_staff_payment_status','patient_refund_command','staff_refund_command',
    'service_refund_command') and p.prosecdef
    and has_function_privilege('service_role',p.oid,'execute')
    and not has_function_privilege('anon',p.oid,'execute')
    and not has_function_privilege('authenticated',p.oid,'execute')
), baseline as (
  select (select count(*) from public.tenants)=1 and exists(
    select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001'
      and slug='meneer-pilot' and status='suspended') as pilot,
    (select count(*) from auth.users)=0 as empty_auth,
    not exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
      join pg_namespace n on n.oid=c.relnamespace where n.nspname='commerce_private'
      and not t.tgisinternal and t.tgenabled<>'O') as triggers_enabled
)
select jsonb_build_object('exercise','sprint11-hosted-private-baseline',
  'privateTables',tables,'privateRows',rows,'countsComplete',counts_complete,'governedRpcs',rpcs,
  'forcedRls',forced_rls,'browserAndServiceTableAccessDenied',denied,
  'appendOnlyTriggersEnabled',triggers_enabled,'authEmpty',empty_auth,'pilotSuspended',pilot,
  'rowContentLogged',false,
  'passed',tables=30 and counts_complete and rows=0 and forced_rls and denied and rpcs=10
    and pilot and empty_auth and triggers_enabled) as evidence
from table_checks cross join rpc_checks cross join baseline;
