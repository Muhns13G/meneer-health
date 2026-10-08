begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
-- Disposable local-only Auth, publications and evidence; the entire packet rolls back.
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('a6000000-0000-4000-8000-000000000001','handoff@example.invalid',now(),false,false);
create temporary table handoff_actor as select subject_id from public.external_identities
where provider='supabase' and provider_subject='a6000000-0000-4000-8000-000000000001';
grant select on handoff_actor to service_role;
update public.tenant_memberships set valid_from=now()-interval '1 day'
 where subject_id='20000000-0000-4000-8000-000000000001' and role='patient';
insert into public.subject_contacts(subject_id,kind,normalized_value,status,provider,verified_at)
values('20000000-0000-4000-8000-000000000001','email','patient@example.invalid','verified','synthetic',now())
on conflict(subject_id,kind) do update set status='verified',verified_at=excluded.verified_at;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('a6000000-0000-4000-8000-000000000002','a6000000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003' from handoff_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select 'a6000000-0000-4000-8000-000000000003',subject_id,'a6000000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from handoff_actor;
insert into public.client_profiles(tenant_id,subject_id,given_name,family_name,mobile_e164)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic','Handoff','+27820000000');
insert into public.operations_cases(id,tenant_id,subject_id,state)
values('a6000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','ready_for_handoff');
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
select '10000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000010',
 '20000000-0000-4000-8000-000000000001',subject_id,'20000000-0000-4000-8000-000000000003',now()-interval '1 minute',now()+interval '1 hour' from handoff_actor;
insert into public.operations_claims(tenant_id,case_id,subject_id,assignment_id,workforce_subject_id)
select tenant_id,case_id,subject_id,id,workforce_subject_id from public.operations_assignments;
insert into public.pilot_instrument_publications(instrument_id,instrument_version,document_body,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
select instrument,'1.0','Synthetic nonbinding test instrument.','/account/synthetic-handoff','local-only',
 '20000000-0000-4000-8000-000000000003',now()-interval '1 day',now()-interval '1 day'
from unnest(array['pilot-account-terms','pilot-privacy-notice','pilot-handoff-authorisation']) instrument;
insert into public.pilot_instrument_receipts(tenant_id,subject_id,publication_id,instrument_id,instrument_version,locale,content_sha256,action,assurance,workflow_reference,purpose,recipient_reference,idempotency_key,correlation_id)
select '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',id,instrument_id,instrument_version,locale,content_sha256,
 case when instrument_id='pilot-privacy-notice' then 'acknowledged' else 'accepted' end,'aal1',
 case when instrument_id='pilot-handoff-authorisation' then 'a6000000-0000-4000-8000-000000000010'::uuid end,
 case when instrument_id='pilot-handoff-authorisation' then 'operations' end,
 case when instrument_id='pilot-handoff-authorisation' then 'a6000000-0000-4000-8000-000000000011'::uuid end,gen_random_uuid(),'synthetic_handoff'
from public.pilot_instrument_publications;
insert into public.handoff_authorisations(id,tenant_id,case_id,subject_id,receipt_id,destination_id,destination_digest,destination_version,authorised_at,expires_at)
select 'a6000000-0000-4000-8000-000000000012',tenant_id,workflow_reference,subject_id,id,recipient_reference,repeat('a',64),1,recorded_at,recorded_at+interval '1 day'
from public.pilot_instrument_receipts where instrument_id='pilot-handoff-authorisation';
create function pg_temp.version() returns integer language sql security definer as $$select version from public.operations_cases where id='a6000000-0000-4000-8000-000000000010'$$;
create function pg_temp.attempt() returns uuid language sql security definer as $$select id from public.handoff_attempts order by created_at desc,id desc limit 1$$;
create function pg_temp.handoff(action text,extra jsonb default '{}',key uuid default gen_random_uuid(),version integer default null)
returns jsonb language sql as $$select public.command_operations_handoff(
 'a6000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000002','handoff@example.invalid',
 'a6000000-0000-4000-8000-000000000003',(select subject_id from handoff_actor),'10000000-0000-4000-8000-000000000001',
 jsonb_build_object('caseId','a6000000-0000-4000-8000-000000000010','action',action,'expectedVersion',coalesce(version,pg_temp.version()),'requestKey',key)||extra)$$;
create function pg_temp.evidence(kind text,attempt uuid default pg_temp.attempt(),ref uuid default 'a6000000-0000-4000-8000-000000000030',verifier uuid default '20000000-0000-4000-8000-000000000003')
returns uuid language plpgsql security definer as $$declare result uuid;begin
 insert into identity_private.handoff_evidence(tenant_id,case_id,subject_id,attempt_id,destination_id,destination_version,kind,external_reference,source_reference,verified_by_subject_id,observed_at,verified_at,expires_at)
 values('10000000-0000-4000-8000-000000000001','a6000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001',attempt,
 'a6000000-0000-4000-8000-000000000011',1,kind,ref,gen_random_uuid(),verifier,clock_timestamp(),clock_timestamp(),clock_timestamp()+interval '1 day') returning id into result;
 return result; end$$;
select ok(not has_function_privilege('anon','public.command_operations_handoff(uuid,uuid,text,uuid,uuid,uuid,jsonb)','execute'),'anonymous handoff denied');
select ok(not has_function_privilege('authenticated','public.command_operations_handoff(uuid,uuid,text,uuid,uuid,uuid,jsonb)','execute'),'browser RPC denied');
select ok(not has_table_privilege('service_role','identity_private.handoff_evidence','select,insert,update,delete'),'service cannot fabricate provider evidence');
select ok(not has_table_privilege('service_role','identity_private.handoff_destinations','select,insert,update,delete'),'service cannot approve recipient/channel');
select ok(not has_function_privilege('service_role','identity_private.handoff_payment_ready(uuid)','execute'),'payment fact adapter private');
select is((select count(*) from identity_private.handoff_destinations),0::bigint,'migration approves no destination');
set local role service_role;
select throws_ok($$select pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}')$$,'55000','QUEUE_NOT_READY','unapproved destination cannot prepare');
reset role;
insert into identity_private.handoff_destinations(id,version,digest,method,approval_reference,approved_by_subject_id,approved_at,expires_at)
values('a6000000-0000-4000-8000-000000000011',1,repeat('a',64),'private_client_intake',gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()-interval '1 day',now()+interval '1 day');
set local role service_role;
select throws_ok($$select pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}')$$,'55000','QUEUE_NOT_READY','missing Sprint 11 ledger still denies approved recipient');
reset role;
-- Only this rollback transaction substitutes the future payment adapter, only for this fixture.
create or replace function identity_private.handoff_payment_ready(p_case_id uuid) returns boolean language sql stable set search_path='' as $$select p_case_id='a6000000-0000-4000-8000-000000000010'::uuid$$;
select throws_ok($test$do $$begin update identity_private.handoff_destinations set digest=repeat('b',64); perform pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}'); end$$$test$,'55000','QUEUE_NOT_READY','changed destination digest invalidates authorisation');
select throws_ok($test$do $$begin
 insert into identity_private.handoff_destinations select id,2,digest,method,approval_reference,approved_by_subject_id,approved_at,expires_at,null from identity_private.handoff_destinations;
 perform pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}');
 end$$$test$,'55000','QUEUE_NOT_READY','new approved recipient version invalidates old binding');
select throws_ok($test$do $$begin update public.pilot_instrument_publications set status='withdrawn',retired_at=clock_timestamp() where instrument_id='pilot-handoff-authorisation'; perform pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}'); end$$$test$,'55000','QUEUE_NOT_READY','withdrawn instrument denies delivery');
select throws_ok($test$do $$begin update public.operations_assignments set revoked_at=clock_timestamp(); perform pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}'); end$$$test$,'42501','QUEUE_REJECTED','revoked assignment denies');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1'; perform pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}'); end$$$test$,'42501','WORKFORCE_REJECTED','AAL1 denied');
select throws_ok($test$do $$begin
 update public.identity_sessions set idle_expires_at=clock_timestamp()+interval '100 milliseconds' where id='a6000000-0000-4000-8000-000000000003';
 perform pg_sleep(0.15);
 perform pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}');
 end$$$test$,'42501','QUEUE_REJECTED','transaction-fixed now cannot extend session validity');
select ok((identity_private.operations_readiness('a6000000-0000-4000-8000-000000000010')->>'accountActive')::boolean,'unbounded active patient membership remains active');
select is(identity_private.operations_readiness('a6000000-0000-4000-8000-000000000010')->>'recipientReadiness','approved','recipient readiness comes from private approved facts');
set local role service_role;
select is(pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}','a6000000-0000-4000-8000-000000000020',1)->>'attemptState','prepared','intent persists without pretending delivery');
select is(pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}','a6000000-0000-4000-8000-000000000020',1)->>'version','2','exact replay returns prepared receipt');
reset role;
select throws_ok($test$do $$begin update public.operations_assignments set revoked_at=clock_timestamp(); perform pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}','a6000000-0000-4000-8000-000000000020',1); end$$$test$,'42501','QUEUE_REJECTED','replay rechecks assignment');
create function pg_temp.fail_audit() returns trigger language plpgsql as $$begin raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end;$$;
create trigger synthetic_handoff_audit_failure before insert on public.operations_events for each row execute function pg_temp.fail_audit();
select throws_ok($$select pg_temp.handoff('begin_delivery',jsonb_build_object('attemptId',pg_temp.attempt()))$$,'55000','SYNTHETIC_AUDIT_FAILURE','audit failure rolls back delivery boundary');
select is((select state from public.handoff_attempts),'prepared','failed audit does not advance attempt');
select is(pg_temp.version(),2,'failed audit does not advance case');
drop trigger synthetic_handoff_audit_failure on public.operations_events;
set local role service_role;
select throws_ok($$select pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012"}')$$,'PT409','QUEUE_CONFLICT','new key cannot duplicate unresolved attempt');
select throws_ok($$select pg_temp.handoff('prepare','{"authorisationId":"a6000000-0000-4000-8000-000000000012","paid":true}')$$,'22023','QUEUE_INPUT_INVALID','paid override denied');
select throws_ok($$select pg_temp.handoff('begin_delivery',jsonb_build_object('attemptId',pg_temp.attempt()),'a6000000-0000-4000-8000-000000000020',2)$$,'PT409','QUEUE_CONFLICT','cross-action replay collision denied');
select is(pg_temp.handoff('begin_delivery',jsonb_build_object('attemptId',pg_temp.attempt()))->>'attemptState','delivery_pending','durable delivery boundary before external work');
select is(pg_temp.handoff('mark_uncertain',jsonb_build_object('attemptId',pg_temp.attempt()))->>'state','handoff_exception','timeout creates owned exception');
select is(public.sweep_operations_alerts('10000000-0000-4000-8000-000000000001',24),1,'sweep records delivery uncertainty');
select is(public.sweep_operations_alerts('10000000-0000-4000-8000-000000000001',24),0,'repeat sweep deduplicates uncertainty');
select throws_ok($$select pg_temp.handoff('cancel_handoff',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',null))$$,'55000','QUEUE_NOT_READY','uncertain cancellation needs independent evidence');
select throws_ok($$select pg_temp.handoff('retry',jsonb_build_object('attemptId',pg_temp.attempt(),'authorisationId','a6000000-0000-4000-8000-000000000012'))$$,'PT409','QUEUE_CONFLICT','uncertain delivery cannot be retried');
select throws_ok($$select pg_temp.handoff('reconcile_delivery',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',gen_random_uuid()))$$,'55000','QUEUE_NOT_READY','forged evidence reference denied');
select is(pg_temp.handoff('reconcile_delivery',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('not_delivered')))->>'attemptState','failed','independent negative receipt resolves delivery uncertainty');
reset role;
create temporary table failed_attempt as select id from public.handoff_attempts;
create temporary table failed_exception as select id from public.operations_exceptions where resolution_of_exception_id is null;
grant select on failed_attempt,failed_exception to service_role;
set local role service_role;
select is(pg_temp.handoff('resolve_exception',jsonb_build_object('exceptionId',(select id from failed_exception)))->>'state','ready_for_handoff','reconciliation appends resolution before retry');
select is(pg_temp.handoff('retry',jsonb_build_object('attemptId',(select id from failed_attempt),'authorisationId','a6000000-0000-4000-8000-000000000012'))->>'attemptState','prepared','definite failure gets linked new attempt');
select is(pg_temp.handoff('begin_delivery',jsonb_build_object('attemptId',pg_temp.attempt()))->>'attemptState','delivery_pending','retry revalidates before dispatch');
select is(pg_temp.handoff('reconcile_delivery',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('delivered')))->>'state','handed_off','confirmed delivery is not provider acknowledgement');
select is(public.sweep_operations_alerts('10000000-0000-4000-8000-000000000001',24),0,'fresh delivery does not produce overdue alert');
reset role;
-- The rollback-only packet rewinds the synthetic delivery timestamp, never production evidence.
create temporary table overdue_times as select id,created_at,delivered_at from public.handoff_attempts where id=pg_temp.attempt();
update public.handoff_attempts set created_at=clock_timestamp()-interval '26 hours',
  delivered_at=clock_timestamp()-interval '25 hours' where id=pg_temp.attempt();
select is(public.sweep_operations_alerts('10000000-0000-4000-8000-000000000001',24),1,'old delivered attempt without receipt raises overdue alert');
select is(public.sweep_operations_alerts('10000000-0000-4000-8000-000000000001',24),0,'overdue alert retry is deduplicated');
select is((select count(*) from public.handoff_acknowledgements),0::bigint,'alert does not manufacture provider acknowledgement');
update public.handoff_attempts h set created_at=t.created_at,delivered_at=t.delivered_at
from overdue_times t where h.id=t.id;
set local role service_role;
select throws_ok($$select pg_temp.handoff('acknowledge',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('acknowledged',pg_temp.attempt(),'a6000000-0000-4000-8000-000000000030',(select subject_id from handoff_actor))))$$,'55000','QUEUE_NOT_READY','delivering operator cannot verify own acknowledgement');
select throws_ok($$select pg_temp.handoff('acknowledge',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('review_pending')))$$,'PT409','QUEUE_CONFLICT','wrong evidence kind does not count as acknowledgement');
select throws_ok($$select pg_temp.handoff('acknowledge',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('acknowledged',pg_temp.attempt(),gen_random_uuid())))$$,'55000','QUEUE_NOT_READY','wrong external reference denied');
select is(pg_temp.handoff('acknowledge',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('acknowledged')))->>'state','provider_acknowledged','independently reviewed matched acknowledgement');
select is(pg_temp.handoff('review',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('review_pending')))->>'state','provider_review_pending','explicit record evidence advances external processing');
select is(pg_temp.handoff('outcome',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',pg_temp.evidence('completed')))->>'state','provider_outcome_recorded','bounded administrative outcome only');
select throws_ok($$select pg_temp.handoff('cancel_handoff',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',null))$$,'PT409','QUEUE_CONFLICT','terminal outcome immutable');
reset role;
select is((select count(*) from public.handoff_attempts),2::bigint,'only initial and linked retry attempts exist');
select is((select count(*) from public.handoff_acknowledgements),1::bigint,'one matched acknowledgement');
select is(public.sweep_operations_alerts('10000000-0000-4000-8000-000000000001',1),0,'acknowledged delivery no longer qualifies');
select is((select count(*) from public.operations_exceptions),2::bigint,'original exception and immutable resolution retained');
select is((select count(*) from public.operations_events),(select count(*) from identity_private.operations_commands),'one audit event per successful command');
select throws_ok($$update identity_private.handoff_evidence set kind='completed'$$,'55000','APPEND_ONLY_RECORD','provider facts append-only');
-- Separate cancellation branch from the same synthetic delivered checkpoint, not a production command.
update public.operations_cases set state='provider_review_pending',outcome=null where id='a6000000-0000-4000-8000-000000000010';
set local role service_role;
select is(pg_temp.handoff('cancel_handoff',jsonb_build_object('attemptId',pg_temp.attempt(),'evidenceId',null))->>'state','cancelled','post-delivery administrative cancellation is explicit');
reset role;
select is((select state from public.handoff_attempts where id=pg_temp.attempt()),'delivered','cancellation preserves external delivery history');
select is((select count(*) from public.operations_claims where released_at is null),0::bigint,'cancelled case releases its reservation');
select * from finish();
rollback;
