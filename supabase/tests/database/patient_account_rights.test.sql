begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(34);
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('98000000-0000-4000-8000-000000000001','rights@example.invalid',now(),false,false);
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('98000000-0000-4000-8000-000000000002','98000000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,
issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
values('98000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',
encode(extensions.digest(convert_to('rights@example.invalid','UTF8'),'sha256'),'hex'),'patient','98000000-0000-4000-8000-000000000001',now()+interval '1 hour',
'20000000-0000-4000-8000-000000000001','operations',gen_random_uuid(),'delivered',now());
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,
rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at) values
('98000000-0000-4000-8000-000000000004','pilot-account-terms','1.0','Synthetic rights terms',repeat('0',64),'/account/activate','synthetic','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('98000000-0000-4000-8000-000000000005','pilot-privacy-notice','1.0','Synthetic rights privacy',repeat('0',64),'/account/activate','synthetic','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
select public.activate_pilot_account('98000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002',jsonb_build_object(
'givenName','Synthetic','familyName','Client','mobileE164','+27820000000','contactPreference','email',
'termsPublicationId','98000000-0000-4000-8000-000000000004','termsHash',encode(extensions.digest(convert_to('Synthetic rights terms','UTF8'),'sha256'),'hex'),
'privacyPublicationId','98000000-0000-4000-8000-000000000005','privacyHash',encode(extensions.digest(convert_to('Synthetic rights privacy','UTF8'),'sha256'),'hex'),
'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid()));
create temporary table rights_context as select subject_id from public.external_identities where provider='supabase' and provider_subject='98000000-0000-4000-8000-000000000001';
grant select on rights_context to service_role;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select '98000000-0000-4000-8000-000000000006',subject_id,'98000000-0000-4000-8000-000000000002','patient','aal1',now(),now(),now()+interval '30 minutes',now()+interval '12 hours' from rights_context;
create function pg_temp.cmd(command jsonb, tenant uuid default '10000000-0000-4000-8000-000000000001',subject uuid default null,purpose text default 'account') returns jsonb language sql as $$
select public.execute_patient_account_command(tenant,coalesce(subject,(select subject_id from rights_context)),
'98000000-0000-4000-8000-000000000006','98000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000002','rights@example.invalid',purpose,command);$$;
create function pg_temp.correction() returns jsonb language sql as $$select '{"action":"correct","requestKey":"98000000-0000-4000-8000-000000000010","expectedVersion":1,"givenName":"Corrected","familyName":"Client","contactPreference":"whatsapp"}'::jsonb;$$;
create function pg_temp.request(kind text default 'export',key uuid default '98000000-0000-4000-8000-000000000011') returns jsonb language sql as $$select jsonb_build_object('action','request','kind',kind,'requestKey',key,'expectedVersion',2);$$;
select ok(not has_function_privilege('anon','public.execute_patient_account_command(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)','execute'),'anonymous command denied');
select ok(not has_function_privilege('authenticated','public.execute_patient_account_command(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)','execute'),'browser command denied');
select ok(not has_table_privilege('service_role','identity_private.patient_rights_requests','select'),'no direct server queue grant');
select ok((select relrowsecurity from pg_class where oid='identity_private.patient_rights_requests'::regclass),'private requests have RLS');
set local role service_role;
select is(pg_temp.cmd(pg_temp.correction())->>'outcome','corrected','real server role correction succeeds');
reset role;
select is((select version from public.client_profiles where subject_id=(select subject_id from rights_context)),2,'version increments once');
select is((select given_name from public.client_profiles where subject_id=(select subject_id from rights_context)),'Corrected','name corrected');
select is((select mobile_e164 from public.client_profiles where subject_id=(select subject_id from rights_context)),'+27820000000','mobile unchanged');
select is((select count(*) from public.client_profile_events where subject_id=(select subject_id from rights_context) and event_type='corrected'),1::bigint,'one value-free correction event');
select is((select count(*) from public.audit_events where action='identity.profile.corrected' and actor_id=(select subject_id from rights_context)),1::bigint,'audit committed');
select is(pg_temp.cmd(pg_temp.correction())->>'profileVersion','2','same retry returns original after version increment');
select is((select count(*) from public.client_profile_events where subject_id=(select subject_id from rights_context) and event_type='corrected'),1::bigint,'retry no duplicate event');
select throws_ok($$select pg_temp.cmd(pg_temp.correction()||'{"givenName":"Changed"}'::jsonb)$$,'40001','ACCOUNT_COMMAND_CONFLICT','changed replay denied');
select throws_ok($$select pg_temp.cmd(pg_temp.correction()||jsonb_build_object('requestKey',gen_random_uuid()))$$,'40001','ACCOUNT_COMMAND_CONFLICT','stale profile version denied');
select throws_ok($$select pg_temp.cmd(pg_temp.correction()||'{"mobileE164":"+27820000001"}'::jsonb)$$,'42501','ACCOUNT_COMMAND_REJECTED','contact bypass denied');
select throws_ok($$select pg_temp.cmd(pg_temp.request()||'{"notes":"secret"}'::jsonb)$$,'42501','ACCOUNT_COMMAND_REJECTED','free text denied');
select throws_ok($$select pg_temp.cmd(pg_temp.request()||'{"kind":null}'::jsonb)$$,'42501','ACCOUNT_COMMAND_REJECTED','null category denied');
select throws_ok($$select pg_temp.cmd(pg_temp.request(),tenant=>'10000000-0000-4000-8000-000000000002')$$,'42501','PORTAL_REJECTED','cross tenant denied');
select throws_ok($$select pg_temp.cmd(pg_temp.request(),subject=>'20000000-0000-4000-8000-000000000002')$$,'42501','PORTAL_REJECTED','IDOR denied');
select throws_ok($$select pg_temp.cmd(pg_temp.request(),purpose=>'marketing')$$,'42501','PORTAL_REJECTED','purpose denied');
select is(pg_temp.cmd(pg_temp.request())->>'outcome','received','export records receipt only');
select is(pg_temp.cmd(pg_temp.request('export','98000000-0000-4000-8000-000000000012'))->>'reference',pg_temp.cmd(pg_temp.request())->>'reference','duplicate category reuses private case');
select is((select count(*) from identity_private.patient_rights_requests where subject_id=(select subject_id from rights_context)),1::bigint,'one pending case');
select is((select count(*) from public.audit_events where action='identity.rights.requested' and actor_id=(select subject_id from rights_context)),1::bigint,'duplicate category no duplicate audit');
select is(pg_temp.cmd(pg_temp.request('closure','98000000-0000-4000-8000-000000000013'))->>'outcome','received','closure is request only');
select is((select status from public.client_profiles where subject_id=(select subject_id from rights_context)),'active','request does not close/restrict account');
select throws_ok($test$do $$begin
  delete from auth.sessions where id='98000000-0000-4000-8000-000000000002';
  perform pg_temp.cmd(pg_temp.request()); end;$$$test$,'42501','PORTAL_REJECTED','replay rechecks revoked provider session');
select throws_ok($test$do $$begin
  update public.identity_sessions set status='revoked',revoked_at=now(),revocation_reason='synthetic' where id='98000000-0000-4000-8000-000000000006';
  perform pg_temp.cmd(pg_temp.request()); end;$$$test$,'42501','PORTAL_REJECTED','replay rechecks revoked application session');
select throws_ok($test$do $$begin
  update public.tenants set status='suspended' where id='10000000-0000-4000-8000-000000000001';
  perform pg_temp.cmd(pg_temp.request()); end;$$$test$,'42501','PORTAL_REJECTED','suspended tenant cannot submit/replay');
select throws_ok($test$do $$begin
  update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from rights_context);
  perform pg_temp.cmd(pg_temp.request()); end;$$$test$,'42501','PORTAL_REJECTED','revoked role cannot submit/replay');
create function pg_temp.reject_audit() returns trigger language plpgsql as $$begin raise exception using errcode='P0001',message='SYNTHETIC_AUDIT_FAILURE'; end;$$;
create trigger synthetic_rights_audit_failure before insert on public.audit_events for each row execute function pg_temp.reject_audit();
select throws_ok($$select pg_temp.cmd(pg_temp.correction()||jsonb_build_object('requestKey',gen_random_uuid(),'expectedVersion',2,'givenName','Rollback'))$$,'P0001','SYNTHETIC_AUDIT_FAILURE','late audit failure rejects entire correction');
select is((select version from public.client_profiles where subject_id=(select subject_id from rights_context)),2,'late failure rolls back profile version');
select throws_ok($$select pg_temp.cmd(pg_temp.request('support',gen_random_uuid()))$$,'P0001','SYNTHETIC_AUDIT_FAILURE','late audit failure rejects request receipt');
select is((select count(*) from identity_private.patient_rights_requests where subject_id=(select subject_id from rights_context) and kind='support'),0::bigint,'late failure rolls back request');
select * from finish();
rollback;
