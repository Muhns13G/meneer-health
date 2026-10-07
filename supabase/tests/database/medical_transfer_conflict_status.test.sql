begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select is((length(d)-length(replace(d,'errcode=''PT409'',message=''MEDICAL_CONFLICT''','')))
 /length('errcode=''PT409'',message=''MEDICAL_CONFLICT'''), expected_count,
 signature||' has only permanent HTTP conflict raises')
from (values
 ('public.approve_medical_grant(jsonb,jsonb)',1),
 ('public.authorise_medical_transfer(jsonb,uuid,uuid,uuid,uuid)',1),
 ('public.record_medical_transfer(jsonb,jsonb)',2),
 ('public.reconcile_medical_transfer(jsonb,jsonb)',2)
) f(signature,expected_count)
cross join lateral (select pg_get_functiondef(signature::regprocedure) d) definition;
select ok(p.prosecdef and not has_function_privilege('anon',p.oid,'execute')
 and not has_function_privilege('authenticated',p.oid,'execute')
 and has_function_privilege('service_role',p.oid,'execute'),
 p.oid::regprocedure::text||' retains its restricted security-definer wrapper')
from pg_proc p where p.oid in(
 'public.approve_medical_grant(jsonb,jsonb)'::regprocedure,
 'public.authorise_medical_transfer(jsonb,uuid,uuid,uuid,uuid)'::regprocedure,
 'public.record_medical_transfer(jsonb,jsonb)'::regprocedure,
 'public.reconcile_medical_transfer(jsonb,jsonb)'::regprocedure);
select * from finish();
rollback;
