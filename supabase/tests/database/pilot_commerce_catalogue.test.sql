begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select has_table('commerce_private','prices','private immutable catalogue exists');
select has_table('commerce_private','credit_reservations','private credit reservations exist');
select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='commerce_private' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity
 and c.relname in ('prices','delivery_quotes','deposit_funding','offers','credit_reservations','product_release_gates')),6,'original six commerce tables force RLS');
select ok(not has_schema_privilege('anon','commerce_private','USAGE'),'anonymous cannot access private commerce');
select ok(not has_table_privilege('service_role','commerce_private.prices','SELECT'),'service cannot browse catalogue directly');
select ok(not has_function_privilege('service_role','commerce_private.prepare_offer(uuid,uuid,uuid,jsonb)','EXECUTE'),'preparation not exposed before governed runtime');
select ok(not has_function_privilege('authenticated','commerce_private.calculate(bigint,bigint,boolean)','EXECUTE'),'no direct browser calculation execution');
select is(commerce_private.calculate(150000,10000,true)->>'amountTotalMinor','60100','R1500 + R100 less R999');
select is(commerce_private.calculate(80000,10000,true)->>'amountTotalMinor','10000','delivery not reduced by credit');
select is(commerce_private.calculate(80000,10000,true)->>'unusedDepositRefundMinor','19900','unused deposit refunded');
select is(commerce_private.calculate(99900,0,true)->>'amountTotalMinor','0','zero balance supported');
select is(commerce_private.calculate(80000,0,true)->>'unusedDepositRefundMinor','19900','zero balance retains unused refund');
select is(commerce_private.calculate(80000,10000,false)->>'creditMinor','0','subsequent order has no reused credit');
select throws_ok($$select commerce_private.calculate(-1,0,true)$$,'22023','COMMERCE_AMOUNT_INVALID','negative denied');
select throws_ok($$select commerce_private.calculate(100000000,100000000,true)$$,'22023','COMMERCE_AMOUNT_INVALID','overflow denied');
select throws_ok($$select commerce_private.calculate(null,0,true)$$,'22023','COMMERCE_AMOUNT_INVALID','null denied');

insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,tax_treatment,
 source_fingerprint,approval_reference,environment,effective_at,expires_at)
values ('a1100000-0000-4000-8000-000000000001','review_deposit','pilot-review-deposit-v1',
 'Synthetic review deposit',99900,'vat-inclusive-planning',repeat('a',64),gen_random_uuid(),
 'local-synthetic',now()-interval '1 day',now()+interval '1 day');
select throws_ok($$update commerce_private.prices set unit_amount_minor=100000$$,'42501','COMMERCE_IMMUTABLE','approved amount immutable');
select throws_ok($$delete from commerce_private.prices$$,'42501','COMMERCE_IMMUTABLE','approved history not deletable');
select lives_ok($$update commerce_private.prices set status='withdrawn' where id='a1100000-0000-4000-8000-000000000001'$$,'withdrawal keeps snapshot');
select throws_ok($$update commerce_private.prices set status='approved'$$,'42501','COMMERCE_IMMUTABLE','withdrawn version cannot reactivate');
select throws_ok($$insert into commerce_private.prices select gen_random_uuid(),kind,version,description,90000,
currency,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at,status
from commerce_private.prices$$,'23514',null,'deposit fixed at R999');
select throws_ok($$insert into commerce_private.prices select gen_random_uuid(),kind,version,description,99900,
currency,tax_treatment,source_fingerprint,approval_reference,'production',effective_at,expires_at,status
from commerce_private.prices$$,'23514',null,'synthetic catalogue cannot become production');

-- All fixtures are rollback-only. Existing local seed supplies patient/tenant membership only.
insert into public.operations_cases(id,tenant_id,subject_id)
 values('a1200000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001');
create function pg_temp.offer(command jsonb) returns jsonb language sql as $$
select commerce_private.prepare_offer('10000000-0000-4000-8000-000000000001',
'20000000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001',command)$$;
select throws_ok($$select pg_temp.offer('{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001","amountTotalMinor":1}')$$,
 '22023','COMMERCE_SELECTION_INVALID','browser amounts denied');
select throws_ok($$select pg_temp.offer('{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001"}')$$,
 '42501','COMMERCE_NOT_READY','missing submitted intake denied');

insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,
 privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,primary_responder,
 fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at,status)
values('a1400000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
'1.1.0','1.0.0',repeat('a',64),'Synthetic privacy','Synthetic review',gen_random_uuid(),
'20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',
'20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',300,gen_random_uuid(),
'Synthetic urgent','Synthetic fallback',now()-interval '1 day',now()+interval '1 day','published');
insert into intake_private.intakes(id,tenant_id,subject_id,case_id,publication_id,state,snapshot_id)
values('a1400000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',
'20000000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001',
'a1400000-0000-4000-8000-000000000001','submitted',gen_random_uuid());
update public.tenant_memberships set valid_from=now()-interval '1 day'
where tenant_id='10000000-0000-4000-8000-000000000001' and subject_id='20000000-0000-4000-8000-000000000001' and role='patient';
select is(pg_temp.offer('{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001"}')->>'amountTotalMinor','99900','server resolves exact approved deposit');
select is(pg_temp.offer('{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001"}')->>'replayed','true','exact replay returns immutable offer');
select throws_ok($$select pg_temp.offer('{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000002"}')$$,'42501','COMMERCE_NOT_READY','second deposit offer denied');
select throws_ok($$select pg_temp.offer('{"scenario":"approved_product_order","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001"}')$$,'PT409','COMMERCE_CONFLICT','changed replay denied');
select throws_ok($test$do $$begin update intake_private.intakes set safety_hold=true;
perform pg_temp.offer('{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001"}');end$$$test$,'42501','COMMERCE_NOT_READY','replay rechecks safety hold');
select throws_ok($test$select commerce_private.prepare_offer('10000000-0000-4000-8000-000000000002',
'20000000-0000-4000-8000-000000000001','a1200000-0000-4000-8000-000000000001',
'{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001"}')$test$,'42501','COMMERCE_NOT_READY','cross tenant denied');
select throws_ok($$update commerce_private.offers set snapshot='{}'$$,'55000','APPEND_ONLY_RECORD','offer snapshot immutable');

-- Explicit synthetic funding for preparation only: no provider event or paid-review proof.
insert into public.payment_orders(id,tenant_id,workflow_id,subject_id,scenario,environment,status,
 amount_total_minor,terms_version,price_version,request_id,idempotency_key,request_fingerprint,
 created_at,updated_at,paid_at) values ('a1500000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','consultation_only','local','paid',99900,
 'synthetic-only','synthetic-only','synthetic-commerce','synthetic-commerce',repeat('a',64),now(),now(),now());
insert into commerce_private.deposit_funding values('a1200000-0000-4000-8000-000000000001',
'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
'a1500000-0000-4000-8000-000000000001',gen_random_uuid(),99900,'available');
insert into commerce_private.delivery_quotes values('a1600000-0000-4000-8000-000000000001',
'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
'a1200000-0000-4000-8000-000000000001','synthetic-delivery-v1',10000,gen_random_uuid(),
now()-interval '1 day',now()+interval '1 day','approved');
create function pg_temp.product(key uuid default 'a1700000-0000-4000-8000-000000000001')
returns jsonb language sql as $$select jsonb_build_object('scenario','approved_product_order',
'items',jsonb_build_array(jsonb_build_object('priceId','a1100000-0000-4000-8000-000000000013','quantity',1)),
'deliveryQuoteId','a1600000-0000-4000-8000-000000000001','requestKey',key)$$;
select throws_ok($$select pg_temp.offer(pg_temp.product())$$,'42501','COMMERCE_NOT_READY','missing clinical/custody release denied');
insert into commerce_private.product_release_gates(case_id,tenant_id,subject_id,custody_ready,
clinical_approved,stock_confirmed,pharmacy_authorised,address_confirmed,evidence_reference,expires_at)
values('a1200000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
'20000000-0000-4000-8000-000000000001',true,true,true,true,true,gen_random_uuid(),now()+interval '1 day');
select is(pg_temp.offer(pg_temp.product())->>'amountTotalMinor','10000','small product credit leaves separate delivery charge');
select is(pg_temp.offer(pg_temp.product())->>'unusedDepositRefundMinor','19900','unused refund snapshotted');
select is(pg_temp.offer(pg_temp.product())->>'replayed','true','reserved-credit replay returns same snapshot');
select is((select count(*)::integer from commerce_private.credit_reservations),1,'one credit reservation');
select throws_ok($$select pg_temp.offer(pg_temp.product('a1700000-0000-4000-8000-000000000002'))$$,
'42501','COMMERCE_DEPOSIT_UNAVAILABLE','second offer cannot spend reserved credit');
select throws_ok($$insert into commerce_private.credit_reservations(case_id,offer_id,credit_minor,unused_refund_minor,state)
select case_id,(select id from commerce_private.offers where snapshot->>'scenario'='review_deposit'),80000,19900,'reserved'
from commerce_private.deposit_funding$$,'23505',null,'unique index independently prevents concurrent credit spend');
select throws_ok($test$do $$begin update commerce_private.product_release_gates set clinical_approved=false;
perform pg_temp.offer(pg_temp.product());end$$$test$,'42501','COMMERCE_NOT_READY','replay must recheck withdrawn clinical readiness');
select throws_ok($test$do $$begin update commerce_private.prices set status='withdrawn'
 where id='a1100000-0000-4000-8000-000000000013';
perform pg_temp.offer(pg_temp.product());end$$$test$,'42501','COMMERCE_PRICE_UNAVAILABLE','withdrawn price denies replay');
select throws_ok($test$do $$begin update commerce_private.delivery_quotes set status='withdrawn';
perform pg_temp.offer(pg_temp.product());end$$$test$,'42501','COMMERCE_NOT_READY','withdrawn delivery denies replay');
select throws_ok($test$do $$begin update public.payment_orders set dispute_state='open'
 where id='a1500000-0000-4000-8000-000000000001';
perform pg_temp.offer(pg_temp.product());end$$$test$,'42501','COMMERCE_NOT_READY','disputed funding denies replay');
select throws_ok($test$do $$begin update public.payment_orders set refund_state='pending'
 where id='a1500000-0000-4000-8000-000000000001';
perform pg_temp.offer(pg_temp.product());end$$$test$,'42501','COMMERCE_NOT_READY','pending refund denies replay');
update commerce_private.deposit_funding set state='applied';
select throws_ok($$select pg_temp.offer(pg_temp.product('a1700000-0000-4000-8000-000000000003'))$$,
'42501','COMMERCE_DEPOSIT_UNAVAILABLE','applied funding without applied allocation denied');
update commerce_private.credit_reservations set state='applied';
select is(pg_temp.offer(pg_temp.product('a1700000-0000-4000-8000-000000000003'))->>'amountTotalMinor','90000','subsequent purchase does not reuse credit');
select is((select count(*)::integer from commerce_private.credit_reservations),1,'subsequent purchase creates no second allocation');
select throws_ok($test$select pg_temp.offer(pg_temp.product('a1700000-0000-4000-8000-000000000004')||
jsonb_build_object('items',jsonb_build_array(jsonb_build_object('priceId','a1100000-0000-4000-8000-000000000013','quantity',1),
jsonb_build_object('priceId','a1100000-0000-4000-8000-000000000013','quantity',1))))$test$,
'22023','COMMERCE_SELECTION_INVALID','duplicate product selections rejected');

select is(identity_private.handoff_payment_ready('a1200000-0000-4000-8000-000000000001'),false,'handoff adapter remains closed');
select is(intake_private.review_payment_ready('a1200000-0000-4000-8000-000000000001'),false,'review adapter remains closed');
select * from finish();
rollback;
