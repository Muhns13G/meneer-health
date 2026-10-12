begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('fa200000-0000-4000-8000-000000000004','pilot-account-terms','1.1','Synthetic public terms only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('fa200000-0000-4000-8000-000000000005','pilot-privacy-notice','1.1','Synthetic public privacy only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
insert into identity_private.public_registration_settings values('10000000-0000-4000-8000-000000000001',true);
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous) values('fa200000-0000-4000-8000-000000000001','current-public@example.invalid',now(),false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values('fa200000-0000-4000-8000-000000000002','fa200000-0000-4000-8000-000000000001',now(),now(),'aal1');
create temporary table current_admission as select (public.prepare_public_registration('10000000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000002')->>'invitationId')::uuid as id;
select lives_ok($$select public.activate_pilot_account((select id from current_admission),'10000000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000001','fa200000-0000-4000-8000-000000000002',jsonb_build_object(
'givenName','Synthetic','familyName','Public','mobileE164','+27820000000','contactPreference','email',
'termsPublicationId','fa200000-0000-4000-8000-000000000004','termsHash',encode(extensions.digest(convert_to('Synthetic public terms only','UTF8'),'sha256'),'hex'),
'privacyPublicationId','fa200000-0000-4000-8000-000000000005','privacyHash',encode(extensions.digest(convert_to('Synthetic public privacy only','UTF8'),'sha256'),'hex'),
'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid()))$$,'new public account activates only with actual current 1.1 actions');
create function pg_temp.current_subject() returns uuid language sql as $$select subject_id from public.external_identities where provider='supabase' and provider_subject='fa200000-0000-4000-8000-000000000001'$$;
select ok(public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.current_subject()),'current public evidence needs no legacy transition');
select is((select count(*) from identity_private.account_notice_receipt_transitions),0::bigint,'no compatibility approval is inferred or generated');
select is((select count(*) from public.pilot_instrument_receipts where subject_id=pg_temp.current_subject() and instrument_version='1.1'),2::bigint,'both new-version receipts are genuine');
select is(identity_private.account_instrument_evidence('10000000-0000-4000-8000-000000000001',pg_temp.current_subject())->0->>'version','1.1','projection preserves current accepted version');
select is((select count(*) from public.tenant_memberships where subject_id=pg_temp.current_subject() and role<>'patient'),0::bigint,'no workforce or clinical role granted');
select * from finish();
rollback;
