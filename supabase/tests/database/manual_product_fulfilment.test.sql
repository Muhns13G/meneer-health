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

select public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(0,'save',false));
select public.patient_intake_write(pg_temp.intake_context(),pg_temp.intake_command(1,'submit',false));

create temporary table evidence_case_ref as select case_id from intake_private.intakes where id='d2000000-0000-4000-8000-000000000001';
grant select on evidence_case_ref to service_role;
create function pg_temp.evidence_case() returns uuid language sql as $$select case_id from evidence_case_ref$$;
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
select gen_random_uuid(),provider_session,'totp',now(),now() from medical_actor;
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
select '10000000-0000-4000-8000-000000000001',pg_temp.evidence_case(),(select subject_id from portal_context),subject_id,pg_temp.medical_subject(3),now()-interval '1 minute',now()+interval '1 day'
from medical_actor where role='operations';
create temporary table clinical_approval as select public.approve_medical_grant(pg_temp.medical_context(1),jsonb_build_object(
'intakeId','d2000000-0000-4000-8000-000000000001','snapshotId','d2000000-0000-4000-8000-000000000041','targetSubjectId',pg_temp.medical_subject(2),
'purpose','medical_review','fields',jsonb_build_array('contact','mental_safety'),'rosterReference',gen_random_uuid(),'expiresAt',now()+interval '1 day','requestKey',gen_random_uuid())) as id;
select public.activate_medical_grant(pg_temp.medical_context(3),(select id from clinical_approval));
insert into commerce_private.catalogue_versions(id,tenant_id,version,provenance,source_fingerprint,import_fingerprint,approval_reference,imported_by,reviewed_by,currency,tax_treatment,effective_at,expires_at,item_count)
values('15400000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','synthetic-quote-v1','local-synthetic',repeat('a',64),repeat('b',64),gen_random_uuid(),(select subject_id from portal_context),'20000000-0000-4000-8000-000000000002','zar','vat-inclusive-planning',now()-interval '1 day',now()+interval '1 day',1);
insert into commerce_private.catalogue_items values('15400000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','15400000-0000-4000-8000-000000000002','synthetic-item','Synthetic item',150000,2);
insert into commerce_private.shipping_address_snapshots(id,tenant_id,subject_id,case_id,version,envelope,captured_by)
values('15400000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',(select subject_id from portal_context),pg_temp.evidence_case(),1,jsonb_build_object(
'algorithm','AES-256-GCM','keyId','synthetic-address','nonce',repeat('A',16),'ciphertext',repeat('A',24),'scope',jsonb_build_object(
'tenantId','10000000-0000-4000-8000-000000000001','subjectId',(select subject_id from portal_context),'caseId',pg_temp.evidence_case(),'snapshotId','15400000-0000-4000-8000-000000000003','version',1)),
(select subject_id from portal_context));
insert into commerce_private.delivery_quotes(id,tenant_id,subject_id,case_id,version,amount_minor,approval_reference,effective_at,expires_at,status)
values('15400000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001',(select subject_id from portal_context),pg_temp.evidence_case(),'synthetic-v1',10000,gen_random_uuid(),now()-interval '1 day',now()+interval '1 day','approved');
insert into commerce_private.product_delivery_bindings(quote_id,tenant_id,case_id,subject_id,address_snapshot_id,catalogue_id,custody_policy_reference,evidence_reference)
values('15400000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001',pg_temp.evidence_case(),(select subject_id from portal_context),'15400000-0000-4000-8000-000000000003','15400000-0000-4000-8000-000000000001',gen_random_uuid(),gen_random_uuid());

create function pg_temp.draft_command() returns jsonb language sql as $$select jsonb_build_object(
'action','prepare_draft','caseId',pg_temp.evidence_case(),'catalogueId','15400000-0000-4000-8000-000000000001',
'deliveryQuoteId','15400000-0000-4000-8000-000000000004','expectedCaseVersion',(select version from public.operations_cases where id=pg_temp.evidence_case()),
'expectedDraftVersion',0,'requestKey','15500000-0000-4000-8000-000000000001','items',jsonb_build_array(jsonb_build_object('productId','15400000-0000-4000-8000-000000000002','quantity',2)))$$;
create function pg_temp.draft(command jsonb default pg_temp.draft_command()) returns jsonb language sql as $$select public.staff_product_quote(jsonb_build_object(
'p_provider_subject',pg_temp.medical_context(4)->>'providerSubject','p_provider_session_id',pg_temp.medical_context(4)->>'providerSessionId',
'p_verified_email',pg_temp.medical_context(4)->>'verifiedEmail','p_session_id',pg_temp.medical_context(4)->>'sessionId',
'p_subject_id',pg_temp.medical_subject(4),'p_tenant_id','10000000-0000-4000-8000-000000000001'),command,'local-synthetic')$$;
create temporary table draft_view as select pg_temp.draft() as value;
grant select on draft_view to service_role;
create function pg_temp.evidence_input(kind text default 'clinical') returns jsonb language sql as $$select jsonb_build_object(
'action','record','target',case when kind='clinical' then jsonb_build_object('intakeId','d2000000-0000-4000-8000-000000000001') else jsonb_build_object('caseId',pg_temp.evidence_case()) end,
'draftId',(select value->'draft'->>'draftId' from draft_view),'kind',kind,'evidenceReference','15500000-0000-4000-8000-000000000099',
'expiresAt',now()+interval '1 hour','requestKey',('15500000-0000-4000-8000-'||case kind when 'clinical' then '000000000011' when 'provider_stock' then '000000000012' when 'pharmacy_authority' then '000000000013' else '000000000014' end)::uuid)$$;
create function pg_temp.evidence(n integer default 2,command jsonb default pg_temp.evidence_input()) returns jsonb language sql as $$select public.staff_product_evidence(pg_temp.medical_context(n),command,'local-synthetic')$$;
select ok(not has_table_privilege(role,'commerce_private.'||tab,privilege),role||' '||tab||' '||privilege||' denied')
from unnest(array['anon','authenticated','service_role'])role cross join unnest(array['product_quote_evidence','product_evidence_revocations'])tab cross join unnest(array['select','insert','update','delete'])privilege;
select ok(not has_function_privilege(role,'public.staff_product_evidence(jsonb,jsonb,text)','execute'),role||' RPC denied')from unnest(array['anon','authenticated'])role;
select ok(not has_function_privilege('service_role','commerce_private.product_evidence_current(uuid)','execute'),'readiness predicate private');
set local role service_role;
select is(pg_temp.evidence()->>'role','clinician','granted clinician records exact draft approval');
select is(pg_temp.evidence()->'evidence'->0->>'current','true','exact replay retains current evidence');
select is(pg_temp.evidence(5,pg_temp.evidence_input('provider_stock'))->>'role','operations','independent assigned stock evidence succeeds');
select lives_ok($$select pg_temp.evidence(5,pg_temp.evidence_input('pharmacy_authority'))$$,'attributed pharmacy-source evidence succeeds');
select lives_ok($$select pg_temp.evidence(5,pg_temp.evidence_input('address_custody'))$$,'exact address/custody evidence succeeds');

reset role;
-- Explicit local-synthetic ledger funding, not a Stripe capture or hosted paid-review proof.
insert into public.workflow_instances(id,tenant_id,subject_id)
select '15600000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',subject_id from portal_context;
insert into public.payment_orders(id,tenant_id,workflow_id,subject_id,scenario,environment,status,amount_total_minor,terms_version,price_version,request_id,idempotency_key,request_fingerprint,created_at,updated_at,paid_at)
select '15600000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','15600000-0000-4000-8000-000000000001',subject_id,
'consultation_only','local','paid',99900,'synthetic-only','synthetic-only','synthetic-issue','synthetic-issue',repeat('a',64),now(),now(),now() from portal_context;
insert into commerce_private.deposit_funding(case_id,tenant_id,subject_id,source_order_id,evidence_reference,amount_minor,state)
select pg_temp.evidence_case(),'10000000-0000-4000-8000-000000000001',subject_id,'15600000-0000-4000-8000-000000000002',gen_random_uuid(),99900,'available' from portal_context;
insert into commerce_private.product_quote_releases values('10000000-0000-4000-8000-000000000001','local-synthetic',gen_random_uuid(),now()+interval '1 day',true);
insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
values('15600000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','approved_product_order','1.0.0','Synthetic supplier',
'Synthetic product terms only. Delivery separate; capped R999 product credit and unused-deposit refund.',repeat('a',64),gen_random_uuid(),now()-interval '1 hour',now()+interval '1 day','published');
insert into commerce_private.checkout_releases(tenant_id,provider_account_id,approval_reference,expires_at,enabled)
values('10000000-0000-4000-8000-000000000001','acct_syntheticissue',gen_random_uuid(),now()+interval '1 day',true);
create function pg_temp.issue_input() returns jsonb language sql as $$select jsonb_build_object('action','issue','caseId',pg_temp.evidence_case(),
'draftId',(select value->'draft'->>'draftId' from draft_view),'requestKey','15600000-0000-4000-8000-000000000004')$$;
create function pg_temp.issue(command jsonb default pg_temp.issue_input(),n int default 4) returns jsonb language sql as $$select public.staff_issue_product_quote(pg_temp.medical_context(n),command,'local-synthetic')$$;
create function pg_temp.variant(unit integer,delivery integer) returns jsonb language plpgsql as $$
declare batch uuid:=gen_random_uuid(); quote uuid:=gen_random_uuid(); kind text; result jsonb;
begin
 insert into commerce_private.catalogue_versions(id,tenant_id,version,provenance,source_fingerprint,import_fingerprint,approval_reference,imported_by,reviewed_by,currency,tax_treatment,effective_at,expires_at,item_count)
 select batch,tenant_id,'synthetic-variant-'||batch::text,provenance,source_fingerprint,encode(extensions.digest(batch::text,'sha256'),'hex'),gen_random_uuid(),imported_by,reviewed_by,currency,tax_treatment,now()-interval '1 minute',now()+interval '1 day',1
 from commerce_private.catalogue_versions where id='15400000-0000-4000-8000-000000000001';
 insert into commerce_private.catalogue_items values(batch,'10000000-0000-4000-8000-000000000001','15400000-0000-4000-8000-000000000002','synthetic-variant','Synthetic variant',unit,2);
 insert into commerce_private.delivery_quotes(id,tenant_id,subject_id,case_id,version,amount_minor,approval_reference,effective_at,expires_at,status)
 select quote,'10000000-0000-4000-8000-000000000001',subject_id,pg_temp.evidence_case(),'synthetic-variant',delivery,gen_random_uuid(),now()-interval '1 minute',now()+interval '1 day','approved' from portal_context;
 insert into commerce_private.product_delivery_bindings select quote,tenant_id,case_id,subject_id,address_snapshot_id,batch,custody_policy_reference,evidence_reference from commerce_private.product_delivery_bindings where quote_id='15400000-0000-4000-8000-000000000004';
 update draft_view set value=pg_temp.draft(jsonb_set(pg_temp.draft_command()||jsonb_build_object('catalogueId',batch,'deliveryQuoteId',quote,'requestKey',gen_random_uuid(),'expectedDraftVersion',1),'{items,0,quantity}','1'));
 foreach kind in array array['clinical','provider_stock','pharmacy_authority','address_custody'] loop
  perform pg_temp.evidence(case when kind='clinical' then 2 else 5 end,pg_temp.evidence_input(kind)||jsonb_build_object('requestKey',gen_random_uuid()));
 end loop;
 result:=pg_temp.issue();
 return (select snapshot from commerce_private.offers where id=(result->>'offerId')::uuid);
end $$;
select ok(not has_table_privilege(r,'commerce_private.'||tab,p),r||' '||tab||' '||p||' denied')
from unnest(array['anon','authenticated','service_role'])r cross join unnest(array['issued_product_quotes','catalogue_price_bindings','product_quote_dispositions','product_quote_releases'])tab cross join unnest(array['select','insert','update','delete'])p;
select throws_ok($$select pg_temp.issue(pg_temp.issue_input(),2)$$,'42501','QUOTE_REJECTED','clinician cannot issue commercial quote');
select throws_ok($$select pg_temp.issue(pg_temp.issue_input()||'{"paid":true}')$$,'22023','QUOTE_INPUT_INVALID','caller paid flag denied');
select throws_ok($test$do $$begin update commerce_private.product_quote_releases set enabled=false;perform pg_temp.issue();end$$$test$,'42501','COMMERCE_NOT_READY','separate product release required');
select throws_ok($test$do $$begin update commerce_private.checkout_releases set payment_environment='live';
 perform pg_temp.issue();end$$$test$,'42501','PAYMENT_ENVIRONMENT_REJECTED','funded synthetic account cannot be rebound to live payments');
select throws_ok($test$do $$begin update intake_private.intakes set safety_hold=true;perform pg_temp.issue();end$$$test$,'42501','QUOTE_REJECTED','safety hold denies issue');
select throws_ok($test$do $$begin update commerce_private.order_publications set status='withdrawn';perform pg_temp.issue();end$$$test$,'42501','COMMERCE_NOT_READY','product terms required');
select throws_ok($test$do $$declare result jsonb;begin result:=pg_temp.variant(99900,0);
 if result->>'amountTotalMinor'<>'0' or result->>'creditMinor'<>'99900' or result->>'noAdditionalPayment'<>'true' then raise exception 'ZERO_QUOTE_INVALID';end if;
 raise exception using errcode='PT000',message='ZERO_QUOTE_ROLLBACK';end$$$test$,'PT000','ZERO_QUOTE_ROLLBACK','zero-total mapped quote retains governed no-payment path');
select throws_ok($test$do $$declare result jsonb;begin result:=pg_temp.variant(80000,10000);
 if result->>'amountTotalMinor'<>'10000' or result->>'creditMinor'<>'80000' or result->>'unusedDepositRefundMinor'<>'19900' then raise exception 'CAPPED_QUOTE_INVALID';end if;
 raise exception using errcode='PT000',message='CAPPED_QUOTE_ROLLBACK';end$$$test$,'PT000','CAPPED_QUOTE_ROLLBACK','mapped capped credit leaves delivery payable and unused deposit original-funding refund amount');
create temporary table issued_view as select pg_temp.issue() as value;
grant select on issued_view to service_role;
select is(pg_temp.issue()->>'offerId',(select value->>'offerId' from issued_view),'exact issue replay returns one offer');
select is((select count(*)::integer from commerce_private.issued_product_quotes),1,'one issued link');
select is((select count(*)::integer from commerce_private.credit_reservations where state='reserved'),1,'one credit reservation');
select is((select snapshot->>'creditMinor' from commerce_private.offers),'99900','R999 credit capped and conserved');
select is((select snapshot->>'amountTotalMinor' from commerce_private.offers),'210100','R3000 plus R100 delivery less R999');
select is((select count(*)::integer from commerce_private.offers where snapshot->>'scenario'='review_deposit'),0,'no second deposit');
select is((select count(*)::integer from commerce_private.catalogue_price_bindings),1,'immutable catalogue price binding');
select throws_ok($$select pg_temp.issue(pg_temp.issue_input()||jsonb_build_object('requestKey',gen_random_uuid()))$$,'PT409','COMMERCE_CONFLICT','new key cannot mint same draft twice');
select throws_ok($$update commerce_private.issued_product_quotes set publication_id=gen_random_uuid()$$,'55000','APPEND_ONLY_RECORD','issued link immutable');
create function pg_temp.review(command jsonb default '{"action":"read"}') returns jsonb language sql as $$select public.patient_order_review(pg_temp.intake_context(),command)$$;
create temporary table review_view as select pg_temp.review()->'review' as value;
grant select on review_view to service_role;
create function pg_temp.accept_input() returns jsonb language sql as $$select jsonb_build_object('action','accept','offerId',v->>'offerId','publicationId',v->'terms'->>'publicationId',
'snapshotHash',v->>'snapshotHash','contentHash',v->'terms'->>'contentHash','accepted',true,'requestKey','15600000-0000-4000-8000-000000000005') from (select value v from review_view)x$$;
create function pg_temp.decline_input() returns jsonb language sql as $$select jsonb_build_object('action','decline','offerId',v->>'offerId','snapshotHash',v->>'snapshotHash',
'requestKey','15600000-0000-4000-8000-000000000006') from (select value v from review_view)x$$;
set local role service_role;
select is(pg_temp.review()->'review'->>'scenario','approved_product_order','client sees selected product order');
select is(pg_temp.review()->'review'->>'quoteCurrent','true','fresh exact quote current');
select is(pg_temp.review()->'review'->'acceptance','null'::jsonb,'acceptance starts unchecked');
reset role;
select throws_ok($test$do $$begin
 perform pg_temp.review(pg_temp.decline_input());
 if (select state from commerce_private.deposit_funding)<>'available' or (select state from commerce_private.credit_reservations)<>'released'
  or pg_temp.review()->'review'<>'null'::jsonb then raise exception 'DECLINE_PROOF_FAILED';end if;
 perform pg_temp.review(pg_temp.decline_input());
 if (select count(*) from commerce_private.product_quote_dispositions)<>1 then raise exception 'DECLINE_REPLAY_FAILED';end if;
 raise exception using errcode='PT000',message='DECLINE_PROOF_ROLLBACK';
 end$$$test$,'PT000','DECLINE_PROOF_ROLLBACK','successful decline/replay releases only unspent credit and leaves history');
set local role service_role;
select throws_ok($$select pg_temp.review(pg_temp.accept_input()||'{"accepted":false}')$$,'22023','COMMERCE_INVALID','false acceptance denied');
select throws_ok($$select pg_temp.review(pg_temp.accept_input()||jsonb_build_object('snapshotHash',repeat('a',64)))$$,'PT409','COMMERCE_CONFLICT','wrong composite hash denied');
select lives_ok($$select pg_temp.review(pg_temp.accept_input())$$,'exact client acceptance succeeds');
select lives_ok($$select pg_temp.review(pg_temp.accept_input())$$,'exact acceptance replays');
select throws_ok($$select pg_temp.review(pg_temp.accept_input()||jsonb_build_object('requestKey',gen_random_uuid()))$$,'PT409','COMMERCE_CONFLICT','changed acceptance key denied');
select is(public.patient_prepare_checkout(pg_temp.intake_context(),(select (value->>'offerId')::uuid from issued_view),'15600000-0000-4000-8000-000000000007','acct_syntheticissue')->>'amountTotalMinor','210100','credited balance uses existing checkout ledger');
select throws_ok($$select pg_temp.review(pg_temp.decline_input())$$,'PT409','COMMERCE_RECONCILIATION_REQUIRED','decline cannot discard uncertain checkout');
reset role;
select is((select count(*)::integer from commerce_private.checkout_intents),1,'one intent only');
select is((select count(*)::integer from commerce_private.order_acceptances),1,'one acceptance only');
select throws_ok($test$do $$begin update intake_private.access_grants set revoked_at=clock_timestamp();perform public.patient_prepare_checkout(pg_temp.intake_context(),(select (value->>'offerId')::uuid from issued_view),gen_random_uuid(),'acct_syntheticissue');end$$$test$,'42501','COMMERCE_NOT_READY','revoked exact clinical grant blocks checkout replay');
select throws_ok($test$do $$begin update commerce_private.order_publications set status='withdrawn';perform pg_temp.review(pg_temp.accept_input());end$$$test$,'42501','COMMERCE_NOT_READY','withdrawn terms block acceptance replay');
select ok(not exists(select 1 from public.audit_events where action='product.quote.issued' and metadata<>'{}'),'issue audit contains no product/medical content');
select lives_ok($$select identity_private.assert_mobile_orphan_guard_coverage()$$,'native retirement guard coverage');

-- 15.7: reuse the exact 15.6 synthetic issued/accepted quote, never hosted fixtures.
create function pg_temp.supply_input(event text default 'provider_ordered',v int default 0,key uuid default '15700000-0000-4000-8000-000000000001') returns jsonb language sql as $$select jsonb_build_object(
'action','record','caseId',pg_temp.evidence_case(),'offerId',(select value->>'offerId' from issued_view),'expectedVersion',v,'event',event,'evidenceReference','15700000-0000-4000-8000-000000000002','requestKey',key)$$;
create function pg_temp.supply(command jsonb default jsonb_build_object('action','read','caseId',pg_temp.evidence_case()),n int default 4) returns jsonb language sql as $$select public.staff_product_fulfilment(pg_temp.medical_context(n),command,'local-synthetic')$$;
select ok(not has_table_privilege(r,'commerce_private.product_fulfilment_events',p),r||' supply '||p||' denied')
from unnest(array['anon','authenticated','service_role'])r cross join unnest(array['select','insert','update','delete'])p;
select ok(not has_function_privilege('anon','public.staff_product_fulfilment(jsonb,jsonb,text)','execute'),'anon native write denied');
select ok(not has_function_privilege('authenticated','public.patient_product_fulfilment(jsonb)','execute'),'browser native projection denied');
select ok(not has_function_privilege('service_role','commerce_private.product_supply_paid(uuid)','execute'),'inner primitive inaccessible');
select is(pg_temp.supply()->>'stage','not_started','payment does not advance physical state');
select throws_ok($$select pg_temp.supply(pg_temp.supply_input())$$,'42501','SUPPLY_NOT_READY','unpaid quote cannot order');
select throws_ok($$select pg_temp.supply(pg_temp.supply_input(),2)$$,'42501','SUPPLY_REJECTED','clinician cannot impersonate operations');
select throws_ok($$select pg_temp.supply(pg_temp.supply_input()||'{"paid":true}')$$,'22023','SUPPLY_INVALID','caller flags rejected');
-- Isolated synthetic financial facts only; not a Stripe capture.
update commerce_private.deposit_funding set state='applied';
update commerce_private.credit_reservations set state='applied';
insert into commerce_private.settlements(intent_id,paid_confirmed) select id,true from commerce_private.checkout_intents;
select is(pg_temp.supply()->>'canAdvance','true','paid exact order with current evidence ready');
select throws_ok($$select pg_temp.draft(pg_temp.draft_command()||jsonb_build_object('expectedDraftVersion',1,'requestKey',gen_random_uuid()))$$,'PT409','SUPPLY_ORDER_ACTIVE','a new draft cannot invalidate unfinished paid-order evidence');
select is(pg_temp.supply()->>'canAdvance','true','blocked replacement leaves exact paid order ready');
select throws_ok($test$do $$begin update commerce_private.settlements set dispute_seen=true;perform pg_temp.supply(pg_temp.supply_input());end$$$test$,'42501','SUPPLY_NOT_READY','dispute blocks supply');
select throws_ok($test$do $$begin update commerce_private.settlements set refunded_minor=1;perform pg_temp.supply(pg_temp.supply_input());end$$$test$,'42501','SUPPLY_NOT_READY','refund blocks supply');
select throws_ok($test$do $$begin update commerce_private.settlements set reconciliation_required=true;perform pg_temp.supply(pg_temp.supply_input());end$$$test$,'42501','SUPPLY_NOT_READY','uncertainty blocks supply');
select throws_ok($test$do $$begin update commerce_private.order_publications set status='withdrawn';perform pg_temp.supply(pg_temp.supply_input());end$$$test$,'42501','SUPPLY_NOT_READY','withdrawn exact terms block supply');
select throws_ok($test$do $$begin update intake_private.access_grants set revoked_at=clock_timestamp();perform pg_temp.supply(pg_temp.supply_input());end$$$test$,'42501','SUPPLY_NOT_READY','revoked clinical grant blocks supply');
select throws_ok($test$do $$begin update intake_private.intakes set safety_hold=true;perform pg_temp.supply(pg_temp.supply_input());end$$$test$,'42501','SUPPLY_NOT_READY','safety hold blocks supply');
select throws_ok($test$do $$begin insert into commerce_private.cancellation_requests(offer_id,request_key)select (value->>'offerId')::uuid,gen_random_uuid() from issued_view;perform pg_temp.supply(pg_temp.supply_input());end$$$test$,'42501','SUPPLY_NOT_READY','cancellation blocks supply');
select throws_ok($$select pg_temp.supply(pg_temp.supply_input('courier_dispatched'))$$,'PT409','SUPPLY_CONFLICT','cannot skip custody');
set local role service_role;
select is(pg_temp.supply(pg_temp.supply_input())->>'stage','provider_ordered','actual provider order recorded');
select is(pg_temp.supply(pg_temp.supply_input())->>'version','1','exact replay remains one record');
reset role;
select throws_ok($$select pg_temp.supply(pg_temp.supply_input('hub_received',0))$$,'PT409','SUPPLY_CONFLICT','changed-key payload denied');
select throws_ok($$select pg_temp.supply(pg_temp.supply_input('pharmacy_released',0,gen_random_uuid()))$$,'PT409','SUPPLY_CONFLICT','stale version denied');
select is(pg_temp.supply(pg_temp.supply_input('exception',1,gen_random_uuid()))->>'exception','true','exception recorded');
select throws_ok($$select pg_temp.supply(pg_temp.supply_input('pharmacy_released',2,gen_random_uuid()))$$,'PT409','SUPPLY_CONFLICT','exception blocks physical advance');
select is(public.patient_product_fulfilment(pg_temp.intake_context())->>'progress','needs_review','own client sees coarse exception');
select is(pg_temp.supply(pg_temp.supply_input('exception_resolved',2,gen_random_uuid()))->>'stage','provider_ordered','resolution does not auto advance');
select is(pg_temp.supply()->>'canAdvance','true','resolved exception reopens only the next eligible stage');
select is(pg_temp.supply(pg_temp.supply_input('pharmacy_released',3,gen_random_uuid()))->>'stage','pharmacy_released','independent release fact');
select is(pg_temp.supply(pg_temp.supply_input('hub_received',4,gen_random_uuid()))->>'stage','hub_received','Meneer custody receipt');
select is(public.patient_product_fulfilment(pg_temp.intake_context())->>'progress','received','minimal client receipt progress');
select is(pg_temp.supply(pg_temp.supply_input('courier_dispatched',5,gen_random_uuid()))->>'stage','courier_dispatched','courier dispatch separate');
select throws_ok($test$do $$begin update commerce_private.product_quote_releases set enabled=false;
 if pg_temp.supply(pg_temp.supply_input('delivered',6,gen_random_uuid()))->>'stage'<>'delivered' then raise exception 'DELIVERY_NOT_RECORDED';end if;
 raise exception using errcode='PT000',message='DELIVERY_ROLLBACK';end$$$test$,'PT000','DELIVERY_ROLLBACK','delivery fact remains recordable after release withdrawal');
select is(pg_temp.supply(pg_temp.supply_input('delivered',6,gen_random_uuid()))->>'stage','delivered','final delivery fact recorded');
select is(pg_temp.supply()->>'nextEvent',null,'no physical advance after delivered');
select throws_ok($$update commerce_private.product_fulfilment_events set evidence_reference=gen_random_uuid()$$,'55000','APPEND_ONLY_RECORD','custody history immutable');
select ok(not exists(select 1 from public.audit_events where action like 'product.supply.%' and metadata<>'{}'),'audit has no address or health content');
select ok(position('POST_RELEASE_REVIEW_REQUIRED' in pg_get_functiondef('public.staff_refund_command_before_reconciliation(jsonb,jsonb)'::regprocedure))>0,'pre-release refunds guarded after pharmacy release');
select ok(not has_function_privilege('service_role','public.staff_refund_command_before_reconciliation(jsonb,jsonb)','execute'),'retired refund ACL preserved');
select is((select count(*)::integer from commerce_private.product_fulfilment_events),7,'exact seven-event physical and exception chain');
select throws_ok($test$do $$begin
 update auth.mfa_amr_claims set updated_at=clock_timestamp()-interval '6 minutes';
 perform pg_temp.supply();end$$$test$,'42501',null,'stale TOTP cannot read custody');
select throws_ok($test$do $$begin
 update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='synthetic';
 perform pg_temp.supply();end$$$test$,'42501',null,'revoked application session denied');
select throws_ok($test$do $$begin
 update public.operations_assignments set revoked_at=clock_timestamp();
 perform pg_temp.supply();end$$$test$,'42501',null,'unassigned operations denied');
select throws_ok($$select public.staff_product_fulfilment(pg_temp.medical_context(4)||jsonb_build_object('tenantId',gen_random_uuid()),jsonb_build_object('action','read','caseId',pg_temp.evidence_case()),'local-synthetic')$$,'42501',null,'wrong tenant denied');
select throws_ok($$select public.staff_product_fulfilment(pg_temp.medical_context(4)||'{"purpose":"support"}',jsonb_build_object('action','read','caseId',pg_temp.evidence_case()),'local-synthetic')$$,'42501',null,'wrong purpose denied');
select throws_ok($$select public.patient_product_fulfilment(pg_temp.intake_context()||jsonb_build_object('subjectId',pg_temp.medical_subject(4)))$$,'42501',null,'patient cannot read another subject progress');
insert into commerce_private.refund_authorities(case_id,actor_id,approval_reference,approved_by,expires_at)
values(pg_temp.evidence_case(),pg_temp.medical_subject(4),gen_random_uuid(),pg_temp.medical_subject(3),now()+interval '1 hour');
insert into commerce_private.refund_evidence values('15700000-0000-4000-8000-000000000030',pg_temp.evidence_case(),'product_before_release',gen_random_uuid(),pg_temp.medical_subject(3),now(),now()+interval '1 hour');
select throws_ok($$select public.staff_refund_command(jsonb_build_object(
'p_provider_subject',pg_temp.medical_context(4)->>'providerSubject','p_provider_session_id',pg_temp.medical_context(4)->>'providerSessionId',
'p_verified_email',pg_temp.medical_context(4)->>'verifiedEmail','p_session_id',pg_temp.medical_context(4)->>'sessionId',
'p_subject_id',pg_temp.medical_subject(4),'p_tenant_id','10000000-0000-4000-8000-000000000001'),
jsonb_build_object('action','review','offerId',(select value->>'offerId' from issued_view),'reason','product_before_release',
'evidenceId','15700000-0000-4000-8000-000000000030','requestKey',gen_random_uuid()))$$,'PT409','POST_RELEASE_REVIEW_REQUIRED','native pre-release refund cannot refund released goods automatically');

-- 15.8: each exact event reserves only a generic, recipient-derived notification.
select is((select count(*)::integer from audit_private.transactional_notifications where source_kind='product_fulfilment'),7,'one outbox record per exact custody event; replay adds none');
select ok(not exists(select 1 from audit_private.transactional_notifications n
 join commerce_private.product_fulfilment_events e on e.id=n.source_id
 join commerce_private.offers o on o.id=e.offer_id where n.source_kind='product_fulfilment'
 and (n.subject_id<>o.subject_id or n.tenant_id<>o.tenant_id or n.source_version<>e.version::text
 or n.template<>'service-v1' or n.owner<>'operations')),'outbox binds original client and exact event without product/clinical payload');
select ok(not has_function_privilege('service_role','audit_private.capture_product_fulfilment_notification()','execute'),'service cannot invoke fulfilment notification trigger');
select ok(not has_function_privilege('authenticated','audit_private.capture_product_fulfilment_notification()','execute'),'browser cannot invoke fulfilment notification trigger');
select ok(not has_table_privilege('service_role','audit_private.transactional_notifications','insert'),'no service outbox fabrication');
select ok(not has_table_privilege('anon','commerce_private.product_fulfilment_events','insert'),'no anonymous fulfilment event fabrication');

select * from finish();
rollback;


