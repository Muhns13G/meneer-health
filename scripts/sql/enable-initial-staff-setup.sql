-- Owner-authorised TD-043 staff setup only, 9 October 2026.
-- Manual DML, not a migration or seed. Verify disabled Worker modes before running.
-- Does not create users/grants, send invitations, enrol MFA or activate client features.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';
lock table public.tenants,public.tenant_memberships,public.subjects,public.external_identities,
 public.client_profiles,identity_private.mobile_invitations,public.fulfilment_provider_gates
 in share row exclusive mode;
lock table auth.users in share mode;
do $$
declare mansoer uuid;mikhail uuid;
begin
 if (select count(*) from public.tenants)<>1
  or not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001'
   and slug='meneer-pilot' and status='suspended')
  or (select count(*) from auth.users)<>4
  or exists(select 1 from auth.users where lower(email) not in(
   'mansoer@meneerhealth.co.za','mikhail@meneerhealth.co.za',
   'tasneem@meneerhealth.co.za','ziyaad@meneerhealth.co.za'))
  or (select count(*) from public.subjects)<>4
  or (select count(*) from public.external_identities)<>4
  or exists(select 1 from public.client_profiles)
  or exists(select 1 from identity_private.mobile_invitations)
  or exists(select 1 from public.fulfilment_provider_gates where environment<>'local' and mode<>'disabled')
 then raise exception 'STAFF_SETUP_BASELINE_REJECTED';end if;
 select e.subject_id into strict mansoer from auth.users u join public.external_identities e
  on e.provider='supabase' and e.provider_subject=u.id::text
  where lower(u.email)='mansoer@meneerhealth.co.za';
 select e.subject_id into strict mikhail from auth.users u join public.external_identities e
  on e.provider='supabase' and e.provider_subject=u.id::text
  where lower(u.email)='mikhail@meneerhealth.co.za';
 if mansoer=mikhail or (select count(*) from public.tenant_memberships)<>6
  or exists(select 1 from public.tenant_memberships where
   tenant_id<>'80000000-0000-4000-8000-000000000001'
   or subject_id not in(mansoer,mikhail) or role not in('operations','auditor','admin')
   or status<>'active' or valid_from>clock_timestamp()
   or expires_at is null or expires_at<=clock_timestamp()
   or approved_by_subject_id is distinct from case when subject_id=mansoer then mikhail else mansoer end)
 then raise exception 'STAFF_SETUP_GRANTS_REJECTED';end if;
 update public.tenants set status='active',updated_at=clock_timestamp()
  where id='80000000-0000-4000-8000-000000000001' and status='suspended';
 if not found then raise exception 'STAFF_SETUP_TENANT_CHANGED';end if;
end $$;
commit;
select status as staff_setup_tenant_status from public.tenants
 where id='80000000-0000-4000-8000-000000000001';
