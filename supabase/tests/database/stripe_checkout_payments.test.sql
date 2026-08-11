begin;
select plan(46);

select has_table('public', 'payment_price_catalogue', 'payment price catalogue exists');
select has_table('public', 'payment_orders', 'payment order ledger exists');
select has_table('public', 'payment_order_lines', 'immutable payment line snapshots exist');
select has_table('public', 'payment_provider_events', 'provider event evidence exists');
select has_table(
  'public',
  'payment_reconciliation_exceptions',
  'payment reconciliation queue exists'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.payment_orders'::regclass),
  true,
  'payment orders have RLS enabled'
);
select is(
  (select relforcerowsecurity from pg_class where oid = 'public.payment_orders'::regclass),
  true,
  'payment orders force RLS'
);
select is(
  has_table_privilege('anon', 'public.payment_orders', 'SELECT'),
  false,
  'anonymous role cannot read payment orders'
);
select is(
  has_table_privilege('authenticated', 'public.payment_order_lines', 'SELECT'),
  false,
  'authenticated role cannot read line snapshots directly'
);
select is(
  has_table_privilege('anon', 'public.payment_provider_events', 'INSERT'),
  false,
  'anonymous role cannot fabricate provider events'
);
select is(
  has_function_privilege(
    'anon',
    'public.prepare_payment_checkout(uuid,uuid,uuid,text,text,text,text,text,integer,timestamptz,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  false,
  'anonymous role cannot prepare checkout'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.apply_payment_provider_event(uuid,text,text,text,uuid,text,text,text,boolean,text,text,timestamptz)',
    'EXECUTE'
  ),
  false,
  'authenticated role cannot apply webhook events'
);
select is(
  (
    select count(*)::integer from public.service_identity_scopes
    where service_identity_id = '80000000-0000-4000-8000-000000000002'
      and resource = 'payment'
      and action in ('append', 'update')
  ),
  2,
  'webhook service identity has the exact payment mutation scopes'
);
select is(
  (select count(*)::integer from public.payment_price_catalogue where environment = 'production'),
  0,
  'migration and seed contain no production price'
);
select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('payment_orders', 'payment_order_lines', 'payment_provider_events')
      and column_name in (
        'symptom', 'diagnosis', 'questionnaire_response', 'prescription', 'raw_body', 'payload'
      )
  ),
  0,
  'payment persistence has no health or raw webhook payload columns'
);

create or replace function pg_temp.prepare_payment(
  p_workflow_id uuid,
  p_scenario text,
  p_request text,
  p_retry text,
  p_fingerprint text,
  p_expected_version integer
)
returns jsonb
language sql
as $$
  select public.prepare_payment_checkout(
    '10000000-0000-4000-8000-000000000001',
    p_workflow_id,
    '20000000-0000-4000-8000-000000000001',
    p_scenario,
    'local',
    p_request,
    p_retry,
    p_fingerprint,
    p_expected_version,
    '2030-01-01T00:10:00Z',
    '20000000-0000-4000-8000-000000000001',
    'patient',
    'aal1',
    '2026-08-10.1',
    'payment_trace_01'
  );
$$;

create temp table payment_test_orders (
  label text primary key,
  order_id uuid not null,
  workflow_id uuid not null
);

with prepared as (
  select pg_temp.prepare_payment(
    'a0000000-0000-4000-8000-000000000001',
    'consultation_only',
    'payment_request_consultation',
    'payment_retry_consultation',
    repeat('a', 64),
    0
  ) as result
)
insert into payment_test_orders (label, order_id, workflow_id)
select
  'consultation',
  (result->>'orderId')::uuid,
  (result->>'workflowId')::uuid
from prepared;

select is(
  (select amount_total_minor from public.payment_orders where id = (
    select order_id from payment_test_orders where label = 'consultation'
  )),
  10000,
  'server snapshots the synthetic consultation total'
);
select is(
  (select count(*)::integer from public.payment_order_lines where order_id = (
    select order_id from payment_test_orders where label = 'consultation'
  )),
  1,
  'consultation order has one explicit line'
);
select is(
  (
    pg_temp.prepare_payment(
      'a0000000-0000-4000-8000-000000000001',
      'consultation_only',
      'payment_request_consultation_replay',
      'payment_retry_consultation',
      repeat('a', 64),
      0
    )->>'replayed'
  )::boolean,
  true,
  'identical checkout retry replays the durable order'
);
select throws_ok(
  $$select pg_temp.prepare_payment(
    'a0000000-0000-4000-8000-000000000001',
    'bundle',
    'payment_request_rebound',
    'payment_retry_consultation',
    repeat('b', 64),
    0
  )$$,
  '23505',
  'PAYMENT_CHECKOUT_IDEMPOTENCY_CONFLICT',
  'changed retry is rejected'
);

select is(
  (
    public.attach_payment_checkout_session(
      '10000000-0000-4000-8000-000000000001',
      (select order_id from payment_test_orders where label = 'consultation'),
      'cs_test_synthetic_consultation_01',
      '2030-01-01T00:11:00Z'
    )->>'status'
  ),
  'checkout_open',
  'test Checkout Session attaches durably'
);
select is(
  (select payment_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'consultation'
  )),
  'pending',
  'browser checkout return alone cannot mark payment paid'
);

create or replace function pg_temp.apply_event(
  p_external_event_id text,
  p_event_type text,
  p_order_id uuid,
  p_payment_intent_id text,
  p_payment_status text default null,
  p_refund_complete boolean default null,
  p_dispute_outcome text default null,
  p_fingerprint text default repeat('c', 64)
)
returns jsonb
language sql
as $$
  select public.apply_payment_provider_event(
    '80000000-0000-4000-8000-000000000002',
    'local',
    p_external_event_id,
    p_event_type,
    p_order_id,
    (select checkout_session_id from public.payment_orders where id = p_order_id),
    p_payment_intent_id,
    p_payment_status,
    p_refund_complete,
    p_dispute_outcome,
    p_fingerprint,
    '2030-01-01T00:12:00Z'
  );
$$;

select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_completed_01',
      'checkout.session.completed',
      (select order_id from payment_test_orders where label = 'consultation'),
      'pi_synthetic_consultation_01',
      'paid'
    )#>>'{order,status}'
  ),
  'paid',
  'verified completed event marks the internal payment paid'
);
select is(
  (select payment_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'consultation'
  )),
  'paid',
  'paid provider event updates only the payment projection'
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_completed_01',
      'checkout.session.completed',
      (select order_id from payment_test_orders where label = 'consultation'),
      'pi_synthetic_consultation_01',
      'paid'
    )->>'replayed'
  )::boolean,
  true,
  'duplicate provider event replays without a second transition'
);
select is(
  (
    select count(*)::integer from public.payment_provider_events
    where external_event_id = 'evt_synthetic_completed_01'
  ),
  1,
  'duplicate provider delivery produces one event record'
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_refund_01',
      'charge.refunded',
      (select order_id from payment_test_orders where label = 'consultation'),
      'pi_synthetic_consultation_01',
      null,
      true
    )#>>'{order,status}'
  ),
  'refunded',
  'complete refund remains independent and durable'
);
select is(
  (select clinical_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'consultation'
  )),
  'not_started',
  'payment and refund events do not imply a clinical decision'
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_late_success_01',
      'checkout.session.completed',
      (select order_id from payment_test_orders where label = 'consultation'),
      'pi_synthetic_consultation_01',
      'paid',
      null,
      null,
      repeat('0', 64)
    )->>'reconciliationRequired'
  )::boolean,
  true,
  'late success cannot regress a refunded order'
);

insert into public.workflow_instances (id, tenant_id, subject_id, clinical_state)
values (
  'a0000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'rejected'
);
insert into public.payment_readiness
select
  'a0000000-0000-4000-8000-000000000005', tenant_id, subject_id,
  access_confirmed, disclosures_confirmed, consent_confirmed, booking_ready,
  false, address_confirmed, stock_confirmed, pharmacy_eligible, updated_at
from public.payment_readiness
where workflow_id = 'a0000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select pg_temp.prepare_payment(
    'a0000000-0000-4000-8000-000000000005',
    'medication_delivery',
    'payment_request_rejected_clinical',
    'payment_retry_rejected_clinical',
    repeat('1', 64),
    0
  )$$,
  '42501',
  'PAYMENT_READINESS_NOT_APPROVED',
  'clinical rejection prevents medication payment preparation'
);

insert into public.workflow_instances (id, tenant_id, subject_id)
values (
  'a0000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001'
);
insert into public.payment_readiness
select
  'a0000000-0000-4000-8000-000000000004', tenant_id, subject_id,
  access_confirmed, disclosures_confirmed, consent_confirmed, booking_ready,
  clinical_authorised, address_confirmed, stock_confirmed, pharmacy_eligible, updated_at
from public.payment_readiness
where workflow_id = 'a0000000-0000-4000-8000-000000000001';

with prepared as (
  select pg_temp.prepare_payment(
    'a0000000-0000-4000-8000-000000000004',
    'bundle',
    'payment_request_bundle',
    'payment_retry_bundle',
    repeat('d', 64),
    0
  ) as result
)
insert into payment_test_orders (label, order_id, workflow_id)
select 'bundle', (result->>'orderId')::uuid, (result->>'workflowId')::uuid from prepared;

select is(
  (select amount_total_minor from public.payment_orders where id = (
    select order_id from payment_test_orders where label = 'bundle'
  )),
  33000,
  'bundle total is derived from three server-owned line snapshots'
);
select is(
  (select count(*)::integer from public.payment_order_lines where order_id = (
    select order_id from payment_test_orders where label = 'bundle'
  )),
  3,
  'bundle preserves consultation, medication and delivery lines'
);

select public.attach_payment_checkout_session(
  '10000000-0000-4000-8000-000000000001',
  (select order_id from payment_test_orders where label = 'bundle'),
  'cs_test_synthetic_bundle_0001',
  '2030-01-01T00:11:00Z'
);
select pg_temp.apply_event(
  'evt_synthetic_bundle_paid_01',
  'checkout.session.async_payment_succeeded',
  (select order_id from payment_test_orders where label = 'bundle'),
  'pi_synthetic_bundle_0001',
  'paid',
  null,
  null,
  repeat('e', 64)
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_partial_refund_01',
      'charge.refunded',
      (select order_id from payment_test_orders where label = 'bundle'),
      'pi_synthetic_bundle_0001',
      null,
      false,
      null,
      repeat('f', 64)
    )->>'reconciliationRequired'
  )::boolean,
  true,
  'partial refund fails closed into reconciliation'
);
select is(
  (
    select count(*)::integer from public.payment_reconciliation_exceptions
    where order_id = (select order_id from payment_test_orders where label = 'bundle')
      and status = 'open'
  ),
  1,
  'reconciliation exception is durable'
);

insert into public.workflow_instances (id, tenant_id, subject_id)
values
  (
    'a0000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    'a0000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    'a0000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  );
insert into public.payment_readiness
select
  targets.workflow_id, source.tenant_id, source.subject_id,
  source.access_confirmed, source.disclosures_confirmed, source.consent_confirmed,
  source.booking_ready, source.clinical_authorised, source.address_confirmed,
  source.stock_confirmed, source.pharmacy_eligible, source.updated_at
from (
  values
    ('a0000000-0000-4000-8000-000000000006'::uuid),
    ('a0000000-0000-4000-8000-000000000007'::uuid),
    ('a0000000-0000-4000-8000-000000000008'::uuid)
) as targets(workflow_id)
cross join lateral (
  select * from public.payment_readiness
  where workflow_id = 'a0000000-0000-4000-8000-000000000001'
) as source;

with scenarios(label, workflow_id, request_id, retry_id, fingerprint) as (
  values
    (
      'failed',
      'a0000000-0000-4000-8000-000000000006'::uuid,
      'payment_request_failed',
      'payment_retry_failed',
      repeat('2', 64)
    ),
    (
      'expired',
      'a0000000-0000-4000-8000-000000000007'::uuid,
      'payment_request_expired',
      'payment_retry_expired',
      repeat('3', 64)
    ),
    (
      'disputed',
      'a0000000-0000-4000-8000-000000000008'::uuid,
      'payment_request_disputed',
      'payment_retry_disputed',
      repeat('4', 64)
    )
), prepared as (
  select
    label,
    workflow_id,
    pg_temp.prepare_payment(
      workflow_id,
      'consultation_only',
      request_id,
      retry_id,
      fingerprint,
      0
    ) as result
  from scenarios
)
insert into payment_test_orders (label, order_id, workflow_id)
select label, (result->>'orderId')::uuid, workflow_id from prepared;

select public.attach_payment_checkout_session(
  '10000000-0000-4000-8000-000000000001',
  (select order_id from payment_test_orders where label = 'failed'),
  'cs_test_synthetic_failed_0001',
  '2030-01-01T00:11:00Z'
);
select public.attach_payment_checkout_session(
  '10000000-0000-4000-8000-000000000001',
  (select order_id from payment_test_orders where label = 'expired'),
  'cs_test_synthetic_expired_0001',
  '2030-01-01T00:11:00Z'
);
select public.attach_payment_checkout_session(
  '10000000-0000-4000-8000-000000000001',
  (select order_id from payment_test_orders where label = 'disputed'),
  'cs_test_synthetic_disputed_0001',
  '2030-01-01T00:11:00Z'
);

select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_async_failed_01',
      'checkout.session.async_payment_failed',
      (select order_id from payment_test_orders where label = 'failed'),
      'pi_synthetic_failed_0001',
      'unpaid',
      null,
      null,
      repeat('5', 64)
    )#>>'{order,status}'
  ),
  'failed',
  'delayed payment failure remains failed'
);
select is(
  (select payment_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'failed'
  )),
  'failed',
  'delayed payment failure updates only the payment projection'
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_recovered_success_01',
      'checkout.session.async_payment_succeeded',
      (select order_id from payment_test_orders where label = 'failed'),
      'pi_synthetic_failed_0001',
      'paid',
      null,
      null,
      repeat('a', 64)
    )#>>'{order,status}'
  ),
  'paid',
  'delayed success can recover an earlier payment failure'
);
select is(
  (select payment_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'failed'
  )),
  'paid',
  'recovered delayed success updates the payment projection'
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_expired_01',
      'checkout.session.expired',
      (select order_id from payment_test_orders where label = 'expired'),
      'pi_synthetic_expired_0001',
      'unpaid',
      null,
      null,
      repeat('6', 64)
    )#>>'{order,status}'
  ),
  'expired',
  'expired Checkout remains unpaid'
);
select is(
  (select payment_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'expired'
  )),
  'failed',
  'expired Checkout records a recoverable failed payment projection'
);

select pg_temp.apply_event(
  'evt_synthetic_dispute_paid_01',
  'checkout.session.completed',
  (select order_id from payment_test_orders where label = 'disputed'),
  'pi_synthetic_disputed_0001',
  'paid',
  null,
  null,
  repeat('7', 64)
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_dispute_open_01',
      'charge.dispute.created',
      (select order_id from payment_test_orders where label = 'disputed'),
      'pi_synthetic_disputed_0001',
      null,
      null,
      null,
      repeat('8', 64)
    )#>>'{order,disputeState}'
  ),
  'open',
  'created dispute records an open dispute without fulfilment inference'
);
select is(
  (
    pg_temp.apply_event(
      'evt_synthetic_dispute_won_01',
      'charge.dispute.closed',
      (select order_id from payment_test_orders where label = 'disputed'),
      'pi_synthetic_disputed_0001',
      null,
      null,
      'won',
      repeat('9', 64)
    )#>>'{order,disputeState}'
  ),
  'won',
  'closed won dispute reconciles to paid without clinical authority'
);
select is(
  (select clinical_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'disputed'
  )),
  'not_started',
  'dispute lifecycle does not alter clinical state'
);
select is(
  (select payment_state from public.workflow_instances where id = (
    select workflow_id from payment_test_orders where label = 'disputed'
  )),
  'paid',
  'won dispute restores only the payment projection'
);
select throws_ok(
  $$select pg_temp.apply_event(
    'evt_synthetic_unknown_order_01',
    'checkout.session.completed',
    'b0000000-0000-4000-8000-000000000099',
    'pi_synthetic_unknown_0001',
    'paid'
  )$$,
  'P0002',
  'PAYMENT_EVENT_ORDER_NOT_FOUND',
  'unmatched provider event is rejected for retry/reconciliation'
);
select ok(
  audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000001'),
  'payment and provider actions preserve the tenant audit chain'
);
select is(
  (
    select count(*)::integer from public.audit_events
    where tenant_id = '10000000-0000-4000-8000-000000000001'
      and action in ('payment.checkout', 'payment.provider')
  ) >= 4,
  true,
  'payment lifecycle emits append-only audit evidence'
);

select * from finish();
rollback;
