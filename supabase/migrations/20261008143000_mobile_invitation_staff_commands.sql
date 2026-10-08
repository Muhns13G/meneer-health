-- Task 14.3: governed staff preparation only. No token issuance or provider dispatch.
begin;
create table identity_private.mobile_invitation_policies (
  tenant_id uuid primary key references public.tenants(id),
  daily_reservation_limit integer not null default 0 check (daily_reservation_limit between 0 and 1000)
);
create table identity_private.mobile_invitation_commands (
  tenant_id uuid not null references public.tenants(id),
  request_key uuid not null,
  actor_subject_id uuid not null references public.subjects(id),
  command_digest text not null check (command_digest ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key(tenant_id,request_key)
);
create table identity_private.mobile_invitation_send_reservations (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null,
  tenant_id uuid not null,
  invitation_version integer not null check(invitation_version>0),
  actor_subject_id uuid not null references public.subjects(id),
  request_key uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(invitation_id,invitation_version),
  unique(tenant_id,request_key),
  foreign key(invitation_id,tenant_id) references identity_private.mobile_invitations(id,tenant_id)
);
create index mobile_send_reservation_budget on identity_private.mobile_invitation_send_reservations(tenant_id,created_at);
alter table identity_private.mobile_invitation_events drop constraint mobile_invitation_events_event_check;
alter table identity_private.mobile_invitation_events add constraint mobile_invitation_events_event_check
  check(event in ('created','issued','claimed','email_bound','converted','superseded','revoked',
    'declined','expired','contact_purged','reviewed','send_reserved'));
do $$ declare t text; begin
 foreach t in array array['mobile_invitation_policies','mobile_invitation_commands','mobile_invitation_send_reservations'] loop
  execute format('alter table identity_private.%I enable row level security',t);
  execute format('alter table identity_private.%I force row level security',t);
  execute format('revoke all on identity_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;
create trigger mobile_commands_immutable before update or delete on identity_private.mobile_invitation_commands
 for each row execute function audit_private.reject_append_only_mutation();
create trigger mobile_reservations_immutable before update or delete on identity_private.mobile_invitation_send_reservations
 for each row execute function audit_private.reject_append_only_mutation();

-- Lock current authority and recheck wall-clock validity after the tenant budget lock.
create function identity_private.require_mobile_invitation_operator(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid
) returns void language plpgsql security definer set search_path='' as $$
declare context jsonb;
begin
 if p_session_id is null or p_subject_id is null or p_tenant_id is null then
  raise exception using errcode='42501',message='MOBILE_INVITATION_REJECTED'; end if;
 perform 1 from auth.users where id=p_provider_subject for share;
 perform 1 from auth.sessions where id=p_provider_session_id for share;
 perform 1 from public.tenants where id=p_tenant_id for share;
 perform 1 from public.subjects where id=p_subject_id for share;
 perform 1 from public.external_identities where subject_id=p_subject_id for share;
 perform 1 from public.subject_contacts where subject_id=p_subject_id for share;
 perform 1 from public.tenant_memberships where tenant_id=p_tenant_id and subject_id=p_subject_id for share;
 perform 1 from public.identity_sessions where id=p_session_id for share;
 perform 1 from public.access_assignments where tenant_id=p_tenant_id and subject_id=p_subject_id
  and resource_type='identity_contact' and resource_id=p_tenant_id for share;
 context:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id);
 if context->>'role'<>'operations' or context->>'purpose'<>'operations'
  or not exists(select 1 from public.identity_sessions s where s.id=p_session_id and s.status='active'
    and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp())
  or not exists(select 1 from auth.sessions s where s.id=p_provider_session_id
    and (s.not_after is null or s.not_after>clock_timestamp()))
  or not exists(select 1 from public.tenant_memberships m where m.subject_id=p_subject_id
    and m.tenant_id=p_tenant_id and m.role='operations' and m.status='active'
    and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp())
  or not exists(select 1 from public.access_assignments a where a.tenant_id=p_tenant_id
    and a.subject_id=p_subject_id and a.resource_type='identity_contact' and a.resource_id=p_tenant_id
    and a.purpose='operations' and a.status='active'
    and a.valid_from<=clock_timestamp() and a.expires_at>clock_timestamp()) then
  raise exception using errcode='42501',message='MOBILE_INVITATION_REJECTED'; end if;
end $$;
revoke all on function identity_private.require_mobile_invitation_operator(uuid,uuid,text,uuid,uuid,uuid)
 from public,anon,authenticated,service_role;

create function public.read_mobile_invitation_register(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_after_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,
  p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 with scoped as (
  select i.id,i.version,i.status,i.expires_at,c.given_name,c.family_name,right(c.phone,2) suffix,
   exists(select 1 from identity_private.mobile_invitation_events e where e.invitation_id=i.id
    and e.invitation_version=i.version and e.event='reviewed') reviewed,
   exists(select 1 from identity_private.mobile_invitation_send_reservations r where r.invitation_id=i.id
    and r.invitation_version=i.version) reserved
  from identity_private.mobile_invitations i join identity_private.mobile_invitation_contacts c on c.invitation_id=i.id
  where i.tenant_id=p_tenant_id and (p_after_id is null or i.id>p_after_id) order by i.id limit 26
 ), page as (select * from scoped order by id limit 25)
 select jsonb_build_object('invitations',coalesce((select jsonb_agg(jsonb_build_object(
  'id',id,'version',version,'status',status,'expiresAt',expires_at,'givenName',given_name,
  'familyName',family_name,'maskedPhone','***'||suffix,'reviewed',reviewed,'sendReserved',reserved)
  order by id) from page),'[]'::jsonb),
  'nextId',case when (select count(*) from scoped)>25 then (select id from page order by id desc limit 1) else null end,
  'reservationEnabled',coalesce((select daily_reservation_limit>0 from identity_private.mobile_invitation_policies
    where tenant_id=p_tenant_id),false),'sendingEnabled',false) into result;
 return result;
end $$;

create function public.command_mobile_invitation_register(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_command jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare action text; request_id uuid; target_id uuid; expected integer; fingerprint text;
 i identity_private.mobile_invitations; previous identity_private.mobile_invitation_commands;
 result jsonb; event_name text; event_id uuid; quota integer;
begin
 if p_command is null or jsonb_typeof(p_command)<>'object'
  or not(p_command ?& array['action','requestKey']) then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 action:=p_command->>'action';
 if action is null or action not in ('create','review','send','resend','revoke')
  or exists(select 1 from jsonb_each(p_command) where key<>'expectedVersion' and jsonb_typeof(value)<>'string')
  or (action='create' and (not(p_command ?& array['givenName','familyName','phone','provenanceReference','contactAuthorityReference'])
    or (select count(*) from jsonb_object_keys(p_command))<>7))
  or (action<>'create' and (not(p_command ?& array['invitationId','expectedVersion'])
    or (select count(*) from jsonb_object_keys(p_command))<>4
    or jsonb_typeof(p_command->'expectedVersion')<>'number'
    or p_command->>'expectedVersion' !~ '^[1-9][0-9]{0,8}$')) then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 begin
  request_id:=(p_command->>'requestKey')::uuid;
  if action='create' then
   perform (p_command->>'provenanceReference')::uuid,(p_command->>'contactAuthorityReference')::uuid;
   if length(p_command->>'givenName') not between 1 and 100 or length(p_command->>'familyName') not between 1 and 100
    or p_command->>'givenName'<>btrim(p_command->>'givenName') or p_command->>'familyName'<>btrim(p_command->>'familyName')
    or (p_command->>'givenName') ~ '[[:cntrl:]]' or (p_command->>'familyName') ~ '[[:cntrl:]]'
    or p_command->>'phone' !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
  else target_id:=(p_command->>'invitationId')::uuid; expected:=(p_command->>'expectedVersion')::integer;
  end if;
 exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID';
 end;
 -- Serialize all tenant reservations/collisions, including idempotency and budget windows.
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,
  p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 fingerprint:=encode(sha256(convert_to(p_command::text,'UTF8')),'hex');
 select * into previous from identity_private.mobile_invitation_commands
  where tenant_id=p_tenant_id and request_key=request_id;
 if previous.request_key is not null then
  if previous.actor_subject_id<>p_subject_id or previous.command_digest<>fingerprint then
   raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
  return previous.result; -- Receipt only: never dispatch or reconstruct a token on replay.
 end if;
 if action='create' then
  if (select count(*) from identity_private.mobile_invitation_commands c where c.tenant_id=p_tenant_id
   and c.actor_subject_id=p_subject_id and c.result->>'action'='create'
   and c.recorded_at>clock_timestamp()-interval '1 hour')>=10 then
   raise exception using errcode='PT429',message='MOBILE_BUDGET_EXCEEDED'; end if;
  if exists(select 1 from identity_private.mobile_invitation_contacts where tenant_id=p_tenant_id
    and phone=p_command->>'phone' and phone_reserved) then
   raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
  insert into identity_private.mobile_invitations(tenant_id,created_by_subject_id,provenance_reference,
   contact_authority_reference,request_key) values(p_tenant_id,p_subject_id,
    (p_command->>'provenanceReference')::uuid,(p_command->>'contactAuthorityReference')::uuid,request_id)
   returning * into i;
  insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,family_name,phone)
   values(i.id,p_tenant_id,p_command->>'givenName',p_command->>'familyName',p_command->>'phone');
  event_name:='created';
 else
  select * into i from identity_private.mobile_invitations where id=target_id and tenant_id=p_tenant_id for update;
  if i.id is null then raise exception using errcode='42501',message='MOBILE_INVITATION_REJECTED'; end if;
  if i.version<>expected or i.status in ('converted','expired','revoked','declined')
   or (action<>'revoke' and i.expires_at<=clock_timestamp()) then
   raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
  if action='review' then
   if i.status<>'draft' or exists(select 1 from identity_private.mobile_invitation_events where invitation_id=i.id
     and invitation_version=i.version and event='reviewed') then
    raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
   event_name:='reviewed';
  elsif action='revoke' then
   update identity_private.mobile_invitations set status='revoked',terminal_at=clock_timestamp()
    where id=i.id returning * into i;
   event_name:='revoked';
  else
   if not exists(select 1 from identity_private.mobile_invitation_events where invitation_id=i.id
      and invitation_version=i.version and event='reviewed')
    or (action='send' and (i.status<>'draft' or exists(select 1 from identity_private.mobile_invitation_send_reservations
      where invitation_id=i.id and invitation_version=i.version))) then
    raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
   select daily_reservation_limit into quota from identity_private.mobile_invitation_policies where tenant_id=p_tenant_id for share;
   if coalesce(quota,0)=0 or (select count(*) from identity_private.mobile_invitation_send_reservations
      where tenant_id=p_tenant_id and created_at>clock_timestamp()-interval '24 hours')>=quota
    or (select count(*) from identity_private.mobile_invitation_send_reservations
      where invitation_id=i.id and created_at>clock_timestamp()-interval '24 hours')>=3 then
    raise exception using errcode='PT429',message='MOBILE_BUDGET_EXCEEDED'; end if;
   if action='resend' then
    if not exists(select 1 from identity_private.mobile_invitation_send_reservations where invitation_id=i.id
      and invitation_version=i.version) then
     raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
    update identity_private.mobile_invitations set version=version+1,status='draft',issued_at=null,expires_at=null,
     bound_email_digest=null where id=i.id returning * into i;
    insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,actor_subject_id,request_key)
      values(i.id,p_tenant_id,i.version,'superseded',p_subject_id,request_id),
      (i.id,p_tenant_id,i.version,'reviewed',p_subject_id,request_id);
   end if;
   insert into identity_private.mobile_invitation_send_reservations(invitation_id,tenant_id,invitation_version,actor_subject_id,request_key)
    values(i.id,p_tenant_id,i.version,p_subject_id,request_id);
   event_name:='send_reserved';
  end if;
 end if;
 insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,actor_subject_id,request_key)
  values(i.id,p_tenant_id,i.version,event_name,p_subject_id,request_id) returning id into event_id;
 perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'operations','aal2',
  'mobile.invitation.'||replace(event_name,'_',''),null,'mobile_invitation',i.id::text,'operations','mobile-invitation-v1',
  'succeeded','MOBILE_INVITATION_COMMAND',event_id::text,request_id::text,clock_timestamp(),'{}'::jsonb);
 result:=jsonb_build_object('invitationId',i.id,'version',i.version,'status',i.status,'action',action,'smsSent',false);
 insert into identity_private.mobile_invitation_commands(tenant_id,request_key,actor_subject_id,command_digest,result)
  values(p_tenant_id,request_id,p_subject_id,fingerprint,result);
 return result;
end $$;
revoke all on function public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.command_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.command_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,jsonb) to service_role;
commit;
