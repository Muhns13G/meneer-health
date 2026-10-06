begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
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

create function pg_temp.pc() returns jsonb language sql as $$select jsonb_build_object(
'tenantId','10000000-0000-4000-8000-000000000001','subjectId',(select subject_id from rights_context),
'sessionId','98000000-0000-4000-8000-000000000006','providerSubject','98000000-0000-4000-8000-000000000001',
'providerSessionId','98000000-0000-4000-8000-000000000002','verifiedEmail','rights@example.invalid','purpose','account')$$;
create function pg_temp.req(p text default 'privacy', k uuid default 'f1300000-0000-4000-8000-000000000010', urgent boolean default false) returns jsonb language sql as $$select jsonb_build_object('action','request','purpose',p,'urgent',urgent,'requestKey',k)$$;
create function pg_temp.submit(cmd jsonb default pg_temp.req()) returns jsonb language sql as $$select public.patient_support_command(pg_temp.pc(),cmd)$$;
select is(pg_temp.submit()->>'outcome','unavailable','no approved route fails closed');
select is(pg_temp.submit(pg_temp.req(urgent=>true))->>'outcome','emergency','urgent request is not an asynchronous case');
select is((select count(*) from identity_private.support_cases),0::bigint,'unavailable and urgent create no cases');
select throws_ok($$select pg_temp.submit(pg_temp.req()||'{"notes":"secret"}'::jsonb)$$,'42501','SUPPORT_REJECTED','free text rejected');
select throws_ok($$select pg_temp.submit(pg_temp.req()||'{"urgent":null}'::jsonb)$$,'42501','SUPPORT_REJECTED','null urgency denied');
select throws_ok($$select public.patient_support_command(pg_temp.pc()||'{"tenantId":"10000000-0000-4000-8000-000000000002"}'::jsonb,pg_temp.req())$$,'42501','PORTAL_REJECTED','wrong tenant denied');
select throws_ok($$select public.patient_support_command(pg_temp.pc()||'{"purpose":"marketing"}'::jsonb,pg_temp.req())$$,'42501','INTAKE_REJECTED','wrong patient purpose denied');
select ok(not has_function_privilege('anon','public.patient_support_command(jsonb,jsonb)','execute'),'anonymous command denied');
select ok(not has_function_privilege('authenticated','public.staff_support_command(jsonb,jsonb)','execute'),'browser staff command denied');
select ok(not has_table_privilege('service_role','identity_private.support_cases','select'),'direct server case access denied');
select ok(not has_function_privilege('service_role','identity_private.support_owner_live(identity_private.support_routes,uuid)','execute'),'private owner helper denied');
select is((select count(*) from pg_class where oid in('identity_private.support_routes'::regclass,'identity_private.support_cases'::regclass,'identity_private.support_responses'::regclass) and relrowsecurity and relforcerowsecurity),3::bigint,'all support tables force RLS');

create temporary table support_actors(n int,provider_id uuid,provider_session uuid,app_session uuid,subject_id uuid,role text);
grant select on support_actors to service_role;
do $$declare n int;u uuid;a uuid;sid uuid;sub uuid;rl text;begin
 for n in 1..6 loop
 u:=('f1310000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
 a:=('f1320000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
 sid:=('f1330000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
 rl:=case when n<=2 then 'auditor' when n<=4 then 'clinician' else 'operations' end;
 insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)values(u,'support-'||n||'@example.invalid',now(),false,false);
 select subject_id into sub from public.external_identities where provider='supabase' and provider_subject=u::text;
 insert into support_actors values(n,u,a,sid,sub,rl);
 insert into auth.sessions(id,user_id,created_at,updated_at,aal)values(a,u,now(),now(),'aal2');
 insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 values('10000000-0000-4000-8000-000000000001',sub,rl,'active',now()-interval '1 hour',now()+interval '2 days','20000000-0000-4000-8000-000000000003');
 insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
 values(sid,sub,a,'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours');
 end loop;
end$$;
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','admin','active',now()-interval '1 day',now()+interval '2 days','20000000-0000-4000-8000-000000000001');
update public.tenant_memberships set valid_from=now()-interval '1 day',expires_at=now()+interval '2 days'
where subject_id='20000000-0000-4000-8000-000000000003' and role='admin';
create function pg_temp.sc(n int) returns jsonb language sql as $$select jsonb_build_object('tenantId','10000000-0000-4000-8000-000000000001','subjectId',a.subject_id,'sessionId',a.app_session,'providerSubject',a.provider_id,'providerSessionId',a.provider_session,'verifiedEmail','support-'||n||'@example.invalid','purpose',case a.role when 'auditor' then 'privacy_review' when 'clinician' then 'care_delivery' else 'operations' end) from support_actors a where a.n=sc.n$$;
insert into identity_private.support_routes(id,tenant_id,purpose,primary_subject_id,alternate_subject_id,starts_at,expires_at,
roster_reference,mailbox_control_reference,receipt_reference,absence_reference,failure_reference,approved_by_subject_id,approval_reference,clinical_authority_reference,after_hours_reference,acknowledgement_minutes)
select ('f1340000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001',
case n when 1 then 'privacy' when 3 then 'clinical' else 'complaint' end,
subject_id,(select subject_id from support_actors x where x.n=a.n+1),now()-interval '1 hour',now()+interval '1 day',
gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',
gen_random_uuid(),case when n=3 then gen_random_uuid() end,case when n=3 then gen_random_uuid() end,case when n=3 then 5 else 1440 end
from support_actors a where n in(1,3,5);
select is((pg_temp.submit('{"action":"read"}')->'routes'->0->>'available')::boolean,true,'privacy route verified and available');
select is((pg_temp.submit('{"action":"read"}')->'routes'->2->>'available')::boolean,true,'clinical requires separate authority and after-hours references');
create temporary table request_reference as select (pg_temp.submit()->>'reference')::uuid id;
grant select on request_reference to service_role;
select is((select count(*) from identity_private.support_cases),1::bigint,'one case committed');
select is((select count(*) from audit_private.transactional_notifications where source_kind='support'),1::bigint,'receipt intent atomic with case');
select is(pg_temp.submit()->>'reference',(select id::text from request_reference),'retry returns exact case');
select is((select count(*) from identity_private.support_cases),1::bigint,'replay creates no duplicate');
select throws_ok($$select pg_temp.submit(pg_temp.req('complaint'))$$,'40001','SUPPORT_CONFLICT','changed replay rejected');
select is(pg_temp.submit('{"action":"read"}')->'requests'->0->>'state','received','recorded is not human acknowledgement');
create function pg_temp.respond(n int default 1,act text default 'acknowledged',k uuid default 'f1350000-0000-4000-8000-000000000001') returns jsonb language sql as $$select public.staff_support_command(pg_temp.sc(n),jsonb_build_object('action',act,'reference',(select id from request_reference),'requestKey',k))$$;
select throws_ok($$select pg_temp.respond(3)$$,'42501','SUPPORT_REJECTED','clinical owner cannot acknowledge privacy');
select throws_ok($$select pg_temp.respond(5)$$,'42501','SUPPORT_REJECTED','operations cannot acknowledge privacy');
select throws_ok($$select pg_temp.respond(act=>'resolved')$$,'40001','SUPPORT_CONFLICT','resolution requires acknowledgement first');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1' where id=(select provider_session from support_actors where n=1);perform pg_temp.respond();end$$$test$,'42501','WORKFORCE_REJECTED','provider AAL1 denied');
select throws_ok($test$do $$begin update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from support_actors where n=1);perform pg_temp.respond();end$$$test$,'42501','WORKFORCE_REJECTED','revoked owner denied');
set local role service_role;
select lives_ok($$select pg_temp.respond()$$,'current privacy owner AAL2 acknowledgement succeeds');
reset role;
select is((select count(*) from identity_private.support_responses),1::bigint,'one immutable response');
select is(pg_temp.submit('{"action":"read"}')->'requests'->0->>'state','acknowledged','human acknowledgement separately shown');
select lives_ok($$select pg_temp.respond()$$,'identical acknowledgement replay succeeds');
select is((select count(*) from identity_private.support_responses),1::bigint,'response replay no duplicate');
select lives_ok($$select pg_temp.respond(act=>'resolved',k=>'f1350000-0000-4000-8000-000000000002')$$,'resolution follows acknowledgement');
select is(pg_temp.submit('{"action":"read"}')->'requests'->0->>'state','resolved','resolution is independently recorded');
select is((select count(*) from audit_private.transactional_notifications where source_kind='support'),3::bigint,'each distinct case outcome journals one generic notice');
select throws_ok($$update identity_private.support_responses set action='resolved'$$,'55000','APPEND_ONLY_RECORD','response cannot be rewritten');
select throws_ok($$delete from identity_private.support_cases$$,'55000','APPEND_ONLY_RECORD','case cannot be erased');

-- Separate clinical case with synthetic overdue source timestamp, never a real deadline decision.
create temporary table clinical_reference as select (pg_temp.submit(pg_temp.req('clinical',gen_random_uuid()))->>'reference')::uuid id;
alter table identity_private.support_cases disable trigger support_cases_immutable;
update identity_private.support_cases set recorded_at=now()-interval '6 minutes' where id=(select id from clinical_reference);
alter table identity_private.support_cases enable trigger support_cases_immutable;
select is((select identity_private.support_case_state(c) from identity_private.support_cases c where id=(select id from clinical_reference)),'escalated','missed clinical acknowledgement uses approved deadline');
select throws_ok($$select public.staff_support_command(pg_temp.sc(3),jsonb_build_object('action','acknowledged','reference',(select id from clinical_reference),'requestKey',gen_random_uuid()))$$,'42501','SUPPORT_REJECTED','late primary cannot override alternate escalation');
select lives_ok($$select public.staff_support_command(pg_temp.sc(4),jsonb_build_object('action','acknowledged','reference',(select id from clinical_reference),'requestKey',gen_random_uuid()))$$,'verified alternate clinician handles escalation');
select is(jsonb_array_length(public.staff_support_command(pg_temp.sc(5),'{"action":"read"}')),0,'operations sees no clinical or privacy cases');
select throws_ok($test$do $$begin update identity_private.support_routes set purpose='complaint' where purpose='clinical';end$$$test$,'55000','SUPPORT_ROUTE_IMMUTABLE','route purpose cannot change in place');
select lives_ok($$update identity_private.support_routes set revoked_at=now() where purpose='clinical'$$,'explicit route withdrawal allowed');
select is(pg_temp.submit(pg_temp.req('clinical',gen_random_uuid()))->>'outcome','unavailable','withdrawn route cannot accept');
select throws_ok($test$do $$begin update public.tenants set status='suspended' where id='10000000-0000-4000-8000-000000000001';perform pg_temp.submit();end$$$test$,'42501','PORTAL_REJECTED','suspended pilot denied');
select throws_ok($test$do $$begin update auth.sessions set not_after=now()-interval '1 second' where id='98000000-0000-4000-8000-000000000002';perform pg_temp.submit();end$$$test$,'42501','PORTAL_REJECTED','provider expiry denied');
select throws_ok($test$do $$begin update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from support_actors where n=2);perform public.staff_support_command(pg_temp.sc(2),'{}');end$$$test$,'42501','WORKFORCE_REJECTED','alternate revocation denied');
select throws_ok($test$do $$begin update identity_private.support_routes set expires_at=now()-interval '1 minute' where purpose='privacy';end$$$test$,'55000','SUPPORT_ROUTE_IMMUTABLE','coverage version cannot be shortened silently');
select throws_ok($test$do $$begin
 insert into identity_private.support_routes select (jsonb_populate_record(null::identity_private.support_routes,to_jsonb(r)||jsonb_build_object('id',gen_random_uuid(),'clinical_authority_reference',null))).* from identity_private.support_routes r where purpose='clinical';
 end$$$test$,'23514',null,'clinical route requires separate authority evidence');
savepoint source_rollback;
select is(pg_temp.submit(pg_temp.req('complaint',gen_random_uuid()))->>'outcome','received','complaint route records secure request');
rollback to source_rollback;
select is((select count(*) from identity_private.support_cases where purpose='complaint'),0::bigint,'case rollback restores baseline');
select is((select count(*) from audit_private.transactional_notifications n join identity_private.support_cases c on c.id=n.source_id where c.purpose='complaint'),0::bigint,'receipt rolls back atomically');
select finish();
rollback;
