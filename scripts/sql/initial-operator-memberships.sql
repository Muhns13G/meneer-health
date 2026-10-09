-- Explicit owner-confirmed bootstrap only; never a migration, local seed or CI command.
-- Approval is owner-reported out-of-band mutual approval, not an invented AAL2 approval event.
-- This provisions exactly two named operators and preserves the suspended pilot tenant.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';
lock table auth.users in share row exclusive mode;
lock table public.tenants,public.subjects,public.external_identities,public.tenant_memberships
 in share row exclusive mode;

do $$
declare mansoer uuid; mikhail uuid;
begin
 if (select count(*) from auth.users)<>4 or exists(select 1 from auth.users where
  lower(email) not in('mansoer@meneerhealth.co.za','mikhail@meneerhealth.co.za',
   'tasneem@meneerhealth.co.za','ziyaad@meneerhealth.co.za'))
  or (select count(*) from public.subjects)<>4
  or (select count(*) from public.external_identities)<>4
  or (select count(*) from public.tenants)<>1
  or not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001'
   and slug='meneer-pilot' and status='suspended')
  or exists(select 1 from auth.sessions)
  or exists(select 1 from public.identity_sessions)
 then raise exception 'INITIAL_OPERATOR_BASELINE_REJECTED';end if;
 select e.subject_id into strict mansoer from auth.users u join public.external_identities e
  on e.provider='supabase' and e.provider_subject=u.id::text
  join public.subjects s on s.id=e.subject_id and s.status='active'
  where lower(u.email)='mansoer@meneerhealth.co.za';
 select e.subject_id into strict mikhail from auth.users u join public.external_identities e
  on e.provider='supabase' and e.provider_subject=u.id::text
  join public.subjects s on s.id=e.subject_id and s.status='active'
  where lower(u.email)='mikhail@meneerhealth.co.za';
 if mansoer=mikhail then raise exception 'INITIAL_OPERATOR_DISTINCT_SUBJECTS_REQUIRED';end if;
 if exists(select 1 from public.tenant_memberships where
  tenant_id<>'80000000-0000-4000-8000-000000000001' or subject_id not in(mansoer,mikhail)
  or role not in('operations','auditor','admin') or status<>'active'
  or approved_by_subject_id is distinct from case when subject_id=mansoer then mikhail else mansoer end
  or expires_at is null or expires_at<=clock_timestamp()
  or expires_at>valid_from+interval '30 days')
 then raise exception 'INITIAL_OPERATOR_EXISTING_GRANTS_REJECTED';end if;
 insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '80000000-0000-4000-8000-000000000001',subject,role,'active',transaction_timestamp(),
  transaction_timestamp()+interval '30 days',case when subject=mansoer then mikhail else mansoer end
 from unnest(array[mansoer,mikhail]) subject cross join unnest(array['operations','auditor','admin']) role
 on conflict(tenant_id,subject_id,role) do nothing;
 if (select count(*) from public.tenant_memberships)<>6
 then raise exception 'INITIAL_OPERATOR_EXACT_SIX_GRANTS_REQUIRED';end if;
end $$;
commit;
select role,count(*) as grants from public.tenant_memberships group by role order by role;
