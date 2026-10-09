begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
 values('ac430000-0000-4000-8000-000000000001','context-selection@example.invalid',now(),false,false);
create temporary table selected_subject as select subject_id from public.external_identities
 where provider='supabase' and provider_subject='ac430000-0000-4000-8000-000000000001';
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 values('ac430000-0000-4000-8000-000000000002','ac430000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000001',subject_id,r,'active',now()-interval '1 minute',now()+interval '1 hour',
 '20000000-0000-4000-8000-000000000003' from selected_subject cross join unnest(array['operations','auditor']) r;
create function pg_temp.contexts() returns jsonb language sql as $$
 select public.list_workforce_contexts('ac430000-0000-4000-8000-000000000001',
 'ac430000-0000-4000-8000-000000000002','context-selection@example.invalid') $$;
create function pg_temp.choose(r text default 'auditor',t uuid default '10000000-0000-4000-8000-000000000001')
 returns jsonb language sql as $$ select public.select_workforce_context(
 'ac430000-0000-4000-8000-000000000001','ac430000-0000-4000-8000-000000000002',
 'context-selection@example.invalid',t,r) $$;
create function pg_temp.context(s uuid default null) returns jsonb language sql as $$
 select public.resolve_workforce_context('ac430000-0000-4000-8000-000000000001',
 'ac430000-0000-4000-8000-000000000002','context-selection@example.invalid',s) $$;
select is(jsonb_array_length(pg_temp.contexts()),2,'preflight lists independently reviewed contexts only');
select throws_ok($$select pg_temp.context()$$,'42501','WORKFORCE_REJECTED','no implicit multi-role authority');
select throws_ok($$select pg_temp.choose()$$,'42501','WORKFORCE_REJECTED','email-only cannot select');
update auth.sessions set aal='aal2' where id='ac430000-0000-4000-8000-000000000002';
select throws_ok($$select pg_temp.choose()$$,'42501','WORKFORCE_REJECTED','AAL2 flag alone is not recent TOTP');
insert into auth.mfa_amr_claims(session_id,authentication_method,id,created_at,updated_at)
 values('ac430000-0000-4000-8000-000000000002','totp',gen_random_uuid(),now(),now());
select throws_ok($$select pg_temp.choose('admin')$$,'42501','WORKFORCE_REJECTED','ungranted admin rejected');
select throws_ok($$select pg_temp.choose(t=>'10000000-0000-4000-8000-000000000002')$$,'42501','WORKFORCE_REJECTED','wrong tenant rejected');
select throws_ok($test$do $$begin update auth.mfa_amr_claims set updated_at=now()-interval '6 minutes'
 where session_id='ac430000-0000-4000-8000-000000000002';perform pg_temp.choose();end$$$test$,
 '42501','WORKFORCE_REJECTED','old TOTP cannot select');
select throws_ok($test$do $$begin update public.tenant_memberships set approved_by_subject_id=subject_id
 where subject_id=(select subject_id from selected_subject) and role='auditor';perform pg_temp.choose();end$$$test$,
 '23514',null,'native membership constraint rejects self-approved role');
select is(pg_temp.choose()->>'purpose','privacy_review','purpose derives from selected native auditor membership');
select is(pg_temp.context()->>'role','auditor','selected role resolves despite multiple memberships');
select throws_ok($$select pg_temp.choose('operations')$$,'42501','WORKFORCE_REJECTED','one provider session cannot be rebound');
select throws_ok($$delete from identity_private.workforce_context_selections$$,'55000','APPEND_ONLY_RECORD','selection journal cannot be deleted');
select throws_ok($$update identity_private.workforce_context_selections set role='admin'$$,'55000','APPEND_ONLY_RECORD','selection cannot be rewritten');
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
 select 'ac430000-0000-4000-8000-000000000003',subject_id,'ac430000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from selected_subject;
select is(pg_temp.context('ac430000-0000-4000-8000-000000000003')->>'role','auditor','exact active session resolves selected role');
select throws_ok($$select pg_temp.context('ac430000-0000-4000-8000-000000000099')$$,'42501','WORKFORCE_REJECTED','wrong application session rejected');
select throws_ok($test$do $$begin update public.tenant_memberships set status='revoked'
 where subject_id=(select subject_id from selected_subject) and role='auditor';
 perform pg_temp.context('ac430000-0000-4000-8000-000000000003');end$$$test$,
 '42501','WORKFORCE_REJECTED','selected role revocation does not silently fall back to operations');
select throws_ok($test$do $$begin update public.tenant_memberships set expires_at=now()-interval '1 second'
 where subject_id=(select subject_id from selected_subject) and role='auditor';
 perform pg_temp.context('ac430000-0000-4000-8000-000000000003');end$$$test$,
 '42501','WORKFORCE_REJECTED','selected role expiry rejected');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1' where id='ac430000-0000-4000-8000-000000000002';
 perform pg_temp.context('ac430000-0000-4000-8000-000000000003');end$$$test$,
 '42501','WORKFORCE_REJECTED','provider downgrade cannot reuse AAL2 application session');
select throws_ok($test$do $$begin update public.identity_sessions set status='revoked',revoked_at=now(),revocation_reason='synthetic'
 where id='ac430000-0000-4000-8000-000000000003';perform pg_temp.context();end$$$test$,
 '42501','WORKFORCE_REJECTED','revoked application context cannot rebootstrap');
select throws_ok($test$do $$begin delete from auth.sessions where id='ac430000-0000-4000-8000-000000000002';
 perform pg_temp.context('ac430000-0000-4000-8000-000000000003');end$$$test$,
 '42501','WORKFORCE_REJECTED','provider revocation rejected');
select ok(not has_table_privilege(r,'identity_private.workforce_context_selections',p),r||' cannot directly '||p||' context journal')
 from unnest(array['anon','authenticated','service_role']) r cross join unnest(array['select','insert','update','delete']) p;
select ok(not has_function_privilege(r,f,'execute'),r||' cannot execute '||f)
 from unnest(array['anon','authenticated']) r cross join unnest(array[
 'public.list_workforce_contexts(uuid,uuid,text)',
 'public.select_workforce_context(uuid,uuid,text,uuid,text)']) f;
select ok(not has_function_privilege('service_role','public.resolve_workforce_context_before_selection(uuid,uuid,text,uuid,uuid,uuid)','execute'),'retired resolver inaccessible');
select * from finish();
rollback;
