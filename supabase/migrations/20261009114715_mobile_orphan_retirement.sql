-- TD-066 native reservation/quarantine foundation. No automatic job or provider deletion.
begin;
create table identity_private.mobile_orphan_retirements (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 email_invitation_id uuid not null unique references public.identity_invitations(id),
 mobile_invitation_id uuid not null references identity_private.mobile_invitations(id),
 invitation_version integer not null,
 claim_id uuid not null,
 subject_id uuid not null unique references public.subjects(id),
 provider_subject_id uuid not null unique,
 contact_digest text not null check(contact_digest ~ '^[a-f0-9]{64}$'),
 request_key uuid not null,
 actor_subject_id uuid not null references public.subjects(id),
 state text not null default 'reserved' check(state in('reserved','uncertain','held','copies_pending','completed')),
 reserved_at timestamptz not null default clock_timestamp(),
 provider_absent_at timestamptz,
 unique(tenant_id,request_key),
 check((state in('copies_pending','completed'))=(provider_absent_at is not null))
);
create table identity_private.mobile_orphan_retirement_events (
 operation_id uuid not null references identity_private.mobile_orphan_retirements(id),
 event text not null check(event in('reserved','uncertain','held','copies_pending','completed')),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(operation_id,event)
);
alter table identity_private.mobile_orphan_retirements enable row level security;
alter table identity_private.mobile_orphan_retirements force row level security;
alter table identity_private.mobile_orphan_retirement_events enable row level security;
alter table identity_private.mobile_orphan_retirement_events force row level security;
revoke all on identity_private.mobile_orphan_retirements,identity_private.mobile_orphan_retirement_events
 from public,anon,authenticated,service_role;
create trigger mobile_orphan_events_immutable before update or delete
 on identity_private.mobile_orphan_retirement_events for each row
 execute function audit_private.reject_append_only_mutation();
create table identity_private.mobile_orphan_reissues (
 operation_id uuid primary key references identity_private.mobile_orphan_retirements(id),
 invitation_id uuid not null unique references identity_private.mobile_invitations(id),
 actor_subject_id uuid not null references public.subjects(id),
 review_reference uuid not null,
 request_key uuid not null unique,
 recorded_at timestamptz not null default clock_timestamp()
);
alter table identity_private.mobile_orphan_reissues enable row level security;
alter table identity_private.mobile_orphan_reissues force row level security;
revoke all on identity_private.mobile_orphan_reissues from public,anon,authenticated,service_role;
create trigger mobile_orphan_reissue_immutable before update or delete
 on identity_private.mobile_orphan_reissues for each row execute function audit_private.reject_append_only_mutation();

create function identity_private.guard_mobile_orphan_operation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' or (to_jsonb(new)-array['state','provider_absent_at'])
  is distinct from (to_jsonb(old)-array['state','provider_absent_at'])
  or not((old.state='reserved' and new.state in('uncertain','held'))
   or (old.state='uncertain' and new.state in('held','copies_pending'))
   or (old.state='copies_pending' and new.state='completed')) then
  raise exception using errcode='PT409',message='MOBILE_ORPHAN_STATE_CONFLICT';end if;
 return new;
end $$;
create trigger mobile_orphan_operation_guard before update or delete
 on identity_private.mobile_orphan_retirements for each row
 execute function identity_private.guard_mobile_orphan_operation();

-- Conservative FK-based domain inventory: unknown/new subject-associated records veto deletion.
-- Only the exact immutable creation receipt, provider mapping and unverified contact are exempt.
create function identity_private.mobile_orphan_snapshot(p_tenant uuid,p_invitation uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare r identity_private.mobile_identity_creation_receipts; x identity_private.mobile_email_exchanges;
 m identity_private.mobile_invitations; e public.identity_invitations; c identity_private.mobile_invitation_claims;
 u auth.users; domain_exists boolean:=false; present boolean; fk record; subject_status text;
begin
 select * into r from identity_private.mobile_identity_creation_receipts where email_invitation_id=p_invitation;
 select * into x from identity_private.mobile_email_exchanges where email_invitation_id=p_invitation;
 select * into m from identity_private.mobile_invitations where id=x.mobile_invitation_id and tenant_id=p_tenant;
 select * into e from public.identity_invitations where id=p_invitation and tenant_id=p_tenant;
 select * into c from identity_private.mobile_invitation_claims where id=x.claim_id;
 if r.subject_id is null or m.id is null or e.id is null or c.id is null
  or c.invitation_id<>m.id or c.tenant_id<>p_tenant or x.invitation_version<>m.version
  or (c.email_digest is distinct from e.contact_digest and not(c.email_digest is null
   and m.bound_email_digest is null and m.status in('expired','revoked','declined')
   and not exists(select 1 from identity_private.mobile_invitation_contacts where invitation_id=m.id)
   and (case when m.status='expired' then m.expires_at else m.terminal_at end)+interval '30 days'<=clock_timestamp()))
  or e.intended_role<>'patient' or m.issued_at is null
  or e.created_at>r.recorded_at or r.recorded_at>(case when m.status='expired' then m.expires_at else m.terminal_at end)
  or e.provider_subject is distinct from r.provider_subject_id::text then return null;end if;
 select * into u from auth.users where id=r.provider_subject_id;
 select status into subject_status from public.subjects where id=r.subject_id;
 if u.id is not null and (u.email is null or coalesce(u.is_anonymous,false)
  or encode(sha256(convert_to(lower(btrim(u.email)),'UTF8')),'hex')<>e.contact_digest)
 then return null;end if;
 for fk in select con.conrelid::regclass as relation,a.attname as field
  from pg_constraint con join pg_attribute a on a.attrelid=con.conrelid and a.attnum=con.conkey[1]
  where con.contype='f' and con.confrelid='public.subjects'::regclass
   and cardinality(con.conkey)=1 and con.conrelid not in(
    'public.subject_contacts'::regclass,'public.external_identities'::regclass,
    'identity_private.mobile_identity_creation_receipts'::regclass,
    'identity_private.mobile_orphan_retirements'::regclass)
 loop
  execute format('select exists(select 1 from %s where %I=$1)',fk.relation,fk.field)
   into present using r.subject_id;
  domain_exists:=domain_exists or present;
 end loop;
 return jsonb_build_object(
  'tenantId',p_tenant,'invitationId',m.id,'invitationVersion',x.invitation_version,'currentVersion',m.version,
  'claimId',c.id,'emailInvitationId',e.id,'subjectId',r.subject_id,'providerSubjectId',r.provider_subject_id,
  'contactDigest',e.contact_digest,'terminalState',case when m.status='converted' then 'converted'
   when m.status in('expired','revoked','declined') then m.status else 'active' end,
  'terminalAt',case when m.status='expired' then least(m.expires_at,m.terminal_at) else m.terminal_at end,
  'observedAt',clock_timestamp(),'creationProvenance','mobile-created',
  'linkedTenantId',m.tenant_id,'linkedInvitationId',x.mobile_invitation_id,'linkedClaimId',x.claim_id,
  'linkedEmailInvitationId',r.email_invitation_id,'linkedSubjectId',r.subject_id,
  'linkedProviderSubjectId',r.provider_subject_id,'linkedContactDigest',e.contact_digest,
  'converted',m.status='converted' or u.email_confirmed_at is not null or u.phone_confirmed_at is not null,
  'emailAccepted',e.status='accepted','liveClaim',c.state='active' and c.expires_at>clock_timestamp(),
  'liveProviderSession',exists(select 1 from auth.sessions where user_id=r.provider_subject_id),
  'activeMembership',exists(select 1 from public.tenant_memberships where subject_id=r.subject_id),
  'anotherInvitation',exists(select 1 from public.identity_invitations where id<>e.id
   and (provider_subject=r.provider_subject_id::text or contact_digest=e.contact_digest)),
  'crossTenantAssociation',exists(select 1 from public.tenant_memberships
   where subject_id=r.subject_id and tenant_id<>p_tenant),
  'profileExists',exists(select 1 from public.client_profiles where subject_id=r.subject_id),
  'domainRecordsExist',domain_exists or subject_status is distinct from 'active'
   or exists(select 1 from public.subject_contacts where subject_id=r.subject_id and status='verified')
   or exists(select 1 from public.external_identities where subject_id=r.subject_id
    and (provider<>'supabase' or provider_subject<>r.provider_subject_id::text))
   or exists(select 1 from identity_private.mobile_identity_creation_receipts
    where subject_id=r.subject_id and email_invitation_id<>e.id),
  'held',exists(select 1 from public.record_holds where subject_id=r.subject_id and status='active'),
  'providerOutcomeUncertain',x.state<>'delivered' or e.delivery_status<>'delivered');
end $$;

create function identity_private.mobile_orphan_candidate(s jsonb) returns boolean
language sql volatile set search_path='' as $$
 select s is not null and s->>'terminalState' in('expired','revoked','declined')
  and (s->>'terminalAt')::timestamptz+interval '30 days'<=clock_timestamp()
  and not exists(select 1 from unnest(array['converted','emailAccepted','liveClaim','liveProviderSession',
   'activeMembership','anotherInvitation','crossTenantAssociation','profileExists','domainRecordsExist',
   'held','providerOutcomeUncertain']) flag where coalesce((s->>flag)::boolean,true));
$$;

-- Confirmation and session creation serialize on the exact Auth user row before checking quarantine.
create function identity_private.guard_mobile_orphan_auth() returns trigger
language plpgsql volatile security definer set search_path='' as $$
declare provider_id uuid;
begin
 if tg_table_name='users' then provider_id:=new.id;else provider_id:=new.user_id;end if;
 perform 1 from auth.users where id=provider_id for share;
 if exists(select 1 from identity_private.mobile_orphan_retirements where provider_subject_id=provider_id
  and state in('reserved','uncertain','copies_pending')) then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_QUARANTINED';end if;
 return new;
end $$;
create trigger mobile_orphan_confirmation_guard before update on auth.users
 for each row execute function identity_private.guard_mobile_orphan_auth();
create trigger mobile_orphan_session_guard before insert or update on auth.sessions
 for each row execute function identity_private.guard_mobile_orphan_auth();

-- Domain INSERT/UPDATE cannot attach new records after the authoritative reservation commits.
create function identity_private.guard_mobile_orphan_reference() returns trigger
language plpgsql volatile security definer set search_path='' as $$
declare field text; target uuid;
begin
 foreach field in array tg_argv loop
  target:=(to_jsonb(new)->>field)::uuid;
  perform 1 from public.subjects where id=target for share;
  if exists(select 1 from identity_private.mobile_orphan_retirements where subject_id=target
   and state in('reserved','uncertain','copies_pending','completed'))
   or (tg_op='UPDATE' and exists(select 1 from identity_private.mobile_orphan_retirements
    where subject_id=(to_jsonb(old)->>field)::uuid
     and state in('reserved','uncertain','copies_pending','completed'))) then
   raise exception using errcode='42501',message='MOBILE_ORPHAN_QUARANTINED';end if;
 end loop;
 return new;
end $$;
do $$declare relation record;begin
 for relation in select con.conrelid::regclass as name,string_agg(distinct quote_literal(a.attname),',') as fields
  from pg_constraint con join pg_attribute a on a.attrelid=con.conrelid and a.attnum=con.conkey[1]
  where con.contype='f' and con.confrelid='public.subjects'::regclass and cardinality(con.conkey)=1
   and con.conrelid<>'identity_private.mobile_orphan_retirements'::regclass group by con.conrelid
 loop execute format('create trigger mobile_orphan_reference_guard before insert or update on %s
  for each row execute function identity_private.guard_mobile_orphan_reference(%s)',relation.name,relation.fields);
 end loop;
end $$;

create function identity_private.assert_mobile_orphan_guard_coverage() returns void
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from pg_constraint con join pg_attribute a
  on a.attrelid=con.conrelid and a.attnum=con.conkey[1]
  where con.contype='f' and con.confrelid='public.subjects'::regclass
   and cardinality(con.conkey)=1 and con.conrelid<>'identity_private.mobile_orphan_retirements'::regclass
   and not exists(select 1 from pg_trigger t where t.tgrelid=con.conrelid
    and t.tgname='mobile_orphan_reference_guard' and t.tgenabled='O'
    and t.tgfoid='identity_private.guard_mobile_orphan_reference()'::regprocedure
    and a.attname=any(string_to_array(encode(t.tgargs,'escape'),E'\\000')))) then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_GUARD_COVERAGE_REQUIRED';end if;
end $$;

create function public.reserve_mobile_orphan_retirement(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_email_invitation_id uuid,p_request_key uuid)
 returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare op identity_private.mobile_orphan_retirements; snapshot jsonb; receipt identity_private.mobile_identity_creation_receipts;
 dispatch boolean:=false;
begin
 if p_request_key is null then raise exception using errcode='42501',message='MOBILE_ORPHAN_REJECTED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id);
 perform identity_private.assert_mobile_orphan_guard_coverage();
 if not exists(select 1 from auth.mfa_amr_claims where session_id=p_provider_session_id
  and authentication_method='totp' and updated_at<=clock_timestamp()
  and updated_at>clock_timestamp()-interval '5 minutes') then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_REJECTED';end if;
 select * into op from identity_private.mobile_orphan_retirements where email_invitation_id=p_email_invitation_id for update;
 if op.id is not null and (op.tenant_id<>p_tenant_id or op.request_key<>p_request_key) then
  raise exception using errcode='PT409',message='MOBILE_ORPHAN_STATE_CONFLICT';end if;
 select * into receipt from identity_private.mobile_identity_creation_receipts where email_invitation_id=p_email_invitation_id;
 if receipt.subject_id is null then return null;end if;
 perform 1 from auth.users where id=receipt.provider_subject_id for update;
 perform 1 from public.subjects where id=receipt.subject_id for update;
 snapshot:=identity_private.mobile_orphan_snapshot(p_tenant_id,p_email_invitation_id);
 if op.id is null then
  if not coalesce(identity_private.mobile_orphan_candidate(snapshot),false) then return null;end if;
  insert into identity_private.mobile_orphan_retirements(tenant_id,email_invitation_id,mobile_invitation_id,
   invitation_version,claim_id,subject_id,provider_subject_id,contact_digest,request_key,actor_subject_id)
  values(p_tenant_id,p_email_invitation_id,(snapshot->>'invitationId')::uuid,(snapshot->>'invitationVersion')::integer,
   (snapshot->>'claimId')::uuid,receipt.subject_id,receipt.provider_subject_id,snapshot->>'contactDigest',p_request_key,p_subject_id)
  returning * into op;
  insert into identity_private.mobile_orphan_retirement_events(operation_id,event) values(op.id,'reserved');
  dispatch:=exists(select 1 from auth.users where id=receipt.provider_subject_id);
  if not dispatch then
   update identity_private.mobile_orphan_retirements set state='uncertain' where id=op.id returning * into op;
   insert into identity_private.mobile_orphan_retirement_events(operation_id,event) values(op.id,'uncertain');
  end if;
 end if;
 if op.state='held' then return null;end if;
 return jsonb_build_object('operationId',op.id,'tenantId',op.tenant_id,'emailInvitationId',op.email_invitation_id,
  'requestKey',op.request_key,'providerSubjectId',op.provider_subject_id,'contactDigest',op.contact_digest,
  'dispatch',dispatch,'state',op.state,'snapshot',snapshot);
end $$;

-- All continuation steps recheck real operator authority; no operation-ID bearer API.
create function public.advance_mobile_orphan_retirement(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_operation_id uuid,
 p_action text,p_target_provider_subject uuid default null)
 returns text language plpgsql volatile security definer set search_path='' as $$
declare op identity_private.mobile_orphan_retirements; snapshot jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id);
 perform identity_private.assert_mobile_orphan_guard_coverage();
 select * into op from identity_private.mobile_orphan_retirements where id=p_operation_id and tenant_id=p_tenant_id for update;
 if not exists(select 1 from auth.mfa_amr_claims where session_id=p_provider_session_id
  and authentication_method='totp' and updated_at<=clock_timestamp()
  and updated_at>clock_timestamp()-interval '5 minutes') then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_REJECTED';end if;
 if op.id is null then raise exception using errcode='42501',message='MOBILE_ORPHAN_REJECTED';end if;
 if p_action='uncertain' and op.state='reserved' then
  if not coalesce(identity_private.mobile_orphan_candidate(
   identity_private.mobile_orphan_snapshot(p_tenant_id,op.email_invitation_id)),false) then
   raise exception using errcode='42501',message='MOBILE_ORPHAN_REJECTED';end if;
  update identity_private.mobile_orphan_retirements set state='uncertain' where id=op.id;
 elsif p_action='held' and op.state in('reserved','uncertain') then
  update identity_private.mobile_orphan_retirements set state='held' where id=op.id;
 elsif p_action='provider_absent' then
  if p_target_provider_subject is distinct from op.provider_subject_id then
   raise exception using errcode='42501',message='MOBILE_ORPHAN_REJECTED';end if;
  if op.state='copies_pending' then return 'copies_pending';end if;
  perform 1 from auth.users where id=op.provider_subject_id for update;
  perform 1 from public.subjects where id=op.subject_id for update;
  snapshot:=identity_private.mobile_orphan_snapshot(p_tenant_id,op.email_invitation_id);
  if op.state<>'uncertain' or exists(select 1 from auth.users where id=op.provider_subject_id)
   or not coalesce(identity_private.mobile_orphan_candidate(snapshot),false) then
   raise exception using errcode='42501',message='MOBILE_ORPHAN_REJECTED';end if;
  delete from public.subject_contacts where subject_id=op.subject_id;
  delete from identity_private.mobile_invitation_contacts where invitation_id=op.mobile_invitation_id;
  update identity_private.mobile_invitations set bound_email_digest=null
   where id=op.mobile_invitation_id and bound_email_digest is not null;
  update public.subjects set status='erased',updated_at=clock_timestamp() where id=op.subject_id;
  update identity_private.mobile_orphan_retirements set state='copies_pending',provider_absent_at=clock_timestamp() where id=op.id;
 else
  if not(p_action='uncertain' and op.state='uncertain') and not(p_action='held' and op.state='held') then
   raise exception using errcode='PT409',message='MOBILE_ORPHAN_STATE_CONFLICT';end if;
 end if;
 insert into identity_private.mobile_orphan_retirement_events(operation_id,event)
  select id,state from identity_private.mobile_orphan_retirements where id=op.id on conflict do nothing;
 return (select state from identity_private.mobile_orphan_retirements where id=op.id);
end $$;

do $$declare f record;begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='identity_private'::regnamespace
  and proname in('guard_mobile_orphan_operation','mobile_orphan_snapshot','mobile_orphan_candidate',
   'guard_mobile_orphan_auth','guard_mobile_orphan_reference','assert_mobile_orphan_guard_coverage') loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end $$;
revoke all on function public.reserve_mobile_orphan_retirement(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.advance_mobile_orphan_retirement(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid)
 from public,anon,authenticated;
grant execute on function public.reserve_mobile_orphan_retirement(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.advance_mobile_orphan_retirement(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid) to service_role;

-- A reviewed reissue creates a NEW draft. It never reuses old claims, relinks an account,
-- dispatches email/SMS or waives the existing review and spend requirements.
create function public.prepare_mobile_orphan_reissue(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_operation_id uuid,
 p_review_reference uuid,p_command jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare op identity_private.mobile_orphan_retirements; existing identity_private.mobile_orphan_reissues; result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id);
 perform identity_private.assert_mobile_orphan_guard_coverage();
 if p_review_reference is null or p_command->>'action' is distinct from 'create'
  or not exists(select 1 from auth.mfa_amr_claims where session_id=p_provider_session_id
   and authentication_method='totp' and updated_at<=clock_timestamp()
   and updated_at>clock_timestamp()-interval '5 minutes') then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_REISSUE_REJECTED';end if;
 select * into op from identity_private.mobile_orphan_retirements where id=p_operation_id and tenant_id=p_tenant_id for update;
 if op.id is null or op.state not in('copies_pending','completed')
  or exists(select 1 from auth.users where id=op.provider_subject_id)
  or not exists(select 1 from public.subjects where id=op.subject_id and status='erased')
  or exists(select 1 from public.subject_contacts where subject_id=op.subject_id)
  or exists(select 1 from public.record_holds where subject_id=op.subject_id and status='active') then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_REISSUE_REJECTED';end if;
 select * into existing from identity_private.mobile_orphan_reissues where operation_id=op.id;
 if existing.operation_id is not null and (existing.request_key is distinct from (p_command->>'requestKey')::uuid
  or existing.review_reference<>p_review_reference or existing.actor_subject_id<>p_subject_id) then
  raise exception using errcode='PT409',message='MOBILE_ORPHAN_REISSUE_CONFLICT';end if;
 result:=public.command_mobile_invitation_register(p_provider_subject,p_provider_session_id,p_verified_email,
  p_session_id,p_subject_id,p_tenant_id,p_command);
 if existing.operation_id is null then
  insert into identity_private.mobile_orphan_reissues(operation_id,invitation_id,actor_subject_id,review_reference,request_key)
   values(op.id,(result->>'invitationId')::uuid,p_subject_id,p_review_reference,(p_command->>'requestKey')::uuid);
 elsif existing.invitation_id is distinct from (result->>'invitationId')::uuid then
  raise exception using errcode='PT409',message='MOBILE_ORPHAN_REISSUE_CONFLICT';end if;
 return result;
end $$;
revoke all on function public.prepare_mobile_orphan_reissue(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_mobile_orphan_reissue(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid,jsonb) to service_role;

-- Offline restore barrier only. Current independently retained dispositions must be supplied
-- before any recovered database is released. This NEVER connects to or restores provider Auth.
create function identity_private.reconcile_restored_mobile_orphans(p_current jsonb) returns integer
language plpgsql volatile security definer set search_path='' as $$
declare item jsonb; receipt identity_private.mobile_identity_creation_receipts;
 target uuid; applied integer:=0; fk record; associated boolean;
begin
 if exists(select 1 from pg_namespace where nspname='auth')
  or exists(select 1 from public.tenants where status='active')
  or exists(select 1 from public.identity_sessions where status='active')
  or exists(select 1 from public.tenant_memberships where status='active')
  or exists(select 1 from public.access_assignments where status='active') then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_OFFLINE_RESTORE_REQUIRED';end if;
 if p_current is null or jsonb_typeof(p_current)<>'object'
  or (select count(*) from jsonb_object_keys(p_current))<>2
  or not(p_current ? 'observedAt' and p_current ? 'retirements')
  or p_current->>'observedAt' is null
  or jsonb_typeof(p_current->'retirements')<>'array'
  or (p_current->>'observedAt')::timestamptz>clock_timestamp()
  or (p_current->>'observedAt')::timestamptz<clock_timestamp()-interval '1 hour'
  or jsonb_array_length(p_current->'retirements')>10000 then
  raise exception using errcode='42501',message='MOBILE_ORPHAN_RESTORE_MANIFEST_REJECTED';end if;
 for item in select value from jsonb_array_elements(p_current->'retirements') loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>7
   or not(item ?& array['operationId','tenantId','emailInvitationId','subjectId','providerSubjectId','contactDigest','providerAbsentAt'])
   or (item->>'operationId')::uuid is null or (item->>'tenantId')::uuid is null
   or (item->>'subjectId')::uuid is null or (item->>'emailInvitationId')::uuid is null
   or (item->>'providerSubjectId')::uuid is null
   or coalesce(item->>'contactDigest','')!~'^[a-f0-9]{64}$'
   or (item->>'providerAbsentAt')::timestamptz is null
   or (item->>'providerAbsentAt')::timestamptz>(p_current->>'observedAt')::timestamptz then
   raise exception using errcode='42501',message='MOBILE_ORPHAN_RESTORE_MANIFEST_REJECTED';end if;
  target:=(item->>'subjectId')::uuid;
  perform 1 from public.subjects where id=target for update;
  if not found then continue;end if;
  select * into receipt from identity_private.mobile_identity_creation_receipts
   where email_invitation_id=(item->>'emailInvitationId')::uuid;
  if receipt.subject_id is distinct from target
   or receipt.provider_subject_id is distinct from (item->>'providerSubjectId')::uuid
   or not exists(select 1 from public.identity_invitations where id=receipt.email_invitation_id
    and tenant_id=(item->>'tenantId')::uuid and contact_digest=item->>'contactDigest'
    and provider_subject=receipt.provider_subject_id::text and status<>'accepted')
   or exists(select 1 from public.subject_contacts where subject_id=target and status='verified')
   or exists(select 1 from public.record_holds where subject_id=target and status='active') then
   raise exception using errcode='42501',message='MOBILE_ORPHAN_RESTORE_PRESERVATION_REQUIRED';end if;
  for fk in select con.conrelid::regclass relation,a.attname field from pg_constraint con
   join pg_attribute a on a.attrelid=con.conrelid and a.attnum=con.conkey[1]
   where con.contype='f' and con.confrelid='public.subjects'::regclass and cardinality(con.conkey)=1
    and con.conrelid not in('public.subject_contacts'::regclass,'public.external_identities'::regclass,
     'identity_private.mobile_identity_creation_receipts'::regclass,'identity_private.mobile_orphan_retirements'::regclass)
  loop
   execute format('select exists(select 1 from %s where %I=$1)',fk.relation,fk.field) into associated using target;
   if associated then raise exception using errcode='42501',message='MOBILE_ORPHAN_RESTORE_PRESERVATION_REQUIRED';end if;
  end loop;
  delete from public.subject_contacts where subject_id=target;
  delete from identity_private.mobile_invitation_contacts where invitation_id in(
   select mobile_invitation_id from identity_private.mobile_email_exchanges where email_invitation_id=receipt.email_invitation_id);
  update public.subjects set status='erased',updated_at=clock_timestamp() where id=target and status<>'erased';
  applied:=applied+1;
 end loop;
 return applied;
end $$;
revoke all on function identity_private.reconcile_restored_mobile_orphans(jsonb) from public,anon,authenticated,service_role;
commit;
