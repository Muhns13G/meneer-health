begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select ok(pg_get_functiondef(p.oid) not like '%40001%',
 p.oid::regprocedure::text||' has no permanent serialization raises')
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where (n.nspname,p.proname) in (
 ('public','approve_portal_handoff_destination'),('public','command_operations_handoff'),
 ('commerce_private','prepare_offer'),('commerce_private','reserve_refund'),
 ('public','execute_patient_account_command'),('public','finish_medical_safety_notification'),
 ('public','finish_operations_alert_notification'),('public','issue_patient_handoff_link'),
 ('public','patient_attach_checkout'),('public','patient_intake_restrict'),
 ('public','patient_order_review'),('public','patient_prepare_checkout'),
 ('public','read_medical_intake'),('public','reconcile_medical_provider_disposition'),
 ('public','respond_medical_safety'),('public','respond_operations_alert'),
 ('public','service_refund_command'),('public','staff_refund_command_before_completion'),
 ('public','staff_refund_command_before_reconciliation'),('public','staff_refund_command'),
 ('public','verify_operations_handoff_evidence'));
select ok(not has_function_privilege('anon',p.oid,'execute')
 and not has_function_privilege('authenticated',p.oid,'execute'),
 p.oid::regprocedure::text||' remains unavailable to browser roles')
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in(
 'patient_intake_restrict','respond_medical_safety','execute_patient_account_command',
 'patient_prepare_checkout','patient_order_review','staff_refund_command');
select ok(not has_function_privilege('service_role',
 'public.staff_refund_command_before_reconciliation(jsonb,jsonb)','execute'),
 'retired inner refund primitive remains inaccessible to service role');
select ok(not has_function_privilege('service_role',
 'public.staff_refund_command_before_completion(jsonb,jsonb)','execute'),
 'retired completion primitive remains inaccessible to service role');
select throws_ok($test$do $$begin raise exception using errcode='40001',
 message='SYNTHETIC_SERIALIZATION';end$$;$test$,'40001','SYNTHETIC_SERIALIZATION',
 'genuine serialization errors are not globally rewritten');
select * from finish();
rollback;
