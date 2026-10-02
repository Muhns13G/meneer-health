-- Sprint 9.3. Staff-only invitation reservation; no public registration or browser grants.
alter table public.identity_invitations
  add column issued_by_subject_id uuid references public.subjects (id),
  add column purpose text,
  add column request_key uuid,
  add column delivery_status text not null default 'legacy',
  add column delivered_at timestamptz,
  add constraint identity_invitation_delivery_valid check (
    delivery_status in ('legacy', 'reserved', 'delivered', 'failed')
  ),
  add constraint identity_invitation_governed_fields check (
    (delivery_status = 'legacy' and issued_by_subject_id is null and request_key is null)
    or (delivery_status <> 'legacy' and issued_by_subject_id is not null
      and purpose = 'operations' and request_key is not null)
  );

create unique index identity_invitation_request_key_unique
  on public.identity_invitations (tenant_id, request_key)
  where request_key is not null;
create index identity_invitation_actor_rate_idx
  on public.identity_invitations (tenant_id, issued_by_subject_id, created_at desc)
  where issued_by_subject_id is not null;
create index identity_invitation_contact_rate_idx
  on public.identity_invitations (tenant_id, contact_digest, created_at desc);
create unique index identity_invitation_one_pending_contact_idx
  on public.identity_invitations (tenant_id, contact_digest)
  where status = 'pending' and delivery_status in ('reserved', 'delivered');

create function identity_private.reject_invitation_replay() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.status <> 'pending' or (new.status = 'accepted' and (
      old.delivery_status <> 'delivered' or old.provider_subject is null
      or old.expires_at <= now()
    )) or new.tenant_id <> old.tenant_id
    or new.contact_digest <> old.contact_digest
    or new.request_key is distinct from old.request_key
    or new.issued_by_subject_id is distinct from old.issued_by_subject_id
  then
    raise exception using errcode = '22023', message = 'INVITATION_REPLAY_REJECTED';
  end if;
  return new;
end;
$$;
create trigger identity_invitation_replay_guard before update on public.identity_invitations
  for each row execute function identity_private.reject_invitation_replay();

-- No direct insert can bypass reservation. Existing update paths remain server-only
-- until the acceptance transaction replaces them in Task 9.4.
revoke insert on public.identity_invitations from service_role;

create function public.reserve_patient_invitation(
  p_provider_session_id uuid,
  p_tenant_id uuid,
  p_contact_digest text,
  p_expires_at timestamptz,
  p_request_key uuid
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid;
  invitation_id uuid;
begin
  if p_provider_session_id is null or p_tenant_id is null or p_request_key is null
    or p_contact_digest !~ '^[a-f0-9]{64}$'
    or p_expires_at <= now() + interval '10 minutes'
    or p_expires_at > now() + interval '7 days'
  then
    raise exception using errcode = '22023', message = 'INVITATION_REJECTED';
  end if;

  select s.subject_id into actor_id
  from public.identity_sessions s
  join public.subjects sub on sub.id = s.subject_id and sub.status = 'active'
  join public.tenant_memberships m on m.subject_id = s.subject_id
    and m.tenant_id = p_tenant_id and m.role = 'operations' and m.status = 'active'
    and m.valid_from <= now() and m.expires_at > now()
  join public.tenants t on t.id = m.tenant_id and t.status = 'active'
  where s.provider_session_id = p_provider_session_id and s.status = 'active'
    and s.session_class in ('workforce', 'privileged') and s.assurance = 'aal2'
    and s.idle_expires_at > now() and s.absolute_expires_at > now()
    and exists (
      select 1 from public.access_assignments a
      where a.tenant_id = p_tenant_id and a.subject_id = s.subject_id
        and a.resource_type = 'identity_contact' and a.resource_id = p_tenant_id
        and a.purpose = 'operations' and a.status = 'active'
        and a.valid_from <= now() and a.expires_at > now()
    )
  limit 1;
  if actor_id is null then
    raise exception using errcode = '42501', message = 'INVITATION_REJECTED';
  end if;

  -- Serialize reservations per tenant. This protects both rate windows and the
  -- pending-contact uniqueness check from concurrent staff requests.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 91203));
  update public.identity_invitations
  set status = 'expired'
  where tenant_id = p_tenant_id and status = 'pending' and expires_at <= now();

  if exists (
    select 1 from public.identity_invitations
    where tenant_id = p_tenant_id and request_key = p_request_key
  ) or exists (
    select 1 from public.identity_invitations
    where tenant_id = p_tenant_id and contact_digest = p_contact_digest
      and status = 'pending' and delivery_status in ('reserved', 'delivered')
  ) or (
    select count(*) from public.identity_invitations
    where tenant_id = p_tenant_id and issued_by_subject_id = actor_id
      and created_at > now() - interval '1 hour'
  ) >= 10 or (
    select count(*) from public.identity_invitations
    where tenant_id = p_tenant_id and contact_digest = p_contact_digest
      and created_at > now() - interval '24 hours'
  ) >= 3 then
    raise exception using errcode = '22023', message = 'INVITATION_REJECTED';
  end if;

  insert into public.identity_invitations (
    tenant_id, contact_digest, intended_role, expires_at, issued_by_subject_id,
    purpose, request_key, delivery_status
  ) values (
    p_tenant_id, p_contact_digest, 'patient', p_expires_at, actor_id,
    'operations', p_request_key, 'reserved'
  ) returning id into invitation_id;

  perform audit_private.append_audit_fact(
    p_tenant_id, 'workforce', actor_id, 'operations', 'aal2',
    'identity.invitation.reserved', null, 'identity_invitation', invitation_id::text,
    'operations', '2026-08-10.1', 'succeeded', 'INVITATION_RESERVED',
    p_request_key::text, p_request_key::text, now(), '{}'::jsonb
  );
  return invitation_id;
end;
$$;

create function public.complete_patient_invitation_delivery(
  p_invitation_id uuid,
  p_provider_subject text,
  p_failed boolean default false
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  invitation public.identity_invitations%rowtype;
begin
  if p_invitation_id is null or p_failed is null
    or (not p_failed and nullif(btrim(p_provider_subject), '') is null)
    or (p_failed and p_provider_subject is not null)
  then
    raise exception using errcode = '22023', message = 'INVITATION_REJECTED';
  end if;
  update public.identity_invitations
  set delivery_status = case when p_failed then 'failed' else 'delivered' end,
      provider_subject = case when p_failed then null else p_provider_subject end,
      delivered_at = case when p_failed then null else now() end,
      status = case when p_failed then 'revoked' else status end
  where id = p_invitation_id and status = 'pending'
    and delivery_status = 'reserved' and expires_at > now()
  returning * into invitation;
  if invitation.id is null then
    raise exception using errcode = '22023', message = 'INVITATION_REJECTED';
  end if;
  perform audit_private.append_audit_fact(
    invitation.tenant_id, 'workforce', invitation.issued_by_subject_id, 'operations', 'aal2',
    case when p_failed then 'identity.invitation.failed' else 'identity.invitation.delivered' end,
    null, 'identity_invitation', invitation.id::text, 'operations', '2026-08-10.1',
    case when p_failed then 'failed' else 'succeeded' end,
    case when p_failed then 'PROVIDER_DELIVERY_FAILED' else 'PROVIDER_DELIVERED' end,
    invitation.request_key::text, invitation.request_key::text, now(), '{}'::jsonb
  );
  return true;
end;
$$;

revoke all on function public.reserve_patient_invitation(uuid, uuid, text, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_patient_invitation_delivery(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.reserve_patient_invitation(uuid, uuid, text, timestamptz, uuid)
  to service_role;
grant execute on function public.complete_patient_invitation_delivery(uuid, text, boolean)
  to service_role;
