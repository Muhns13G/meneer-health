-- Sprint 5.6 tenancy foundation. Authentication and write policies are added in Tasks 5.7-5.8.
-- Until then, exposed roles have no table privileges and RLS has no permissive policies.

revoke all on schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from service_role;
alter default privileges for role postgres in schema public revoke all on sequences from service_role;
alter default privileges for role postgres in schema public revoke all on functions from service_role;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tenants_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint tenants_status_valid check (status in ('active', 'suspended', 'closed'))
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_status_valid check (
    status in ('active', 'suspended', 'erasure_pending', 'erased')
  )
);

create table public.external_identities (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  created_at timestamptz not null default now(),
  constraint external_identities_provider_not_blank check (length(btrim(provider)) > 0),
  constraint external_identities_provider_subject_not_blank check (
    length(btrim(provider_subject)) > 0
  ),
  constraint external_identities_provider_subject_unique unique (provider, provider_subject)
);

create index external_identities_subject_id_idx
  on public.external_identities (subject_id);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  role text not null,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_memberships_role_valid check (
    role in ('patient', 'clinician', 'pharmacy', 'operations', 'admin')
  ),
  constraint tenant_memberships_status_valid check (
    status in ('invited', 'active', 'suspended', 'revoked')
  ),
  constraint tenant_memberships_scope_unique unique (tenant_id, subject_id, role)
);

create index tenant_memberships_subject_id_tenant_id_idx
  on public.tenant_memberships (subject_id, tenant_id);

alter table public.tenants enable row level security;
alter table public.tenants force row level security;
alter table public.subjects enable row level security;
alter table public.subjects force row level security;
alter table public.external_identities enable row level security;
alter table public.external_identities force row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_memberships force row level security;

revoke all on public.tenants from anon, authenticated;
revoke all on public.subjects from anon, authenticated;
revoke all on public.external_identities from anon, authenticated;
revoke all on public.tenant_memberships from anon, authenticated;

revoke all on public.tenants from service_role;
revoke all on public.subjects from service_role;
revoke all on public.external_identities from service_role;
revoke all on public.tenant_memberships from service_role;

grant usage on schema public to service_role;
grant select on public.tenants to service_role;
grant select on public.subjects to service_role;
grant select on public.external_identities to service_role;
grant select on public.tenant_memberships to service_role;

comment on table public.tenants is 'Logical organisation boundary; contains no patient data.';
comment on table public.subjects is 'Opaque internal identity independent of an auth provider.';
comment on table public.external_identities is 'Maps provider identities to stable internal subjects.';
comment on table public.tenant_memberships is 'Explicit subject role within one tenant boundary.';
