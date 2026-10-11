-- Invitation lifetime is not OTP/session lifetime. No provider/session TTL is extended.
begin;
create table identity_private.mobile_email_resume_leases (
 claim_id uuid primary key references identity_private.mobile_invitation_claims(id),
 email_invitation_id uuid not null references public.identity_invitations(id),
 reserved_at timestamptz not null default clock_timestamp()
);
alter table identity_private.mobile_email_resume_leases enable row level security;
alter table identity_private.mobile_email_resume_leases force row level security;
revoke all on identity_private.mobile_email_resume_leases from public,anon,authenticated,service_role;
create trigger mobile_email_resume_immutable before update or delete
 on identity_private.mobile_email_resume_leases for each row
 execute function audit_private.reject_append_only_mutation();

-- Edit the existing guarded primitives without replacing their security wrappers or ACLs.
do $$
declare item record; source text; needle text; replacement text; previous jsonb; current_meta jsonb;
begin
 for item in select * from (values
  ('public.prepare_mobile_email_exchange_before_provenance(uuid,text,text,uuid)',
   'least(c.expires_at,i.expires_at)', 'i.expires_at'),
  ('identity_private.require_mobile_activation(uuid,uuid)',
   'c.state<>''active'' or c.expires_at<=clock_timestamp() or c.email_digest',
   'c.state not in (''active'',''expired'') or c.email_digest'),
  ('identity_private.guard_mobile_invitation()',
   E'c.state=''active''\n      and c.expires_at>clock_timestamp() and c.email_digest',
   '( (c.state=''active'' and c.expires_at>clock_timestamp()) or (c.state in (''active'',''expired'') and exists(select 1 from identity_private.mobile_email_exchanges verified where verified.mobile_invitation_id=new.id and verified.invitation_version=new.version and verified.claim_id=c.id and verified.email_invitation_id=new.email_invitation_id and verified.state=''delivered'' and verified.verified_session_id is not null))) and c.email_digest'),
  ('public.verify_mobile_email_exchange(uuid,text,text,uuid,uuid,uuid)',
   'and s.created_at>=x.reserved_at',
   'and s.created_at>=greatest(x.reserved_at,coalesce((select resume.reserved_at from identity_private.mobile_email_resume_leases resume where resume.claim_id=c.id and resume.email_invitation_id=x.email_invitation_id),x.reserved_at))'),
  ('public.verify_mobile_email_exchange(uuid,text,text,uuid,uuid,uuid)',
   'if x.verified_session_id is not null and x.verified_session_id<>p_provider_session_id then return false; end if;',
   'if x.verified_session_id is not null and x.verified_session_id<>p_provider_session_id and not exists(select 1 from identity_private.mobile_email_resume_leases resume join auth.sessions fresh on fresh.id=p_provider_session_id where resume.claim_id=c.id and resume.email_invitation_id=x.email_invitation_id and fresh.created_at>=resume.reserved_at) then return false; end if;')
 ) as edits(signature,old_text,new_text)
 loop
  select jsonb_build_array(proowner,proacl,prosecdef,proconfig,provolatile) into previous
   from pg_proc where oid=item.signature::regprocedure;
  source:=pg_get_functiondef(item.signature::regprocedure);
  needle:=item.old_text; replacement:=item.new_text;
  if (length(source)-length(replace(source,needle,'')))/length(needle)<>1 then
   raise exception 'ONBOARDING_FUNCTION_SHAPE_CHANGED'; end if;
  execute replace(source,needle,replacement);
  select jsonb_build_array(proowner,proacl,prosecdef,proconfig,provolatile) into current_meta
   from pg_proc where oid=item.signature::regprocedure;
  if previous is distinct from current_meta then raise exception 'ONBOARDING_SECURITY_METADATA_CHANGED'; end if;
 end loop;
end $$;

-- Correct only pending, proven mobile-derived invitations inside their ORIGINAL live window.
-- No terminal/reissued/retired invitation is resurrected and no deadline is moved past 48h.
update public.identity_invitations e set expires_at=least(i.expires_at,i.issued_at+interval '48 hours')
 from identity_private.mobile_email_exchanges x
 join identity_private.mobile_invitations i on i.id=x.mobile_invitation_id
 join identity_private.mobile_identity_creation_receipts receipt on receipt.email_invitation_id=x.email_invitation_id
 join identity_private.mobile_invitation_claims c on c.id=x.claim_id
 where e.id=x.email_invitation_id and e.status='pending' and x.state='delivered'
  and e.provider_subject=receipt.provider_subject_id::text
  and e.contact_digest=i.bound_email_digest and e.contact_digest=c.email_digest
  and e.expires_at=c.expires_at and i.status='claimed' and i.version=x.invitation_version
  and i.expires_at>clock_timestamp() and i.issued_at is not null
  and exists(select 1 from identity_private.mobile_invitation_tokens t where t.id=c.token_id
   and t.state='active' and t.invitation_version=i.version and t.expires_at>clock_timestamp())
  and not exists(select 1 from identity_private.mobile_orphan_retirements retirement where retirement.email_invitation_id=e.id);

-- Keep the old strict response compatible with the currently deployed Worker. Apply this
-- migration first, then deploy the new caller; no simultaneous provider/Worker cutover required.
create function public.read_mobile_email_exchange_for_resume(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare result jsonb; claim uuid;
begin
 result:=public.read_mobile_email_exchange(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if result is null then return null;end if;
 claim:=identity_private.live_mobile_email_claim(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if claim is null then return null;end if;
 return result||jsonb_build_object('otpKind',case when exists(
  select 1 from identity_private.mobile_email_resume_leases resume
  where resume.claim_id=claim and resume.email_invitation_id=(result->>'id')::uuid)
  then 'email' else 'invite' end);
end $$;
revoke all on function public.read_mobile_email_exchange_for_resume(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.read_mobile_email_exchange_for_resume(uuid,text,text,uuid) to service_role;

create function public.prepare_mobile_email_resume(p_tenant_id uuid,p_token_digest text,
 p_claim_digest text,p_request_key uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare c identity_private.mobile_invitation_claims; x identity_private.mobile_email_exchanges;
 e public.identity_invitations; mail text; instant timestamptz:=clock_timestamp();
begin
 select * into c from identity_private.mobile_invitation_claims
  where id=identity_private.live_mobile_email_claim(p_tenant_id,p_token_digest,p_claim_digest,p_request_key);
 if c.id is null then return null;end if;
 select * into x from identity_private.mobile_email_exchanges where mobile_invitation_id=c.invitation_id
  and invitation_version=(select version from identity_private.mobile_invitations where id=c.invitation_id) for update;
 select * into e from public.identity_invitations where id=x.email_invitation_id;
 select claimed_email into mail from identity_private.mobile_invitation_contacts where invitation_id=c.invitation_id;
 if x.state is distinct from 'delivered' or e.status is distinct from 'pending'
  or e.delivery_status is distinct from 'delivered' or e.expires_at<=instant
  or e.tenant_id<>p_tenant_id or e.contact_digest is distinct from c.email_digest
  or mail is null or encode(sha256(convert_to(mail,'UTF8')),'hex')<>c.email_digest
  or not exists(select 1 from identity_private.mobile_identity_creation_receipts r
   join auth.users u on u.id=r.provider_subject_id
   where r.email_invitation_id=e.id and u.id::text=e.provider_subject
    and not coalesce(u.is_anonymous,false) and lower(btrim(u.email))=mail)
  or exists(select 1 from identity_private.mobile_orphan_retirements retirement where retirement.email_invitation_id=e.id)
 then return null;end if;
 if exists(select 1 from identity_private.mobile_email_resume_leases where claim_id=c.id) then
  return jsonb_build_object('dispatch',false);end if;
 -- A first send's HTTP retry never becomes a resend. A verified setup can reverify immediately.
 if c.id=x.claim_id and x.verified_session_id is null then
  return jsonb_build_object('dispatch',false);end if;
 if (select count(*) from identity_private.mobile_email_resume_leases where email_invitation_id=e.id
    and reserved_at>instant-interval '1 hour')>=3
  or (select count(*) from identity_private.mobile_email_resume_leases where email_invitation_id=e.id)>=8
  or (select count(*) from identity_private.mobile_email_resume_leases l
    join public.identity_invitations invitation on invitation.id=l.email_invitation_id
    where invitation.tenant_id=p_tenant_id and l.reserved_at>instant-interval '1 hour')>=10
 then return null;end if;
 insert into identity_private.mobile_email_resume_leases(claim_id,email_invitation_id) values(c.id,e.id);
 return jsonb_build_object('dispatch',true,'email',mail);
end $$;
revoke all on function public.prepare_mobile_email_resume(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.prepare_mobile_email_resume(uuid,text,text,uuid) to service_role;
commit;
