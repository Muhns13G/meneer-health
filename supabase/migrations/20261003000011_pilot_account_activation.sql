-- Sprint 9.6: all account facts commit together; publications remain externally governed.
create table identity_private.pilot_activation_commands (
  invitation_id uuid primary key references public.identity_invitations(id),
  request_key uuid not null unique,
  command_sha256 text not null check (command_sha256 ~ '^[a-f0-9]{64}$'),
  profile_id uuid not null references public.client_profiles(id),
  recorded_at timestamptz not null default now()
);
alter table identity_private.pilot_activation_commands enable row level security;
alter table identity_private.pilot_activation_commands force row level security;
revoke all on identity_private.pilot_activation_commands from public, anon, authenticated, service_role;
create trigger pilot_activation_commands_append_only
before update or delete on identity_private.pilot_activation_commands
for each row execute function audit_private.reject_append_only_mutation();
create index pilot_activation_commands_profile_idx on identity_private.pilot_activation_commands(profile_id);

-- Shared by prepare and commit. The server supplies only freshly verified provider claims.
create function identity_private.pilot_activation_subject(
  p_invitation_id uuid, p_tenant_id uuid, p_provider_subject uuid, p_provider_session_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  subject_id uuid;
begin
  select e.subject_id into subject_id
  from public.identity_invitations i
  join public.tenants t on t.id = i.tenant_id and t.status = 'active'
  join auth.users u on u.id::text = i.provider_subject and u.email_confirmed_at is not null
  join auth.sessions s on s.user_id = u.id and s.id = p_provider_session_id
    and (s.not_after is null or s.not_after > now())
  join public.external_identities e on e.provider = 'supabase' and e.provider_subject = u.id::text
  join public.subjects sub on sub.id = e.subject_id and sub.status = 'active'
  join public.subject_contacts c on c.subject_id = sub.id and c.kind = 'email'
    and c.status = 'verified' and c.provider = 'supabase'
    and lower(c.normalized_value) = lower(u.email)
  where i.id = p_invitation_id and i.tenant_id = p_tenant_id
    and i.provider_subject = p_provider_subject::text and i.intended_role = 'patient'
    and i.status in ('pending', 'accepted') and i.delivery_status = 'delivered'
    and i.contact_digest = encode(extensions.digest(convert_to(lower(btrim(u.email)), 'UTF8'), 'sha256'), 'hex')
    and (i.status = 'accepted' or i.expires_at > now());
  if subject_id is null then
    raise exception using errcode = '42501', message = 'ACTIVATION_REJECTED';
  end if;
  return subject_id;
end;
$$;
revoke all on function identity_private.pilot_activation_subject(uuid,uuid,uuid,uuid)
from public, anon, authenticated, service_role;

create function public.prepare_pilot_account(
  p_invitation_id uuid, p_tenant_id uuid, p_provider_subject uuid, p_provider_session_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
  documents jsonb;
  verified_email text;
begin
  actor_id := identity_private.pilot_activation_subject(p_invitation_id, p_tenant_id,
    p_provider_subject, p_provider_session_id);
  if not exists (select 1 from public.identity_invitations where id = p_invitation_id and status = 'pending')
    or exists (select 1 from public.tenant_memberships where subject_id = actor_id
      and (tenant_id <> p_tenant_id or role <> 'patient' or status <> 'invited'
        or valid_from > now() or expires_at <= now())) then
    raise exception using errcode = '42501', message = 'ACTIVATION_REJECTED';
  end if;
  select jsonb_agg(jsonb_build_object(
    'publicationId', id, 'instrumentId', instrument_id, 'version', instrument_version,
    'locale', locale, 'contentHash', content_sha256, 'body', document_body, 'effectiveAt', effective_at
  ) order by instrument_id) into documents from public.pilot_instrument_publications
  where instrument_id in ('pilot-account-terms','pilot-privacy-notice') and locale = 'en-ZA'
    and status = 'published' and published_at <= now() and effective_at <= now()
    and (expires_at is null or expires_at > now());
  if documents is null or jsonb_array_length(documents) <> 2 then
    raise exception using errcode = '42501', message = 'ACTIVATION_REJECTED';
  end if;
  select email into verified_email from auth.users where id = p_provider_subject;
  return jsonb_build_object('verifiedEmail', verified_email, 'documents', documents);
end;
$$;

create function public.activate_pilot_account(
  p_invitation_id uuid, p_tenant_id uuid, p_provider_subject uuid, p_provider_session_id uuid,
  p_command jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
  profile_id uuid;
  command_hash text;
  request_id uuid;
  previous identity_private.pilot_activation_commands%rowtype;
  publication public.pilot_instrument_publications%rowtype;
  session_assurance text;
begin
  if p_command is null or jsonb_typeof(p_command) <> 'object'
    or not (p_command ?& array['givenName','familyName','mobileE164','contactPreference',
      'termsPublicationId','termsHash','privacyPublicationId','privacyHash',
      'termsAccepted','privacyAcknowledged','requestKey'])
    or (select count(*) from jsonb_object_keys(p_command)) <> 11
    or p_command->'termsAccepted' <> 'true'::jsonb
    or p_command->'privacyAcknowledged' <> 'true'::jsonb
    or jsonb_typeof(p_command->'givenName') <> 'string'
    or jsonb_typeof(p_command->'familyName') <> 'string'
    or length(btrim(p_command->>'givenName')) not between 1 and 100
    or length(btrim(p_command->>'familyName')) not between 1 and 100
    or p_command->>'givenName' ~ '[[:cntrl:]]' or p_command->>'familyName' ~ '[[:cntrl:]]'
    or p_command->>'mobileE164' !~ '^\+[1-9][0-9]{1,14}$'
    or p_command->>'contactPreference' not in ('email','whatsapp')
    or p_command->>'termsHash' !~ '^[a-f0-9]{64}$'
    or p_command->>'privacyHash' !~ '^[a-f0-9]{64}$'
    or exists (select 1 from jsonb_each(p_command) where value = 'null'::jsonb)
    or exists (select 1 from jsonb_each(p_command)
      where key not in ('termsAccepted','privacyAcknowledged') and jsonb_typeof(value) <> 'string')
  then
    raise exception using errcode = '22023', message = 'ACTIVATION_REJECTED';
  end if;
  begin
    request_id := (p_command->>'requestKey')::uuid;
    perform (p_command->>'termsPublicationId')::uuid, (p_command->>'privacyPublicationId')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'ACTIVATION_REJECTED';
  end;
  -- Serialize by provider identity, then lock governing records in a consistent order.
  perform pg_advisory_xact_lock(hashtextextended(p_provider_subject::text, 91206));
  perform 1 from auth.sessions where id = p_provider_session_id for share;
  perform 1 from auth.users where id = p_provider_subject for share;
  perform 1 from public.tenants where id = p_tenant_id for share;
  perform 1 from public.identity_invitations where id = p_invitation_id for update;
  actor_id := identity_private.pilot_activation_subject(p_invitation_id, p_tenant_id,
    p_provider_subject, p_provider_session_id);
  select coalesce(aal::text,'aal1') into session_assurance from auth.sessions where id=p_provider_session_id;
  perform 1 from public.subjects where id = actor_id for share;
  perform 1 from public.subject_contacts where subject_id = actor_id for share;
  -- Revalidate after all locks; a concurrent suspension/contact change must win safely.
  actor_id := identity_private.pilot_activation_subject(p_invitation_id, p_tenant_id,
    p_provider_subject, p_provider_session_id);
  command_hash := encode(extensions.digest(convert_to(p_command::text,'UTF8'),'sha256'),'hex');
  select * into previous from identity_private.pilot_activation_commands where invitation_id = p_invitation_id;
  if previous.invitation_id is not null then
    if previous.request_key <> request_id or previous.command_sha256 <> command_hash then
      raise exception using errcode = '22023', message = 'ACTIVATION_REJECTED';
    end if;
    return previous.profile_id;
  end if;
  perform 1 from public.tenant_memberships where subject_id = actor_id for update;
  if not exists (select 1 from public.identity_invitations where id = p_invitation_id
      and status = 'pending' and expires_at > now())
    or exists (select 1 from public.tenant_memberships where subject_id = actor_id
      and (tenant_id <> p_tenant_id or role <> 'patient' or status <> 'invited'
        or valid_from > now() or expires_at <= now()))
    or exists (select 1 from public.client_profiles where subject_id = actor_id) then
    raise exception using errcode = '42501', message = 'ACTIVATION_REJECTED';
  end if;
  -- Share-lock publications so retirement cannot interleave with receipt creation.
  perform 1 from public.pilot_instrument_publications
  where id in ((p_command->>'termsPublicationId')::uuid,(p_command->>'privacyPublicationId')::uuid)
  order by id for share;
  for publication in select * from public.pilot_instrument_publications
    where (instrument_id = 'pilot-account-terms' and id = (p_command->>'termsPublicationId')::uuid
      and content_sha256 = p_command->>'termsHash')
      or (instrument_id = 'pilot-privacy-notice' and id = (p_command->>'privacyPublicationId')::uuid
      and content_sha256 = p_command->>'privacyHash')
  loop
    if publication.locale <> 'en-ZA' or publication.status <> 'published'
      or publication.published_at > now() or publication.effective_at > now()
      or (publication.expires_at is not null and publication.expires_at <= now()) then
      raise exception using errcode = '42501', message = 'ACTIVATION_REJECTED';
    end if;
  end loop;
  if (select count(*) from public.pilot_instrument_publications
    where (instrument_id = 'pilot-account-terms' and id = (p_command->>'termsPublicationId')::uuid
      and content_sha256 = p_command->>'termsHash')
      or (instrument_id = 'pilot-privacy-notice' and id = (p_command->>'privacyPublicationId')::uuid
      and content_sha256 = p_command->>'privacyHash')) <> 2 then
    raise exception using errcode = '42501', message = 'ACTIVATION_REJECTED';
  end if;
  insert into public.tenant_memberships (tenant_id, subject_id, role, status)
    values (p_tenant_id,actor_id,'patient','invited') on conflict (tenant_id,subject_id,role) do nothing;
  insert into public.client_profiles (tenant_id,subject_id,given_name,family_name,mobile_e164,contact_preference)
  values (p_tenant_id,actor_id,btrim(p_command->>'givenName'),btrim(p_command->>'familyName'),
    p_command->>'mobileE164',p_command->>'contactPreference') returning id into profile_id;
  insert into public.pilot_instrument_receipts (tenant_id,subject_id,publication_id,instrument_id,
    instrument_version,locale,content_sha256,action,assurance,idempotency_key,correlation_id)
  select p_tenant_id,actor_id,id,instrument_id,instrument_version,locale,content_sha256,
    case when instrument_id = 'pilot-privacy-notice' then 'acknowledged' else 'accepted' end,
    session_assurance,gen_random_uuid(),request_id::text from public.pilot_instrument_publications
  where id in ((p_command->>'termsPublicationId')::uuid,(p_command->>'privacyPublicationId')::uuid);
  insert into public.client_profile_events (profile_id,tenant_id,subject_id,profile_version,event_type,
    changed_fields,actor_subject_id,correlation_id,idempotency_key)
  values (profile_id,p_tenant_id,actor_id,1,'created',
    array['given_name','family_name','mobile_e164','contact_preference'],actor_id,request_id::text,request_id);
  update public.tenant_memberships set status = 'active',updated_at = now()
    where tenant_id = p_tenant_id and subject_id = actor_id and role = 'patient' and status = 'invited';
  update public.identity_invitations set status = 'accepted',accepted_by_subject_id = actor_id,accepted_at = now()
    where id = p_invitation_id;
  insert into public.pilot_account_lifecycle_events (tenant_id,subject_id,event_type,actor_subject_id,
    reason_code,idempotency_key,correlation_id)
  values (p_tenant_id,actor_id,'activated',actor_id,'account_terms_privacy_recorded',request_id,request_id::text);
  perform audit_private.append_audit_fact(p_tenant_id,'patient',actor_id,'patient',session_assurance,
    'identity.account.activated',null,'client_profile',profile_id::text,'account',
    '2026-08-10.1','succeeded','ACCOUNT_ACTIVATED',request_id::text,request_id::text,now(),'{}'::jsonb);
  insert into identity_private.pilot_activation_commands values
    (p_invitation_id,request_id,command_hash,profile_id,now());
  return profile_id;
end;
$$;
revoke all on function public.prepare_pilot_account(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_pilot_account(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb) to service_role;
comment on function public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb) is
  'Server-only atomic profile, exact instrument receipts, invitation and membership activation; no publication authority.';
