begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select ok(not public.public_registration_available('10000000-0000-4000-8000-000000000001'),'missing policy denies public registration');
insert into identity_private.public_registration_settings values('10000000-0000-4000-8000-000000000001',false);
select ok(not public.public_registration_available('10000000-0000-4000-8000-000000000001'),'disabled policy denies registration');
update identity_private.public_registration_settings set enabled=true;
select ok(not public.public_registration_available('10000000-0000-4000-8000-000000000001'),'missing current documents deny registration');
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('f7000000-0000-4000-8000-000000000004','pilot-account-terms','1.0','Synthetic public account terms only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('f7000000-0000-4000-8000-000000000005','pilot-privacy-notice','1.0','Synthetic public privacy notice only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
select ok(public.public_registration_available('10000000-0000-4000-8000-000000000001'),'approved current documents and policy allow entry');
select ok(not has_function_privilege('anon','public.prepare_public_registration(uuid,uuid,uuid)','execute'),'anonymous cannot mint application admission');
select ok(not has_function_privilege('authenticated','public.prepare_public_registration(uuid,uuid,uuid)','execute'),'browser JWT cannot mint admission');
select ok(not has_table_privilege('service_role','identity_private.public_registration_settings','update'),'application cannot enable its own policy');
select ok(not has_table_privilege('service_role','public.client_profiles','insert'),'profile bypass stays denied');
select ok(public.reserve_public_registration_send('10000000-0000-4000-8000-000000000001',repeat('a',64)),'first send reserved');
select ok(public.reserve_public_registration_send('10000000-0000-4000-8000-000000000001',repeat('a',64)),'second send reserved');
select ok(public.reserve_public_registration_send('10000000-0000-4000-8000-000000000001',repeat('a',64)),'third send reserved');
select ok(not public.reserve_public_registration_send('10000000-0000-4000-8000-000000000001',repeat('a',64)),'fourth send denied without blind retry');
insert into auth.users(id,email,is_sso_user,is_anonymous) values('f7000000-0000-4000-8000-000000000001','public-client@example.invalid',false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values('f7000000-0000-4000-8000-000000000002','f7000000-0000-4000-8000-000000000001',now(),now(),'aal1');
create function pg_temp.registration() returns jsonb language sql as $$ select public.prepare_public_registration('10000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002') $$;
select throws_ok($$select pg_temp.registration()$$,'42501','REGISTRATION_REJECTED','unconfirmed contact cannot proceed');
update auth.users set email_confirmed_at=now() where id='f7000000-0000-4000-8000-000000000001';
select throws_ok($test$do $$begin
  insert into public.tenant_memberships(tenant_id,subject_id,role,status)
  select '10000000-0000-4000-8000-000000000002',subject_id,'patient','invited' from public.external_identities
  where provider_subject='f7000000-0000-4000-8000-000000000001';
  perform pg_temp.registration();
end $$ $test$,'42501','REGISTRATION_REJECTED','another tenant membership cannot be adopted');
create temporary table registration_fixture as select (pg_temp.registration()->>'invitationId')::uuid as id;
select is((select count(*) from public.identity_invitations where admission_source='public_registration'),1::bigint,'verified registration creates one bounded admission');
select is((select count(*) from public.tenant_memberships where subject_id=(select subject_id from public.external_identities where provider_subject='f7000000-0000-4000-8000-000000000001')),0::bigint,'no membership before terms and profile commit');
select is((pg_temp.registration()->>'invitationId')::uuid,(select id from registration_fixture),'retry reuses admission');
select lives_ok($$select public.prepare_pilot_account((select id from registration_fixture),'10000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002')$$,'verified registration reuses exact account instruments');
select throws_ok($$select public.prepare_public_registration('10000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000009')$$,'42501','REGISTRATION_REJECTED','wrong provider session denied');
create function pg_temp.activate_public(override jsonb default '{}'::jsonb) returns uuid language sql as $$
 select public.activate_pilot_account((select id from registration_fixture),'10000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000002',jsonb_build_object(
 'givenName','SyntheticPublic','familyName','Client','mobileE164','+27820000000','contactPreference','email',
 'termsPublicationId','f7000000-0000-4000-8000-000000000004','termsHash',encode(extensions.digest(convert_to('Synthetic public account terms only','UTF8'),'sha256'),'hex'),
 'privacyPublicationId','f7000000-0000-4000-8000-000000000005','privacyHash',encode(extensions.digest(convert_to('Synthetic public privacy notice only','UTF8'),'sha256'),'hex'),
 'termsAccepted',true,'privacyAcknowledged',true,'requestKey','f7000000-0000-4000-8000-000000000006')||override)
$$;
select throws_ok($$select pg_temp.activate_public('{"termsAccepted":false}')$$,'22023','ACTIVATION_REJECTED','acceptance cannot be implicit');
select is((select count(*) from public.client_profiles where given_name='SyntheticPublic'),0::bigint,'denied acceptance creates no profile');
select throws_ok($test$do $$begin
  update identity_private.public_registration_settings set enabled=false;
  perform pg_temp.activate_public();
end $$ $test$,'42501','REGISTRATION_REJECTED','disabling public policy prevents a previously verified admission activating');
select is((select count(*) from public.client_profiles where given_name='SyntheticPublic'),0::bigint,'late policy denial rolls back profile and receipts');
select lives_ok($$select pg_temp.activate_public()$$,'exact terms and privacy actions activate atomically');
select is((select count(*) from public.client_profiles where given_name='SyntheticPublic'),1::bigint,'one profile created');
select is((select count(*) from public.tenant_memberships where subject_id=(select subject_id from public.external_identities where provider_subject='f7000000-0000-4000-8000-000000000001') and role='patient' and status='active'),1::bigint,'only patient membership activated');
select is((select count(*) from public.pilot_instrument_receipts where publication_id in ('f7000000-0000-4000-8000-000000000004','f7000000-0000-4000-8000-000000000005')),2::bigint,'both exact-version receipts retained');
select ok((pg_temp.registration()->>'alreadyActive')::boolean,'returning account does not create another admission');
select lives_ok($$select pg_temp.activate_public()$$,'activation retry remains idempotent');
select throws_ok($$update public.identity_invitations set admission_source='staff' where id=(select id from registration_fixture)$$,'42501','REGISTRATION_REJECTED','admission provenance cannot be rewritten');
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous) values('f7000000-0000-4000-8000-000000000011','existing-invite@example.invalid',now(),false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values('f7000000-0000-4000-8000-000000000012','f7000000-0000-4000-8000-000000000011',now(),now(),'aal1');
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
values('f7000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001',encode(extensions.digest(convert_to('existing-invite@example.invalid','UTF8'),'sha256'),'hex'),'patient','f7000000-0000-4000-8000-000000000011',now()+interval '1 hour','20000000-0000-4000-8000-000000000001','operations',gen_random_uuid(),'delivered',now());
select throws_ok($$select public.prepare_public_registration('10000000-0000-4000-8000-000000000001','f7000000-0000-4000-8000-000000000011','f7000000-0000-4000-8000-000000000012')$$,'42501','REGISTRATION_REJECTED','public entry cannot replace an existing staff/mobile invitation');
select is((select status from public.identity_invitations where id='f7000000-0000-4000-8000-000000000013'),'pending','existing invitation remains unchanged');
update identity_private.public_registration_settings set enabled=false;
select ok(not public.public_registration_available('10000000-0000-4000-8000-000000000001'),'disabled restoration denies entry');
select throws_ok($$select pg_temp.registration()$$,'42501','REGISTRATION_REJECTED','disabled restoration denies further registration proof');
select * from finish();
rollback;
