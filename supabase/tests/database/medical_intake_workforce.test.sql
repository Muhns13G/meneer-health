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
create temporary table medical_actor(provider_id uuid,provider_session uuid,app_session uuid,subject_id uuid,role text);
grant select on medical_actor to service_role;
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values('d6000000-0000-4000-8000-000000000001','medical-d6000000-0000-4000-8000-000000000001@example.invalid',now(),false,false);
insert into medical_actor select 'd6000000-0000-4000-8000-000000000001','d6100000-0000-4000-8000-000000000001','d6200000-0000-4000-8000-000000000001',subject_id,'clinician' from public.external_identities where provider='supabase' and provider_subject='d6000000-0000-4000-8000-000000000001';
insert into auth.sessions(id,user_id,created_at,updated_at,aal)values('d6100000-0000-4000-8000-000000000001','d6000000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,expires_at,approved_by_subject_id) select '10000000-0000-4000-8000-000000000001',subject_id,role,'active',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000001';
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select app_session,subject_id,provider_session,'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000001';
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values('d6000000-0000-4000-8000-000000000002','medical-d6000000-0000-4000-8000-000000000002@example.invalid',now(),false,false);
insert into medical_actor select 'd6000000-0000-4000-8000-000000000002','d6100000-0000-4000-8000-000000000002','d6200000-0000-4000-8000-000000000002',subject_id,'clinician' from public.external_identities where provider='supabase' and provider_subject='d6000000-0000-4000-8000-000000000002';
insert into auth.sessions(id,user_id,created_at,updated_at,aal)values('d6100000-0000-4000-8000-000000000002','d6000000-0000-4000-8000-000000000002',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,expires_at,approved_by_subject_id) select '10000000-0000-4000-8000-000000000001',subject_id,role,'active',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000002';
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select app_session,subject_id,provider_session,'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000002';
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values('d6000000-0000-4000-8000-000000000003','medical-d6000000-0000-4000-8000-000000000003@example.invalid',now(),false,false);
insert into medical_actor select 'd6000000-0000-4000-8000-000000000003','d6100000-0000-4000-8000-000000000003','d6200000-0000-4000-8000-000000000003',subject_id,'admin' from public.external_identities where provider='supabase' and provider_subject='d6000000-0000-4000-8000-000000000003';
insert into auth.sessions(id,user_id,created_at,updated_at,aal)values('d6100000-0000-4000-8000-000000000003','d6000000-0000-4000-8000-000000000003',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,expires_at,approved_by_subject_id) select '10000000-0000-4000-8000-000000000001',subject_id,role,'active',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000003';
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select app_session,subject_id,provider_session,'privileged','aal2',now(),now(),now()+interval '10 minutes',now()+interval '4 hours' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000003';
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values('d6000000-0000-4000-8000-000000000004','medical-d6000000-0000-4000-8000-000000000004@example.invalid',now(),false,false);
insert into medical_actor select 'd6000000-0000-4000-8000-000000000004','d6100000-0000-4000-8000-000000000004','d6200000-0000-4000-8000-000000000004',subject_id,'operations' from public.external_identities where provider='supabase' and provider_subject='d6000000-0000-4000-8000-000000000004';
insert into auth.sessions(id,user_id,created_at,updated_at,aal)values('d6100000-0000-4000-8000-000000000004','d6000000-0000-4000-8000-000000000004',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,expires_at,approved_by_subject_id) select '10000000-0000-4000-8000-000000000001',subject_id,role,'active',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000004';
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select app_session,subject_id,provider_session,'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000004';
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values('d6000000-0000-4000-8000-000000000005','medical-d6000000-0000-4000-8000-000000000005@example.invalid',now(),false,false);
insert into medical_actor select 'd6000000-0000-4000-8000-000000000005','d6100000-0000-4000-8000-000000000005','d6200000-0000-4000-8000-000000000005',subject_id,'operations' from public.external_identities where provider='supabase' and provider_subject='d6000000-0000-4000-8000-000000000005';
insert into auth.sessions(id,user_id,created_at,updated_at,aal)values('d6100000-0000-4000-8000-000000000005','d6000000-0000-4000-8000-000000000005',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,expires_at,approved_by_subject_id) select '10000000-0000-4000-8000-000000000001',subject_id,role,'active',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000005';
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select app_session,subject_id,provider_session,'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000005';
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values('d6000000-0000-4000-8000-000000000006','medical-d6000000-0000-4000-8000-000000000006@example.invalid',now(),false,false);
insert into medical_actor select 'd6000000-0000-4000-8000-000000000006','d6100000-0000-4000-8000-000000000006','d6200000-0000-4000-8000-000000000006',subject_id,'auditor' from public.external_identities where provider='supabase' and provider_subject='d6000000-0000-4000-8000-000000000006';
insert into auth.sessions(id,user_id,created_at,updated_at,aal)values('d6100000-0000-4000-8000-000000000006','d6000000-0000-4000-8000-000000000006',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,expires_at,approved_by_subject_id) select '10000000-0000-4000-8000-000000000001',subject_id,role,'active',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000006';
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select app_session,subject_id,provider_session,'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from medical_actor where provider_id='d6000000-0000-4000-8000-000000000006';
create function pg_temp.medical_context(n integer) returns jsonb language sql as $$select jsonb_build_object('tenantId','10000000-0000-4000-8000-000000000001','subjectId',a.subject_id,'sessionId',a.app_session,'providerSubject',a.provider_id,'providerSessionId',a.provider_session,'verifiedEmail','medical-'||a.provider_id||'@example.invalid','purpose',case a.role when 'clinician' then 'care_delivery' when 'admin' then 'security_administration' when 'auditor' then 'privacy_review' else 'operations' end) from medical_actor a where a.provider_id=('d6000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
create function pg_temp.medical_subject(n integer) returns uuid language sql as $$select subject_id from medical_actor where provider_id=('d6000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at,status,transfer_notice)
values('d2000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','1.1.0','1.0.0',repeat('a',64),'Synthetic privacy','Synthetic review',
'd2000000-0000-4000-8000-000000000004',pg_temp.medical_subject(1),pg_temp.medical_subject(3),pg_temp.medical_subject(2),pg_temp.medical_subject(1),300,
'd2000000-0000-4000-8000-000000000005','Synthetic urgent guidance','Synthetic fallback',now()-interval '1 hour',now()+interval '1 day','published','Synthetic recipient-specific transfer notice');
create function pg_temp.intake_command(v int default 0,action text default 'save',flag boolean default false) returns jsonb language sql as $$select jsonb_build_object(
'intakeId','d2000000-0000-4000-8000-000000000001','publicationId','d2000000-0000-4000-8000-000000000003','expectedVersion',v,
'requestKey',('d2000000-0000-4000-8000-'||lpad((20+v)::text,12,'0'))::uuid,'snapshotId',('d2000000-0000-4000-8000-'||lpad((40+v)::text,12,'0'))::uuid,
'action',action,'digest',repeat(v::text,64),'replayDigests',jsonb_build_array(repeat(v::text,64)),'safetyFlag',flag,
'envelope',jsonb_build_object('algorithm','AES-256-GCM','keyId','synthetic','nonce','AAAAAAAAAAAAAAAA','ciphertext',repeat('A',24),
'scope',jsonb_build_object('tenantId','10000000-0000-4000-8000-000000000001','subjectId',(select subject_id from portal_context),
'intakeId','d2000000-0000-4000-8000-000000000001','snapshotId',('d2000000-0000-4000-8000-'||lpad((40+v)::text,12,'0'))::uuid,'collectionVersion','1.1.0','controlVersion','1.0.0')))$$;

select public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(0,'save',true));
select throws_ok($$select public.read_medical_intake(pg_temp.medical_context(2),'d2000000-0000-4000-8000-000000000001','medical_safety')$$,'42501','MEDICAL_REJECTED','clinical role alone is not medical access');
create temporary table medical_approval as select public.approve_medical_grant(pg_temp.medical_context(1),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000040','targetSubjectId',pg_temp.medical_subject(2),'purpose','medical_safety','fields',jsonb_build_array('mental_safety','contact'),'rosterReference',gen_random_uuid(),'expiresAt',now()+interval '1 day','requestKey',gen_random_uuid())) as id;
select lives_ok($$select public.activate_medical_grant(pg_temp.medical_context(3),(select id from medical_approval))$$,'independent security activation succeeds');
select is(public.read_medical_intake(pg_temp.medical_context(2),'d2000000-0000-4000-8000-000000000001','medical_safety')->'fields','["mental_safety","contact"]'::jsonb,'only the approved medical fields are returned');
select throws_ok($$select public.read_medical_intake(pg_temp.medical_context(3),'d2000000-0000-4000-8000-000000000001','medical_safety')$$,'42501','MEDICAL_REJECTED','administrator cannot read answers');
select throws_ok($$select public.read_medical_intake(pg_temp.medical_context(4),'d2000000-0000-4000-8000-000000000001','medical_safety')$$,'42501','MEDICAL_REJECTED','routine operations cannot read safety answers');
select throws_ok($$select public.read_medical_intake(pg_temp.medical_context(2),'d2000000-0000-4000-8000-000000000001','medical_review')$$,'42501','MEDICAL_REJECTED','wrong medical purpose denied');
select throws_ok($$select public.approve_medical_grant(pg_temp.medical_context(2),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000040','targetSubjectId',pg_temp.medical_subject(2),'purpose','medical_safety','fields',jsonb_build_array('mental_safety'),'rosterReference',gen_random_uuid(),'expiresAt',now()+interval '1 day','requestKey',gen_random_uuid()))$$,'42501','MEDICAL_REJECTED','self approval denied');
select throws_ok($$update intake_private.access_grants set fields=array['full_name']$$,'55000','MEDICAL_GRANT_IMMUTABLE','approved scope cannot mutate');
select throws_ok($$select public.respond_medical_safety(pg_temp.medical_context(2),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000040','action','reviewed','evidenceReference',gen_random_uuid(),'requestKey',gen_random_uuid()))$$,'PT409','MEDICAL_CONFLICT','review requires prior acknowledgement');
create temporary table safety_response as select public.respond_medical_safety(pg_temp.medical_context(2),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000040','action','acknowledged','evidenceReference','d6000000-0000-4000-8000-000000000091','requestKey','d6000000-0000-4000-8000-000000000092')) as id;
select is(public.respond_medical_safety(pg_temp.medical_context(2),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000040','action','acknowledged','evidenceReference','d6000000-0000-4000-8000-000000000091','requestKey','d6000000-0000-4000-8000-000000000092')),(select id from safety_response),'exact clinical acknowledgement replays');
select lives_ok($$select public.respond_medical_safety(pg_temp.medical_context(2),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000040','action','reviewed','evidenceReference',gen_random_uuid(),'requestKey',gen_random_uuid()))$$,'approved clinician records review');
select is((select safety_hold from intake_private.intakes where id='d2000000-0000-4000-8000-000000000001'),false,'only clinician review releases the hold');
select public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(1,'save',true));
select throws_ok($$select public.read_medical_intake(pg_temp.medical_context(2),'d2000000-0000-4000-8000-000000000001','medical_safety')$$,'42501','MEDICAL_REJECTED','new snapshot does not inherit old medical grant');
create temporary table medical_notification as select public.claim_medical_safety_notification('10000000-0000-4000-8000-000000000001') as value;
select ok((select value->>'recipient' from medical_notification) like '%@example.invalid','notification addresses only appointed verified clinical actor');
select lives_ok($$select public.finish_medical_safety_notification((select value->>'notificationId' from medical_notification)::uuid,(select value->>'leaseId' from medical_notification)::uuid,'uncertain')$$,'ambiguous transport recorded');
create temporary table medical_fallback as select public.claim_medical_safety_notification('10000000-0000-4000-8000-000000000001') as value;
select ok((select value->>'recipient' from medical_fallback) like '%@example.invalid','failed primary routes to fallback');
select is((select count(*) from intake_private.notification_attempts),2::bigint,'one primary and one fallback attempt');
select ok((select safety_hold from intake_private.intakes where id='d2000000-0000-4000-8000-000000000001'),'delivery never clears the clinical hold');
select ok(not intake_private.review_payment_ready('d2000000-0000-4000-8000-000000000001'),'production review payment gate remains closed');
select ok(not has_function_privilege('authenticated','public.read_medical_intake(jsonb,uuid,text)','execute'),'browser JWT cannot bypass medical endpoint');
create temporary table held_restriction_approval as select public.approve_medical_grant(pg_temp.medical_context(1),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000041','targetSubjectId',pg_temp.medical_subject(2),'purpose','medical_safety','fields',jsonb_build_array('mental_safety','contact'),'rosterReference',gen_random_uuid(),'expiresAt',now()+interval '1 day','requestKey',gen_random_uuid())) as id;
select public.activate_medical_grant(pg_temp.medical_context(3),(select id from held_restriction_approval));
select public.patient_intake_restrict(pg_temp.intake_context(),'d2000000-0000-4000-8000-000000000001',2,gen_random_uuid());
select ok((select safety_hold and state='restricted' from intake_private.intakes),'own restriction never clears an unresolved safety hold');
select lives_ok($$select public.read_medical_intake(pg_temp.medical_context(2),'d2000000-0000-4000-8000-000000000001','medical_safety')$$,'exact independently approved safety grant remains usable only while restricted hold is unresolved');
select throws_ok($$select public.read_medical_intake(pg_temp.medical_context(2),'d2000000-0000-4000-8000-000000000001','medical_review')$$,'42501','MEDICAL_REJECTED','restriction denies ordinary medical-review purpose');
select throws_ok($$select public.patient_intake_read(pg_temp.intake_context(),'d2000000-0000-4000-8000-000000000001')$$,'42501','INTAKE_REJECTED','restriction still denies ordinary own questionnaire view');
select public.respond_medical_safety(pg_temp.medical_context(2),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000041','action','acknowledged','evidenceReference',gen_random_uuid(),'requestKey',gen_random_uuid()));
select lives_ok($$select public.respond_medical_safety(pg_temp.medical_context(2),jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000041','action','reviewed','evidenceReference',gen_random_uuid(),'requestKey',gen_random_uuid()))$$,'authorised clinical review can clear a restricted unresolved safety hold');
select ok((select not safety_hold and state='restricted' from intake_private.intakes),'clinical resolution preserves patient restriction');
select throws_ok($$select public.read_medical_intake(pg_temp.medical_context(2),'d2000000-0000-4000-8000-000000000001','medical_safety')$$,'42501','MEDICAL_REJECTED','resolved restricted intake no longer permits safety access');
select throws_ok($$select public.patient_intake_read(pg_temp.intake_context(),'d2000000-0000-4000-8000-000000000001')$$,'42501','INTAKE_REJECTED','clinical resolution never restores ordinary patient access');
select * from finish();
rollback;
