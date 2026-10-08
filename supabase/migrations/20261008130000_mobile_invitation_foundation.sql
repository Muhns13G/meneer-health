-- Task 14.2: private pre-email storage only. No public RPC, seed, provider send or activation.
-- identity_private is already part of governed application recovery; Auth remains separate.
begin;

create table identity_private.mobile_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft'
    check (status in ('draft','issued','claimed','converted','expired','revoked','declined')),
  created_by_subject_id uuid not null references public.subjects(id),
  provenance_reference uuid not null,
  contact_authority_reference uuid not null,
  request_key uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  issued_at timestamptz,
  expires_at timestamptz,
  terminal_at timestamptz,
  converted_subject_id uuid references public.subjects(id),
  email_invitation_id uuid references public.identity_invitations(id),
  bound_email_digest text check (bound_email_digest ~ '^[a-f0-9]{64}$'),
  unique (id,tenant_id),
  unique (tenant_id,request_key),
  check ((issued_at is null and expires_at is null) or
    (issued_at is not null and expires_at = issued_at + interval '48 hours')),
  check (status not in ('issued','claimed','expired','converted') or issued_at is not null),
  check ((status in ('converted','expired','revoked','declined')) = (terminal_at is not null)),
  check ((status = 'converted') = (converted_subject_id is not null)),
  check ((status = 'converted') = (email_invitation_id is not null))
);

-- Contacts can be purged independently of opaque state/journal lineage.
create table identity_private.mobile_invitation_contacts (
  invitation_id uuid primary key,
  tenant_id uuid not null,
  given_name text not null check (length(btrim(given_name)) between 1 and 100
    and given_name = btrim(given_name) and given_name !~ '[[:cntrl:]]'),
  family_name text not null check (length(btrim(family_name)) between 1 and 100
    and family_name = btrim(family_name) and family_name !~ '[[:cntrl:]]'),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  phone_reserved boolean not null default true,
  claimed_email text check (claimed_email = lower(btrim(claimed_email))
    and length(claimed_email) <= 254 and claimed_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  purge_after timestamptz,
  foreign key (invitation_id,tenant_id)
    references identity_private.mobile_invitations(id,tenant_id)
);
create unique index mobile_invitation_reserved_phone
  on identity_private.mobile_invitation_contacts(tenant_id,phone) where phone_reserved;

create table identity_private.mobile_invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null,
  tenant_id uuid not null,
  invitation_version integer not null check (invitation_version > 0),
  digest text not null unique check (digest ~ '^[a-f0-9]{64}$'),
  issued_at timestamptz not null,
  expires_at timestamptz not null check (expires_at = issued_at + interval '48 hours'),
  state text not null default 'active'
    check (state in ('active','superseded','revoked','expired','consumed')),
  unique (id,invitation_id,tenant_id),
  unique (invitation_id,invitation_version),
  foreign key (invitation_id,tenant_id)
    references identity_private.mobile_invitations(id,tenant_id)
);
create unique index mobile_invitation_one_active_token
  on identity_private.mobile_invitation_tokens(invitation_id) where state = 'active';

create table identity_private.mobile_invitation_claims (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null,
  tenant_id uuid not null,
  token_id uuid not null,
  claim_digest text not null unique check (claim_digest ~ '^[a-f0-9]{64}$'),
  request_key uuid not null,
  email_digest text check (email_digest ~ '^[a-f0-9]{64}$'),
  state text not null default 'active' check (state in ('active','completed','expired','revoked')),
  issued_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null check (expires_at > issued_at
    and expires_at <= issued_at + interval '15 minutes'),
  unique (invitation_id,request_key),
  foreign key (token_id,invitation_id,tenant_id)
    references identity_private.mobile_invitation_tokens(id,invitation_id,tenant_id)
);
create unique index mobile_invitation_one_active_claim
  on identity_private.mobile_invitation_claims(invitation_id) where state = 'active';

-- No arbitrary payload, contact, SMS body or bearer/code column in journal.
create table identity_private.mobile_invitation_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null,
  tenant_id uuid not null,
  invitation_version integer not null check (invitation_version > 0),
  event text not null check (event in ('created','issued','claimed','email_bound','converted',
    'superseded','revoked','declined','expired','contact_purged')),
  actor_subject_id uuid references public.subjects(id),
  request_key uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  retain_until timestamptz not null default (clock_timestamp() + interval '90 days'),
  unique (invitation_id,invitation_version,event,request_key),
  check (retain_until >= recorded_at + interval '90 days'
    and retain_until <= recorded_at + interval '90 days 1 second'),
  foreign key (invitation_id,tenant_id)
    references identity_private.mobile_invitations(id,tenant_id)
);
create index mobile_invitation_expiry on identity_private.mobile_invitations(expires_at)
  where status in ('issued','claimed');
create index mobile_invitation_contact_purge on identity_private.mobile_invitation_contacts(purge_after)
  where purge_after is not null;

create function identity_private.guard_mobile_invitation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.version <> 1 or new.issued_at is not null
      or new.expires_at is not null or new.bound_email_digest is not null then
      raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    raise exception using errcode='42501',message='MOBILE_INVITATION_STATE_REJECTED';
  end if;
  -- Only the elapsed, unconverted contact purge may erase its email digest.
  if old.status in ('expired','revoked','declined') and new.bound_email_digest is null
    and old.bound_email_digest is not null
    and (to_jsonb(new)-'bound_email_digest')=(to_jsonb(old)-'bound_email_digest')
    and (case when old.status='expired' then old.expires_at else old.terminal_at end)
      + interval '30 days' <= clock_timestamp() then
    return new;
  end if;
  if new.id <> old.id or new.tenant_id <> old.tenant_id
    or new.created_by_subject_id <> old.created_by_subject_id or new.created_at <> old.created_at
    or new.provenance_reference <> old.provenance_reference
    or new.contact_authority_reference <> old.contact_authority_reference
    or new.request_key <> old.request_key
    or old.status in ('converted','expired','revoked','declined') then
    raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT';
  end if;
  if new.version not in (old.version,old.version+1)
    or (new.version=old.version and old.bound_email_digest is not null
      and new.bound_email_digest is distinct from old.bound_email_digest)
    or (new.version=old.version+1 and (new.issued_at is not null or new.expires_at is not null
      or new.bound_email_digest is not null))
    or (new.version=old.version and
      (new.issued_at is distinct from old.issued_at or new.expires_at is distinct from old.expires_at)
      and not (old.status='draft' and new.status='issued'))
    or (new.version=old.version+1 and new.status <> 'draft')
    or (new.version=old.version and new.status <> old.status and not (
      (old.status='draft' and new.status in ('issued','revoked','declined')) or
      (old.status='issued' and new.status in ('claimed','expired','revoked','declined')) or
      (old.status='claimed' and new.status in ('converted','expired','revoked','declined')))) then
    raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT';
  end if;
  if new.status in ('issued','claimed') and new.expires_at <= clock_timestamp()
    or new.status='expired' and new.expires_at > clock_timestamp() then
    raise exception using errcode='PT409',message='MOBILE_INVITATION_EXPIRED';
  end if;
  if new.status='converted' and not exists (
    select 1 from public.identity_invitations i where i.id=new.email_invitation_id
      and i.tenant_id=new.tenant_id and i.intended_role='patient'
      and i.status='accepted' and i.delivery_status='delivered'
      and i.accepted_by_subject_id=new.converted_subject_id
      and i.contact_digest=new.bound_email_digest) then
    raise exception using errcode='42501',message='MOBILE_INVITATION_BINDING_REJECTED';
  end if;
  if new.status='converted' and (new.expires_at<=clock_timestamp() or not exists (
    select 1 from identity_private.mobile_invitation_claims c
    join identity_private.mobile_invitation_tokens t on t.id=c.token_id
    where c.invitation_id=new.id and c.tenant_id=new.tenant_id and c.state='active'
      and c.expires_at>clock_timestamp() and c.email_digest=new.bound_email_digest
      and t.state='active' and t.invitation_version=new.version)) then
    raise exception using errcode='PT409',message='MOBILE_CLAIM_REJECTED';
  end if;
  if new.version <> old.version or new.status in ('converted','expired','revoked','declined') then
    update identity_private.mobile_invitation_tokens set state=case
      when new.status='converted' then 'consumed'
      when new.version<>old.version then 'superseded'
      when new.status='expired' then 'expired' else 'revoked' end
      where invitation_id=old.id and state='active';
    update identity_private.mobile_invitation_claims set state=case
      when new.status='converted' then 'completed'
      when new.status='expired' then 'expired' else 'revoked' end
      where invitation_id=old.id and state='active';
  end if;
  return new;
end $$;

create function identity_private.guard_mobile_token() returns trigger
language plpgsql security definer set search_path = '' as $$
declare invitation identity_private.mobile_invitations;
begin
  if tg_op='DELETE' then
    raise exception using errcode='42501',message='MOBILE_TOKEN_CONFLICT';
  end if;
  if tg_op='UPDATE' and (new.id<>old.id or new.invitation_id<>old.invitation_id
    or new.tenant_id<>old.tenant_id or new.invitation_version<>old.invitation_version
    or new.digest<>old.digest or new.issued_at<>old.issued_at or new.expires_at<>old.expires_at
    or old.state<>'active' or new.state='active') then
    raise exception using errcode='PT409',message='MOBILE_TOKEN_CONFLICT';
  end if;
  select * into invitation from identity_private.mobile_invitations
    where id=new.invitation_id and tenant_id=new.tenant_id for update;
  if new.state='active' and (invitation.id is null or invitation.version<>new.invitation_version
    or invitation.status not in ('issued','claimed') or new.expires_at<=clock_timestamp()
    or new.issued_at<>invitation.issued_at or new.expires_at<>invitation.expires_at) then
    raise exception using errcode='PT409',message='MOBILE_TOKEN_REJECTED';
  end if;
  return new;
end $$;

create function identity_private.guard_mobile_claim() returns trigger
language plpgsql security definer set search_path = '' as $$
declare invitation identity_private.mobile_invitations; token identity_private.mobile_invitation_tokens;
begin
  if tg_op='DELETE' then
    raise exception using errcode='42501',message='MOBILE_CLAIM_CONFLICT';
  end if;
  if tg_op='UPDATE' and old.email_digest is not null and new.email_digest is null
    and (to_jsonb(new)-'email_digest')=(to_jsonb(old)-'email_digest')
    and exists (select 1 from identity_private.mobile_invitations i where i.id=old.invitation_id
      and i.status in ('expired','revoked','declined')
      and (case when i.status='expired' then i.expires_at else i.terminal_at end)
        + interval '30 days' <= clock_timestamp()) then
    return new;
  end if;
  if tg_op='UPDATE' and (new.id<>old.id or new.invitation_id<>old.invitation_id
    or new.tenant_id<>old.tenant_id or new.token_id<>old.token_id or new.claim_digest<>old.claim_digest
    or new.request_key<>old.request_key or new.issued_at<>old.issued_at or new.expires_at<>old.expires_at
    or (old.email_digest is not null and new.email_digest is distinct from old.email_digest)
    or old.state<>'active') then
    raise exception using errcode='PT409',message='MOBILE_CLAIM_CONFLICT';
  end if;
  select * into invitation from identity_private.mobile_invitations
    where id=new.invitation_id and tenant_id=new.tenant_id for update;
  select * into token from identity_private.mobile_invitation_tokens where id=new.token_id;
  if new.state='active' and (invitation.id is null or invitation.status not in ('issued','claimed')
    or invitation.expires_at<=clock_timestamp()
    or token.invitation_id is distinct from new.invitation_id or token.tenant_id is distinct from new.tenant_id
    or token.state<>'active' or token.invitation_version<>invitation.version
    or token.expires_at<=clock_timestamp() or new.expires_at<=clock_timestamp()
    or new.expires_at>token.expires_at) then
    raise exception using errcode='PT409',message='MOBILE_CLAIM_REJECTED';
  end if;
  if new.state='active' and new.email_digest is not null then
    if invitation.bound_email_digest is not null
      and invitation.bound_email_digest <> new.email_digest then
      raise exception using errcode='PT409',message='MOBILE_CLAIM_CONFLICT';
    end if;
    if invitation.bound_email_digest is null then
      update identity_private.mobile_invitations set bound_email_digest=new.email_digest
        where id=new.invitation_id;
    end if;
  end if;
  return new;
end $$;

create function identity_private.sync_mobile_contact_state() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status=old.status and new.version=old.version
    and new.terminal_at is not distinct from old.terminal_at
    and new.expires_at is not distinct from old.expires_at then return new; end if;
  update identity_private.mobile_invitation_contacts set
    claimed_email=case when new.version<>old.version then null else claimed_email end,
    phone_reserved=new.status in ('draft','issued','claimed','converted'),
    purge_after=case when new.status='expired' then new.expires_at + interval '30 days'
      when new.status in ('revoked','declined') then new.terminal_at + interval '30 days' else null end
    where invitation_id=new.id;
  return new;
end $$;

create function identity_private.guard_mobile_contact() returns trigger
language plpgsql security definer set search_path = '' as $$
declare invitation identity_private.mobile_invitations;
begin
  if tg_op='DELETE' then
    if old.purge_after is null or old.purge_after>clock_timestamp() then
      raise exception using errcode='42501',message='MOBILE_CONTACT_RETENTION_REJECTED';
    end if;
    update identity_private.mobile_invitations set bound_email_digest=null
      where id=old.invitation_id and bound_email_digest is not null;
    update identity_private.mobile_invitation_claims set email_digest=null
      where invitation_id=old.invitation_id and email_digest is not null;
    return old;
  end if;
  select * into invitation from identity_private.mobile_invitations
    where id=new.invitation_id and tenant_id=new.tenant_id for update;
  if tg_op='UPDATE' and (new.invitation_id<>old.invitation_id or new.tenant_id<>old.tenant_id
    or (invitation.status<>'draft' and
      (new.given_name<>old.given_name or new.family_name<>old.family_name or new.phone<>old.phone))
    or (old.claimed_email is not null and new.claimed_email is distinct from old.claimed_email
      and invitation.status<>'draft')) then
    raise exception using errcode='PT409',message='MOBILE_CONTACT_CONFLICT';
  end if;
  new.phone_reserved:=invitation.status in ('draft','issued','claimed','converted');
  if new.claimed_email is not null then
    if invitation.bound_email_digest is distinct from
      encode(sha256(convert_to(new.claimed_email,'UTF8')),'hex') then
      raise exception using errcode='PT409',message='MOBILE_CONTACT_CONFLICT';
    end if;
  end if;
  new.purge_after:=case when invitation.status='expired' then invitation.expires_at+interval '30 days'
    when invitation.status in ('revoked','declined') then invitation.terminal_at+interval '30 days' else null end;
  return new;
end $$;

create function identity_private.guard_mobile_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='DELETE' and old.retain_until<=clock_timestamp() then return old; end if;
  raise exception using errcode='42501',message='MOBILE_EVENT_IMMUTABLE';
end $$;

create trigger mobile_invitation_guard before insert or update or delete on identity_private.mobile_invitations
  for each row execute function identity_private.guard_mobile_invitation();
create trigger mobile_invitation_contact_state after update on identity_private.mobile_invitations
  for each row execute function identity_private.sync_mobile_contact_state();
create trigger mobile_token_guard before insert or update or delete on identity_private.mobile_invitation_tokens
  for each row execute function identity_private.guard_mobile_token();
create trigger mobile_claim_guard before insert or update or delete on identity_private.mobile_invitation_claims
  for each row execute function identity_private.guard_mobile_claim();
create trigger mobile_contact_guard before insert or update or delete on identity_private.mobile_invitation_contacts
  for each row execute function identity_private.guard_mobile_contact();
create trigger mobile_event_immutable before update or delete on identity_private.mobile_invitation_events
  for each row execute function identity_private.guard_mobile_event();

do $$ declare table_name text; function_name text; begin
  foreach table_name in array array['mobile_invitations','mobile_invitation_contacts',
    'mobile_invitation_tokens','mobile_invitation_claims','mobile_invitation_events'] loop
    execute format('alter table identity_private.%I enable row level security',table_name);
    execute format('alter table identity_private.%I force row level security',table_name);
    execute format('revoke all on identity_private.%I from public,anon,authenticated,service_role',table_name);
  end loop;
  foreach function_name in array array['guard_mobile_invitation','guard_mobile_token',
    'guard_mobile_claim','sync_mobile_contact_state','guard_mobile_contact','guard_mobile_event'] loop
    execute format('revoke all on function identity_private.%I() from public,anon,authenticated,service_role',function_name);
  end loop;
end $$;
commit;
