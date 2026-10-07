begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('a3000000-0000-4000-8000-000000000001','queue@example.invalid',now(),false,false);
create temporary table queue_actor as select subject_id from public.external_identities
where provider='supabase' and provider_subject='a3000000-0000-4000-8000-000000000001';
grant select on queue_actor to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('a3000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003' from queue_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select 'a3000000-0000-4000-8000-000000000003',subject_id,'a3000000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from queue_actor;
insert into public.client_profiles(tenant_id,subject_id,given_name,family_name,mobile_e164)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic','Client','+27820000012');
insert into public.subject_contacts(subject_id,kind,normalized_value,status,provider,verified_at)
values('20000000-0000-4000-8000-000000000001','email','private-client@example.invalid','verified','synthetic',now())
on conflict(subject_id,kind) do update set normalized_value=excluded.normalized_value,
status=excluded.status,verified_at=excluded.verified_at;
insert into public.operations_cases(id,tenant_id,subject_id,created_at)
select ('a3000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now()-interval '1 hour'
from generate_series(10,35) n;
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
select c.tenant_id,c.id,c.subject_id,a.subject_id,'20000000-0000-4000-8000-000000000003',now()-interval '1 minute',now()+interval '1 hour'
from public.operations_cases c cross join queue_actor a;
create function pg_temp.refund_context() returns jsonb language sql as $$select jsonb_build_object(
 'p_provider_subject','a3000000-0000-4000-8000-000000000001','p_provider_session_id','a3000000-0000-4000-8000-000000000002',
 'p_verified_email','queue@example.invalid','p_session_id','a3000000-0000-4000-8000-000000000003',
 'p_subject_id',(select subject_id from queue_actor),'p_tenant_id','10000000-0000-4000-8000-000000000001')$$;
insert into commerce_private.offers(id,tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
select ('a4700000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,tenant_id,subject_id,id,gen_random_uuid(),'{}',
 '{"scenario":"review_deposit","amountTotalMinor":99900,"creditMinor":0,"unusedDepositRefundMinor":0}',now()+interval '1 hour'
 from public.operations_cases cross join generate_series(1,2) n where id='a3000000-0000-4000-8000-000000000010';
insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
values('a4700000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','review_deposit','1.0.0','Synthetic supplier','Synthetic terms',repeat('a',64),gen_random_uuid(),now()-interval '1 hour',now()+interval '1 day','published');
insert into commerce_private.order_acceptances(id,offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,assurance)
select ('a4700000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,o.id,'a4700000-0000-4000-8000-000000000003',o.subject_id,o.tenant_id,
 '70000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),gen_random_uuid(),'aal1'
 from commerce_private.offers o cross join lateral (select case when o.id='a4700000-0000-4000-8000-000000000001' then 4 else 5 end n) x;
insert into commerce_private.checkout_intents(id,offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,request_key,payload,creation_deadline,provider_expires_epoch)
select ('a4700000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,o.id,o.tenant_id,o.subject_id,a.id,'acct_synthetic12345',gen_random_uuid(),
 '{"scenario":"review_deposit","amountTotalMinor":99900}',now()+interval '15 minutes',extract(epoch from now()+interval '1 hour')::bigint
 from commerce_private.offers o join commerce_private.order_acceptances a on a.offer_id=o.id
 cross join lateral (select case when o.id='a4700000-0000-4000-8000-000000000001' then 6 else 7 end n) x;
insert into commerce_private.intent_payment_bindings values
 ('a4700000-0000-4000-8000-000000000006','acct_synthetic12345','pi_syntheticrefund1'),
 ('a4700000-0000-4000-8000-000000000007','acct_synthetic12345','pi_syntheticrefund2');
insert into commerce_private.settlements(intent_id,paid_confirmed) values
 ('a4700000-0000-4000-8000-000000000006',true),('a4700000-0000-4000-8000-000000000007',true);
insert into commerce_private.checkout_releases values('10000000-0000-4000-8000-000000000001','acct_synthetic12345',gen_random_uuid(),now()+interval '1 hour',true);
insert into commerce_private.refund_evidence values
 ('a4700000-0000-4000-8000-000000000008','a3000000-0000-4000-8000-000000000010','no_review',gen_random_uuid(),(select subject_id from queue_actor),now(),now()+interval '1 hour'),
 ('a4700000-0000-4000-8000-000000000009','a3000000-0000-4000-8000-000000000010','no_show',gen_random_uuid(),(select subject_id from queue_actor),now(),now()+interval '1 hour');
create function pg_temp.refund(action text default 'read',reason text default 'no_review',evidence uuid default 'a4700000-0000-4000-8000-000000000008',offer uuid default 'a4700000-0000-4000-8000-000000000001',key uuid default 'a4700000-0000-4000-8000-000000000010')
returns jsonb language sql as $$select public.staff_refund_command(pg_temp.refund_context(),
jsonb_build_object('action',action,'offerId',offer)||case when action='review' then jsonb_build_object('reason',reason,'evidenceId',evidence,'requestKey',key) else '{}'::jsonb end)$$;
select ok(not has_table_privilege('service_role','commerce_private.refund_jobs','update'),'service cannot alter refund amounts directly');
select ok(not has_function_privilege('authenticated','public.staff_refund_command(jsonb,jsonb)','execute'),'browser cannot bypass current server authority');
select ok(not has_function_privilege('service_role','public.staff_refund_command_before_reconciliation(jsonb,jsonb)','execute'),'service cannot bypass current refund reconciliation wrapper');
select ok(not has_function_privilege('service_role','public.apply_pilot_provider_event_before_refunds(uuid,uuid,text,jsonb)','execute'),'retired provider primitive cannot bypass automatic funding');
set local role service_role;
select is(pg_temp.refund()->>'requestState','not_requested','assigned operator can read without finance mutation grant');
select throws_ok($$select pg_temp.refund('review')$$,'42501','REFUND_REJECTED','ordinary assignment is not refund authority');
reset role;
insert into commerce_private.refund_authorities values('a3000000-0000-4000-8000-000000000010',(select subject_id from queue_actor),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()+interval '1 hour',null);
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','admin','active',now()-interval '1 hour',now()+interval '1 day','20000000-0000-4000-8000-000000000001');
select throws_ok($$select pg_temp.refund('review',evidence=>'a4700000-0000-4000-8000-000000000099')$$,'42501','REFUND_EVIDENCE_REQUIRED','unverified claimed reason cannot authorise money');
select is(pg_temp.refund('review')->>'requestState','queued','eligible verified unperformed review queues refund');
select is((pg_temp.refund()->'refunds'->0->>'amountMinor')::integer,99900,'full original captured deposit reserved');
select is(pg_temp.refund('review')->>'requestState','queued','same request safely replays');
select is((select count(*) from commerce_private.refund_jobs),1::bigint,'review replay cannot queue twice');
select throws_ok($$select commerce_private.reserve_refund((select id from commerce_private.refund_decisions limit 1),'a4700000-0000-4000-8000-000000000006',1)$$,'40001','REFUND_ALLOCATION_CONFLICT','reserved full capture cannot refund one extra cent');
select throws_ok($$select pg_temp.refund('review','no_show','a4700000-0000-4000-8000-000000000009')$$,'40001','REFUND_CONFLICT','changed reason cannot reuse immutable request');
select is(pg_temp.refund('review','no_show','a4700000-0000-4000-8000-000000000009','a4700000-0000-4000-8000-000000000002')->>'requestState','staff_review','unresolved no-show enters owned exception, no fee');
select is((select count(*) from commerce_private.refund_jobs),1::bigint,'no-show neither forfeits nor auto-refunds');
create temporary table refund_claim as select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object(
 'action','dispatch','offerId','a4700000-0000-4000-8000-000000000001','refundId',(select id from commerce_private.refund_jobs limit 1),'requestKey',gen_random_uuid())) as payload;
select is((select payload->>'paymentIntentId' from refund_claim),'pi_syntheticrefund1','only original provider capture is dispatched');
select is((select state from commerce_private.refund_jobs),'uncertain','claim durably reserves uncertainty before provider request');
select throws_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','dispatch','offerId','a4700000-0000-4000-8000-000000000001','refundId',(select id from commerce_private.refund_jobs limit 1),'requestKey',gen_random_uuid()))$$,'40001','REFUND_RECONCILIATION_REQUIRED','duplicate dispatch cannot create another refund');
select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','record','offerId','a4700000-0000-4000-8000-000000000001','refundId',(select id from commerce_private.refund_jobs limit 1),'providerId','re_synthetic12345','state','pending'));
select is((select refunded_minor from commerce_private.settlements where intent_id='a4700000-0000-4000-8000-000000000006'),0,'provider submission never claims confirmed refund');
select ok(exists(select 1 from audit_private.operations_alerts where code='OPERATIONS_EXCEPTION'),'uncertainty/pending raises durable owned alert');
select throws_ok($test$do $$begin update commerce_private.refund_authorities set revoked_at=clock_timestamp();perform pg_temp.refund('review');end$$$test$,'42501','REFUND_REJECTED','revoked grant denies mutations');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1' where id='a3000000-0000-4000-8000-000000000002';perform pg_temp.refund();end$$$test$,'42501','WORKFORCE_REJECTED','actual AAL1 cannot use financial authority');
select throws_ok($test$do $$begin update public.operations_assignments set revoked_at=clock_timestamp();perform pg_temp.refund();end$$$test$,'42501','QUEUE_REJECTED','revoked assignment denies read and mutation');
select ok(audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000001'),'refund requests, claims and exceptions preserve audit chain');
-- First-order allocation/unused refund comes from verified completion, never from a redirect.
insert into commerce_private.offers(id,tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
select ('a4800000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,tenant_id,subject_id,
 'a3000000-0000-4000-8000-000000000011',gen_random_uuid(),'{}',case when n=1 then
 '{"scenario":"review_deposit","amountTotalMinor":99900,"creditMinor":0,"unusedDepositRefundMinor":0}'::jsonb else
 '{"scenario":"approved_product_order","amountTotalMinor":10000,"creditMinor":80000,"unusedDepositRefundMinor":19900}'::jsonb end,now()+interval '1 hour'
 from public.operations_cases cross join generate_series(1,2) n where id='a3000000-0000-4000-8000-000000000011';
insert into commerce_private.order_acceptances(id,offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,assurance)
select ('a4800000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,o.id,'a4700000-0000-4000-8000-000000000003',o.subject_id,o.tenant_id,
 '70000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),gen_random_uuid(),'aal1'
 from commerce_private.offers o cross join lateral(select case when o.id='a4800000-0000-4000-8000-000000000001' then 3 else 4 end n) x
 where o.case_id='a3000000-0000-4000-8000-000000000011';
insert into commerce_private.checkout_intents(id,offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,request_key,payload,creation_deadline,provider_expires_epoch)
select ('a4800000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,o.id,o.tenant_id,o.subject_id,a.id,'acct_synthetic12345',gen_random_uuid(),o.snapshot,
 now()+interval '15 minutes',extract(epoch from now()+interval '1 hour')::bigint
 from commerce_private.offers o join commerce_private.order_acceptances a on a.offer_id=o.id
 cross join lateral(select case when o.id='a4800000-0000-4000-8000-000000000001' then 5 else 6 end n) x
 where o.case_id='a3000000-0000-4000-8000-000000000011';
insert into commerce_private.intent_payment_bindings values
 ('a4800000-0000-4000-8000-000000000005','acct_synthetic12345','pi_syntheticunused1'),
 ('a4800000-0000-4000-8000-000000000006','acct_synthetic12345','pi_syntheticunused2');
insert into commerce_private.settlements(intent_id,paid_confirmed) values
 ('a4800000-0000-4000-8000-000000000005',true),('a4800000-0000-4000-8000-000000000006',false);
select commerce_private.queue_unused_deposit('a4800000-0000-4000-8000-000000000005','80000000-0000-4000-8000-000000000002');
select is((select state from commerce_private.deposit_funding),'available','clean captured deposit has attributed native source');
update commerce_private.deposit_funding set state='reserved';
insert into commerce_private.credit_reservations(case_id,offer_id,credit_minor,unused_refund_minor,state)
 values('a3000000-0000-4000-8000-000000000011','a4800000-0000-4000-8000-000000000002',80000,19900,'reserved');
select commerce_private.queue_unused_deposit('a4800000-0000-4000-8000-000000000006','80000000-0000-4000-8000-000000000002');
select is((select count(*) from commerce_private.refund_jobs),1::bigint,'pending product payment cannot consume credit or refund unused deposit');
update commerce_private.settlements set paid_confirmed=true where intent_id='a4800000-0000-4000-8000-000000000006';
select commerce_private.queue_unused_deposit('a4800000-0000-4000-8000-000000000006','80000000-0000-4000-8000-000000000002');
select is((select amount_minor from commerce_private.refund_jobs where source_intent_id='a4800000-0000-4000-8000-000000000005'),19900,'below-R999 order queues exact original-deposit remainder');
select is((select state from commerce_private.credit_reservations),'applied','verified product completion consumes reservation once');
select is((select state from commerce_private.deposit_funding),'uncertain','pending remainder stays quarantined for reconciliation');
select commerce_private.queue_unused_deposit('a4800000-0000-4000-8000-000000000006','80000000-0000-4000-8000-000000000002');
select is((select count(*) from commerce_private.refund_jobs),2::bigint,'automatic remainder replay creates no duplicate job');
select throws_ok($$select public.service_refund_command('80000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','acct_synthetic12345','{"action":"claim"}')$$,'42501','REFUND_SERVICE_REJECTED','wrong service cannot execute refunds');
select is(public.service_refund_command('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_synthetic12345','{"action":"claim"}')->>'paymentIntentId','pi_syntheticunused1','scoped automatic dispatcher selects original deposit only');
select is(public.service_refund_command('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_synthetic12345','{"action":"claim"}'),null::jsonb,'claimed uncertainty cannot automatically repeat');
select ok(audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000001'),'automatic financial facts preserve audit chain');
select throws_ok($$update commerce_private.refund_jobs set amount_minor=1$$,'42501','REFUND_IMMUTABLE','money reservation cannot be edited after preparation');
create function pg_temp.refund_order(c uuid,scenario text,total integer,credit integer) returns uuid
language plpgsql as $$declare offer uuid:=gen_random_uuid(); acceptance uuid:=gen_random_uuid(); intent uuid:=gen_random_uuid();publication uuid:=gen_random_uuid();begin
 insert into commerce_private.offers(id,tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
 values(offer,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',c,gen_random_uuid(),'{}',
 jsonb_build_object('scenario',scenario,'amountTotalMinor',total,'creditMinor',credit,'unusedDepositRefundMinor',0),now()+interval '1 hour');
 insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
 values(publication,'10000000-0000-4000-8000-000000000001',scenario,'1.0.0','Synthetic supplier','Synthetic terms',repeat('a',64),gen_random_uuid(),now()-interval '1 hour',now()+interval '1 day','published');
 insert into commerce_private.order_acceptances(id,offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,assurance)
 values(acceptance,offer,publication,'20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),gen_random_uuid(),'aal1');
 insert into commerce_private.checkout_intents(id,offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,request_key,payload,creation_deadline,provider_expires_epoch)
 values(intent,offer,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',acceptance,'acct_synthetic12345',gen_random_uuid(),
 jsonb_build_object('scenario',scenario,'amountTotalMinor',total),now()+interval '15 minutes',extract(epoch from now()+interval '1 hour')::bigint);
 if total>0 then insert into commerce_private.intent_payment_bindings values(intent,'acct_synthetic12345','pi_'||replace(intent::text,'-',''));end if;
 insert into commerce_private.settlements(intent_id,paid_confirmed,no_additional_payment) values(intent,total>0,total=0);
 if scenario='review_deposit' then perform commerce_private.queue_unused_deposit(intent,'80000000-0000-4000-8000-000000000002');
 else
  update commerce_private.deposit_funding set state='reserved' where case_id=c;
  insert into commerce_private.credit_reservations(case_id,offer_id,credit_minor,unused_refund_minor,state) values(c,offer,credit,99900-credit,'reserved');
  perform commerce_private.queue_unused_deposit(intent,'80000000-0000-4000-8000-000000000002');
 end if;return offer;
end $$;
create temporary table split_orders as select
 pg_temp.refund_order('a3000000-0000-4000-8000-000000000012','review_deposit',99900,0) deposit;
alter table split_orders add column product uuid;
update split_orders set product=pg_temp.refund_order('a3000000-0000-4000-8000-000000000012','approved_product_order',60100,99900);
insert into commerce_private.refund_authorities values('a3000000-0000-4000-8000-000000000012',(select subject_id from queue_actor),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()+interval '1 hour',null);
insert into commerce_private.refund_evidence values('a4900000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000012','product_before_release',gen_random_uuid(),(select subject_id from queue_actor),now(),now()+interval '1 hour');
select is(pg_temp.refund('review','product_before_release','a4900000-0000-4000-8000-000000000001',(select product from split_orders),gen_random_uuid())->>'requestState','queued','eligible product cancellation allocates both original funding sources');
select is((select sum(j.amount_minor)::integer from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id=(select product from split_orders)),160000,'full product and delivery refund includes original credited deposit and captured balance');
select is((select count(distinct j.payment_intent_id) from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id=(select product from split_orders)),2::bigint,'split refund targets two distinct original methods, never a new destination');
create temporary table zero_orders as select pg_temp.refund_order('a3000000-0000-4000-8000-000000000013','review_deposit',99900,0) deposit;
alter table zero_orders add column product uuid;
update zero_orders set product=pg_temp.refund_order('a3000000-0000-4000-8000-000000000013','approved_product_order',0,99900);
insert into commerce_private.refund_authorities values('a3000000-0000-4000-8000-000000000013',(select subject_id from queue_actor),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()+interval '1 hour',null);
insert into commerce_private.refund_evidence values('a4900000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000013','product_before_release',gen_random_uuid(),(select subject_id from queue_actor),now(),now()+interval '1 hour');
select is(pg_temp.refund('review','product_before_release','a4900000-0000-4000-8000-000000000002',(select product from zero_orders),gen_random_uuid())->>'requestState','queued','zero additional payment cancellation refunds credit only');
select is((select count(*) from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id=(select product from zero_orders)),1::bigint,'zero-cost session has no invented PaymentIntent or refund');
-- The automatic unused-deposit refund is a separate allocation, not a permanent cancellation
-- block. Only a reconciled remainder may coexist with a later approved product refund.
insert into commerce_private.refund_authorities values('a3000000-0000-4000-8000-000000000011',(select subject_id from queue_actor),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()+interval '1 hour',null);
insert into commerce_private.refund_evidence values('a4900000-0000-4000-8000-000000000003','a3000000-0000-4000-8000-000000000011','product_before_release',gen_random_uuid(),(select subject_id from queue_actor),now(),now()+interval '1 hour');
select throws_ok($$select pg_temp.refund('review','product_before_release','a4900000-0000-4000-8000-000000000003','a4800000-0000-4000-8000-000000000002', 'a4900000-0000-4000-8000-000000000004')$$,'40001','REFUND_RECONCILIATION_REQUIRED','unconfirmed automatic remainder still blocks product cancellation');
-- Declared local synthetic settlement; not provider-delivery evidence.
update commerce_private.refund_jobs set provider_refund_id='re_syntheticsettledunused',state='confirmed'
 where source_intent_id='a4800000-0000-4000-8000-000000000005';
update commerce_private.settlements set refunded_minor=19900 where intent_id='a4800000-0000-4000-8000-000000000005';
update commerce_private.deposit_funding set state='applied' where case_id='a3000000-0000-4000-8000-000000000011';
select is(pg_temp.refund('review','product_before_release','a4900000-0000-4000-8000-000000000003','a4800000-0000-4000-8000-000000000002','a4900000-0000-4000-8000-000000000004')->>'requestState','queued','confirmed remainder permits separately evidenced product cancellation');
select is((select sum(j.amount_minor)::integer from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id='a4800000-0000-4000-8000-000000000002'),109900,'remainder plus product and delivery return exactly both captures');
select is(pg_temp.refund('review','product_before_release','a4900000-0000-4000-8000-000000000003','a4800000-0000-4000-8000-000000000002','a4900000-0000-4000-8000-000000000004')->>'requestState','queued','same cancellation safely replays after the confirmed remainder');
select throws_ok($$select pg_temp.refund('review','product_before_release','a4900000-0000-4000-8000-000000000003','a4800000-0000-4000-8000-000000000002',gen_random_uuid())$$,'40001','REFUND_RECONCILIATION_REQUIRED','new cancellation cannot refund either original capture twice');
-- Exercise the response/confirmation race through the public command, not only allocation.
create temporary table remainder_product_jobs as
 select j.id,j.amount_minor,j.payment_intent_id,j.source_intent_id
 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id
 where d.offer_id='a4800000-0000-4000-8000-000000000002' and j.state='queued';
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object(
 'action','dispatch','offerId','a4800000-0000-4000-8000-000000000002',
 'refundId',(select id from remainder_product_jobs where amount_minor=10000),'requestKey',gen_random_uuid()))$$,
 'delivery refund dispatch after confirmed remainder succeeds');
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object(
 'action','record','offerId','a4800000-0000-4000-8000-000000000002',
 'refundId',(select id from remainder_product_jobs where amount_minor=10000),
 'providerId','re_syntheticdeliveryreply','state','submitted'))$$,
 'delivery provider response is persisted through the current wrapper');
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object(
 'action','dispatch','offerId','a4800000-0000-4000-8000-000000000002',
 'refundId',(select id from remainder_product_jobs where amount_minor=80000),'requestKey',gen_random_uuid()))$$,
 'credited product refund dispatch after confirmed remainder succeeds');
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object(
 'action','record','offerId','a4800000-0000-4000-8000-000000000002',
 'refundId',(select id from remainder_product_jobs where amount_minor=80000),
 'providerId','re_syntheticproductreply','state','submitted'))$$,
 'credited product provider response is persisted through the current wrapper');
select * from finish();
rollback;
