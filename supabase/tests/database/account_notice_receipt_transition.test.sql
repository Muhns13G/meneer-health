begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('fa100000-0000-4000-8000-000000000004','pilot-account-terms','1.0','Synthetic original terms only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('fa100000-0000-4000-8000-000000000005','pilot-privacy-notice','1.0','Synthetic original privacy only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
insert into identity_private.public_registration_settings values('10000000-0000-4000-8000-000000000001',true);
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous) values
('fa100000-0000-4000-8000-000000000001','legacy-client@example.invalid',now(),false,false),
('fa100000-0000-4000-8000-000000000011','prior-public@example.invalid',now(),false,false),
('fa100000-0000-4000-8000-000000000021','new-public@example.invalid',now(),false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
('fa100000-0000-4000-8000-000000000002','fa100000-0000-4000-8000-000000000001',now(),now(),'aal1'),
('fa100000-0000-4000-8000-000000000012','fa100000-0000-4000-8000-000000000011',now(),now(),'aal1'),
('fa100000-0000-4000-8000-000000000022','fa100000-0000-4000-8000-000000000021',now(),now(),'aal1');
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
values('fa100000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',encode(extensions.digest(convert_to('legacy-client@example.invalid','UTF8'),'sha256'),'hex'),'patient','fa100000-0000-4000-8000-000000000001',now()+interval '1 hour','20000000-0000-4000-8000-000000000001','operations',gen_random_uuid(),'delivered',now());
create temporary table transition_admissions as
select 'fa100000-0000-4000-8000-000000000001'::uuid as provider,'fa100000-0000-4000-8000-000000000002'::uuid as session,'fa100000-0000-4000-8000-000000000003'::uuid as invitation
union all select 'fa100000-0000-4000-8000-000000000011','fa100000-0000-4000-8000-000000000012',
(public.prepare_public_registration('10000000-0000-4000-8000-000000000001','fa100000-0000-4000-8000-000000000011','fa100000-0000-4000-8000-000000000012')->>'invitationId')::uuid;
create function pg_temp.activate_notice_client(p_provider uuid,terms uuid default 'fa100000-0000-4000-8000-000000000004',privacy uuid default 'fa100000-0000-4000-8000-000000000005') returns uuid language sql as $$
select public.activate_pilot_account(a.invitation,'10000000-0000-4000-8000-000000000001',a.provider,a.session,jsonb_build_object(
'givenName','Synthetic','familyName','Client','mobileE164','+27820000000','contactPreference','email',
'termsPublicationId',terms,'termsHash',(select content_sha256 from public.pilot_instrument_publications where id=terms),
'privacyPublicationId',privacy,'privacyHash',(select content_sha256 from public.pilot_instrument_publications where id=privacy),
'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid())) from transition_admissions a where a.provider=p_provider;
$$;
select pg_temp.activate_notice_client('fa100000-0000-4000-8000-000000000001');
select pg_temp.activate_notice_client('fa100000-0000-4000-8000-000000000011');
create temporary table transition_subjects as select provider_subject::uuid as provider,subject_id from public.external_identities where provider_subject like 'fa100000-%';
create function pg_temp.legacy_subject() returns uuid language sql as $$select subject_id from transition_subjects where provider='fa100000-0000-4000-8000-000000000001'$$;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
values('fa100000-0000-4000-8000-000000000006',pg_temp.legacy_subject(),'fa100000-0000-4000-8000-000000000002','patient','aal1',now(),now(),now()+interval '30 minutes',now()+interval '12 hours');
insert into public.operations_cases(id,tenant_id,subject_id) values('fa100000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001',pg_temp.legacy_subject());
create function pg_temp.legacy_portal() returns jsonb language sql as $$select public.read_patient_portal_with_operations('10000000-0000-4000-8000-000000000001',pg_temp.legacy_subject(),'fa100000-0000-4000-8000-000000000006','fa100000-0000-4000-8000-000000000001','fa100000-0000-4000-8000-000000000002','legacy-client@example.invalid','account')$$;
select ok(public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.legacy_subject()),'exact current evidence works before publication');
select is(jsonb_array_length(pg_temp.legacy_portal()->'instruments'),2,'existing real-context projection works before publication');
create temporary table original_receipts as select id,to_jsonb(r) as row from public.pilot_instrument_receipts r;
update public.pilot_instrument_publications set status='superseded',retired_at=clock_timestamp() where id in ('fa100000-0000-4000-8000-000000000004','fa100000-0000-4000-8000-000000000005');
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('fa100000-0000-4000-8000-000000000014','pilot-account-terms','1.1','Synthetic public source terms only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',clock_timestamp()),
('fa100000-0000-4000-8000-000000000015','pilot-privacy-notice','1.1','Synthetic public source privacy only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',clock_timestamp());
select ok(not public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.legacy_subject()),'supersession without explicit receipt transition denies');
select throws_ok($$select pg_temp.legacy_portal()$$,'42501','PORTAL_REJECTED','portal also denies unapproved legacy evidence');
create function pg_temp.approve_notice_receipts(who uuid) returns void language sql as $$
insert into identity_private.account_notice_receipt_transitions(receipt_id,tenant_id,subject_id,current_publication_id,approval_reference,approved_by_subject_id,expires_at)
select r.id,r.tenant_id,r.subject_id,c.id,'synthetic-source-only-transition','20000000-0000-4000-8000-000000000001',clock_timestamp()+interval '5 seconds'
from public.pilot_instrument_receipts r join public.pilot_instrument_publications c on c.instrument_id=r.instrument_id and c.status='published'
where r.subject_id=who;
$$;
select lives_ok($$select pg_temp.approve_notice_receipts(pg_temp.legacy_subject())$$,'custodian can name exact genuine pre-transition invitation receipts');
select ok(public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.legacy_subject()),'named legacy evidence preserves existing session access');
select is(pg_temp.legacy_portal()->'instruments'->0->>'version','1.0','portal reports actual old version, not fabricated new acceptance');
select is(pg_temp.legacy_portal()->'instruments'->0->>'body','Synthetic original terms only','portal retains actual accepted body');
select ok((identity_private.operations_readiness('fa100000-0000-4000-8000-000000000007')->>'instrumentsCurrent')::boolean,'staff readiness shares the same bounded evidence rule');
select ok(not (identity_private.operations_readiness('fa100000-0000-4000-8000-000000000007')->>'ready')::boolean,'document compatibility does not activate handoff');
select throws_ok($$select pg_temp.approve_notice_receipts((select subject_id from transition_subjects where provider='fa100000-0000-4000-8000-000000000011'))$$,'42501','NOTICE_TRANSITION_REJECTED','even genuine public admissions cannot use the invitation-only transition');
select throws_ok($$update identity_private.account_notice_receipt_transitions set approval_reference='other'$$,'55000','NOTICE_TRANSITION_IMMUTABLE','approval evidence cannot be edited');
select throws_ok($$delete from identity_private.account_notice_receipt_transitions$$,'55000','NOTICE_TRANSITION_IMMUTABLE','transition approval cannot be deleted');
select ok(not has_table_privilege('service_role','identity_private.account_notice_receipt_transitions','SELECT,INSERT,UPDATE,DELETE'),'application cannot read or approve compatibility registry');
select ok(not has_function_privilege('anon','public.has_pilot_account_evidence(uuid,uuid)','execute'),'anonymous evidence probing denied');
select ok(not has_function_privilege('authenticated','public.has_pilot_account_evidence(uuid,uuid)','execute'),'browser evidence probing denied');
select ok(has_function_privilege('service_role','public.has_pilot_account_evidence(uuid,uuid)','execute'),'server may check evidence');
select ok(not has_function_privilege('service_role','identity_private.account_instrument_evidence(uuid,uuid)','execute'),'inner raw evidence function remains private');
select lives_ok($$select identity_private.assert_mobile_orphan_guard_coverage()$$,'new evidence registry preserves subject quarantine coverage');
select ok(not public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000002',pg_temp.legacy_subject()),'another tenant cannot reuse approval');
select throws_ok($test$do $$begin
 update identity_private.account_notice_receipt_transitions set revoked_at=clock_timestamp();
 if public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.legacy_subject()) then raise exception 'REVOKED_ALLOWED'; end if;
 perform pg_temp.legacy_portal(); end $$;$test$,'42501','PORTAL_REJECTED','revocation immediately denies session and portal evidence');
select throws_ok($test$do $$begin
 update identity_private.account_notice_receipt_transitions set revoked_at=clock_timestamp();
 update identity_private.account_notice_receipt_transitions set revoked_at=null;
 end $$;$test$,'55000','NOTICE_TRANSITION_IMMUTABLE','a revoked approval cannot be revived');
select throws_ok($test$do $$begin
 update public.pilot_instrument_publications set status='withdrawn',retired_at=clock_timestamp() where id='fa100000-0000-4000-8000-000000000015';
 perform pg_temp.legacy_portal(); end $$;$test$,'42501','PORTAL_REJECTED','successor document withdrawal also denies');
select throws_ok($test$do $$begin
 update public.pilot_instrument_publications set status='superseded',retired_at=clock_timestamp() where id='fa100000-0000-4000-8000-000000000014';
 insert into public.pilot_instrument_publications(instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
 values('pilot-account-terms','1.2','Synthetic unrelated terms only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
 perform pg_temp.legacy_portal(); end $$;$test$,'42501','PORTAL_REJECTED','approval cannot carry old receipts into future versions');
select throws_ok($test$do $$begin
 insert into public.pilot_instrument_receipt_events(receipt_id,tenant_id,subject_id,event_type,actor_subject_id,reason_code,idempotency_key,correlation_id)
 select id,tenant_id,subject_id,'withdrawn',subject_id,'client_withdrawal',gen_random_uuid(),'synthetic-withdrawal' from public.pilot_instrument_receipts where subject_id=pg_temp.legacy_subject() and instrument_id='pilot-privacy-notice';
 perform pg_temp.legacy_portal(); end $$;$test$,'42501','PORTAL_REJECTED','withdrawal still denies legacy receipt');
select throws_ok($test$do $$begin
 update public.client_profiles set status='restricted' where subject_id=pg_temp.legacy_subject();
 perform pg_temp.legacy_portal(); end $$;$test$,'42501','PORTAL_REJECTED','profile restriction still denies');
select throws_ok($test$do $$begin
 update public.tenant_memberships set status='revoked' where subject_id=pg_temp.legacy_subject();
 perform pg_temp.legacy_portal(); end $$;$test$,'42501','PORTAL_REJECTED','membership revocation still denies');
insert into transition_admissions select 'fa100000-0000-4000-8000-000000000021','fa100000-0000-4000-8000-000000000022',(public.prepare_public_registration('10000000-0000-4000-8000-000000000001','fa100000-0000-4000-8000-000000000021','fa100000-0000-4000-8000-000000000022')->>'invitationId')::uuid;
select throws_ok($$select pg_temp.activate_notice_client('fa100000-0000-4000-8000-000000000021')$$,'42501','ACTIVATION_REJECTED','new public client cannot accept superseded old documents');
-- The successor became effective after this transaction's now(). The independent current-version
-- packet proves successful native activation without weakening its real time guard for this test.
select ok(public.public_registration_available('10000000-0000-4000-8000-000000000001'),'current source documents keep public entry available');
select is((select count(*) from public.client_profiles where subject_id=(select subject_id from transition_subjects where provider='fa100000-0000-4000-8000-000000000021')),0::bigint,'pending public account cannot inherit existing client evidence');
select is((select count(*) from public.pilot_instrument_receipts where subject_id=pg_temp.legacy_subject() and instrument_version='1.1'),0::bigint,'no new-version receipt was fabricated for existing client');
select ok(not exists(select 1 from original_receipts b full join public.pilot_instrument_receipts r on r.id=b.id where b.id is not null and b.row is distinct from to_jsonb(r)),'all original receipt facts remain unchanged');
select pg_sleep(5.1);
select ok(not public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.legacy_subject()),'expired transition approval denies without mutation');
select throws_ok($$select pg_temp.legacy_portal()$$,'42501','PORTAL_REJECTED','portal also rejects expired transition');
select * from finish();
rollback;
