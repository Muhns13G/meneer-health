-- Sprint 7.8 default-off first-party pilot measurement boundary. The private schema is not exposed
-- through the Data API. Browser roles receive no grants; server writes use three narrow RPCs.

create schema if not exists measurement_private;
revoke all on schema measurement_private from public, anon, authenticated;

create table measurement_private.consents (
  flow_id uuid primary key,
  consent_receipt_id uuid not null unique,
  status text not null,
  grant_request_id uuid not null unique,
  grant_idempotency_key text not null unique,
  grant_fingerprint text not null,
  grant_correlation_id text not null,
  environment text not null,
  granted_at timestamptz not null,
  expires_at timestamptz not null,
  withdrawn_at timestamptz,
  withdrawal_request_id uuid unique,
  withdrawal_idempotency_key text unique,
  withdrawal_fingerprint text,
  withdrawal_correlation_id text,
  delete_after timestamptz,
  synthetic boolean not null,
  created_at timestamptz not null default now(),
  constraint measurement_consents_status_valid check (status in ('granted', 'withdrawn')),
  constraint measurement_consents_flow_receipt_unique unique (flow_id, consent_receipt_id),
  constraint measurement_consents_grant_key_valid check (
    grant_idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'
  ),
  constraint measurement_consents_grant_fingerprint_valid check (
    grant_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint measurement_consents_grant_correlation_valid check (
    grant_correlation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  constraint measurement_consents_environment_valid check (
    environment in ('local', 'preview', 'production')
  ),
  constraint measurement_consents_expiry_valid check (
    expires_at > granted_at and expires_at <= granted_at + interval '30 minutes'
  ),
  constraint measurement_consents_withdrawal_consistent check (
    (status = 'granted' and withdrawn_at is null and withdrawal_request_id is null
      and withdrawal_idempotency_key is null and withdrawal_fingerprint is null
      and withdrawal_correlation_id is null and delete_after is null)
    or
    (status = 'withdrawn' and withdrawn_at is not null and withdrawal_request_id is not null
      and withdrawal_idempotency_key is not null and withdrawal_fingerprint is not null
      and withdrawal_correlation_id is not null and delete_after is not null
      and delete_after > withdrawn_at and delete_after <= withdrawn_at + interval '7 days')
  )
);

alter table measurement_private.consents enable row level security;
alter table measurement_private.consents force row level security;
revoke all on table measurement_private.consents from public, anon, authenticated, service_role;

create table measurement_private.events (
  event_id uuid primary key,
  idempotency_key text not null unique,
  request_fingerprint text not null,
  correlation_id text not null,
  occurred_at timestamptz not null,
  environment text not null,
  flow_id uuid not null references measurement_private.consents (flow_id) on delete cascade,
  consent_receipt_id uuid not null,
  event_name text not null,
  campaign_id text,
  step smallint,
  outcome text,
  duration_bucket text,
  synthetic boolean not null,
  created_at timestamptz not null default now(),
  constraint measurement_events_idempotency_valid check (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'
  ),
  constraint measurement_events_fingerprint_valid check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint measurement_events_correlation_valid check (
    correlation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  constraint measurement_events_environment_valid check (
    environment in ('local', 'preview', 'production')
  ),
  constraint measurement_events_name_valid check (event_name in (
    'measurement_consent_granted', 'measurement_consent_withdrawn', 'campaign_arrived',
    'journey_started', 'journey_step_completed', 'journey_completed', 'handoff_attempted',
    'handoff_succeeded', 'handoff_failed'
  )),
  constraint measurement_events_campaign_valid check (
    (event_name = 'campaign_arrived' and campaign_id in ('dads', 'thanks_dad'))
    or (event_name <> 'campaign_arrived' and campaign_id is null)
  ),
  constraint measurement_events_step_valid check (
    (event_name = 'journey_step_completed' and step between 1 and 5)
    or (event_name <> 'journey_step_completed' and step is null)
  ),
  constraint measurement_events_outcome_valid check (
    (event_name = 'handoff_succeeded' and outcome = 'succeeded')
    or (event_name = 'handoff_failed' and outcome in ('failed', 'recovery-required'))
    or (event_name not in ('handoff_succeeded', 'handoff_failed') and outcome is null)
  ),
  constraint measurement_events_duration_valid check (
    (event_name in ('handoff_succeeded', 'handoff_failed')
      and duration_bucket in ('under-30s', '30-119s', '2-4m', '5m-plus'))
    or (event_name not in ('handoff_succeeded', 'handoff_failed') and duration_bucket is null)
  ),
  constraint measurement_events_consent_receipt_fk foreign key (flow_id, consent_receipt_id)
    references measurement_private.consents (flow_id, consent_receipt_id) on delete cascade
);

create index measurement_events_flow_occurred_idx
  on measurement_private.events (flow_id, occurred_at desc);
create index measurement_events_retention_idx
  on measurement_private.events (occurred_at);

alter table measurement_private.events enable row level security;
alter table measurement_private.events force row level security;
revoke all on table measurement_private.events from public, anon, authenticated, service_role;

create or replace function public.grant_measurement_consent(
  p_request_id uuid,
  p_idempotency_key text,
  p_correlation_id text,
  p_requested_at timestamptz,
  p_flow_id uuid,
  p_consent_receipt_id uuid,
  p_expires_at timestamptz,
  p_synthetic boolean,
  p_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_fingerprint text;
  consent measurement_private.consents%rowtype;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'
    or p_correlation_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
    or p_expires_at <= p_requested_at
    or p_expires_at > p_requested_at + interval '30 minutes'
    or p_environment not in ('local', 'preview', 'production')
  then
    raise exception using errcode = '22023', message = 'MEASUREMENT_CONSENT_INVALID';
  end if;

  expected_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'decision', 'granted',
    'synthetic', p_synthetic,
    'environment', p_environment
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into consent from measurement_private.consents
  where grant_idempotency_key = p_idempotency_key;
  if found then
    if consent.grant_fingerprint <> expected_fingerprint then
      raise exception using errcode = '23505', message = 'MEASUREMENT_IDEMPOTENCY_CONFLICT';
    end if;
  else
    insert into measurement_private.consents (
      flow_id, consent_receipt_id, status, grant_request_id, grant_idempotency_key,
      grant_fingerprint, grant_correlation_id, environment, granted_at, expires_at, synthetic
    ) values (
      p_flow_id, p_consent_receipt_id, 'granted', p_request_id, p_idempotency_key,
      expected_fingerprint, p_correlation_id, p_environment, p_requested_at, p_expires_at,
      p_synthetic
    ) returning * into consent;

    insert into measurement_private.events (
      event_id, idempotency_key, request_fingerprint, correlation_id, occurred_at, environment,
      flow_id, consent_receipt_id, event_name, synthetic
    ) values (
      gen_random_uuid(), 'consent-grant:' || substr(expected_fingerprint, 1, 64), expected_fingerprint,
      p_correlation_id, p_requested_at, p_environment,
      p_flow_id, p_consent_receipt_id, 'measurement_consent_granted', p_synthetic
    );
  end if;

  return jsonb_build_object(
    'flowId', consent.flow_id,
    'consentReceiptId', consent.consent_receipt_id,
    'status', consent.status,
    'expiresAt', consent.expires_at,
    'deleteAfter', consent.delete_after
  );
end;
$$;

create or replace function public.withdraw_measurement_consent(
  p_request_id uuid,
  p_idempotency_key text,
  p_correlation_id text,
  p_requested_at timestamptz,
  p_flow_id uuid,
  p_delete_after timestamptz,
  p_synthetic boolean,
  p_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_fingerprint text;
  consent measurement_private.consents%rowtype;
begin
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'
    or p_correlation_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
    or p_delete_after <= p_requested_at
    or p_delete_after > p_requested_at + interval '7 days'
    or p_environment not in ('local', 'preview', 'production')
  then
    raise exception using errcode = '22023', message = 'MEASUREMENT_WITHDRAWAL_INVALID';
  end if;

  expected_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'decision', 'withdrawn',
    'flowId', p_flow_id,
    'synthetic', p_synthetic,
    'environment', p_environment
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into consent from measurement_private.consents where flow_id = p_flow_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'MEASUREMENT_FLOW_INVALID';
  end if;
  if consent.synthetic <> p_synthetic or consent.environment <> p_environment then
    raise exception using errcode = '22023', message = 'MEASUREMENT_FLOW_INVALID';
  end if;
  if consent.status = 'withdrawn' then
    if consent.withdrawal_idempotency_key <> p_idempotency_key
      or consent.withdrawal_fingerprint <> expected_fingerprint
    then
      raise exception using errcode = '23505', message = 'MEASUREMENT_IDEMPOTENCY_CONFLICT';
    end if;
  else
    update measurement_private.consents set
      status = 'withdrawn', withdrawn_at = p_requested_at, withdrawal_request_id = p_request_id,
      withdrawal_idempotency_key = p_idempotency_key,
      withdrawal_fingerprint = expected_fingerprint,
      withdrawal_correlation_id = p_correlation_id, delete_after = p_delete_after
    where flow_id = p_flow_id returning * into consent;

    insert into measurement_private.events (
      event_id, idempotency_key, request_fingerprint, correlation_id, occurred_at, environment,
      flow_id, consent_receipt_id, event_name, synthetic
    ) values (
      gen_random_uuid(), 'consent-withdraw:' || substr(expected_fingerprint, 1, 64), expected_fingerprint,
      p_correlation_id, p_requested_at, p_environment,
      consent.flow_id, consent.consent_receipt_id, 'measurement_consent_withdrawn', p_synthetic
    );
  end if;

  return jsonb_build_object(
    'flowId', consent.flow_id,
    'consentReceiptId', consent.consent_receipt_id,
    'status', consent.status,
    'expiresAt', consent.expires_at,
    'deleteAfter', consent.delete_after
  );
end;
$$;

create or replace function public.record_measurement_event(
  p_event_id uuid,
  p_idempotency_key text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_environment text,
  p_flow_id uuid,
  p_consent_receipt_id uuid,
  p_event_name text,
  p_campaign_id text,
  p_step smallint,
  p_outcome text,
  p_duration_bucket text,
  p_synthetic boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_fingerprint text;
  existing measurement_private.events%rowtype;
  consent measurement_private.consents%rowtype;
begin
  expected_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'environment', p_environment, 'flowId', p_flow_id, 'consentReceiptId', p_consent_receipt_id,
    'eventName', p_event_name, 'campaignId', p_campaign_id, 'step', p_step, 'outcome', p_outcome,
    'durationBucket', p_duration_bucket, 'synthetic', p_synthetic
  )::text, 'UTF8'), 'sha256'), 'hex');

  select * into existing from measurement_private.events
  where idempotency_key = p_idempotency_key;
  if found then
    if existing.request_fingerprint <> expected_fingerprint then
      raise exception using errcode = '23505', message = 'MEASUREMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('eventId', existing.event_id, 'replayed', true);
  end if;

  select * into consent from measurement_private.consents where flow_id = p_flow_id;
  if not found or consent.status <> 'granted' or consent.consent_receipt_id <> p_consent_receipt_id
    or consent.expires_at <= p_occurred_at or consent.synthetic <> p_synthetic
    or consent.environment <> p_environment
  then
    raise exception using errcode = '42501', message = 'MEASUREMENT_CONSENT_REQUIRED';
  end if;

  insert into measurement_private.events (
    event_id, idempotency_key, request_fingerprint, correlation_id, occurred_at, environment,
    flow_id, consent_receipt_id, event_name, campaign_id, step, outcome, duration_bucket, synthetic
  ) values (
    p_event_id, p_idempotency_key, expected_fingerprint, p_correlation_id, p_occurred_at,
    p_environment, p_flow_id, p_consent_receipt_id, p_event_name, p_campaign_id, p_step, p_outcome,
    p_duration_bucket, p_synthetic
  );

  return jsonb_build_object('eventId', p_event_id, 'replayed', false);
end;
$$;

revoke all on function public.grant_measurement_consent(
  uuid, text, text, timestamptz, uuid, uuid, timestamptz, boolean, text
) from public, anon, authenticated, service_role;
grant execute on function public.grant_measurement_consent(
  uuid, text, text, timestamptz, uuid, uuid, timestamptz, boolean, text
) to service_role;

revoke all on function public.withdraw_measurement_consent(
  uuid, text, text, timestamptz, uuid, timestamptz, boolean, text
) from public, anon, authenticated, service_role;
grant execute on function public.withdraw_measurement_consent(
  uuid, text, text, timestamptz, uuid, timestamptz, boolean, text
) to service_role;

revoke all on function public.record_measurement_event(
  uuid, text, text, timestamptz, text, uuid, uuid, text, text, smallint, text, text, boolean
) from public, anon, authenticated, service_role;
grant execute on function public.record_measurement_event(
  uuid, text, text, timestamptz, text, uuid, uuid, text, text, smallint, text, text, boolean
) to service_role;

comment on schema measurement_private is
  'Private first-party pilot measurement records; not exposed through the Data API.';
comment on table measurement_private.events is
  'Strict pseudonymous events only; identity, treatment intent, health data, free text, URLs, referrers and replay are prohibited.';
