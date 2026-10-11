-- Email delivery of the existing participant capability, not a second identity invitation.
begin;
alter table identity_private.mobile_invitation_policies add column email_delivery_enabled boolean not null default false;
create table identity_private.pilot_email_invitation_attempts (
 id uuid primary key default gen_random_uuid(),
 invitation_id uuid not null unique references identity_private.mobile_invitations(id),
 tenant_id uuid not null references public.tenants(id),
 invitation_version integer not null,
 actor_subject_id uuid not null references public.subjects(id),
 request_key uuid not null,
 recipient_digest text check(recipient_digest ~ '^[a-f0-9]{64}$'),
 state text not null default 'prepared' check(state in ('prepared','accepted','failed','uncertain')),
 prepared_at timestamptz not null,
 dispatch_until timestamptz not null,
 finished_at timestamptz,
 unique(tenant_id,request_key),
 foreign key(invitation_id,tenant_id) references identity_private.mobile_invitations(id,tenant_id),
 check(dispatch_until=prepared_at+interval '2 minutes'),
 check((state='prepared')=(finished_at is null))
);
alter table identity_private.pilot_email_invitation_attempts enable row level security;
alter table identity_private.pilot_email_invitation_attempts force row level security;
revoke all on identity_private.pilot_email_invitation_attempts from public,anon,authenticated,service_role;
create trigger mobile_orphan_reference_guard before insert or update on identity_private.pilot_email_invitation_attempts
 for each row execute function identity_private.guard_mobile_orphan_reference('actor_subject_id');
create function identity_private.guard_pilot_email_attempt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' and old.prepared_at+interval '90 days'<=clock_timestamp()
  and old.recipient_digest is null then return old; end if;
 if tg_op='UPDATE' then
  if old.recipient_digest is not null and new.recipient_digest is null
   and to_jsonb(old)-'recipient_digest'=to_jsonb(new)-'recipient_digest'
   and exists(select 1 from identity_private.mobile_invitations i where i.id=old.invitation_id
    and i.status in ('expired','revoked','declined')
    and coalesce(i.terminal_at,i.expires_at)+interval '30 days'<=clock_timestamp()) then return new; end if;
  if old.state='prepared' and new.state in ('accepted','failed','uncertain') and new.finished_at is not null
   and to_jsonb(old)-array['state','finished_at']=to_jsonb(new)-array['state','finished_at'] then return new; end if;
 end if;
 raise exception using errcode='42501',message='EMAIL_ATTEMPT_IMMUTABLE';
end $$;
revoke all on function identity_private.guard_pilot_email_attempt() from public,anon,authenticated,service_role;
create trigger pilot_email_attempt_guard before update or delete on identity_private.pilot_email_invitation_attempts
 for each row execute function identity_private.guard_pilot_email_attempt();

create function public.prepare_pilot_email_invitation(
 p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,
 p_invitation_id uuid,p_expected_version integer,p_request_key uuid,p_email text,p_token_digest text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare i identity_private.mobile_invitations; instant timestamptz; mail text; digest text; attempt uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,
  p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 mail:=lower(btrim(p_email));
 if p_request_key is null or p_expected_version is null or p_expected_version<1
  or p_invitation_id is null or p_token_digest is null or p_token_digest !~ '^[a-f0-9]{64}$'
  or mail is null or length(mail)>254 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 digest:=encode(sha256(convert_to(mail,'UTF8')),'hex');
 select * into i from identity_private.mobile_invitations where id=p_invitation_id and tenant_id=p_tenant_id for update;
 if i.id is null then raise exception using errcode='42501',message='MOBILE_INVITATION_REJECTED'; end if;
 if exists(select 1 from identity_private.pilot_email_invitation_attempts where invitation_id=i.id) then
  -- No raw bearer recovery, including changed keys/recipients and uncertain provider outcomes.
  return null; end if;
 instant:=clock_timestamp();
 if not coalesce((select email_delivery_enabled from identity_private.mobile_invitation_policies where tenant_id=p_tenant_id),false) then
  raise exception using errcode='42501',message='EMAIL_DELIVERY_DISABLED'; end if;
 if i.version<>p_expected_version or i.status not in ('draft','issued')
  or (i.expires_at is not null and i.expires_at<=instant)
  or i.bound_email_digest is not null
  or exists(select 1 from identity_private.mobile_invitation_claims where invitation_id=i.id)
  or exists(select 1 from identity_private.mobile_email_exchanges where mobile_invitation_id=i.id)
  or not exists(select 1 from identity_private.mobile_invitation_contacts where invitation_id=i.id)
  or not exists(select 1 from identity_private.mobile_invitation_events where invitation_id=i.id
   and invitation_version=i.version and event='reviewed') then
  raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,91203));
 if exists(select 1 from auth.users where lower(btrim(email))=mail)
  or exists(select 1 from public.subject_contacts where kind='email' and lower(btrim(normalized_value))=mail)
  or exists(select 1 from public.identity_invitations where contact_digest=digest and
   (status='accepted' or (status='pending' and expires_at>instant)))
  or exists(select 1 from identity_private.pilot_email_invitation_attempts a
   join identity_private.mobile_invitations m on m.id=a.invitation_id
   where a.recipient_digest=digest and m.status in ('issued','claimed','converted')) then
  raise exception using errcode='PT409',message='MOBILE_INVITATION_CONFLICT'; end if;
 if (select count(*) from identity_private.pilot_email_invitation_attempts where tenant_id=p_tenant_id
  and prepared_at>instant-interval '24 hours')>=10 then
  raise exception using errcode='PT429',message='MOBILE_BUDGET_EXCEEDED'; end if;
 -- Supersede any SMS capability atomically, but never an already claimed account.
 update identity_private.mobile_invitations set version=version+1,status='draft',issued_at=null,expires_at=null
  where id=i.id returning * into i;
 insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,actor_subject_id,request_key)
  values(i.id,p_tenant_id,i.version,'superseded',p_subject_id,p_request_key),
   (i.id,p_tenant_id,i.version,'reviewed',p_subject_id,p_request_key);
 update identity_private.mobile_invitations set status='issued',issued_at=instant,expires_at=instant+interval '48 hours' where id=i.id;
 insert into identity_private.mobile_invitation_tokens(invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
  values(i.id,p_tenant_id,i.version,p_token_digest,instant,instant+interval '48 hours');
 insert into identity_private.pilot_email_invitation_attempts(invitation_id,tenant_id,invitation_version,actor_subject_id,
  request_key,recipient_digest,prepared_at,dispatch_until)
  values(i.id,p_tenant_id,i.version,p_subject_id,p_request_key,digest,instant,instant+interval '2 minutes') returning id into attempt;
 insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,actor_subject_id,request_key)
  values(i.id,p_tenant_id,i.version,'issued',p_subject_id,p_request_key);
 perform audit_private.append_audit_fact(p_tenant_id,'workforce',p_subject_id,'operations','aal2',
  'pilot.email.invitation.prepared',null,'mobile_invitation',i.id::text,'operations','pilot-email-v1',
  'succeeded','EMAIL_INVITATION_PREPARED',attempt::text,p_request_key::text,instant,'{}'::jsonb);
 return jsonb_build_object('attemptId',attempt,'dispatchUntil',instant+interval '2 minutes');
end $$;

create function public.finish_pilot_email_invitation(p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_attempt_id uuid,p_outcome text)
 returns boolean language plpgsql security definer set search_path='' as $$
declare a identity_private.pilot_email_invitation_attempts;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 perform identity_private.require_mobile_invitation_operator(p_provider_subject,p_provider_session_id,
  p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 if p_outcome is null or p_outcome not in ('accepted','failed','uncertain') then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 select * into a from identity_private.pilot_email_invitation_attempts where id=p_attempt_id
  and tenant_id=p_tenant_id and actor_subject_id=p_subject_id for update;
 if a.id is null then return false; end if;
 if a.state<>'prepared' then return a.state=p_outcome; end if;
 update identity_private.pilot_email_invitation_attempts set state=p_outcome,finished_at=clock_timestamp() where id=a.id;
 if p_outcome='failed' then
  update identity_private.mobile_invitation_tokens set state='revoked' where invitation_id=a.invitation_id
   and invitation_version=a.invitation_version and state='active';
 end if;
 return true;
end $$;

-- Reuse the current claim/managed-Auth/activation path. Restrict it to the addressed mailbox.
-- Patch an exact anchor rather than retiring an additional privileged implementation.
do $$ declare definition text; anchor text:='-- Same lock as staff revoke/resend and dispatch; read the clock only after acquiring it.';
begin
 select pg_get_functiondef('public.exchange_mobile_invitation(uuid,text,text,text,uuid,text)'::regprocedure) into definition;
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then raise exception 'EMAIL_CLAIM_ANCHOR_MISMATCH'; end if;
 definition:=replace(definition,anchor,anchor||E'\n perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));\n if p_action=''bind'' and exists(\n select 1 from identity_private.pilot_email_invitation_attempts a\n join identity_private.mobile_invitation_tokens token on token.invitation_id=a.invitation_id and token.invitation_version=a.invitation_version\n where token.tenant_id=p_tenant_id and token.digest=p_token_digest and a.recipient_digest is distinct from mail_digest\n ) then return null; end if;');
 execute definition;
end $$;

alter function public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid) rename to read_mobile_invitation_delivery_register;
alter function public.read_mobile_invitation_delivery_register(uuid,uuid,text,uuid,uuid,uuid,uuid) set schema identity_private;
revoke all on function identity_private.read_mobile_invitation_delivery_register(uuid,uuid,text,uuid,uuid,uuid,uuid) from public,anon,authenticated,service_role;
create function public.read_mobile_invitation_register(p_provider_subject uuid,p_provider_session_id uuid,p_verified_email text,
 p_session_id uuid,p_subject_id uuid,p_tenant_id uuid,p_after_id uuid default null)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; rows jsonb;
begin
 result:=identity_private.read_mobile_invitation_delivery_register(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id,p_after_id);
 select coalesce(jsonb_agg(row.value||jsonb_build_object('emailDelivery',coalesce(a.state,'not_attempted')) order by row.ordinality),'[]'::jsonb)
 into rows from jsonb_array_elements(result->'invitations') with ordinality row(value,ordinality)
 left join identity_private.pilot_email_invitation_attempts a on a.invitation_id=(row.value->>'id')::uuid and a.tenant_id=p_tenant_id;
 return jsonb_set(result,'{invitations}',rows)||jsonb_build_object('emailSendingEnabled',coalesce((select email_delivery_enabled from identity_private.mobile_invitation_policies where tenant_id=p_tenant_id),false));
end $$;

-- Follow the existing unconverted-contact retention clock; no plaintext mailbox is stored here.
alter function public.sweep_mobile_invitation_retention(uuid) rename to sweep_mobile_invitation_retention_without_email;
alter function public.sweep_mobile_invitation_retention_without_email(uuid) set schema identity_private;
revoke all on function identity_private.sweep_mobile_invitation_retention_without_email(uuid) from public,anon,authenticated,service_role;
create function public.sweep_mobile_invitation_retention(p_tenant_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=identity_private.sweep_mobile_invitation_retention_without_email(p_tenant_id);
 update identity_private.pilot_email_invitation_attempts a set recipient_digest=null
 from identity_private.mobile_invitations i where i.id=a.invitation_id and i.tenant_id=p_tenant_id
  and i.status in ('expired','revoked','declined') and coalesce(i.terminal_at,i.expires_at)+interval '30 days'<=clock_timestamp();
 delete from identity_private.pilot_email_invitation_attempts where tenant_id=p_tenant_id and recipient_digest is null
  and prepared_at+interval '90 days'<=clock_timestamp();
 return result;
end $$;
revoke all on function public.prepare_pilot_email_invitation(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,uuid,text,text),
 public.finish_pilot_email_invitation(uuid,uuid,text,uuid,uuid,uuid,uuid,text),
 public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid),public.sweep_mobile_invitation_retention(uuid) from public,anon,authenticated;
grant execute on function public.prepare_pilot_email_invitation(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,uuid,text,text),
 public.finish_pilot_email_invitation(uuid,uuid,text,uuid,uuid,uuid,uuid,text),
 public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid),public.sweep_mobile_invitation_retention(uuid) to service_role;
select identity_private.assert_mobile_orphan_guard_coverage();
commit;
