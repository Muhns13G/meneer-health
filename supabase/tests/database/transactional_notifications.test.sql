begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
update public.tenant_memberships set valid_from=now()-interval '1 day'
where tenant_id='10000000-0000-4000-8000-000000000001' and subject_id='20000000-0000-4000-8000-000000000001' and role='patient';

insert into public.client_profiles(tenant_id,subject_id,given_name,family_name,mobile_e164)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic','Client','+27820000120');
insert into public.subject_contacts(subject_id,kind,normalized_value,status,provider,verified_at)
values('20000000-0000-4000-8000-000000000001','email','notifications@example.invalid','verified','synthetic',now())
on conflict(subject_id,kind) do update set normalized_value=excluded.normalized_value,status=excluded.status,verified_at=excluded.verified_at;

create function pg_temp.profile_event(key uuid default gen_random_uuid()) returns uuid language plpgsql as $$
declare id uuid;begin
 insert into public.client_profile_events(profile_id,tenant_id,subject_id,profile_version,event_type,correlation_id,idempotency_key)
 select p.id,p.tenant_id,p.subject_id,p.version,'corrected',key::text,key from public.client_profiles p
 where p.tenant_id='10000000-0000-4000-8000-000000000001' and p.subject_id='20000000-0000-4000-8000-000000000001'
 returning client_profile_events.id into id;return id;
end$$;
create temporary table source_event as select pg_temp.profile_event() id;
select is((select count(*) from audit_private.transactional_notifications where source_id=(select id from source_event)),1::bigint,'committed profile event atomically creates one notification');
select is((select template from audit_private.transactional_notifications where source_id=(select id from source_event)),'account-v1','versioned account template, no profile content');
savepoint source_rollback;
select pg_temp.profile_event();
rollback to source_rollback;
select is((select count(*) from audit_private.transactional_notifications),1::bigint,'source rollback rolls notification back too');
select throws_ok($$select pg_temp.profile_event((select idempotency_key from public.client_profile_events limit 1))$$,'23505',null,'source replay cannot duplicate notification');

insert into identity_private.patient_rights_requests(tenant_id,subject_id,kind,profile_version,request_key)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','support',1,gen_random_uuid()),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','export',1,gen_random_uuid());
select is((select count(*) from audit_private.transactional_notifications where template='support-v1'),1::bigint,'persisted support request creates generic receipt');
select is((select owner from audit_private.transactional_notifications where source_kind='rights' and template='account-v1'),'privacy','rights follow-up has privacy owner');

insert into public.operations_cases(id,tenant_id,subject_id)
values('f1200000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
insert into public.operations_events(tenant_id,case_id,subject_id,case_version,event,actor_subject_id,idempotency_key,correlation_id)
values('10000000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001',1,'transitioned','20000000-0000-4000-8000-000000000003',gen_random_uuid(),gen_random_uuid()),
('10000000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001',2,'claimed','20000000-0000-4000-8000-000000000003',gen_random_uuid(),gen_random_uuid());
select is((select count(*) from audit_private.transactional_notifications where source_kind='workflow'),1::bigint,'client-visible transition sends update, internal claim does not');

-- Explicit synthetic commercial fixture: proves event capture, not external money movement.
insert into commerce_private.offers(id,tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
values('f1200000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000010',gen_random_uuid(),'{}','{"scenario":"review_deposit","amountTotalMinor":99900}',now()+interval '1 hour');
insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
values('f1200000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','review_deposit','1.0.0','Synthetic supplier','Synthetic terms',repeat('a',64),gen_random_uuid(),now()-interval '1 hour',now()+interval '1 day','published');
insert into commerce_private.order_acceptances(id,offer_id,publication_id,subject_id,tenant_id,session_id,content_hash,snapshot_hash,request_key,assurance)
values('f1200000-0000-4000-8000-000000000013','f1200000-0000-4000-8000-000000000011','f1200000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),gen_random_uuid(),'aal1');
insert into commerce_private.checkout_intents(id,offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,request_key,payload,creation_deadline,provider_expires_epoch)
values('f1200000-0000-4000-8000-000000000014','f1200000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','f1200000-0000-4000-8000-000000000013','acct_synthetic12345',gen_random_uuid(),'{"scenario":"review_deposit","amountTotalMinor":99900}',now()+interval '15 minutes',extract(epoch from now()+interval '1 hour')::bigint);
select is((select count(*) from audit_private.transactional_notifications where template='payment-v1'),0::bigint,'Checkout creation does not claim payment update');
insert into commerce_private.settlements(intent_id) values('f1200000-0000-4000-8000-000000000014');
select is((select count(*) from audit_private.transactional_notifications where template='payment-v1'),0::bigint,'empty payment state does not notify');
update commerce_private.settlements set paid_confirmed=true where intent_id='f1200000-0000-4000-8000-000000000014';
select is((select count(*) from audit_private.transactional_notifications where template='payment-v1'),1::bigint,'authoritative paid fact creates generic notification');
update commerce_private.settlements set updated_at=clock_timestamp() where intent_id='f1200000-0000-4000-8000-000000000014';
select is((select count(*) from audit_private.transactional_notifications where template='payment-v1'),1::bigint,'timestamp-only payment replay does not notify');
update commerce_private.settlements set refunded_minor=100 where intent_id='f1200000-0000-4000-8000-000000000014';
select is((select count(*) from audit_private.transactional_notifications where template='payment-v1'),2::bigint,'changed refund fact creates separate update');
select ok(not exists(select 1 from information_schema.columns where table_schema='audit_private' and table_name='transactional_notifications' and column_name in('body','email','amount_minor','answers','protocol','name')),'outbox has reference-only schema');

-- Private fault fixtures are created only by postgres in this rollback packet.
create function pg_temp.queue_one() returns uuid language plpgsql as $$declare id uuid;begin
 insert into audit_private.transactional_notifications(tenant_id,subject_id,source_kind,source_id,source_version,template,owner)
 values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','profile',gen_random_uuid(),'1','account-v1','operations') returning transactional_notifications.id into id;
 return id;
end$$;
create temporary table claims(value jsonb);grant all on claims to service_role;
set local role anon;
select throws_ok($$select public.claim_transactional_notification('10000000-0000-4000-8000-000000000001')$$,'42501',null,'anonymous claim denied');
reset role;
set local role authenticated;
select throws_ok($$select public.claim_transactional_notification('10000000-0000-4000-8000-000000000001')$$,'42501',null,'browser claim denied');
reset role;
set local role service_role;
select throws_ok($$select * from audit_private.transactional_notifications$$,'42501',null,'service cannot read private journal directly');
select throws_ok($$select audit_private.capture_transactional_notification()$$,'42501',null,'service cannot fabricate trigger events');
select throws_ok($$select audit_private.claim_operations_alert_before_shared_budget('10000000-0000-4000-8000-000000000001')$$,'42501',null,'retired operations primitive cannot bypass budget');
select throws_ok($$select intake_private.claim_medical_safety_before_shared_budget('10000000-0000-4000-8000-000000000001')$$,'42501',null,'retired safety primitive cannot bypass budget');
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000002'),null::jsonb,'other tenant cannot claim alpha events');
insert into claims values(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'));
reset role;
select is((select value->>'recipient' from claims),'notifications@example.invalid','server resolves verified contact');
select is((select count(*) from claims,lateral jsonb_object_keys(value)),4::bigint,'claim is minimal and contains no source/profile payload');
select is((select attempt from audit_private.transactional_dispatch where notification_id=(select (value->>'notificationId')::uuid from claims)),1,'durable attempt reserved before send');
select ok((select lease_until>clock_timestamp() from audit_private.transactional_dispatch where notification_id=(select (value->>'notificationId')::uuid from claims)),'two-minute lease is live');
select ok(public.bind_transactional_message('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),repeat('a',64)),'provider message bound to exact durable lease');
select ok(public.bind_transactional_message('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),repeat('a',64)),'message binding replay idempotent');
select throws_ok($$select public.bind_transactional_message('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),repeat('b',64))$$,'PT409','NOTIFICATION_CONFLICT','different provider message cannot replace exact binding');
select is(public.record_transactional_delivery('10000000-0000-4000-8000-000000000002',repeat('a',64),'delivered',clock_timestamp()),false,'wrong-tenant receipt cannot attribute delivery');
select is(public.record_transactional_delivery('10000000-0000-4000-8000-000000000001',repeat('b',64),'delivered',clock_timestamp()),false,'unknown reference remains unconfirmed for provider retry');
select ok(public.record_transactional_delivery('10000000-0000-4000-8000-000000000001',repeat('a',64),'delivered',date_trunc('second',clock_timestamp())),'authenticated attributed delivery stored independently');
select ok(public.record_transactional_delivery('10000000-0000-4000-8000-000000000001',repeat('a',64),'delivered',date_trunc('second',clock_timestamp())),'delivery retry idempotent');
select is((select count(*) from audit_private.transactional_provider_deliveries),1::bigint,'duplicate delivery receipt stores one fact');
select is((select state from audit_private.transactional_dispatch where notification_id=(select (value->>'notificationId')::uuid from claims)),'leased','provider delivery does not fabricate transport receipt or human response');
select throws_ok($$select public.record_transactional_delivery('10000000-0000-4000-8000-000000000001',repeat('a',64),'opened',clock_timestamp())$$,'22023','NOTIFICATION_DELIVERY_INVALID','open/click tracking not delivery evidence');
set local role service_role;
select throws_ok($$select public.finish_transactional_notification('10000000-0000-4000-8000-000000000002',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'accepted')$$,'42501','NOTIFICATION_REJECTED','wrong-tenant completion denied');
select throws_ok($$select public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),gen_random_uuid(),'accepted')$$,'PT409','NOTIFICATION_CONFLICT','wrong lease denied');
select throws_ok($$select public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'delivered')$$,'22023','NOTIFICATION_OUTCOME_INVALID','transport cannot forge delivery evidence');
select ok(public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'accepted'),'provider acceptance persisted');
select ok(public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'accepted'),'identical completion replay is idempotent');
select throws_ok($$select public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'failed')$$,'PT409','NOTIFICATION_CONFLICT','conflicting completion rejected');
reset role;
select is((select state from audit_private.transactional_dispatch where notification_id=(select (value->>'notificationId')::uuid from claims)),'accepted','accepted remains separate from delivered/acknowledged');
select throws_ok($$update audit_private.transactional_delivery_facts set outcome='failed'$$,'55000',null,'delivery facts immutable');
select throws_ok($$delete from audit_private.transactional_notifications$$,'55000',null,'notification intent immutable');

-- Isolate transport state after source/authority assertions; no production rows are removed.
update audit_private.transactional_dispatch set state='suppressed';
insert into audit_private.transactional_dispatch(notification_id,state)
select id,'suppressed' from audit_private.transactional_notifications on conflict do nothing;
select pg_temp.queue_one();
truncate claims;
insert into claims values(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'));
select ok(public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'retryable'),'explicit retryable non-acceptance recorded');
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'60-second retry backoff enforced');
update audit_private.transactional_dispatch set next_attempt_at=clock_timestamp()-interval '1 second' where state='pending';
truncate claims;insert into claims values(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'));
select ok(public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'retryable'),'second retryable outcome recorded');
select ok((select next_attempt_at>clock_timestamp()+interval '290 seconds' from audit_private.transactional_dispatch where state='pending'),'300-second second backoff enforced');
update audit_private.transactional_dispatch set next_attempt_at=clock_timestamp()-interval '1 second' where state='pending';
truncate claims;insert into claims values(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'));
select ok(public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'retryable'),'third attempt recorded');
select is((select reason from audit_private.transactional_dispatch where notification_id=(select (value->>'notificationId')::uuid from claims)),'ATTEMPTS_EXHAUSTED','exhaustion becomes owned follow-up reason');
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'no fourth attempt');

select pg_temp.queue_one();truncate claims;
insert into claims values(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'));
update audit_private.transactional_dispatch set lease_until=clock_timestamp()-interval '1 second' where state='leased';
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'expired lease never auto-resends');
select is((select state from audit_private.transactional_dispatch where notification_id=(select (value->>'notificationId')::uuid from claims)),'uncertain','receipt-write failure becomes uncertain through expiry');

select pg_temp.queue_one();truncate claims;
insert into claims values(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'));
select public.finish_transactional_notification('10000000-0000-4000-8000-000000000001',(select (value->>'notificationId')::uuid from claims),(select (value->>'leaseId')::uuid from claims),'retryable');
update public.subject_contacts set normalized_value='changed@example.invalid' where subject_id='20000000-0000-4000-8000-000000000001' and kind='email';
update audit_private.transactional_dispatch set next_attempt_at=clock_timestamp()-interval '1 second' where state='pending';
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'changed retry destination cannot silently retarget');
select is((select reason from audit_private.transactional_dispatch where notification_id=(select (value->>'notificationId')::uuid from claims)),'CONTACT_CHANGED','contact change recorded for review');

select pg_temp.queue_one();update public.subject_contacts set status='revoked' where subject_id='20000000-0000-4000-8000-000000000001';
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'revoked recipient denied');
select ok(exists(select 1 from audit_private.transactional_dispatch where reason='RECIPIENT_UNAVAILABLE'),'missing recipient stays visible for owned follow-up');
update public.subject_contacts set status='verified' where subject_id='20000000-0000-4000-8000-000000000001';
select pg_temp.queue_one();update public.client_profiles set contact_preference='whatsapp';
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'unsupported preferred channel not silently replaced with email');
select ok(exists(select 1 from audit_private.transactional_dispatch where reason='CHANNEL_UNAVAILABLE'),'unsupported channel is explicit failure');
update public.client_profiles set contact_preference='email';
select pg_temp.queue_one();update public.tenant_memberships set status='suspended' where tenant_id='10000000-0000-4000-8000-000000000001' and subject_id='20000000-0000-4000-8000-000000000001' and role='patient';
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'membership revocation suppresses pending send');
select ok(exists(select 1 from audit_private.transactional_dispatch where reason='AUTHORITY_CHANGED'),'authority failure recorded');
update public.tenant_memberships set status='active' where tenant_id='10000000-0000-4000-8000-000000000001' and subject_id='20000000-0000-4000-8000-000000000001' and role='patient';
savepoint suppression_case;
insert into audit_private.transactional_suppressions(tenant_id,subject_id,reason) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','provider_suppressed');
select pg_temp.queue_one();
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'provider suppression blocks sending');
select ok(exists(select 1 from audit_private.transactional_dispatch where reason='SUPPRESSED'),'suppression not treated as success');
rollback to suppression_case;

savepoint suspended_tenant;
select pg_temp.queue_one();update public.tenants set status='suspended' where id='10000000-0000-4000-8000-000000000001';
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'suspended pilot remains non-sending');
rollback to suspended_tenant;

-- Fill only the remainder of the globally shared budget, then test all three claim wrappers.
select pg_temp.queue_one();
insert into audit_private.transactional_dispatch(notification_id,state,attempt)
select id,'accepted',1 from audit_private.transactional_notifications on conflict do nothing;
update audit_private.transactional_dispatch set state='pending',attempt=0 where notification_id=(select id from audit_private.transactional_notifications order by recorded_at desc,id desc limit 1);
insert into audit_private.transactional_attempts(lease_id,notification_id,attempt)
select gen_random_uuid(),n.id,1 from audit_private.transactional_notifications n
where not exists(select 1 from audit_private.transactional_attempts a where a.notification_id=n.id)
and n.id<>(select id from audit_private.transactional_notifications order by recorded_at desc,id desc limit 1)
limit greatest(0,50-audit_private.notification_budget_used());
do $$declare id uuid;begin
 while audit_private.notification_budget_used()<50 loop
  id:=pg_temp.queue_one();
  insert into audit_private.transactional_dispatch(notification_id,state,attempt) values(id,'accepted',1);
  insert into audit_private.transactional_attempts(lease_id,notification_id,attempt) values(gen_random_uuid(),id,1);
 end loop;
end$$;
select is(audit_private.notification_budget_used(),50::bigint,'one shared daily budget includes all generic attempts');
select is(public.claim_transactional_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'generic cannot exceed shared budget');
select is(public.claim_operations_alert_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'operations cannot bypass generic budget use');
select is(public.claim_medical_safety_notification('10000000-0000-4000-8000-000000000001'),null::jsonb,'medical sender cannot bypass shared budget use');
select ok(exists(select 1 from audit_private.transactional_dispatch where reason='BUDGET_EXHAUSTED'),'budget deferral remains durable and owned');
savepoint provider_suppression;
select ok(public.record_transactional_delivery('10000000-0000-4000-8000-000000000001',repeat('a',64),'hard_bounce',clock_timestamp()),'attributed hard bounce persisted');
select is((select reason from audit_private.transactional_suppressions),'provider_suppressed','hard bounce prevents subsequent sends');
select throws_ok($$delete from audit_private.transactional_provider_deliveries$$,'55000',null,'provider evidence remains immutable');
rollback to provider_suppression;
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='audit_private' and c.relname like 'transactional_%' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'all seven journals force RLS');
select * from finish();
rollback;
