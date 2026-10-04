-- Approved private portal channel. No URL, health information or recipient approval is seeded.
create table identity_private.handoff_destination_owners (
  destination_id uuid primary key, tenant_id uuid not null references public.tenants(id)
);
create index handoff_destination_owner_tenant_idx on identity_private.handoff_destination_owners(tenant_id);
alter table identity_private.handoff_destination_owners enable row level security;
alter table identity_private.handoff_destination_owners force row level security;
revoke all on identity_private.handoff_destination_owners from public,anon,authenticated,service_role;
create trigger handoff_destination_owner_append_only before update or delete on identity_private.handoff_destination_owners
for each row execute function audit_private.reject_append_only_mutation();
create table identity_private.handoff_boundary_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  actor_subject_id uuid not null references public.subjects(id),
  request_key uuid not null, command_sha256 text not null check(command_sha256 ~ '^[a-f0-9]{64}$'),
  kind text not null check(kind in ('destination_approved','evidence_verified','portal_link_issued')),
  reference_id uuid not null, recorded_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz, unique(tenant_id,request_key)
);
create index handoff_boundary_actor_idx on identity_private.handoff_boundary_events(actor_subject_id);
alter table identity_private.handoff_boundary_events enable row level security;
alter table identity_private.handoff_boundary_events force row level security;
revoke all on identity_private.handoff_boundary_events from public,anon,authenticated,service_role;
create trigger handoff_boundary_append_only before update or delete on identity_private.handoff_boundary_events
for each row execute function audit_private.reject_append_only_mutation();

create function identity_private.handoff_workforce_deadline(p_session_id uuid,p_provider_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_role text)
returns boolean language sql volatile set search_path='' as $$
select p_session_id is not null and exists(select 1 from public.identity_sessions s
 join auth.sessions a on a.id=s.provider_session_id and a.id=p_provider_session_id and a.aal::text='aal2'
 join public.tenant_memberships m on m.subject_id=s.subject_id and m.tenant_id=p_tenant_id and m.role=p_role
 where s.id=p_session_id and s.subject_id=p_subject_id and s.status='active' and s.assurance='aal2'
 and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp()
 and (a.not_after is null or a.not_after>clock_timestamp())
 and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp());
$$;
revoke all on function identity_private.handoff_workforce_deadline(uuid,uuid,uuid,uuid,text) from public,anon,authenticated,service_role;

-- Admin approval takes the server's URL digest, never the URL itself or a browser-selected target.
create function public.approve_portal_handoff_destination(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,
  p_destination_id uuid,p_version integer,p_digest text,p_approval_reference uuid,p_request_key uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare ctx jsonb; prior identity_private.handoff_boundary_events%rowtype; digest text;
begin
  if p_session_id is null or p_subject_id is null or p_tenant_id is null then raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  perform 1 from auth.users where id=p_provider_subject for share;
  perform 1 from auth.sessions where id=p_provider_session_id for share;
  perform 1 from public.tenants where id=p_tenant_id for share;
  perform 1 from public.subjects where id=p_subject_id for share;
  perform 1 from public.tenant_memberships where tenant_id=p_tenant_id and subject_id=p_subject_id for share;
  perform 1 from public.identity_sessions where id=p_session_id for share;
  ctx:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id);
  if ctx->>'role'<>'admin' or ctx->>'purpose'<>'security_administration' then
    raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  if p_destination_id is null or p_version is null or p_version<1 or p_digest is null
    or p_digest !~ '^[a-f0-9]{64}$' or p_approval_reference is null or p_request_key is null then
    raise exception using errcode='22023',message='HANDOFF_INPUT_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||p_request_key::text,10107));
  perform pg_advisory_xact_lock(hashtextextended(p_destination_id::text,10106));
  if not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'admin') then
    raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  if exists(select 1 from identity_private.handoff_destination_owners where destination_id=p_destination_id and tenant_id<>p_tenant_id) then
    raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  digest:=encode(extensions.digest(convert_to(jsonb_build_array(p_destination_id,p_version,p_digest,p_approval_reference)::text,'UTF8'),'sha256'),'hex');
  select * into prior from identity_private.handoff_boundary_events where tenant_id=p_tenant_id and request_key=p_request_key;
  if prior.id is not null then
    if prior.kind<>'destination_approved' or prior.actor_subject_id<>p_subject_id or prior.command_sha256<>digest then
      raise exception using errcode='40001',message='HANDOFF_CONFLICT'; end if;
    return prior.reference_id;
  end if;
  if exists(select 1 from identity_private.handoff_destinations where id=p_destination_id and version>=p_version) then
    raise exception using errcode='40001',message='HANDOFF_CONFLICT'; end if;
  insert into identity_private.handoff_destination_owners(destination_id,tenant_id) values(p_destination_id,p_tenant_id) on conflict do nothing;
  insert into identity_private.handoff_destinations(id,version,digest,method,approval_reference,approved_by_subject_id,approved_at,expires_at)
  values(p_destination_id,p_version,p_digest,'private_client_intake',p_approval_reference,p_subject_id,clock_timestamp(),clock_timestamp()+interval '30 days');
  insert into identity_private.handoff_boundary_events(tenant_id,actor_subject_id,request_key,command_sha256,kind,reference_id)
  values(p_tenant_id,p_subject_id,p_request_key,digest,'destination_approved',p_destination_id);
  return p_destination_id;
end;$$;

-- A second case-assigned operations actor attests a specific record; not the claimant/deliverer.
create function public.verify_operations_handoff_evidence(
  p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_command jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare ctx jsonb; c public.operations_cases%rowtype; h public.handoff_attempts%rowtype;
  a public.handoff_authorisations%rowtype; prior identity_private.handoff_boundary_events%rowtype;
  evidence_id uuid; request_id uuid; digest text; observed timestamptz; assignment_id uuid;
begin
  if p_session_id is null or p_subject_id is null or p_tenant_id is null then raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  if p_command is null or jsonb_typeof(p_command)<>'object'
    or not(p_command ?& array['caseId','attemptId','kind','externalReference','sourceReference','observedAt','requestKey'])
    or (select count(*) from jsonb_object_keys(p_command))<>7
    or exists(select 1 from jsonb_each(p_command) where jsonb_typeof(value)<>'string') then
    raise exception using errcode='22023',message='HANDOFF_INPUT_INVALID'; end if;
  begin
    request_id:=(p_command->>'requestKey')::uuid;
    perform (p_command->>'caseId')::uuid,(p_command->>'attemptId')::uuid,
      (p_command->>'externalReference')::uuid,(p_command->>'sourceReference')::uuid;
    observed:=(p_command->>'observedAt')::timestamptz;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode='22023',message='HANDOFF_INPUT_INVALID'; end;
  if p_command->>'kind' not in ('delivered','not_delivered','acknowledged','review_pending','completed','unable_to_complete','client_declined','cancel_confirmed')
    or observed>clock_timestamp() or observed<clock_timestamp()-interval '30 days' then
    raise exception using errcode='22023',message='HANDOFF_INPUT_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||request_id::text,10107));
  perform 1 from auth.users where id=p_provider_subject for share;
  perform 1 from auth.sessions where id=p_provider_session_id for share;
  perform 1 from public.tenants where id=p_tenant_id for share;
  perform 1 from public.subjects where id=p_subject_id for share;
  perform 1 from public.tenant_memberships where tenant_id=p_tenant_id and subject_id=p_subject_id for share;
  perform 1 from public.identity_sessions where id=p_session_id for share;
  ctx:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id);
  if ctx->>'role'<>'operations' or ctx->>'purpose'<>'operations' then
    raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  select * into c from public.operations_cases where id=(p_command->>'caseId')::uuid and tenant_id=p_tenant_id for update;
  select id into assignment_id from public.operations_assignments where case_id=c.id and tenant_id=c.tenant_id
    and subject_id=c.subject_id and workforce_subject_id=p_subject_id and role='operations' and purpose='operations'
    and revoked_at is null and starts_at<=clock_timestamp() and expires_at>clock_timestamp() for share;
  select * into h from public.handoff_attempts where id=(p_command->>'attemptId')::uuid and case_id=c.id for share;
  if c.id is null or assignment_id is null or h.id is null or h.workforce_subject_id=p_subject_id
    or exists(select 1 from public.operations_claims where case_id=c.id and released_at is null and workforce_subject_id=p_subject_id) then
    raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  -- Recheck after all locks, including AAL2 and assignment expiry.
  perform public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id);
  if not identity_private.handoff_workforce_deadline(p_session_id,p_provider_session_id,p_subject_id,p_tenant_id,'operations')
    or not exists(select 1 from public.operations_assignments where id=assignment_id and expires_at>clock_timestamp() and revoked_at is null) then
    raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  digest:=encode(extensions.digest(convert_to(p_command::text,'UTF8'),'sha256'),'hex');
  select * into prior from identity_private.handoff_boundary_events where tenant_id=p_tenant_id and request_key=request_id;
  if prior.id is not null then
    if prior.kind<>'evidence_verified' or prior.actor_subject_id<>p_subject_id or prior.command_sha256<>digest then
      raise exception using errcode='40001',message='HANDOFF_CONFLICT'; end if;
    return prior.reference_id;
  end if;
  if c.state in ('cancelled','provider_outcome_recorded') or h.state in ('prepared','cancelled','failed')
    or observed<h.created_at or (h.external_reference is not null and h.external_reference<>(p_command->>'externalReference')::uuid) then
    raise exception using errcode='55000',message='HANDOFF_NOT_READY'; end if;
  select * into a from public.handoff_authorisations where id=h.authorisation_id;
  insert into identity_private.handoff_evidence(tenant_id,case_id,subject_id,attempt_id,destination_id,destination_version,
    kind,external_reference,source_reference,verified_by_subject_id,observed_at,verified_at,expires_at)
  values(c.tenant_id,c.id,c.subject_id,h.id,a.destination_id,a.destination_version,p_command->>'kind',
    (p_command->>'externalReference')::uuid,(p_command->>'sourceReference')::uuid,p_subject_id,observed,clock_timestamp(),clock_timestamp()+interval '1 day')
  returning id into evidence_id;
  insert into identity_private.handoff_boundary_events(tenant_id,actor_subject_id,request_key,command_sha256,kind,reference_id)
  values(c.tenant_id,p_subject_id,request_id,digest,'evidence_verified',evidence_id);
  return evidence_id;
end;$$;

-- Persist issuance before returning a link. Issuance is NOT provider receipt or delivery proof.
create function public.issue_patient_handoff_link(
  p_tenant_id uuid,p_subject_id uuid,p_session_id uuid,p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
  p_destination_id uuid,p_destination_version integer,p_destination_digest text,p_request_key uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.operations_cases%rowtype; h public.handoff_attempts%rowtype;
  a public.handoff_authorisations%rowtype; prior identity_private.handoff_boundary_events%rowtype; digest text;
begin
  if p_session_id is null or p_subject_id is null or p_tenant_id is null then raise exception using errcode='42501',message='HANDOFF_REJECTED'; end if;
  if p_request_key is null then raise exception using errcode='22023',message='HANDOFF_INPUT_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||p_request_key::text,10107));
  perform 1 from auth.users where id=p_provider_subject for share;
  perform 1 from auth.sessions where id=p_provider_session_id for share;
  perform 1 from public.tenants where id=p_tenant_id for share;
  perform 1 from public.subjects where id=p_subject_id for share;
  perform 1 from public.tenant_memberships where tenant_id=p_tenant_id and subject_id=p_subject_id for share;
  perform 1 from public.identity_sessions where id=p_session_id for share;
  perform public.read_patient_portal(p_tenant_id,p_subject_id,p_session_id,p_provider_subject,p_provider_session_id,p_verified_email,'account');
  -- Never guess between multiple pending cases.
  if (select count(*) from public.operations_cases c0 join public.handoff_attempts h0 on h0.case_id=c0.id
      where c0.tenant_id=p_tenant_id and c0.subject_id=p_subject_id and c0.state='ready_for_handoff' and h0.state='delivery_pending')<>1 then
    raise exception using errcode='55000',message='HANDOFF_NOT_READY'; end if;
  select c0.* into c from public.operations_cases c0 join public.handoff_attempts h0 on h0.case_id=c0.id
    where c0.tenant_id=p_tenant_id and c0.subject_id=p_subject_id and c0.state='ready_for_handoff' and h0.state='delivery_pending' for update of c0;
  select * into h from public.handoff_attempts where case_id=c.id and state='delivery_pending' for share;
  select * into a from public.handoff_authorisations where id=h.authorisation_id for share;
  perform pg_advisory_xact_lock(hashtextextended(a.destination_id::text,10106));
  perform 1 from identity_private.handoff_destinations where id=a.destination_id and version=a.destination_version for share;
  perform 1 from public.pilot_instrument_receipts where tenant_id=p_tenant_id and subject_id=p_subject_id for share;
  perform 1 from public.pilot_instrument_publications where id in
    (select publication_id from public.pilot_instrument_receipts where tenant_id=p_tenant_id and subject_id=p_subject_id) order by id for share;
  perform 1 from public.client_profiles where tenant_id=p_tenant_id and subject_id=p_subject_id for share;
  perform public.read_patient_portal(p_tenant_id,p_subject_id,p_session_id,p_provider_subject,p_provider_session_id,p_verified_email,'account');
  if not exists(select 1 from public.identity_sessions where id=p_session_id and status='active'
      and idle_expires_at>clock_timestamp() and absolute_expires_at>clock_timestamp())
    or not exists(select 1 from auth.sessions where id=p_provider_session_id and (not_after is null or not_after>clock_timestamp()))
    or not exists(select 1 from public.tenant_memberships where tenant_id=p_tenant_id and subject_id=p_subject_id and role='patient'
      and status='active' and valid_from<=clock_timestamp() and (expires_at is null or expires_at>clock_timestamp()))
    or a.destination_id is distinct from p_destination_id or a.destination_version is distinct from p_destination_version
    or a.destination_digest is distinct from p_destination_digest
    or not exists(select 1 from identity_private.handoff_destination_owners where destination_id=p_destination_id and tenant_id=p_tenant_id)
    or not identity_private.handoff_authorisation_current(a.id,c.id) or identity_private.handoff_payment_ready(c.id) is distinct from true
    or not exists(select 1 from public.operations_claims claim join public.operations_assignments ass on ass.id=claim.assignment_id
      join public.subjects owner on owner.id=claim.workforce_subject_id and owner.status='active'
      join public.tenant_memberships membership on membership.subject_id=owner.id and membership.tenant_id=c.tenant_id
        and membership.role='operations' and membership.status='active' and membership.valid_from<=clock_timestamp() and membership.expires_at>clock_timestamp()
      where claim.id=h.claim_id and claim.released_at is null and ass.revoked_at is null and ass.starts_at<=clock_timestamp() and ass.expires_at>clock_timestamp()) then
    raise exception using errcode='55000',message='HANDOFF_NOT_READY'; end if;
  digest:=encode(extensions.digest(convert_to(jsonb_build_array(c.id,h.id,p_destination_id,p_destination_version,p_destination_digest)::text,'UTF8'),'sha256'),'hex');
  select * into prior from identity_private.handoff_boundary_events where tenant_id=p_tenant_id and request_key=p_request_key;
  if prior.id is not null then
    if prior.kind<>'portal_link_issued' or prior.actor_subject_id<>p_subject_id or prior.command_sha256<>digest then
      raise exception using errcode='40001',message='HANDOFF_CONFLICT'; end if;
    if prior.expires_at<=clock_timestamp() then raise exception using errcode='55000',message='HANDOFF_NOT_READY'; end if;
    return prior.reference_id;
  end if;
  if exists(select 1 from identity_private.handoff_boundary_events where kind='portal_link_issued' and reference_id=h.id) then
    raise exception using errcode='40001',message='HANDOFF_CONFLICT'; end if;
  insert into identity_private.handoff_boundary_events(tenant_id,actor_subject_id,request_key,command_sha256,kind,reference_id,expires_at)
  values(p_tenant_id,p_subject_id,p_request_key,digest,'portal_link_issued',h.id,clock_timestamp()+interval '5 minutes');
  return h.id;
end;$$;

revoke all on function public.approve_portal_handoff_destination(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.verify_operations_handoff_evidence(uuid,uuid,text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.issue_patient_handoff_link(uuid,uuid,uuid,uuid,uuid,text,uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.approve_portal_handoff_destination(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,text,uuid,uuid) to service_role;
grant execute on function public.verify_operations_handoff_evidence(uuid,uuid,text,uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.issue_patient_handoff_link(uuid,uuid,uuid,uuid,uuid,text,uuid,integer,text,uuid) to service_role;
