-- LOCAL ONLY historical SQL manifest; provider/MFA concurrency requires separate integration.
-- One named invitation guard is suspended only while installing elapsed historical fixture time;
-- it is restored before any acceptance check, and the entire packet rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
 values(md5('retirement-operator')::uuid,'retirement-operator@example.invalid',now(),false,false);
create temporary table actor as select subject_id from public.external_identities
 where provider_subject=md5('retirement-operator')::uuid::text;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 values(md5('retirement-operator-session')::uuid,md5('retirement-operator')::uuid,now(),now(),'aal2');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 values(gen_random_uuid(),md5('retirement-operator-session')::uuid,'totp',now(),now());
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 minute',now()+interval '1 hour',
 '20000000-0000-4000-8000-000000000003' from actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
 select md5('retirement-application-session')::uuid,subject_id,md5('retirement-operator-session')::uuid,
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from actor;
insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
 select '10000000-0000-4000-8000-000000000001',subject_id,'identity_contact','10000000-0000-4000-8000-000000000001',
 'operations','active',now()-interval '1 minute',now()+interval '1 hour' from actor;

insert into auth.users(id,email,is_sso_user,is_anonymous)
 values(md5('retirement-orphan')::uuid,'retirement-orphan@example.invalid',false,false);
create temporary table target as select subject_id from public.external_identities
 where provider_subject=md5('retirement-orphan')::uuid::text;
insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,provenance_reference,contact_authority_reference,request_key,created_at)
 select md5('retirement-mobile')::uuid,'10000000-0000-4000-8000-000000000001',subject_id,
 gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),now()-interval '33 days' from actor;
alter table identity_private.mobile_invitations disable trigger mobile_invitation_guard;
update identity_private.mobile_invitations set status='revoked',issued_at=now()-interval '33 days',
 expires_at=now()-interval '31 days',terminal_at=now()-interval '31 days'
 where id=md5('retirement-mobile')::uuid;
alter table identity_private.mobile_invitations enable trigger mobile_invitation_guard;
insert into identity_private.mobile_invitation_tokens(id,invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at,state)
 values(md5('retirement-token')::uuid,md5('retirement-mobile')::uuid,'10000000-0000-4000-8000-000000000001',1,
 repeat('a',64),now()-interval '33 days',now()-interval '31 days','expired');
insert into identity_private.mobile_invitation_claims(id,invitation_id,tenant_id,token_id,claim_digest,request_key,email_digest,state,issued_at,expires_at)
 values(md5('retirement-claim')::uuid,md5('retirement-mobile')::uuid,'10000000-0000-4000-8000-000000000001',
 md5('retirement-token')::uuid,repeat('b',64),gen_random_uuid(),encode(sha256(convert_to('retirement-orphan@example.invalid','UTF8')),'hex'),
 'expired',now()-interval '33 days',now()-interval '33 days'+interval '15 minutes');
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,created_at,
 issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
 select md5('retirement-email')::uuid,'10000000-0000-4000-8000-000000000001',
 encode(sha256(convert_to('retirement-orphan@example.invalid','UTF8')),'hex'),'patient',md5('retirement-orphan')::uuid::text,
 now()-interval '31 days',now()-interval '33 days',subject_id,'operations',gen_random_uuid(),'delivered',now()-interval '33 days' from actor;
insert into identity_private.mobile_email_exchanges(mobile_invitation_id,invitation_version,claim_id,email_invitation_id,state,reserved_at)
 values(md5('retirement-mobile')::uuid,1,md5('retirement-claim')::uuid,md5('retirement-email')::uuid,'delivered',now()-interval '33 days');
insert into identity_private.mobile_identity_creation_receipts(email_invitation_id,provider_subject_id,subject_id,recorded_at)
 select md5('retirement-email')::uuid,md5('retirement-orphan')::uuid,subject_id,now()-interval '33 days' from target;

create function pg_temp.reserve(request uuid default md5('retirement-command')::uuid) returns jsonb language sql as $$
 select public.reserve_mobile_orphan_retirement(md5('retirement-operator')::uuid,md5('retirement-operator-session')::uuid,
 'retirement-operator@example.invalid',md5('retirement-application-session')::uuid,(select subject_id from actor),
 '10000000-0000-4000-8000-000000000001',md5('retirement-email')::uuid,request) $$;
create function pg_temp.advance(action text,provider uuid default md5('retirement-orphan')::uuid) returns text language sql as $$
 select public.advance_mobile_orphan_retirement(md5('retirement-operator')::uuid,md5('retirement-operator-session')::uuid,
 'retirement-operator@example.invalid',md5('retirement-application-session')::uuid,(select subject_id from actor),
 '10000000-0000-4000-8000-000000000001',(select id from identity_private.mobile_orphan_retirements),action,provider) $$;
select is((identity_private.mobile_orphan_snapshot('10000000-0000-4000-8000-000000000001',md5('retirement-email')::uuid)->>'domainRecordsExist')::boolean,false,'orphan has no domain association');
select lives_ok($$select identity_private.assert_mobile_orphan_guard_coverage()$$,'all current subject FK columns have enabled barriers');
select throws_ok($test$do $$begin alter table public.subject_contacts disable trigger mobile_orphan_reference_guard;
 perform pg_temp.reserve();end$$$test$,'42501','MOBILE_ORPHAN_GUARD_COVERAGE_REQUIRED','missing guard prevents reservation');
select throws_ok($test$do $$begin create table identity_private.synthetic_new_subject_scope(subject_id uuid references public.subjects(id));
 perform pg_temp.reserve();end$$$test$,'42501','MOBILE_ORPHAN_GUARD_COVERAGE_REQUIRED','new unguarded FK relation prevents deletion dispatch');
select throws_ok($test$do $$begin update auth.mfa_amr_claims set updated_at=now()-interval '6 minutes'
 where session_id=md5('retirement-operator-session')::uuid;perform pg_temp.reserve();end$$$test$,
 '42501','MOBILE_ORPHAN_REJECTED','stale MFA cannot quarantine');
select throws_ok($test$do $$begin
 update auth.users set email_confirmed_at=now() where id=md5('retirement-orphan')::uuid;
 if pg_temp.reserve() is not null then raise exception 'UNSAFE_DISPATCH';end if;
 raise exception 'SYNTHETIC_PRESERVATION';end$$$test$,'P0001','SYNTHETIC_PRESERVATION','confirmed identity is preserved');
select throws_ok($test$do $$begin
 insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 values(gen_random_uuid(),md5('retirement-orphan')::uuid,now(),now(),'aal1');
 if pg_temp.reserve() is not null then raise exception 'UNSAFE_DISPATCH';end if;
 raise exception 'SYNTHETIC_PRESERVATION';end$$$test$,'P0001','SYNTHETIC_PRESERVATION','existing provider session vetoes deletion');
select throws_ok($test$do $$begin
 insert into public.tenant_memberships(tenant_id,subject_id,role,status)
 select '10000000-0000-4000-8000-000000000002',subject_id,'patient','invited' from target;
 if pg_temp.reserve() is not null then raise exception 'UNSAFE_DISPATCH';end if;
 raise exception 'SYNTHETIC_PRESERVATION';end$$$test$,'P0001','SYNTHETIC_PRESERVATION','cross-tenant membership is preserved');
select throws_ok($test$do $$begin
 insert into public.record_holds(tenant_id,subject_id,hold_type,authority_code,applied_at,review_due_at)
 select '10000000-0000-4000-8000-000000000001',subject_id,'legal','SYNTHETIC_HOLD',now(),now()+interval '1 day' from target;
 if pg_temp.reserve() is not null then raise exception 'UNSAFE_DISPATCH';end if;
 raise exception 'SYNTHETIC_PRESERVATION';end$$$test$,'P0001','SYNTHETIC_PRESERVATION','hold prevents retirement');
select throws_ok($test$do $$begin
 insert into public.identity_invitations(tenant_id,contact_digest,intended_role,status,expires_at)
 values('10000000-0000-4000-8000-000000000002',encode(sha256(convert_to('retirement-orphan@example.invalid','UTF8')),'hex'),
 'patient','revoked',now()+interval '1 day');
 if pg_temp.reserve() is not null then raise exception 'UNSAFE_DISPATCH';end if;
 raise exception 'SYNTHETIC_PRESERVATION';end$$$test$,'P0001','SYNTHETIC_PRESERVATION','another attributed invitation is preserved');
select throws_ok($test$do $$begin
 update identity_private.mobile_email_exchanges set state='uncertain' where email_invitation_id=md5('retirement-email')::uuid;
 if pg_temp.reserve() is not null then raise exception 'UNSAFE_DISPATCH';end if;
 raise exception 'SYNTHETIC_PRESERVATION';end$$$test$,'P0001','SYNTHETIC_PRESERVATION','uncertain provider provenance is held');
select throws_ok($test$do $$declare result jsonb;begin
 delete from auth.users where id=md5('retirement-orphan')::uuid;
 result:=pg_temp.reserve();
 if result->>'dispatch'<>'false' or result->>'state'<>'uncertain' then raise exception 'UNSAFE_ABSENT_DISPATCH';end if;
 raise exception 'SYNTHETIC_ABSENCE_RECONCILIATION';end$$$test$,'P0001','SYNTHETIC_ABSENCE_RECONCILIATION','already absent provider is reconciled without another delete');
create temporary table reservation as select pg_temp.reserve() as result;
select is((select result->>'dispatch' from reservation),'true','first reservation owns one dispatch');
select is(pg_temp.reserve()->>'dispatch','false','same-key retry cannot dispatch again');
select throws_ok($$select pg_temp.reserve(gen_random_uuid())$$,'PT409','MOBILE_ORPHAN_STATE_CONFLICT','different key cannot create competing operation');
select is((select count(*) from identity_private.mobile_orphan_retirements),1::bigint,'one durable operation');
select throws_ok($$update auth.users set email_confirmed_at=now() where id=md5('retirement-orphan')::uuid$$,
 '42501','MOBILE_ORPHAN_QUARANTINED','confirmation cannot race quarantine');
select throws_ok($$insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 values(gen_random_uuid(),md5('retirement-orphan')::uuid,now(),now(),'aal1')$$,
 '42501','MOBILE_ORPHAN_QUARANTINED','new provider session cannot race quarantine');
select throws_ok($$insert into public.tenant_memberships(tenant_id,subject_id,role,status)
 select '10000000-0000-4000-8000-000000000001',subject_id,'patient','invited' from target$$,
 '42501','MOBILE_ORPHAN_QUARANTINED','new domain membership cannot race quarantine');
select throws_ok($$update public.external_identities set provider_subject=gen_random_uuid()::text
 where subject_id=(select subject_id from target)$$,'42501','MOBILE_ORPHAN_QUARANTINED','provider mapping cannot change after reservation');
select is(pg_temp.advance('uncertain'),'uncertain','uncertainty persists before provider side effect');
select is(pg_temp.advance('uncertain'),'uncertain','uncertainty recording is idempotent');
select throws_ok($$select pg_temp.advance('provider_absent')$$,'42501','MOBILE_ORPHAN_REJECTED','existing provider user blocks tombstoning');
select throws_ok($$select pg_temp.advance('provider_absent',gen_random_uuid())$$,'42501','MOBILE_ORPHAN_REJECTED','wrong provider cannot finish');
delete from auth.users where id=md5('retirement-orphan')::uuid;
select is(pg_temp.advance('provider_absent'),'copies_pending','native provider absence permits contact-only tombstone');
select is((select status from public.subjects where id=(select subject_id from target)),'erased','opaque subject remains erased');
select is(pg_temp.advance('provider_absent'),'copies_pending','lost finish response retries safely');
select is((select count(*) from identity_private.mobile_orphan_retirement_events),3::bigint,'one event per observed transition');
create temporary table reviewed_reissue as select gen_random_uuid() as review,
 jsonb_build_object('action','create','requestKey',gen_random_uuid(),'givenName','Synthetic','familyName','Reissue',
 'phone','+27000000001','provenanceReference',gen_random_uuid(),'contactAuthorityReference',gen_random_uuid()) as command;
create function pg_temp.reissue(review uuid default null) returns jsonb language sql as $$
 select public.prepare_mobile_orphan_reissue(md5('retirement-operator')::uuid,md5('retirement-operator-session')::uuid,
 'retirement-operator@example.invalid',md5('retirement-application-session')::uuid,(select subject_id from actor),
 '10000000-0000-4000-8000-000000000001',(select id from identity_private.mobile_orphan_retirements),
 coalesce(review,(select review from reviewed_reissue)),(select command from reviewed_reissue)) $$;
create temporary table reissued as select pg_temp.reissue() as result;
select is((select result->>'status' from reissued),'draft','reviewed recovery creates only a new draft');
select isnt((select result->>'invitationId' from reissued),md5('retirement-mobile')::uuid::text,'reissue cannot revive old invitation');
select is(pg_temp.reissue(),(select result from reissued),'exact reviewed retry reuses the same draft');
select throws_ok($$select pg_temp.reissue(gen_random_uuid())$$,'PT409','MOBILE_ORPHAN_REISSUE_CONFLICT','changed review cannot create another invitation');
select is((select count(*) from identity_private.mobile_invitation_send_reservations),0::bigint,'reissue cannot dispatch a message or reserve spend');
select throws_ok($$delete from identity_private.mobile_orphan_reissues$$,'55000','APPEND_ONLY_RECORD','reissue evidence is immutable');
select throws_ok($$delete from identity_private.mobile_orphan_retirement_events$$,'55000','APPEND_ONLY_RECORD','operational evidence stays immutable');
select throws_ok($$update identity_private.mobile_orphan_retirements set contact_digest=repeat('c',64)$$,
 'PT409','MOBILE_ORPHAN_STATE_CONFLICT','operation manifest cannot be changed');
select ok(not has_table_privilege(role,'identity_private.mobile_orphan_retirements',privilege),role||' denied '||privilege)
 from unnest(array['anon','authenticated','service_role']) role cross join unnest(array['select','insert','update','delete']) privilege;
select ok(not has_function_privilege(role,'public.reserve_mobile_orphan_retirement(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid)','execute'),role||' denied native reserve')
 from unnest(array['anon','authenticated']) role;
select ok(not has_function_privilege('service_role','identity_private.mobile_orphan_snapshot(uuid,uuid)','execute'),'snapshot helper is not an exposed deletion permission');
select throws_ok($$select identity_private.reconcile_restored_mobile_orphans('{"observedAt":null,"retirements":[]}'::jsonb)$$,
 '42501','MOBILE_ORPHAN_OFFLINE_RESTORE_REQUIRED','restore barrier cannot run against a provider-connected application database');
select ok(not has_function_privilege('service_role','identity_private.reconcile_restored_mobile_orphans(jsonb)','execute'),'offline reconciliation is not a service deletion capability');
select * from finish();
rollback;
