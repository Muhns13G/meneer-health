begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('fb200000-0000-4000-8000-000000000004','pilot-account-terms','1.1','Synthetic prior terms',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('fb200000-0000-4000-8000-000000000005','pilot-privacy-notice','1.1','Synthetic prior privacy',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
insert into identity_private.public_registration_settings values('10000000-0000-4000-8000-000000000001',true);
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous) values
('fb200000-0000-4000-8000-000000000001','reack@example.invalid',now(),false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
('fb200000-0000-4000-8000-000000000002','fb200000-0000-4000-8000-000000000001',now(),now(),'aal1');
create temporary table admission as select (public.prepare_public_registration('10000000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000002')->>'invitationId')::uuid as id;
select public.activate_pilot_account((select id from admission),'10000000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000002',jsonb_build_object(
'givenName','Synthetic','familyName','Review','mobileE164','+27820000000','contactPreference','email',
'termsPublicationId','fb200000-0000-4000-8000-000000000004','termsHash',(select content_sha256 from public.pilot_instrument_publications where id='fb200000-0000-4000-8000-000000000004'),
'privacyPublicationId','fb200000-0000-4000-8000-000000000005','privacyHash',(select content_sha256 from public.pilot_instrument_publications where id='fb200000-0000-4000-8000-000000000005'),
'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid()));
create function pg_temp.subject() returns uuid language sql as $$select subject_id from public.external_identities where provider='supabase' and provider_subject='fb200000-0000-4000-8000-000000000001'$$;
create temporary table originals as select id,to_jsonb(r) as row from public.pilot_instrument_receipts r where subject_id=pg_temp.subject();
select ok(public.account_document_review_eligible('10000000-0000-4000-8000-000000000001',pg_temp.subject()),'genuine old public-source client qualifies for document review');
select ok(not public.account_document_review_eligible('10000000-0000-4000-8000-000000000002',pg_temp.subject()),'wrong tenant fails');
select ok(not public.account_document_review_eligible('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),'staff with no activated patient history cannot inherit review');
select ok(not has_function_privilege('anon','public.read_account_document_review(uuid,uuid,uuid)','EXECUTE'),'anonymous RPC denied');
select ok(not has_function_privilege('authenticated','public.acknowledge_account_documents(uuid,uuid,uuid,jsonb)','EXECUTE'),'direct authenticated acknowledgement denied');
select ok(not has_table_privilege('service_role','identity_private.account_document_reacknowledgements','INSERT'),'service cannot directly fabricate review journal');
update public.pilot_instrument_publications set status='superseded',retired_at=clock_timestamp() where id in('fb200000-0000-4000-8000-000000000004','fb200000-0000-4000-8000-000000000005');
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('fb200000-0000-4000-8000-000000000014','pilot-account-terms','1.2','Synthetic new-company terms',repeat('0',64),'/account/documents','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',clock_timestamp()),
('fb200000-0000-4000-8000-000000000015','pilot-privacy-notice','1.2','Synthetic new-company privacy',repeat('0',64),'/account/documents','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',clock_timestamp());
select ok(not public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.subject()),'new company publications do not silently grant normal access');
create function pg_temp.documents() returns jsonb language sql as $$select public.read_account_document_review('10000000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000002')$$;
create function pg_temp.command() returns jsonb language sql as $$select jsonb_build_object('requestKey','fb200000-0000-4000-8000-000000000020','termsPublicationId','fb200000-0000-4000-8000-000000000014','privacyPublicationId','fb200000-0000-4000-8000-000000000015','termsHash',(select content_sha256 from public.pilot_instrument_publications where id='fb200000-0000-4000-8000-000000000014'),'privacyHash',(select content_sha256 from public.pilot_instrument_publications where id='fb200000-0000-4000-8000-000000000015'),'termsAccepted',true,'privacyAcknowledged',true)$$;
create function pg_temp.accept(command jsonb) returns boolean language sql as $$select public.acknowledge_account_documents('10000000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000002',command)$$;
select is(jsonb_array_length(pg_temp.documents()->'documents'),2,'review returns only two current account documents');
select is(pg_temp.documents()->'documents'->0->>'version','1.2','review displays actual successor version');
select is((select count(*) from public.pilot_instrument_receipts where subject_id=pg_temp.subject()),2::bigint,'read creates no receipts');
select throws_ok($$select pg_temp.accept(pg_temp.command()||'{"termsAccepted":false}'::jsonb)$$,'22023','ACCOUNT_REVIEW_COMMAND_INVALID','unchecked action rejected');
select throws_ok($$select pg_temp.accept(pg_temp.command()||jsonb_build_object('termsHash',repeat('0',64)))$$,'42501','ACCOUNT_REVIEW_STALE','tampered hash rejected');
select throws_ok($$select public.read_account_document_review('10000000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000001','fb200000-0000-4000-8000-000000000099')$$,'42501','ACCOUNT_REVIEW_REJECTED','wrong provider session rejected');
select ok(pg_temp.accept(pg_temp.command()),'actual action creates current receipts and restores evidence');
select ok(public.has_pilot_account_evidence('10000000-0000-4000-8000-000000000001',pg_temp.subject()),'normal access now has current evidence');
select is((select count(*) from public.pilot_instrument_receipts where subject_id=pg_temp.subject()),4::bigint,'two successors added, originals retained');
select ok(pg_temp.accept(pg_temp.command()),'exact retry succeeds');
select is((select count(*) from public.pilot_instrument_receipts where subject_id=pg_temp.subject()),4::bigint,'retry adds no duplicate receipts');
select ok(not exists(select 1 from originals o join public.pilot_instrument_receipts r using(id) where o.row<>to_jsonb(r)),'original receipts never rewritten');
update auth.sessions set not_after=clock_timestamp()-interval '1 minute' where id='fb200000-0000-4000-8000-000000000002';
select throws_ok($$select pg_temp.documents()$$,'42501','ACCOUNT_REVIEW_REJECTED','expired provider session rejected even after acknowledgement');
update auth.sessions set not_after=null where id='fb200000-0000-4000-8000-000000000002';
update public.tenant_memberships set status='suspended' where tenant_id='10000000-0000-4000-8000-000000000001' and subject_id=pg_temp.subject() and role='patient';
select ok(not public.account_document_review_eligible('10000000-0000-4000-8000-000000000001',pg_temp.subject()),'suspended membership cannot enter document lane');
select throws_ok($$select pg_temp.documents()$$,'42501','ACCOUNT_REVIEW_REJECTED','review revalidates suspension');
select * from finish();
rollback;
