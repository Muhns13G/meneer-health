begin;
select plan(36);

select has_table('public', 'fulfilment_provider_gates', 'provider gates exist');
select has_table('public', 'fulfilment_service_bindings', 'service/provider bindings exist');
select has_table('public', 'fulfilment_cases', 'minimum-data fulfilment cases exist');
select has_table('public', 'fulfilment_partner_events', 'partner event ledger exists');

select is(
  (select relrowsecurity from pg_class where oid = 'public.fulfilment_cases'::regclass),
  true,
  'fulfilment cases have RLS enabled'
);
select is(
  (select relforcerowsecurity from pg_class where oid = 'public.fulfilment_partner_events'::regclass),
  true,
  'partner events force RLS'
);
select is(
  has_table_privilege('anon', 'public.fulfilment_cases', 'SELECT'),
  false,
  'anonymous role cannot read fulfilment cases'
);
select is(
  has_table_privilege('authenticated', 'public.fulfilment_partner_events', 'INSERT'),
  false,
  'browser identity cannot fabricate partner events'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.apply_fulfilment_partner_event(uuid,text,text,text,text,uuid,text,text,timestamptz)',
    'EXECUTE'
  ),
  false,
  'browser identity cannot invoke the partner event RPC'
);
select is(
  (select count(*)::integer from public.fulfilment_provider_gates where environment = 'local' and mode = 'synthetic'),
  4,
  'all local provider boundaries are synthetic-only'
);
select is(
  (select count(*)::integer from public.fulfilment_provider_gates where environment <> 'local' and mode <> 'disabled'),
  0,
  'preview and production provider gates remain disabled'
);
select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('fulfilment_cases', 'fulfilment_partner_events')
      and column_name in (
        'name', 'email', 'phone', 'address', 'tracking_number', 'questionnaire_response',
        'symptom', 'diagnosis', 'prescription', 'raw_body', 'payload'
      )
  ),
  0,
  'fulfilment persistence contains no direct contact, health, address, tracking or raw payload fields'
);

update public.workflow_instances
set clinical_state = 'approved',
    payment_state = 'paid',
    supply_state = 'available',
    hub_receipt_state = 'pending',
    dispatch_state = 'not_ready',
    updated_at = '2030-01-01T00:05:00Z'
where id = 'a0000000-0000-4000-8000-000000000002';

create or replace function pg_temp.apply_partner_event(
  p_provider text,
  p_external_event_id text,
  p_event_type text,
  p_workflow_id uuid default 'a0000000-0000-4000-8000-000000000002',
  p_fingerprint text default repeat('a', 64)
)
returns jsonb
language sql
as $$
  select public.apply_fulfilment_partner_event(
    '80000000-0000-4000-8000-000000000001',
    p_provider,
    'local',
    p_external_event_id,
    p_event_type,
    p_workflow_id,
    encode(extensions.digest(convert_to(p_external_event_id, 'UTF8'), 'sha256'), 'hex'),
    p_fingerprint,
    '2030-01-01T00:10:00Z'
  );
$$;

select is(
  (pg_temp.apply_partner_event(
    'precise_wellness', 'synthetic_pathway_01', 'pathway.handoff.accepted'
  )->>'applied')::boolean,
  true,
  'Precise Wellness hand-off acknowledgement is applied without questionnaire data'
);
select is(
  (select reconciliation_code from public.fulfilment_cases where workflow_id = 'a0000000-0000-4000-8000-000000000002'),
  'PHARMACY_NOT_RELEASED',
  'pathway acknowledgement does not imply pharmacy release'
);
select is(
  (pg_temp.apply_partner_event(
    'dispensing_pharmacy', 'synthetic_pharmacy_01', 'pharmacy.release.confirmed'
  )->'fulfilment'->>'pharmacyReleaseState'),
  'released',
  'pharmacy release is recorded independently after prerequisites pass'
);
select is(
  (select reconciliation_code from public.fulfilment_cases where workflow_id = 'a0000000-0000-4000-8000-000000000002'),
  'HUB_NOT_RECEIVED',
  'pharmacy release does not imply hub custody'
);
select is(
  (pg_temp.apply_partner_event(
    'meneer_hub', 'synthetic_hub_01', 'hub.receipt.confirmed'
  )->'fulfilment'->>'reconciliationState'),
  'matched',
  'hub receipt reconciles all independent fulfilment prerequisites'
);
select isnt(
  (select eligible_for_fulfilment_at::text from public.fulfilment_cases where workflow_id = 'a0000000-0000-4000-8000-000000000002'),
  null,
  'eligibility clock starts only after pathway, clinical, payment, supply, pharmacy and hub evidence'
);

update public.workflow_instances
set dispatch_state = 'ready'
where id = 'a0000000-0000-4000-8000-000000000002';

select is(
  (pg_temp.apply_partner_event(
    'courier', 'synthetic_dispatch_01', 'courier.dispatch.confirmed'
  )->'fulfilment'->>'courierState'),
  'dispatched',
  'courier hand-off requires explicit dispatch readiness'
);
select is(
  (select dispatch_state from public.workflow_instances where id = 'a0000000-0000-4000-8000-000000000002'),
  'dispatched',
  'courier dispatch evidence updates the operational workflow projection'
);
select is(
  (pg_temp.apply_partner_event(
    'courier', 'synthetic_delivery_01', 'courier.delivery.confirmed'
  )->'fulfilment'->>'courierState'),
  'delivered',
  'delivery evidence remains distinct from dispatch'
);
select is(
  (select delivery_state from public.workflow_instances where id = 'a0000000-0000-4000-8000-000000000002'),
  'delivered',
  'verified delivery updates the durable workflow projection'
);
select is(
  (pg_temp.apply_partner_event(
    'courier', 'synthetic_delivery_01', 'courier.delivery.confirmed'
  )->>'replayed')::boolean,
  true,
  'duplicate provider delivery replays the durable result'
);
select throws_ok(
  $$select pg_temp.apply_partner_event(
    'courier', 'synthetic_delivery_01', 'courier.delivery.confirmed',
    'a0000000-0000-4000-8000-000000000002', repeat('b', 64)
  )$$,
  '23505',
  'FULFILMENT_EVENT_REPLAY_CONFLICT',
  'changed duplicate payload is rejected'
);
select throws_ok(
  $$select pg_temp.apply_partner_event(
    'courier', 'synthetic_mismatch_01', 'pharmacy.release.confirmed'
  )$$,
  '22023',
  'FULFILMENT_EVENT_VALIDATION_FAILED',
  'provider cannot cross its declared event boundary'
);

select is(
  (pg_temp.apply_partner_event(
    'courier', 'synthetic_out_of_order_01', 'courier.delivery.confirmed',
    'a0000000-0000-4000-8000-000000000003'
  )->>'applied')::boolean,
  false,
  'out-of-order delivery is retained for reconciliation without claiming success'
);
select is(
  (
    select status from public.fulfilment_partner_events
    where external_event_id = 'synthetic_out_of_order_01'
  ),
  'pending_reconciliation',
  'out-of-order event enters the reconciliation queue'
);

insert into public.fulfilment_cases (
  tenant_id, workflow_id, pathway_handoff_state, pharmacy_release_state, hub_custody_state,
  reconciliation_state, reconciliation_code, eligible_for_fulfilment_at
)
values (
  '10000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003',
  'accepted', 'released', 'received', 'matched', 'NONE', '2030-01-01T00:20:00Z'
)
on conflict (tenant_id, workflow_id) do update set
  pathway_handoff_state = excluded.pathway_handoff_state,
  pharmacy_release_state = excluded.pharmacy_release_state,
  hub_custody_state = excluded.hub_custody_state,
  reconciliation_state = excluded.reconciliation_state,
  reconciliation_code = excluded.reconciliation_code,
  eligible_for_fulfilment_at = excluded.eligible_for_fulfilment_at;

update public.workflow_instances
set clinical_state = 'approved', payment_state = 'paid', supply_state = 'available',
    hub_receipt_state = 'received', cancellation_state = 'cancelled', refund_state = 'not_required',
    updated_at = '2030-01-01T00:21:00Z'
where id = 'a0000000-0000-4000-8000-000000000003';

select is(
  (select reconciliation_code from public.fulfilment_cases where workflow_id = 'a0000000-0000-4000-8000-000000000003'),
  'REFUND_REQUIRED',
  'paid cancellation automatically enters refund reconciliation'
);
select is(
  (select eligible_for_fulfilment_at::text from public.fulfilment_cases where workflow_id = 'a0000000-0000-4000-8000-000000000003'),
  null,
  'cancellation stops fulfilment eligibility without erasing history'
);

update public.workflow_instances
set payment_state = 'refunded', refund_state = 'refunded', updated_at = '2030-01-01T00:22:00Z'
where id = 'a0000000-0000-4000-8000-000000000003';

select is(
  (select reconciliation_state from public.fulfilment_cases where workflow_id = 'a0000000-0000-4000-8000-000000000003'),
  'matched',
  'completed refund resolves the cancellation mismatch'
);
select is(
  (select reconciliation_code from public.fulfilment_cases where workflow_id = 'a0000000-0000-4000-8000-000000000003'),
  'NONE',
  'resolved cancellation and refund retain no false exception'
);

select is(
  (
    select count(*)::integer from public.integration_inbox
    where provider in ('precise_wellness', 'dispensing_pharmacy', 'meneer_hub', 'courier')
  ),
  6,
  'each unique valid partner event has inbox evidence'
);
select is(
  (
    select count(*)::integer from public.audit_events
    where action in ('fulfilment.event.applied', 'fulfilment.event.deferred')
  ),
  6,
  'each unique valid partner event has append-only audit evidence'
);
select is(
  (
    select count(*)::integer from public.integration_outbox
    where event_name in ('fulfilment.partner.applied', 'fulfilment.reconciliation.required')
  ),
  6,
  'each unique valid partner event has a transactional outbox fact'
);
select is(
  (
    select count(*)::integer from public.fulfilment_partner_events
    where provider_reference_digest !~ '^[a-f0-9]{64}$'
      or payload_fingerprint !~ '^[a-f0-9]{64}$'
  ),
  0,
  'partner ledger stores only digests and fingerprints for external evidence'
);
select is(
  (
    select count(*)::integer from public.fulfilment_service_bindings
    where service_identity_id = '80000000-0000-4000-8000-000000000001'
      and environment = 'local'
  ),
  4,
  'synthetic service identity is explicitly bound to each local partner simulator'
);

select * from finish();
rollback;
