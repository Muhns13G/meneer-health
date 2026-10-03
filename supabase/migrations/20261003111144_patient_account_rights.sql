-- Own-client correction and request receipt only. No export, contact change or erasure executor.
create table identity_private.patient_account_commands (
  tenant_id uuid not null references public.tenants(id),
  subject_id uuid not null references public.subjects(id),
  request_key uuid not null,
  command_hash text not null check (command_hash ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  recorded_at timestamptz not null default now(),
  primary key (tenant_id,subject_id,request_key)
);
create table identity_private.patient_rights_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  subject_id uuid not null,
  membership_role text not null default 'patient' check (membership_role='patient'),
  kind text not null check (kind in ('export','restriction','closure','contact_change','support')),
  status text not null default 'received' check (status='received'),
  profile_version integer not null check (profile_version>0),
  request_key uuid not null,
  recorded_at timestamptz not null default now(),
  foreign key (tenant_id,subject_id,membership_role)
    references public.tenant_memberships(tenant_id,subject_id,role),
  unique (tenant_id,subject_id,request_key),
  unique (tenant_id,subject_id,kind)
);
alter table identity_private.patient_account_commands enable row level security;
alter table identity_private.patient_rights_requests enable row level security;
revoke all on identity_private.patient_account_commands,identity_private.patient_rights_requests
  from public,anon,authenticated,service_role;

create function public.execute_patient_account_command(
  p_tenant_id uuid,p_subject_id uuid,p_session_id uuid,p_provider_subject uuid,
  p_provider_session_id uuid,p_verified_email text,p_purpose text,p_command jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  profile public.client_profiles;
  previous identity_private.patient_account_commands;
  request_id uuid;
  digest text;
  result jsonb;
  reference uuid;
  fields text[] := '{}';
  assurance text;
begin
  -- Only a bounded, explicit command; browser-supplied authority and free text are forbidden.
  if p_command is null or jsonb_typeof(p_command)<>'object' or pg_column_size(p_command)>2048
    or jsonb_typeof(p_command->'action') is distinct from 'string' or p_command->>'action' not in ('correct','request')
    or not (p_command ?& array['action','requestKey','expectedVersion'])
    or jsonb_typeof(p_command->'requestKey') is distinct from 'string'
    or (p_command->>'requestKey') !~ '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$'
    or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
    or (p_command->>'expectedVersion') !~ '^[1-9][0-9]{0,8}$'
    or (p_command->>'action'='correct' and (
      (select count(*) from jsonb_object_keys(p_command))<>6
      or not (p_command ?& array['givenName','familyName','contactPreference'])
      or jsonb_typeof(p_command->'givenName') is distinct from 'string' or jsonb_typeof(p_command->'familyName') is distinct from 'string'
      or jsonb_typeof(p_command->'contactPreference') is distinct from 'string'
      or length(btrim(p_command->>'givenName')) not between 1 and 100
      or length(btrim(p_command->>'familyName')) not between 1 and 100
      or (p_command->>'givenName') ~ '[[:cntrl:]]' or (p_command->>'familyName') ~ '[[:cntrl:]]'
      or p_command->>'contactPreference' not in ('email','whatsapp')))
    or (p_command->>'action'='request' and (
      (select count(*) from jsonb_object_keys(p_command))<>4
      or jsonb_typeof(p_command->'kind') is distinct from 'string' or p_command->>'kind' not in ('export','restriction','closure','contact_change','support')))
  then raise exception using errcode='42501',message='ACCOUNT_COMMAND_REJECTED'; end if;
  request_id := (p_command->>'requestKey')::uuid;
  digest := encode(extensions.digest(convert_to(p_command::text,'UTF8'),'sha256'),'hex');
  -- Serialize own-profile writes/retries. Share locks keep governance/revocation from interleaving.
  select * into profile from public.client_profiles
    where tenant_id=p_tenant_id and subject_id=p_subject_id for update;
  perform 1 from public.tenants where id=p_tenant_id for share;
  perform 1 from public.subjects where id=p_subject_id for share;
  perform 1 from public.tenant_memberships where subject_id=p_subject_id order by tenant_id,role for share;
  perform 1 from public.external_identities where subject_id=p_subject_id for share;
  perform 1 from public.subject_contacts where subject_id=p_subject_id for share;
  perform 1 from auth.users where id=p_provider_subject for share;
  perform 1 from auth.sessions where id=p_provider_session_id for share;
  perform 1 from public.identity_sessions where id=p_session_id for share;
  perform 1 from public.identity_invitations where accepted_by_subject_id=p_subject_id for share;
  perform 1 from public.pilot_account_lifecycle_events where subject_id=p_subject_id for share;
  perform 1 from public.pilot_instrument_publications where instrument_id in ('pilot-account-terms','pilot-privacy-notice') order by id for share;
  perform 1 from public.pilot_instrument_receipts where subject_id=p_subject_id for share;
  perform public.read_patient_portal(p_tenant_id,p_subject_id,p_session_id,p_provider_subject,
    p_provider_session_id,p_verified_email,p_purpose);
  select * into previous from identity_private.patient_account_commands
    where tenant_id=p_tenant_id and subject_id=p_subject_id and request_key=request_id;
  if found then
    if previous.command_hash<>digest then
      raise exception using errcode='40001',message='ACCOUNT_COMMAND_CONFLICT';
    end if;
    return previous.result;
  end if;
  if profile.version<>(p_command->>'expectedVersion')::integer then
    raise exception using errcode='40001',message='ACCOUNT_COMMAND_CONFLICT';
  end if;
  select s.assurance into assurance from public.identity_sessions s where s.id=p_session_id;
  if p_command->>'action'='correct' then
    if profile.given_name<>btrim(p_command->>'givenName') then fields := array_append(fields,'given_name'); end if;
    if profile.family_name<>btrim(p_command->>'familyName') then fields := array_append(fields,'family_name'); end if;
    if profile.contact_preference<>p_command->>'contactPreference' then fields := array_append(fields,'contact_preference'); end if;
    if cardinality(fields)=0 then raise exception using errcode='40001',message='ACCOUNT_COMMAND_CONFLICT'; end if;
    update public.client_profiles set given_name=btrim(p_command->>'givenName'),family_name=btrim(p_command->>'familyName'),
      contact_preference=p_command->>'contactPreference',version=version+1,updated_at=now()
      where id=profile.id returning version into profile.version;
    insert into public.client_profile_events(profile_id,tenant_id,subject_id,profile_version,event_type,changed_fields,
      actor_subject_id,correlation_id,idempotency_key)
    values(profile.id,p_tenant_id,p_subject_id,profile.version,'corrected',fields,p_subject_id,request_id::text,request_id)
      returning id into reference;
    perform audit_private.append_audit_fact(p_tenant_id,'patient',p_subject_id,'patient',assurance,
      'identity.profile.corrected',p_subject_id,'client_profile',profile.id::text,'account',
      '2026-08-10.1','succeeded','PROFILE_CORRECTED',request_id::text,request_id::text,now(),
      jsonb_build_object('aggregateVersion',profile.version));
    result := jsonb_build_object('reference',reference,'outcome','corrected','profileVersion',profile.version);
  else
    -- One received request per kind avoids duplicate cases. No processing success is inferred.
    insert into identity_private.patient_rights_requests(tenant_id,subject_id,kind,profile_version,request_key)
      values(p_tenant_id,p_subject_id,p_command->>'kind',profile.version,request_id)
      on conflict(tenant_id,subject_id,kind) do nothing returning id into reference;
    if reference is null then
      select id into reference from identity_private.patient_rights_requests
        where tenant_id=p_tenant_id and subject_id=p_subject_id and kind=p_command->>'kind';
    else
      perform audit_private.append_audit_fact(p_tenant_id,'patient',p_subject_id,'patient',assurance,
        'identity.rights.requested',p_subject_id,'rights_request',reference::text,'account',
        '2026-08-10.1','succeeded','REQUEST_RECEIVED',request_id::text,request_id::text,now(),'{}'::jsonb);
    end if;
    result := jsonb_build_object('reference',reference,'outcome','received','profileVersion',profile.version);
  end if;
  insert into identity_private.patient_account_commands(tenant_id,subject_id,request_key,command_hash,result)
    values(p_tenant_id,p_subject_id,request_id,digest,result);
  return result;
end;
$$;
revoke all on function public.execute_patient_account_command(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.execute_patient_account_command(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) to service_role;
