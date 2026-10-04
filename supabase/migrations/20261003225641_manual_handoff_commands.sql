-- Task 10.6. No recipient/channel is approved by this migration. No URL or health data.
create table identity_private.handoff_destinations (
  id uuid not null, version integer not null check(version>0),
  digest text not null check(digest ~ '^[a-f0-9]{64}$'),
  method text not null check(method='private_client_intake'),
  approval_reference uuid not null,
  approved_by_subject_id uuid not null references public.subjects(id),
  approved_at timestamptz not null, expires_at timestamptz not null,
  revoked_at timestamptz,
  primary key(id,version), check(expires_at>approved_at),
  check(revoked_at is null or revoked_at>=approved_at)
);
create index handoff_destinations_approver_idx on identity_private.handoff_destinations(approved_by_subject_id);
alter table identity_private.handoff_destinations enable row level security;
alter table identity_private.handoff_destinations force row level security;
revoke all on identity_private.handoff_destinations from public,anon,authenticated,service_role;
create function identity_private.serialize_handoff_destination()
returns trigger language plpgsql set search_path='' as $$begin
  perform pg_advisory_xact_lock(hashtextextended(new.id::text,10106));
  return new;
end;$$;
revoke all on function identity_private.serialize_handoff_destination() from public,anon,authenticated,service_role;
create trigger handoff_destination_serialization before insert or update on identity_private.handoff_destinations
for each row execute function identity_private.serialize_handoff_destination();

-- Populated only by a separately reviewed evidence-ingestion boundary, not an operator checkbox.
create table identity_private.handoff_evidence (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null, case_id uuid not null, subject_id uuid not null,
  attempt_id uuid not null,
  destination_id uuid not null, destination_version integer not null,
  kind text not null check(kind in ('delivered','not_delivered','acknowledged','review_pending',
    'completed','unable_to_complete','client_declined','cancel_confirmed')),
  external_reference uuid not null,
  source_reference uuid not null,
  verified_by_subject_id uuid not null references public.subjects(id),
  observed_at timestamptz not null, verified_at timestamptz not null,
  expires_at timestamptz not null,
  check(observed_at<=verified_at and expires_at>verified_at),
  foreign key(attempt_id,tenant_id,case_id,subject_id) references public.handoff_attempts(id,tenant_id,case_id,subject_id),
  foreign key(destination_id,destination_version) references identity_private.handoff_destinations(id,version),
  unique(tenant_id,source_reference,kind)
);
create index handoff_evidence_attempt_idx on identity_private.handoff_evidence(attempt_id);
create index handoff_evidence_destination_idx on identity_private.handoff_evidence(destination_id,destination_version);
create index handoff_evidence_verifier_idx on identity_private.handoff_evidence(verified_by_subject_id);
alter table identity_private.handoff_evidence enable row level security;
alter table identity_private.handoff_evidence force row level security;
revoke all on identity_private.handoff_evidence from public,anon,authenticated,service_role;
create trigger handoff_evidence_append_only before update or delete on identity_private.handoff_evidence
for each row execute function audit_private.reject_append_only_mutation();

-- Sprint 11 replaces this with authoritative ledger reconciliation. Never a submitted paid flag.
create function identity_private.handoff_payment_ready(p_case_id uuid)
returns boolean language sql stable set search_path='' as $$ select false; $$;
revoke all on function identity_private.handoff_payment_ready(uuid) from public,anon,authenticated,service_role;

create function identity_private.handoff_authorisation_current(p_authorisation_id uuid,p_case_id uuid)
returns boolean language sql volatile set search_path='' as $$
select exists(select 1 from public.handoff_authorisations a
  join identity_private.handoff_destinations d on d.id=a.destination_id and d.version=a.destination_version
  join public.pilot_instrument_receipts r on r.id=a.receipt_id
  join public.pilot_instrument_publications p on p.id=r.publication_id
  where a.id=p_authorisation_id and a.case_id=p_case_id and a.destination_digest=d.digest
    and d.approved_at<=clock_timestamp() and d.expires_at>clock_timestamp() and d.revoked_at is null
    and not exists(select 1 from identity_private.handoff_destinations newer where newer.id=d.id and newer.version>d.version
      and newer.approved_at<=clock_timestamp() and newer.expires_at>clock_timestamp() and newer.revoked_at is null)
    and a.authorised_at<=clock_timestamp() and a.expires_at>clock_timestamp()
    and p.status='published' and p.effective_at<=clock_timestamp() and p.published_at<=clock_timestamp()
    and (p.expires_at is null or p.expires_at>clock_timestamp())
    and not exists(select 1 from public.pilot_instrument_receipt_events e where e.receipt_id=r.id));
$$;
revoke all on function identity_private.handoff_authorisation_current(uuid,uuid) from public,anon,authenticated,service_role;

-- Receipt withdrawal and delivery guards share the receipt lock, including phantom event inserts.
create function identity_private.serialize_handoff_receipt_event()
returns trigger language plpgsql set search_path='' as $$begin
  perform 1 from public.pilot_instrument_receipts where id=new.receipt_id for update;
  return new;
end;$$;
revoke all on function identity_private.serialize_handoff_receipt_event() from public,anon,authenticated,service_role;
create trigger handoff_receipt_event_serialization before insert on public.pilot_instrument_receipt_events
for each row execute function identity_private.serialize_handoff_receipt_event();

-- Patient memberships may legitimately be unbounded. Use wall-clock validity after lock waits.
create or replace function identity_private.operations_readiness(p_case_id uuid)
returns jsonb language sql volatile set search_path='' as $$
select jsonb_build_object(
  'profileActive',exists(select 1 from public.client_profiles p where p.tenant_id=c.tenant_id and p.subject_id=c.subject_id and p.status='active'),
  'accountActive',exists(select 1 from public.subjects s join public.tenant_memberships m on m.subject_id=s.id
    where s.id=c.subject_id and s.status='active' and m.tenant_id=c.tenant_id and m.role='patient'
      and m.status='active' and m.valid_from<=clock_timestamp() and (m.expires_at is null or m.expires_at>clock_timestamp())),
  'emailVerified',exists(select 1 from public.subject_contacts sc where sc.subject_id=c.subject_id and sc.kind='email' and sc.status='verified'),
  'instrumentsCurrent',not exists(select 1 from unnest(array['pilot-account-terms','pilot-privacy-notice']) required(instrument)
    where not exists(select 1 from public.pilot_instrument_publications p join public.pilot_instrument_receipts r on r.publication_id=p.id
      where p.instrument_id=required.instrument and p.locale='en-ZA' and p.status='published'
        and p.published_at<=clock_timestamp() and p.effective_at<=clock_timestamp() and (p.expires_at is null or p.expires_at>clock_timestamp())
        and r.tenant_id=c.tenant_id and r.subject_id=c.subject_id
        and r.action=case when required.instrument='pilot-account-terms' then 'accepted' else 'acknowledged' end
        and not exists(select 1 from public.pilot_instrument_receipt_events e where e.receipt_id=r.id))),
  'authorisationCurrent',exists(select 1 from public.handoff_authorisations a where a.case_id=c.id
    and identity_private.handoff_authorisation_current(a.id,c.id)
    and not exists(select 1 from public.handoff_attempts h where h.authorisation_id=a.id and h.state in ('prepared','delivery_pending','uncertain','delivered'))),
  'recipientReadiness',case when exists(select 1 from public.handoff_authorisations a
    where a.case_id=c.id and identity_private.handoff_authorisation_current(a.id,c.id)) then 'approved' else 'integration_pending' end,
  'paymentReadiness','integration_pending','ready',false
) from public.operations_cases c where c.id=p_case_id;
$$;

create function public.command_operations_handoff(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_command jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  context jsonb; c public.operations_cases%rowtype; a public.operations_assignments%rowtype;
  claim public.operations_claims%rowtype; h public.handoff_attempts%rowtype;
  authz public.handoff_authorisations%rowtype; e identity_private.handoff_evidence%rowtype;
  ex public.operations_exceptions%rowtype; previous identity_private.operations_commands%rowtype;
  case_id uuid; request_id uuid; expected integer; command_hash text; action text;
  extras text[]; reference_id uuid; event_name text:='transitioned'; result jsonb;
  facts jsonb; target text;
begin
  if p_session_id is null or p_subject_id is null or p_tenant_id is null then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  action:=p_command->>'action';
  extras:=case action
    when 'prepare' then array['authorisationId'] when 'retry' then array['attemptId','authorisationId']
    when 'begin_delivery' then array['attemptId'] when 'mark_uncertain' then array['attemptId']
    when 'reconcile_delivery' then array['attemptId','evidenceId'] when 'acknowledge' then array['attemptId','evidenceId']
    when 'review' then array['attemptId','evidenceId'] when 'outcome' then array['attemptId','evidenceId']
    when 'cancel_handoff' then array['attemptId','evidenceId'] when 'resolve_exception' then array['exceptionId'] end;
  if p_command is null or jsonb_typeof(p_command)<>'object' or extras is null
    or not(p_command ?& (array['caseId','expectedVersion','requestKey','action']||extras))
    or (select count(*) from jsonb_object_keys(p_command))<>4+cardinality(extras)
    or jsonb_typeof(p_command->'expectedVersion')<>'number'
    or p_command->>'expectedVersion' !~ '^[1-9][0-9]{0,8}$'
    or exists(select 1 from jsonb_each(p_command) where key<>'expectedVersion'
      and not(action='cancel_handoff' and key='evidenceId' and value='null'::jsonb)
      and jsonb_typeof(value)<>'string') then
    raise exception using errcode='22023',message='QUEUE_INPUT_INVALID';
  end if;
  begin
    case_id:=(p_command->>'caseId')::uuid; request_id:=(p_command->>'requestKey')::uuid;
    expected:=(p_command->>'expectedVersion')::integer;
    perform (p_command->>'attemptId')::uuid,(p_command->>'authorisationId')::uuid,
      (p_command->>'evidenceId')::uuid,(p_command->>'exceptionId')::uuid;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode='22023',message='QUEUE_INPUT_INVALID';
  end;
  -- Same lock namespace/order and replay journal as queue commands; no network inside transaction.
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
  if not exists(select 1 from public.identity_sessions s where s.id=p_session_id and s.status='active'
      and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp())
    or not exists(select 1 from auth.sessions s where s.id=p_provider_session_id
      and (s.not_after is null or s.not_after>clock_timestamp()))
    or not exists(select 1 from public.tenant_memberships m where m.tenant_id=p_tenant_id and m.subject_id=p_subject_id
      and m.role='operations' and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()) then
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
  if claim.id is null or claim.workforce_subject_id<>p_subject_id or claim.assignment_id<>a.id then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  if action in ('prepare','retry') then
    if c.state<>'ready_for_handoff' then raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
    select * into authz from public.handoff_authorisations where id=(p_command->>'authorisationId')::uuid
      and handoff_authorisations.case_id=c.id for share;
    if authz.id is null then raise exception using errcode='55000',message='QUEUE_NOT_READY'; end if;
  else
    if action='resolve_exception' then
      select * into ex from public.operations_exceptions where id=(p_command->>'exceptionId')::uuid and operations_exceptions.case_id=c.id;
      if ex.id is null or ex.resolution_of_exception_id is not null or c.state<>'handoff_exception'
        or exists(select 1 from public.operations_exceptions where resolution_of_exception_id=ex.id)
        or ex.id<>(select id from public.operations_exceptions where operations_exceptions.case_id=c.id
          and resolution_of_exception_id is null order by recorded_at desc,id desc limit 1) then
        raise exception using errcode='40001',message='QUEUE_CONFLICT';
      end if;
      select * into h from public.handoff_attempts where handoff_attempts.case_id=c.id order by created_at desc,id desc limit 1 for update;
    else
      select * into h from public.handoff_attempts where id=(p_command->>'attemptId')::uuid
        and handoff_attempts.case_id=c.id for update;
      if h.id is null then raise exception using errcode='42501',message='QUEUE_REJECTED'; end if;
    end if;
    select * into authz from public.handoff_authorisations where id=h.authorisation_id for share;
  end if;
  if authz.id is not null then
    perform pg_advisory_xact_lock(hashtextextended(authz.destination_id::text,10106));
    perform 1 from identity_private.handoff_destinations where id=authz.destination_id and version=authz.destination_version for share;
    perform 1 from public.pilot_instrument_receipts where id=authz.receipt_id for share;
    perform 1 from public.pilot_instrument_publications where id=(select publication_id from public.pilot_instrument_receipts where id=authz.receipt_id) for share;
  end if;
  perform 1 from public.subjects where id=c.subject_id for share;
  perform 1 from public.tenant_memberships where tenant_id=c.tenant_id and subject_id=c.subject_id for share;
  perform 1 from public.client_profiles where tenant_id=c.tenant_id and subject_id=c.subject_id for share;
  perform 1 from public.subject_contacts where subject_id=c.subject_id for share;
  perform 1 from public.pilot_instrument_receipts where tenant_id=c.tenant_id and subject_id=c.subject_id for share;
  perform 1 from public.pilot_instrument_publications where id in
    (select publication_id from public.pilot_instrument_receipts where tenant_id=c.tenant_id and subject_id=c.subject_id) order by id for share;
  -- Locks acquired below the case must not extend session/assignment authority.
  if a.expires_at<=clock_timestamp() or not exists(select 1 from public.identity_sessions s where s.id=p_session_id
    and s.status='active' and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp())
    or not exists(select 1 from auth.sessions s where s.id=p_provider_session_id and (s.not_after is null or s.not_after>clock_timestamp()))
    or not exists(select 1 from public.tenant_memberships m where m.tenant_id=p_tenant_id and m.subject_id=p_subject_id
      and m.role='operations' and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()) then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  -- Guard forward delivery only. Withdrawal must not prevent recording failure/cancellation.
  if action in ('prepare','retry','begin_delivery') then
    facts:=identity_private.operations_readiness(c.id);
    if not identity_private.handoff_authorisation_current(authz.id,c.id)
      or not identity_private.handoff_payment_ready(c.id)
      or not (facts->>'profileActive')::boolean or not (facts->>'accountActive')::boolean
      or not (facts->>'emailVerified')::boolean or not (facts->>'instrumentsCurrent')::boolean then
      raise exception using errcode='55000',message='QUEUE_NOT_READY';
    end if;
  end if;
  if p_command->>'evidenceId' is not null then
    select * into e from identity_private.handoff_evidence where id=(p_command->>'evidenceId')::uuid
      and tenant_id=c.tenant_id and handoff_evidence.case_id=c.id and subject_id=c.subject_id and attempt_id=h.id
      and destination_id=authz.destination_id and destination_version=authz.destination_version
      and verified_by_subject_id<>p_subject_id and verified_by_subject_id<>h.workforce_subject_id and observed_at>=h.created_at
      and verified_at<=clock_timestamp() and expires_at>clock_timestamp() for share;
    if e.id is null then raise exception using errcode='55000',message='QUEUE_NOT_READY'; end if;
  end if;
  if action in ('prepare','retry') then
    if action='retry' then
      select * into h from public.handoff_attempts where id=(p_command->>'attemptId')::uuid and handoff_attempts.case_id=c.id for update;
      if h.id is null or h.state<>'failed' or exists(select 1 from public.handoff_attempts where retry_of_attempt_id=h.id) then
        raise exception using errcode='40001',message='QUEUE_CONFLICT';
      end if;
    elsif exists(select 1 from public.handoff_attempts where handoff_attempts.case_id=c.id) then
      raise exception using errcode='40001',message='QUEUE_CONFLICT';
    end if;
    if exists(select 1 from public.handoff_attempts where handoff_attempts.case_id=c.id and state in ('prepared','delivery_pending','uncertain','delivered')) then
      raise exception using errcode='40001',message='QUEUE_CONFLICT';
    end if;
    insert into public.handoff_attempts(tenant_id,case_id,subject_id,authorisation_id,claim_id,workforce_subject_id,
      retry_of_attempt_id,request_key,request_digest,created_at,updated_at)
    values(c.tenant_id,c.id,c.subject_id,authz.id,claim.id,p_subject_id,
      case when action='retry' then h.id else null end,request_id,command_hash,clock_timestamp(),clock_timestamp()) returning * into h;
    event_name:='handoff_attempted';
  elsif action='begin_delivery' then
    if c.state<>'ready_for_handoff' or h.state<>'prepared' then raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
    h.state:='delivery_pending';
    -- A separately approved private channel must consume this durable intent; this RPC sends nothing.
  elsif action='mark_uncertain' then
    if h.state<>'delivery_pending' or c.state<>'ready_for_handoff' then raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
    h.state:='uncertain';
    insert into public.operations_exceptions(tenant_id,case_id,subject_id,attempt_id,code,prior_state,actor_subject_id,idempotency_key,correlation_id)
      values(c.tenant_id,c.id,c.subject_id,h.id,'delivery_uncertain',c.state,p_subject_id,request_id,request_id) returning id into reference_id;
    c.state:='handoff_exception'; event_name:='exception_recorded';
  elsif action='reconcile_delivery' then
    if h.state not in ('delivery_pending','uncertain') or e.kind not in ('delivered','not_delivered')
      or c.state not in ('ready_for_handoff','handoff_exception') then raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
    if e.kind='delivered' then
      h.state:='delivered'; h.delivered_at:=e.observed_at; h.external_reference:=e.external_reference;
      if c.state='ready_for_handoff' then c.state:='handed_off'; end if;
    else
      h.state:='failed';
      if c.state='ready_for_handoff' then
        insert into public.operations_exceptions(tenant_id,case_id,subject_id,attempt_id,code,prior_state,actor_subject_id,idempotency_key,correlation_id)
          values(c.tenant_id,c.id,c.subject_id,h.id,'destination_unavailable',c.state,p_subject_id,request_id,request_id) returning id into reference_id;
        c.state:='handoff_exception'; event_name:='exception_recorded';
      end if;
    end if;
  elsif action in ('acknowledge','review','outcome') then
    if h.state<>'delivered' or h.external_reference is distinct from e.external_reference
      or e.observed_at<h.delivered_at then raise exception using errcode='55000',message='QUEUE_NOT_READY'; end if;
    if action='review' and not exists(select 1 from public.handoff_acknowledgements ack
      where ack.attempt_id=h.id and ack.acknowledged_at<=e.observed_at) then
      raise exception using errcode='55000',message='QUEUE_NOT_READY';
    end if;
    if action='outcome' and not exists(select 1 from public.operations_events ev
      join identity_private.handoff_evidence review on review.id=ev.reference_id
      where ev.case_id=c.id and review.attempt_id=h.id and review.kind='review_pending'
        and review.observed_at<=e.observed_at) then
      raise exception using errcode='55000',message='QUEUE_NOT_READY';
    end if;
    if action='acknowledge' and c.state='handed_off' and e.kind='acknowledged' then
      insert into public.handoff_acknowledgements(tenant_id,case_id,subject_id,attempt_id,evidence_reference,
        acknowledged_at,actor_subject_id,idempotency_key,correlation_id)
      values(c.tenant_id,c.id,c.subject_id,h.id,e.id,e.observed_at,p_subject_id,request_id,request_id);
      c.state:='provider_acknowledged'; event_name:='acknowledged';
    elsif action='review' and c.state='provider_acknowledged' and e.kind='review_pending' then
      c.state:='provider_review_pending';
    elsif action='outcome' and c.state='provider_review_pending' and e.kind in ('completed','unable_to_complete','client_declined') then
      c.state:='provider_outcome_recorded'; c.outcome:=e.kind;
    else raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
  elsif action='cancel_handoff' then
    if h.state in ('delivery_pending','uncertain') and (e.id is null or e.kind not in ('not_delivered','cancel_confirmed')) then
      raise exception using errcode='55000',message='QUEUE_NOT_READY';
    end if;
    -- Preserve delivered state/time: cancellation cannot retract external data.
    if h.state<>'delivered' then h.state:='cancelled'; end if;
    c.state:='cancelled';
    update public.operations_claims set released_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where id=claim.id;
  elsif action='resolve_exception' then
    target:=ex.prior_state;
    if h.id is not null then
      if h.state in ('prepared','delivery_pending','uncertain') then raise exception using errcode='55000',message='QUEUE_NOT_READY'; end if;
      if target='ready_for_handoff' and h.state='delivered' then target:='handed_off';
      elsif h.state<>'failed' and h.state<>'delivered' then raise exception using errcode='55000',message='QUEUE_NOT_READY'; end if;
    end if;
    facts:=identity_private.operations_readiness(c.id);
    if not (facts->>'accountActive')::boolean
      or (target<>'onboarding_pending' and (not (facts->>'profileActive')::boolean
      or not (facts->>'emailVerified')::boolean or not (facts->>'instrumentsCurrent')::boolean
      or not identity_private.handoff_authorisation_current(authz.id,c.id)))
      or (target='ready_for_handoff' and not identity_private.handoff_payment_ready(c.id)) then
      raise exception using errcode='55000',message='QUEUE_NOT_READY';
    end if;
    if target in ('cancelled','provider_outcome_recorded','handoff_exception') then raise exception using errcode='40001',message='QUEUE_CONFLICT'; end if;
    insert into public.operations_exceptions(tenant_id,case_id,subject_id,attempt_id,code,prior_state,resolution_of_exception_id,actor_subject_id,idempotency_key,correlation_id)
      values(c.tenant_id,c.id,c.subject_id,h.id,ex.code,ex.prior_state,ex.id,p_subject_id,request_id,request_id) returning id into reference_id;
    c.state:=target; event_name:='exception_resolved';
  end if;
  if h.id is not null and action not in ('prepare','retry') then
    update public.handoff_attempts set state=h.state,delivered_at=h.delivered_at,external_reference=h.external_reference,
      version=version+1,updated_at=clock_timestamp() where id=h.id;
  end if;
  update public.operations_cases set state=c.state,outcome=c.outcome,version=version+1,updated_at=clock_timestamp() where id=c.id returning * into c;
  insert into public.operations_events(tenant_id,case_id,subject_id,case_version,event,reference_id,actor_subject_id,idempotency_key,correlation_id)
    values(c.tenant_id,c.id,c.subject_id,c.version,event_name,coalesce(reference_id,e.id,h.id),p_subject_id,request_id,request_id);
  result:=jsonb_build_object('caseId',c.id,'state',c.state,'version',c.version,'attemptId',h.id,'attemptState',h.state);
  insert into identity_private.operations_commands(tenant_id,request_key,case_id,actor_subject_id,command_sha256,result)
    values(c.tenant_id,request_id,c.id,p_subject_id,command_hash,result);
  return result;
end;
$$;
revoke all on function public.command_operations_handoff(uuid,uuid,text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.command_operations_handoff(uuid,uuid,text,uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.read_operations_queue(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_case_id uuid default null,
  p_state text default null,p_after_created_at timestamptz default null,p_after_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; claimant uuid; h public.handoff_attempts%rowtype; auth_id uuid; exception_id uuid;
begin
  result:=identity_private.read_operations_queue_base(p_provider_subject,p_provider_session_id,p_verified_email,
    p_session_id,p_subject_id,p_tenant_id,p_case_id,p_state,p_after_created_at,p_after_id);
  if p_case_id is not null then
    select workforce_subject_id into claimant from public.operations_claims where case_id=p_case_id and released_at is null;
    select * into h from public.handoff_attempts where case_id=p_case_id order by created_at desc,id desc limit 1;
    select id into auth_id from public.handoff_authorisations where case_id=p_case_id and expires_at>clock_timestamp()
      order by authorised_at desc,id desc limit 1;
    select ex.id into exception_id from public.operations_exceptions ex where ex.case_id=p_case_id
      and ex.resolution_of_exception_id is null and not exists(select 1 from public.operations_exceptions r where r.resolution_of_exception_id=ex.id)
      order by ex.recorded_at desc,ex.id desc limit 1;
    result:=result||jsonb_build_object('claim',case when claimant is null then 'unclaimed'
      when claimant=p_subject_id then 'yours' else 'other' end,'readiness',identity_private.operations_readiness(p_case_id),
      'handoff',jsonb_build_object('attemptId',h.id,'attemptState',h.state,'authorisationId',auth_id,'exceptionId',exception_id));
  end if;
  return result;
end;
$$;
