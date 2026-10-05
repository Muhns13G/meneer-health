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
  select public.read_patient_portal_with_operations(tenant,coalesce(subject,(select subject_id from portal_context)),
    '97000000-0000-4000-8000-000000000006',provider,'97000000-0000-4000-8000-000000000002',
    'portal@example.invalid',purpose);
$$;


create function pg_temp.intake_context() returns jsonb language sql as $$select jsonb_build_object(
'tenantId','10000000-0000-4000-8000-000000000001','subjectId',(select subject_id from portal_context),
'sessionId','97000000-0000-4000-8000-000000000006','providerSubject','97000000-0000-4000-8000-000000000001',
'providerSessionId','97000000-0000-4000-8000-000000000002','verifiedEmail','portal@example.invalid','purpose','account')$$;
insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,recipient_reference,
clinical_approver,privacy_approver,primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at,status)
values('d2000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','1.1.0','1.0.0',repeat('a',64),'Synthetic privacy only','Synthetic review only',
'd2000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',
'20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',300,'d2000000-0000-4000-8000-000000000005',
'Synthetic urgent guidance','Synthetic fallback',now()-interval '1 hour',now()+interval '1 day','published');
create function pg_temp.intake_command(v int default 0,action text default 'save',flag boolean default false) returns jsonb language sql as $$select jsonb_build_object(
'intakeId','d2000000-0000-4000-8000-000000000001','publicationId','d2000000-0000-4000-8000-000000000003','expectedVersion',v,
'requestKey',('d2000000-0000-4000-8000-'||lpad((20+v)::text,12,'0'))::uuid,'snapshotId',('d2000000-0000-4000-8000-'||lpad((40+v)::text,12,'0'))::uuid,
'action',action,'digest',repeat(v::text,64),'replayDigests',jsonb_build_array(repeat(v::text,64)),'safetyFlag',flag,
'envelope',jsonb_build_object('algorithm','AES-256-GCM','keyId','synthetic','nonce','AAAAAAAAAAAAAAAA','ciphertext',repeat('A',24),
'scope',jsonb_build_object('tenantId','10000000-0000-4000-8000-000000000001','subjectId',(select subject_id from portal_context),
'intakeId','d2000000-0000-4000-8000-000000000001','snapshotId',('d2000000-0000-4000-8000-'||lpad((40+v)::text,12,'0'))::uuid,'collectionVersion','1.1.0','controlVersion','1.0.0')))$$;
select ok(not has_schema_privilege('service_role','intake_private','usage'),'service has no private schema usage');
select ok(not has_table_privilege('service_role','intake_private.intakes','select'),'service cannot browse ciphertext table');
select ok(not has_function_privilege('anon','public.patient_intake_write(jsonb,jsonb)','execute'),'anonymous cannot write');
select ok(not has_function_privilege('authenticated','public.patient_intake_read(jsonb,uuid)','execute'),'browser cannot bypass server read');
set local role service_role;
select is(public.patient_intake_read(pg_temp.intake_context())->'record','null'::jsonb,'no fabricated initial record');
select is(public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command())->>'version','1','first own save succeeds');
select is(public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command())->>'version','1','exact replay does not increment');
select throws_ok($$select public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command()||jsonb_build_object('replayDigests',jsonb_build_array(repeat('f',64))))$$,'40001','INTAKE_CONFLICT','changed payload digest replay rejected');
select throws_ok($$select public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(0)||jsonb_build_object('requestKey',gen_random_uuid()))$$,'40001','INTAKE_CONFLICT','stale version rejected');
select is(public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(1,'save',true))->>'safetyHold','true','affirmative draft persists hold');
select is(public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(2,'save',false))->>'safetyHold','true','changing answer cannot clear historical hold');
select is(public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(3,'submit',false))->>'state','submitted','submission version commits');
select is(public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(4,'amend',false))->>'version','5','amendment creates another snapshot');
select throws_ok($$select public.patient_intake_read(pg_temp.intake_context()||jsonb_build_object('tenantId','10000000-0000-4000-8000-000000000002'),'d2000000-0000-4000-8000-000000000001')$$,'42501','PORTAL_REJECTED','wrong tenant denied');
select throws_ok($$select public.patient_intake_read(pg_temp.intake_context()||jsonb_build_object('subjectId','20000000-0000-4000-8000-000000000002'),'d2000000-0000-4000-8000-000000000001')$$,'42501','PORTAL_REJECTED','wrong subject denied');
reset role;
select is((select count(*) from intake_private.snapshots),2::bigint,'original and amended submission snapshots retained');
select is((select count(*) from intake_private.notice_receipts),1::bigint,'one exact publication notice receipt');
select ok(exists(select 1 from public.audit_events where action='intake.submit'),'submission audit committed');
select throws_ok($$update intake_private.snapshots set envelope='{}'$$,'55000','APPEND_ONLY_RECORD','snapshot mutation denied');
select throws_ok($$delete from intake_private.snapshots$$,'55000','APPEND_ONLY_RECORD','snapshot erasure denied without governed disposition');
select throws_ok($$update intake_private.publications set privacy_body='changed'$$,'42501','INTAKE_PUBLICATION_IMMUTABLE','published consent text cannot mutate');
select throws_ok($test$do $$begin
update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='synthetic'
where id='97000000-0000-4000-8000-000000000006';
perform public.patient_intake_read(pg_temp.intake_context(),'d2000000-0000-4000-8000-000000000001');end$$$test$,'42501','PORTAL_REJECTED','revoked session denied');
select throws_ok($test$do $$begin
update intake_private.publications set status='withdrawn';
perform public.patient_intake_read(pg_temp.intake_context(),'d2000000-0000-4000-8000-000000000001');end$$$test$,'42501','INTAKE_NOT_ACTIVE','withdrawn medical publication denies access');
select * from finish();
rollback;
