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

insert into commerce_private.refund_authorities
select c.id,a.subject_id,gen_random_uuid(),'20000000-0000-4000-8000-000000000003',now()+interval '1 hour',null
from public.operations_cases c cross join queue_actor a where c.id::text between 'a3000000-0000-4000-8000-000000000023' and 'a3000000-0000-4000-8000-000000000030';
create temporary table completion_orders as select n,pg_temp.refund_order(('a3000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'review_deposit',99900,0) offer
from generate_series(23,28) n;
update commerce_private.checkout_intents set state='open',session_id='cs_test_original'||replace(id::text,'-',''),checkout_url='https://checkout.stripe.com/c/pay/synthetic'
where offer_id in(select offer from completion_orders);
create function pg_temp.command(n integer,action text,extra jsonb default '{}') returns jsonb language sql as $$
select public.staff_refund_command(pg_temp.refund_context(),jsonb_build_object('action',action,'offerId',(select offer from completion_orders where completion_orders.n=$1))||case when action='read' then '{}'::jsonb else jsonb_build_object('requestKey',gen_random_uuid()) end||extra) $$;
create function pg_temp.event(n integer,event text,kind text,extra jsonb default '{}',seconds integer default 0) returns jsonb language sql as $$
select public.apply_pilot_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_synthetic12345',
jsonb_build_object('eventId',event,'fingerprint',encode(digest(event||extra::text,'sha256'),'hex'),'eventType',kind,
'intentId',i.id,'tenantId',i.tenant_id,'sessionId',i.session_id,'paymentIntentId',b.payment_intent_id,'amountMinor',99900,
'currency','zar','paymentStatus',null,'refundMinor',null,'chargeId',null,'disputeId',null,'disputeStatus',null,
'occurredAt',now()+seconds*interval '1 second')||extra)
from commerce_private.checkout_intents i join commerce_private.intent_payment_bindings b on b.intent_id=i.id
where i.offer_id=(select offer from completion_orders where completion_orders.n=$1) $$;
create function pg_temp.observe(n integer) returns jsonb language sql as $$
select pg_temp.command(n,'record_exception',commerce_private.exception_plan(e.id)-'accountId'-'intentId'-'tenantId'-'sessionId'-'paymentIntentId'-'retainedPaymentIntentId'-'amountMinor'-'disputeId'-'status')
from commerce_private.provider_exceptions e join commerce_private.checkout_intents i on i.id=e.intent_id
where i.offer_id=(select offer from completion_orders where completion_orders.n=$1) and commerce_private.exception_plan(e.id) is not null
order by e.recorded_at limit 1 $$;
select ok(not has_table_privilege('service_role','commerce_private.duplicate_captures','select'),'duplicate capture observations remain private');
select ok(not has_function_privilege('service_role','public.staff_refund_command_before_completion(jsonb,jsonb)','execute'),'old command cannot bypass completion controls');
select lives_ok($$select pg_temp.event(23,'evt_duplicatecapture123','checkout.session.completed','{"sessionId":"cs_test_extra12345678","paymentIntentId":"pi_extra12345678","paymentStatus":"paid"}')$$,'different Session and PI held before observation');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000023'),'unreconciled duplicate blocks funding');
select lives_ok($$select pg_temp.observe(23)$$,'independent duplicate observation queues full refund');
select is((select amount_minor from commerce_private.refund_jobs where duplicate_capture_id is not null),99900,'full extra capture refunded, not capped by retained balance');
select lives_ok($$select pg_temp.observe(23)$$,'duplicate observation idempotent');
select is((select count(*) from commerce_private.duplicate_captures),1::bigint,'one immutable duplicate capture');
create temporary table duplicate_job as select id from commerce_private.refund_jobs where duplicate_capture_id is not null;
select lives_ok($$select pg_temp.command(23,'dispatch',jsonb_build_object('refundId',(select id from duplicate_job)))$$,'duplicate refund claims original extra PaymentIntent');
select throws_ok($$select pg_temp.command(23,'retry',jsonb_build_object('refundId',(select id from duplicate_job)))$$,'40001','REFUND_RECONCILIATION_REQUIRED','uncertain refund cannot be retried');
select lives_ok($$select pg_temp.event(23,'evt_duplicaterefund123','refund.updated',jsonb_build_object('intentId',null,'tenantId',null,'sessionId',null,'paymentIntentId','pi_extra12345678','refundId','re_extra12345678','refundReference',(select id from duplicate_job),'refundStatus','succeeded'))$$,'independent signed refund confirms exact duplicate');
select is((select state from commerce_private.refund_jobs where id=(select id from duplicate_job)),'confirmed','duplicate original-method refund confirmed');
select is((select refunded_minor from commerce_private.settlements s join commerce_private.checkout_intents i on i.id=s.intent_id where i.offer_id=(select offer from completion_orders where n=23)),0,'retained deposit refund total unchanged');
select ok(commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000023'),'single retained funding resumes after exact refund');
select lives_ok($$select pg_temp.event(26,'evt_duplicateretry123','checkout.session.completed','{"sessionId":"cs_test_retryextra123","paymentIntentId":"pi_retryextra12345","paymentStatus":"paid"}')$$,'second synthetic duplicate isolated');
select lives_ok($$select pg_temp.observe(26)$$,'second duplicate full refund reserved');
create temporary table retry_job as select j.id from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id=(select offer from completion_orders where n=26);
select lives_ok($$select pg_temp.command(26,'dispatch',jsonb_build_object('refundId',(select id from retry_job)))$$,'duplicate retry source claimed');
select lives_ok($$select pg_temp.event(26,'evt_duplicatefailed123','refund.updated',jsonb_build_object('intentId',null,'tenantId',null,'sessionId',null,'paymentIntentId','pi_retryextra12345','refundId','re_retryextra12345','refundReference',(select id from retry_job),'refundStatus','failed'))$$,'signed exact failure releases only its reservation');
select is((select state from commerce_private.refund_jobs where id=(select id from retry_job)),'failed_verified','duplicate retry requires independently verified failure');
select lives_ok($$select pg_temp.command(26,'retry',jsonb_build_object('refundId',(select id from retry_job)))$$,'bounded duplicate retry authorised');
select lives_ok($$select pg_temp.command(26,'retry',jsonb_build_object('refundId',(select id from retry_job)))$$,'duplicate retry replay allocates no second refund');
select is((select count(*) from commerce_private.refund_retries where source_job=(select id from retry_job)),1::bigint,'one retry per verified failure');
select lives_ok($$select pg_temp.command(26,'dispatch',jsonb_build_object('refundId',(select replacement_job from commerce_private.refund_retries where source_job=(select id from retry_job))))$$,'retry uses same original extra capture');
select lives_ok($$select pg_temp.event(26,'evt_duplicateretrypaid123','refund.updated',jsonb_build_object('intentId',null,'tenantId',null,'sessionId',null,'paymentIntentId','pi_retryextra12345','refundId','re_retryfinal12345','refundReference',(select replacement_job from commerce_private.refund_retries where source_job=(select id from retry_job)),'refundStatus','succeeded'),1)$$,'signed retry success confirms only one full refund');
select ok(commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000026'),'successful retry restores retained clean deposit');
select lives_ok($$select pg_temp.event(26,'evt_duplicatewrongamount123','refund.updated',jsonb_build_object('intentId',null,'tenantId',null,'sessionId',null,'paymentIntentId','pi_retryextra12345','amountMinor',1,'refundId','re_retryfinal12345','refundReference',(select replacement_job from commerce_private.refund_retries where source_job=(select id from retry_job)),'refundStatus','succeeded'),2)$$,'contradictory refund amount quarantined');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000026'),'wrong-amount fact cannot be cleared by prior duplicate refund success');
select lives_ok($$select pg_temp.event(24,'evt_disputeopen12345','charge.dispute.created','{"disputeId":"dp_won12345678","disputeStatus":"under_review"}')$$,'open dispute quarantines funding');
select lives_ok($$select pg_temp.command(24,'own_dispute',jsonb_build_object('reference',(select e.id from commerce_private.provider_exceptions e join commerce_private.checkout_intents i on i.id=e.intent_id where i.offer_id=(select offer from completion_orders where n=24) limit 1)))$$,'assigned financial staff owns dispute');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000024'),'ownership is not a won outcome');
select lives_ok($$select pg_temp.event(24,'evt_disputewon12345','charge.dispute.closed','{"disputeId":"dp_won12345678","disputeStatus":"won"}',1)$$,'signed won outcome still needs independent observation');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000024'),'webhook alone does not release dispute hold');
select lives_ok($$select pg_temp.observe(24)$$,'exact independently observed won dispute reconciles');
select ok(commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000024'),'won dispute restores only otherwise clean funding');
select lives_ok($$select pg_temp.event(24,'evt_disputeolder12345','charge.dispute.updated','{"disputeId":"dp_won12345678","disputeStatus":"under_review"}',-1)$$,'older open dispute cannot overwrite observed win');
select ok(commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000024'),'older open fact remains harmless only against exact terminal lineage');
select lives_ok($$select pg_temp.event(24,'evt_disputewon12345','charge.dispute.closed','{"disputeId":"dp_won12345678","disputeStatus":"won"}',1)$$,'exact terminal dispute replay is idempotent');
select throws_ok($$select pg_temp.command(24,'record_exception',jsonb_build_object('reference',(select e.id from commerce_private.provider_exceptions e where e.event_id='evt_disputeolder12345'),'kind','dispute','eventId','evt_disputeolder12345'))$$,'40001','RECONCILIATION_OBSERVATION_STALE','stale independent observation cannot resolve newer evidence');
select lives_ok($$select pg_temp.event(25,'evt_disputelost1234','charge.dispute.closed','{"disputeId":"dp_lost12345678","disputeStatus":"lost"}')$$,'signed lost outcome recorded');
select lives_ok($$select pg_temp.observe(25)$$,'lost outcome reconciled without inferring retained funds');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000025'),'lost dispute remains monetary hold');
select is(pg_temp.command(25,'read')#>>'{disputes,0,status}','lost','browser receives coarse lost status only');
select lives_ok($$select pg_temp.event(24,'evt_disputecontradict123','charge.dispute.closed','{"disputeId":"dp_won12345678","disputeStatus":"lost"}',2)$$,'contradictory final evidence quarantined');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000024'),'contradictory terminal outcome cannot silently replace prior win');
delete from commerce_private.deposit_funding where case_id='a3000000-0000-4000-8000-000000000027';
update commerce_private.settlements s set paid_confirmed=false from commerce_private.checkout_intents i where i.id=s.intent_id and i.offer_id=(select offer from completion_orders where n=27);
select lives_ok($$select pg_temp.event(27,'evt_expireddeposit123','checkout.session.expired','{"paymentStatus":"unpaid"}')$$,'expired unpaid attempt preserved');
select throws_ok($$select pg_temp.command(27,'replace_deposit')$$,'40001','COMMERCE_RECONCILIATION_REQUIRED','expired webhook alone cannot authorise replacement');
select lives_ok($$select pg_temp.command(27,'record_terminal',jsonb_build_object('intentId',i.id,'sessionId',i.session_id,'status','expired')) from commerce_private.checkout_intents i where i.offer_id=(select offer from completion_orders where n=27)$$,'independent terminal observation recorded');
insert into commerce_private.deposit_retry_approvals(offer_id,actor_id,request_key,approved_at,expires_at)
select offer,(select subject_id from queue_actor),gen_random_uuid(),now()-interval '1 hour',now()-interval '45 minutes' from completion_orders where n=27;
select ok(not commerce_private.deposit_attempt_retryable((select offer from completion_orders where n=27)),'expired approval cannot authorise new money attempt');
select is(pg_temp.command(27,'read')->>'canReplaceDeposit','true','expired unused approval can be freshly inspected and reauthorised');
select lives_ok($$select pg_temp.command(27,'replace_deposit')$$,'current unpaid terminal attempt authorises replacement');
select ok(commerce_private.deposit_attempt_retryable((select offer from completion_orders where n=27)),'replacement is bounded to current observation and approval');
select is((select count(*) from commerce_private.checkout_intents where offer_id=(select offer from completion_orders where n=27)),1::bigint,'authorisation does not mutate or fabricate original Checkout');
select throws_ok($$select public.staff_refund_command(pg_temp.refund_context()||'{"p_tenant_id":"10000000-0000-4000-8000-000000000002"}',jsonb_build_object('action','replace_deposit','offerId',(select offer from completion_orders where n=27),'requestKey',gen_random_uuid()))$$,'42501','REFUND_REJECTED','wrong tenant replacement denied');
insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at,status)
values('a4800000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','1.1.0','1.0.0',repeat('a',64),'Synthetic privacy','Synthetic review',gen_random_uuid(),'20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',300,gen_random_uuid(),'Synthetic urgent','Synthetic fallback',now()-interval '1 day',now()+interval '1 day','published');
insert into intake_private.intakes(id,tenant_id,subject_id,case_id,publication_id,state,snapshot_id)
values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000027','a4800000-0000-4000-8000-000000000001','submitted',gen_random_uuid());
update public.tenant_memberships set valid_from=now()-interval '1 day' where role='patient';
create function pg_temp.replacement(k uuid) returns jsonb language sql as $$select commerce_private.prepare_offer('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000027',jsonb_build_object('scenario','review_deposit','items','[]'::jsonb,'requestKey',k))$$;
select throws_ok($$select pg_temp.replacement((select request_key from commerce_private.offers where id=(select offer from completion_orders where n=27)))$$,'40001','COMMERCE_RECONCILIATION_REQUIRED','retired original request cannot replay into new acceptance');
select lives_ok($$select pg_temp.replacement('a4800000-0000-4000-8000-000000000002')$$,'fresh governed replacement offer prepared');
select is(pg_temp.replacement('a4800000-0000-4000-8000-000000000002')->>'replayed','true','replacement request idempotent');
select is((select count(*) from commerce_private.deposit_attempt_links),1::bigint,'original attempt linked once, not deleted');
select is((select count(*) from commerce_private.order_acceptances where offer_id=(select replacement_offer from commerce_private.deposit_attempt_links)),0::bigint,'replacement requires new client acceptance');
select throws_ok($$select pg_temp.replacement('a4800000-0000-4000-8000-000000000003')$$,'42501','COMMERCE_NOT_READY','concurrent second replacement denied');
select throws_ok($test$do $$begin update intake_private.intakes set safety_hold=true;perform pg_temp.replacement('a4800000-0000-4000-8000-000000000002');end$$$test$,'42501','COMMERCE_NOT_READY','replacement replay rechecks intake safety');
select lives_ok($$select pg_temp.event(27,'evt_expiredlatepaid123','checkout.session.completed','{"paymentStatus":"paid"}',1)$$,'late capture on retired attempt held');
select throws_ok($$select pg_temp.replacement('a4800000-0000-4000-8000-000000000002')$$,'42501','COMMERCE_NOT_READY','late captured original prevents unpaid replacement replay');
delete from commerce_private.deposit_funding where case_id='a3000000-0000-4000-8000-000000000028';
update commerce_private.settlements s set paid_confirmed=false,expiry_seen=true from commerce_private.checkout_intents i
where i.id=s.intent_id and i.offer_id=(select offer from completion_orders where n=28);
create temporary table second_attempt as select pg_temp.refund_order('a3000000-0000-4000-8000-000000000028','review_deposit',99900,0) offer;
select lives_ok($$select pg_temp.event(28,'evt_oldattemptlate123','checkout.session.completed','{"paymentStatus":"paid"}')$$,'late original capture after replacement payment is quarantined');
select ok(not commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000028'),'two paid attempts cannot supply two credits');
select lives_ok($$select pg_temp.observe(28)$$,'separate late original capture identified against retained replacement');
create temporary table old_attempt_refund as select j.id from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id=(select offer from completion_orders where n=28);
select lives_ok($$select pg_temp.command(28,'dispatch',jsonb_build_object('refundId',(select id from old_attempt_refund)))$$,'extra original attempt refunded to its own method');
select lives_ok($$select pg_temp.event(28,'evt_oldattemptrefund123','refund.updated',jsonb_build_object('intentId',null,'tenantId',null,'sessionId',null,'refundId','re_oldattempt12345','refundReference',(select id from old_attempt_refund),'refundStatus','succeeded'),1)$$,'exact signed full refund of late original');
select ok(commerce_private.deposit_ready('a3000000-0000-4000-8000-000000000028'),'only retained replacement deposit supplies paid readiness');
select is((select count(*) from commerce_private.deposit_funding where case_id='a3000000-0000-4000-8000-000000000028'),1::bigint,'one funding record survives duplicate attempts');
select * from finish();
rollback;
