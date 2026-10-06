-- Stripe's actual zero-total Checkout can report paid with no PaymentIntent.
-- Classify only exact zero totals without a PaymentIntent as no additional payment.
-- Preserve every other readiness, correlation, amount and ACL boundary of the current reconciler.
-- Guarded body substitution avoids replacing unrelated reconciliation changes or restoring ACLs.
do $migration$
declare
  definition text;
  previous_free constant text := $old$free:=r.payment_status='no_payment_required' and (i.payload->>'amountTotalMinor')::integer=0 and r.payment_intent_id is null;$old$;
  previous_paid_guard constant text := $old$(r.payment_status='paid' and not paid)$old$;
begin
  select pg_get_functiondef('commerce_private.reconcile_receipt(text,text)'::regprocedure)
    into definition;
  if (length(definition)-length(replace(definition,previous_free,''))) / length(previous_free) <> 1
    or (length(definition)-length(replace(definition,previous_paid_guard,''))) / length(previous_paid_guard) <> 1 then
    raise exception 'ZERO_CHECKOUT_RECONCILER_BASELINE_CHANGED';
  end if;
  definition := replace(definition,previous_free,
    $new$free:=r.payment_status in ('paid','no_payment_required') and (i.payload->>'amountTotalMinor')::integer=0 and r.payment_intent_id is null;$new$);
  definition := replace(definition,previous_paid_guard,
    $new$(r.payment_status='paid' and not paid and not free)$new$);
  execute definition;
  -- CREATE OR REPLACE preserves grants; assert the existing inner-function denial stays intact.
  if has_function_privilege('service_role','commerce_private.reconcile_receipt(text,text)','execute')
    or has_function_privilege('authenticated','commerce_private.reconcile_receipt(text,text)','execute')
    or has_function_privilege('anon','commerce_private.reconcile_receipt(text,text)','execute') then
    raise exception 'ZERO_CHECKOUT_RECONCILER_ACL_CHANGED';
  end if;
end
$migration$;
