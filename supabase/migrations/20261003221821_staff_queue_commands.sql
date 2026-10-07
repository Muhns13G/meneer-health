-- Local Task 10.5: reservations and bounded administrative commands, never delivery.
create table identity_private.operations_commands (
  tenant_id uuid not null references public.tenants(id),
  request_key uuid not null,
  case_id uuid not null references public.operations_cases(id),
  actor_subject_id uuid not null references public.subjects(id),
  command_sha256 text not null check (command_sha256 ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key(tenant_id,request_key)
);
create index operations_commands_case_idx on identity_private.operations_commands(case_id);
create index operations_commands_actor_idx on identity_private.operations_commands(actor_subject_id);
alter table identity_private.operations_commands enable row level security;
alter table identity_private.operations_commands force row level security;
revoke all on identity_private.operations_commands from public,anon,authenticated,service_role;
create trigger operations_commands_append_only before update or delete on identity_private.operations_commands
for each row execute function audit_private.reject_append_only_mutation();

create function identity_private.operations_readiness(p_case_id uuid)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object(
  'profileActive',exists(select 1 from public.client_profiles p where p.tenant_id=c.tenant_id
    and p.subject_id=c.subject_id and p.status='active'),
  'accountActive',exists(select 1 from public.subjects s join public.tenant_memberships m
    on m.subject_id=s.id where s.id=c.subject_id and s.status='active' and m.tenant_id=c.tenant_id
    and m.role='patient' and m.status='active' and m.valid_from<=now() and m.expires_at>now()),
  'emailVerified',exists(select 1 from public.subject_contacts sc where sc.subject_id=c.subject_id
    and sc.kind='email' and sc.status='verified'),
  'instrumentsCurrent',not exists (
    select 1 from unnest(array['pilot-account-terms','pilot-privacy-notice']) required(instrument)
    where not exists(select 1 from public.pilot_instrument_publications p
      join public.pilot_instrument_receipts r on r.publication_id=p.id
      where p.instrument_id=required.instrument and p.locale='en-ZA' and p.status='published'
        and p.published_at<=now() and p.effective_at<=now() and (p.expires_at is null or p.expires_at>now())
        and r.tenant_id=c.tenant_id and r.subject_id=c.subject_id
        and r.action=case when required.instrument='pilot-account-terms' then 'accepted' else 'acknowledged' end
        and not exists(select 1 from public.pilot_instrument_receipt_events e where e.receipt_id=r.id))),
  'authorisationCurrent',exists(select 1 from public.handoff_authorisations a
    join public.pilot_instrument_receipts r on r.id=a.receipt_id
    join public.pilot_instrument_publications p on p.id=r.publication_id
    where a.case_id=c.id and a.tenant_id=c.tenant_id and a.subject_id=c.subject_id
      and a.authorised_at<=now() and a.expires_at>now() and p.status='published'
      and p.effective_at<=now() and (p.expires_at is null or p.expires_at>now())
      and not exists(select 1 from public.pilot_instrument_receipt_events e where e.receipt_id=r.id)
      and not exists(select 1 from public.handoff_attempts h where h.authorisation_id=a.id
        and h.state in ('prepared','delivery_pending','uncertain','delivered'))),
  'paymentReadiness','integration_pending','recipientReadiness','integration_pending','ready',false
) from public.operations_cases c where c.id=p_case_id;
$$;
revoke all on function identity_private.operations_readiness(uuid) from public,anon,authenticated,service_role;

create function public.command_operations_queue(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_command jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  context jsonb; c public.operations_cases%rowtype; a public.operations_assignments%rowtype;
  claim public.operations_claims%rowtype; previous identity_private.operations_commands%rowtype;
  case_id uuid; request_id uuid; expected integer; command_hash text; action text;
  event_name text; reference_id uuid; result jsonb;
begin
  if p_session_id is null or p_subject_id is null or p_tenant_id is null then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  if p_command is null or jsonb_typeof(p_command)<>'object'
    or not(p_command ?& array['caseId','expectedVersion','requestKey','action'])
    or p_command->>'action' not in ('claim','release','mark_ready','cancel','record_exception')
    or jsonb_typeof(p_command->'expectedVersion')<>'number'
    or p_command->>'expectedVersion' !~ '^[1-9][0-9]{0,8}$'
    or exists(select 1 from jsonb_each(p_command) where key<>'expectedVersion' and jsonb_typeof(value)<>'string')
    or (select count(*) from jsonb_object_keys(p_command))<>
      (case when p_command->>'action'='record_exception' then 5 else 4 end)
    or (p_command->>'action'='record_exception' and (not(p_command ? 'code') or p_command->>'code' not in
      ('destination_unavailable','authorisation_stale','acknowledgement_missing','delivery_uncertain',
       'version_conflict','provider_unavailable','client_withdrawal','abandoned_case'))) then
    raise exception using errcode='22023',message='QUEUE_INPUT_INVALID';
  end if;
  begin
    case_id:=(p_command->>'caseId')::uuid; request_id:=(p_command->>'requestKey')::uuid;
    expected:=(p_command->>'expectedVersion')::integer; action:=p_command->>'action';
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode='22023',message='QUEUE_INPUT_INVALID';
  end;
  -- Serialize tenant-scoped replay keys first, then the case; no provider/network work under locks.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||request_id::text,10105));
  perform 1 from auth.users where id=p_provider_subject for share;
  perform 1 from auth.sessions where id=p_provider_session_id for share;
  perform 1 from public.tenants where id=p_tenant_id for share;
  perform 1 from public.subjects where id=p_subject_id for share;
  perform 1 from public.external_identities where subject_id=p_subject_id for share;
  perform 1 from public.subject_contacts where subject_id=p_subject_id for share;
  perform 1 from public.tenant_memberships where tenant_id=p_tenant_id and subject_id=p_subject_id for share;
  perform 1 from public.identity_sessions where id=p_session_id for share;
  context:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,
    p_session_id,p_subject_id,p_tenant_id);
  if context->>'role'<>'operations' or context->>'purpose'<>'operations' then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  select * into c from public.operations_cases where id=case_id and tenant_id=p_tenant_id for update;
  select * into a from public.operations_assignments where operations_assignments.case_id=c.id
    and tenant_id=p_tenant_id and subject_id=c.subject_id and workforce_subject_id=p_subject_id
    and role='operations' and purpose='operations' and revoked_at is null
    and starts_at<=clock_timestamp() and expires_at>clock_timestamp() for share;
  if c.id is null or a.id is null then raise exception using errcode='42501',message='QUEUE_REJECTED'; end if;
  -- A lock wait must not preserve authority past a wall-clock deadline (now() is transaction-fixed).
  if not exists(select 1 from public.identity_sessions s where s.id=p_session_id
    and s.status='active' and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp())
    or not exists(select 1 from auth.sessions s where s.id=p_provider_session_id
      and (s.not_after is null or s.not_after>clock_timestamp()))
    or not exists(select 1 from public.tenant_memberships m where m.tenant_id=p_tenant_id
      and m.subject_id=p_subject_id and m.role='operations' and m.status='active'
      and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()) then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  command_hash:=encode(extensions.digest(convert_to(p_command::text,'UTF8'),'sha256'),'hex');
  select * into previous from identity_private.operations_commands where tenant_id=p_tenant_id and request_key=request_id;
  if previous.request_key is not null then
    if previous.case_id<>c.id or previous.actor_subject_id<>p_subject_id or previous.command_sha256<>command_hash then
      raise exception using errcode='40001',message='QUEUE_CONFLICT';
    end if;
    return previous.result;
  end if;
  if c.version<>expected or c.state in ('cancelled','provider_outcome_recorded') then
    raise exception using errcode='40001',message='QUEUE_CONFLICT';
  end if;
  select * into claim from public.operations_claims where operations_claims.case_id=c.id and released_at is null for update;
  if action='claim' then
    if claim.id is not null then raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
    insert into public.operations_claims(tenant_id,case_id,subject_id,assignment_id,workforce_subject_id)
      values(c.tenant_id,c.id,c.subject_id,a.id,p_subject_id) returning id into reference_id;
    event_name:='claimed';
  else
    if claim.id is null or claim.workforce_subject_id<>p_subject_id or claim.assignment_id<>a.id then
      raise exception using errcode='42501',message='QUEUE_REJECTED';
    end if;
    reference_id:=claim.id;
    if action='release' then
      update public.operations_claims set released_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where id=claim.id;
      event_name:='released';
    elsif action='mark_ready' then
      -- No deposit override or unverified destination: Sprint 11/10.6 must replace these fact adapters.
      if c.state<>'onboarding_pending' or not (identity_private.operations_readiness(c.id)->>'ready')::boolean then
        raise exception using errcode='55000',message='QUEUE_NOT_READY';
      end if;
      c.state:='ready_for_handoff'; event_name:='transitioned';
    elsif action='record_exception' then
      if c.state='handoff_exception' then raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
      insert into public.operations_exceptions(tenant_id,case_id,subject_id,code,prior_state,actor_subject_id,idempotency_key,correlation_id)
        values(c.tenant_id,c.id,c.subject_id,p_command->>'code',c.state,p_subject_id,request_id,request_id)
        returning id into reference_id;
      c.state:='handoff_exception'; event_name:='exception_recorded';
    elsif action='cancel' then
      -- Task 10.6 must reconcile the delivery boundary; do not silently abandon in-flight work.
      if c.state not in ('onboarding_pending','ready_for_handoff','handoff_exception') or exists(
        select 1 from public.handoff_attempts h where h.case_id=c.id and h.state in ('prepared','delivery_pending','uncertain','delivered')) then
        raise exception using errcode='55000',message='QUEUE_NOT_READY';
      end if;
      c.state:='cancelled'; event_name:='transitioned';
      update public.operations_claims set released_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where id=claim.id;
    end if;
  end if;
  update public.operations_cases set state=c.state,version=version+1,updated_at=clock_timestamp()
    where id=c.id returning * into c;
  insert into public.operations_events(tenant_id,case_id,subject_id,case_version,event,reference_id,actor_subject_id,idempotency_key,correlation_id)
    values(c.tenant_id,c.id,c.subject_id,c.version,event_name,reference_id,p_subject_id,request_id,request_id);
  result:=jsonb_build_object('caseId',c.id,'state',c.state,'version',c.version,
    'claim',case when action in ('release','cancel') then 'unclaimed' else 'yours' end,
    'readiness',identity_private.operations_readiness(c.id));
  insert into identity_private.operations_commands(tenant_id,request_key,case_id,actor_subject_id,command_sha256,result)
    values(c.tenant_id,request_id,c.id,p_subject_id,command_hash,result);
  return result;
end;
$$;
revoke all on function public.command_operations_queue(uuid,uuid,text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.command_operations_queue(uuid,uuid,text,uuid,uuid,uuid,jsonb) to service_role;

-- Keep the list projection unchanged; assigned detail adds only bounded operational facts.
alter function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)
  rename to read_operations_queue_base;
alter function public.read_operations_queue_base(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)
  set schema identity_private;
revoke all on function identity_private.read_operations_queue_base(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid) from public,anon,authenticated,service_role;
create function public.read_operations_queue(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_case_id uuid default null,
  p_state text default null,p_after_created_at timestamptz default null,p_after_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; claimant uuid;
begin
  result:=identity_private.read_operations_queue_base(p_provider_subject,p_provider_session_id,p_verified_email,
    p_session_id,p_subject_id,p_tenant_id,p_case_id,p_state,p_after_created_at,p_after_id);
  if p_case_id is not null then
    select workforce_subject_id into claimant from public.operations_claims where case_id=p_case_id and released_at is null;
    result:=result||jsonb_build_object('claim',case when claimant is null then 'unclaimed'
      when claimant=p_subject_id then 'yours' else 'other' end,'readiness',identity_private.operations_readiness(p_case_id));
  end if;
  return result;
end;
$$;
revoke all on function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid) to service_role;
