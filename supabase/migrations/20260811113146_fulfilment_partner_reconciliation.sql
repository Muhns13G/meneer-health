-- Sprint 5.15 minimum-data partner and fulfilment reconciliation. Local synthetic gates are
-- enabled for evidence only; preview and production remain disabled until TD-007/009/010 pass.

create table public.fulfilment_provider_gates (
  provider text not null,
  environment text not null,
  mode text not null default 'disabled',
  updated_at timestamptz not null default now(),
  primary key (provider, environment),
  constraint fulfilment_provider_gates_provider_valid check (
    provider in ('precise_wellness', 'dispensing_pharmacy', 'meneer_hub', 'courier')
  ),
  constraint fulfilment_provider_gates_environment_valid check (
    environment in ('local', 'preview', 'production')
  ),
  constraint fulfilment_provider_gates_mode_valid check (
    mode in ('disabled', 'synthetic', 'enabled')
  ),
  constraint fulfilment_provider_gates_live_approval_absent check (
    environment = 'local' or mode = 'disabled'
  )
);

insert into public.fulfilment_provider_gates (provider, environment, mode)
select provider, environment, case when environment = 'local' then 'synthetic' else 'disabled' end
from unnest(array['precise_wellness', 'dispensing_pharmacy', 'meneer_hub', 'courier']) provider
cross join unnest(array['local', 'preview', 'production']) environment;

create table public.fulfilment_service_bindings (
  service_identity_id uuid not null references public.service_identities (id) on delete cascade,
  provider text not null,
  environment text not null,
  primary key (service_identity_id, provider, environment),
  constraint fulfilment_service_bindings_provider_valid check (
    provider in ('precise_wellness', 'dispensing_pharmacy', 'meneer_hub', 'courier')
  ),
  constraint fulfilment_service_bindings_environment_valid check (
    environment in ('local', 'preview', 'production')
  )
);

create table public.fulfilment_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  workflow_id uuid not null references public.workflow_instances (id) on delete restrict,
  version integer not null default 0,
  pathway_handoff_state text not null default 'not_started',
  pharmacy_release_state text not null default 'not_started',
  hub_custody_state text not null default 'not_started',
  courier_state text not null default 'not_started',
  reconciliation_state text not null default 'pending',
  reconciliation_code text not null default 'PREREQUISITES_NOT_MET',
  eligible_for_fulfilment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fulfilment_cases_workflow_unique unique (tenant_id, workflow_id),
  constraint fulfilment_cases_version_nonnegative check (version >= 0),
  constraint fulfilment_cases_pathway_state_valid check (
    pathway_handoff_state in ('not_started', 'accepted', 'rejected')
  ),
  constraint fulfilment_cases_pharmacy_state_valid check (
    pharmacy_release_state in ('not_started', 'released', 'rejected')
  ),
  constraint fulfilment_cases_hub_state_valid check (
    hub_custody_state in ('not_started', 'received', 'rejected')
  ),
  constraint fulfilment_cases_courier_state_valid check (
    courier_state in ('not_started', 'dispatched', 'delivered', 'failed')
  ),
  constraint fulfilment_cases_reconciliation_state_valid check (
    reconciliation_state in ('matched', 'pending', 'blocked')
  ),
  constraint fulfilment_cases_reconciliation_code_valid check (
    reconciliation_code in (
      'NONE', 'PARTNER_GATE_DISABLED', 'PREREQUISITES_NOT_MET',
      'CLINICAL_NOT_APPROVED', 'PAYMENT_NOT_PAID', 'PHARMACY_NOT_RELEASED',
      'HUB_NOT_RECEIVED', 'CANCELLATION_BLOCKED', 'REFUND_REQUIRED', 'REFUND_FAILED',
      'DELIVERY_EXCEPTION'
    )
  ),
  constraint fulfilment_cases_eligibility_consistent check (
    eligible_for_fulfilment_at is null or (
      pathway_handoff_state = 'accepted'
      and pharmacy_release_state = 'released'
      and hub_custody_state = 'received'
      and reconciliation_state = 'matched'
      and reconciliation_code = 'NONE'
    )
  )
);

create index fulfilment_cases_reconciliation_idx
  on public.fulfilment_cases (tenant_id, reconciliation_state, updated_at);

create table public.fulfilment_partner_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  fulfilment_id uuid not null references public.fulfilment_cases (id) on delete restrict,
  workflow_id uuid not null references public.workflow_instances (id) on delete restrict,
  service_identity_id uuid not null references public.service_identities (id) on delete restrict,
  provider text not null,
  environment text not null,
  external_event_id text not null,
  event_type text not null,
  provider_reference_digest text not null,
  payload_fingerprint text not null,
  status text not null,
  reason_code text not null,
  occurred_at timestamptz not null,
  processed_at timestamptz not null default now(),
  constraint fulfilment_partner_events_provider_valid check (
    provider in ('precise_wellness', 'dispensing_pharmacy', 'meneer_hub', 'courier')
  ),
  constraint fulfilment_partner_events_environment_valid check (
    environment in ('local', 'preview', 'production')
  ),
  constraint fulfilment_partner_events_external_id_not_blank check (
    length(btrim(external_event_id)) between 1 and 128
  ),
  constraint fulfilment_partner_events_event_type_valid check (
    event_type in (
      'pathway.handoff.accepted', 'pathway.handoff.rejected',
      'pharmacy.release.confirmed', 'pharmacy.release.rejected',
      'hub.receipt.confirmed', 'hub.receipt.rejected',
      'courier.dispatch.confirmed', 'courier.delivery.confirmed',
      'courier.delivery.failed'
    )
  ),
  constraint fulfilment_partner_events_reference_digest_format check (
    provider_reference_digest ~ '^[a-f0-9]{64}$'
  ),
  constraint fulfilment_partner_events_payload_fingerprint_format check (
    payload_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint fulfilment_partner_events_status_valid check (
    status in ('applied', 'pending_reconciliation', 'rejected')
  ),
  constraint fulfilment_partner_events_reason_code_format check (
    reason_code ~ '^[A-Z][A-Z0-9_]{1,63}$'
  ),
  constraint fulfilment_partner_events_unique unique (
    tenant_id, provider, environment, external_event_id
  )
);

create index fulfilment_partner_events_case_idx
  on public.fulfilment_partner_events (tenant_id, fulfilment_id, occurred_at);
create index fulfilment_partner_events_pending_idx
  on public.fulfilment_partner_events (tenant_id, status, occurred_at)
  where status = 'pending_reconciliation';

alter table public.fulfilment_provider_gates enable row level security;
alter table public.fulfilment_provider_gates force row level security;
alter table public.fulfilment_service_bindings enable row level security;
alter table public.fulfilment_service_bindings force row level security;
alter table public.fulfilment_cases enable row level security;
alter table public.fulfilment_cases force row level security;
alter table public.fulfilment_partner_events enable row level security;
alter table public.fulfilment_partner_events force row level security;

revoke all on public.fulfilment_provider_gates from public, anon, authenticated, service_role;
revoke all on public.fulfilment_service_bindings from public, anon, authenticated, service_role;
revoke all on public.fulfilment_cases from public, anon, authenticated, service_role;
revoke all on public.fulfilment_partner_events from public, anon, authenticated, service_role;

grant select on public.fulfilment_provider_gates to service_role;
grant select on public.fulfilment_service_bindings to service_role;
grant select on public.fulfilment_cases to service_role;
grant select on public.fulfilment_partner_events to service_role;

create schema if not exists fulfilment_private;
revoke all on schema fulfilment_private from public, anon, authenticated, service_role;

create or replace function fulfilment_private.render_case(p_case public.fulfilment_cases)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'fulfilmentId', p_case.id,
    'tenantId', p_case.tenant_id,
    'workflowId', p_case.workflow_id,
    'version', p_case.version,
    'pathwayHandoffState', p_case.pathway_handoff_state,
    'pharmacyReleaseState', p_case.pharmacy_release_state,
    'hubCustodyState', p_case.hub_custody_state,
    'courierState', p_case.courier_state,
    'reconciliationState', p_case.reconciliation_state,
    'reconciliationCode', p_case.reconciliation_code,
    'eligibleForFulfilmentAt', case
      when p_case.eligible_for_fulfilment_at is null then null
      else to_char(
        p_case.eligible_for_fulfilment_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    end
  ));
$$;

revoke all on function fulfilment_private.render_case(public.fulfilment_cases)
from public, anon, authenticated, service_role;

create or replace function public.apply_fulfilment_partner_event(
  p_service_identity_id uuid,
  p_provider text,
  p_environment text,
  p_external_event_id text,
  p_event_type text,
  p_workflow_id uuid,
  p_provider_reference_digest text,
  p_payload_fingerprint text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_identity public.service_identities%rowtype;
  workflow public.workflow_instances%rowtype;
  fulfilment public.fulfilment_cases%rowtype;
  partner_event public.fulfilment_partner_events%rowtype;
  inserted_rows integer := 0;
  applied boolean := false;
  event_status text := 'pending_reconciliation';
  event_reason_code text := 'PREREQUISITES_NOT_MET';
  expected_provider text;
  next_pathway text;
  next_pharmacy text;
  next_hub text;
  next_courier text;
  next_reconciliation text;
  next_code text;
  next_eligible_at timestamptz;
begin
  expected_provider := case
    when p_event_type like 'pathway.%' then 'precise_wellness'
    when p_event_type like 'pharmacy.%' then 'dispensing_pharmacy'
    when p_event_type like 'hub.%' then 'meneer_hub'
    when p_event_type like 'courier.%' then 'courier'
    else null
  end;

  if p_provider <> expected_provider
    or p_environment not in ('local', 'preview', 'production')
    or length(btrim(p_external_event_id)) not between 1 and 128
    or p_provider_reference_digest !~ '^[a-f0-9]{64}$'
    or p_payload_fingerprint !~ '^[a-f0-9]{64}$'
  then
    raise exception using errcode = '22023', message = 'FULFILMENT_EVENT_VALIDATION_FAILED';
  end if;

  select * into service_identity
  from public.service_identities
  where id = p_service_identity_id
    and environment = p_environment
    and status = 'active'
    and (expires_at is null or expires_at > p_occurred_at)
    and exists (
      select 1 from public.service_identity_scopes scope
      where scope.service_identity_id = p_service_identity_id
        and scope.resource = 'fulfilment'
        and scope.action = 'update'
    )
    and exists (
      select 1 from public.fulfilment_service_bindings binding
      where binding.service_identity_id = p_service_identity_id
        and binding.provider = p_provider
        and binding.environment = p_environment
    );
  if not found then
    raise exception using errcode = '42501', message = 'FULFILMENT_SERVICE_IDENTITY_DENIED';
  end if;

  if not exists (
    select 1 from public.fulfilment_provider_gates
    where provider = p_provider
      and environment = p_environment
      and mode in ('synthetic', 'enabled')
  ) then
    raise exception using errcode = '42501', message = 'FULFILMENT_PARTNER_GATE_DISABLED';
  end if;

  select * into workflow
  from public.workflow_instances
  where tenant_id = service_identity.tenant_id and id = p_workflow_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'FULFILMENT_WORKFLOW_NOT_FOUND';
  end if;

  insert into public.fulfilment_cases (tenant_id, workflow_id)
  values (workflow.tenant_id, workflow.id)
  on conflict (tenant_id, workflow_id) do nothing;

  select * into fulfilment
  from public.fulfilment_cases
  where tenant_id = workflow.tenant_id and workflow_id = workflow.id
  for update;

  insert into public.fulfilment_partner_events (
    tenant_id, fulfilment_id, workflow_id, service_identity_id, provider, environment,
    external_event_id, event_type, provider_reference_digest, payload_fingerprint,
    status, reason_code, occurred_at
  ) values (
    workflow.tenant_id, fulfilment.id, workflow.id, p_service_identity_id, p_provider, p_environment,
    p_external_event_id, p_event_type, p_provider_reference_digest, p_payload_fingerprint,
    'pending_reconciliation', 'PREREQUISITES_NOT_MET', p_occurred_at
  )
  on conflict (tenant_id, provider, environment, external_event_id) do nothing;
  get diagnostics inserted_rows = row_count;

  select * into partner_event
  from public.fulfilment_partner_events
  where tenant_id = workflow.tenant_id
    and provider = p_provider
    and environment = p_environment
    and external_event_id = p_external_event_id
  for update;

  if partner_event.payload_fingerprint <> p_payload_fingerprint
    or partner_event.provider_reference_digest <> p_provider_reference_digest
    or partner_event.event_type <> p_event_type
    or partner_event.workflow_id <> p_workflow_id
    or partner_event.service_identity_id <> p_service_identity_id
  then
    raise exception using errcode = '23505', message = 'FULFILMENT_EVENT_REPLAY_CONFLICT';
  end if;

  if inserted_rows = 0 then
    return jsonb_build_object(
      'fulfilment', fulfilment_private.render_case(fulfilment),
      'eventId', partner_event.id,
      'replayed', true,
      'applied', partner_event.status = 'applied'
    );
  end if;

  perform public.record_integration_inbox(
    workflow.tenant_id,
    p_provider,
    p_environment,
    p_external_event_id,
    p_payload_fingerprint,
    p_external_event_id,
    p_service_identity_id,
    p_occurred_at,
    jsonb_build_object(
      'provider', p_provider,
      'environment', p_environment,
      'eventName', p_event_type,
      'replayed', false
    )
  );

  next_pathway := fulfilment.pathway_handoff_state;
  next_pharmacy := fulfilment.pharmacy_release_state;
  next_hub := fulfilment.hub_custody_state;
  next_courier := fulfilment.courier_state;

  case p_event_type
    when 'pathway.handoff.accepted' then
      if fulfilment.pathway_handoff_state = 'not_started' then
        next_pathway := 'accepted'; applied := true;
      end if;
    when 'pathway.handoff.rejected' then
      if fulfilment.pathway_handoff_state = 'not_started' then
        next_pathway := 'rejected'; applied := true;
      end if;
    when 'pharmacy.release.confirmed' then
      if fulfilment.pathway_handoff_state = 'accepted'
        and workflow.clinical_state = 'approved'
        and workflow.payment_state = 'paid'
        and workflow.supply_state = 'available'
        and workflow.cancellation_state <> 'cancelled'
        and fulfilment.pharmacy_release_state = 'not_started'
      then
        next_pharmacy := 'released'; applied := true;
      end if;
    when 'pharmacy.release.rejected' then
      if fulfilment.pharmacy_release_state = 'not_started' then
        next_pharmacy := 'rejected'; applied := true;
      end if;
    when 'hub.receipt.confirmed' then
      if fulfilment.pharmacy_release_state = 'released'
        and fulfilment.hub_custody_state = 'not_started'
      then
        next_hub := 'received';
        workflow.hub_receipt_state := 'received';
        applied := true;
      end if;
    when 'hub.receipt.rejected' then
      if fulfilment.hub_custody_state = 'not_started' then
        next_hub := 'rejected';
        workflow.hub_receipt_state := 'rejected';
        applied := true;
      end if;
    when 'courier.dispatch.confirmed' then
      if fulfilment.pharmacy_release_state = 'released'
        and fulfilment.hub_custody_state = 'received'
        and workflow.dispatch_state in ('ready', 'dispatched')
        and workflow.cancellation_state <> 'cancelled'
        and fulfilment.courier_state = 'not_started'
      then
        next_courier := 'dispatched';
        workflow.dispatch_state := 'dispatched';
        applied := true;
      end if;
    when 'courier.delivery.confirmed' then
      if fulfilment.courier_state = 'dispatched'
        and workflow.dispatch_state = 'dispatched'
      then
        next_courier := 'delivered';
        workflow.delivery_state := 'delivered';
        applied := true;
      end if;
    when 'courier.delivery.failed' then
      if fulfilment.courier_state = 'dispatched'
        and workflow.dispatch_state = 'dispatched'
      then
        next_courier := 'failed';
        workflow.delivery_state := 'failed';
        applied := true;
      end if;
  end case;

  if applied then
    event_status := 'applied';
    event_reason_code := 'APPLIED';
  end if;

  next_reconciliation := 'pending';
  next_code := 'PREREQUISITES_NOT_MET';
  next_eligible_at := null;

  if workflow.cancellation_state = 'cancelled' and workflow.payment_state = 'paid' then
    next_code := 'REFUND_REQUIRED';
  elsif workflow.refund_state = 'failed' then
    next_reconciliation := 'blocked'; next_code := 'REFUND_FAILED';
  elsif workflow.cancellation_state = 'cancelled' then
    next_reconciliation := 'blocked'; next_code := 'CANCELLATION_BLOCKED';
  elsif next_courier = 'failed' then
    next_code := 'DELIVERY_EXCEPTION';
  elsif workflow.clinical_state <> 'approved' then
    next_code := 'CLINICAL_NOT_APPROVED';
  elsif workflow.payment_state <> 'paid' then
    next_code := 'PAYMENT_NOT_PAID';
  elsif next_pharmacy <> 'released' then
    next_code := 'PHARMACY_NOT_RELEASED';
  elsif next_hub <> 'received' then
    next_code := 'HUB_NOT_RECEIVED';
  elsif next_pathway = 'accepted' and workflow.supply_state = 'available' then
    next_reconciliation := 'matched';
    next_code := 'NONE';
    next_eligible_at := coalesce(fulfilment.eligible_for_fulfilment_at, p_occurred_at);
  end if;

  update public.workflow_instances
  set hub_receipt_state = workflow.hub_receipt_state,
      dispatch_state = workflow.dispatch_state,
      delivery_state = workflow.delivery_state,
      version = version + case when applied and p_event_type like any(array['hub.%', 'courier.%']) then 1 else 0 end,
      updated_at = case when applied then greatest(updated_at, p_occurred_at) else updated_at end
  where tenant_id = workflow.tenant_id and id = workflow.id;

  update public.fulfilment_cases
  set pathway_handoff_state = next_pathway,
      pharmacy_release_state = next_pharmacy,
      hub_custody_state = next_hub,
      courier_state = next_courier,
      reconciliation_state = next_reconciliation,
      reconciliation_code = next_code,
      eligible_for_fulfilment_at = next_eligible_at,
      version = version + case when applied then 1 else 0 end,
      updated_at = greatest(updated_at, p_occurred_at)
  where id = fulfilment.id
  returning * into fulfilment;

  update public.fulfilment_partner_events
  set status = event_status, reason_code = event_reason_code
  where id = partner_event.id
  returning * into partner_event;

  insert into public.integration_outbox (
    tenant_id, event_name, event_version, aggregate_type, aggregate_id, aggregate_version,
    actor_type, actor_id, correlation_id, causation_id, occurred_at, payload
  ) values (
    workflow.tenant_id,
    case when applied then 'fulfilment.partner.applied' else 'fulfilment.reconciliation.required' end,
    1,
    'fulfilment',
    fulfilment.id,
    greatest(fulfilment.version, 1),
    'service',
    p_service_identity_id,
    p_external_event_id,
    p_external_event_id,
    p_occurred_at,
    jsonb_build_object('transition', p_event_type)
  );

  perform audit_private.append_audit_fact(
    workflow.tenant_id,
    'service',
    p_service_identity_id,
    'service_identity',
    'service',
    case when applied then 'fulfilment.event.applied' else 'fulfilment.event.deferred' end,
    workflow.subject_id,
    'fulfilment',
    fulfilment.id::text,
    'operations',
    'fulfilment.partner.v1',
    case when applied then 'succeeded' else 'failed' end,
    event_reason_code,
    p_external_event_id,
    p_external_event_id,
    p_occurred_at,
    jsonb_build_object(
      'provider', p_provider,
      'environment', p_environment,
      'eventName', p_event_type,
      'replayed', false
    )
  );

  return jsonb_build_object(
    'fulfilment', fulfilment_private.render_case(fulfilment),
    'eventId', partner_event.id,
    'replayed', false,
    'applied', applied
  );
end;
$$;

create or replace function fulfilment_private.refresh_reconciliation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fulfilment public.fulfilment_cases%rowtype;
  next_state text := 'pending';
  next_code text := 'PREREQUISITES_NOT_MET';
  next_eligible_at timestamptz;
begin
  select * into fulfilment
  from public.fulfilment_cases
  where tenant_id = new.tenant_id and workflow_id = new.id
  for update;
  if not found then
    return new;
  end if;

  next_eligible_at := fulfilment.eligible_for_fulfilment_at;
  if new.refund_state = 'failed' then
    next_state := 'blocked'; next_code := 'REFUND_FAILED'; next_eligible_at := null;
  elsif new.cancellation_state = 'cancelled' and new.payment_state = 'paid' then
    next_code := 'REFUND_REQUIRED'; next_eligible_at := null;
  elsif new.cancellation_state = 'cancelled' and new.payment_state = 'refunded' then
    next_state := 'matched'; next_code := 'NONE'; next_eligible_at := null;
  elsif new.cancellation_state = 'cancelled' then
    next_state := 'blocked'; next_code := 'CANCELLATION_BLOCKED'; next_eligible_at := null;
  elsif fulfilment.courier_state = 'failed' then
    next_code := 'DELIVERY_EXCEPTION'; next_eligible_at := null;
  elsif new.clinical_state <> 'approved' then
    next_code := 'CLINICAL_NOT_APPROVED'; next_eligible_at := null;
  elsif new.payment_state <> 'paid' then
    next_code := 'PAYMENT_NOT_PAID'; next_eligible_at := null;
  elsif fulfilment.pharmacy_release_state <> 'released' then
    next_code := 'PHARMACY_NOT_RELEASED'; next_eligible_at := null;
  elsif fulfilment.hub_custody_state <> 'received' then
    next_code := 'HUB_NOT_RECEIVED'; next_eligible_at := null;
  elsif fulfilment.pathway_handoff_state = 'accepted' and new.supply_state = 'available' then
    next_state := 'matched';
    next_code := 'NONE';
    next_eligible_at := coalesce(next_eligible_at, new.updated_at);
  end if;

  update public.fulfilment_cases
  set reconciliation_state = next_state,
      reconciliation_code = next_code,
      eligible_for_fulfilment_at = next_eligible_at,
      updated_at = greatest(updated_at, new.updated_at)
  where id = fulfilment.id;
  return new;
end;
$$;

revoke all on function fulfilment_private.refresh_reconciliation()
from public, anon, authenticated, service_role;

create trigger workflow_fulfilment_reconciliation
after update of clinical_state, payment_state, supply_state, cancellation_state, refund_state
on public.workflow_instances
for each row execute function fulfilment_private.refresh_reconciliation();

revoke all on function public.apply_fulfilment_partner_event(
  uuid, text, text, text, text, uuid, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.apply_fulfilment_partner_event(
  uuid, text, text, text, text, uuid, text, text, timestamptz
) to service_role;

comment on table public.fulfilment_cases is
  'Minimum-data operational projection; contains no questionnaire, diagnosis, prescription, address, or tracking payload.';
comment on table public.fulfilment_partner_events is
  'Idempotent partner event evidence using opaque references and fingerprints only.';
comment on function public.apply_fulfilment_partner_event(
  uuid, text, text, text, text, uuid, text, text, timestamptz
) is 'Applies gated minimum-data partner evidence and reconciles independent fulfilment state.';
