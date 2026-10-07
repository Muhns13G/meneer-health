-- Sprint 7.9 measurement governance evidence. Raw records remain private and short lived. Only
-- purpose-bound server RPCs can inventory or delete a flow; product access is limited to
-- deidentified daily aggregates. The scheduled purge never accepts caller-supplied identifiers.

create extension if not exists pg_cron with schema pg_catalog;

alter table measurement_private.events
  add column aggregated_at timestamptz;

create table measurement_private.daily_aggregates (
  aggregate_date date not null,
  environment text not null,
  event_name text not null,
  campaign_id text not null default '',
  step smallint not null default 0,
  outcome text not null default '',
  duration_bucket text not null default '',
  synthetic boolean not null,
  event_count bigint not null,
  refreshed_at timestamptz not null,
  primary key (
    aggregate_date, environment, event_name, campaign_id, step, outcome, duration_bucket, synthetic
  ),
  constraint measurement_aggregate_environment_valid check (
    environment in ('local', 'preview', 'production')
  ),
  constraint measurement_aggregate_event_count_valid check (event_count > 0),
  constraint measurement_aggregate_dimensions_valid check (
    event_name in (
      'measurement_consent_granted', 'measurement_consent_withdrawn', 'campaign_arrived',
      'journey_started', 'journey_step_completed', 'journey_completed', 'handoff_attempted',
      'handoff_succeeded', 'handoff_failed'
    )
  )
);

alter table measurement_private.daily_aggregates enable row level security;
alter table measurement_private.daily_aggregates force row level security;
revoke all on table measurement_private.daily_aggregates
  from public, anon, authenticated, service_role;

create table measurement_private.access_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null,
  assurance text not null,
  purpose text not null,
  action text not null,
  environment text,
  target_fingerprint text,
  record_count bigint not null,
  occurred_at timestamptz not null,
  constraint measurement_access_actor_role_valid check (
    actor_role in ('privacy_reviewer', 'security_reviewer', 'product_reviewer', 'operations_reviewer')
  ),
  constraint measurement_access_assurance_valid check (assurance = 'aal2'),
  constraint measurement_access_purpose_valid check (
    purpose in ('privacy_request', 'security_investigation', 'product_review', 'retention_operation')
  ),
  constraint measurement_access_action_valid check (
    action in ('raw_inventory', 'aggregate_export', 'flow_deletion', 'retention_purge')
  ),
  constraint measurement_access_environment_valid check (
    environment is null or environment in ('local', 'preview', 'production')
  ),
  constraint measurement_access_target_valid check (
    target_fingerprint is null or target_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  constraint measurement_access_record_count_valid check (record_count >= 0)
);

alter table measurement_private.access_evidence enable row level security;
alter table measurement_private.access_evidence force row level security;
revoke all on table measurement_private.access_evidence
  from public, anon, authenticated, service_role;

create or replace function public.export_measurement_flow_inventory(
  p_actor_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_flow_id uuid,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inventory jsonb;
  target_hash text;
  inventory_count bigint;
begin
  if p_actor_role not in ('privacy_reviewer', 'security_reviewer')
    or p_assurance <> 'aal2'
    or p_purpose not in ('privacy_request', 'security_investigation')
  then
    raise exception using errcode = '42501', message = 'MEASUREMENT_ACCESS_DENIED';
  end if;

  select jsonb_build_object(
    'flowId', consent.flow_id,
    'consentReceiptId', consent.consent_receipt_id,
    'status', consent.status,
    'environment', consent.environment,
    'grantedAt', consent.granted_at,
    'expiresAt', consent.expires_at,
    'withdrawnAt', consent.withdrawn_at,
    'deleteAfter', consent.delete_after,
    'synthetic', consent.synthetic,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventId', event.event_id,
        'occurredAt', event.occurred_at,
        'eventName', event.event_name,
        'campaignId', event.campaign_id,
        'step', event.step,
        'outcome', event.outcome,
        'durationBucket', event.duration_bucket,
        'synthetic', event.synthetic
      ) order by event.occurred_at)
      from measurement_private.events event
      where event.flow_id = consent.flow_id
    ), '[]'::jsonb)
  ), count(event.event_id)
  into inventory, inventory_count
  from measurement_private.consents consent
  left join measurement_private.events event on event.flow_id = consent.flow_id
  where consent.flow_id = p_flow_id
  group by consent.flow_id;

  if inventory is null then
    raise exception using errcode = '22023', message = 'MEASUREMENT_FLOW_INVALID';
  end if;

  target_hash := encode(extensions.digest(convert_to(p_flow_id::text, 'UTF8'), 'sha256'), 'hex');
  insert into measurement_private.access_evidence (
    actor_id, actor_role, assurance, purpose, action, environment, target_fingerprint,
    record_count, occurred_at
  ) values (
    p_actor_id, p_actor_role, p_assurance, p_purpose, 'raw_inventory', inventory->>'environment',
    target_hash, inventory_count, p_occurred_at
  );

  return inventory;
end;
$$;

create or replace function public.export_measurement_daily_aggregates(
  p_actor_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_environment text,
  p_from_date date,
  p_to_date date,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  exported jsonb;
  exported_count bigint;
begin
  if p_actor_role not in (
      'privacy_reviewer', 'security_reviewer', 'product_reviewer', 'operations_reviewer'
    )
    or p_assurance <> 'aal2'
    or p_purpose not in ('privacy_request', 'security_investigation', 'product_review')
    or p_environment not in ('local', 'preview', 'production')
    or p_to_date < p_from_date
    or p_to_date > p_from_date + 366
  then
    raise exception using errcode = '42501', message = 'MEASUREMENT_ACCESS_DENIED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', aggregate_date,
    'environment', environment,
    'eventName', event_name,
    'campaignId', nullif(campaign_id, ''),
    'step', nullif(step, 0),
    'outcome', nullif(outcome, ''),
    'durationBucket', nullif(duration_bucket, ''),
    'synthetic', synthetic,
    'eventCount', event_count
  ) order by aggregate_date, event_name), '[]'::jsonb), count(*)
  into exported, exported_count
  from measurement_private.daily_aggregates
  where environment = p_environment
    and aggregate_date between p_from_date and p_to_date;

  insert into measurement_private.access_evidence (
    actor_id, actor_role, assurance, purpose, action, environment, record_count, occurred_at
  ) values (
    p_actor_id, p_actor_role, p_assurance, p_purpose, 'aggregate_export', p_environment,
    exported_count, p_occurred_at
  );

  return exported;
end;
$$;

create or replace function public.delete_withdrawn_measurement_flow(
  p_actor_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_flow_id uuid,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  consent measurement_private.consents%rowtype;
  deleted_count bigint;
  consent_retained boolean;
  target_hash text;
begin
  if p_actor_role not in ('privacy_reviewer', 'security_reviewer')
    or p_assurance <> 'aal2'
    or p_purpose <> 'privacy_request'
  then
    raise exception using errcode = '42501', message = 'MEASUREMENT_ACCESS_DENIED';
  end if;

  select * into consent
  from measurement_private.consents
  where flow_id = p_flow_id
  for update;

  if not found or consent.status <> 'withdrawn'
    or (not consent.synthetic and consent.delete_after > p_occurred_at)
  then
    raise exception using errcode = '42501', message = 'MEASUREMENT_DELETION_NOT_DUE';
  end if;

  delete from measurement_private.events where flow_id = p_flow_id;
  get diagnostics deleted_count = row_count;
  consent_retained := not consent.synthetic;
  if consent.synthetic then
    delete from measurement_private.consents where flow_id = p_flow_id;
  end if;
  target_hash := encode(extensions.digest(convert_to(p_flow_id::text, 'UTF8'), 'sha256'), 'hex');

  insert into measurement_private.access_evidence (
    actor_id, actor_role, assurance, purpose, action, environment, target_fingerprint,
    record_count, occurred_at
  ) values (
    p_actor_id, p_actor_role, p_assurance, p_purpose, 'flow_deletion', consent.environment,
    target_hash, deleted_count, p_occurred_at
  );

  return jsonb_build_object(
    'flowId', p_flow_id,
    'deletedRawEvents', deleted_count,
    'consentEvidenceRetained', consent_retained
  );
end;
$$;

create or replace function public.run_measurement_retention(p_now timestamptz default clock_timestamp())
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aggregated_count bigint;
  withdrawn_deleted bigint;
  expired_raw_deleted bigint;
  expired_consent_deleted bigint;
  expired_aggregates_deleted bigint;
begin
  with eligible as (
    select * from measurement_private.events
    where aggregated_at is null and occurred_at < date_trunc('day', p_now)
  ), grouped as (
    select occurred_at::date as aggregate_date, environment, event_name,
      coalesce(campaign_id, '') as campaign_id, coalesce(step, 0) as step,
      coalesce(outcome, '') as outcome, coalesce(duration_bucket, '') as duration_bucket,
      synthetic, count(*) as event_count
    from eligible
    group by occurred_at::date, environment, event_name, campaign_id, step, outcome,
      duration_bucket, synthetic
  ), upserted as (
    insert into measurement_private.daily_aggregates (
      aggregate_date, environment, event_name, campaign_id, step, outcome, duration_bucket,
      synthetic, event_count, refreshed_at
    )
    select aggregate_date, environment, event_name, campaign_id, step, outcome, duration_bucket,
      synthetic, event_count, p_now
    from grouped
    on conflict (
      aggregate_date, environment, event_name, campaign_id, step, outcome, duration_bucket, synthetic
    ) do update set
      event_count = measurement_private.daily_aggregates.event_count + excluded.event_count,
      refreshed_at = excluded.refreshed_at
    returning event_count
  )
  select coalesce(sum(event_count), 0) into aggregated_count from upserted;

  update measurement_private.events
  set aggregated_at = p_now
  where aggregated_at is null and occurred_at < date_trunc('day', p_now);

  delete from measurement_private.events event
  using measurement_private.consents consent
  where event.flow_id = consent.flow_id
    and consent.status = 'withdrawn'
    and consent.delete_after <= p_now;
  get diagnostics withdrawn_deleted = row_count;

  delete from measurement_private.events where occurred_at < p_now - interval '30 days';
  get diagnostics expired_raw_deleted = row_count;

  delete from measurement_private.consents where granted_at < p_now - interval '12 months';
  get diagnostics expired_consent_deleted = row_count;

  delete from measurement_private.daily_aggregates
  where aggregate_date < (p_now - interval '12 months')::date;
  get diagnostics expired_aggregates_deleted = row_count;

  return jsonb_build_object(
    'aggregatedEvents', aggregated_count,
    'withdrawnRawDeleted', withdrawn_deleted,
    'expiredRawDeleted', expired_raw_deleted,
    'expiredConsentDeleted', expired_consent_deleted,
    'expiredAggregatesDeleted', expired_aggregates_deleted
  );
end;
$$;

revoke all on function public.export_measurement_flow_inventory(
  uuid, text, text, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.export_measurement_flow_inventory(
  uuid, text, text, text, uuid, timestamptz
) to service_role;

revoke all on function public.export_measurement_daily_aggregates(
  uuid, text, text, text, text, date, date, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.export_measurement_daily_aggregates(
  uuid, text, text, text, text, date, date, timestamptz
) to service_role;

revoke all on function public.delete_withdrawn_measurement_flow(
  uuid, text, text, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.delete_withdrawn_measurement_flow(
  uuid, text, text, text, uuid, timestamptz
) to service_role;

revoke all on function public.run_measurement_retention(timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.run_measurement_retention(timestamptz) to service_role;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'measurement-retention-daily') then
    perform cron.schedule(
      'measurement-retention-daily',
      '17 2 * * *',
      'select public.run_measurement_retention();'
    );
  end if;
end;
$$;

comment on table measurement_private.daily_aggregates is
  'Daily deidentified counts with no flow, consent, identity, URL, referrer, replay or free-text fields.';
comment on table measurement_private.access_evidence is
  'Append-only purpose, role and assurance evidence for governed measurement access and deletion.';
