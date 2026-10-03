begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values ('a2000000-0000-4000-8000-000000000001','workforce@example.invalid',now(),false,false),
 ('a2000000-0000-4000-8000-000000000002','target-workforce@example.invalid',now(),false,false);
create temporary table workforce_context as select subject_id from public.external_identities
 where provider='supabase' and provider_subject='a2000000-0000-4000-8000-000000000001';
create temporary table target_context as select subject_id from public.external_identities
 where provider='supabase' and provider_subject='a2000000-0000-4000-8000-000000000002';
grant select on workforce_context,target_context to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('a2000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001'::uuid,subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003'::uuid from workforce_context union all
select '10000000-0000-4000-8000-000000000001'::uuid,subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003'::uuid from target_context;
create function pg_temp.workforce(app_session uuid default null,tenant uuid default null,subject uuid default null) returns jsonb language sql as $$
 select public.resolve_workforce_context('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000003',
 'workforce@example.invalid',app_session,subject,tenant);
$$;
select ok(not has_function_privilege('anon','public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid)','execute'),'no anonymous context RPC');
select ok(not has_function_privilege('authenticated','public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid)','execute'),'no browser context RPC');
select ok(has_function_privilege('service_role','public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid)','execute'),'server only context RPC');
select ok(not has_table_privilege(role_name,'public.workforce_invitation_dispatches',privilege_name),role_name||' dispatch '||privilege_name||' denied')
from unnest(array['anon','authenticated','service_role']) role_name cross join unnest(array['select','insert','update','delete']) privilege_name;
set local role service_role;
select is(pg_temp.workforce()->>'role','operations','reviewed AAL1 preflight derives operations role');
select is(pg_temp.workforce()->>'purpose','operations','purpose derives from role, not input');
select is((select count(*) from jsonb_object_keys(pg_temp.workforce())),4::bigint,'context has only four fields');
reset role;
select throws_ok($$select pg_temp.workforce(tenant=>'10000000-0000-4000-8000-000000000002')$$,'42501','WORKFORCE_REJECTED','wrong tenant denied');
select throws_ok($$select pg_temp.workforce(subject=>'20000000-0000-4000-8000-000000000001')$$,'42501','WORKFORCE_REJECTED','wrong subject denied');
select throws_ok($$select public.resolve_workforce_context('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000003','forged@example.invalid')$$,'42501','WORKFORCE_REJECTED','wrong verified email denied');
select throws_ok($test$do $$begin
 update public.tenant_memberships set status='revoked' where subject_id=(select subject_id from workforce_context);
 perform pg_temp.workforce(); end$$$test$,'42501','WORKFORCE_REJECTED','revoked membership denied');
select throws_ok($test$do $$begin
 update public.tenants set status='suspended' where id='10000000-0000-4000-8000-000000000001';
 perform pg_temp.workforce(); end$$$test$,'42501','WORKFORCE_REJECTED','suspended tenant denied');
select throws_ok($test$do $$begin
 update public.tenant_memberships set expires_at=now()-interval '1 second' where subject_id=(select subject_id from workforce_context);
 perform pg_temp.workforce(); end$$$test$,'42501','WORKFORCE_REJECTED','expired review denied');
select throws_ok($test$do $$begin
 insert into public.tenant_memberships(tenant_id,subject_id,role,status,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000002',subject_id,'support','active',now()+interval '1 hour','20000000-0000-4000-8000-000000000003' from workforce_context;
 perform pg_temp.workforce(); end$$$test$,'42501','WORKFORCE_REJECTED','ambiguous multi-role or multi-tenant context denied');
select throws_ok($test$do $$begin delete from auth.sessions where id='a2000000-0000-4000-8000-000000000003'; perform pg_temp.workforce(); end$$$test$,'42501','WORKFORCE_REJECTED','provider revocation denied independently');
update auth.sessions set aal='aal2' where id='a2000000-0000-4000-8000-000000000003';
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select 'a2000000-0000-4000-8000-000000000004',subject_id,'a2000000-0000-4000-8000-000000000003','workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from workforce_context;
select is(pg_temp.workforce('a2000000-0000-4000-8000-000000000004')->>'role','operations','live AAL2 and application session accepted');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1' where id='a2000000-0000-4000-8000-000000000003'; perform pg_temp.workforce('a2000000-0000-4000-8000-000000000004'); end$$$test$,'42501','WORKFORCE_REJECTED','provider AAL1 cannot reuse app AAL2');
select throws_ok($test$do $$begin update public.identity_sessions set status='revoked',revoked_at=now(),revocation_reason='synthetic' where id='a2000000-0000-4000-8000-000000000004'; perform pg_temp.workforce(); end$$$test$,'42501','WORKFORCE_REJECTED','revoked app session cannot rebootstrap MFA');
select throws_ok($test$do $$begin update public.identity_sessions set issued_at=now()-interval '17 minutes',last_seen_at=now()-interval '16 minutes',idle_expires_at=now()-interval '1 minute',absolute_expires_at=now()+interval '7 hours' where id='a2000000-0000-4000-8000-000000000004'; perform pg_temp.workforce('a2000000-0000-4000-8000-000000000004'); end$$$test$,'42501','WORKFORCE_REJECTED','idle expiry denied');
update public.tenant_memberships set role='admin' where subject_id=(select subject_id from workforce_context);
select throws_ok($$select pg_temp.workforce('a2000000-0000-4000-8000-000000000004')$$,'42501','WORKFORCE_REJECTED','ordinary session cannot elevate with role change');
update public.identity_sessions set session_class='privileged',idle_expires_at=now()+interval '10 minutes',absolute_expires_at=now()+interval '4 hours' where id='a2000000-0000-4000-8000-000000000004';
insert into auth.mfa_amr_claims(session_id,authentication_method,id,created_at,updated_at)
values('a2000000-0000-4000-8000-000000000003','totp',gen_random_uuid(),now(),now());
insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,valid_from,expires_at)
select '10000000-0000-4000-8000-000000000001',w.subject_id,'identity_contact',t.subject_id,'security_administration',now(),now()+interval '1 hour' from workforce_context w cross join target_context t;
create function pg_temp.invite(email text default 'target-workforce@example.invalid',request_key uuid default 'a2000000-0000-4000-8000-000000000005') returns uuid language sql as $$
 select public.reserve_workforce_invitation('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000003','workforce@example.invalid',
 'a2000000-0000-4000-8000-000000000004',(select subject_id from workforce_context),'10000000-0000-4000-8000-000000000001',email,request_key);
$$;
select throws_ok($test$do $$begin update auth.mfa_amr_claims set updated_at=now()-interval '6 minutes'; perform pg_temp.invite(); end$$$test$,'42501','WORKFORCE_REJECTED','invitation requires recent MFA, not JWT issue time');
select throws_ok($$select pg_temp.invite('workforce@example.invalid')$$,'42501','WORKFORCE_REJECTED','self invitation denied');
select throws_ok($test$do $$begin update public.access_assignments set status='revoked' where purpose='security_administration'; perform pg_temp.invite(); end$$$test$,'42501','WORKFORCE_REJECTED','unassigned admin cannot invite');
set local role service_role;
select lives_ok($$select pg_temp.invite()$$,'admin reserves independently reviewed and assigned target');
reset role;
select is((select status from public.workforce_invitation_dispatches),'prepared','provider delivery is not assumed from reservation');
select throws_ok($$delete from public.workforce_invitation_dispatches$$,'42501','WORKFORCE_DISPATCH_IMMUTABLE','dispatch cannot be deleted');
select throws_ok($$update public.workforce_invitation_dispatches set request_key=gen_random_uuid(),status='uncertain',finished_at=now()$$,'42501','WORKFORCE_DISPATCH_IMMUTABLE','dispatch payload cannot be rewritten');
select throws_ok($$select pg_temp.invite()$$,'42501','WORKFORCE_REJECTED','same key never reserves another send');
select throws_ok($$select pg_temp.invite(request_key=>gen_random_uuid())$$,'42501','WORKFORCE_REJECTED','parallel/new key cannot blindly resend unresolved work');
select throws_ok($$select public.finish_workforce_invitation((select id from public.workforce_invitation_dispatches),'a2000000-0000-4000-8000-000000000099')$$,'42501','WORKFORCE_REJECTED','wrong provider binding rejected');
select public.finish_workforce_invitation((select id from public.workforce_invitation_dispatches),null);
select is((select status from public.workforce_invitation_dispatches),'uncertain','ambiguous provider failure remains unresolved');
select throws_ok($$select public.finish_workforce_invitation((select id from public.workforce_invitation_dispatches),null)$$,'42501','WORKFORCE_REJECTED','finished record cannot be rewritten');
select is((select count(*) from public.tenant_memberships where subject_id=(select subject_id from target_context)),1::bigint,'invitation never creates or changes role membership');
select * from finish();
rollback;
