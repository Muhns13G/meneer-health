begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values ('97000000-0000-4000-8000-000000000001','portal@example.invalid',now(),false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values ('97000000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,
  expires_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
values ('97000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',
  encode(extensions.digest(convert_to('portal@example.invalid','UTF8'),'sha256'),'hex'),
  'patient','97000000-0000-4000-8000-000000000001',now()+interval '1 hour',
  '20000000-0000-4000-8000-000000000001','operations',gen_random_uuid(),'delivered',now());
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,
  content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
values
('97000000-0000-4000-8000-000000000004','pilot-account-terms','1.0','Synthetic terms only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('97000000-0000-4000-8000-000000000005','pilot-privacy-notice','1.0','Synthetic privacy only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
select public.activate_pilot_account('97000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000002',jsonb_build_object(
    'givenName','Synthetic','familyName','Client','mobileE164','+27820000000','contactPreference','whatsapp',
    'termsPublicationId','97000000-0000-4000-8000-000000000004',
    'termsHash',encode(extensions.digest(convert_to('Synthetic terms only','UTF8'),'sha256'),'hex'),
    'privacyPublicationId','97000000-0000-4000-8000-000000000005',
    'privacyHash',encode(extensions.digest(convert_to('Synthetic privacy only','UTF8'),'sha256'),'hex'),
    'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid()));
create temporary table portal_context as select subject_id from public.external_identities
  where provider='supabase' and provider_subject='97000000-0000-4000-8000-000000000001';
grant select on portal_context to service_role;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,
  issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select '97000000-0000-4000-8000-000000000006',subject_id,'97000000-0000-4000-8000-000000000002',
  'patient','aal1',now(),now(),now()+interval '30 minutes',now()+interval '12 hours' from portal_context;
create function pg_temp.portal(tenant uuid default '10000000-0000-4000-8000-000000000001',
  subject uuid default null, provider uuid default '97000000-0000-4000-8000-000000000001',
  purpose text default 'account') returns jsonb language sql as $$
  select public.read_patient_portal(tenant,coalesce(subject,(select subject_id from portal_context)),
    '97000000-0000-4000-8000-000000000006',provider,'97000000-0000-4000-8000-000000000002',
    'portal@example.invalid',purpose);
$$;


-- Three disposable staff identities: delivering operator, independent reviewer, security admin.
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous) values
('b6000000-0000-4000-8000-000000000101','deliverer@example.invalid',now(),false,false),
('b6000000-0000-4000-8000-000000000102','reviewer@example.invalid',now(),false,false),
('b6000000-0000-4000-8000-000000000103','approver@example.invalid',now(),false,false);
create temporary table channel_staff as select e.subject_id,u.id provider_id,u.email,
case when right(u.id::text,3)='103' then 'admin' else 'operations' end role,
gen_random_uuid() provider_session,gen_random_uuid() app_session
from public.external_identities e join auth.users u on e.provider_subject=u.id::text
where u.id::text like 'b6000000-%';
grant select on channel_staff to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
select provider_session,provider_id,now(),now(),'aal2' from channel_staff;
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001',subject_id,role,'active',now()-interval '1 day',now()+interval '1 day',
'20000000-0000-4000-8000-000000000003' from channel_staff;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select app_session,subject_id,provider_session,case role when 'admin' then 'privileged' else 'workforce' end,
'aal2',now(),now(),now()+interval '10 minutes',now()+interval '1 hour' from channel_staff;
insert into public.operations_cases(id,tenant_id,subject_id,state)
select 'b6000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001',subject_id,'ready_for_handoff' from portal_context;
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
select '10000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000010',(select subject_id from portal_context),
subject_id,'20000000-0000-4000-8000-000000000003',now()-interval '1 minute',now()+interval '1 hour' from channel_staff where role='operations';
insert into public.operations_claims(tenant_id,case_id,subject_id,assignment_id,workforce_subject_id)
select tenant_id,case_id,subject_id,id,workforce_subject_id from public.operations_assignments
where workforce_subject_id=(select subject_id from channel_staff where email='deliverer@example.invalid');
insert into public.pilot_instrument_publications(instrument_id,instrument_version,document_body,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
values('pilot-handoff-authorisation','1.0','Synthetic hand-off only.','/account/synthetic-handoff','local-only',
'20000000-0000-4000-8000-000000000003',now()-interval '1 day',now()-interval '1 day');
insert into public.pilot_instrument_receipts(tenant_id,subject_id,publication_id,instrument_id,instrument_version,locale,content_sha256,action,assurance,workflow_reference,purpose,recipient_reference,idempotency_key,correlation_id)
select '10000000-0000-4000-8000-000000000001',(select subject_id from portal_context),id,instrument_id,instrument_version,locale,content_sha256,
'accepted','aal1','b6000000-0000-4000-8000-000000000010','operations','b6000000-0000-4000-8000-000000000011',gen_random_uuid(),'synthetic_channel'
from public.pilot_instrument_publications where instrument_id='pilot-handoff-authorisation';
insert into public.handoff_authorisations(id,tenant_id,case_id,subject_id,receipt_id,destination_id,destination_digest,destination_version,authorised_at,expires_at)
select 'b6000000-0000-4000-8000-000000000012',tenant_id,workflow_reference,subject_id,id,recipient_reference,repeat('a',64),1,recorded_at,recorded_at+interval '1 day'
from public.pilot_instrument_receipts where instrument_id='pilot-handoff-authorisation';
create function pg_temp.approve(p_email text default 'approver@example.invalid',key uuid default 'b6000000-0000-4000-8000-000000000020')
returns uuid language sql as $$select public.approve_portal_handoff_destination(provider_id,provider_session,email,app_session,subject_id,
'10000000-0000-4000-8000-000000000001','b6000000-0000-4000-8000-000000000011',1,repeat('a',64),
'b6000000-0000-4000-8000-000000000019',key) from channel_staff where channel_staff.email=p_email$$;
create function pg_temp.version() returns integer language sql security definer as $$select version from public.operations_cases where id='b6000000-0000-4000-8000-000000000010'$$;
create function pg_temp.command(action text,extra jsonb) returns jsonb language sql as $$
select public.command_operations_handoff(provider_id,provider_session,email,app_session,subject_id,
'10000000-0000-4000-8000-000000000001',jsonb_build_object('caseId','b6000000-0000-4000-8000-000000000010',
'action',action,'expectedVersion',pg_temp.version(),
'requestKey',gen_random_uuid())||extra) from channel_staff where email='deliverer@example.invalid'$$;
create function pg_temp.attempt() returns uuid language sql security definer as $$select id from public.handoff_attempts where case_id='b6000000-0000-4000-8000-000000000010'$$;
create function pg_temp.issue(key uuid default 'b6000000-0000-4000-8000-000000000021',digest text default repeat('a',64))
returns uuid language sql as $$select public.issue_patient_handoff_link('10000000-0000-4000-8000-000000000001',subject_id,
'97000000-0000-4000-8000-000000000006','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','portal@example.invalid',
'b6000000-0000-4000-8000-000000000011',1,digest,key) from portal_context$$;
create function pg_temp.verify(kind text default 'delivered',p_email text default 'reviewer@example.invalid',key uuid default gen_random_uuid(),
extra jsonb default '{}') returns uuid language sql as $$
select public.verify_operations_handoff_evidence(provider_id,provider_session,email,app_session,subject_id,
'10000000-0000-4000-8000-000000000001',jsonb_build_object('caseId','b6000000-0000-4000-8000-000000000010',
'attemptId',pg_temp.attempt(),'kind',kind,'externalReference','b6000000-0000-4000-8000-000000000030',
'sourceReference',gen_random_uuid(),'observedAt',clock_timestamp(),'requestKey',key)||extra)
from channel_staff where channel_staff.email=p_email$$;

select ok(not has_table_privilege('service_role','identity_private.handoff_boundary_events','select,insert,update,delete'),'private immutable boundary journal');
select ok(not has_function_privilege('anon','public.issue_patient_handoff_link(uuid,uuid,uuid,uuid,uuid,text,uuid,integer,text,uuid)','execute'),'no anonymous link issuance');
select ok(not has_function_privilege('authenticated','public.verify_operations_handoff_evidence(uuid,uuid,text,uuid,uuid,uuid,jsonb)','execute'),'no browser evidence RPC');
set local role service_role;
select throws_ok($$select pg_temp.approve('deliverer@example.invalid')$$,'42501','HANDOFF_REJECTED','operations cannot approve destination');
select is(pg_temp.approve(),'b6000000-0000-4000-8000-000000000011'::uuid,'AAL2 admin approves current digest only');
select is(pg_temp.approve(),'b6000000-0000-4000-8000-000000000011'::uuid,'approval exact replay');
reset role;
select is((select count(*) from public.audit_events where action='operations.destination.approved'),1::bigint,'destination approval exact replay appends one central fact');
create function pg_temp.alerts(app uuid default null,tenant uuid default '10000000-0000-4000-8000-000000000001')
returns jsonb language sql as $$ select public.read_operations_alerts(provider_id,provider_session,email,
coalesce(app,app_session),subject_id,tenant) from channel_staff where email='approver@example.invalid' $$;
set local role service_role;
select is(jsonb_array_length(pg_temp.alerts()),2,'live AAL2 administrator can review assignment alerts');
select is((select count(*) from jsonb_object_keys(pg_temp.alerts()->0)),8::bigint,'alert projection contains only eight approved fields');
select throws_ok($$select pg_temp.alerts(gen_random_uuid())$$,'42501','WORKFORCE_REJECTED','forged review session denied');
select throws_ok($$select pg_temp.alerts(tenant=>'10000000-0000-4000-8000-000000000002')$$,'42501','WORKFORCE_REJECTED','cross-tenant review denied');
reset role;
select throws_ok($$select public.read_operations_alerts(provider_id,provider_session,email,null,subject_id,
  '10000000-0000-4000-8000-000000000001') from channel_staff where email='approver@example.invalid'$$,
  '42501','OPERATIONS_ALERT_REJECTED','pending MFA null-session bypass denied');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1' where user_id=(select provider_id from channel_staff where email='approver@example.invalid');
  perform pg_temp.alerts(); end$$$test$,'42501','WORKFORCE_REJECTED','email-only administrator cannot review alerts');
select throws_ok($test$do $$begin update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from channel_staff where email='approver@example.invalid');
  perform pg_temp.alerts(); end$$$test$,'42501','WORKFORCE_REJECTED','revoked administrator cannot review alerts');
select ok(exists(select 1 from public.audit_events where action='operations.alert.read'),'alert reviews are audited without claiming human acknowledgement');
set local role service_role;
select throws_ok($$select pg_temp.command('prepare','{"authorisationId":"b6000000-0000-4000-8000-000000000012"}')$$,'55000','QUEUE_NOT_READY','production payment adapter still false');
reset role;
-- Rollback-bound test adapter only; never marks an actual Stripe payment.
create or replace function identity_private.handoff_payment_ready(p_case_id uuid) returns boolean language sql stable set search_path='' as $$
select p_case_id='b6000000-0000-4000-8000-000000000010'::uuid$$;
set local role service_role;
select is(pg_temp.command('prepare','{"authorisationId":"b6000000-0000-4000-8000-000000000012"}')->>'attemptState','prepared','prepared intent');
select throws_ok($$select pg_temp.issue()$$,'55000','HANDOFF_NOT_READY','cannot issue before operator begins');
select is(pg_temp.command('begin_delivery',jsonb_build_object('attemptId',pg_temp.attempt()))->>'attemptState','delivery_pending','pending boundary');
select throws_ok($$select pg_temp.issue(digest=>repeat('b',64))$$,'55000','HANDOFF_NOT_READY','changed configured link digest denied');
reset role;
select throws_ok($test$do $$begin update identity_private.handoff_destinations set revoked_at=clock_timestamp(); perform pg_temp.issue(); end$$$test$,'55000','HANDOFF_NOT_READY','revoked destination cannot issue');
select throws_ok($test$do $$begin
 insert into public.pilot_instrument_receipt_events(tenant_id,subject_id,receipt_id,event_type,actor_subject_id,reason_code,idempotency_key,correlation_id)
 select tenant_id,subject_id,id,'withdrawn',subject_id,'synthetic',gen_random_uuid(),'synthetic-handoff'
 from public.pilot_instrument_receipts where instrument_id='pilot-handoff-authorisation';
 perform pg_temp.issue(); end$$$test$,'55000','HANDOFF_NOT_READY','withdrawn hand-off receipt cannot issue');
select throws_ok($test$do $$begin update public.identity_sessions set idle_expires_at=clock_timestamp()+interval '100 milliseconds' where id='97000000-0000-4000-8000-000000000006'; perform pg_sleep(0.15); perform pg_temp.issue(); end$$$test$,'55000','HANDOFF_NOT_READY','patient wall-clock expiry cannot issue');
select throws_ok($test$do $$begin update public.subjects set status='suspended' where id=(select subject_id from portal_context); perform pg_temp.issue(); end$$$test$,'42501','PORTAL_REJECTED','suspended patient cannot issue');
select throws_ok($test$do $$begin delete from auth.sessions where id='97000000-0000-4000-8000-000000000002'; perform pg_temp.issue(); end$$$test$,'42501','PORTAL_REJECTED','logged out provider session cannot issue');
create function pg_temp.fail_boundary_audit() returns trigger language plpgsql as $$begin raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end$$;
create trigger synthetic_boundary_audit_failure before insert on identity_private.handoff_boundary_events for each row execute function pg_temp.fail_boundary_audit();
select throws_ok($$select pg_temp.issue()$$,'55000','SYNTHETIC_AUDIT_FAILURE','audit failure prevents link issuance');
select is((select count(*) from identity_private.handoff_boundary_events where kind='portal_link_issued'),0::bigint,'failed issuance leaves no release evidence');
drop trigger synthetic_boundary_audit_failure on identity_private.handoff_boundary_events;
set local role service_role;
select is(pg_temp.issue(),pg_temp.attempt(),'own live patient can issue approved link');
select is(pg_temp.issue(),pg_temp.attempt(),'bounded same-key recovery does not duplicate issuance');
select throws_ok($$select pg_temp.issue(gen_random_uuid())$$,'40001','HANDOFF_CONFLICT','new key cannot resend issued link');
select throws_ok($$select pg_temp.verify(p_email=>'deliverer@example.invalid')$$,'42501','HANDOFF_REJECTED','deliverer cannot verify own evidence');
select throws_ok($$select pg_temp.verify(extra=>'{"protocol":"forbidden"}')$$,'22023','HANDOFF_INPUT_INVALID','clinical fields rejected');
select throws_ok($$select pg_temp.verify(extra=>jsonb_build_object('observedAt',now()+interval '1 day'))$$,'22023','HANDOFF_INPUT_INVALID','future observations denied');
reset role;
select is((select state from public.handoff_attempts),'delivery_pending','link issuance does not imply provider receipt');
select is((select count(*) from public.handoff_acknowledgements),0::bigint,'link issuance does not create acknowledgement');
select throws_ok($test$do $$begin update public.operations_assignments set revoked_at=clock_timestamp()
where workforce_subject_id=(select subject_id from channel_staff where email='reviewer@example.invalid');
perform pg_temp.verify(); end$$$test$,'42501','HANDOFF_REJECTED','revoked reviewer assignment denied');
select throws_ok($test$do $$begin update public.identity_sessions set idle_expires_at=clock_timestamp()+interval '100 milliseconds'
where subject_id=(select subject_id from channel_staff where email='reviewer@example.invalid');
perform pg_sleep(0.15); perform pg_temp.verify(); end$$$test$,'42501','HANDOFF_REJECTED','reviewer wall-clock expiry denied');
set local role service_role;
select is(pg_temp.command('reconcile_delivery',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.verify()))->>'state','handed_off','independent delivery record reconciled');
select is(pg_temp.command('acknowledge',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.verify('acknowledged')))->>'state','provider_acknowledged','independent record acknowledgement');
select is(pg_temp.command('review',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.verify('review_pending')))->>'state','provider_review_pending','record-level review evidence');
select is(pg_temp.command('outcome',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.verify('completed')))->>'state','provider_outcome_recorded','nonclinical outcome evidence');
select throws_ok($$select pg_temp.issue()$$,'55000','HANDOFF_NOT_READY','terminal case cannot disclose link');
reset role;
select is((select count(*) from identity_private.handoff_evidence),4::bigint,'four bounded independently verified observations');
select ok(not exists(select 1 from identity_private.handoff_boundary_events where kind='portal_link_issued' and actor_subject_id<>(select subject_id from portal_context)),'issuance attributed to own patient');
select throws_ok($$update identity_private.handoff_boundary_events set kind='portal_link_issued'$$,'55000','APPEND_ONLY_RECORD','boundary evidence immutable');
-- Synthetic alert delivery and human response controls, all rolled back with this packet.
create temporary table alert_test_claim(value jsonb);
grant all on alert_test_claim to service_role;
set local role service_role;
insert into alert_test_claim select public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001');
reset role;
select ok((select value is not null from alert_test_claim),'dispatcher claims one durable notification');
select is((select count(*) from jsonb_object_keys((select value from alert_test_claim))),5::bigint,'claim contains only approved transport fields');
select ok(not has_function_privilege('authenticated','public.claim_operations_alert_notification(uuid)','execute'),'browser cannot dispatch alerts');
select ok(not has_table_privilege('service_role','audit_private.operations_alert_responses','insert'),'service cannot forge human response rows');
create function pg_temp.finish_alert(outcome text) returns boolean language sql as $$
  select public.finish_operations_alert_notification('10000000-0000-4000-8000-000000000001',
    (value->>'alertId')::uuid,(value->>'leaseId')::uuid,outcome) from alert_test_claim$$;
set local role service_role;
select ok(pg_temp.finish_alert('retryable'),'known throttling receipt persisted');
select ok(pg_temp.finish_alert('retryable'),'same receipt replay idempotent');
select throws_ok($$select pg_temp.finish_alert('accepted')$$,'40001','ALERT_CONFLICT','changed receipt cannot claim accepted');
reset role;
select is((select state from audit_private.operations_alert_dispatch where alert_id=(select (value->>'alertId')::uuid from alert_test_claim)),'pending','retryable attempt queues retry');
select ok((select next_attempt_at>clock_timestamp() from audit_private.operations_alert_dispatch where alert_id=(select (value->>'alertId')::uuid from alert_test_claim)),'retry has durable backoff');
update audit_private.operations_alert_dispatch set next_attempt_at=clock_timestamp()-interval '1 second' where alert_id=(select (value->>'alertId')::uuid from alert_test_claim);
set local role service_role;
update alert_test_claim set value=public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001');
select ok(pg_temp.finish_alert('uncertain'),'ambiguous delivery is recorded');
reset role;
select is((select state from audit_private.operations_alert_dispatch where alert_id=(select (value->>'alertId')::uuid from alert_test_claim)),'uncertain','ambiguous delivery is not retried automatically');
create function pg_temp.respond_alert(action text,key uuid default 'b6000000-0000-4000-8000-000000000050',p_email text default 'approver@example.invalid') returns uuid language sql as $$
select public.respond_operations_alert(provider_id,provider_session,email,app_session,subject_id,
'10000000-0000-4000-8000-000000000001',(select (value->>'alertId')::uuid from alert_test_claim),action,key)
from channel_staff where channel_staff.email=p_email$$;
set local role service_role;
select throws_ok($$select pg_temp.respond_alert('resolved')$$,'55000','ALERT_ACKNOWLEDGEMENT_REQUIRED','resolve requires prior human acknowledgement');
select throws_ok($$select pg_temp.respond_alert('acknowledged',p_email=>'deliverer@example.invalid')$$,'42501','OPERATIONS_ALERT_REJECTED','operations role cannot acknowledge security alerts');
select lives_ok($$select pg_temp.respond_alert('acknowledged')$$,'administrator acknowledges explicitly');
select lives_ok($$select pg_temp.respond_alert('acknowledged')$$,'human acknowledgement exact replay');
select throws_ok($$select pg_temp.respond_alert('resolved')$$,'40001','ALERT_CONFLICT','request key cannot change human action');
select lives_ok($$select pg_temp.respond_alert('resolved','b6000000-0000-4000-8000-000000000051')$$,'administrator explicitly resolves acknowledged alert');
reset role;
select is((select count(*) from audit_private.operations_alert_responses),2::bigint,'only two immutable human responses');
select is((select count(*) from public.audit_events where action in ('operations.alert.acknowledged','operations.alert.resolved')),2::bigint,'human responses feed central audit chain');
select throws_ok($$update audit_private.operations_alert_delivery_facts set outcome='accepted'$$,'55000','APPEND_ONLY_RECORD','transport evidence append only');
select throws_ok($$delete from audit_private.operations_alert_responses$$,'55000','APPEND_ONLY_RECORD','human responses append only');
set local role service_role;
update alert_test_claim set value=public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001');
reset role;
update audit_private.operations_alert_dispatch set lease_until=clock_timestamp()-interval '1 second' where alert_id=(select (value->>'alertId')::uuid from alert_test_claim);
set local role service_role;
select lives_ok($$select public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001')$$,'expired lease reconciled before further claim');
reset role;
select is((select outcome from audit_private.operations_alert_delivery_facts where lease_id=(select (value->>'leaseId')::uuid from alert_test_claim)),'uncertain','worker crash leaves immutable uncertainty evidence');
select throws_ok($$select public.finish_operations_alert_notification('10000000-0000-4000-8000-000000000002',(value->>'alertId')::uuid,(value->>'leaseId')::uuid,'uncertain') from alert_test_claim$$,'42501','ALERT_REJECTED','other tenant cannot finish an attempt');
select throws_ok($$select public.finish_operations_alert_notification('10000000-0000-4000-8000-000000000001',(value->>'alertId')::uuid,gen_random_uuid(),'accepted') from alert_test_claim$$,'40001','ALERT_CONFLICT','foreign lease cannot claim acceptance');
-- Isolated transport fixtures test retry ceilings and the shared UTC-day send budget.
insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
select tenant_id,audit_fact_id,'OPERATIONS_EXCEPTION',owner,'critical',gen_random_uuid()::text
from audit_private.operations_alerts limit 1;
set local role service_role;
update alert_test_claim set value=public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001');
select ok(pg_temp.finish_alert('retryable'),'first throttled attempt recorded');
reset role;
update audit_private.operations_alert_dispatch set next_attempt_at=clock_timestamp()-interval '1 second' where alert_id=(select (value->>'alertId')::uuid from alert_test_claim);
set local role service_role;
update alert_test_claim set value=public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001');
select ok(pg_temp.finish_alert('retryable'),'second throttled attempt recorded');
reset role;
update audit_private.operations_alert_dispatch set next_attempt_at=clock_timestamp()-interval '1 second' where alert_id=(select (value->>'alertId')::uuid from alert_test_claim);
set local role service_role;
update alert_test_claim set value=public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001');
select ok(pg_temp.finish_alert('retryable'),'third throttled attempt recorded');
reset role;
select is((select state from audit_private.operations_alert_dispatch where alert_id=(select (value->>'alertId')::uuid from alert_test_claim)),'failed','third rejection exhausts retries');
insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
select a.tenant_id,a.audit_fact_id,'OPERATIONS_EXCEPTION',a.owner,'warning',gen_random_uuid()::text
from (select * from audit_private.operations_alerts limit 1) a cross join generate_series(1,55);
do $$declare v jsonb; begin
  for i in 1..55 loop
    v:=public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001');
    exit when v is null;
    perform public.finish_operations_alert_notification('10000000-0000-4000-8000-000000000001',(v->>'alertId')::uuid,(v->>'leaseId')::uuid,'accepted');
  end loop;
end$$;
select is((select count(*) from audit_private.operations_alert_attempts),50::bigint,'global daily send-attempt budget enforced');
select is(public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'budget exhaustion leaves further alerts unsent');
select * from finish();
rollback;
