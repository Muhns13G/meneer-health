begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,is_sso_user,is_anonymous)
 values('ac440000-0000-4000-8000-000000000001','first-login@example.invalid',false,false);
create temporary table code_subject as select subject_id from public.external_identities
 where provider='supabase' and provider_subject='ac440000-0000-4000-8000-000000000001';
select throws_ok($$select public.resolve_workforce_code_target('first-login@example.invalid')$$,
 '42501','WORKFORCE_REJECTED','unreviewed identity receives nothing');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 minute',
 now()+interval '1 hour','20000000-0000-4000-8000-000000000003' from code_subject;
select is(public.resolve_workforce_code_target(' FIRST-LOGIN@example.invalid '),
 'ac440000-0000-4000-8000-000000000001'::uuid,'reviewed unconfirmed staff resolves without a session');
select throws_ok($$select public.resolve_workforce_code_target('unknown@example.invalid')$$,
 '42501','WORKFORCE_REJECTED','unknown address cannot create an account');
select throws_ok($test$do $$begin update public.tenant_memberships set status='revoked'
 where subject_id=(select subject_id from code_subject);
 perform public.resolve_workforce_code_target('first-login@example.invalid');end$$$test$,
 '42501','WORKFORCE_REJECTED','revoked membership rejected');
select throws_ok($test$do $$begin update public.tenant_memberships set expires_at=now()-interval '1 second'
 where subject_id=(select subject_id from code_subject);
 perform public.resolve_workforce_code_target('first-login@example.invalid');end$$$test$,
 '42501','WORKFORCE_REJECTED','expired membership rejected');
select throws_ok($test$do $$begin update public.tenants set status='suspended'
 where id='10000000-0000-4000-8000-000000000001';
 perform public.resolve_workforce_code_target('first-login@example.invalid');end$$$test$,
 '42501','WORKFORCE_REJECTED','suspended tenant rejected');
select throws_ok($test$do $$begin update public.subjects set status='suspended'
 where id=(select subject_id from code_subject);
 perform public.resolve_workforce_code_target('first-login@example.invalid');end$$$test$,
 '42501','WORKFORCE_REJECTED','suspended subject rejected');
select throws_ok($test$do $$begin update auth.users set banned_until=now()+interval '1 hour'
 where id='ac440000-0000-4000-8000-000000000001';
 perform public.resolve_workforce_code_target('first-login@example.invalid');end$$$test$,
 '42501','WORKFORCE_REJECTED','banned provider identity rejected');
select ok(not has_function_privilege(r,'public.resolve_workforce_code_target(text)','execute'),
 r||' cannot look up staff eligibility') from unnest(array['anon','authenticated']) r;
select ok(has_function_privilege('service_role','public.resolve_workforce_code_target(text)','execute'),
 'only server service role can resolve target');
select is((select count(*)::int from auth.sessions where user_id='ac440000-0000-4000-8000-000000000001'),
 0,'code target resolution creates no session');
select * from finish();
rollback;
