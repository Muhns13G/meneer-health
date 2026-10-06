begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temporary table zero_supply_baseline as select count(*) n from public.fulfilment_cases;

-- Rollback-only normalized synthetic receipts. Actual provider proof belongs to the hosted packet.
create temporary table zero_variants as
select n, status, total, payment_intent, currency, receipt_amount, expected_free,
 gen_random_uuid() case_id,gen_random_uuid() offer_id,gen_random_uuid() acceptance_id,
 gen_random_uuid() intent_id,gen_random_uuid() publication_id
from (values
 (1,'paid',0,null::text,'zar',0,true),
 (2,'no_payment_required',0,null,'zar',0,true),
 (3,'unpaid',0,null,'zar',0,false),
 (4,'paid',0,'pi_syntheticzero4','zar',0,false),
 (5,'no_payment_required',0,'pi_syntheticzero5','zar',0,false),
 (6,'paid',100,null,'zar',100,false),
 (7,'no_payment_required',100,null,'zar',100,false),
 (8,'paid',0,null,'usd',0,false),
 (9,'paid',0,null,'zar',1,false)
) v(n,status,total,payment_intent,currency,receipt_amount,expected_free);

insert into public.operations_cases(id,tenant_id,subject_id)
select case_id,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001' from zero_variants;
insert into commerce_private.offers(id,tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
select offer_id,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',case_id,gen_random_uuid(),'{}',
 jsonb_build_object('scenario','approved_product_order','amountTotalMinor',total),now()+interval '1 hour' from zero_variants;
insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
select publication_id,'10000000-0000-4000-8000-000000000001','approved_product_order','1.0.0','Synthetic supplier','Synthetic zero terms',repeat('a',64),gen_random_uuid(),now()-interval '1 hour',now()+interval '1 hour','published' from zero_variants;
insert into commerce_private.order_acceptances(id,offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,assurance)
select acceptance_id,offer_id,publication_id,'20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),gen_random_uuid(),'aal1' from zero_variants;
insert into commerce_private.checkout_intents(id,offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,request_key,payload,creation_deadline,provider_expires_epoch,state,session_id,checkout_url)
select intent_id,offer_id,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',acceptance_id,'acct_syntheticzero',gen_random_uuid(),
 jsonb_build_object('scenario','approved_product_order','amountTotalMinor',total),now()+interval '15 minutes',extract(epoch from now()+interval '1 hour')::bigint,'open','cs_test_syntheticzero'||n,'https://checkout.stripe.com/c/pay/synthetic' from zero_variants;
insert into commerce_private.provider_receipts(account_id,event_id,fingerprint,event_type,intent_reference,metadata_tenant,session_id,payment_intent_id,amount_minor,currency,payment_status,occurred_at,service_id,tenant_boundary)
select 'acct_syntheticzero','evt_syntheticzero'||n,repeat('c',64),'checkout.session.completed',intent_id,'10000000-0000-4000-8000-000000000001','cs_test_syntheticzero'||n,payment_intent,receipt_amount,currency,status,now(),'80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001' from zero_variants;

do $$declare v record;begin
 for v in select n from zero_variants loop
  perform commerce_private.reconcile_receipt('acct_syntheticzero','evt_syntheticzero'||v.n);
 end loop;
end $$;
select is(s.no_additional_payment,v.expected_free,'zero classification variant '||v.n)
 from zero_variants v join commerce_private.settlements s on s.intent_id=v.intent_id order by v.n;
select ok((select bool_and(not paid_confirmed) from commerce_private.settlements s join zero_variants v on v.intent_id=s.intent_id),'zero status never invents a captured payment');
select ok((select bool_and(reconciliation_required) from commerce_private.settlements s join zero_variants v on v.intent_id=s.intent_id where v.n<>3),'missing readiness and invalid bindings remain held');
select is((select count(*) from public.fulfilment_cases),(select n from zero_supply_baseline),'zero classification never creates supply');
select ok(not has_function_privilege('service_role','commerce_private.reconcile_receipt(text,text)','execute'),'service role cannot call private reconciler');
select ok(not has_function_privilege('authenticated','commerce_private.reconcile_receipt(text,text)','execute'),'browser cannot call private reconciler');
select ok(not has_function_privilege('anon','commerce_private.reconcile_receipt(text,text)','execute'),'anonymous cannot call private reconciler');
select * from finish();
rollback;
