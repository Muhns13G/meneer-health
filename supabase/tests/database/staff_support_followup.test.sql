begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('98000000-0000-4000-8000-000000000001','rights@example.invalid',now(),false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,
issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
values('98000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',
encode(extensions.digest(convert_to('rights@example.invalid','UTF8'),'sha256'),'hex'),'patient','98000000-0000-4000-8000-000000000001',now()+interval '1 hour',
'20000000-0000-4000-8000-000000000001','operations',gen_random_uuid(),'delivered',now());
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,
rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('98000000-0000-4000-8000-000000000004','pilot-account-terms','1.0','Synthetic rights terms',repeat('0',64),'/account/activate','synthetic','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('98000000-0000-4000-8000-000000000005','pilot-privacy-notice','1.0','Synthetic rights privacy',repeat('0',64),'/account/activate','synthetic','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
select public.activate_pilot_account('98000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002',jsonb_build_object(
'givenName','Synthetic','familyName','Client','mobileE164','+27820000000','contactPreference','email',
'termsPublicationId','98000000-0000-4000-8000-000000000004','termsHash',encode(extensions.digest(convert_to('Synthetic rights terms','UTF8'),'sha256'),'hex'),
'privacyPublicationId','98000000-0000-4000-8000-000000000005','privacyHash',encode(extensions.digest(convert_to('Synthetic rights privacy','UTF8'),'sha256'),'hex'),
'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid()));
create temporary table rights_context as select subject_id from public.external_identities where provider='supabase' and provider_subject='98000000-0000-4000-8000-000000000001';
grant select on rights_context to service_role;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select '98000000-0000-4000-8000-000000000006',subject_id,'98000000-0000-4000-8000-000000000002','patient','aal1',now(),now(),now()+interval '30 minutes',now()+interval '12 hours' from rights_context;

create function pg_temp.pc() returns jsonb language sql as $$select jsonb_build_object(
'tenantId','10000000-0000-4000-8000-000000000001','subjectId',(select subject_id from rights_context),
'sessionId','98000000-0000-4000-8000-000000000006','providerSubject','98000000-0000-4000-8000-000000000001',
'providerSessionId','98000000-0000-4000-8000-000000000002','verifiedEmail','rights@example.invalid','purpose','account')$$;
create function pg_temp.req(p text default 'privacy', k uuid default 'f1300000-0000-4000-8000-000000000010', urgent boolean default false) returns jsonb language sql as $$select jsonb_build_object('action','request','purpose',p,'urgent',urgent,'requestKey',k)$$;
create function pg_temp.submit(cmd jsonb default pg_temp.req()) returns jsonb language sql as $$select public.patient_support_command(pg_temp.pc(),cmd)$$;
create temporary table support_actors(n int,provider_id uuid,provider_session uuid,app_session uuid,subject_id uuid,role text);
grant select on support_actors to service_role;
do $$declare n int;u uuid;a uuid;sid uuid;sub uuid;rl text;begin
 for n in 1..7 loop
 u:=('f1310000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
 a:=('f1320000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
 sid:=('f1330000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
 rl:=case when n<=2 then 'auditor' when n<=4 then 'clinician' when n<=6 then 'operations' else 'admin' end;
 insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values(u,'support-'||n||'@example.invalid',now(),false,false);
 select subject_id into sub from public.external_identities where provider='supabase' and provider_subject=u::text;
 insert into support_actors values(n,u,a,sid,sub,rl);
 insert into auth.sessions(id,user_id,created_at,updated_at,aal)values(a,u,now(),now(),'aal2');
 insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 values('10000000-0000-4000-8000-000000000001',sub,rl,'active',now()-interval '1 hour',now()+interval '2 days','20000000-0000-4000-8000-000000000003');
 insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
 values(sid,sub,a,case when rl='admin' then 'privileged' else 'workforce' end,'aal2',now(),now(),now()+interval '10 minutes',now()+interval '4 hours');
 end loop;
end$$;
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','admin','active',now()-interval '1 day',now()+interval '2 days','20000000-0000-4000-8000-000000000001');
update public.tenant_memberships set valid_from=now()-interval '1 day',expires_at=now()+interval '2 days'
where subject_id='20000000-0000-4000-8000-000000000003' and role='admin';
create function pg_temp.sc(n int) returns jsonb language sql as $$select jsonb_build_object('tenantId','10000000-0000-4000-8000-000000000001','subjectId',a.subject_id,'sessionId',a.app_session,'providerSubject',a.provider_id,'providerSessionId',a.provider_session,'verifiedEmail','support-'||n||'@example.invalid','purpose',case a.role when 'auditor' then 'privacy_review' when 'clinician' then 'care_delivery' when 'admin' then 'security_administration' else 'operations' end) from support_actors a where a.n=sc.n$$;
insert into identity_private.support_routes(id,tenant_id,purpose,primary_subject_id,alternate_subject_id,starts_at,expires_at,
roster_reference,mailbox_control_reference,receipt_reference,absence_reference,failure_reference,approved_by_subject_id,approval_reference,clinical_authority_reference,after_hours_reference,acknowledgement_minutes)
select ('f1340000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001',
case n when 1 then 'privacy' when 3 then 'clinical' else 'complaint' end,
subject_id,(select subject_id from support_actors x where x.n=a.n+1),now()-interval '1 hour',now()+interval '1 day',
gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',
gen_random_uuid(),case when n=3 then gen_random_uuid() end,case when n=3 then gen_random_uuid() end,case when n=3 then 5 else 1440 end
from support_actors a where n in(1,3,5);

create function pg_temp.follow(n int default 1,cmd jsonb default '{"action":"read"}') returns jsonb language sql as $$select public.staff_support_followup(pg_temp.sc(n),cmd)$$;
create temporary table request_reference as select (pg_temp.submit()->>'reference')::uuid id;
select is(jsonb_array_length(pg_temp.follow()->'cases'),1,'current privacy owner sees own-purpose case');
select is(jsonb_array_length(pg_temp.follow(5)->'cases'),0,'operations cannot see privacy cases');
select is(jsonb_array_length(pg_temp.follow(7)->'cases'),0,'administrator coverage review has no client cases');
select ok((pg_temp.follow()->'cases'->0->>'canRespond')::boolean,'current primary may acknowledge');
select ok(not has_function_privilege('anon','public.staff_support_followup(jsonb,jsonb)','execute'),'anonymous followup denied');
select ok(not has_function_privilege('authenticated','public.staff_support_followup(jsonb,jsonb)','execute'),'browser RPC denied');
select ok(not has_table_privilege('service_role','audit_private.notification_followup_actions','select'),'service direct audit access denied');
select ok(not has_table_privilege('service_role','audit_private.notification_nonacceptance_evidence','insert'),'server cannot fabricate reconciliation evidence');
select is((select count(*) from pg_class where oid in('audit_private.notification_followup_actions'::regclass,'audit_private.notification_nonacceptance_evidence'::regclass) and relrowsecurity and relforcerowsecurity),2::bigint,'new tables force RLS');
select throws_ok($$select pg_temp.follow(cmd=>'{"action":"read","email":"secret"}')$$,'42501','FOLLOWUP_REJECTED','free text and addresses rejected');
select throws_ok($$select public.staff_support_followup(pg_temp.pc(),'{"action":"read"}')$$,'42501','WORKFORCE_REJECTED','patient cannot become workforce');
select throws_ok($$select public.staff_support_followup(pg_temp.sc(1)||'{"tenantId":"10000000-0000-4000-8000-000000000002"}','{"action":"read"}')$$,'42501','WORKFORCE_REJECTED','wrong tenant denied');
select throws_ok($t$do $$begin update auth.sessions set aal='aal1' where id=(select provider_session from support_actors where n=1);perform pg_temp.follow();end$$$t$,'42501','WORKFORCE_REJECTED','AAL1 denied');
select throws_ok($t$do $$begin update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from support_actors where n=1);perform pg_temp.follow();end$$$t$,'42501','WORKFORCE_REJECTED','revoked role denied');

-- Each notification/lease is synthetic; no transport/provider call occurs.
insert into audit_private.transactional_notifications(id,tenant_id,subject_id,source_kind,source_id,source_version,template,owner)
select ('f1400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001',
(select subject_id from rights_context),'rights',gen_random_uuid(),'1','account-v1','privacy' from generate_series(1,8)n;
insert into audit_private.transactional_dispatch(notification_id,state,attempt,lease_id,reason,next_attempt_at,destination_hash)
select id,case when right(id::text,1)='2' then 'uncertain' when right(id::text,1)='3' then 'accepted' else 'failed' end,
case when right(id::text,1)='4' then 3 else 1 end,
('f1410000-0000-4000-8000-'||right(id::text,12))::uuid,
case when right(id::text,1)='2' then 'TRANSPORT_UNCERTAIN' else 'TRANSPORT_FAILED' end,clock_timestamp(),
encode(extensions.digest(convert_to('rights@example.invalid','UTF8'),'sha256'),'hex')
from audit_private.transactional_notifications where id::text like 'f1400000%';
insert into audit_private.transactional_attempts(lease_id,notification_id,attempt)
select lease_id,notification_id,attempt from audit_private.transactional_dispatch where notification_id::text like 'f1400000%';
insert into audit_private.transactional_delivery_facts(lease_id,outcome)
select lease_id,case state when 'uncertain' then 'uncertain' when 'accepted' then 'accepted' else 'failed' end
from audit_private.transactional_dispatch where notification_id::text like 'f1400000%';
create function pg_temp.cmd(act text default 'acknowledged', num int default 1,k uuid default gen_random_uuid()) returns jsonb language sql as $$
select jsonb_build_object('action',act,'reference',('f1400000-0000-4000-8000-'||lpad(num::text,12,'0'))::uuid,'requestKey',k,'reason',
case act when 'acknowledged' then 'review_started' when 'resolved' then 'secure_followup_completed' else 'confirmed_non_acceptance' end)$$;
create function pg_temp.item(num int default 1) returns jsonb language sql as $$select x from jsonb_array_elements(pg_temp.follow()->'notifications')x where x->>'reference'='f1400000-0000-4000-8000-'||lpad(num::text,12,'0')$$;
select is(pg_temp.item()->>'state','failed','definite failure separately projected');
select is(pg_temp.item(2)->>'state','uncertain','uncertainty separately projected');
select is(pg_temp.item(3)->>'state','accepted','provider acceptance is not delivery');
select ok(not (pg_temp.item()->>'canResend')::boolean,'resend requires acknowledgement');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend'))$$,'40001','FOLLOWUP_CONFLICT','unreviewed resend denied');
select throws_ok($$select pg_temp.follow(5,pg_temp.cmd())$$,'42501','FOLLOWUP_REJECTED','operations cannot handle privacy transport');
select throws_ok($$select pg_temp.follow(3,pg_temp.cmd())$$,'42501','FOLLOWUP_REJECTED','clinical cannot handle unrelated privacy transport');
select throws_ok($$select pg_temp.follow(7,pg_temp.cmd())$$,'42501','FOLLOWUP_REJECTED','administrator cannot impersonate purpose owner');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resolved'))$$,'40001','FOLLOWUP_CONFLICT','resolution requires owner acknowledgement');
create temporary table ack_receipt as select pg_temp.follow(cmd=>pg_temp.cmd(k=>'f1420000-0000-4000-8000-000000000001')) value;
select is(pg_temp.follow(cmd=>pg_temp.cmd(k=>'f1420000-0000-4000-8000-000000000001')),(select value from ack_receipt),'same-key acknowledgement replay exact');
select is((select count(*) from audit_private.notification_followup_actions),1::bigint,'replay not duplicated');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resolved',k=>'f1420000-0000-4000-8000-000000000001'))$$,'40001','FOLLOWUP_CONFLICT','changed replay conflicts');
select ok((pg_temp.item()->>'canResend')::boolean,'acknowledged definite nonacceptance eligible');
select throws_ok($t$do $$begin insert into audit_private.transactional_suppressions(tenant_id,subject_id,reason) values('10000000-0000-4000-8000-000000000001',(select subject_id from rights_context),'provider_suppressed');perform pg_temp.follow(cmd=>pg_temp.cmd('resend'));end$$$t$,'40001','FOLLOWUP_CONFLICT','suppression never overridden');
select throws_ok($t$do $$begin update public.client_profiles set contact_preference='whatsapp' where subject_id=(select subject_id from rights_context);perform pg_temp.follow(cmd=>pg_temp.cmd('resend'));end$$$t$,'40001','FOLLOWUP_CONFLICT','unavailable channel cannot resend');
select throws_ok($t$do $$begin update public.subject_contacts set normalized_value='changed@example.invalid' where subject_id=(select subject_id from rights_context) and kind='email';perform pg_temp.follow(cmd=>pg_temp.cmd('resend'));end$$$t$,'40001','FOLLOWUP_CONFLICT','changed contact cannot resend');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',k=>'f1420000-0000-4000-8000-000000000002'))$$,'nonacceptance retry queues, does not send');
select is((select state from audit_private.transactional_dispatch where notification_id='f1400000-0000-4000-8000-000000000001'),'pending','manual retry pending');
select is((select attempt from audit_private.transactional_dispatch where notification_id='f1400000-0000-4000-8000-000000000001'),1,'resend does not reset attempts');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',k=>'f1420000-0000-4000-8000-000000000002'))$$,'exact resend replay idempotent');
select is((select count(*) from audit_private.notification_followup_actions where action='resend'),1::bigint,'no duplicate resend fact');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend'))$$,'40001','FOLLOWUP_CONFLICT','fresh retry cannot duplicate pending send');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd(num=>2))$$,'uncertain item acknowledged for review');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',2))$$,'40001','FOLLOWUP_CONFLICT','unreconciled uncertainty cannot resend');
insert into audit_private.notification_nonacceptance_evidence(notification_id,lease_id,reviewed_by_subject_id,evidence_sha256,approval_reference,expires_at)
values('f1400000-0000-4000-8000-000000000002','f1410000-0000-4000-8000-000000000002',
'20000000-0000-4000-8000-000000000003',repeat('a',64),gen_random_uuid(),clock_timestamp()+interval '1 hour');
select ok((pg_temp.item(2)->>'canResend')::boolean,'independent current administrator evidence permits exact uncertain lease');
select throws_ok($t$do $$begin update public.tenant_memberships set status='revoked' where subject_id='20000000-0000-4000-8000-000000000003' and role='admin';perform pg_temp.follow(cmd=>pg_temp.cmd('resend',2));end$$$t$,'42501','FOLLOWUP_REJECTED','revoked policy approval fails before resend');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',2))$$,'reconciled exact lease queues bounded retry');
savepoint late_delivery;
insert into audit_private.transactional_message_bindings(lease_id,message_hash) values('f1410000-0000-4000-8000-000000000002',repeat('c',64));
insert into audit_private.transactional_provider_deliveries(lease_id,event,occurred_at) values('f1410000-0000-4000-8000-000000000002','delivered',clock_timestamp());
select public.claim_transactional_notification('10000000-0000-4000-8000-000000000001');
select is((select state from audit_private.transactional_dispatch where notification_id='f1400000-0000-4000-8000-000000000002'),'uncertain','late delivery prevents a new requeued claim');
select is((select attempt from audit_private.transactional_dispatch where notification_id='f1400000-0000-4000-8000-000000000002'),1,'late delivery does not increment source attempts');
rollback to savepoint late_delivery;
savepoint stale_proof;
alter table audit_private.notification_nonacceptance_evidence disable trigger notification_nonacceptance_evidence_immutable;
update audit_private.notification_nonacceptance_evidence set recorded_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour';
alter table audit_private.notification_nonacceptance_evidence enable trigger notification_nonacceptance_evidence_immutable;
select public.claim_transactional_notification('10000000-0000-4000-8000-000000000001');
select is((select state from audit_private.transactional_dispatch where notification_id='f1400000-0000-4000-8000-000000000002'),'uncertain','proof expiry before dispatch contains requeued uncertainty');
rollback to savepoint stale_proof;
select ok(not has_function_privilege('service_role','audit_private.claim_transactional_before_followup(uuid)','execute'),'retired inner sender cannot bypass followup reconciliation');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd(num=>3))$$,'accepted transport may be reviewed');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',3))$$,'40001','FOLLOWUP_CONFLICT','accepted transport never resends');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd(num=>4))$$,'exhausted item review allowed');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',4))$$,'40001','FOLLOWUP_CONFLICT','three attempts cap cannot be reset');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd(num=>5))$$,'provider evidence item review');
insert into audit_private.transactional_message_bindings(lease_id,message_hash) values('f1410000-0000-4000-8000-000000000005',repeat('b',64));
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',5))$$,'40001','FOLLOWUP_CONFLICT','provider acceptance binding blocks blind resend');
insert into audit_private.transactional_provider_deliveries(lease_id,event,occurred_at) values('f1410000-0000-4000-8000-000000000005','soft_bounce',clock_timestamp());
select is(pg_temp.item(5)->>'state','delivery_failed','attributed delivery failure is visible');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',5))$$,'40001','FOLLOWUP_CONFLICT','provider failure requires secure followup not duplicate transport');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd(num=>6))$$,'budget fixture acknowledged');
savepoint quota;
insert into audit_private.operations_alert_attempts(lease_id,alert_id,attempt,recorded_at)
select gen_random_uuid(),id,1,clock_timestamp() from audit_private.operations_alerts limit 0;
-- Use isolated notification intents to fill exactly the existing shared daily budget.
insert into audit_private.transactional_notifications(id,tenant_id,subject_id,source_kind,source_id,source_version,template,owner)
select gen_random_uuid(),'10000000-0000-4000-8000-000000000001',(select subject_id from rights_context),'rights',gen_random_uuid(),'1','account-v1','privacy'
from generate_series(1,50-audit_private.notification_budget_used())n;
insert into audit_private.transactional_attempts(lease_id,notification_id,attempt)
select gen_random_uuid(),id,1 from audit_private.transactional_notifications n where not exists(select 1 from audit_private.transactional_attempts where notification_id=n.id) and id::text not like 'f1400000%'
limit (50-audit_private.notification_budget_used());
select is(audit_private.notification_budget_used(),50::bigint,'shared daily budget exhausted');
select throws_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resend',6))$$,'40001','FOLLOWUP_CONFLICT','manual resend cannot bypass shared budget');
rollback to savepoint quota;
select throws_ok($$update audit_private.notification_followup_actions set reason='review_started'$$,'55000','APPEND_ONLY_RECORD','responses immutable');
select throws_ok($$delete from audit_private.notification_nonacceptance_evidence$$,'55000','APPEND_ONLY_RECORD','independent evidence immutable');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resolved',6))$$,'secure followup resolution after acknowledgement');
select is(pg_temp.item(6),null::jsonb,'resolved review removed from active queue');
select is((select state from audit_private.transactional_dispatch where notification_id='f1400000-0000-4000-8000-000000000006'),'failed','review resolution does not rewrite transport');
savepoint later_failure;
insert into audit_private.transactional_attempts(lease_id,notification_id,attempt)
values('f1410000-0000-4000-8000-000000000016','f1400000-0000-4000-8000-000000000006',2);
insert into audit_private.transactional_delivery_facts(lease_id,outcome)
values('f1410000-0000-4000-8000-000000000016','uncertain');
select ok(pg_temp.item(6) is not null,'later transport evidence reopens closed review');
select lives_ok($$select pg_temp.follow(cmd=>pg_temp.cmd('resolved',6))$$,'new revision can have separate immutable resolution');
select is((select count(*) from audit_private.notification_followup_actions where notification_id='f1400000-0000-4000-8000-000000000006' and action='resolved'),2::bigint,'both revision resolutions preserved');
rollback to savepoint later_failure;
savepoint atomic;
select pg_temp.follow(cmd=>pg_temp.cmd(num=>8));
rollback to savepoint atomic;
select is((select count(*) from audit_private.notification_followup_actions where notification_id='f1400000-0000-4000-8000-000000000008'),0::bigint,'rollback removes review fact');
savepoint absence;
update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from support_actors where n=2);
select is(jsonb_array_length(pg_temp.follow(7)->'coverage'),1,'administrator sees unavailable privacy coverage without client data');
select is(jsonb_array_length(pg_temp.follow(7)->'notifications'),0,'coverage administrator sees no client notifications');
rollback to savepoint absence;
savepoint missing_coverage;
update identity_private.support_routes set revoked_at=clock_timestamp();
select is(jsonb_array_length(pg_temp.follow(7)->'coverage'),3,'missing coverage for all purposes remains visibly unavailable');
select is(pg_temp.follow(7)->'coverage'->0->'reference','null'::jsonb,'coverage review discloses no client or policy identifier');
rollback to savepoint missing_coverage;
select throws_ok($t$do $$begin update public.tenants set status='suspended' where id='10000000-0000-4000-8000-000000000001';perform pg_temp.follow();end$$$t$,'42501','WORKFORCE_REJECTED','suspended tenant closes queue');
select * from finish();
rollback;
