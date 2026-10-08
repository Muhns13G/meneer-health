-- 14.7: bounded mobile claim -> managed email invitation -> existing atomic activation.
-- CLI-generated file ordered after the previously committed future-dated 14.6 migration.
begin;
create table identity_private.mobile_email_exchanges (
 mobile_invitation_id uuid not null references identity_private.mobile_invitations(id),
 invitation_version integer not null,
 claim_id uuid not null references identity_private.mobile_invitation_claims(id),
 email_invitation_id uuid not null unique references public.identity_invitations(id),
 state text not null check(state in ('reserved','delivered','uncertain')),
 reserved_at timestamptz not null default clock_timestamp(),
 verified_session_id uuid,
 primary key(mobile_invitation_id,invitation_version)
);
alter table identity_private.mobile_email_exchanges enable row level security;
alter table identity_private.mobile_email_exchanges force row level security;
revoke all on identity_private.mobile_email_exchanges from public,anon,authenticated,service_role;
create index mobile_email_claim_idx on identity_private.mobile_email_exchanges(claim_id);

-- Privileged helper is not an exposed API. Shared lock precedes any identity invitation lock.
create function identity_private.live_mobile_email_claim(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if p_tenant_id is null or p_token_digest is null or p_token_digest !~ '^[a-f0-9]{64}$'
  or p_claim_digest is null or p_claim_digest !~ '^[a-f0-9]{64}$' or p_request_key is null then
  return null; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 select c.id into result from identity_private.mobile_invitation_claims c
 join identity_private.mobile_invitation_tokens t on t.id=c.token_id
 join identity_private.mobile_invitations i on i.id=c.invitation_id
 join public.tenants tenant on tenant.id=i.tenant_id and tenant.status='active'
 where c.tenant_id=p_tenant_id and c.claim_digest=p_claim_digest and c.request_key=p_request_key
  and c.state='active' and c.expires_at>clock_timestamp() and c.email_digest is not null
  and t.digest=p_token_digest and t.state='active' and t.expires_at>clock_timestamp()
  and i.version=t.invitation_version and i.status='claimed' and i.expires_at>clock_timestamp()
  and i.bound_email_digest=c.email_digest;
 return result;
end $$;
revoke all on function identity_private.live_mobile_email_claim(uuid,text,text,uuid)
 from public,anon,authenticated,service_role;

create function public.prepare_mobile_email_exchange(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c identity_private.mobile_invitation_claims; i identity_private.mobile_invitations;
 x identity_private.mobile_email_exchanges; mail text; invitation_id uuid; instant timestamptz;
begin
 select * into c from identity_private.mobile_invitation_claims
  where id=identity_private.live_mobile_email_claim(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if c.id is null then return null; end if;
 select * into i from identity_private.mobile_invitations where id=c.invitation_id for update;
 select * into x from identity_private.mobile_email_exchanges
  where mobile_invitation_id=i.id and invitation_version=i.version;
 if x.mobile_invitation_id is not null then
  -- A reservation is a one-shot send lease, never a permission to resend after uncertainty.
  return jsonb_build_object('dispatch',false,'state',x.state);
 end if;
 select contact.claimed_email into mail from identity_private.mobile_invitation_contacts contact where contact.invitation_id=i.id;
 if mail is null or encode(sha256(convert_to(mail,'UTF8')),'hex')<>c.email_digest then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,91203));
 instant:=clock_timestamp();
 if c.expires_at<=instant then return null; end if;
 -- No returning-account relink or cross-tenant merge is authorised by an SMS capability.
 if exists(select 1 from auth.users where lower(btrim(email))=mail)
  or exists(select 1 from public.subject_contacts where kind='email' and lower(btrim(normalized_value))=mail)
  or exists(select 1 from public.identity_invitations where contact_digest=c.email_digest
    and status in ('pending','accepted') and (status='accepted' or expires_at>instant))
  or (select count(*) from identity_private.mobile_email_exchanges lease
    join identity_private.mobile_invitations m on m.id=lease.mobile_invitation_id
    where m.tenant_id=p_tenant_id and lease.reserved_at>instant-interval '1 hour')>=10
 then return null; end if;
 insert into public.identity_invitations(tenant_id,contact_digest,intended_role,expires_at,
  issued_by_subject_id,purpose,request_key,delivery_status)
 values(p_tenant_id,c.email_digest,'patient',least(c.expires_at,i.expires_at),i.created_by_subject_id,
  'operations',c.id,'reserved') returning id into invitation_id;
 insert into identity_private.mobile_email_exchanges values(i.id,i.version,c.id,invitation_id,'reserved',instant,null);
 perform audit_private.append_audit_fact(p_tenant_id,'system',i.created_by_subject_id,'mobile_claim','system',
  'mobile.email.reserved',null,'mobile_invitation',i.id::text,'identity','mobile-invitation-v1','succeeded',
  'MOBILE_EMAIL_RESERVED',c.id::text,c.request_key::text,instant,'{}'::jsonb);
 return jsonb_build_object('dispatch',true,'state','reserved','email',mail,'invitationId',invitation_id);
end $$;

create function public.finish_mobile_email_exchange(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid,p_provider_subject uuid default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare c identity_private.mobile_invitation_claims; x identity_private.mobile_email_exchanges;
begin
 select * into c from identity_private.mobile_invitation_claims
  where id=identity_private.live_mobile_email_claim(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if c.id is null then return false; end if;
 select * into x from identity_private.mobile_email_exchanges where claim_id=c.id for update;
 if x.state<>'reserved' or x.email_invitation_id is null then return false; end if;
 if p_provider_subject is null then
  update identity_private.mobile_email_exchanges set state='uncertain' where claim_id=c.id;
  return false;
 end if;
 if not exists(select 1 from auth.users u join public.identity_invitations e on e.id=x.email_invitation_id
  where u.id=p_provider_subject and not coalesce(u.is_anonymous,false)
   and e.contact_digest=encode(sha256(convert_to(lower(btrim(u.email)),'UTF8')),'hex')
   and u.email_confirmed_at is null)
 then return false; end if;
 perform public.complete_patient_invitation_delivery(x.email_invitation_id,p_provider_subject::text,false);
 update identity_private.mobile_email_exchanges set state='delivered' where claim_id=c.id;
 return true;
end $$;

create function public.read_mobile_email_exchange(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c identity_private.mobile_invitation_claims; result jsonb;
begin
 select * into c from identity_private.mobile_invitation_claims
  where id=identity_private.live_mobile_email_claim(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if c.id is null then return null; end if;
 select jsonb_build_object('id',e.id,'tenantId',e.tenant_id,'contactDigest',e.contact_digest,
  'providerSubject',e.provider_subject,'expiresAt',e.expires_at,'email',contact.claimed_email)
 into result from identity_private.mobile_email_exchanges x
 join public.identity_invitations e on e.id=x.email_invitation_id
 join identity_private.mobile_invitation_contacts contact on contact.invitation_id=x.mobile_invitation_id
 where x.mobile_invitation_id=c.invitation_id and x.invitation_version=(select version from identity_private.mobile_invitations where id=c.invitation_id)
  and x.state='delivered' and e.status='pending' and e.delivery_status='delivered'
  and e.expires_at>clock_timestamp() and e.contact_digest=c.email_digest;
 return result;
end $$;

create function public.verify_mobile_email_exchange(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid,p_provider_subject uuid,p_provider_session_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare c identity_private.mobile_invitation_claims; x identity_private.mobile_email_exchanges;
begin
 select * into c from identity_private.mobile_invitation_claims
  where id=identity_private.live_mobile_email_claim(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if c.id is null then return false; end if;
 select * into x from identity_private.mobile_email_exchanges where mobile_invitation_id=c.invitation_id
  and invitation_version=(select version from identity_private.mobile_invitations where id=c.invitation_id) for update;
 if x.state<>'delivered' or x.email_invitation_id is null or not exists(
  select 1 from auth.users u join auth.sessions s on s.user_id=u.id
  join public.identity_invitations e on e.id=x.email_invitation_id
  where u.id=p_provider_subject and s.id=p_provider_session_id and u.email_confirmed_at is not null
   and (s.not_after is null or s.not_after>clock_timestamp())
   and s.created_at>=x.reserved_at
   and e.provider_subject=u.id::text and e.status='pending' and e.expires_at>clock_timestamp()
   and e.contact_digest=c.email_digest
   and encode(sha256(convert_to(lower(btrim(u.email)),'UTF8')),'hex')=c.email_digest
 ) then return false; end if;
 if x.verified_session_id is not null and x.verified_session_id<>p_provider_session_id then return false; end if;
 -- A fresh claim can resume only the same immutable email/invitation, never extend either deadline.
 update identity_private.mobile_email_exchanges set claim_id=c.id,verified_session_id=p_provider_session_id
  where mobile_invitation_id=c.invitation_id and invitation_version=x.invitation_version;
 return true;
end $$;

-- Guard existing activation, including direct callers of the old verification endpoint.
create function identity_private.require_mobile_activation(p_invitation_id uuid,p_provider_session_id uuid)
 returns void language plpgsql security definer set search_path='' as $$
declare x identity_private.mobile_email_exchanges; c identity_private.mobile_invitation_claims;
 i identity_private.mobile_invitations;
begin
 select * into x from identity_private.mobile_email_exchanges where email_invitation_id=p_invitation_id;
 if x.mobile_invitation_id is null then return; end if;
 select * into i from identity_private.mobile_invitations where id=x.mobile_invitation_id;
 perform pg_advisory_xact_lock(hashtextextended(i.tenant_id::text,14103));
 select * into i from identity_private.mobile_invitations where id=x.mobile_invitation_id for update;
 select * into c from identity_private.mobile_invitation_claims where id=x.claim_id;
 if i.status='converted' and i.email_invitation_id=p_invitation_id then return; end if;
 if x.verified_session_id is distinct from p_provider_session_id or x.state<>'delivered'
  or i.version<>x.invitation_version or i.status<>'claimed' or i.expires_at<=clock_timestamp()
  or c.state<>'active' or c.expires_at<=clock_timestamp() or c.email_digest is distinct from i.bound_email_digest
  or not exists(select 1 from identity_private.mobile_invitation_tokens where id=c.token_id
    and state='active' and expires_at>clock_timestamp() and invitation_version=i.version)
 then raise exception using errcode='42501',message='ACTIVATION_REJECTED'; end if;
end $$;
alter function public.prepare_pilot_account(uuid,uuid,uuid,uuid) set schema identity_private;
alter function public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb) set schema identity_private;
revoke all on function identity_private.prepare_pilot_account(uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function identity_private.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.prepare_pilot_account(p_invitation_id uuid,p_tenant_id uuid,p_provider_subject uuid,p_provider_session_id uuid)
 returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform identity_private.require_mobile_activation(p_invitation_id,p_provider_session_id);
 return identity_private.prepare_pilot_account(p_invitation_id,p_tenant_id,p_provider_subject,p_provider_session_id);
end $$;
create function public.activate_pilot_account(p_invitation_id uuid,p_tenant_id uuid,p_provider_subject uuid,p_provider_session_id uuid,p_command jsonb)
 returns uuid language plpgsql security definer set search_path='' as $$
declare profile_id uuid; x identity_private.mobile_email_exchanges; e public.identity_invitations; event_id uuid;
begin
 perform identity_private.require_mobile_activation(p_invitation_id,p_provider_session_id);
 select * into x from identity_private.mobile_email_exchanges where email_invitation_id=p_invitation_id;
 if x.mobile_invitation_id is not null and exists(select 1 from identity_private.mobile_invitations where id=x.mobile_invitation_id and status='claimed')
  and not exists(select 1 from identity_private.mobile_invitation_contacts contact
   where contact.invitation_id=x.mobile_invitation_id and contact.phone=p_command->>'mobileE164')
 then raise exception using errcode='42501',message='ACTIVATION_REJECTED'; end if;
 profile_id:=identity_private.activate_pilot_account(p_invitation_id,p_tenant_id,p_provider_subject,p_provider_session_id,p_command);
 select * into x from identity_private.mobile_email_exchanges where email_invitation_id=p_invitation_id;
 if x.mobile_invitation_id is not null and exists(select 1 from identity_private.mobile_invitations where id=x.mobile_invitation_id and status='claimed') then
  select * into e from public.identity_invitations where id=p_invitation_id;
  update identity_private.mobile_invitations set status='converted',terminal_at=clock_timestamp(),
   email_invitation_id=e.id,converted_subject_id=e.accepted_by_subject_id where id=x.mobile_invitation_id;
  insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,request_key)
   values(x.mobile_invitation_id,p_tenant_id,x.invitation_version,'converted',(p_command->>'requestKey')::uuid) returning id into event_id;
  perform audit_private.append_audit_fact(p_tenant_id,'patient',e.accepted_by_subject_id,'patient','aal1',
   'mobile.invitation.converted',null,'mobile_invitation',x.mobile_invitation_id::text,'identity','mobile-invitation-v1',
   'succeeded','MOBILE_CONVERTED',event_id::text,(p_command->>'requestKey'),clock_timestamp(),'{}'::jsonb);
 end if;
 return profile_id;
end $$;
revoke all on function identity_private.require_mobile_activation(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.prepare_mobile_email_exchange(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.finish_mobile_email_exchange(uuid,text,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.read_mobile_email_exchange(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.verify_mobile_email_exchange(uuid,text,text,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.prepare_pilot_account(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_mobile_email_exchange(uuid,text,text,uuid),
 public.finish_mobile_email_exchange(uuid,text,text,uuid,uuid),public.read_mobile_email_exchange(uuid,text,text,uuid),
 public.verify_mobile_email_exchange(uuid,text,text,uuid,uuid,uuid),public.prepare_pilot_account(uuid,uuid,uuid,uuid),
 public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb) to service_role;

create function public.sweep_mobile_invitation_retention(p_tenant_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare expired_count integer; contact_count integer; event_count integer;
begin
 if p_tenant_id is null then raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 update identity_private.mobile_invitations set status='expired',terminal_at=clock_timestamp()
  where id in (select id from identity_private.mobile_invitations where tenant_id=p_tenant_id
    and status in ('issued','claimed') and expires_at<=clock_timestamp() order by expires_at limit 100);
 get diagnostics expired_count=row_count;
 delete from identity_private.mobile_invitation_contacts where invitation_id in (
  select invitation_id from identity_private.mobile_invitation_contacts where tenant_id=p_tenant_id
   and purge_after<=clock_timestamp() order by purge_after limit 100);
 get diagnostics contact_count=row_count;
 delete from identity_private.mobile_invitation_events where id in (
  select id from identity_private.mobile_invitation_events where tenant_id=p_tenant_id
   and retain_until<=clock_timestamp() order by retain_until limit 100);
 get diagnostics event_count=row_count;
 return jsonb_build_object('expired',expired_count,'contactsPurged',contact_count,'eventsPurged',event_count);
end $$;
revoke all on function public.sweep_mobile_invitation_retention(uuid) from public,anon,authenticated;
grant execute on function public.sweep_mobile_invitation_retention(uuid) to service_role;
commit;
