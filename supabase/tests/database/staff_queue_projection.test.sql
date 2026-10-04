begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('a3000000-0000-4000-8000-000000000001','queue@example.invalid',now(),false,false);
create temporary table queue_actor as select subject_id from public.external_identities
where provider='supabase' and provider_subject='a3000000-0000-4000-8000-000000000001';
grant select on queue_actor to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('a3000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003' from queue_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select 'a3000000-0000-4000-8000-000000000003',subject_id,'a3000000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from queue_actor;
insert into public.client_profiles(tenant_id,subject_id,given_name,family_name,mobile_e164)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic','Client','+27820000012');
insert into public.subject_contacts(subject_id,kind,normalized_value,status,provider,verified_at)
values('20000000-0000-4000-8000-000000000001','email','private-client@example.invalid','verified','synthetic',now())
on conflict(subject_id,kind) do update set normalized_value=excluded.normalized_value,
status=excluded.status,verified_at=excluded.verified_at;
insert into public.operations_cases(id,tenant_id,subject_id,created_at)
select ('a3000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now()-interval '1 hour'
from generate_series(10,35) n;
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
select c.tenant_id,c.id,c.subject_id,a.subject_id,'20000000-0000-4000-8000-000000000003',now()-interval '1 minute',now()+interval '1 hour'
from public.operations_cases c cross join queue_actor a;
create function pg_temp.queue(case_id uuid default null,state text default null,after_at timestamptz default null,after_id uuid default null,session_id uuid default 'a3000000-0000-4000-8000-000000000003')
returns jsonb language sql as $$ select public.read_operations_queue(
 'a3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','queue@example.invalid',session_id,
 (select subject_id from queue_actor),'10000000-0000-4000-8000-000000000001',case_id,state,after_at,after_id); $$;
select ok(not has_function_privilege('anon','public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)','execute'),'anonymous RPC denied');
select ok(not has_function_privilege('authenticated','public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)','execute'),'browser RPC denied');
set local role service_role;
select is(jsonb_array_length(pg_temp.queue()->'cases'),25,'bounded page contains at most 25 cases');
select is(pg_temp.queue()->'nextCursor'->>'id','a3000000-0000-4000-8000-000000000034','stable UUID tie-breaker cursor');
select is(jsonb_array_length(pg_temp.queue(after_at=>(pg_temp.queue()->'nextCursor'->>'createdAt')::timestamptz,after_id=>'a3000000-0000-4000-8000-000000000034')->'cases'),1,'next page has no duplicates');
select is(jsonb_array_length(pg_temp.queue(state=>'cancelled')->'cases'),0,'filter does not invent cases');
select is(pg_temp.queue('a3000000-0000-4000-8000-000000000010')->'profile'->>'maskedMobile','***12','mobile masked inside database');
select is((select count(*) from jsonb_object_keys(pg_temp.queue()->'cases'->0)),11::bigint,'list has exactly approved fields');
select ok(not ((pg_temp.queue()->'cases'->0) ? 'profile'),'list excludes names and contacts');
select ok(position('+27820000012' in pg_temp.queue('a3000000-0000-4000-8000-000000000010')::text)=0,'no raw mobile leaves RPC');
select is(pg_temp.queue('a3000000-0000-4000-8000-000000000010')->'profile'->>'maskedEmail','***@***','verified email masked inside database');
select ok(position('private-client@example.invalid' in pg_temp.queue('a3000000-0000-4000-8000-000000000010')::text)=0,'no raw email leaves RPC');
select is(pg_temp.queue('a3000000-0000-4000-8000-000000000010')->>'paymentReadiness','not_evaluated','payment readiness never inferred');
select is(pg_temp.queue('a3000000-0000-4000-8000-000000000010')->>'handoffReadiness','not_evaluated','handoff readiness never inferred');
reset role;
select throws_ok($$select pg_temp.queue(session_id=>null)$$,'42501','QUEUE_REJECTED','pending MFA cannot use null session bypass');
select throws_ok($$select public.read_operations_queue('a3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','queue@example.invalid','a3000000-0000-4000-8000-000000000003',(select subject_id from queue_actor),'10000000-0000-4000-8000-000000000002')$$,'42501','WORKFORCE_REJECTED','wrong tenant cannot browse cases');
select throws_ok($$select public.read_operations_queue('a3000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002','queue@example.invalid','a3000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001')$$,'42501','WORKFORCE_REJECTED','forged assignee cannot browse cases');
select throws_ok($$select pg_temp.queue('a3000000-0000-4000-8000-000000000099')$$,'42501','QUEUE_REJECTED','unknown and inaccessible detail indistinguishable');
select throws_ok($$select pg_temp.queue(state=>'forged')$$,'22023','QUEUE_INPUT_INVALID','unapproved state denied');
select throws_ok($$select pg_temp.queue(after_id=>'a3000000-0000-4000-8000-000000000034')$$,'22023','QUEUE_INPUT_INVALID','partial cursor denied');
select throws_ok($$select pg_temp.queue('a3000000-0000-4000-8000-000000000010','cancelled')$$,'22023','QUEUE_INPUT_INVALID','detail cannot also request broad filters');
select throws_ok($test$do $$begin update public.operations_assignments set revoked_at=now(); perform pg_temp.queue('a3000000-0000-4000-8000-000000000010'); end$$$test$,'42501','QUEUE_REJECTED','revoked assignment denies existing cookie');
select throws_ok($test$do $$begin update public.operations_assignments set starts_at=now()-interval '2 hours',expires_at=now()-interval '1 hour'; perform pg_temp.queue('a3000000-0000-4000-8000-000000000010'); end$$$test$,'42501','QUEUE_REJECTED','expired assignment denied');
select throws_ok($test$do $$begin delete from public.operations_assignments; perform pg_temp.queue('a3000000-0000-4000-8000-000000000010'); end$$$test$,'42501','QUEUE_REJECTED','unassigned detail denied');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1'; perform pg_temp.queue(); end$$$test$,'42501','WORKFORCE_REJECTED','email-only provider session denied');
select throws_ok($test$do $$begin update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from queue_actor); perform pg_temp.queue(); end$$$test$,'42501','WORKFORCE_REJECTED','membership revoked denies list');
select throws_ok($test$do $$begin update public.tenants set status='suspended'; perform pg_temp.queue(); end$$$test$,'42501','WORKFORCE_REJECTED','tenant suspension denies list');
select throws_ok($test$do $$begin delete from auth.sessions where id='a3000000-0000-4000-8000-000000000002'; perform pg_temp.queue(); end$$$test$,'42501','WORKFORCE_REJECTED','provider session revocation denies list');
select is((select count(*) from public.operations_cases),26::bigint,'reads never mutate case inventory');
select ok(exists(select 1 from public.audit_events where action='operations.queue.read'),'queue reads centrally audited');
select ok(exists(select 1 from public.audit_events where action='operations.case.read'),'assigned detail reads centrally audited');
select ok(not exists(select 1 from public.audit_events where action like 'operations.%'
  and metadata<>'{}'::jsonb),'no projected client content copied into audit metadata');
select public.record_operations_denial('a3000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000002','queue@example.invalid',
  'a3000000-0000-4000-8000-000000000003',(select subject_id from queue_actor),
  '10000000-0000-4000-8000-000000000001','BREAK_GLASS_DISABLED');
select is((select count(*) from audit_private.operations_alerts where code='OVERRIDE_DENIED'),1::bigint,'attempted override raises durable security alert');
select ok(audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000001'),'operations reads, assignments and denials preserve audit hash chain');
select throws_ok($$select public.record_operations_denial('a3000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000002','queue@example.invalid',null,
  (select subject_id from queue_actor),'10000000-0000-4000-8000-000000000001','QUEUE_REJECTED')$$,
  '42501','OPERATIONS_DENIAL_REJECTED','denial journal cannot bypass application session');
select throws_ok($$select public.record_operations_denial('a3000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000002','queue@example.invalid',
  'a3000000-0000-4000-8000-000000000003',(select subject_id from queue_actor),
  '10000000-0000-4000-8000-000000000001','private-client@example.invalid')$$,
  '22023','OPERATIONS_DENIAL_INVALID','free text cannot enter denial audit');
select throws_ok($$select public.read_operations_alerts('a3000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000002','queue@example.invalid',
  'a3000000-0000-4000-8000-000000000003',(select subject_id from queue_actor),
  '10000000-0000-4000-8000-000000000001')$$,'42501','OPERATIONS_ALERT_REJECTED','operators cannot browse tenant security alerts');
select throws_ok($$select public.sweep_operations_alerts('10000000-0000-4000-8000-000000000001',0)$$,
  '22023','OPERATIONS_ALERT_INPUT_INVALID','overdue interval is explicitly bounded');
create function pg_temp.fail_central_audit() returns trigger language plpgsql as $$begin
  raise exception using errcode='55000',message='SYNTHETIC_CENTRAL_AUDIT_FAILURE'; end$$;
create trigger synthetic_central_audit_failure before insert on public.audit_events
for each row execute function pg_temp.fail_central_audit();
select throws_ok($$select pg_temp.queue()$$,'55000','SYNTHETIC_CENTRAL_AUDIT_FAILURE','audit failure prevents list disclosure');
select throws_ok($$update public.operations_assignments set revoked_at=clock_timestamp()$$,
  '55000','SYNTHETIC_CENTRAL_AUDIT_FAILURE','assignment change rolls back if central audit fails');
select is((select count(*) from public.operations_assignments where revoked_at is not null),0::bigint,'failed audit leaves assignment authority unchanged');
select * from finish();
rollback;
