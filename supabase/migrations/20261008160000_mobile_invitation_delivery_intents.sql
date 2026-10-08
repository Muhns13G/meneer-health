-- Task 14.4: one-shot server claims; no provider call, callback or activation in SQL.
begin;
alter table identity_private.mobile_invitation_policies
 add column sending_enabled boolean not null default false,
 add column delivery_ready boolean not null default false,
 add column provider_profile_id uuid,
 add column from_phone text check(from_phone ~ '^\+[1-9][0-9]{7,14}$'),
 add column per_segment_usd_micros integer not null default 0 check(per_segment_usd_micros between 0 and 1000000000),
 add column per_message_usd_micros integer not null default 0 check(per_message_usd_micros between 0 and 2000000000),
 add column daily_usd_micros bigint not null default 0 check(daily_usd_micros between 0 and 2000000000000),
 add constraint mobile_delivery_policy_ready check(not sending_enabled or
   (delivery_ready and provider_profile_id is not null and from_phone is not null
    and per_segment_usd_micros>0 and per_message_usd_micros>0 and daily_usd_micros>0));
create table identity_private.mobile_invitation_delivery_intents (
 id uuid primary key default gen_random_uuid(),
 reservation_id uuid not null unique references identity_private.mobile_invitation_send_reservations(id),
 invitation_id uuid not null,
 tenant_id uuid not null,
 invitation_version integer not null,
 actor_subject_id uuid not null references public.subjects(id),
 token_id uuid not null unique references identity_private.mobile_invitation_tokens(id),
 provider_profile_id uuid not null,
 from_phone text not null,
 segments integer not null default 2 check(segments=2),
 reserved_usd_micros integer not null check(reserved_usd_micros>0),
 state text not null default 'prepared' check(state in ('prepared','accepted','failed','uncertain')),
 provider_message_id uuid unique,
 prepared_at timestamptz not null,
 dispatch_until timestamptz not null,
 finished_at timestamptz,
 unique(invitation_id,invitation_version),
 foreign key(invitation_id,tenant_id) references identity_private.mobile_invitations(id,tenant_id),
 check(dispatch_until=prepared_at+interval '2 minutes'),
 check((state='prepared')=(finished_at is null)),
 check(state<>'accepted' or provider_message_id is not null)
);
create index mobile_delivery_spend on identity_private.mobile_invitation_delivery_intents(tenant_id,prepared_at);
alter table identity_private.mobile_invitation_delivery_intents enable row level security;
alter table identity_private.mobile_invitation_delivery_intents force row level security;
revoke all on identity_private.mobile_invitation_delivery_intents from public,anon,authenticated,service_role;
create function identity_private.guard_mobile_delivery_intent() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' or old.state<>'prepared' or new.state='prepared'
  or (to_jsonb(new)-array['state','provider_message_id','finished_at'])
    is distinct from (to_jsonb(old)-array['state','provider_message_id','finished_at']) then
  raise exception using errcode='42501',message='MOBILE_DELIVERY_IMMUTABLE'; end if;
 return new;
end $$;
revoke all on function identity_private.guard_mobile_delivery_intent() from public,anon,authenticated,service_role;
create trigger mobile_delivery_immutable before update or delete on identity_private.mobile_invitation_delivery_intents
 for each row execute function identity_private.guard_mobile_delivery_intent();

create function public.prepare_mobile_invitation_delivery(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,
 p_invitation_id uuid,p_expected_version integer,p_reservation_request_key uuid,
 p_token_digest text,p_profile_id uuid,p_from_phone text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare i identity_private.mobile_invitations; r identity_private.mobile_invitation_send_reservations;
 policy identity_private.mobile_invitation_policies; intent identity_private.mobile_invitation_delivery_intents;
 token_id uuid:=gen_random_uuid(); issued timestamptz; charge integer; phone_value text; event_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,
  p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 if p_token_digest is null or p_token_digest !~ '^[a-f0-9]{64}$' or p_expected_version is null then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 select * into r from identity_private.mobile_invitation_send_reservations
  where invitation_id=p_invitation_id and tenant_id=p_tenant_id and invitation_version=p_expected_version
   and request_key=p_reservation_request_key and actor_subject_id=p_subject_id;
 if r.id is null then raise exception using errcode='42501',message='MOBILE_INVITATION_REJECTED'; end if;
 -- Even changed digest/configuration replays cannot reconstruct a bearer or obtain another claim.
 if exists(select 1 from identity_private.mobile_invitation_delivery_intents where reservation_id=r.id) then return null; end if;
 select * into i from identity_private.mobile_invitations where id=p_invitation_id and tenant_id=p_tenant_id for update;
 if i.status<>'draft' or i.version<>p_expected_version then
  raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
 select * into policy from identity_private.mobile_invitation_policies where tenant_id=p_tenant_id for share;
 if not coalesce(policy.sending_enabled and policy.delivery_ready,false)
  or policy.provider_profile_id is distinct from p_profile_id or policy.from_phone is distinct from p_from_phone then
  raise exception using errcode='42501',message='MOBILE_DELIVERY_DISABLED'; end if;
 charge:=policy.per_segment_usd_micros*2;
 if charge<=0 or charge>policy.per_message_usd_micros
  or (select count(*) from identity_private.mobile_invitation_delivery_intents
   where tenant_id=p_tenant_id and prepared_at>clock_timestamp()-interval '24 hours')>=policy.daily_reservation_limit
  or (select count(*) from identity_private.mobile_invitation_delivery_intents
   where invitation_id=i.id and prepared_at>clock_timestamp()-interval '24 hours')>=3 or
  charge+(select coalesce(sum(reserved_usd_micros),0) from identity_private.mobile_invitation_delivery_intents
   where tenant_id=p_tenant_id and prepared_at>clock_timestamp()-interval '24 hours')>policy.daily_usd_micros then
  raise exception using errcode='PT429',message='MOBILE_BUDGET_EXCEEDED'; end if;
 select phone into phone_value from identity_private.mobile_invitation_contacts where invitation_id=i.id;
 if phone_value is null or phone_value !~ '^\+27[0-9]{9}$' then
  raise exception using errcode='22023',message='MOBILE_DESTINATION_INVALID'; end if;
 issued:=clock_timestamp();
 update identity_private.mobile_invitations set status='issued',issued_at=issued,expires_at=issued+interval '48 hours' where id=i.id;
 insert into identity_private.mobile_invitation_tokens(id,invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
  values(token_id,i.id,p_tenant_id,i.version,p_token_digest,issued,issued+interval '48 hours');
 insert into identity_private.mobile_invitation_delivery_intents(reservation_id,invitation_id,tenant_id,invitation_version,
  actor_subject_id,token_id,provider_profile_id,from_phone,reserved_usd_micros,prepared_at,dispatch_until)
 values(r.id,i.id,p_tenant_id,i.version,p_subject_id,token_id,p_profile_id,p_from_phone,charge,issued,issued+interval '2 minutes')
 returning * into intent;
 insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,actor_subject_id,request_key)
  values(i.id,p_tenant_id,i.version,'issued',p_subject_id,p_reservation_request_key) returning id into event_id;
 perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'operations','aal2',
  'mobile.invitation.prepared',null,'mobile_invitation',i.id::text,'operations','mobile-invitation-v1',
  'succeeded','MOBILE_DELIVERY_PREPARED',event_id::text,p_reservation_request_key::text,issued,'{}'::jsonb);
 return jsonb_build_object('attemptId',intent.id,'phone',phone_value,'reservedUsdMicros',charge,'dispatchUntil',intent.dispatch_until);
end $$;

create function public.finish_mobile_invitation_delivery(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,
 p_attempt_id uuid,p_outcome text,p_provider_message_id uuid
) returns boolean language plpgsql security definer set search_path='' as $$
declare intent identity_private.mobile_invitation_delivery_intents;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,
  p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 select * into intent from identity_private.mobile_invitation_delivery_intents
  where id=p_attempt_id and tenant_id=p_tenant_id and actor_subject_id=p_subject_id for update;
 if intent.id is null then raise exception using errcode='42501',message='MOBILE_INVITATION_REJECTED'; end if;
 if p_outcome is null or p_outcome not in ('accepted','failed','uncertain') or (p_outcome='accepted' and p_provider_message_id is null) then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 if intent.state<>'prepared' then
  if intent.state=p_outcome and intent.provider_message_id is not distinct from p_provider_message_id then return true; end if;
  raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
 update identity_private.mobile_invitation_delivery_intents set state=p_outcome,
  provider_message_id=p_provider_message_id,finished_at=clock_timestamp() where id=intent.id;
 perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'operations','aal2',
  'mobile.invitation.'||p_outcome,null,'mobile_invitation',intent.invitation_id::text,'operations','mobile-invitation-v1',
  'succeeded','MOBILE_DELIVERY_RECORDED',intent.id::text,intent.reservation_id::text,clock_timestamp(),'{}'::jsonb);
 return true;
end $$;
revoke all on function public.prepare_mobile_invitation_delivery(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,uuid,text,uuid,text)
 from public,anon,authenticated;
revoke all on function public.finish_mobile_invitation_delivery(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid)
 from public,anon,authenticated;
grant execute on function public.prepare_mobile_invitation_delivery(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,uuid,text,uuid,text) to service_role;
grant execute on function public.finish_mobile_invitation_delivery(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid) to service_role;
commit;
