-- Task 12.3: no route seed, owner appointment, mailbox publication or pilot activation.
create table identity_private.support_routes (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 purpose text not null check(purpose in('privacy','complaint','clinical')),
 primary_subject_id uuid not null references public.subjects(id),
 alternate_subject_id uuid not null references public.subjects(id),
 starts_at timestamptz not null, expires_at timestamptz not null,
 revoked_at timestamptz,
 roster_reference uuid not null, mailbox_control_reference uuid not null,
 receipt_reference uuid not null, absence_reference uuid not null, failure_reference uuid not null,
 approved_by_subject_id uuid not null references public.subjects(id), approval_reference uuid not null,
 clinical_authority_reference uuid, after_hours_reference uuid,
 acknowledgement_minutes integer not null check(acknowledgement_minutes between 1 and 1440),
 check(primary_subject_id<>alternate_subject_id), check(expires_at>starts_at),
 check(purpose<>'clinical' or (clinical_authority_reference is not null and after_hours_reference is not null)),
 check(purpose='clinical' or acknowledgement_minutes=1440)
);
create table identity_private.support_cases (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 subject_id uuid not null references public.subjects(id), route_id uuid not null references identity_private.support_routes(id),
 purpose text not null check(purpose in('privacy','complaint','clinical')),
 request_key uuid not null, fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(), unique(tenant_id,subject_id,request_key)
);
create table identity_private.support_responses (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references identity_private.support_cases(id),
 actor_subject_id uuid not null references public.subjects(id),
 action text not null check(action in('acknowledged','resolved')), request_key uuid not null,
 recorded_at timestamptz not null default clock_timestamp(), unique(case_id,action), unique(actor_subject_id,request_key)
);
do $$declare t text;begin
 foreach t in array array['support_routes','support_cases','support_responses'] loop
  execute format('alter table identity_private.%I enable row level security',t);
  execute format('alter table identity_private.%I force row level security',t);
  execute format('revoke all on identity_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end$$;
create trigger support_cases_immutable before update or delete on identity_private.support_cases
 for each row execute function audit_private.reject_append_only_mutation();
create trigger support_responses_immutable before update or delete on identity_private.support_responses
 for each row execute function audit_private.reject_append_only_mutation();
create function identity_private.support_route_immutable() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' or (to_jsonb(old)-'revoked_at') is distinct from (to_jsonb(new)-'revoked_at') or old.revoked_at is not null or new.revoked_at is null then
 raise exception using errcode='55000',message='SUPPORT_ROUTE_IMMUTABLE';end if;return new;end$$;
revoke all on function identity_private.support_route_immutable() from public,anon,authenticated,service_role;
create trigger support_routes_immutable before update or delete on identity_private.support_routes for each row execute function identity_private.support_route_immutable();

create function identity_private.support_owner_live(r identity_private.support_routes, actor uuid) returns boolean
language sql stable set search_path='' as $$
 select actor in(r.primary_subject_id,r.alternate_subject_id) and exists(
 select 1 from public.tenant_memberships m join public.subjects s on s.id=m.subject_id
 join public.subject_contacts c on c.subject_id=s.id and c.kind='email' and c.status='verified' and c.verified_at is not null
 where m.tenant_id=r.tenant_id and m.subject_id=actor and m.status='active' and s.status='active'
 and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()
 and case r.purpose when 'privacy' then m.role='auditor' when 'complaint' then m.role in('support','operations') else m.role='clinician' end)
$$;
revoke all on function identity_private.support_owner_live(identity_private.support_routes,uuid) from public,anon,authenticated,service_role;
create function identity_private.support_route_live(r identity_private.support_routes) returns boolean
language sql stable set search_path='' as $$
 select r.revoked_at is null and r.starts_at<=clock_timestamp() and r.expires_at>clock_timestamp()
 and exists(select 1 from public.tenants where id=r.tenant_id and status='active')
 and exists(select 1 from public.tenant_memberships m join public.subjects s on s.id=m.subject_id
 where m.tenant_id=r.tenant_id and m.subject_id=r.approved_by_subject_id and m.role='admin' and m.status='active'
 and s.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp())
$$;
revoke all on function identity_private.support_route_live(identity_private.support_routes) from public,anon,authenticated,service_role;
create function identity_private.support_case_state(c identity_private.support_cases) returns text
language sql stable set search_path='' as $$
 select case when exists(select 1 from identity_private.support_responses where case_id=c.id and action='resolved') then 'resolved'
 when exists(select 1 from identity_private.support_responses where case_id=c.id and action='acknowledged') then 'acknowledged'
 when c.recorded_at+make_interval(mins=>r.acknowledgement_minutes)<=clock_timestamp() or not identity_private.support_route_live(r)
 or not identity_private.support_owner_live(r,r.primary_subject_id) then 'escalated' else 'received' end
 from identity_private.support_routes r where r.id=c.route_id
$$;
revoke all on function identity_private.support_case_state(identity_private.support_cases) from public,anon,authenticated,service_role;
-- Private outbox extension; generic messages contain neither purpose nor case details.
alter table audit_private.transactional_notifications drop constraint transactional_notifications_source_kind_check;
alter table audit_private.transactional_notifications add constraint transactional_notifications_source_kind_check check(source_kind in('profile','rights','workflow','settlement','support'));
create function identity_private.support_notice(c identity_private.support_cases, version text) returns void
language sql set search_path='' as $$
 insert into audit_private.transactional_notifications(tenant_id,subject_id,source_kind,source_id,source_version,template,owner)
 values(c.tenant_id,c.subject_id,'support',c.id,version,'support-v1',case when c.purpose='privacy' then 'privacy' else 'operations' end)
 on conflict do nothing
$$;
revoke all on function identity_private.support_notice(identity_private.support_cases,text) from public,anon,authenticated,service_role;

create function public.patient_support_command(p_context jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t uuid;s uuid;r identity_private.support_routes;c identity_private.support_cases;fp text;result jsonb;begin
 perform intake_private.patient_authority(p_context); t:=(p_context->>'tenantId')::uuid;s:=(p_context->>'subjectId')::uuid;
 if p_command is null or jsonb_typeof(p_command)<>'object' or p_command->>'action' is null then raise exception using errcode='42501',message='SUPPORT_REJECTED';end if;
 if p_command->>'action'='read' then
  if (select count(*) from jsonb_object_keys(p_command))<>1 then raise exception using errcode='42501',message='SUPPORT_REJECTED';end if;
  select jsonb_build_object('outcome','view','routes',(select jsonb_agg(jsonb_build_object('purpose',p,'available',
   (select count(*)=1 from identity_private.support_routes x where x.tenant_id=t and x.purpose=p and identity_private.support_route_live(x)
    and identity_private.support_owner_live(x,x.primary_subject_id) and identity_private.support_owner_live(x,x.alternate_subject_id)))) from unnest(array['privacy','complaint','clinical']) p),
   'requests',coalesce((select jsonb_agg(jsonb_build_object('reference',x.id,'purpose',x.purpose,'state',identity_private.support_case_state(x),'recordedAt',x.recorded_at) order by x.recorded_at desc,x.id)
    from (select * from identity_private.support_cases where tenant_id=t and subject_id=s order by recorded_at desc,id limit 20) x),'[]'::jsonb)) into result;
  return result;
 end if;
 if p_command->>'action'<>'request' or (select count(*) from jsonb_object_keys(p_command))<>4
 or p_command->>'purpose' is null or p_command->>'purpose' not in('privacy','complaint','clinical') or jsonb_typeof(p_command->'urgent') is distinct from 'boolean'
 or p_command->>'requestKey' is null then raise exception using errcode='42501',message='SUPPORT_REJECTED';end if;
 if (p_command->>'urgent')::boolean then return '{"outcome":"emergency"}'::jsonb;end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text||s::text,123));
 fp:=encode(extensions.digest(convert_to(p_command::text,'UTF8'),'sha256'),'hex');
 select * into c from identity_private.support_cases where tenant_id=t and subject_id=s and request_key=(p_command->>'requestKey')::uuid;
 if c.id is not null then
  if c.fingerprint<>fp then raise exception using errcode='40001',message='SUPPORT_CONFLICT';end if;
  return jsonb_build_object('outcome','received','reference',c.id);
 end if;
 if (select count(*) from identity_private.support_cases where tenant_id=t and subject_id=s and recorded_at>clock_timestamp()-interval '24 hours')>=10 then
 raise exception using errcode='P0001',message='SUPPORT_RATE_LIMIT';end if;
 if (select count(*) from identity_private.support_routes x where x.tenant_id=t and x.purpose=p_command->>'purpose' and identity_private.support_route_live(x)
 and identity_private.support_owner_live(x,x.primary_subject_id) and identity_private.support_owner_live(x,x.alternate_subject_id))<>1 then return '{"outcome":"unavailable"}'::jsonb;end if;
 select * into strict r from identity_private.support_routes x where x.tenant_id=t and x.purpose=p_command->>'purpose' and identity_private.support_route_live(x)
 and identity_private.support_owner_live(x,x.primary_subject_id) and identity_private.support_owner_live(x,x.alternate_subject_id) for share;
 insert into identity_private.support_cases(tenant_id,subject_id,route_id,purpose,request_key,fingerprint)
 values(t,s,r.id,r.purpose,(p_command->>'requestKey')::uuid,fp) returning * into c;
 perform identity_private.support_notice(c,'received');
 return jsonb_build_object('outcome','received','reference',c.id);
end$$;
revoke all on function public.patient_support_command(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.patient_support_command(jsonb,jsonb) to service_role;

create function public.staff_support_command(p_context jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ctx jsonb;actor uuid;t uuid;c identity_private.support_cases;r identity_private.support_routes;prior identity_private.support_responses;result jsonb;required text;begin
 ctx:=intake_private.workforce(p_context);actor:=(p_context->>'subjectId')::uuid;t:=(p_context->>'tenantId')::uuid;
 required:=case p_context->>'purpose' when 'privacy_review' then 'privacy' when 'support' then 'complaint' when 'operations' then 'complaint' when 'care_delivery' then 'clinical' else null end;
 if required is null or p_command is null or p_command->>'action' is null then raise exception using errcode='42501',message='SUPPORT_REJECTED';end if;
 if p_command->>'action'='read' then
  if (select count(*) from jsonb_object_keys(p_command))<>1 then raise exception using errcode='42501',message='SUPPORT_REJECTED';end if;
  select coalesce(jsonb_agg(jsonb_build_object('reference',x.id,'purpose',x.purpose,'state',identity_private.support_case_state(x),'recordedAt',x.recorded_at) order by x.recorded_at,x.id),'[]'::jsonb) into result
  from (select item.* from identity_private.support_cases item join identity_private.support_routes route on route.id=item.route_id
   where item.tenant_id=t and item.purpose=required and identity_private.support_route_live(route) and identity_private.support_owner_live(route,actor)
   order by item.recorded_at,item.id limit 20) x;
  return result;
 end if;
 if p_command->>'action' not in('acknowledged','resolved') or (select count(*) from jsonb_object_keys(p_command))<>3
 or p_command->>'reference' is null or p_command->>'requestKey' is null then raise exception using errcode='42501',message='SUPPORT_REJECTED';end if;
 select * into c from identity_private.support_cases where id=(p_command->>'reference')::uuid and tenant_id=t and purpose=required for update;
 select * into r from identity_private.support_routes where id=c.route_id for share;
 if c.id is null or not identity_private.support_route_live(r) or not identity_private.support_owner_live(r,actor)
 or (actor=r.primary_subject_id and identity_private.support_case_state(c)='escalated') then raise exception using errcode='42501',message='SUPPORT_REJECTED';end if;
 select * into prior from identity_private.support_responses where actor_subject_id=actor and request_key=(p_command->>'requestKey')::uuid;
 if prior.id is not null then
  if prior.case_id<>c.id or prior.action<>p_command->>'action' then raise exception using errcode='40001',message='SUPPORT_CONFLICT';end if;
  return to_jsonb(prior.id);
 end if;
 if exists(select 1 from identity_private.support_responses where case_id=c.id and action=p_command->>'action')
 or (p_command->>'action'='resolved' and not exists(select 1 from identity_private.support_responses where case_id=c.id and action='acknowledged')) then raise exception using errcode='40001',message='SUPPORT_CONFLICT';end if;
 insert into identity_private.support_responses(case_id,actor_subject_id,action,request_key) values(c.id,actor,p_command->>'action',(p_command->>'requestKey')::uuid) returning * into prior;
 perform identity_private.support_notice(c,p_command->>'action');
 return to_jsonb(prior.id);
end$$;
revoke all on function public.staff_support_command(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_support_command(jsonb,jsonb) to service_role;
