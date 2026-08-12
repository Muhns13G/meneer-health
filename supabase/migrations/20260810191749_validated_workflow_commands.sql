-- Sprint 5.9 validated workflow commands. The tables and command function remain server-only;
-- no customer route or browser role is activated by this migration.

create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  version integer not null default 0,
  clinical_state text not null default 'not_started',
  payment_state text not null default 'not_started',
  supply_state text not null default 'not_started',
  hub_receipt_state text not null default 'not_started',
  dispatch_state text not null default 'not_ready',
  delivery_state text not null default 'not_started',
  cancellation_state text not null default 'active',
  refund_state text not null default 'not_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_instances_version_nonnegative check (version >= 0),
  constraint workflow_instances_clinical_state_valid check (
    clinical_state in ('not_started', 'under_review', 'approved', 'rejected')
  ),
  constraint workflow_instances_payment_state_valid check (
    payment_state in ('not_started', 'pending', 'paid', 'failed', 'refunded', 'disputed')
  ),
  constraint workflow_instances_supply_state_valid check (
    supply_state in ('not_started', 'pending', 'available', 'unavailable')
  ),
  constraint workflow_instances_hub_receipt_state_valid check (
    hub_receipt_state in ('not_started', 'pending', 'received', 'rejected')
  ),
  constraint workflow_instances_dispatch_state_valid check (
    dispatch_state in ('not_ready', 'ready', 'dispatched', 'blocked')
  ),
  constraint workflow_instances_delivery_state_valid check (
    delivery_state in ('not_started', 'in_transit', 'delivered', 'failed')
  ),
  constraint workflow_instances_cancellation_state_valid check (
    cancellation_state in ('active', 'requested', 'cancelled', 'declined')
  ),
  constraint workflow_instances_refund_state_valid check (
    refund_state in ('not_required', 'pending', 'refunded', 'failed')
  ),
  constraint workflow_instances_dispatch_prerequisites check (
    dispatch_state <> 'dispatched'
    or (
      clinical_state = 'approved'
      and payment_state = 'paid'
      and supply_state = 'available'
      and hub_receipt_state = 'received'
      and cancellation_state <> 'cancelled'
    )
  ),
  constraint workflow_instances_delivery_prerequisite check (
    delivery_state = 'not_started' or dispatch_state = 'dispatched'
  ),
  constraint workflow_instances_refund_consistent check (
    (refund_state = 'refunded' and payment_state = 'refunded')
    or (refund_state <> 'refunded' and payment_state <> 'refunded')
  )
);

create index workflow_instances_subject_tenant_idx
  on public.workflow_instances (subject_id, tenant_id);

create table public.command_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  command_name text not null,
  request_id text not null,
  idempotency_key text not null,
  request_fingerprint text not null,
  aggregate_id uuid not null,
  status text not null default 'processing',
  response_body jsonb,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  constraint command_receipts_name_not_blank check (length(btrim(command_name)) > 0),
  constraint command_receipts_request_id_not_blank check (length(btrim(request_id)) > 0),
  constraint command_receipts_idempotency_key_not_blank check (
    length(btrim(idempotency_key)) > 0
  ),
  constraint command_receipts_fingerprint_format check (
    request_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint command_receipts_status_valid check (status in ('processing', 'committed')),
  constraint command_receipts_commit_consistent check (
    (status = 'committed' and response_body is not null and committed_at is not null)
    or (status = 'processing' and response_body is null and committed_at is null)
  ),
  constraint command_receipts_idempotency_unique unique (
    tenant_id,
    command_name,
    idempotency_key
  ),
  constraint command_receipts_request_unique unique (tenant_id, request_id)
);

create index command_receipts_aggregate_created_idx
  on public.command_receipts (tenant_id, aggregate_id, created_at desc);

alter table public.workflow_instances enable row level security;
alter table public.workflow_instances force row level security;
alter table public.command_receipts enable row level security;
alter table public.command_receipts force row level security;

revoke all on public.workflow_instances from public, anon, authenticated, service_role;
revoke all on public.command_receipts from public, anon, authenticated, service_role;

grant select on public.workflow_instances to service_role;
grant select on public.command_receipts to service_role;

create or replace function public.execute_workflow_transition(
  p_tenant_id uuid,
  p_workflow_id uuid,
  p_command_name text,
  p_request_id text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_expected_version integer,
  p_transition text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_rows integer := 0;
  existing_receipt public.command_receipts%rowtype;
  workflow public.workflow_instances%rowtype;
  result jsonb;
begin
  if p_command_name <> 'workflow.transition'
    or p_expected_version < 0
    or p_request_fingerprint !~ '^[a-f0-9]{64}$'
  then
    raise exception using errcode = '22023', message = 'COMMAND_VALIDATION_FAILED';
  end if;

  insert into public.command_receipts (
    tenant_id,
    command_name,
    request_id,
    idempotency_key,
    request_fingerprint,
    aggregate_id
  )
  values (
    p_tenant_id,
    p_command_name,
    p_request_id,
    p_idempotency_key,
    p_request_fingerprint,
    p_workflow_id
  )
  on conflict (tenant_id, command_name, idempotency_key) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows = 0 then
    select *
    into existing_receipt
    from public.command_receipts
    where tenant_id = p_tenant_id
      and command_name = p_command_name
      and idempotency_key = p_idempotency_key
    for update;

    if existing_receipt.request_fingerprint <> p_request_fingerprint
      or existing_receipt.aggregate_id <> p_workflow_id
    then
      raise exception using errcode = '23505', message = 'COMMAND_IDEMPOTENCY_CONFLICT';
    end if;

    if existing_receipt.status = 'committed' then
      return jsonb_set(existing_receipt.response_body, '{replayed}', 'true'::jsonb, true);
    end if;

    raise exception using errcode = 'P0001', message = 'COMMAND_RETRY_REQUIRED';
  end if;

  select *
  into workflow
  from public.workflow_instances
  where tenant_id = p_tenant_id and id = p_workflow_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'COMMAND_RESOURCE_NOT_FOUND';
  end if;

  if workflow.version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'COMMAND_VERSION_CONFLICT';
  end if;

  case p_transition
    when 'clinical.start_review' then
      if workflow.clinical_state <> 'not_started' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.clinical_state := 'under_review';
    when 'clinical.approve' then
      if workflow.clinical_state <> 'under_review' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.clinical_state := 'approved';
    when 'clinical.reject' then
      if workflow.clinical_state <> 'under_review' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.clinical_state := 'rejected';
    when 'payment.start' then
      if workflow.payment_state not in ('not_started', 'failed') then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.payment_state := 'pending';
    when 'payment.confirm' then
      if workflow.payment_state <> 'pending' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.payment_state := 'paid';
    when 'payment.fail' then
      if workflow.payment_state <> 'pending' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.payment_state := 'failed';
    when 'supply.request' then
      if workflow.supply_state <> 'not_started' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.supply_state := 'pending';
    when 'supply.confirm' then
      if workflow.supply_state <> 'pending' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.supply_state := 'available';
    when 'supply.reject' then
      if workflow.supply_state <> 'pending' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.supply_state := 'unavailable';
    when 'hub.expect' then
      if workflow.hub_receipt_state <> 'not_started' or workflow.supply_state <> 'available' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.hub_receipt_state := 'pending';
    when 'hub.receive' then
      if workflow.hub_receipt_state <> 'pending' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.hub_receipt_state := 'received';
    when 'hub.reject' then
      if workflow.hub_receipt_state <> 'pending' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.hub_receipt_state := 'rejected';
    when 'dispatch.ready' then
      if workflow.dispatch_state <> 'not_ready'
        or workflow.clinical_state <> 'approved'
        or workflow.payment_state <> 'paid'
        or workflow.supply_state <> 'available'
        or workflow.hub_receipt_state <> 'received'
        or workflow.cancellation_state = 'cancelled'
      then
        raise exception using errcode = '23514', message = 'COMMAND_PREREQUISITES_NOT_MET';
      end if;
      workflow.dispatch_state := 'ready';
    when 'dispatch.send' then
      if workflow.dispatch_state <> 'ready' or workflow.cancellation_state = 'cancelled' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.dispatch_state := 'dispatched';
    when 'delivery.start' then
      if workflow.dispatch_state <> 'dispatched' or workflow.delivery_state <> 'not_started' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.delivery_state := 'in_transit';
    when 'delivery.confirm' then
      if workflow.delivery_state <> 'in_transit' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.delivery_state := 'delivered';
    when 'delivery.fail' then
      if workflow.delivery_state <> 'in_transit' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.delivery_state := 'failed';
    when 'cancellation.request' then
      if workflow.cancellation_state <> 'active' or workflow.dispatch_state = 'dispatched' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.cancellation_state := 'requested';
    when 'cancellation.confirm' then
      if workflow.cancellation_state <> 'requested' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.cancellation_state := 'cancelled';
    when 'cancellation.decline' then
      if workflow.cancellation_state <> 'requested' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.cancellation_state := 'declined';
    when 'refund.request' then
      if workflow.refund_state <> 'not_required'
        or workflow.payment_state <> 'paid'
        or (
          workflow.cancellation_state <> 'cancelled'
          and workflow.clinical_state <> 'rejected'
        )
      then
        raise exception using errcode = '23514', message = 'COMMAND_PREREQUISITES_NOT_MET';
      end if;
      workflow.refund_state := 'pending';
    when 'refund.confirm' then
      if workflow.refund_state <> 'pending' or workflow.payment_state <> 'paid' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.refund_state := 'refunded';
      workflow.payment_state := 'refunded';
    when 'refund.fail' then
      if workflow.refund_state <> 'pending' then
        raise exception using errcode = '23514', message = 'COMMAND_INVALID_TRANSITION';
      end if;
      workflow.refund_state := 'failed';
    else
      raise exception using errcode = '22023', message = 'COMMAND_UNKNOWN_TRANSITION';
  end case;

  workflow.version := workflow.version + 1;
  workflow.updated_at := greatest(p_occurred_at, workflow.updated_at);

  update public.workflow_instances
  set version = workflow.version,
      clinical_state = workflow.clinical_state,
      payment_state = workflow.payment_state,
      supply_state = workflow.supply_state,
      hub_receipt_state = workflow.hub_receipt_state,
      dispatch_state = workflow.dispatch_state,
      delivery_state = workflow.delivery_state,
      cancellation_state = workflow.cancellation_state,
      refund_state = workflow.refund_state,
      updated_at = workflow.updated_at
  where tenant_id = p_tenant_id and id = p_workflow_id;

  result := jsonb_build_object(
    'replayed', false,
    'workflowId', workflow.id,
    'tenantId', workflow.tenant_id,
    'version', workflow.version,
    'clinicalState', workflow.clinical_state,
    'paymentState', workflow.payment_state,
    'supplyState', workflow.supply_state,
    'hubReceiptState', workflow.hub_receipt_state,
    'dispatchState', workflow.dispatch_state,
    'deliveryState', workflow.delivery_state,
    'cancellationState', workflow.cancellation_state,
    'refundState', workflow.refund_state
  );

  update public.command_receipts
  set status = 'committed', response_body = result, committed_at = now()
  where tenant_id = p_tenant_id
    and command_name = p_command_name
    and idempotency_key = p_idempotency_key;

  return result;
end;
$$;

revoke all on function public.execute_workflow_transition(
  uuid, uuid, text, text, text, text, integer, text, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.execute_workflow_transition(
  uuid, uuid, text, text, text, text, integer, text, timestamptz
) to service_role;

comment on table public.workflow_instances is
  'Server-owned synthetic-safe workflow state; each authority remains an independent dimension.';
comment on table public.command_receipts is
  'Durable payload-bound idempotency receipts for committed server commands.';
comment on function public.execute_workflow_transition(
  uuid, uuid, text, text, text, text, integer, text, timestamptz
) is 'Atomic optimistic workflow transition and idempotency boundary; server role only.';
