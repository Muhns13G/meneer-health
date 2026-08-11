-- Sprint 5.14 one-time Stripe Checkout, payment ledger, and signed webhook reconciliation.
-- No public checkout route, live Stripe key, approved production price, or customer workflow is
-- activated by this migration.

create schema if not exists payments_private;
revoke all on schema payments_private from public, anon, authenticated, service_role;

create table public.payment_price_catalogue (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  scenario text not null,
  line_type text not null,
  description text not null,
  quantity integer not null default 1,
  unit_amount_minor integer not null,
  currency text not null default 'zar',
  tax_treatment text not null,
  terms_version text not null,
  price_version text not null,
  provider_price_id text not null,
  status text not null default 'inactive',
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint payment_price_environment_valid check (environment in ('local', 'production')),
  constraint payment_price_scenario_valid check (
    scenario in ('consultation_only', 'medication_delivery', 'bundle')
  ),
  constraint payment_price_line_type_valid check (
    line_type in ('consultation', 'medication', 'delivery', 'discount', 'adjustment')
  ),
  constraint payment_price_description_safe check (
    description in ('Consultation', 'Medication', 'Delivery', 'Discount', 'Adjustment')
  ),
  constraint payment_price_quantity_valid check (quantity between 1 and 10),
  constraint payment_price_amount_positive check (unit_amount_minor > 0),
  constraint payment_price_currency_zar check (currency = 'zar'),
  constraint payment_price_tax_not_blank check (length(btrim(tax_treatment)) > 0),
  constraint payment_price_terms_not_blank check (length(btrim(terms_version)) > 0),
  constraint payment_price_version_not_blank check (length(btrim(price_version)) > 0),
  constraint payment_price_provider_test check (
    provider_price_id ~ '^price_test_[A-Za-z0-9_]{8,96}$'
  ),
  constraint payment_price_status_valid check (status in ('inactive', 'test_approved', 'retired')),
  constraint payment_price_window_valid check (
    effective_to is null or effective_to > effective_from
  ),
  constraint payment_price_scope_unique unique (
    environment, scenario, line_type, price_version
  ),
  constraint payment_price_provider_unique unique (environment, provider_price_id)
);

create index payment_price_active_scenario_idx
  on public.payment_price_catalogue (environment, scenario, effective_from, effective_to)
  where status = 'test_approved';

create table public.payment_readiness (
  workflow_id uuid primary key references public.workflow_instances (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  access_confirmed boolean not null default false,
  disclosures_confirmed boolean not null default false,
  consent_confirmed boolean not null default false,
  booking_ready boolean not null default false,
  clinical_authorised boolean not null default false,
  address_confirmed boolean not null default false,
  stock_confirmed boolean not null default false,
  pharmacy_eligible boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint payment_readiness_scope_unique unique (tenant_id, workflow_id, subject_id)
);

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  workflow_id uuid not null references public.workflow_instances (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  scenario text not null,
  environment text not null,
  status text not null default 'prepared',
  refund_state text not null default 'not_required',
  dispute_state text not null default 'none',
  currency text not null default 'zar',
  amount_total_minor integer not null,
  terms_version text not null,
  price_version text not null,
  request_id text not null,
  idempotency_key text not null,
  request_fingerprint text not null,
  checkout_session_id text,
  payment_intent_id text,
  version integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  paid_at timestamptz,
  refunded_at timestamptz,
  constraint payment_orders_scenario_valid check (
    scenario in ('consultation_only', 'medication_delivery', 'bundle')
  ),
  constraint payment_orders_environment_valid check (environment in ('local', 'production')),
  constraint payment_orders_status_valid check (
    status in (
      'prepared', 'checkout_open', 'payment_pending', 'paid', 'failed', 'expired',
      'refunded', 'disputed', 'pending_reconciliation'
    )
  ),
  constraint payment_orders_refund_valid check (
    refund_state in ('not_required', 'pending', 'refunded', 'failed')
  ),
  constraint payment_orders_dispute_valid check (dispute_state in ('none', 'open', 'won', 'lost')),
  constraint payment_orders_currency_zar check (currency = 'zar'),
  constraint payment_orders_total_positive check (amount_total_minor > 0),
  constraint payment_orders_request_not_blank check (length(btrim(request_id)) > 0),
  constraint payment_orders_idempotency_not_blank check (length(btrim(idempotency_key)) > 0),
  constraint payment_orders_fingerprint_format check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint payment_orders_checkout_test check (
    checkout_session_id is null or checkout_session_id ~ '^cs_test_[A-Za-z0-9_]{8,120}$'
  ),
  constraint payment_orders_intent_format check (
    payment_intent_id is null or payment_intent_id ~ '^pi_[A-Za-z0-9_]{8,120}$'
  ),
  constraint payment_orders_version_nonnegative check (version >= 0),
  constraint payment_orders_refund_consistent check (
    (status = 'refunded' and refund_state = 'refunded' and refunded_at is not null)
    or (status <> 'refunded' and (refund_state <> 'refunded' or refunded_at is not null))
  ),
  constraint payment_orders_paid_consistent check (
    status not in ('paid', 'refunded', 'disputed') or paid_at is not null
  ),
  constraint payment_orders_idempotency_unique unique (
    tenant_id, environment, idempotency_key
  ),
  constraint payment_orders_request_unique unique (tenant_id, environment, request_id),
  constraint payment_orders_checkout_unique unique (environment, checkout_session_id),
  constraint payment_orders_intent_unique unique (environment, payment_intent_id)
);

create index payment_orders_subject_created_idx
  on public.payment_orders (tenant_id, subject_id, created_at desc);
create index payment_orders_reconciliation_idx
  on public.payment_orders (environment, status, updated_at)
  where status = 'pending_reconciliation';

create table public.payment_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.payment_orders (id) on delete restrict,
  line_type text not null,
  description text not null,
  quantity integer not null,
  unit_amount_minor integer not null,
  total_amount_minor integer not null,
  currency text not null,
  tax_treatment text not null,
  price_version text not null,
  provider_price_id text not null,
  created_at timestamptz not null,
  constraint payment_lines_type_valid check (
    line_type in ('consultation', 'medication', 'delivery', 'discount', 'adjustment')
  ),
  constraint payment_lines_description_safe check (
    description in ('Consultation', 'Medication', 'Delivery', 'Discount', 'Adjustment')
  ),
  constraint payment_lines_quantity_valid check (quantity between 1 and 10),
  constraint payment_lines_amount_positive check (
    unit_amount_minor > 0 and total_amount_minor = quantity * unit_amount_minor
  ),
  constraint payment_lines_currency_zar check (currency = 'zar'),
  constraint payment_lines_provider_test check (
    provider_price_id ~ '^price_test_[A-Za-z0-9_]{8,96}$'
  ),
  constraint payment_lines_order_type_unique unique (order_id, line_type)
);

create index payment_order_lines_order_idx on public.payment_order_lines (order_id, id);

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  order_id uuid not null references public.payment_orders (id) on delete restrict,
  inbox_id uuid not null unique references public.integration_inbox (id) on delete restrict,
  provider text not null,
  environment text not null,
  external_event_id text not null,
  event_type text not null,
  payload_fingerprint text not null,
  outcome text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint payment_events_provider_stripe check (provider = 'stripe'),
  constraint payment_events_environment_valid check (environment in ('local', 'production')),
  constraint payment_events_type_valid check (
    event_type in (
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
      'checkout.session.expired',
      'payment_intent.payment_failed',
      'charge.refunded',
      'charge.dispute.created',
      'charge.dispute.closed'
    )
  ),
  constraint payment_events_fingerprint_format check (payload_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint payment_events_outcome_valid check (
    outcome in ('applied', 'pending_reconciliation')
  ),
  constraint payment_events_provider_unique unique (
    tenant_id, provider, environment, external_event_id
  )
);

create index payment_provider_events_order_recorded_idx
  on public.payment_provider_events (tenant_id, order_id, recorded_at desc);

create table public.payment_reconciliation_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  order_id uuid not null references public.payment_orders (id) on delete restrict,
  provider_event_id uuid references public.payment_provider_events (id) on delete restrict,
  reason_code text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint payment_reconciliation_reason_format check (
    reason_code ~ '^[A-Z][A-Z0-9_]{1,63}$'
  ),
  constraint payment_reconciliation_status_valid check (status in ('open', 'resolved')),
  constraint payment_reconciliation_resolution_consistent check (
    (status = 'resolved' and resolved_at is not null)
    or (status = 'open' and resolved_at is null)
  )
);

create index payment_reconciliation_open_idx
  on public.payment_reconciliation_exceptions (tenant_id, created_at, id)
  where status = 'open';

alter table public.payment_price_catalogue enable row level security;
alter table public.payment_price_catalogue force row level security;
alter table public.payment_readiness enable row level security;
alter table public.payment_readiness force row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_orders force row level security;
alter table public.payment_order_lines enable row level security;
alter table public.payment_order_lines force row level security;
alter table public.payment_provider_events enable row level security;
alter table public.payment_provider_events force row level security;
alter table public.payment_reconciliation_exceptions enable row level security;
alter table public.payment_reconciliation_exceptions force row level security;

revoke all on public.payment_price_catalogue from public, anon, authenticated, service_role;
revoke all on public.payment_readiness from public, anon, authenticated, service_role;
revoke all on public.payment_orders from public, anon, authenticated, service_role;
revoke all on public.payment_order_lines from public, anon, authenticated, service_role;
revoke all on public.payment_provider_events from public, anon, authenticated, service_role;
revoke all on public.payment_reconciliation_exceptions from public, anon, authenticated, service_role;

grant select on public.payment_price_catalogue to service_role;
grant select on public.payment_readiness to service_role;
grant select on public.payment_orders to service_role;
grant select on public.payment_order_lines to service_role;
grant select on public.payment_provider_events to service_role;
grant select on public.payment_reconciliation_exceptions to service_role;

create or replace function payments_private.order_json(
  p_order public.payment_orders,
  p_replayed boolean
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'orderId', p_order.id,
    'tenantId', p_order.tenant_id,
    'workflowId', p_order.workflow_id,
    'subjectId', p_order.subject_id,
    'scenario', p_order.scenario,
    'status', p_order.status,
    'refundState', p_order.refund_state,
    'disputeState', p_order.dispute_state,
    'currency', p_order.currency,
    'amountTotalMinor', p_order.amount_total_minor,
    'termsVersion', p_order.terms_version,
    'priceVersion', p_order.price_version,
    'checkoutSessionId', p_order.checkout_session_id,
    'paymentIntentId', p_order.payment_intent_id,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'lineId', line.id,
        'lineType', line.line_type,
        'description', line.description,
        'quantity', line.quantity,
        'unitAmountMinor', line.unit_amount_minor,
        'totalAmountMinor', line.total_amount_minor,
        'currency', line.currency,
        'taxTreatment', line.tax_treatment,
        'priceVersion', line.price_version,
        'providerPriceId', line.provider_price_id
      ) order by line.id)
      from public.payment_order_lines line
      where line.order_id = p_order.id
    ), '[]'::jsonb),
    'replayed', p_replayed
  ));
$$;

revoke all on function payments_private.order_json(public.payment_orders, boolean)
from public, anon, authenticated, service_role;

create or replace function public.prepare_payment_checkout(
  p_tenant_id uuid,
  p_workflow_id uuid,
  p_subject_id uuid,
  p_scenario text,
  p_environment text,
  p_request_id text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_expected_version integer,
  p_occurred_at timestamptz,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_policy_version text,
  p_correlation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.payment_orders%rowtype;
  workflow public.workflow_instances%rowtype;
  readiness public.payment_readiness%rowtype;
  new_order public.payment_orders%rowtype;
  inserted_rows integer := 0;
  line_count integer;
  amount_total integer;
  selected_terms text;
  selected_version text;
  selected_types text[];
begin
  if p_scenario not in ('consultation_only', 'medication_delivery', 'bundle')
    or p_environment not in ('local', 'production')
    or p_actor_role <> 'patient'
    or p_actor_subject_id <> p_subject_id
    or p_assurance not in ('aal1', 'aal2')
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
    or p_expected_version < 0
    or length(btrim(p_policy_version)) = 0
    or length(btrim(p_correlation_id)) = 0
  then
    raise exception using errcode = '22023', message = 'PAYMENT_CHECKOUT_VALIDATION_FAILED';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_tenant_id::text || '|' || p_environment || '|' || p_idempotency_key, 0)
  );

  select * into existing_order
  from public.payment_orders
  where tenant_id = p_tenant_id
    and environment = p_environment
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    if existing_order.request_fingerprint <> p_request_fingerprint
      or existing_order.workflow_id <> p_workflow_id
      or existing_order.subject_id <> p_subject_id
      or existing_order.scenario <> p_scenario
    then
      raise exception using errcode = '23505', message = 'PAYMENT_CHECKOUT_IDEMPOTENCY_CONFLICT';
    end if;
    return payments_private.order_json(existing_order, true);
  end if;

  select * into workflow
  from public.workflow_instances
  where id = p_workflow_id and tenant_id = p_tenant_id and subject_id = p_subject_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_WORKFLOW_NOT_FOUND';
  end if;
  if workflow.version <> p_expected_version
    or workflow.payment_state not in ('not_started', 'failed')
    or workflow.cancellation_state = 'cancelled'
  then
    raise exception using errcode = '23514', message = 'PAYMENT_WORKFLOW_CONFLICT';
  end if;

  select * into readiness
  from public.payment_readiness
  where workflow_id = p_workflow_id
    and tenant_id = p_tenant_id
    and subject_id = p_subject_id;
  if not found
    or not readiness.access_confirmed
    or not readiness.disclosures_confirmed
    or not readiness.consent_confirmed
    or (p_scenario = 'consultation_only' and not readiness.booking_ready)
    or (
      p_scenario in ('medication_delivery', 'bundle')
      and (
        not readiness.clinical_authorised
        or not readiness.address_confirmed
        or not readiness.stock_confirmed
        or not readiness.pharmacy_eligible
      )
    )
  then
    raise exception using errcode = '42501', message = 'PAYMENT_READINESS_NOT_APPROVED';
  end if;

  select
    count(*),
    sum(quantity * unit_amount_minor)::integer,
    min(terms_version),
    min(price_version),
    array_agg(line_type order by line_type)
  into line_count, amount_total, selected_terms, selected_version, selected_types
  from public.payment_price_catalogue
  where environment = p_environment
    and scenario = p_scenario
    and status = 'test_approved'
    and effective_from <= p_occurred_at
    and (effective_to is null or effective_to > p_occurred_at);

  if line_count = 0
    or amount_total is null
    or amount_total <= 0
    or selected_terms is null
    or selected_version is null
    or (p_scenario = 'consultation_only' and selected_types <> array['consultation'])
    or (p_scenario = 'medication_delivery' and selected_types <> array['delivery', 'medication'])
    or (p_scenario = 'bundle' and selected_types <> array['consultation', 'delivery', 'medication'])
    or exists (
      select 1 from public.payment_price_catalogue
      where environment = p_environment
        and scenario = p_scenario
        and status = 'test_approved'
        and effective_from <= p_occurred_at
        and (effective_to is null or effective_to > p_occurred_at)
        and (terms_version <> selected_terms or price_version <> selected_version)
    )
  then
    raise exception using errcode = '42501', message = 'PAYMENT_PRICE_NOT_APPROVED';
  end if;

  insert into public.payment_orders (
    tenant_id, workflow_id, subject_id, scenario, environment, amount_total_minor,
    terms_version, price_version, request_id, idempotency_key, request_fingerprint,
    created_at, updated_at
  ) values (
    p_tenant_id, p_workflow_id, p_subject_id, p_scenario, p_environment, amount_total,
    selected_terms, selected_version, p_request_id, p_idempotency_key, p_request_fingerprint,
    p_occurred_at, p_occurred_at
  )
  returning * into new_order;
  get diagnostics inserted_rows = row_count;

  insert into public.payment_order_lines (
    order_id, line_type, description, quantity, unit_amount_minor, total_amount_minor,
    currency, tax_treatment, price_version, provider_price_id, created_at
  )
  select
    new_order.id, line_type, description, quantity, unit_amount_minor,
    quantity * unit_amount_minor, currency, tax_treatment, price_version, provider_price_id,
    p_occurred_at
  from public.payment_price_catalogue
  where environment = p_environment
    and scenario = p_scenario
    and status = 'test_approved'
    and effective_from <= p_occurred_at
    and (effective_to is null or effective_to > p_occurred_at)
  order by line_type;

  perform audit_private.append_audit_fact(
    p_tenant_id, 'patient', p_actor_subject_id, p_actor_role, p_assurance,
    'payment.checkout', p_subject_id, 'payment', new_order.id::text, 'self_service',
    p_policy_version, 'succeeded', 'PAYMENT_ORDER_PREPARED', p_correlation_id,
    p_request_id, p_occurred_at, jsonb_build_object('eventName', 'payment.checkout.prepared')
  );

  return payments_private.order_json(new_order, inserted_rows = 0);
end;
$$;

create or replace function public.attach_payment_checkout_session(
  p_tenant_id uuid,
  p_order_id uuid,
  p_checkout_session_id text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_order public.payment_orders%rowtype;
begin
  if p_checkout_session_id !~ '^cs_test_[A-Za-z0-9_]{8,120}$' then
    raise exception using errcode = '22023', message = 'PAYMENT_SESSION_VALIDATION_FAILED';
  end if;
  select * into payment_order from public.payment_orders
  where id = p_order_id and tenant_id = p_tenant_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_ORDER_NOT_FOUND';
  end if;
  if payment_order.checkout_session_id is not null
    and payment_order.checkout_session_id <> p_checkout_session_id
  then
    raise exception using errcode = '23505', message = 'PAYMENT_SESSION_CONFLICT';
  end if;
  if payment_order.status not in ('prepared', 'checkout_open') then
    raise exception using errcode = '23514', message = 'PAYMENT_ORDER_STATE_CONFLICT';
  end if;

  update public.payment_orders
  set checkout_session_id = p_checkout_session_id,
      status = 'checkout_open',
      version = case when checkout_session_id is null then version + 1 else version end,
      updated_at = p_occurred_at
  where id = p_order_id
  returning * into payment_order;

  update public.workflow_instances
  set payment_state = 'pending', version = version + 1, updated_at = p_occurred_at
  where id = payment_order.workflow_id and payment_state in ('not_started', 'failed');

  return payments_private.order_json(payment_order, false);
end;
$$;

create or replace function public.apply_payment_provider_event(
  p_service_identity_id uuid,
  p_environment text,
  p_external_event_id text,
  p_event_type text,
  p_order_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_payment_status text,
  p_refund_complete boolean,
  p_dispute_outcome text,
  p_payload_fingerprint text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_order public.payment_orders%rowtype;
  inbox_receipt jsonb;
  provider_event public.payment_provider_events%rowtype;
  event_outcome text := 'applied';
  reconciliation_required boolean := false;
  reason_code text;
begin
  if p_environment not in ('local', 'production')
    or p_external_event_id !~ '^evt_[A-Za-z0-9_]{8,120}$'
    or p_event_type not in (
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
      'checkout.session.expired',
      'payment_intent.payment_failed',
      'charge.refunded',
      'charge.dispute.created',
      'charge.dispute.closed'
    )
    or p_payload_fingerprint !~ '^[a-f0-9]{64}$'
    or (p_order_id is null and p_payment_intent_id is null)
  then
    raise exception using errcode = '22023', message = 'PAYMENT_EVENT_VALIDATION_FAILED';
  end if;

  select * into payment_order
  from public.payment_orders
  where environment = p_environment
    and (
      (p_order_id is not null and id = p_order_id)
      or (p_payment_intent_id is not null and payment_intent_id = p_payment_intent_id)
    )
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'PAYMENT_EVENT_ORDER_NOT_FOUND';
  end if;
  if not exists (
    select 1 from public.service_identities
    where id = p_service_identity_id
      and tenant_id = payment_order.tenant_id
      and environment = p_environment
      and purpose = 'operations'
      and status = 'active'
      and (expires_at is null or expires_at > p_occurred_at)
      and exists (
        select 1 from public.service_identity_scopes scope
        where scope.service_identity_id = p_service_identity_id
          and scope.resource = 'payment'
          and scope.action = 'append'
      )
      and exists (
        select 1 from public.service_identity_scopes scope
        where scope.service_identity_id = p_service_identity_id
          and scope.resource = 'payment'
          and scope.action = 'update'
      )
  ) then
    raise exception using errcode = '42501', message = 'PAYMENT_EVENT_SERVICE_FORBIDDEN';
  end if;
  if p_checkout_session_id is not null
    and payment_order.checkout_session_id is not null
    and p_checkout_session_id <> payment_order.checkout_session_id
  then
    raise exception using errcode = '23505', message = 'PAYMENT_EVENT_SESSION_CONFLICT';
  end if;

  inbox_receipt := public.record_integration_inbox(
    payment_order.tenant_id,
    'stripe',
    p_environment,
    p_external_event_id,
    p_payload_fingerprint,
    p_external_event_id,
    p_service_identity_id,
    p_occurred_at,
    jsonb_build_object('eventName', 'payment.provider.received')
  );
  if (inbox_receipt->>'replayed')::boolean then
    select * into provider_event from public.payment_provider_events
    where tenant_id = payment_order.tenant_id
      and provider = 'stripe'
      and environment = p_environment
      and external_event_id = p_external_event_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'PAYMENT_EVENT_RETRY_REQUIRED';
    end if;
    return jsonb_build_object(
      'order', payments_private.order_json(payment_order, true),
      'eventId', provider_event.id,
      'replayed', true,
      'reconciliationRequired', provider_event.outcome = 'pending_reconciliation'
    );
  end if;

  if p_payment_intent_id is not null then
    if payment_order.payment_intent_id is not null
      and payment_order.payment_intent_id <> p_payment_intent_id
    then
      reconciliation_required := true;
      reason_code := 'PAYMENT_INTENT_CONFLICT';
    else
      payment_order.payment_intent_id := p_payment_intent_id;
    end if;
  end if;

  if not reconciliation_required then
    case p_event_type
      when 'checkout.session.completed' then
        if payment_order.status in ('refunded', 'disputed', 'pending_reconciliation') then
          reconciliation_required := true;
          reason_code := 'PAYMENT_TERMINAL_STATE_CONFLICT';
        elsif p_payment_status = 'paid' then
          payment_order.status := 'paid';
          payment_order.paid_at := coalesce(payment_order.paid_at, p_occurred_at);
        elsif payment_order.status <> 'paid' then
          payment_order.status := 'payment_pending';
        end if;
      when 'checkout.session.async_payment_succeeded' then
        if payment_order.status in ('refunded', 'disputed', 'pending_reconciliation') then
          reconciliation_required := true;
          reason_code := 'PAYMENT_TERMINAL_STATE_CONFLICT';
        else
          payment_order.status := 'paid';
          payment_order.paid_at := coalesce(payment_order.paid_at, p_occurred_at);
        end if;
      when 'checkout.session.async_payment_failed' then
        if payment_order.status not in ('paid', 'refunded', 'disputed') then
          payment_order.status := 'failed';
        end if;
      when 'payment_intent.payment_failed' then
        if payment_order.status not in ('paid', 'refunded', 'disputed') then
          payment_order.status := 'failed';
        end if;
      when 'checkout.session.expired' then
        if payment_order.status not in ('paid', 'refunded', 'disputed') then
          payment_order.status := 'expired';
        end if;
      when 'charge.refunded' then
        if p_refund_complete is true and payment_order.paid_at is not null then
          payment_order.status := 'refunded';
          payment_order.refund_state := 'refunded';
          payment_order.refunded_at := p_occurred_at;
        else
          reconciliation_required := true;
          reason_code := 'PARTIAL_OR_UNMATCHED_REFUND';
        end if;
      when 'charge.dispute.created' then
        if payment_order.paid_at is not null and payment_order.status in ('paid', 'disputed') then
          payment_order.status := 'disputed';
          payment_order.dispute_state := 'open';
        else
          reconciliation_required := true;
          reason_code := 'UNMATCHED_DISPUTE';
        end if;
      when 'charge.dispute.closed' then
        if payment_order.paid_at is null
          or payment_order.status in ('refunded', 'pending_reconciliation')
        then
          reconciliation_required := true;
          reason_code := 'UNMATCHED_DISPUTE';
        elsif p_dispute_outcome = 'won' then
          payment_order.status := 'paid';
          payment_order.dispute_state := 'won';
        elsif p_dispute_outcome = 'lost' then
          payment_order.status := 'disputed';
          payment_order.dispute_state := 'lost';
        elsif p_dispute_outcome = 'warning_closed' then
          payment_order.status := 'paid';
          payment_order.dispute_state := 'won';
        else
          reconciliation_required := true;
          reason_code := 'DISPUTE_OUTCOME_UNKNOWN';
        end if;
    end case;
  end if;

  if reconciliation_required then
    payment_order.status := 'pending_reconciliation';
    event_outcome := 'pending_reconciliation';
  end if;
  payment_order.version := payment_order.version + 1;
  payment_order.updated_at := p_occurred_at;

  update public.payment_orders set
    status = payment_order.status,
    refund_state = payment_order.refund_state,
    dispute_state = payment_order.dispute_state,
    checkout_session_id = coalesce(checkout_session_id, p_checkout_session_id),
    payment_intent_id = payment_order.payment_intent_id,
    version = payment_order.version,
    updated_at = payment_order.updated_at,
    paid_at = payment_order.paid_at,
    refunded_at = payment_order.refunded_at
  where id = payment_order.id
  returning * into payment_order;

  if payment_order.status = 'paid' then
    update public.workflow_instances
    set payment_state = 'paid', version = version + 1, updated_at = p_occurred_at
    where id = payment_order.workflow_id and payment_state in ('pending', 'failed', 'disputed');
  elsif payment_order.status in ('failed', 'expired') then
    update public.workflow_instances
    set payment_state = 'failed', version = version + 1, updated_at = p_occurred_at
    where id = payment_order.workflow_id and payment_state = 'pending';
  elsif payment_order.status = 'refunded' then
    update public.workflow_instances
    set payment_state = 'refunded', refund_state = 'refunded', version = version + 1,
        updated_at = p_occurred_at
    where id = payment_order.workflow_id and payment_state = 'paid';
  elsif payment_order.status = 'disputed' then
    update public.workflow_instances
    set payment_state = 'disputed', version = version + 1, updated_at = p_occurred_at
    where id = payment_order.workflow_id and payment_state in ('paid', 'disputed');
  end if;

  insert into public.payment_provider_events (
    tenant_id, order_id, inbox_id, provider, environment, external_event_id, event_type,
    payload_fingerprint, outcome, occurred_at
  ) values (
    payment_order.tenant_id, payment_order.id, (inbox_receipt->>'inboxId')::uuid, 'stripe',
    p_environment, p_external_event_id, p_event_type, p_payload_fingerprint, event_outcome,
    p_occurred_at
  ) returning * into provider_event;

  if reconciliation_required then
    insert into public.payment_reconciliation_exceptions (
      tenant_id, order_id, provider_event_id, reason_code
    ) values (
      payment_order.tenant_id, payment_order.id, provider_event.id, reason_code
    );
  end if;

  perform audit_private.append_audit_fact(
    payment_order.tenant_id, 'service', p_service_identity_id, 'service_identity', 'service',
    'payment.provider', payment_order.subject_id, 'payment', payment_order.id::text,
    'operations', 'payment.v1', 'succeeded',
    case when reconciliation_required then 'PAYMENT_RECONCILIATION_REQUIRED' else 'PAYMENT_EVENT_APPLIED' end,
    p_external_event_id, p_external_event_id, p_occurred_at,
    jsonb_build_object(
      'eventName', 'payment.provider.applied',
      'provider', 'stripe',
      'environment', p_environment
    )
  );

  return jsonb_build_object(
    'order', payments_private.order_json(payment_order, false),
    'eventId', provider_event.id,
    'replayed', false,
    'reconciliationRequired', reconciliation_required
  );
end;
$$;

revoke all on function public.prepare_payment_checkout(
  uuid, uuid, uuid, text, text, text, text, text, integer, timestamptz, uuid, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.attach_payment_checkout_session(uuid, uuid, text, timestamptz)
from public, anon, authenticated;
revoke all on function public.apply_payment_provider_event(
  uuid, text, text, text, uuid, text, text, text, boolean, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.prepare_payment_checkout(
  uuid, uuid, uuid, text, text, text, text, text, integer, timestamptz, uuid, text, text, text, text
) to service_role;
grant execute on function public.attach_payment_checkout_session(uuid, uuid, text, timestamptz)
to service_role;
grant execute on function public.apply_payment_provider_event(
  uuid, text, text, text, uuid, text, text, text, boolean, text, text, timestamptz
) to service_role;
