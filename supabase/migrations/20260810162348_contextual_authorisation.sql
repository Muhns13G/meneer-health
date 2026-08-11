-- Sprint 5.8 contextual authorisation foundation. Human and service access remains server-only;
-- browser roles receive no table privileges or permissive RLS policies.

alter table public.tenant_memberships
  add column valid_from timestamptz not null default now(),
  add column expires_at timestamptz,
  add column approved_by_subject_id uuid references public.subjects (id);

alter table public.tenant_memberships
  add constraint tenant_memberships_validity_window check (
    expires_at is null or expires_at > valid_from
  ),
  add constraint tenant_memberships_workforce_governance check (
    role = 'patient'
    or (
      expires_at is not null
      and approved_by_subject_id is not null
      and approved_by_subject_id <> subject_id
    )
  );

create index tenant_memberships_active_context_idx
  on public.tenant_memberships (tenant_id, subject_id, role, status, valid_from, expires_at);

create index tenant_memberships_approver_idx
  on public.tenant_memberships (approved_by_subject_id)
  where approved_by_subject_id is not null;

create table public.access_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  purpose text not null,
  status text not null default 'active',
  valid_from timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_assignments_resource_type_valid check (
    resource_type in (
      'identity_contact',
      'consent',
      'intake',
      'clinical_decision',
      'prescription',
      'payment',
      'fulfilment',
      'support_case',
      'audit_evidence',
      'role_permission',
      'privileged_asset'
    )
  ),
  constraint access_assignments_purpose_valid check (
    purpose in (
      'self_service',
      'care_delivery',
      'dispensing',
      'operations',
      'support',
      'privacy_review',
      'security_administration',
      'release_management'
    )
  ),
  constraint access_assignments_status_valid check (
    status in ('active', 'suspended', 'revoked')
  ),
  constraint access_assignments_validity_window check (expires_at > valid_from),
  constraint access_assignments_scope_unique unique (
    tenant_id,
    subject_id,
    resource_type,
    resource_id,
    purpose
  )
);

create index access_assignments_active_context_idx
  on public.access_assignments (
    tenant_id,
    subject_id,
    resource_type,
    resource_id,
    purpose,
    status,
    valid_from,
    expires_at
  );

create index access_assignments_subject_id_idx
  on public.access_assignments (subject_id);

alter table public.access_assignments enable row level security;
alter table public.access_assignments force row level security;

revoke all on public.access_assignments from public, anon, authenticated, service_role;
grant select on public.access_assignments to service_role;

comment on table public.access_assignments is
  'Time-bounded, purpose-specific relationship evidence consumed by the server authorisation policy.';
comment on column public.access_assignments.resource_id is
  'Opaque identifier supplied by the authoritative resource module; it conveys no access by itself.';
