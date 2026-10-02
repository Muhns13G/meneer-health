-- Sprint 9.2: portable, inactive pilot profile and instrument evidence.
-- Browser roles remain deny-default. Task 9.6 owns the atomic activation command.

create table public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_id uuid not null,
  membership_role text not null default 'patient',
  given_name text,
  family_name text,
  mobile_e164 text,
  mobile_verification_status text not null default 'pending',
  mobile_verified_at timestamptz,
  contact_preference text not null default 'email',
  status text not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_profiles_patient_role check (membership_role = 'patient'),
  constraint client_profiles_membership_fk foreign key (tenant_id, subject_id, membership_role)
    references public.tenant_memberships (tenant_id, subject_id, role) on delete restrict,
  constraint client_profiles_scope_unique unique (tenant_id, subject_id),
  constraint client_profiles_scope_key unique (id, tenant_id, subject_id),
  constraint client_profiles_version_positive check (version > 0),
  constraint client_profiles_status_valid check (
    status in ('active', 'restricted', 'closure_pending', 'deidentified')
  ),
  constraint client_profiles_preference_valid check (contact_preference in ('email', 'whatsapp')),
  constraint client_profiles_mobile_status_valid check (
    mobile_verification_status in ('pending', 'verified', 'revoked')
  ),
  constraint client_profiles_mobile_verification_consistent check (
    (mobile_verification_status = 'verified' and mobile_verified_at is not null)
    or (mobile_verification_status <> 'verified' and mobile_verified_at is null)
  ),
  constraint client_profiles_values_valid check (
    (
      status = 'deidentified'
      and given_name is null and family_name is null and mobile_e164 is null
      and mobile_verification_status = 'revoked' and mobile_verified_at is null
    )
    or (
      status <> 'deidentified'
      and given_name is not null and length(btrim(given_name)) between 1 and 100
      and family_name is not null and length(btrim(family_name)) between 1 and 100
      and mobile_e164 is not null and mobile_e164 ~ '^\+[1-9][0-9]{1,14}$'
    )
  )
);

create index client_profiles_subject_id_idx on public.client_profiles (subject_id);

-- History contains only field names and transition facts, not duplicate contact values.
create table public.client_profile_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  tenant_id uuid not null,
  subject_id uuid not null,
  profile_version integer not null,
  event_type text not null,
  changed_fields text[] not null default '{}',
  actor_subject_id uuid references public.subjects (id) on delete restrict,
  correlation_id text not null,
  idempotency_key uuid not null,
  recorded_at timestamptz not null default now(),
  constraint client_profile_events_profile_fk foreign key (profile_id, tenant_id, subject_id)
    references public.client_profiles (id, tenant_id, subject_id) on delete restrict,
  constraint client_profile_events_version_positive check (profile_version > 0),
  constraint client_profile_events_type_valid check (
    event_type in ('created', 'corrected', 'restricted', 'closure_requested', 'deidentified')
  ),
  constraint client_profile_events_changed_fields_valid check (
    changed_fields <@ array[
      'given_name', 'family_name', 'mobile_e164', 'mobile_verification_status',
      'contact_preference', 'status'
    ]::text[]
  ),
  constraint client_profile_events_correlation_valid check (
    correlation_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  ),
  constraint client_profile_events_idempotency_unique unique (tenant_id, subject_id, idempotency_key)
);

create index client_profile_events_profile_idx
  on public.client_profile_events (profile_id, recorded_at desc);
create index client_profile_events_actor_idx
  on public.client_profile_events (actor_subject_id) where actor_subject_id is not null;

-- Only approved, reproducible versions enter this table. No draft or placeholder publication.
create table public.pilot_instrument_publications (
  id uuid primary key default gen_random_uuid(),
  instrument_id text not null,
  instrument_version text not null,
  locale text not null default 'en-ZA',
  document_body text not null,
  content_sha256 text not null,
  rendered_locator text not null,
  approval_reference text not null,
  approved_by_subject_id uuid not null references public.subjects (id) on delete restrict,
  approved_at timestamptz not null,
  published_at timestamptz not null default now(),
  effective_at timestamptz not null,
  expires_at timestamptz,
  status text not null default 'published',
  retired_at timestamptz,
  constraint pilot_instruments_id_valid check (
    instrument_id in (
      'pilot-account-terms', 'pilot-privacy-notice',
      'pilot-order-terms', 'pilot-handoff-authorisation'
    )
  ),
  constraint pilot_instruments_version_valid check (instrument_version ~ '^[1-9][0-9]*\.[0-9]+$'),
  constraint pilot_instruments_locale_valid check (locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  constraint pilot_instruments_body_valid check (length(document_body) between 1 and 100000),
  constraint pilot_instruments_hash_valid check (content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint pilot_instruments_locator_valid check (
    rendered_locator ~ '^/[A-Za-z0-9/_-]+$' and rendered_locator !~ '^//'
  ),
  constraint pilot_instruments_approval_valid check (
    length(btrim(approval_reference)) between 1 and 128 and approved_at <= published_at
  ),
  constraint pilot_instruments_window_valid check (
    expires_at is null or expires_at > effective_at
  ),
  constraint pilot_instruments_status_valid check (
    status in ('published', 'superseded', 'withdrawn')
  ),
  constraint pilot_instruments_retirement_consistent check (
    (status = 'published' and retired_at is null)
    or (status <> 'published' and retired_at is not null)
  ),
  constraint pilot_instruments_version_unique unique (instrument_id, instrument_version, locale),
  constraint pilot_instruments_receipt_key unique (
    id, instrument_id, instrument_version, locale, content_sha256
  )
);

create unique index pilot_instruments_one_published_version
  on public.pilot_instrument_publications (instrument_id, locale)
  where status = 'published';
create index pilot_instruments_approver_idx
  on public.pilot_instrument_publications (approved_by_subject_id);

create or replace function identity_private.set_pilot_instrument_hash()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.content_sha256 := encode(
    extensions.digest(convert_to(new.document_body, 'UTF8'), 'sha256'), 'hex'
  );
  return new;
end;
$$;

create trigger pilot_instrument_publications_hash
before insert on public.pilot_instrument_publications
for each row execute function identity_private.set_pilot_instrument_hash();

create or replace function identity_private.guard_pilot_instrument_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'PUBLICATION_IMMUTABLE';
  end if;
  if row(
    new.id, new.instrument_id, new.instrument_version, new.locale, new.document_body,
    new.content_sha256,
    new.rendered_locator, new.approval_reference, new.approved_by_subject_id,
    new.approved_at, new.published_at, new.effective_at, new.expires_at
  ) is distinct from row(
    old.id, old.instrument_id, old.instrument_version, old.locale, old.document_body,
    old.content_sha256,
    old.rendered_locator, old.approval_reference, old.approved_by_subject_id,
    old.approved_at, old.published_at, old.effective_at, old.expires_at
  ) or old.status <> 'published' or new.status not in ('superseded', 'withdrawn')
    or new.retired_at is null or new.retired_at < old.published_at then
    raise exception using errcode = '55000', message = 'PUBLICATION_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger pilot_instrument_publications_immutable
before update or delete on public.pilot_instrument_publications
for each row execute function identity_private.guard_pilot_instrument_publication();

create table public.pilot_instrument_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_id uuid not null,
  membership_role text not null default 'patient',
  publication_id uuid not null,
  instrument_id text not null,
  instrument_version text not null,
  locale text not null,
  content_sha256 text not null,
  action text not null,
  assurance text not null,
  workflow_reference uuid,
  purpose text,
  recipient_reference uuid,
  idempotency_key uuid not null,
  correlation_id text not null,
  recorded_at timestamptz not null default now(),
  constraint pilot_receipts_patient_role check (membership_role = 'patient'),
  constraint pilot_receipts_membership_fk foreign key (tenant_id, subject_id, membership_role)
    references public.tenant_memberships (tenant_id, subject_id, role) on delete restrict,
  constraint pilot_receipts_publication_fk foreign key (
    publication_id, instrument_id, instrument_version, locale, content_sha256
  ) references public.pilot_instrument_publications (
    id, instrument_id, instrument_version, locale, content_sha256
  ) on delete restrict,
  constraint pilot_receipts_scope_key unique (id, tenant_id, subject_id),
  constraint pilot_receipts_idempotency_unique unique (tenant_id, subject_id, idempotency_key),
  constraint pilot_receipts_action_valid check (
    (instrument_id = 'pilot-privacy-notice' and action = 'acknowledged')
    or (instrument_id <> 'pilot-privacy-notice' and action = 'accepted')
  ),
  constraint pilot_receipts_assurance_valid check (assurance in ('aal1', 'aal2')),
  constraint pilot_receipts_correlation_valid check (
    correlation_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  ),
  constraint pilot_receipts_handoff_scope check (
    (instrument_id = 'pilot-handoff-authorisation'
      and workflow_reference is not null and purpose is not null and recipient_reference is not null)
    or (instrument_id <> 'pilot-handoff-authorisation'
      and purpose is null and recipient_reference is null)
  ),
  constraint pilot_receipts_transaction_scope check (
    (instrument_id in ('pilot-order-terms', 'pilot-handoff-authorisation')
      and workflow_reference is not null)
    or (instrument_id in ('pilot-account-terms', 'pilot-privacy-notice')
      and workflow_reference is null)
  )
);

create index pilot_receipts_subject_idx
  on public.pilot_instrument_receipts (tenant_id, subject_id, recorded_at desc);
create index pilot_receipts_publication_idx
  on public.pilot_instrument_receipts (publication_id);

create or replace function identity_private.guard_pilot_instrument_receipt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.pilot_instrument_publications as publication
    where publication.id = new.publication_id
      and publication.status = 'published'
      and publication.published_at <= clock_timestamp()
      and publication.effective_at <= clock_timestamp()
      and (publication.expires_at is null or publication.expires_at > clock_timestamp())
  ) then
    raise exception using errcode = '42501', message = 'INSTRUMENT_NOT_ACTIVE';
  end if;
  new.recorded_at := clock_timestamp();
  return new;
end;
$$;

create trigger pilot_instrument_receipts_active_version
before insert on public.pilot_instrument_receipts
for each row execute function identity_private.guard_pilot_instrument_receipt();

-- Supersession/withdrawal is a new fact; the original receipt is never rewritten.
create table public.pilot_instrument_receipt_events (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null,
  tenant_id uuid not null,
  subject_id uuid not null,
  event_type text not null,
  actor_subject_id uuid references public.subjects (id) on delete restrict,
  reason_code text not null,
  idempotency_key uuid not null,
  correlation_id text not null,
  recorded_at timestamptz not null default now(),
  constraint pilot_receipt_events_receipt_fk foreign key (receipt_id, tenant_id, subject_id)
    references public.pilot_instrument_receipts (id, tenant_id, subject_id) on delete restrict,
  constraint pilot_receipt_events_type_valid check (
    event_type in ('superseded', 'withdrawn')
  ),
  constraint pilot_receipt_events_reason_valid check (
    reason_code ~ '^[a-z][a-z0-9_]{1,63}$'
  ),
  constraint pilot_receipt_events_correlation_valid check (
    correlation_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  ),
  constraint pilot_receipt_events_idempotency_unique unique (tenant_id, subject_id, idempotency_key)
);

create index pilot_receipt_events_receipt_idx
  on public.pilot_instrument_receipt_events (receipt_id, recorded_at desc);
create index pilot_receipt_events_actor_idx
  on public.pilot_instrument_receipt_events (actor_subject_id)
  where actor_subject_id is not null;

create table public.pilot_account_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_id uuid not null,
  membership_role text not null default 'patient',
  event_type text not null,
  actor_subject_id uuid references public.subjects (id) on delete restrict,
  reason_code text not null,
  idempotency_key uuid not null,
  correlation_id text not null,
  recorded_at timestamptz not null default now(),
  constraint pilot_account_events_patient_role check (membership_role = 'patient'),
  constraint pilot_account_events_membership_fk foreign key (tenant_id, subject_id, membership_role)
    references public.tenant_memberships (tenant_id, subject_id, role) on delete restrict,
  constraint pilot_account_events_type_valid check (
    event_type in ('invited', 'activated', 'suspended', 'revoked', 'closure_requested', 'deidentified')
  ),
  constraint pilot_account_events_reason_valid check (
    reason_code ~ '^[a-z][a-z0-9_]{1,63}$'
  ),
  constraint pilot_account_events_correlation_valid check (
    correlation_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  ),
  constraint pilot_account_events_idempotency_unique unique (tenant_id, subject_id, idempotency_key)
);

create index pilot_account_events_subject_idx
  on public.pilot_account_lifecycle_events (tenant_id, subject_id, recorded_at desc);
create index pilot_account_events_actor_idx
  on public.pilot_account_lifecycle_events (actor_subject_id)
  where actor_subject_id is not null;

-- No user-facing route is active: RLS is enabled/forced with no permissive browser policy.
alter table public.client_profiles enable row level security;
alter table public.client_profiles force row level security;
alter table public.client_profile_events enable row level security;
alter table public.client_profile_events force row level security;
alter table public.pilot_instrument_publications enable row level security;
alter table public.pilot_instrument_publications force row level security;
alter table public.pilot_instrument_receipts enable row level security;
alter table public.pilot_instrument_receipts force row level security;
alter table public.pilot_instrument_receipt_events enable row level security;
alter table public.pilot_instrument_receipt_events force row level security;
alter table public.pilot_account_lifecycle_events enable row level security;
alter table public.pilot_account_lifecycle_events force row level security;

revoke all on public.client_profiles from public, anon, authenticated, service_role;
revoke all on public.client_profile_events from public, anon, authenticated, service_role;
revoke all on public.pilot_instrument_publications from public, anon, authenticated, service_role;
revoke all on public.pilot_instrument_receipts from public, anon, authenticated, service_role;
revoke all on public.pilot_instrument_receipt_events from public, anon, authenticated, service_role;
revoke all on public.pilot_account_lifecycle_events from public, anon, authenticated, service_role;

-- Task 9.6 will add a governed atomic write command; no adapter may mutate these tables yet.
grant select on public.client_profiles to service_role;
grant select on public.client_profile_events to service_role;
grant select on public.pilot_instrument_publications to service_role;
grant select on public.pilot_instrument_receipts to service_role;
grant select on public.pilot_instrument_receipt_events to service_role;
grant select on public.pilot_account_lifecycle_events to service_role;

create trigger client_profile_events_append_only
before update or delete on public.client_profile_events
for each row execute function audit_private.reject_append_only_mutation();
create trigger pilot_instrument_receipts_append_only
before update or delete on public.pilot_instrument_receipts
for each row execute function audit_private.reject_append_only_mutation();
create trigger pilot_instrument_receipt_events_append_only
before update or delete on public.pilot_instrument_receipt_events
for each row execute function audit_private.reject_append_only_mutation();
create trigger pilot_account_lifecycle_events_append_only
before update or delete on public.pilot_account_lifecycle_events
for each row execute function audit_private.reject_append_only_mutation();

revoke all on function identity_private.guard_pilot_instrument_publication()
from public, anon, authenticated, service_role;
revoke all on function identity_private.set_pilot_instrument_hash()
from public, anon, authenticated, service_role;
revoke all on function identity_private.guard_pilot_instrument_receipt()
from public, anon, authenticated, service_role;

comment on table public.client_profiles is
  'Minimum non-clinical pilot profile; server-owned tenant/subject and version.';
comment on table public.client_profile_events is
  'Append-only attributed profile changes without duplicate personal values.';
comment on table public.pilot_instrument_publications is
  'Approved immutable rendered instrument versions; no drafts or placeholder publications.';
comment on table public.pilot_instrument_receipts is
  'Append-only client action tied to exact approved publication version and SHA-256 content.';
comment on table public.pilot_instrument_receipt_events is
  'Append-only withdrawal or supersession fact; original receipt remains unchanged.';
comment on table public.pilot_account_lifecycle_events is
  'Append-only pilot-account transition facts with no raw contact or health content.';
