-- Read-only aggregate verification after the authorised disposable support rehearsal.
with targets as (
  select unnest(array[
    'identity_private.support_routes', 'identity_private.support_cases',
    'identity_private.support_responses', 'audit_private.transactional_notifications',
    'audit_private.transactional_dispatch', 'audit_private.transactional_attempts',
    'audit_private.transactional_delivery_facts', 'audit_private.transactional_message_bindings',
    'audit_private.transactional_provider_deliveries', 'audit_private.transactional_suppressions',
    'audit_private.notification_followup_actions', 'audit_private.notification_nonacceptance_evidence',
    'public.identity_sessions', 'public.subjects', 'public.external_identities',
    'public.subject_contacts', 'public.tenant_memberships', 'public.client_profiles',
    'public.identity_invitations', 'public.pilot_instrument_publications',
    'public.pilot_instrument_receipts', 'public.pilot_account_lifecycle_events'
  ]) as table_name
), counts as (
  select table_name,
    ((xpath('/row/n/text()', query_to_xml(
      format('select count(*) as n from %s', table_name::regclass),
      false, true, '')))[1]::text)::bigint as rows
  from targets
), functions as (
  select p.* from pg_proc p where p.oid in(
    'public.patient_support_command(jsonb,jsonb)'::regprocedure,
    'public.staff_support_command(jsonb,jsonb)'::regprocedure,
    'public.staff_support_followup(jsonb,jsonb)'::regprocedure,
    'public.finish_transactional_notification(uuid,uuid,uuid,text)'::regprocedure,
    'public.bind_transactional_message(uuid,uuid,uuid,text)'::regprocedure
  )
)
select jsonb_build_object(
  'exercise', 'sprint12-hosted-support-baseline',
  'tablesChecked', (select count(*) from counts),
  'fixtureRows', (select sum(rows) from counts),
  'authEmpty', (select count(*)=0 from auth.users),
  'pilotSuspended', (select count(*)=1 and bool_and(slug='meneer-pilot' and status='suspended') from public.tenants),
  'triggersEnabled', not exists(select 1 from pg_trigger where not tgisinternal
    and tgrelid in(select table_name::regclass from targets) and tgenabled<>'O'),
  'privateTablesForceRls', not exists(select 1 from pg_class where
    oid in(select table_name::regclass from targets where table_name not like 'public.%')
    and (not relrowsecurity or not relforcerowsecurity)),
  'commandAccessRestricted', (select count(*)=5 and bool_and(prosecdef
    and has_function_privilege('service_role',oid,'execute')
    and not has_function_privilege('anon',oid,'execute')
    and not has_function_privilege('authenticated',oid,'execute')
    and position('errcode=''40001''' in pg_get_functiondef(oid))=0) from functions),
  'rowContentLogged', false
) as evidence;
