begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
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

create function pg_temp.deposit() returns jsonb language sql as $$
select pg_temp.offer('{"scenario":"review_deposit","items":[],"requestKey":"a1300000-0000-4000-8000-000000000001"}')$$;
insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,tax_treatment,source_fingerprint,
 approval_reference,environment,effective_at,expires_at)
values('a1100000-0000-4000-8000-000000000001','review_deposit','synthetic-v1','Synthetic deposit',99900,
 'vat-inclusive-planning',repeat('a',64),'a1100000-0000-4000-8000-000000000099','local-synthetic',now()-interval '1 day',now()+interval '1 day'),
 ('a1100000-0000-4000-8000-000000000002','review_deposit','approved-v1','Synthetic approved-deposit exercise',99900,
 'vat-inclusive-planning',repeat('b',64),'a1100000-0000-4000-8000-000000000099','approved-pilot-review',now()-interval '1 day',now()+interval '1 day');
select ok(commerce_private.review_price_current('a1100000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),'local synthetic remains available');
select ok(not commerce_private.review_price_current('a1100000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001'),'real price not available without live release classification');
insert into commerce_private.checkout_releases(tenant_id,provider_account_id,approval_reference,expires_at,enabled,payment_environment)
values('10000000-0000-4000-8000-000000000001','acct_SyntheticLiveDeposit','a1100000-0000-4000-8000-000000000099',now()+interval '1 day',false,'live');
select ok(not commerce_private.review_price_current('a1100000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),'live classification excludes synthetic price even while release disabled');
select throws_ok($$select pg_temp.deposit()$$,'42501','COMMERCE_PRICE_UNAVAILABLE','unbound real price denied natively');
insert into commerce_private.review_price_bindings(price_id,tenant_id,approval_reference)
values('a1100000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000099');
select ok(commerce_private.review_price_current('a1100000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001'),'approved matching tenant binding current');
select ok(not commerce_private.review_price_current('a1100000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),'wrong tenant excluded');
select throws_ok($test$do $$declare other uuid:=gen_random_uuid();begin
 insert into commerce_private.prices select other,kind,'ambiguous-v1',description,
 unit_amount_minor,currency,tax_treatment,source_fingerprint,approval_reference,environment,
 effective_at,expires_at,status from commerce_private.prices where environment='approved-pilot-review';
 insert into commerce_private.review_price_bindings(price_id,tenant_id,approval_reference)
 values(other,'10000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000099');
 perform pg_temp.deposit();end$$$test$,'42501','COMMERCE_PRICE_UNAVAILABLE','ambiguous current approvals denied');
select throws_ok($test$do $$begin
 update intake_private.intakes set safety_hold=true; perform pg_temp.deposit();end$$$test$,
 '42501','COMMERCE_NOT_READY','real price does not bypass submitted-intake safety');
select throws_ok($test$do $$declare other uuid:=gen_random_uuid();begin
 insert into commerce_private.prices select other,kind,'expired-v1',description,
 unit_amount_minor,currency,tax_treatment,source_fingerprint,approval_reference,environment,
 now()-interval '2 days',now()-interval '1 day',status from commerce_private.prices where environment='approved-pilot-review';
 insert into commerce_private.review_price_bindings(price_id,tenant_id,approval_reference)
 values(other,'10000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000099');
 if commerce_private.review_price_current(other,'10000000-0000-4000-8000-000000000001') then
 raise exception 'EXPIRED_PRICE_ACCEPTED';end if;
 raise exception using errcode='P0001',message='EXPIRED_PRICE_DENIED';end$$$test$,
 'P0001','EXPIRED_PRICE_DENIED','expired approved price rejected');
select is(pg_temp.deposit()->>'amountTotalMinor','99900','native exact R999 offer');
select is(pg_temp.deposit()->'lines'->0->>'environment','approved-pilot-review','truthful provenance snapshot');
select is(pg_temp.deposit()->>'replayed','true','exact replay preserved');
select is((select count(*)::integer from commerce_private.offers),1,'one immutable offer, no duplicate');
select throws_ok($$update commerce_private.review_price_bindings set approval_reference=gen_random_uuid()$$,'55000','APPEND_ONLY_RECORD','binding immutable');
select ok(not has_table_privilege('service_role','commerce_private.review_price_bindings','SELECT'),'no direct service browse');
select ok(not has_function_privilege('service_role','commerce_private.review_price_current(uuid,uuid)','EXECUTE'),'helper remains private');
select throws_ok($$insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at)
select gen_random_uuid(),'product',version,description,unit_amount_minor,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at
from commerce_private.prices where environment='approved-pilot-review'$$,'23514',null,'product cannot claim deposit provenance');
update commerce_private.prices set status='withdrawn' where environment='approved-pilot-review';
select throws_ok($$select pg_temp.deposit()$$,'42501','COMMERCE_PRICE_UNAVAILABLE','replay rechecks withdrawn price');
select * from finish();
rollback;

