-- Sprint 5.7 managed identity governance. Public browser roles remain deny-default; Task 5.8 owns
-- resource authorisation policies. Privileged functions stay in a non-exposed schema.

create schema if not exists identity_private;
revoke all on schema identity_private from public, anon, authenticated, service_role;

alter table public.tenant_memberships drop constraint tenant_memberships_role_valid;
alter table public.tenant_memberships
  add constraint tenant_memberships_role_valid check (
    role in (
      'patient',
      'clinician',
      'pharmacy',
      'operations',
      'support',
      'auditor',
      'admin',
      'release'
    )
  );

create table public.subject_contacts (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  kind text not null,
  normalized_value text not null,
  status text not null default 'pending',
  provider text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_contacts_kind_valid check (kind in ('email', 'phone')),
  constraint subject_contacts_value_not_blank check (length(btrim(normalized_value)) > 0),
  constraint subject_contacts_status_valid check (status in ('pending', 'verified', 'revoked')),
  constraint subject_contacts_verified_consistent check (
    (status = 'verified' and verified_at is not null)
    or (status <> 'verified')
  ),
  constraint subject_contacts_subject_kind_unique unique (subject_id, kind)
);

create unique index subject_contacts_provider_value_unique
  on public.subject_contacts (provider, kind, lower(normalized_value));

create table public.identity_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_digest text not null,
  intended_role text not null,
  provider_subject text,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_by_subject_id uuid references public.subjects (id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint identity_invitations_digest_format check (contact_digest ~ '^[a-f0-9]{64}$'),
  constraint identity_invitations_role_valid check (intended_role = 'patient'),
  constraint identity_invitations_status_valid check (
    status in ('pending', 'accepted', 'expired', 'revoked')
  ),
  constraint identity_invitations_acceptance_consistent check (
    (
      status = 'accepted'
      and provider_subject is not null
      and accepted_by_subject_id is not null
      and accepted_at is not null
    )
    or (status <> 'accepted' and accepted_by_subject_id is null and accepted_at is null)
  ),
  constraint identity_invitations_expiry_valid check (expires_at > created_at)
);

create index identity_invitations_tenant_status_idx
  on public.identity_invitations (tenant_id, status, expires_at);

create unique index identity_invitations_provider_subject_unique
  on public.identity_invitations (provider_subject)
  where provider_subject is not null;

create table public.identity_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  provider_session_id uuid not null unique,
  session_class text not null,
  assurance text not null,
  status text not null default 'active',
  issued_at timestamptz not null,
  last_seen_at timestamptz not null,
  idle_expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_sessions_class_valid check (
    session_class in ('patient', 'workforce', 'privileged')
  ),
  constraint identity_sessions_assurance_valid check (assurance in ('aal1', 'aal2')),
  constraint identity_sessions_status_valid check (status in ('active', 'revoked', 'expired')),
  constraint identity_sessions_time_order check (
    issued_at <= last_seen_at
    and last_seen_at < idle_expires_at
    and idle_expires_at <= absolute_expires_at
  ),
  constraint identity_sessions_idle_limit check (
    (session_class = 'patient' and idle_expires_at <= last_seen_at + interval '30 minutes')
    or (session_class = 'workforce' and idle_expires_at <= last_seen_at + interval '15 minutes')
    or (session_class = 'privileged' and idle_expires_at <= last_seen_at + interval '10 minutes')
  ),
  constraint identity_sessions_absolute_limit check (
    (session_class = 'patient' and absolute_expires_at <= issued_at + interval '12 hours')
    or (session_class = 'workforce' and absolute_expires_at <= issued_at + interval '8 hours')
    or (session_class = 'privileged' and absolute_expires_at <= issued_at + interval '4 hours')
  ),
  constraint identity_sessions_workforce_assurance check (
    session_class = 'patient' or assurance = 'aal2'
  ),
  constraint identity_sessions_revocation_consistent check (
    (status = 'revoked' and revoked_at is not null and length(btrim(revocation_reason)) > 0)
    or (status <> 'revoked' and revoked_at is null and revocation_reason is null)
  )
);

create index identity_sessions_subject_status_idx
  on public.identity_sessions (subject_id, status, absolute_expires_at);

create table public.identity_recovery_cases (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  recovery_class text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_by_subject_id uuid references public.subjects (id),
  approved_at timestamptz,
  sessions_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_recovery_cases_class_valid check (
    recovery_class in ('patient', 'workforce')
  ),
  constraint identity_recovery_cases_status_valid check (
    status in ('requested', 'approved', 'completed', 'rejected', 'expired')
  ),
  constraint identity_recovery_cases_expiry_valid check (expires_at > requested_at),
  constraint identity_recovery_cases_workforce_approval check (
    recovery_class = 'patient'
    or status in ('requested', 'rejected', 'expired')
    or (
      approved_by_subject_id is not null
      and approved_by_subject_id <> subject_id
      and approved_at is not null
    )
  ),
  constraint identity_recovery_cases_completion check (
    status <> 'completed' or sessions_revoked_at is not null
  )
);

create index identity_recovery_cases_subject_status_idx
  on public.identity_recovery_cases (subject_id, status, expires_at);

create table public.service_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  name text not null,
  environment text not null,
  purpose text not null,
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_identities_name_not_blank check (length(btrim(name)) > 0),
  constraint service_identities_environment_valid check (
    environment in ('local', 'preview', 'production')
  ),
  constraint service_identities_purpose_not_blank check (length(btrim(purpose)) > 0),
  constraint service_identities_status_valid check (status in ('active', 'suspended', 'revoked')),
  constraint service_identities_expiry_valid check (expires_at > created_at),
  constraint service_identities_scope_unique unique (name, environment, purpose)
);

create table public.service_identity_scopes (
  service_identity_id uuid not null references public.service_identities (id) on delete cascade,
  resource text not null,
  action text not null,
  created_at timestamptz not null default now(),
  primary key (service_identity_id, resource, action),
  constraint service_identity_scopes_resource_not_blank check (length(btrim(resource)) > 0),
  constraint service_identity_scopes_action_valid check (
    action in ('create', 'read', 'update', 'transition', 'append')
  )
);

create table public.service_identity_credentials (
  id uuid primary key default gen_random_uuid(),
  service_identity_id uuid not null references public.service_identities (id) on delete cascade,
  secret_digest bytea not null,
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint service_identity_credentials_digest_length check (octet_length(secret_digest) = 32),
  constraint service_identity_credentials_window_valid check (valid_from < expires_at),
  constraint service_identity_credentials_revocation_valid check (
    revoked_at is null or revoked_at >= valid_from
  )
);

create index service_identity_credentials_active_idx
  on public.service_identity_credentials (service_identity_id, expires_at)
  where revoked_at is null;

create or replace function identity_private.sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  internal_subject_id uuid;
begin
  select external_identity.subject_id
  into internal_subject_id
  from public.external_identities as external_identity
  where external_identity.provider = 'supabase'
    and external_identity.provider_subject = new.id::text;

  if internal_subject_id is null then
    insert into public.subjects default values
    returning id into internal_subject_id;

    insert into public.external_identities (subject_id, provider, provider_subject)
    values (internal_subject_id, 'supabase', new.id::text);
  end if;

  if new.email is not null and new.email_confirmed_at is not null then
    insert into public.subject_contacts (
      subject_id,
      kind,
      normalized_value,
      status,
      provider,
      verified_at
    )
    values (
      internal_subject_id,
      'email',
      lower(new.email),
      'verified',
      'supabase',
      new.email_confirmed_at
    )
    on conflict (subject_id, kind) do update
      set normalized_value = excluded.normalized_value,
          status = excluded.status,
          provider = excluded.provider,
          verified_at = excluded.verified_at,
          updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function identity_private.sync_auth_user() from public, anon, authenticated, service_role;

create trigger sync_internal_subject_from_auth_user
after insert or update of email, email_confirmed_at on auth.users
for each row execute function identity_private.sync_auth_user();

alter table public.subject_contacts enable row level security;
alter table public.subject_contacts force row level security;
alter table public.identity_invitations enable row level security;
alter table public.identity_invitations force row level security;
alter table public.identity_sessions enable row level security;
alter table public.identity_sessions force row level security;
alter table public.identity_recovery_cases enable row level security;
alter table public.identity_recovery_cases force row level security;
alter table public.service_identities enable row level security;
alter table public.service_identities force row level security;
alter table public.service_identity_scopes enable row level security;
alter table public.service_identity_scopes force row level security;
alter table public.service_identity_credentials enable row level security;
alter table public.service_identity_credentials force row level security;

revoke all on public.subject_contacts from anon, authenticated, service_role;
revoke all on public.identity_invitations from anon, authenticated, service_role;
revoke all on public.identity_sessions from anon, authenticated, service_role;
revoke all on public.identity_recovery_cases from anon, authenticated, service_role;
revoke all on public.service_identities from anon, authenticated, service_role;
revoke all on public.service_identity_scopes from anon, authenticated, service_role;
revoke all on public.service_identity_credentials from anon, authenticated, service_role;

grant select, insert, update on public.subject_contacts to service_role;
grant select, insert, update on public.identity_invitations to service_role;
grant select, insert, update on public.identity_sessions to service_role;
grant select, insert, update on public.identity_recovery_cases to service_role;
grant select, insert, update on public.service_identities to service_role;
grant select, insert, update on public.service_identity_scopes to service_role;
grant select, insert, update on public.service_identity_credentials to service_role;

comment on table public.subject_contacts is
  'Provider-verified contact evidence; never a role or authorisation source.';
comment on table public.identity_invitations is
  'Cohort-gated invitation state using a contact digest rather than raw invitation contact.';
comment on table public.identity_sessions is
  'Application session governance mapped to a provider session with bounded idle and absolute time.';
comment on table public.identity_recovery_cases is
  'Recovery governance; workforce approval must be separate and completed recovery revokes sessions.';
comment on table public.service_identities is
  'Non-human principal scoped to one environment and purpose.';
comment on table public.service_identity_scopes is
  'Explicit allow-list for a service identity; wildcard actions are unsupported.';
comment on table public.service_identity_credentials is
  'Hashed service credentials with bounded lifetime and revocation; plaintext is never stored.';
