-- TD-064: named permanent conflicts must not be treated as transaction serialization failures.
-- Reviewed against the fully migrated local database; no data, authority or ACL changes.
begin;
do $$
declare
 target record; function_id oid; definition text; original record;
 marker constant text := 'errcode=''40001''';
begin
 for target in select * from (values
 ('public.approve_portal_handoff_destination(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,text,uuid,uuid)',2),
 ('public.command_operations_handoff(uuid,uuid,text,uuid,uuid,uuid,jsonb)',12),
 ('commerce_private.prepare_offer(uuid,uuid,uuid,jsonb)',3),
 ('commerce_private.reserve_refund(uuid,uuid,integer)',2),
 ('public.execute_patient_account_command(uuid,uuid,uuid,uuid,uuid,text,text,jsonb)',3),
 ('public.finish_medical_safety_notification(uuid,uuid,text)',2),
 ('public.finish_operations_alert_notification(uuid,uuid,uuid,text)',3),
 ('public.issue_patient_handoff_link(uuid,uuid,uuid,uuid,uuid,text,uuid,integer,text,uuid)',2),
 ('public.patient_attach_checkout(jsonb,uuid,text,text)',1),
 ('public.patient_intake_restrict(jsonb,uuid,integer,uuid)',2),
 ('public.patient_order_review(jsonb,jsonb)',3),
 ('public.patient_prepare_checkout(jsonb,uuid,uuid,text)',3),
 ('public.read_medical_intake(jsonb,uuid,text)',1),
 ('public.reconcile_medical_provider_disposition(jsonb,jsonb)',1),
 ('public.respond_medical_safety(jsonb,jsonb)',4),
 ('public.respond_operations_alert(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid)',1),
 ('public.service_refund_command(uuid,uuid,text,jsonb)',1),
 ('public.staff_refund_command_before_completion(jsonb,jsonb)',1),
 ('public.staff_refund_command_before_reconciliation(jsonb,jsonb)',9),
 ('public.staff_refund_command(jsonb,jsonb)',7),
 ('public.verify_operations_handoff_evidence(uuid,uuid,text,uuid,uuid,uuid,jsonb)',1)
 ) f(signature,expected_count) loop
  function_id:=target.signature::regprocedure::oid;
  select p.proacl,p.proowner,p.proconfig,p.prosecdef,p.provolatile into original
   from pg_proc p where p.oid=function_id;
  definition:=pg_get_functiondef(function_id);
  if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>target.expected_count
   or (select count(*) from regexp_matches(definition,
    'errcode=''40001'',message=''(ACCOUNT_COMMAND_CONFLICT|HANDOFF_CONFLICT|QUEUE_CONFLICT|COMMERCE_CONFLICT|COMMERCE_RECONCILIATION_REQUIRED|COMMERCE_CREDIT_RESERVED|REFUND_ALLOCATION_CONFLICT|REFUND_CONFLICT|REFUND_RECONCILIATION_REQUIRED|RECONCILIATION_OBSERVATION_STALE|INTAKE_CONFLICT|MEDICAL_CONFLICT|ALERT_CONFLICT)''','g'))<>target.expected_count then
   raise exception 'REMAINING_CONFLICT_DEFINITION_UNEXPECTED';
  end if;
  execute replace(definition,marker,'errcode=''PT409''');
  if exists(select 1 from pg_proc p where p.oid=function_id and
   (p.proacl is distinct from original.proacl or p.proowner<>original.proowner or
    p.proconfig is distinct from original.proconfig or p.prosecdef<>original.prosecdef or
    p.provolatile<>original.provolatile)) then
   raise exception 'REMAINING_CONFLICT_SECURITY_METADATA_CHANGED';
  end if;
 end loop;
end $$;
commit;
