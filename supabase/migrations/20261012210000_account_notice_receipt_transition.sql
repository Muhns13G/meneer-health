-- No compatibility records or publications are seeded. Custodian publication is separately approved.
-- This registry names individual genuine receipts; it never manufactures acceptance of new text.
create table identity_private.account_notice_receipt_transitions (
  receipt_id uuid not null,
  tenant_id uuid not null,
  subject_id uuid not null,
  current_publication_id uuid not null references public.pilot_instrument_publications(id),
  approval_reference text not null check (length(btrim(approval_reference)) between 1 and 128),
  approved_by_subject_id uuid not null references public.subjects(id),
  approved_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  primary key(receipt_id,current_publication_id),
  foreign key(receipt_id,tenant_id,subject_id) references public.pilot_instrument_receipts(id,tenant_id,subject_id),
  check(expires_at>approved_at),
  check(revoked_at is null or revoked_at>=approved_at)
);
alter table identity_private.account_notice_receipt_transitions enable row level security;
alter table identity_private.account_notice_receipt_transitions force row level security;
revoke all on identity_private.account_notice_receipt_transitions from public,anon,authenticated,service_role;
create index account_notice_transitions_subject_idx on identity_private.account_notice_receipt_transitions(tenant_id,subject_id);
create trigger mobile_orphan_reference_guard before insert or update
on identity_private.account_notice_receipt_transitions for each row
execute function identity_private.guard_mobile_orphan_reference('subject_id','approved_by_subject_id');
select identity_private.assert_mobile_orphan_guard_coverage();

create function identity_private.guard_account_notice_transition() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then raise exception using errcode='55000',message='NOTICE_TRANSITION_IMMUTABLE'; end if;
  if tg_op='UPDATE' then
    if (to_jsonb(new)-'revoked_at') is distinct from (to_jsonb(old)-'revoked_at')
      or old.revoked_at is not null or new.revoked_at is null then
      raise exception using errcode='55000',message='NOTICE_TRANSITION_IMMUTABLE';
    end if;
    return new;
  end if;
  if new.approved_at>clock_timestamp() or new.revoked_at is not null or not exists (
    select 1 from public.pilot_instrument_receipts r
    join public.pilot_instrument_publications prior on prior.id=r.publication_id
    join public.pilot_instrument_publications current on current.id=new.current_publication_id
    join public.client_profiles profile on profile.tenant_id=r.tenant_id and profile.subject_id=r.subject_id
    join identity_private.pilot_activation_commands activation on activation.profile_id=profile.id
    join public.identity_invitations invitation on invitation.id=activation.invitation_id
    where r.id=new.receipt_id and r.tenant_id=new.tenant_id and r.subject_id=new.subject_id
      and prior.instrument_id in ('pilot-account-terms','pilot-privacy-notice')
      and prior.instrument_version='1.0' and current.instrument_version='1.1'
      and prior.instrument_id=current.instrument_id and prior.locale='en-ZA' and current.locale=prior.locale
      and prior.status='superseded' and current.status='published'
      and prior.published_at<=r.recorded_at and prior.effective_at<=r.recorded_at
      and prior.retired_at>=r.recorded_at
      and (prior.expires_at is null or prior.expires_at>clock_timestamp())
      and current.published_at<=new.approved_at and current.effective_at<=new.approved_at
      and (current.expires_at is null or current.expires_at>clock_timestamp())
      and r.recorded_at<current.effective_at and profile.created_at<current.effective_at
      and activation.recorded_at<=r.recorded_at and activation.request_key::text=r.correlation_id
      and profile.status='active'
      and invitation.tenant_id=r.tenant_id and invitation.accepted_by_subject_id=r.subject_id
      and invitation.status='accepted' and invitation.delivery_status='delivered'
      and invitation.intended_role='patient' and invitation.admission_source='staff'
      and invitation.accepted_at<current.effective_at
      and r.content_sha256=prior.content_sha256 and r.locale=prior.locale
      and r.instrument_version=prior.instrument_version and r.instrument_id=prior.instrument_id
      and r.action=case when prior.instrument_id='pilot-account-terms' then 'accepted' else 'acknowledged' end
      and not exists(select 1 from public.pilot_instrument_receipt_events e where e.receipt_id=r.id)
  ) then raise exception using errcode='42501',message='NOTICE_TRANSITION_REJECTED'; end if;
  return new;
end $$;
revoke all on function identity_private.guard_account_notice_transition() from public,anon,authenticated,service_role;
create trigger account_notice_transition_guard before insert or update or delete
on identity_private.account_notice_receipt_transitions for each row execute function identity_private.guard_account_notice_transition();

-- Returns the actual accepted publication, version, hash and body, never a substituted receipt.
create function identity_private.account_instrument_evidence(p_tenant_id uuid,p_subject_id uuid)
returns jsonb language sql volatile set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'publicationId',e.id,'instrumentId',e.instrument_id,'version',e.instrument_version,
  'locale',e.locale,'contentHash',e.content_sha256,'body',e.document_body,
  'effectiveAt',e.effective_at,'action',e.action,'recordedAt',e.recorded_at
) order by e.instrument_id),'[]'::jsonb)
from public.pilot_instrument_publications current
join lateral (
  select prior.*,r.action,r.recorded_at
  from public.pilot_instrument_receipts r
  join public.pilot_instrument_publications prior on prior.id=r.publication_id
  where r.tenant_id=p_tenant_id and r.subject_id=p_subject_id
    and r.instrument_id=current.instrument_id and r.locale=current.locale
    and r.content_sha256=prior.content_sha256 and r.instrument_version=prior.instrument_version
    and r.instrument_id=prior.instrument_id and r.locale=prior.locale
    and r.action=case when current.instrument_id='pilot-account-terms' then 'accepted' else 'acknowledged' end
    and not exists(select 1 from public.pilot_instrument_receipt_events ev where ev.receipt_id=r.id)
    and (prior.id=current.id or (
      prior.instrument_version='1.0' and current.instrument_version='1.1' and prior.status='superseded'
      and (prior.expires_at is null or prior.expires_at>clock_timestamp())
      and r.recorded_at<current.effective_at
      and exists(select 1 from identity_private.account_notice_receipt_transitions transition
        join public.client_profiles profile on profile.tenant_id=transition.tenant_id and profile.subject_id=transition.subject_id
        join identity_private.pilot_activation_commands activation on activation.profile_id=profile.id
        join public.identity_invitations invitation on invitation.id=activation.invitation_id
        where transition.receipt_id=r.id and transition.current_publication_id=current.id
          and transition.tenant_id=p_tenant_id and transition.subject_id=p_subject_id
          and transition.approved_at<=clock_timestamp() and transition.expires_at>clock_timestamp() and transition.revoked_at is null
          and profile.status='active' and profile.created_at<current.effective_at
          and activation.recorded_at<=r.recorded_at and activation.request_key::text=r.correlation_id
          and invitation.tenant_id=p_tenant_id
          and invitation.accepted_by_subject_id=p_subject_id and invitation.status='accepted'
          and invitation.delivery_status='delivered' and invitation.intended_role='patient'
          and invitation.admission_source='staff' and invitation.accepted_at<current.effective_at)))
  order by (prior.id=current.id) desc,r.recorded_at desc,r.id desc limit 1
) e on true
where current.instrument_id in ('pilot-account-terms','pilot-privacy-notice') and current.locale='en-ZA'
  and current.status='published' and current.published_at<=clock_timestamp() and current.effective_at<=clock_timestamp()
  and (current.expires_at is null or current.expires_at>clock_timestamp());
$$;
revoke all on function identity_private.account_instrument_evidence(uuid,uuid) from public,anon,authenticated,service_role;

create function public.has_pilot_account_evidence(p_tenant_id uuid,p_subject_id uuid)
returns boolean language sql volatile security definer set search_path='' as $$
select exists(select 1 from public.client_profiles p
  join public.subjects s on s.id=p.subject_id and s.status='active'
  join public.tenants t on t.id=p.tenant_id and t.status='active'
  where p.tenant_id=p_tenant_id and p.subject_id=p_subject_id and p.status='active')
  and coalesce((select l.event_type from public.pilot_account_lifecycle_events l
    where l.tenant_id=p_tenant_id and l.subject_id=p_subject_id order by l.recorded_at desc,l.id desc limit 1)='activated',false)
  and jsonb_array_length(identity_private.account_instrument_evidence(p_tenant_id,p_subject_id))=2;
$$;
revoke all on function public.has_pilot_account_evidence(uuid,uuid) from public,anon,authenticated;
grant execute on function public.has_pilot_account_evidence(uuid,uuid) to service_role;

-- Replace only the instrument-evidence blocks. Preserve every surrounding authority predicate
-- and all existing owner/ACL/security/search_path/volatility metadata; abort on source drift.
do $patch$
declare target regprocedure; definition text; updated text; start_at integer; end_at integer;
  before_security jsonb; after_security jsonb;
begin
  foreach target in array array[
    'public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text)'::regprocedure,
    'identity_private.operations_readiness(uuid)'::regprocedure
  ] loop
    select pg_get_functiondef(oid),jsonb_build_array(proowner,proacl,prosecdef,proconfig,provolatile)
      into definition,before_security from pg_proc where oid=target;
    if target='public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text)'::regprocedure then
      start_at:=strpos(definition,'  select jsonb_agg(jsonb_build_object(');
      end_at:=strpos(definition,'  if instruments is null');
      if start_at=0 or end_at<=start_at or strpos(substring(definition from start_at for end_at-start_at),'join lateral')=0
        or strpos(substring(definition from start_at for end_at-start_at),'pilot_instrument_receipt_events')=0 then
        raise exception 'NOTICE_TRANSITION_SOURCE_DRIFT'; end if;
      updated:=substring(definition from 1 for start_at-1)||
        E'  instruments := identity_private.account_instrument_evidence(p_tenant_id,p_subject_id);\n'||substring(definition from end_at);
    else
      start_at:=strpos(definition,E'  ''instrumentsCurrent'',not exists(');
      end_at:=strpos(definition,E'  ''authorisationCurrent'',exists(');
      if start_at=0 or end_at<=start_at or strpos(substring(definition from start_at for end_at-start_at),'pilot_instrument_receipt_events')=0 then
        raise exception 'NOTICE_TRANSITION_SOURCE_DRIFT'; end if;
      updated:=substring(definition from 1 for start_at-1)||
        E'  ''instrumentsCurrent'',jsonb_array_length(identity_private.account_instrument_evidence(c.tenant_id,c.subject_id))=2,\n'||substring(definition from end_at);
    end if;
    execute updated;
    select jsonb_build_array(proowner,proacl,prosecdef,proconfig,provolatile) into after_security from pg_proc where oid=target;
    if before_security is distinct from after_security then raise exception 'NOTICE_TRANSITION_SECURITY_DRIFT'; end if;
  end loop;
end $patch$;
