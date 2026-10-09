begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok((select relrowsecurity and relforcerowsecurity from pg_class
 where oid='commerce_private.payment_account_environments'::regclass),'account modes force RLS');
select ok(not has_table_privilege(role,'commerce_private.payment_account_environments','select'),
 role||' cannot read the private account map') from unnest(array['anon','authenticated','service_role']) role;
select ok(not has_function_privilege(role,'public.apply_pilot_provider_event_before_environment(uuid,uuid,text,jsonb)','execute'),
 role||' cannot bypass the mode-aware callback') from unnest(array['anon','authenticated','service_role']) role;
select ok(not has_function_privilege(role,'public.apply_commerce_provider_event(uuid,uuid,text,text,jsonb)','execute'),
 role||' cannot apply normalized receipts directly') from unnest(array['anon','authenticated']) role;
select ok(has_function_privilege('service_role','public.apply_commerce_provider_event(uuid,uuid,text,text,jsonb)','execute'),'server may use the mode-aware callback');
select ok(not has_function_privilege('service_role','public.staff_refund_command_before_reconciliation(jsonb,jsonb)','execute'),'retired refund ACL remains restricted');

insert into commerce_private.checkout_releases(tenant_id,provider_account_id,approval_reference,expires_at,enabled,payment_environment)
values('10000000-0000-4000-8000-000000000001','acct_syntheticlive123',gen_random_uuid(),now()+interval '1 hour',true,'live');
select is((select payment_environment from commerce_private.payment_account_environments
 where provider_account_id='acct_syntheticlive123'),'live','explicit release permanently registers live account');
select throws_ok($$select commerce_private.bind_payment_environment('acct_syntheticlive123','sandbox')$$,
 '42501','PAYMENT_ENVIRONMENT_REJECTED','registered live account cannot become sandbox');
select throws_ok($$update commerce_private.payment_account_environments set payment_environment='sandbox'$$,
 '55000','APPEND_ONLY_RECORD','account map is immutable');
select throws_ok($$delete from commerce_private.payment_account_environments$$,
 '55000','APPEND_ONLY_RECORD','account map cannot be deleted for reassignment');

insert into public.operations_cases(id,tenant_id,subject_id)
values('b9900000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
insert into commerce_private.offers(id,tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
values('b9900000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 'b9900000-0000-4000-8000-000000000001',gen_random_uuid(),'{}','{"scenario":"review_deposit","amountTotalMinor":99900}',now()+interval '1 hour');
insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
values('b9900000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','review_deposit','1.0.0','Synthetic supplier','Synthetic terms',repeat('a',64),gen_random_uuid(),now()-interval '1 hour',now()+interval '1 hour','published');
insert into commerce_private.order_acceptances(id,offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,assurance)
values('b9900000-0000-4000-8000-000000000004','b9900000-0000-4000-8000-000000000002','b9900000-0000-4000-8000-000000000003',
 '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),gen_random_uuid(),'aal1');
insert into commerce_private.checkout_intents(id,offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,request_key,payload,creation_deadline,provider_expires_epoch)
values('b9900000-0000-4000-8000-000000000005','b9900000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001','b9900000-0000-4000-8000-000000000004','acct_syntheticlive123',gen_random_uuid(),
 '{"scenario":"review_deposit","amountTotalMinor":99900}',now()+interval '15 minutes',extract(epoch from now()+interval '1 hour')::bigint);
select is((select payment_environment from commerce_private.checkout_intents where id='b9900000-0000-4000-8000-000000000005'),
 'live','intent mode derives from the release, not caller default');
select throws_ok($$update commerce_private.checkout_intents set state='open',session_id='cs_test_synthetic12345',checkout_url='https://checkout.stripe.com/c/pay/synthetic'
 where id='b9900000-0000-4000-8000-000000000005'$$,'23514',null,'live intent cannot attach a test Session');
select lives_ok($$update commerce_private.checkout_intents set state='open',session_id='cs_live_synthetic12345',checkout_url='https://checkout.stripe.com/c/pay/synthetic'
 where id='b9900000-0000-4000-8000-000000000005'$$,'live Session attaches to live intent');
select throws_ok($$update commerce_private.checkout_intents set payment_environment='sandbox'$$,'42501','CHECKOUT_INTENT_IMMUTABLE','intent mode remains immutable');
select throws_ok($$update commerce_private.checkout_releases set provider_account_id='acct_synthetictest123',payment_environment='sandbox'$$,
 '42501','PAYMENT_ENVIRONMENT_REJECTED','tenant history cannot move to another account/mode');
select throws_ok($$delete from commerce_private.checkout_releases$$,'42501','PAYMENT_ENVIRONMENT_REJECTED','history cannot be adopted by deleting its release');
select lives_ok($$update commerce_private.checkout_releases set enabled=false,expires_at=now()-interval '1 hour'$$,'pause is allowed without changing the account association');

create function pg_temp.environment_event(session text default null) returns jsonb language sql as $$select jsonb_build_object(
 'eventId','evt_syntheticmode123','fingerprint',repeat('c',64),'eventType','synthetic.unsupported',
 'intentId',null,'tenantId',null,'sessionId',session,'paymentIntentId',null,'amountMinor',null,
 'currency',null,'paymentStatus',null,'refundMinor',null,'chargeId',null,'disputeId',null,
 'disputeStatus',null,'occurredAt',now(),'refundId',null,'refundReference',null,'refundStatus',null)$$;
select throws_ok($$select public.apply_pilot_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_syntheticlive123',pg_temp.environment_event())$$,
 '42501','PAYMENT_ENVIRONMENT_REJECTED','legacy sandbox entrypoint cannot fund a live account');
select throws_ok($$select public.apply_commerce_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_syntheticlive123','live',pg_temp.environment_event('cs_test_synthetic12345'))$$,
 '42501','PAYMENT_ENVIRONMENT_REJECTED','live callback rejects test Session before storage');
select is((select count(*) from commerce_private.provider_receipts),0::bigint,'denied cross-mode events write no receipts');
select is(public.apply_commerce_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_syntheticlive123','live',pg_temp.environment_event())->>'outcome',
 'ignored','signed-normalized live facts still reconcile after a release pause');
select is(public.apply_commerce_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_syntheticlive123','live',pg_temp.environment_event())->>'replayed',
 'true','live replay is idempotent');
select is((select count(*) from commerce_private.provider_receipts),1::bigint,'replay retains one immutable receipt');
select throws_ok($$select public.apply_commerce_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_unregisteredlive123','live',pg_temp.environment_event())$$,
 '42501','PAYMENT_ENVIRONMENT_REJECTED','live callback requires explicit account/tenant release association');
select throws_ok($$select public.apply_commerce_provider_event(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','acct_syntheticlive123','live',pg_temp.environment_event())$$,
 '42501','WEBHOOK_SERVICE_REJECTED','invalid service has no environment or receipt authority');
select ok(not commerce_private.deposit_ready('b9900000-0000-4000-8000-000000000001'),'unpaid live intent does not grant review access');
select * from finish();
rollback;
