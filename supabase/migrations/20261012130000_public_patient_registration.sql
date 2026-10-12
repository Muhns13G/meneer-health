-- Verified public registration is a separate, default-off admission source.
-- No anonymous application grants, staff authority or clinical approval are created.
create table identity_private.public_registration_settings (
  tenant_id uuid primary key references public.tenants(id),
  enabled boolean not null default false
);
create table identity_private.public_registration_send_budget (
  tenant_id uuid not null references public.tenants(id),
  contact_digest text not null check (contact_digest ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default clock_timestamp()
);
create index public_registration_budget_window on identity_private.public_registration_send_budget(tenant_id, recorded_at);
alter table identity_private.public_registration_settings enable row level security;
alter table identity_private.public_registration_settings force row level security;
alter table identity_private.public_registration_send_budget enable row level security;
alter table identity_private.public_registration_send_budget force row level security;
revoke all on identity_private.public_registration_settings, identity_private.public_registration_send_budget
  from public, anon, authenticated, service_role;

alter table public.identity_invitations add column admission_source text not null default 'staff'
  check (admission_source in ('staff','public_registration'));
alter table public.identity_invitations drop constraint identity_invitation_governed_fields;
alter table public.identity_invitations add constraint identity_invitation_governed_fields check (
  (admission_source='staff' and ((delivery_status='legacy' and issued_by_subject_id is null and request_key is null)
    or (delivery_status<>'legacy' and issued_by_subject_id is not null and purpose='operations' and request_key is not null)))
  or (admission_source='public_registration' and issued_by_subject_id is null and purpose='account'
    and request_key is not null and delivery_status='delivered' and provider_subject is not null)
);
create function identity_private.guard_admission_source() returns trigger language plpgsql set search_path='' as $$
begin
  if new.admission_source<>old.admission_source then
    raise exception using errcode='42501',message='REGISTRATION_REJECTED';
  end if;
  if new.admission_source='public_registration' and old.status='pending' and new.status='accepted' then
    perform 1 from identity_private.public_registration_settings where tenant_id=new.tenant_id and enabled for share;
    if not found or not public.public_registration_available(new.tenant_id) then
      raise exception using errcode='42501',message='REGISTRATION_REJECTED';
    end if;
  end if;
  return new;
end $$;
create trigger identity_admission_source_immutable before update on public.identity_invitations
  for each row execute function identity_private.guard_admission_source();
revoke all on function identity_private.guard_admission_source() from public,anon,authenticated,service_role;
-- Retired admissions remain immutable evidence; only one live admission may use a provider identity.
drop index public.identity_invitations_provider_subject_unique;
create unique index identity_invitations_provider_subject_unique on public.identity_invitations(provider_subject)
  where provider_subject is not null and status in ('pending','accepted');

create function public.public_registration_available(p_tenant_id uuid) returns boolean
language sql security definer set search_path='' volatile as $$
  select exists(select 1 from identity_private.public_registration_settings r
    join public.tenants t on t.id=r.tenant_id and t.status='active'
    where r.tenant_id=p_tenant_id and r.enabled)
    and 2=(select count(*) from public.pilot_instrument_publications
      where instrument_id in ('pilot-account-terms','pilot-privacy-notice') and locale='en-ZA'
        and status='published' and effective_at<=clock_timestamp() and published_at<=clock_timestamp()
        and (expires_at is null or expires_at>clock_timestamp()));
$$;
create function public.reserve_public_registration_send(p_tenant_id uuid,p_contact_digest text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if p_contact_digest is null or p_contact_digest!~'^[a-f0-9]{64}$'
    or not public.public_registration_available(p_tenant_id) then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,91212));
  delete from identity_private.public_registration_send_budget
    where tenant_id=p_tenant_id and recorded_at<clock_timestamp()-interval '24 hours';
  if (select count(*) from identity_private.public_registration_send_budget where tenant_id=p_tenant_id
    and recorded_at>clock_timestamp()-interval '1 hour')>=100 or
    (select count(*) from identity_private.public_registration_send_budget where tenant_id=p_tenant_id
      and contact_digest=p_contact_digest and recorded_at>clock_timestamp()-interval '1 hour')>=3
  then return false; end if;
  insert into identity_private.public_registration_send_budget(tenant_id,contact_digest) values(p_tenant_id,p_contact_digest);
  return true;
end $$;

create function public.prepare_public_registration(p_tenant_id uuid,p_provider_subject uuid,p_provider_session_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_id uuid; contact_hash text; assurance text; admission public.identity_invitations; instant timestamptz:=clock_timestamp();
begin
  if not public.public_registration_available(p_tenant_id) then
    raise exception using errcode='42501',message='REGISTRATION_REJECTED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_provider_subject::text,91206));
  perform 1 from identity_private.public_registration_settings where tenant_id=p_tenant_id and enabled for share;
  if not found then raise exception using errcode='42501',message='REGISTRATION_REJECTED'; end if;
  perform 1 from public.tenants where id=p_tenant_id and status='active' for share;
  if not found then raise exception using errcode='42501',message='REGISTRATION_REJECTED'; end if;
  perform 1 from auth.sessions where id=p_provider_session_id for share;
  perform 1 from auth.users where id=p_provider_subject for share;
  select e.subject_id,encode(extensions.digest(convert_to(lower(btrim(u.email)),'UTF8'),'sha256'),'hex'),coalesce(s.aal::text,'aal1')
    into actor_id,contact_hash,assurance
    from auth.users u join auth.sessions s on s.user_id=u.id and s.id=p_provider_session_id
      and (s.not_after is null or s.not_after>instant)
    join public.external_identities e on e.provider='supabase' and e.provider_subject=u.id::text
    join public.subjects sub on sub.id=e.subject_id and sub.status='active'
    join public.subject_contacts c on c.subject_id=sub.id and c.kind='email' and c.status='verified'
      and c.provider='supabase' and lower(c.normalized_value)=lower(u.email)
    where u.id=p_provider_subject and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false);
  if actor_id is null then raise exception using errcode='42501',message='REGISTRATION_REJECTED'; end if;
  if exists(select 1 from public.client_profiles where tenant_id=p_tenant_id and subject_id=actor_id) then
    -- The application rechecks active patient membership and exact document evidence before session handoff.
    return jsonb_build_object('alreadyActive',true,'invitationId',null);
  end if;
  if exists(select 1 from public.tenant_memberships where subject_id=actor_id
    and (tenant_id<>p_tenant_id or role<>'patient' or status<>'invited'
      or valid_from>instant or expires_at<=instant)) then
    raise exception using errcode='42501',message='REGISTRATION_REJECTED'; end if;
  update public.identity_invitations set status='expired' where provider_subject=p_provider_subject::text
    and status='pending' and expires_at<=instant;
  select * into admission from public.identity_invitations where provider_subject=p_provider_subject::text
    and status in ('pending','accepted') for update;
  if admission.id is not null then
    -- Never replace, revoke or sidestep an existing staff/mobile invitation.
    if admission.tenant_id<>p_tenant_id or admission.status<>'pending'
      or admission.contact_digest<>contact_hash or admission.delivery_status<>'delivered'
      or admission.admission_source<>'public_registration' then
      raise exception using errcode='42501',message='REGISTRATION_REJECTED'; end if;
  else
    insert into public.identity_invitations(tenant_id,contact_digest,intended_role,provider_subject,expires_at,
      purpose,request_key,delivery_status,delivered_at,admission_source)
    values(p_tenant_id,contact_hash,'patient',p_provider_subject::text,instant+interval '48 hours',
      'account',gen_random_uuid(),'delivered',instant,'public_registration') returning * into admission;
    perform audit_private.append_audit_fact(p_tenant_id,'patient',actor_id,'patient',assurance,
      'identity.registration.verified',actor_id,'identity_invitation',admission.id::text,'account',
      'public-registration-v1','succeeded','REGISTRATION_VERIFIED',admission.request_key::text,
      admission.request_key::text,instant,'{}'::jsonb);
  end if;
  return jsonb_build_object('alreadyActive',false,'invitationId',admission.id);
end $$;
revoke all on function public.public_registration_available(uuid), public.reserve_public_registration_send(uuid,text),
  public.prepare_public_registration(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.public_registration_available(uuid), public.reserve_public_registration_send(uuid,text),
  public.prepare_public_registration(uuid,uuid,uuid) to service_role;
