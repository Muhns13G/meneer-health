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

create function pg_temp.context() returns jsonb language sql as $$select jsonb_build_object(
 'tenantId','10000000-0000-4000-8000-000000000001','subjectId',(select subject_id from portal_context),
 'sessionId','97000000-0000-4000-8000-000000000006','providerSubject','97000000-0000-4000-8000-000000000001',
 'providerSessionId','97000000-0000-4000-8000-000000000002','verifiedEmail','portal@example.invalid','purpose','account')$$;
create function pg_temp.catalogue(c jsonb default '{"action":"read"}',source text default 'local-synthetic')
 returns jsonb language sql as $$select public.patient_product_catalogue(pg_temp.context(),c,source)$$;
select ok(not has_table_privilege('service_role','commerce_private.product_interests','INSERT'),'service cannot fabricate interests');
select ok(not has_table_privilege('authenticated','commerce_private.product_interests','SELECT'),'browser cannot browse interests');
select ok(not has_function_privilege('anon','public.patient_product_catalogue(jsonb,jsonb,text)','EXECUTE'),'anonymous cannot execute RPC');
select ok(has_function_privilege('service_role','public.patient_product_catalogue(jsonb,jsonb,text)','EXECUTE'),'service has governed RPC');
select is(jsonb_array_length(pg_temp.catalogue()->'items'),0,'empty catalogue is honest');
insert into commerce_private.catalogue_versions(id,tenant_id,version,provenance,source_fingerprint,import_fingerprint,approval_reference,
 imported_by,reviewed_by,currency,tax_treatment,effective_at,expires_at,item_count)
values('15300000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','synthetic-v1','local-synthetic',
 repeat('a',64),repeat('b',64),gen_random_uuid(),'20000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000002','zar','vat-inclusive-planning',now()-interval '1 day',now()+interval '1 day',2);
insert into commerce_private.catalogue_items values
('15300000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','15300000-0000-4000-8000-000000000002','synthetic-one','Synthetic item one',150000,2),
('15300000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','15300000-0000-4000-8000-000000000003','synthetic-two','Synthetic item two',250000,2);
select is(jsonb_array_length(pg_temp.catalogue()->'items'),2,'own onboarded client sees prices');
select is(jsonb_array_length(pg_temp.catalogue('{"action":"read"}','precise-wellness-rrp')->'items'),0,'pilot mode never substitutes synthetic products');
select ok(not(pg_temp.catalogue() ?| array['tenantId','subjectId','sourceFingerprint','importedBy','approvalReference','wholesaleCost']),'private provenance excluded');
select is((pg_temp.catalogue()->'items'->0->>'unitAmountMinor')::integer,150000,'server owns RRP amount');
create function pg_temp.interest(product uuid default '15300000-0000-4000-8000-000000000002') returns jsonb language sql as $$select pg_temp.catalogue(
 jsonb_build_object('action','register_interest','catalogueId','15300000-0000-4000-8000-000000000001','productId',product,
 'requestKey','15300000-0000-4000-8000-000000000004'))$$;
select lives_ok($$select pg_temp.interest()$$,'current own interest accepted');
select is((pg_temp.interest()->'items'->0->>'interested')::boolean,true,'durable interest is projected');
select is((select count(*)::integer from commerce_private.product_interests),1,'exact retry is one record');
select is((select count(*)::integer from public.audit_events where action='catalogue.interest.recorded'),1,'exact retry is one audit');
select ok((select metadata='{}'::jsonb from public.audit_events where action='catalogue.interest.recorded'),'audit has no product details');
select throws_ok($$select pg_temp.interest('15300000-0000-4000-8000-000000000003')$$,'PT409','CATALOGUE_INTEREST_CONFLICT','changed key payload denied');
select throws_ok($$select pg_temp.catalogue('{"action":"read","paid":true}')$$,'22023','CATALOGUE_COMMAND_INVALID','caller paid flag denied');
select throws_ok($$select public.patient_product_catalogue(pg_temp.context()||'{"purpose":"care_delivery"}','{"action":"read"}','local-synthetic')$$,'42501',null,'wrong purpose denied');
select throws_ok($$select public.patient_product_catalogue(pg_temp.context()||'{"tenantId":"10000000-0000-4000-8000-000000000002"}','{"action":"read"}','local-synthetic')$$,'42501',null,'wrong tenant denied');
select throws_ok($$select public.patient_product_catalogue(pg_temp.context()||'{"subjectId":"20000000-0000-4000-8000-000000000001"}','{"action":"read"}','local-synthetic')$$,'42501',null,'wrong client denied');
select throws_ok($$update commerce_private.product_interests set product_id='15300000-0000-4000-8000-000000000003'$$,'55000','APPEND_ONLY_RECORD','interest history immutable');
select lives_ok($$select identity_private.assert_mobile_orphan_guard_coverage()$$,'interest preserves quarantine coverage');
update commerce_private.catalogue_versions set status='withdrawn' where id='15300000-0000-4000-8000-000000000001';
select is(jsonb_array_length(pg_temp.catalogue()->'items'),0,'withdrawn catalogue hidden');
select throws_ok($$select pg_temp.interest()$$,'PT409','CATALOGUE_CHANGED','withdrawn catalogue blocks replay');
select is((select count(*)::integer from commerce_private.offers),0,'interest creates no payable offer');
select is((select count(*)::integer from commerce_private.credit_reservations),0,'interest reserves no deposit');
select is((select count(*)::integer from commerce_private.product_release_gates),0,'interest grants no product authority');
select throws_ok($test$do $$begin update public.identity_sessions set status='revoked',revoked_at=clock_timestamp(),revocation_reason='synthetic' where id='97000000-0000-4000-8000-000000000006';perform pg_temp.catalogue();end$$$test$,
 '42501',null,'revoked current session denied');
select * from finish();
rollback;

