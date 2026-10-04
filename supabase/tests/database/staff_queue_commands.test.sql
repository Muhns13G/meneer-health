begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('a4000000-0000-4000-8000-000000000001','commands@example.invalid',now(),false,false);
create temporary table command_actor as select subject_id from public.external_identities
where provider='supabase' and provider_subject='a4000000-0000-4000-8000-000000000001';
grant select on command_actor to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('a4000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003' from command_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select 'a4000000-0000-4000-8000-000000000003',subject_id,'a4000000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from command_actor;
insert into public.operations_cases(id,tenant_id,subject_id)
values('a4000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
select '10000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000010',
 '20000000-0000-4000-8000-000000000001',subject_id,'20000000-0000-4000-8000-000000000003',now()-interval '1 minute',now()+interval '1 hour' from command_actor;
create function pg_temp.command(action text,version integer,key uuid,code text default null)
returns jsonb language sql as $$ select public.command_operations_queue(
 'a4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002','commands@example.invalid',
 'a4000000-0000-4000-8000-000000000003',(select subject_id from command_actor),'10000000-0000-4000-8000-000000000001',
 jsonb_build_object('caseId','a4000000-0000-4000-8000-000000000010','action',action,'expectedVersion',version,'requestKey',key)||
 case when code is null then '{}'::jsonb else jsonb_build_object('code',code) end); $$;
select ok(not has_function_privilege('anon','public.command_operations_queue(uuid,uuid,text,uuid,uuid,uuid,jsonb)','execute'),'anonymous commands denied');
select ok(not has_function_privilege('authenticated','public.command_operations_queue(uuid,uuid,text,uuid,uuid,uuid,jsonb)','execute'),'browser commands denied');
select ok(not has_table_privilege('service_role','identity_private.operations_commands','select,insert,update,delete'),'journal inaccessible to service role');
select ok(not has_function_privilege('service_role','identity_private.read_operations_queue_base(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)','execute'),'base read cannot bypass wrapper');
set local role service_role;
select is(pg_temp.command('claim',1,'a4000000-0000-4000-8000-000000000020')->>'version','2','claim increments case version');
select is(pg_temp.command('claim',1,'a4000000-0000-4000-8000-000000000020')->>'version','2','exact replay returns original result despite old expected version');
select throws_ok($$select pg_temp.command('release',2,'a4000000-0000-4000-8000-000000000020')$$,'40001','QUEUE_CONFLICT','same key different payload denied');
select throws_ok($$select pg_temp.command('claim',2,'a4000000-0000-4000-8000-000000000021')$$,'40001','QUEUE_CONFLICT','second reservation denied');
select throws_ok($$select pg_temp.command('release',1,'a4000000-0000-4000-8000-000000000021')$$,'40001','QUEUE_CONFLICT','stale version denied');
select throws_ok($$select pg_temp.command('mark_ready',2,'a4000000-0000-4000-8000-000000000021')$$,'55000','QUEUE_NOT_READY','missing authoritative deposit and recipient integration denies advancement');
select throws_ok($$select pg_temp.command('handed_off',2,'a4000000-0000-4000-8000-000000000021')$$,'22023','QUEUE_INPUT_INVALID','operator cannot assert external delivery');
reset role;
select is((select count(*) from public.operations_claims where released_at is null),1::bigint,'one active claim');
select is((select count(*) from public.operations_events),1::bigint,'replay and failed commands append no duplicate audit');
select is((select count(*) from public.audit_events where action='operations.claimed'),1::bigint,'central chain also deduplicates replay');
select is((select count(*) from identity_private.operations_commands),1::bigint,'one committed replay receipt');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','operations','active',
 now()-interval '1 day',now()+interval '1 day','20000000-0000-4000-8000-000000000003');
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
values('10000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003',now(),now()+interval '1 hour');
select throws_ok($test$do $$begin
  update public.operations_claims set assignment_id=(select id from public.operations_assignments where workforce_subject_id='20000000-0000-4000-8000-000000000002'),workforce_subject_id='20000000-0000-4000-8000-000000000002';
  perform pg_temp.command('release',2,'a4000000-0000-4000-8000-000000000021');
end$$$test$,'42501','QUEUE_REJECTED','another assigned operator cannot release the active owner reservation');
select throws_ok($test$do $$begin update public.identity_sessions set issued_at=now()-interval '2 minutes',last_seen_at=now()-interval '2 minutes',idle_expires_at=now()-interval '1 second',absolute_expires_at=now()+interval '1 hour'; perform pg_temp.command('release',2,'a4000000-0000-4000-8000-000000000021'); end$$$test$,'42501','WORKFORCE_REJECTED','expired application session denies mutation');
select throws_ok($test$do $$begin update public.operations_assignments set revoked_at=clock_timestamp(); perform pg_temp.command('claim',1,'a4000000-0000-4000-8000-000000000020'); end$$$test$,'42501','QUEUE_REJECTED','revocation rejects even exact replay');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1'; perform pg_temp.command('release',2,'a4000000-0000-4000-8000-000000000021'); end$$$test$,'42501','WORKFORCE_REJECTED','MFA downgrade denies mutation');
select throws_ok($test$do $$begin
  update public.identity_sessions set idle_expires_at=clock_timestamp()+interval '100 milliseconds'
    where id='a4000000-0000-4000-8000-000000000003';
  perform pg_sleep(0.15);
  perform pg_temp.command('release',2,'a4000000-0000-4000-8000-000000000021');
end$$$test$,'42501','QUEUE_REJECTED','transaction-fixed now cannot extend wall-clock session authority');
create function pg_temp.fail_audit() returns trigger language plpgsql as $$begin raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end;$$;
create trigger synthetic_audit_failure before insert on public.operations_events for each row execute function pg_temp.fail_audit();
select throws_ok($$select pg_temp.command('release',2,'a4000000-0000-4000-8000-000000000021')$$,'55000','SYNTHETIC_AUDIT_FAILURE','failed audit aborts command');
select is((select version from public.operations_cases),2,'audit failure preserves case version');
select is((select count(*) from public.operations_claims where released_at is null),1::bigint,'audit failure preserves reservation');
drop trigger synthetic_audit_failure on public.operations_events;
select is(pg_temp.command('release',2,'a4000000-0000-4000-8000-000000000021')->>'claim','unclaimed','release clears reservation');
select throws_ok($$select pg_temp.command('cancel',3,'a4000000-0000-4000-8000-000000000022')$$,'42501','QUEUE_REJECTED','unclaimed mutation denied');
select is(pg_temp.command('claim',3,'a4000000-0000-4000-8000-000000000022')->>'version','4','released case can be claimed again');
select is(pg_temp.command('record_exception',4,'a4000000-0000-4000-8000-000000000023','abandoned_case')->>'state','handoff_exception','coded exception pauses work');
select is((select prior_state from public.operations_exceptions),'onboarding_pending','exception retains prior state');
select is(pg_temp.command('cancel',5,'a4000000-0000-4000-8000-000000000024')->>'state','cancelled','pre-delivery cancellation is explicit');
select throws_ok($$select pg_temp.command('claim',6,'a4000000-0000-4000-8000-000000000025')$$,'40001','QUEUE_CONFLICT','terminal case immutable');
select is((select count(*) from public.operations_events),5::bigint,'every successful mutation has one immutable event');
select is((select count(*) from audit_private.operations_alerts where code='OPERATIONS_EXCEPTION'),1::bigint,'coded exception raises a durable owned alert');
select is((select count(*) from audit_private.operations_alerts where code='ASSIGNMENT_CHANGED'),2::bigint,'assignment grants raise security review alerts');
select ok(not has_table_privilege('service_role','audit_private.operations_alerts','select,insert,update,delete'),'alert table hidden even from service role');
select throws_ok($$update audit_private.operations_alerts set severity='critical'$$,'55000','APPEND_ONLY_RECORD','alerts cannot be rewritten');
select throws_ok($$delete from audit_private.operations_alerts$$,'55000','APPEND_ONLY_RECORD','alerts cannot be erased');
select ok(not exists(select 1 from public.operations_events e left join public.audit_events a
  on a.correlation_id=e.id::text and a.action like 'operations.%' where a.id is null),'every journaled mutation feeds central audit chain');
select throws_ok($$update identity_private.operations_commands set result='{}'$$,'55000','APPEND_ONLY_RECORD','replay journal append only');
select * from finish();
rollback;
