-- Sprint 5.10 append-only audit evidence and transactional inbox/outbox foundation.
-- This migration activates no browser route, provider connection, or customer data collection.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists audit_private;
revoke all on schema audit_private from public, anon, authenticated, service_role;

create or replace function audit_private.safe_metadata(p_metadata jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item record;
begin
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' or pg_column_size(p_metadata) > 2048 then
    return false;
  end if;

  for item in select * from jsonb_each(p_metadata)
  loop
    if item.key not in (
      'transition',
      'aggregateVersion',
      'eventName',
      'provider',
      'environment',
      'replayed',
      'reviewEventCount',
      'chainVerified'
    ) then
      return false;
    end if;
    if jsonb_typeof(item.value) not in ('string', 'number', 'boolean', 'null') then
      return false;
    end if;
    if jsonb_typeof(item.value) = 'string' and length(item.value #>> '{}') > 128 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function audit_private.safe_metadata(jsonb)
from public, anon, authenticated, service_role;

create sequence public.audit_event_sequence;

create table public.audit_chain_heads (
  tenant_id uuid primary key references public.tenants (id) on delete restrict,
  last_sequence bigint not null default 0,
  last_hash text not null default repeat('0', 64),
  updated_at timestamptz not null default now(),
  constraint audit_chain_heads_sequence_nonnegative check (last_sequence >= 0),
  constraint audit_chain_heads_hash_format check (last_hash ~ '^[a-f0-9]{64}$')
);

create table public.audit_events (
  sequence bigint primary key default nextval('public.audit_event_sequence'),
  id uuid not null unique default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  actor_type text not null,
  actor_id uuid not null,
  actor_role text not null,
  assurance text not null,
  action text not null,
  subject_id uuid references public.subjects (id) on delete restrict,
  resource_type text not null,
  resource_id text not null,
  purpose text not null,
  policy_version text not null,
  outcome text not null,
  reason_code text not null,
  correlation_id text not null,
  causation_id text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text not null,
  event_hash text not null unique,
  constraint audit_events_actor_type_valid check (
    actor_type in ('patient', 'workforce', 'service', 'system')
  ),
  constraint audit_events_assurance_valid check (
    assurance in ('aal1', 'aal2', 'service', 'system')
  ),
  constraint audit_events_action_format check (action ~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$'),
  constraint audit_events_resource_type_format check (resource_type ~ '^[a-z][a-z0-9_]{1,47}$'),
  constraint audit_events_resource_id_not_blank check (length(btrim(resource_id)) > 0),
  constraint audit_events_purpose_format check (purpose ~ '^[a-z][a-z_]{1,47}$'),
  constraint audit_events_policy_version_not_blank check (length(btrim(policy_version)) > 0),
  constraint audit_events_outcome_valid check (outcome in ('succeeded', 'denied', 'failed')),
  constraint audit_events_reason_code_format check (reason_code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint audit_events_correlation_not_blank check (length(btrim(correlation_id)) > 0),
  constraint audit_events_causation_not_blank check (length(btrim(causation_id)) > 0),
  constraint audit_events_metadata_safe check (audit_private.safe_metadata(metadata)),
  constraint audit_events_previous_hash_format check (previous_hash ~ '^[a-f0-9]{64}$'),
  constraint audit_events_event_hash_format check (event_hash ~ '^[a-f0-9]{64}$')
);

create index audit_events_tenant_resource_sequence_idx
  on public.audit_events (tenant_id, resource_type, resource_id, sequence desc);
create index audit_events_tenant_correlation_idx
  on public.audit_events (tenant_id, correlation_id, sequence desc);
create index audit_events_tenant_actor_recorded_idx
  on public.audit_events (tenant_id, actor_id, recorded_at desc);

create table public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  event_name text not null,
  event_version integer not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  aggregate_version integer not null,
  actor_type text not null,
  actor_id uuid not null,
  correlation_id text not null,
  causation_id text not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  published_at timestamptz,
  last_error_code text,
  constraint integration_outbox_event_name_valid check (
    event_name ~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$'
  ),
  constraint integration_outbox_version_positive check (
    event_version > 0 and aggregate_version > 0
  ),
  constraint integration_outbox_actor_type_valid check (actor_type in ('patient', 'workforce', 'service')),
  constraint integration_outbox_payload_safe check (
    jsonb_typeof(payload) = 'object'
    and payload ? 'transition'
    and payload - 'transition' = '{}'::jsonb
    and jsonb_typeof(payload->'transition') = 'string'
    and length(payload->>'transition') <= 64
  ),
  constraint integration_outbox_status_valid check (
    status in ('pending', 'publishing', 'published', 'dead_letter')
  ),
  constraint integration_outbox_attempts_nonnegative check (attempts >= 0),
  constraint integration_outbox_publish_consistent check (
    (status = 'published' and published_at is not null)
    or (status <> 'published' and published_at is null)
  ),
  constraint integration_outbox_delivery_error_safe check (
    last_error_code is null or last_error_code ~ '^[A-Z][A-Z0-9_]{1,63}$'
  ),
  constraint integration_outbox_causation_unique unique (
    tenant_id,
    event_name,
    causation_id
  )
);

create index integration_outbox_pending_idx
  on public.integration_outbox (status, next_attempt_at, id)
  where status in ('pending', 'publishing');
create index integration_outbox_aggregate_idx
  on public.integration_outbox (tenant_id, aggregate_id, aggregate_version);

create table public.integration_inbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  provider text not null,
  environment text not null,
  external_event_id text not null,
  payload_fingerprint text not null,
  correlation_id text not null,
  service_identity_id uuid not null references public.service_identities (id) on delete restrict,
  status text not null default 'verified',
  safe_metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null,
  processed_at timestamptz,
  constraint integration_inbox_provider_format check (provider ~ '^[a-z][a-z0-9_-]{1,47}$'),
  constraint integration_inbox_environment_valid check (
    environment in ('local', 'preview', 'production')
  ),
  constraint integration_inbox_external_id_not_blank check (length(btrim(external_event_id)) > 0),
  constraint integration_inbox_fingerprint_format check (payload_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint integration_inbox_correlation_not_blank check (length(btrim(correlation_id)) > 0),
  constraint integration_inbox_status_valid check (
    status in ('verified', 'pending_reconciliation', 'rejected')
  ),
  constraint integration_inbox_metadata_safe check (audit_private.safe_metadata(safe_metadata)),
  constraint integration_inbox_processed_consistent check (
    (status = 'pending_reconciliation' and processed_at is null)
    or (status <> 'pending_reconciliation' and processed_at is not null)
  ),
  constraint integration_inbox_provider_event_unique unique (
    tenant_id,
    provider,
    environment,
    external_event_id
  )
);

create index integration_inbox_reconciliation_idx
  on public.integration_inbox (tenant_id, status, received_at)
  where status = 'pending_reconciliation';

create table public.audit_access_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  reviewer_subject_id uuid not null references public.subjects (id) on delete restrict,
  aggregate_id uuid not null,
  purpose text not null,
  correlation_id text not null,
  reviewed_from timestamptz,
  reviewed_to timestamptz not null,
  reviewed_through_sequence bigint not null,
  event_count integer not null,
  chain_verified boolean not null,
  chain_head_hash text not null,
  created_at timestamptz not null,
  constraint audit_access_reviews_purpose check (purpose = 'privacy_review'),
  constraint audit_access_reviews_sequence_nonnegative check (reviewed_through_sequence >= 0),
  constraint audit_access_reviews_event_count_nonnegative check (event_count >= 0),
  constraint audit_access_reviews_hash_format check (chain_head_hash ~ '^[a-f0-9]{64}$')
);

create index audit_access_reviews_tenant_created_idx
  on public.audit_access_reviews (tenant_id, created_at desc);

alter table public.audit_chain_heads enable row level security;
alter table public.audit_chain_heads force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
alter table public.integration_outbox enable row level security;
alter table public.integration_outbox force row level security;
alter table public.integration_inbox enable row level security;
alter table public.integration_inbox force row level security;
alter table public.audit_access_reviews enable row level security;
alter table public.audit_access_reviews force row level security;

revoke all on public.audit_event_sequence from public, anon, authenticated, service_role;
revoke all on public.audit_chain_heads from public, anon, authenticated, service_role;
revoke all on public.audit_events from public, anon, authenticated, service_role;
revoke all on public.integration_outbox from public, anon, authenticated, service_role;
revoke all on public.integration_inbox from public, anon, authenticated, service_role;
revoke all on public.audit_access_reviews from public, anon, authenticated, service_role;

create or replace function audit_private.append_audit_fact(
  p_tenant_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_actor_role text,
  p_assurance text,
  p_action text,
  p_subject_id uuid,
  p_resource_type text,
  p_resource_id text,
  p_purpose text,
  p_policy_version text,
  p_outcome text,
  p_reason_code text,
  p_correlation_id text,
  p_causation_id text,
  p_occurred_at timestamptz,
  p_metadata jsonb
)
returns public.audit_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  head public.audit_chain_heads%rowtype;
  inserted_event public.audit_events%rowtype;
  next_sequence bigint;
  recorded_at timestamptz := clock_timestamp();
  computed_hash text;
begin
  if p_actor_type not in ('patient', 'workforce', 'service', 'system')
    or p_assurance not in ('aal1', 'aal2', 'service', 'system')
    or p_action !~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$'
    or p_resource_type !~ '^[a-z][a-z0-9_]{1,47}$'
    or length(btrim(p_resource_id)) = 0
    or p_purpose !~ '^[a-z][a-z_]{1,47}$'
    or p_outcome not in ('succeeded', 'denied', 'failed')
    or p_reason_code !~ '^[A-Z][A-Z0-9_]{1,63}$'
    or not audit_private.safe_metadata(p_metadata)
  then
    raise exception using errcode = '22023', message = 'AUDIT_VALIDATION_FAILED';
  end if;

  insert into public.audit_chain_heads (tenant_id)
  values (p_tenant_id)
  on conflict (tenant_id) do nothing;

  select * into head
  from public.audit_chain_heads
  where tenant_id = p_tenant_id
  for update;

  next_sequence := nextval('public.audit_event_sequence');
  computed_hash := encode(
    extensions.digest(
      convert_to(
        concat_ws(
          '|',
          next_sequence::text,
          p_tenant_id::text,
          p_actor_type,
          p_actor_id::text,
          p_actor_role,
          p_assurance,
          p_action,
          coalesce(p_subject_id::text, ''),
          p_resource_type,
          p_resource_id,
          p_purpose,
          p_policy_version,
          p_outcome,
          p_reason_code,
          p_correlation_id,
          p_causation_id,
          to_char(p_occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          to_char(recorded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          p_metadata::text,
          head.last_hash
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.audit_events (
    sequence,
    tenant_id,
    actor_type,
    actor_id,
    actor_role,
    assurance,
    action,
    subject_id,
    resource_type,
    resource_id,
    purpose,
    policy_version,
    outcome,
    reason_code,
    correlation_id,
    causation_id,
    occurred_at,
    recorded_at,
    metadata,
    previous_hash,
    event_hash
  )
  values (
    next_sequence,
    p_tenant_id,
    p_actor_type,
    p_actor_id,
    p_actor_role,
    p_assurance,
    p_action,
    p_subject_id,
    p_resource_type,
    p_resource_id,
    p_purpose,
    p_policy_version,
    p_outcome,
    p_reason_code,
    p_correlation_id,
    p_causation_id,
    p_occurred_at,
    recorded_at,
    p_metadata,
    head.last_hash,
    computed_hash
  )
  returning * into inserted_event;

  update public.audit_chain_heads
  set last_sequence = next_sequence,
      last_hash = computed_hash,
      updated_at = recorded_at
  where tenant_id = p_tenant_id;

  return inserted_event;
end;
$$;

create or replace function audit_private.verify_audit_chain(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  event public.audit_events%rowtype;
  expected_previous text := repeat('0', 64);
  expected_hash text;
  final_sequence bigint := 0;
  head public.audit_chain_heads%rowtype;
begin
  for event in
    select * from public.audit_events
    where tenant_id = p_tenant_id
    order by sequence
  loop
    expected_hash := encode(
      extensions.digest(
        convert_to(
          concat_ws(
            '|',
            event.sequence::text,
            event.tenant_id::text,
            event.actor_type,
            event.actor_id::text,
            event.actor_role,
            event.assurance,
            event.action,
            coalesce(event.subject_id::text, ''),
            event.resource_type,
            event.resource_id,
            event.purpose,
            event.policy_version,
            event.outcome,
            event.reason_code,
            event.correlation_id,
            event.causation_id,
            to_char(event.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            to_char(event.recorded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            event.metadata::text,
            expected_previous
          ),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );
    if event.previous_hash <> expected_previous or event.event_hash <> expected_hash then
      return false;
    end if;
    expected_previous := event.event_hash;
    final_sequence := event.sequence;
  end loop;

  select * into head from public.audit_chain_heads where tenant_id = p_tenant_id;
  if not found then
    return final_sequence = 0;
  end if;
  return head.last_sequence = final_sequence and head.last_hash = expected_previous;
end;
$$;

create or replace function audit_private.reject_append_only_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'APPEND_ONLY_RECORD';
end;
$$;

create trigger audit_events_append_only
before update or delete on public.audit_events
for each row execute function audit_private.reject_append_only_mutation();

create trigger audit_access_reviews_append_only
before update or delete on public.audit_access_reviews
for each row execute function audit_private.reject_append_only_mutation();

revoke all on function audit_private.append_audit_fact(
  uuid, text, uuid, text, text, text, uuid, text, text, text, text, text, text,
  text, text, timestamptz, jsonb
) from public, anon, authenticated, service_role;
revoke all on function audit_private.verify_audit_chain(uuid)
from public, anon, authenticated, service_role;
revoke all on function audit_private.reject_append_only_mutation()
from public, anon, authenticated, service_role;

revoke all on function public.execute_workflow_transition(
  uuid, uuid, text, text, text, text, integer, text, timestamptz
) from service_role;

create or replace function public.execute_audited_workflow_transition(
  p_tenant_id uuid,
  p_workflow_id uuid,
  p_command_name text,
  p_request_id text,
  p_idempotency_key text,
  p_request_fingerprint text,
  p_expected_version integer,
  p_transition text,
  p_occurred_at timestamptz,
  p_actor_type text,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_subject_id uuid,
  p_purpose text,
  p_policy_version text,
  p_correlation_id text,
  p_causation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
  recorded_at timestamptz := clock_timestamp();
begin
  if p_actor_type not in ('patient', 'workforce')
    or (p_actor_type = 'patient' and p_actor_role <> 'patient')
    or (p_actor_type = 'workforce' and p_actor_role = 'patient')
    or p_assurance not in ('aal1', 'aal2')
    or p_actor_subject_id is null
    or p_subject_id is null
    or length(btrim(p_policy_version)) = 0
    or length(btrim(p_correlation_id)) = 0
    or length(btrim(p_causation_id)) = 0
  then
    raise exception using errcode = '22023', message = 'AUDIT_CONTEXT_INVALID';
  end if;

  result := public.execute_workflow_transition(
    p_tenant_id,
    p_workflow_id,
    p_command_name,
    p_request_id,
    p_idempotency_key,
    p_request_fingerprint,
    p_expected_version,
    p_transition,
    p_occurred_at
  );

  if (result->>'replayed')::boolean = false then
    perform audit_private.append_audit_fact(
      p_tenant_id,
      p_actor_type,
      p_actor_subject_id,
      p_actor_role,
      p_assurance,
      'workflow.transition',
      p_subject_id,
      'workflow',
      p_workflow_id::text,
      p_purpose,
      p_policy_version,
      'succeeded',
      'COMMAND_COMMITTED',
      p_correlation_id,
      p_causation_id,
      p_occurred_at,
      jsonb_build_object(
        'transition', p_transition,
        'aggregateVersion', (result->>'version')::integer,
        'eventName', 'workflow.transitioned'
      )
    );

    insert into public.integration_outbox (
      tenant_id,
      event_name,
      event_version,
      aggregate_type,
      aggregate_id,
      aggregate_version,
      actor_type,
      actor_id,
      correlation_id,
      causation_id,
      occurred_at,
      recorded_at,
      payload
    )
    values (
      p_tenant_id,
      'workflow.transitioned',
      1,
      'workflow',
      p_workflow_id,
      (result->>'version')::integer,
      p_actor_type,
      p_actor_subject_id,
      p_correlation_id,
      p_causation_id,
      p_occurred_at,
      recorded_at,
      jsonb_build_object('transition', p_transition)
    );
  end if;

  return result;
end;
$$;

create or replace function public.record_integration_inbox(
  p_tenant_id uuid,
  p_provider text,
  p_environment text,
  p_external_event_id text,
  p_payload_fingerprint text,
  p_correlation_id text,
  p_service_identity_id uuid,
  p_received_at timestamptz,
  p_safe_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_rows integer := 0;
  receipt public.integration_inbox%rowtype;
begin
  if p_provider !~ '^[a-z][a-z0-9_-]{1,47}$'
    or p_environment not in ('local', 'preview', 'production')
    or length(btrim(p_external_event_id)) = 0
    or p_payload_fingerprint !~ '^[a-f0-9]{64}$'
    or length(btrim(p_correlation_id)) = 0
    or not audit_private.safe_metadata(p_safe_metadata)
    or not exists (
      select 1 from public.service_identities
      where id = p_service_identity_id
        and tenant_id = p_tenant_id
        and environment = p_environment
        and status = 'active'
        and (expires_at is null or expires_at > p_received_at)
    )
  then
    raise exception using errcode = '22023', message = 'INBOX_VALIDATION_FAILED';
  end if;

  insert into public.integration_inbox (
    tenant_id,
    provider,
    environment,
    external_event_id,
    payload_fingerprint,
    correlation_id,
    service_identity_id,
    status,
    safe_metadata,
    received_at,
    processed_at
  )
  values (
    p_tenant_id,
    p_provider,
    p_environment,
    p_external_event_id,
    p_payload_fingerprint,
    p_correlation_id,
    p_service_identity_id,
    'verified',
    p_safe_metadata,
    p_received_at,
    clock_timestamp()
  )
  on conflict (tenant_id, provider, environment, external_event_id) do nothing;
  get diagnostics inserted_rows = row_count;

  select * into receipt
  from public.integration_inbox
  where tenant_id = p_tenant_id
    and provider = p_provider
    and environment = p_environment
    and external_event_id = p_external_event_id
  for update;

  if receipt.payload_fingerprint <> p_payload_fingerprint
    or receipt.service_identity_id <> p_service_identity_id
  then
    raise exception using errcode = '23505', message = 'INBOX_REPLAY_CONFLICT';
  end if;

  if inserted_rows = 1 then
    perform audit_private.append_audit_fact(
      p_tenant_id,
      'service',
      p_service_identity_id,
      'service_identity',
      'service',
      'integration.receive',
      null,
      'integration_message',
      receipt.id::text,
      'operations',
      'integration.v1',
      'succeeded',
      'INBOX_VERIFIED',
      p_correlation_id,
      p_external_event_id,
      p_received_at,
      p_safe_metadata || jsonb_build_object('provider', p_provider, 'environment', p_environment)
    );
  end if;

  return jsonb_build_object(
    'contract', 'integration.received',
    'version', 1,
    'inboxId', receipt.id,
    'tenantId', receipt.tenant_id,
    'provider', receipt.provider,
    'environment', receipt.environment,
    'externalEventId', receipt.external_event_id,
    'correlationId', receipt.correlation_id,
    'status', receipt.status,
    'replayed', inserted_rows = 0,
    'receivedAt', receipt.received_at
  );
end;
$$;

create or replace function public.review_audit_evidence(
  p_tenant_id uuid,
  p_aggregate_id uuid,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_policy_version text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  chain_ok boolean;
  head public.audit_chain_heads%rowtype;
  review_id uuid := gen_random_uuid();
  review_time timestamptz := clock_timestamp();
  event_count integer;
  events jsonb;
begin
  if p_actor_role <> 'auditor'
    or p_assurance <> 'aal2'
    or p_purpose <> 'privacy_review'
    or p_limit < 1
    or p_limit > 100
    or length(btrim(p_policy_version)) = 0
    or length(btrim(p_correlation_id)) = 0
  then
    raise exception using errcode = '42501', message = 'AUDIT_REVIEW_FORBIDDEN';
  end if;

  chain_ok := audit_private.verify_audit_chain(p_tenant_id);
  select * into head from public.audit_chain_heads where tenant_id = p_tenant_id;
  if not found then
    head.last_sequence := 0;
    head.last_hash := repeat('0', 64);
  end if;

  select count(*), coalesce(jsonb_agg(fact order by (fact->>'sequence')::bigint), '[]'::jsonb)
  into event_count, events
  from (
    select jsonb_strip_nulls(jsonb_build_object(
      'contract', 'audit.fact',
      'version', 1,
      'factId', event.id,
      'sequence', event.sequence,
      'tenantId', event.tenant_id,
      'actor', jsonb_build_object(
        'type', event.actor_type,
        'id', event.actor_id,
        'role', event.actor_role,
        'assurance', event.assurance
      ),
      'action', event.action,
      'subjectId', event.subject_id,
      'resource', jsonb_build_object('type', event.resource_type, 'id', event.resource_id),
      'purpose', event.purpose,
      'policyVersion', event.policy_version,
      'outcome', event.outcome,
      'reasonCode', event.reason_code,
      'correlationId', event.correlation_id,
      'causationId', event.causation_id,
      'occurredAt', event.occurred_at,
      'recordedAt', event.recorded_at,
      'metadata', event.metadata,
      'previousHash', event.previous_hash,
      'eventHash', event.event_hash
    )) as fact
    from public.audit_events event
    where event.tenant_id = p_tenant_id
      and event.resource_type = 'workflow'
      and event.resource_id = p_aggregate_id::text
    order by event.sequence desc
    limit p_limit
  ) selected;

  insert into public.audit_access_reviews (
    id,
    tenant_id,
    reviewer_subject_id,
    aggregate_id,
    purpose,
    correlation_id,
    reviewed_from,
    reviewed_to,
    reviewed_through_sequence,
    event_count,
    chain_verified,
    chain_head_hash,
    created_at
  )
  values (
    review_id,
    p_tenant_id,
    p_actor_subject_id,
    p_aggregate_id,
    p_purpose,
    p_correlation_id,
    (select min(occurred_at) from public.audit_events where tenant_id = p_tenant_id),
    review_time,
    head.last_sequence,
    event_count,
    chain_ok,
    head.last_hash,
    review_time
  );

  perform audit_private.append_audit_fact(
    p_tenant_id,
    'workforce',
    p_actor_subject_id,
    p_actor_role,
    p_assurance,
    'audit.review',
    null,
    'audit_evidence',
    p_aggregate_id::text,
    p_purpose,
    p_policy_version,
    'succeeded',
    'AUDIT_REVIEW_RECORDED',
    p_correlation_id,
    review_id::text,
    p_occurred_at,
    jsonb_build_object('reviewEventCount', event_count, 'chainVerified', chain_ok)
  );

  return jsonb_build_object(
    'reviewId', review_id,
    'reviewedAt', review_time,
    'reviewedThroughSequence', head.last_sequence,
    'chainVerified', chain_ok,
    'events', events
  );
end;
$$;

revoke all on function public.execute_audited_workflow_transition(
  uuid, uuid, text, text, text, text, integer, text, timestamptz,
  text, uuid, text, text, uuid, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.execute_audited_workflow_transition(
  uuid, uuid, text, text, text, text, integer, text, timestamptz,
  text, uuid, text, text, uuid, text, text, text, text
) to service_role;

revoke all on function public.record_integration_inbox(
  uuid, text, text, text, text, text, uuid, timestamptz, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.record_integration_inbox(
  uuid, text, text, text, text, text, uuid, timestamptz, jsonb
) to service_role;

revoke all on function public.review_audit_evidence(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz, integer
) from public, anon, authenticated, service_role;
grant execute on function public.review_audit_evidence(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz, integer
) to service_role;

comment on table public.audit_events is
  'Append-only, hash-chained safe audit facts; raw health, message, credential and provider payloads are prohibited.';
comment on table public.integration_outbox is
  'Transactional minimum domain events awaiting a separately implemented delivery worker.';
comment on table public.integration_inbox is
  'Idempotent verified integration receipts without raw provider payload storage.';
comment on table public.audit_access_reviews is
  'Append-only evidence of purpose-bound privileged audit review and chain verification.';
