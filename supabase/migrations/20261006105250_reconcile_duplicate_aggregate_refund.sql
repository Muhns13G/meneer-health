-- A fully confirmed original-method duplicate refund may also emit charge.refunded.
-- Resolve only its exact aggregate lineage; never mutate retained-payment refund totals.
do $migration$
declare
 definition text;
 previous constant text := $old$or (p.event_type like 'refund.%' and exists(select 1 from commerce_private.refund_provider_facts rf$old$;
begin
 select pg_get_functiondef('commerce_private.reconcile_exception_outcomes(uuid)'::regprocedure)
 into definition;
 if (length(definition)-length(replace(definition,previous,'')))/length(previous)<>1 then
  raise exception 'DUPLICATE_AGGREGATE_RECONCILER_BASELINE_CHANGED';
 end if;
 definition:=replace(definition,previous,
 $new$or (p.event_type='charge.refunded' and e.reason='BINDING_MISMATCH'
  and p.intent_reference=d.intent_id and p.metadata_tenant=ci.tenant_id
  and p.amount_minor=d.amount_minor and p.refund_minor=d.amount_minor and p.currency='zar')
 or (p.event_type like 'refund.%' and exists(select 1 from commerce_private.refund_provider_facts rf$new$);
 execute definition;
 if has_function_privilege('service_role','commerce_private.reconcile_exception_outcomes(uuid)','execute')
  or has_function_privilege('authenticated','commerce_private.reconcile_exception_outcomes(uuid)','execute')
  or has_function_privilege('anon','commerce_private.reconcile_exception_outcomes(uuid)','execute') then
  raise exception 'DUPLICATE_AGGREGATE_RECONCILER_ACL_CHANGED';
 end if;
end
$migration$;
