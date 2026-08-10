-- Sprint 5.13 lifecycle, rights, hold and recovery evidence. Browser roles remain deny-default.
-- Recovery artifacts contain synthetic data locally until the production activation gates pass.

create schema if not exists lifecycle_private;
revoke all on schema lifecycle_private from public, anon, authenticated, service_role;

create table public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  request_type text not null,
  status text not null default 'verified',
  idempotency_key text not null,
  requested_at timestamptz not null,
  verified_at timestamptz not null,
  completed_at timestamptz,
  export_expires_at timestamptz,
  result_digest text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_subject_requests_type_valid check (request_type in ('access_export', 'erasure')),
  constraint data_subject_requests_status_valid check (
    status in ('verified', 'in_progress', 'pending_reconciliation', 'completed', 'rejected')
  ),
  constraint data_subject_requests_idempotency_not_blank check (length(btrim(idempotency_key)) > 0),
  constraint data_subject_requests_digest_format check (
    result_digest is null or result_digest ~ '^[a-f0-9]{64}$'
  ),
  constraint data_subject_requests_scope_unique unique (tenant_id, idempotency_key)
);

create index data_subject_requests_subject_status_idx
  on public.data_subject_requests (tenant_id, subject_id, status, requested_at desc);

create table public.record_holds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  hold_type text not null,
  authority_code text not null,
  status text not null default 'active',
  applied_at timestamptz not null,
  review_due_at timestamptz not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  constraint record_holds_type_valid check (hold_type in ('legal', 'clinical')),
  constraint record_holds_authority_format check (authority_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  constraint record_holds_status_valid check (status in ('active', 'released')),
  constraint record_holds_review_window check (
    review_due_at > applied_at and review_due_at <= applied_at + interval '90 days'
  ),
  constraint record_holds_release_consistent check (
    (status = 'released' and released_at is not null)
    or (status = 'active' and released_at is null)
  )
);

create unique index record_holds_one_active_scope_idx
  on public.record_holds (tenant_id, subject_id, hold_type, authority_code)
  where status = 'active';

create table public.data_subject_reconciliation (
  request_id uuid not null references public.data_subject_requests (id) on delete restrict,
  destination text not null,
  status text not null default 'pending',
  reconciled_at timestamptz,
  evidence_digest text,
  created_at timestamptz not null default now(),
  primary key (request_id, destination),
  constraint data_subject_reconciliation_destination_valid check (
    destination in ('database', 'identity', 'storage', 'recovery_backup')
  ),
  constraint data_subject_reconciliation_status_valid check (status in ('pending', 'completed')),
  constraint data_subject_reconciliation_evidence_format check (
    evidence_digest is null or evidence_digest ~ '^[a-f0-9]{64}$'
  ),
  constraint data_subject_reconciliation_completion_consistent check (
    (status = 'completed' and reconciled_at is not null and evidence_digest is not null)
    or (status = 'pending' and reconciled_at is null and evidence_digest is null)
  )
);

create table public.recovery_exercises (
  id uuid primary key,
  environment text not null,
  schema_version text not null,
  backup_checksum text not null,
  source_checksum text not null,
  restored_checksum text not null,
  source_record_count bigint not null,
  restored_record_count bigint not null,
  recovery_point_seconds integer not null,
  recovery_time_seconds integer not null,
  heartbeat_delivered boolean not null,
  exercised_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint recovery_exercises_environment_valid check (environment in ('local', 'production')),
  constraint recovery_exercises_schema_format check (schema_version ~ '^\d{14}$'),
  constraint recovery_exercises_checksum_format check (
    backup_checksum ~ '^[a-f0-9]{64}$'
    and source_checksum ~ '^[a-f0-9]{64}$'
    and restored_checksum ~ '^[a-f0-9]{64}$'
  ),
  constraint recovery_exercises_counts_valid check (
    source_record_count >= 0 and restored_record_count >= 0
  ),
  constraint recovery_exercises_durations_valid check (
    recovery_point_seconds >= 0 and recovery_time_seconds >= 0
  )
);

alter table public.data_subject_requests enable row level security;
alter table public.data_subject_requests force row level security;
alter table public.record_holds enable row level security;
alter table public.record_holds force row level security;
alter table public.data_subject_reconciliation enable row level security;
alter table public.data_subject_reconciliation force row level security;
alter table public.recovery_exercises enable row level security;
alter table public.recovery_exercises force row level security;

revoke all on public.data_subject_requests from public, anon, authenticated, service_role;
revoke all on public.record_holds from public, anon, authenticated, service_role;
revoke all on public.data_subject_reconciliation from public, anon, authenticated, service_role;
revoke all on public.recovery_exercises from public, anon, authenticated, service_role;

create or replace function lifecycle_private.assert_context(
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_correlation_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_role not in ('auditor', 'admin')
    or p_assurance <> 'aal2'
    or p_purpose <> 'privacy_review'
    or p_correlation_id !~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$'
  then
    raise exception using errcode = '42501', message = 'LIFECYCLE_CONTEXT_FORBIDDEN';
  end if;
end;
$$;

create or replace function lifecycle_private.request_result(p_request_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'requestId', request.id,
    'status', request.status,
    'expiresAt', request.export_expires_at,
    'reconciliationPending', coalesce(
      (
        select jsonb_agg(item.destination order by item.destination)
        from public.data_subject_reconciliation item
        where item.request_id = request.id and item.status = 'pending'
      ),
      '[]'::jsonb
    )
  )
  from public.data_subject_requests request
  where request.id = p_request_id;
$$;

revoke all on function lifecycle_private.assert_context(text, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function lifecycle_private.request_result(uuid)
from public, anon, authenticated, service_role;

create or replace function public.open_data_subject_request(
  p_tenant_id uuid,
  p_subject_id uuid,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_request_type text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.data_subject_requests%rowtype;
begin
  perform lifecycle_private.assert_context(p_actor_role, p_assurance, p_purpose, p_correlation_id);
  if p_request_type not in ('access_export', 'erasure') or length(btrim(p_idempotency_key)) < 8 then
    raise exception using errcode = '22023', message = 'LIFECYCLE_REQUEST_INVALID';
  end if;
  if not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = p_tenant_id and membership.subject_id = p_subject_id
  ) then
    raise exception using errcode = '22023', message = 'LIFECYCLE_SCOPE_INVALID';
  end if;

  insert into public.data_subject_requests (
    tenant_id, subject_id, request_type, idempotency_key, requested_at, verified_at
  ) values (
    p_tenant_id, p_subject_id, p_request_type, p_idempotency_key, p_occurred_at, p_occurred_at
  )
  on conflict (tenant_id, idempotency_key) do nothing;

  select * into request from public.data_subject_requests
  where tenant_id = p_tenant_id and idempotency_key = p_idempotency_key;
  if request.subject_id <> p_subject_id or request.request_type <> p_request_type then
    raise exception using errcode = '23505', message = 'LIFECYCLE_IDEMPOTENCY_CONFLICT';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(request.id::text, 0));

  if not exists (
    select 1 from public.audit_events event
    where event.tenant_id = p_tenant_id
      and event.action = 'lifecycle.request.opened'
      and event.resource_id = request.id::text
  ) then
    perform audit_private.append_audit_fact(
      p_tenant_id, 'workforce', p_actor_subject_id, p_actor_role, p_assurance,
      'lifecycle.request.opened', p_subject_id, 'privacy_request', request.id::text,
      p_purpose, 'lifecycle.v1', 'succeeded', 'REQUEST_VERIFIED', p_correlation_id,
      p_idempotency_key, p_occurred_at, jsonb_build_object('eventName', 'lifecycle.request.opened')
    );
  end if;
  return lifecycle_private.request_result(request.id);
end;
$$;

create or replace function public.apply_record_hold(
  p_tenant_id uuid,
  p_subject_id uuid,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_hold_type text,
  p_authority_code text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare hold_id uuid;
begin
  perform lifecycle_private.assert_context(p_actor_role, p_assurance, p_purpose, p_correlation_id);
  insert into public.record_holds (
    tenant_id, subject_id, hold_type, authority_code, applied_at, review_due_at
  ) values (
    p_tenant_id, p_subject_id, p_hold_type, p_authority_code, p_occurred_at,
    p_occurred_at + interval '90 days'
  ) returning id into hold_id;
  perform audit_private.append_audit_fact(
    p_tenant_id, 'workforce', p_actor_subject_id, p_actor_role, p_assurance,
    'lifecycle.hold.applied', p_subject_id, 'record_hold', hold_id::text,
    p_purpose, 'lifecycle.v1', 'succeeded', 'HOLD_APPLIED', p_correlation_id,
    hold_id::text, p_occurred_at, jsonb_build_object('eventName', 'lifecycle.hold.applied')
  );
  return hold_id;
end;
$$;

create or replace function public.release_record_hold(
  p_tenant_id uuid,
  p_subject_id uuid,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_hold_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform lifecycle_private.assert_context(p_actor_role, p_assurance, p_purpose, p_correlation_id);
  update public.record_holds set status = 'released', released_at = p_occurred_at
  where id = p_hold_id and tenant_id = p_tenant_id and subject_id = p_subject_id and status = 'active';
  if not found then raise exception using errcode = '22023', message = 'LIFECYCLE_HOLD_NOT_FOUND'; end if;
  perform audit_private.append_audit_fact(
    p_tenant_id, 'workforce', p_actor_subject_id, p_actor_role, p_assurance,
    'lifecycle.hold.released', p_subject_id, 'record_hold', p_hold_id::text,
    p_purpose, 'lifecycle.v1', 'succeeded', 'HOLD_RELEASED', p_correlation_id,
    p_hold_id::text, p_occurred_at, jsonb_build_object('eventName', 'lifecycle.hold.released')
  );
end;
$$;

create or replace function public.complete_data_subject_export(
  p_tenant_id uuid,
  p_subject_id uuid,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare export_digest text;
begin
  perform lifecycle_private.assert_context(p_actor_role, p_assurance, p_purpose, p_correlation_id);
  if exists (
    select 1 from public.data_subject_requests request
    where request.id = p_request_id and request.tenant_id = p_tenant_id
      and request.subject_id = p_subject_id and request.request_type = 'access_export'
      and request.status = 'completed'
  ) then
    return lifecycle_private.request_result(p_request_id);
  end if;
  select encode(extensions.digest(convert_to(jsonb_build_object(
    'subjectId', subject.id,
    'status', subject.status,
    'contacts', (select count(*) from public.subject_contacts c where c.subject_id = subject.id),
    'memberships', (select count(*) from public.tenant_memberships m where m.subject_id = subject.id and m.tenant_id = p_tenant_id),
    'workflows', (select count(*) from public.workflow_instances w where w.subject_id = subject.id and w.tenant_id = p_tenant_id)
  )::text, 'UTF8'), 'sha256'), 'hex') into export_digest
  from public.subjects subject where subject.id = p_subject_id;

  update public.data_subject_requests set
    status = 'completed', completed_at = p_occurred_at,
    export_expires_at = p_occurred_at + interval '24 hours', result_digest = export_digest,
    updated_at = clock_timestamp()
  where id = p_request_id and tenant_id = p_tenant_id and subject_id = p_subject_id
    and request_type = 'access_export' and status = 'verified';
  if not found then raise exception using errcode = '22023', message = 'LIFECYCLE_EXPORT_INVALID'; end if;
  perform audit_private.append_audit_fact(
    p_tenant_id, 'workforce', p_actor_subject_id, p_actor_role, p_assurance,
    'lifecycle.export.completed', p_subject_id, 'privacy_request', p_request_id::text,
    p_purpose, 'lifecycle.v1', 'succeeded', 'EXPORT_READY', p_correlation_id,
    p_request_id::text, p_occurred_at, jsonb_build_object('eventName', 'lifecycle.export.completed')
  );
  return lifecycle_private.request_result(p_request_id);
end;
$$;

create or replace function public.execute_data_subject_erasure(
  p_tenant_id uuid,
  p_subject_id uuid,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare digest text;
begin
  perform lifecycle_private.assert_context(p_actor_role, p_assurance, p_purpose, p_correlation_id);
  if exists (
    select 1 from public.data_subject_requests request
    where request.id = p_request_id and request.tenant_id = p_tenant_id
      and request.subject_id = p_subject_id and request.request_type = 'erasure'
      and request.status in ('pending_reconciliation', 'completed')
  ) then
    return lifecycle_private.request_result(p_request_id);
  end if;
  if exists (
    select 1 from public.record_holds hold
    where hold.tenant_id = p_tenant_id and hold.subject_id = p_subject_id and hold.status = 'active'
  ) then
    raise exception using errcode = '55000', message = 'LIFECYCLE_HOLD_ACTIVE';
  end if;
  perform 1 from public.data_subject_requests request
  where request.id = p_request_id and request.tenant_id = p_tenant_id
    and request.subject_id = p_subject_id and request.request_type = 'erasure'
    and request.status = 'verified';
  if not found then raise exception using errcode = '22023', message = 'LIFECYCLE_ERASURE_INVALID'; end if;

  delete from public.external_identities where subject_id = p_subject_id;
  delete from public.subject_contacts where subject_id = p_subject_id;
  update public.identity_sessions set status = 'revoked', revoked_at = p_occurred_at,
    revocation_reason = 'privacy_erasure', updated_at = clock_timestamp()
  where subject_id = p_subject_id and status = 'active';
  update public.tenant_memberships set status = 'revoked', updated_at = clock_timestamp()
  where tenant_id = p_tenant_id and subject_id = p_subject_id;
  update public.access_assignments set status = 'revoked', updated_at = clock_timestamp()
  where tenant_id = p_tenant_id and subject_id = p_subject_id;
  update public.subjects set status = 'erased', updated_at = clock_timestamp() where id = p_subject_id;

  digest := encode(extensions.digest(convert_to(p_request_id::text || ':database:completed', 'UTF8'), 'sha256'), 'hex');
  insert into public.data_subject_reconciliation (request_id, destination, status, reconciled_at, evidence_digest)
  values (p_request_id, 'database', 'completed', p_occurred_at, digest),
         (p_request_id, 'identity', 'pending', null, null),
         (p_request_id, 'storage', 'pending', null, null),
         (p_request_id, 'recovery_backup', 'pending', null, null);
  update public.data_subject_requests set status = 'pending_reconciliation', updated_at = clock_timestamp()
  where id = p_request_id;
  perform audit_private.append_audit_fact(
    p_tenant_id, 'workforce', p_actor_subject_id, p_actor_role, p_assurance,
    'lifecycle.erasure.executed', p_subject_id, 'privacy_request', p_request_id::text,
    p_purpose, 'lifecycle.v1', 'succeeded', 'RECONCILIATION_PENDING', p_correlation_id,
    p_request_id::text, p_occurred_at, jsonb_build_object('eventName', 'lifecycle.erasure.executed')
  );
  return lifecycle_private.request_result(p_request_id);
end;
$$;

create or replace function public.reconcile_data_subject_destination(
  p_tenant_id uuid,
  p_subject_id uuid,
  p_actor_subject_id uuid,
  p_actor_role text,
  p_assurance text,
  p_purpose text,
  p_correlation_id text,
  p_occurred_at timestamptz,
  p_request_id uuid,
  p_destination text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare digest text;
begin
  perform lifecycle_private.assert_context(p_actor_role, p_assurance, p_purpose, p_correlation_id);
  if p_destination not in ('identity', 'storage', 'recovery_backup') then
    raise exception using errcode = '22023', message = 'LIFECYCLE_DESTINATION_INVALID';
  end if;
  if exists (
    select 1 from public.data_subject_reconciliation item
    where item.request_id = p_request_id and item.destination = p_destination
      and item.status = 'completed'
  ) then
    return lifecycle_private.request_result(p_request_id);
  end if;
  digest := encode(extensions.digest(convert_to(p_request_id::text || ':' || p_destination || ':completed', 'UTF8'), 'sha256'), 'hex');
  update public.data_subject_reconciliation set
    status = 'completed', reconciled_at = p_occurred_at, evidence_digest = digest
  where request_id = p_request_id and destination = p_destination and status = 'pending';
  if not found then raise exception using errcode = '22023', message = 'LIFECYCLE_RECONCILIATION_INVALID'; end if;
  if not exists (
    select 1 from public.data_subject_reconciliation item
    where item.request_id = p_request_id and item.status = 'pending'
  ) then
    update public.data_subject_requests set status = 'completed', completed_at = p_occurred_at,
      result_digest = digest, updated_at = clock_timestamp()
    where id = p_request_id and tenant_id = p_tenant_id and subject_id = p_subject_id;
  end if;
  perform audit_private.append_audit_fact(
    p_tenant_id, 'workforce', p_actor_subject_id, p_actor_role, p_assurance,
    'lifecycle.reconciliation.completed', p_subject_id, 'privacy_request', p_request_id::text,
    p_purpose, 'lifecycle.v1', 'succeeded', 'DESTINATION_RECONCILED', p_correlation_id,
    p_destination, p_occurred_at, jsonb_build_object('eventName', 'lifecycle.reconciliation.completed')
  );
  return lifecycle_private.request_result(p_request_id);
end;
$$;

create or replace function public.record_recovery_exercise(
  p_id uuid,
  p_environment text,
  p_schema_version text,
  p_backup_checksum text,
  p_source_checksum text,
  p_restored_checksum text,
  p_source_record_count bigint,
  p_restored_record_count bigint,
  p_recovery_point_seconds integer,
  p_recovery_time_seconds integer,
  p_heartbeat_delivered boolean,
  p_exercised_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_environment not in ('local', 'production')
    or p_source_checksum <> p_restored_checksum
    or p_source_record_count <> p_restored_record_count
    or p_recovery_point_seconds > 3600
    or p_recovery_time_seconds > 14400
  then
    raise exception using errcode = '22023', message = 'RECOVERY_RECONCILIATION_FAILED';
  end if;
  insert into public.recovery_exercises values (
    p_id, p_environment, p_schema_version, p_backup_checksum, p_source_checksum,
    p_restored_checksum, p_source_record_count, p_restored_record_count,
    p_recovery_point_seconds, p_recovery_time_seconds, p_heartbeat_delivered,
    p_exercised_at, clock_timestamp()
  );
  return jsonb_build_object(
    'exerciseId', p_id,
    'reconciled', true,
    'heartbeatDelivered', p_heartbeat_delivered,
    'rpoMet', p_recovery_point_seconds <= 3600,
    'rtoMet', p_recovery_time_seconds <= 14400
  );
end;
$$;

revoke all on function public.open_data_subject_request(uuid,uuid,uuid,text,text,text,text,timestamptz,text,text)
from public, anon, authenticated, service_role;
revoke all on function public.apply_record_hold(uuid,uuid,uuid,text,text,text,text,timestamptz,text,text)
from public, anon, authenticated, service_role;
revoke all on function public.release_record_hold(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid)
from public, anon, authenticated, service_role;
revoke all on function public.complete_data_subject_export(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid)
from public, anon, authenticated, service_role;
revoke all on function public.execute_data_subject_erasure(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid)
from public, anon, authenticated, service_role;
revoke all on function public.reconcile_data_subject_destination(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid,text)
from public, anon, authenticated, service_role;
revoke all on function public.record_recovery_exercise(uuid,text,text,text,text,text,bigint,bigint,integer,integer,boolean,timestamptz)
from public, anon, authenticated, service_role;

grant execute on function public.open_data_subject_request(uuid,uuid,uuid,text,text,text,text,timestamptz,text,text) to service_role;
grant execute on function public.apply_record_hold(uuid,uuid,uuid,text,text,text,text,timestamptz,text,text) to service_role;
grant execute on function public.release_record_hold(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid) to service_role;
grant execute on function public.complete_data_subject_export(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid) to service_role;
grant execute on function public.execute_data_subject_erasure(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid) to service_role;
grant execute on function public.reconcile_data_subject_destination(uuid,uuid,uuid,text,text,text,text,timestamptz,uuid,text) to service_role;
grant execute on function public.record_recovery_exercise(uuid,text,text,text,text,text,bigint,bigint,integer,integer,boolean,timestamptz) to service_role;

comment on table public.data_subject_requests is
  'Verified, purpose-bound data-subject workflow evidence; export payloads are never persisted here.';
comment on table public.record_holds is
  'Scoped legal/clinical holds reviewed within 90 days; a hold pauses but does not reset disposition.';
comment on table public.data_subject_reconciliation is
  'Per-destination erasure propagation evidence including recovery-backup tombstone handling.';
comment on table public.recovery_exercises is
  'Synthetic restore reconciliation and heartbeat evidence; no restored content is retained.';
