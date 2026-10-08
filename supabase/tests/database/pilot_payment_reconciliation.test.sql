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

-- New reconciliation packet uses only rollback-only .invalid actors and synthetic signed envelopes.
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','admin','active',now()-interval '1 hour',now()+interval '1 day','20000000-0000-4000-8000-000000000001');
insert into commerce_private.refund_authorities values('a3000000-0000-4000-8000-000000000010',(select subject_id from queue_actor),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()+interval '1 hour',null);
select ok(not has_table_privilege('service_role','commerce_private.refund_provider_facts','select'),'refund facts are private');
select ok(not has_function_privilege('service_role','public.apply_pilot_provider_event_before_reconciliation(uuid,uuid,text,jsonb)','execute'),'old callback cannot bypass reconciliation');
select ok(not has_function_privilege('authenticated','public.staff_refund_command(jsonb,jsonb)','execute'),'browser cannot reconcile directly');
select is(pg_temp.refund('review')->>'requestState','queued','eligible job prepared');
create temporary table selected_job as select id from commerce_private.refund_jobs limit 1;
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','dispatch','offerId','a4700000-0000-4000-8000-000000000001','refundId',(select id from selected_job),'requestKey',gen_random_uuid()))$$,'claim committed before signed callback');
create function pg_temp.refund_event(event text,status text,job uuid default (null),amount integer default 99900,seconds integer default 0) returns jsonb language plpgsql as $$
declare j commerce_private.refund_jobs;body jsonb;
begin
select * into j from commerce_private.refund_jobs where id=coalesce(job,(select id from selected_job));
body:=jsonb_build_object('eventId',event,'fingerprint',encode(digest(event||status||amount::text,'sha256'),'hex'),
'eventType','refund.updated','intentId',null,'tenantId',null,'sessionId',null,'paymentIntentId',j.payment_intent_id,
'amountMinor',amount,'currency','zar','paymentStatus',null,'refundMinor',null,'chargeId',null,'disputeId',null,'disputeStatus',null,
'occurredAt',now()+seconds*interval '1 second','refundId','re_'||replace(j.id::text,'-',''),'refundReference',j.id,'refundStatus',status);
return public.apply_pilot_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_synthetic12345',body);
end $$;
select lives_ok($$select pg_temp.refund_event('evt_refundpending123','pending')$$,'signed pending accepted');
select is((select state from commerce_private.refund_jobs where id=(select id from selected_job)),'pending','pending retains reservation');
select throws_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','retry','offerId','a4700000-0000-4000-8000-000000000001','refundId',(select id from selected_job),'requestKey',gen_random_uuid()))$$,'PT409','REFUND_RECONCILIATION_REQUIRED','pending cannot be blindly retried');
select lives_ok($$select pg_temp.refund_event('evt_refundsuccess123','succeeded',seconds=>1)$$,'independent signed success reconciles');
select is((select state from commerce_private.refund_jobs where id=(select id from selected_job)),'confirmed','success confirms exact original job');
select is((select refunded_minor from commerce_private.settlements where intent_id='a4700000-0000-4000-8000-000000000006'),99900,'signed job success contributes once to cumulative refund');
select lives_ok($$select pg_temp.refund_event('evt_refundsuccess123','succeeded',seconds=>1)$$,'duplicate success replays');
select is((select refunded_minor from commerce_private.settlements where intent_id='a4700000-0000-4000-8000-000000000006'),99900,'duplicate not added twice');
select lives_ok($$select pg_temp.refund_event('evt_refundolder1234','pending',seconds=>-1)$$,'out-of-order pending does not undo success');
select is((select state from commerce_private.refund_jobs where id=(select id from selected_job)),'confirmed','success retained');
select throws_ok($$update commerce_private.refund_jobs set state='submitted' where id=(select id from selected_job)$$,'42501','REFUND_IMMUTABLE','late dispatch response cannot regress terminal state');
select lives_ok($$select pg_temp.refund_event('evt_refundbadamount','succeeded',amount=>99901,seconds=>2)$$,'mismatch retained as owned exception');
select ok((select reconciliation_required from commerce_private.settlements where intent_id='a4700000-0000-4000-8000-000000000006'),'amount mismatch blocks readiness');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000010'),'refunded/conflicted deposit cannot unlock clinical transfer');
select is(pg_temp.refund('review',offer=>'a4700000-0000-4000-8000-000000000002',key=>gen_random_uuid())->>'requestState','queued','second eligible job prepared');
create temporary table failed_job as select j.id from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id='a4700000-0000-4000-8000-000000000002';
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','dispatch','offerId','a4700000-0000-4000-8000-000000000002','refundId',(select id from failed_job),'requestKey',gen_random_uuid()))$$,'second claim');
select lives_ok($$select pg_temp.refund_event('evt_refundfailed123','failed',job=>(select id from failed_job),seconds=>3)$$,'signed failure releases reservation only after verification');
select is((select state from commerce_private.refund_jobs where id=(select id from failed_job)),'failed_verified','API response alone is not terminal proof');
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','retry','offerId','a4700000-0000-4000-8000-000000000002','refundId',(select id from failed_job),'requestKey',gen_random_uuid()))$$,'authorised verified failure queues fresh bounded job');
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','retry','offerId','a4700000-0000-4000-8000-000000000002','refundId',(select id from failed_job),'requestKey',gen_random_uuid()))$$,'repeat retry command cannot allocate twice');
select is((select count(*) from commerce_private.refund_retries),1::bigint,'one replacement per failed job');
select throws_ok($$select public.staff_refund_command(pg_temp.refund_context()||'{"p_tenant_id":"10000000-0000-4000-8000-000000000002"}',jsonb_build_object('action','reconcile','offerId','a4700000-0000-4000-8000-000000000002','requestKey',gen_random_uuid()))$$,'42501','REFUND_REJECTED','wrong tenant cannot reconcile');
select throws_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','reconcile','offerId','a4700000-0000-4000-8000-000000000002','requestKey',gen_random_uuid(),'state','confirmed'))$$,'22023','REFUND_COMMAND_INVALID','no staff force-confirm flag');
create temporary table clean_deposit as select pg_temp.refund_order('a3000000-0000-4000-8000-000000000020','review_deposit',99900,0) id;
select ok(commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000020'),'single current released signed deposit supplies review authority');
select ok(identity_private.handoff_payment_ready('a3000000-0000-4000-8000-000000000020'),'handoff uses same authoritative deposit bridge');
select ok(commerce_private.funding_current('a3000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),'native deposit can fund first product without legacy order');
update commerce_private.settlements set dispute_seen=true where intent_id=(select i.id from commerce_private.checkout_intents i where i.offer_id=(select id from clean_deposit));
select ok(not identity_private.handoff_payment_ready('a3000000-0000-4000-8000-000000000020'),'dispute revokes monetary readiness without touching clinical state');
select ok(not commerce_private.funding_current('a3000000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),'disputed deposit cannot be credited');
-- Exact normalized expired/failed receipts release only unpaid reserved product credit.
insert into commerce_private.refund_authorities values('a3000000-0000-4000-8000-000000000021',(select subject_id from queue_actor),gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()+interval '1 hour',null);
create temporary table terminal_orders as select pg_temp.refund_order('a3000000-0000-4000-8000-000000000021','review_deposit',99900,0) deposit;
alter table terminal_orders add column product uuid;
update terminal_orders set product=pg_temp.refund_order('a3000000-0000-4000-8000-000000000021','approved_product_order',60100,99900);
update commerce_private.credit_reservations set state='reserved' where offer_id=(select product from terminal_orders);
update commerce_private.deposit_funding set state='reserved' where case_id='a3000000-0000-4000-8000-000000000021';
update commerce_private.settlements set paid_confirmed=false where intent_id=(select id from commerce_private.checkout_intents where offer_id=(select product from terminal_orders));
update commerce_private.checkout_intents set state='open',session_id='cs_test_expiredsynthetic',checkout_url='https://checkout.stripe.com/c/pay/synthetic'
where offer_id=(select product from terminal_orders);
create function pg_temp.terminal_event(event text,kind text,status text) returns jsonb language sql as $$
select public.apply_pilot_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_synthetic12345',
jsonb_build_object('eventId',event,'fingerprint',encode(digest(event,'sha256'),'hex'),'eventType',kind,
'intentId',i.id,'tenantId',i.tenant_id,'sessionId',i.session_id,'paymentIntentId',b.payment_intent_id,'amountMinor',60100,'currency','zar',
'paymentStatus',status,'refundMinor',null,'chargeId',null,'disputeId',null,'disputeStatus',null,'occurredAt',now()))
from commerce_private.checkout_intents i join commerce_private.intent_payment_bindings b on b.intent_id=i.id where i.offer_id=(select product from terminal_orders)$$;
select lives_ok($$select pg_temp.terminal_event('evt_expiredrelease1','checkout.session.expired','unpaid')$$,'verified unpaid expiration reconciles');
select is((select state from commerce_private.credit_reservations where offer_id=(select product from terminal_orders)),'reserved','receipt alone cannot rule out in-flight provider money');
select ok(jsonb_array_length(public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','inspect','offerId',(select product from terminal_orders))))=1,'current financial authority gets one server-owned inspection plan');
select lives_ok($$select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action','record_terminal','offerId',(select product from terminal_orders),'requestKey',gen_random_uuid(),
'intentId',(select id from commerce_private.checkout_intents where offer_id=(select product from terminal_orders)),
'sessionId','cs_test_expiredsynthetic','status','expired'))$$,'server-only verified provider observation commits before release');
select is((select state from commerce_private.credit_reservations where offer_id=(select product from terminal_orders)),'released','unpaid expiry releases credit exactly once');
select is((select state from commerce_private.deposit_funding where case_id='a3000000-0000-4000-8000-000000000021'),'available','unconsumed deposit remains reusable');
select lives_ok($$select pg_temp.terminal_event('evt_expiredrelease1','checkout.session.expired','unpaid')$$,'duplicate expiry safe');
select lives_ok($$select pg_temp.terminal_event('evt_failedrelease12','checkout.session.async_payment_failed','unpaid')$$,'delayed failure cannot consume released credit');
select is((select state from commerce_private.credit_reservations where offer_id=(select product from terminal_orders)),'released','failure/expiry replay retains released state');
select lives_ok($$select pg_temp.terminal_event('evt_latepaidrelease1','checkout.session.completed','paid')$$,'late positive capture is retained as money not supply');
select ok((select reconciliation_required from commerce_private.settlements where intent_id=(select id from commerce_private.checkout_intents where offer_id=(select product from terminal_orders))),'late positive money after release quarantined');
select ok(exists(select 1 from audit_private.operations_alerts a join public.audit_events f on f.id=a.audit_fact_id
 where f.action='commerce.reconciliation.exception' and a.owner='technology-operations'
 and a.code='OPERATIONS_EXCEPTION'),'provider conflict has a content-free owned alert');
select is((select state from commerce_private.credit_reservations where offer_id=(select product from terminal_orders)),'released','late money cannot silently reapply credit');
select is((select state from public.operations_cases where id='a3000000-0000-4000-8000-000000000021'),'onboarding_pending','reconciliation never advances clinical/fulfilment case');
-- Recovery of a formerly orphaned applied receipt must also reconstruct native funding effects.
create temporary table recovered_deposit as select pg_temp.refund_order('a3000000-0000-4000-8000-000000000022','review_deposit',99900,0) offer;
delete from commerce_private.deposit_funding where case_id='a3000000-0000-4000-8000-000000000022';
insert into commerce_private.provider_receipts(account_id,event_id,fingerprint,event_type,intent_reference,metadata_tenant,
 payment_intent_id,amount_minor,currency,payment_status,occurred_at,service_id,tenant_boundary)
select i.provider_account_id,'evt_recoveredfunding1',repeat('c',64),'checkout.session.completed',i.id,i.tenant_id,
 b.payment_intent_id,99900,'zar','paid',now(),'80000000-0000-4000-8000-000000000002',i.tenant_id
 from commerce_private.checkout_intents i join commerce_private.intent_payment_bindings b on b.intent_id=i.id where i.offer_id=(select offer from recovered_deposit);
insert into commerce_private.receipt_applications select provider_account_id,'evt_recoveredfunding1',id,'applied'
 from commerce_private.checkout_intents where offer_id=(select offer from recovered_deposit);
select lives_ok($$select commerce_private.reconcile_case('a3000000-0000-4000-8000-000000000022')$$,'recovered receipt effects reconcile');
select is((select state from commerce_private.deposit_funding where case_id='a3000000-0000-4000-8000-000000000022'),'available','reconciliation reconstructs clean native funding');
select * from finish();
rollback;
