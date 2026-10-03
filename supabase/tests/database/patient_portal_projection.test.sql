begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(35);

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

select ok(not has_function_privilege('anon','public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text)','execute'),'anonymous cannot call projection');
select ok(not has_function_privilege('authenticated','public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text)','execute'),'browser JWT cannot call projection');
select ok(has_function_privilege('service_role','public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text)','execute'),'server alone can call projection');
select ok(not has_table_privilege('authenticated','public.client_profiles','select'),'browser cannot read profiles directly');
set local role service_role;
select is(pg_temp.portal()->'profile'->>'verifiedEmail','portal@example.invalid','own verified contact appears through real service role');
select is(pg_temp.portal()->'profile'->>'mobileVerificationStatus','pending','mobile is not falsely verified');
select is(jsonb_array_length(pg_temp.portal()->'instruments'),2,'two exact account actions appear');
select is(pg_temp.portal()->'workflows','[]'::jsonb,'absence never fabricates workflow progress');
reset role;
insert into public.workflow_instances(id,tenant_id,subject_id,payment_state)
select '97000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001',subject_id,'paid' from portal_context;
insert into public.workflow_instances(id,tenant_id,subject_id)
values ('97000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002');
select is(jsonb_array_length(pg_temp.portal()->'workflows'),1,'other subject/tenant workflow excluded');
select is(pg_temp.portal()->'workflows'->0->>'dispatchState','not_ready','paid does not infer dispatch');
select ok(not (pg_temp.portal()->'workflows'->0 ?| array['clinicalState','clinical_state','paymentState','payment_state','protocol','product']),'clinical/commercial fields never projected');
select is((select count(*) from jsonb_object_keys(pg_temp.portal()->'profile')),10::bigint,'only ten approved profile fields');
select is(pg_temp.portal()->'instruments'->0->>'body','Synthetic terms only','exact accepted body is reproducible');
select throws_ok($$select pg_temp.portal('10000000-0000-4000-8000-000000000002')$$,'42501','PORTAL_REJECTED','wrong tenant denied');
select throws_ok($$select pg_temp.portal(subject=>'20000000-0000-4000-8000-000000000002')$$,'42501','PORTAL_REJECTED','IDOR denied');
select throws_ok($$select pg_temp.portal(provider=>'20000000-0000-4000-8000-000000000002')$$,'42501','PORTAL_REJECTED','wrong provider denied');
select throws_ok($$select pg_temp.portal(purpose=>'marketing')$$,'42501','PORTAL_REJECTED','wrong purpose denied');
select throws_ok($test$do $$begin
  update public.tenants set status='suspended' where id='10000000-0000-4000-8000-000000000001';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','suspended tenant denied');
select throws_ok($test$do $$begin
  update public.subjects set status='suspended' where id=(select subject_id from portal_context);
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','suspended subject denied');
select throws_ok($test$do $$begin
  update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from portal_context);
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','revoked membership denied');
select throws_ok($test$do $$begin
  insert into public.tenant_memberships(tenant_id,subject_id,role,status,approved_by_subject_id,expires_at)
  select '10000000-0000-4000-8000-000000000002',subject_id,'operations','active',
    '20000000-0000-4000-8000-000000000001',now()+interval '1 hour' from portal_context;
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','ambiguous staff/other-tenant membership denied');
select throws_ok($test$do $$begin
  update public.identity_sessions set status='revoked',revoked_at=now(),revocation_reason='synthetic'
    where id='97000000-0000-4000-8000-000000000006';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','revoked app session denied');
select throws_ok($test$do $$begin
  update public.identity_sessions set issued_at=now()-interval '1 hour',last_seen_at=now()-interval '31 minutes',idle_expires_at=now()-interval '1 minute',absolute_expires_at=now()+interval '11 hours'
    where id='97000000-0000-4000-8000-000000000006';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','idle expiry denied');
select throws_ok($test$do $$begin
  delete from auth.sessions where id='97000000-0000-4000-8000-000000000002';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','provider logout denied despite app session');
select throws_ok($test$do $$begin
  update auth.sessions set not_after=now()-interval '1 minute' where id='97000000-0000-4000-8000-000000000002';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','provider time box denied');
select throws_ok($test$do $$begin
  update public.subject_contacts set status='revoked' where subject_id=(select subject_id from portal_context);
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','revoked contact denied');
select throws_ok($test$do $$begin
  update auth.users set email='changed@example.invalid' where id='97000000-0000-4000-8000-000000000001';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','changed contact denied');
select throws_ok($test$do $$begin
  update public.client_profiles set status='restricted' where subject_id=(select subject_id from portal_context);
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','restricted profile denied');
select throws_ok($test$do $$begin
  update public.pilot_instrument_publications set status='withdrawn',retired_at=now() where id='97000000-0000-4000-8000-000000000004';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','withdrawn publication denied');
select throws_ok($test$do $$begin
  insert into public.pilot_instrument_receipt_events(tenant_id,subject_id,receipt_id,event_type,actor_subject_id,reason_code,idempotency_key,correlation_id)
  select tenant_id,subject_id,id,'withdrawn',subject_id,'synthetic',gen_random_uuid(),'synthetic-portal'
    from public.pilot_instrument_receipts where publication_id='97000000-0000-4000-8000-000000000004';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','withdrawn receipt denied');
select throws_ok($test$do $$begin
  update public.identity_sessions set issued_at=now()-interval '13 hours',last_seen_at=now()-interval '61 minutes',
    idle_expires_at=now()-interval '1 hour',absolute_expires_at=now()-interval '1 hour'
    where id='97000000-0000-4000-8000-000000000006';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','absolute expiry denied');
select throws_ok($test$do $$begin
  update public.identity_sessions set session_class='workforce',assurance='aal2',
    idle_expires_at=now()+interval '15 minutes',absolute_expires_at=now()+interval '8 hours'
    where id='97000000-0000-4000-8000-000000000006';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','workforce session cannot use patient projection');
select throws_ok($test$do $$begin
  update auth.users set banned_until=now()+interval '1 hour' where id='97000000-0000-4000-8000-000000000001';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','banned provider identity denied');
select throws_ok($test$do $$begin
  update auth.users set email_confirmed_at=null where id='97000000-0000-4000-8000-000000000001';
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','unconfirmed identity denied');
select throws_ok($test$do $$begin
  insert into public.pilot_account_lifecycle_events(tenant_id,subject_id,event_type,actor_subject_id,
    reason_code,idempotency_key,correlation_id,recorded_at)
  select '10000000-0000-4000-8000-000000000001',subject_id,'suspended',subject_id,
    'synthetic',gen_random_uuid(),'synthetic-lifecycle',clock_timestamp() from portal_context;
  perform pg_temp.portal(); end;$$$test$,'42501','PORTAL_REJECTED','latest lifecycle suspension denied');
select * from finish();
rollback;
