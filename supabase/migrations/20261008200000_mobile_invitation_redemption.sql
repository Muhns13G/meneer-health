-- 14.6: service-only participant claims. No Auth creation, email delivery or conversion.
begin;
create function public.exchange_mobile_invitation(
 p_tenant_id uuid,p_action text,p_token_digest text,p_claim_digest text,
 p_request_key uuid,p_email text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare t identity_private.mobile_invitation_tokens; i identity_private.mobile_invitations;
 c identity_private.mobile_invitation_claims; instant timestamptz; mail text; mail_digest text;
 event_id uuid; event_name text; result jsonb;
begin
 if p_tenant_id is null or p_action is null or p_action not in ('redeem','read','bind','decline')
  or p_token_digest is null or p_token_digest !~ '^[a-f0-9]{64}$'
  or p_request_key is null or (p_action<>'decline' and
   (p_claim_digest is null or p_claim_digest !~ '^[a-f0-9]{64}$')) then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
 if p_action='bind' then
  mail:=lower(btrim(p_email));
  if mail is null or length(mail)>254 or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
   raise exception using errcode='22023',message='MOBILE_INPUT_INVALID'; end if;
  mail_digest:=encode(sha256(convert_to(mail,'UTF8')),'hex');
 elsif p_email is not null then
  raise exception using errcode='22023',message='MOBILE_INPUT_INVALID';
 end if;
 -- Same lock as staff revoke/resend and dispatch; read the clock only after acquiring it.
 perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text,14103));
 instant:=clock_timestamp();
 select * into t from identity_private.mobile_invitation_tokens
  where tenant_id=p_tenant_id and digest=p_token_digest;
 select * into i from identity_private.mobile_invitations
  where id=t.invitation_id and tenant_id=p_tenant_id for update;
 if p_action='decline' and i.status='declined' and i.version=t.invitation_version
  and exists(select 1 from identity_private.mobile_invitation_events where invitation_id=i.id
   and invitation_version=i.version and event='declined' and request_key=p_request_key) then
  return jsonb_build_object('declined',true); end if;
 if i.id is null or t.state<>'active' or i.version<>t.invitation_version
  or i.status not in ('issued','claimed') or t.expires_at<=instant or i.expires_at<=instant then
  return null; end if;
 if p_action='decline' then
  update identity_private.mobile_invitations set status='declined',terminal_at=instant where id=i.id;
  event_name:='declined'; result:=jsonb_build_object('declined',true);
 else
  select * into c from identity_private.mobile_invitation_claims
   where invitation_id=i.id and request_key=p_request_key;
  if p_action='redeem' then
   if c.id is not null then
    if c.state<>'active' or c.expires_at<=instant or c.token_id<>t.id
     or c.claim_digest<>p_claim_digest then return null; end if;
   else
    update identity_private.mobile_invitation_claims set state='expired'
     where invitation_id=i.id and state='active' and expires_at<=instant;
    if exists(select 1 from identity_private.mobile_invitation_claims
     where invitation_id=i.id and state='active') then return null; end if;
    insert into identity_private.mobile_invitation_claims(invitation_id,tenant_id,token_id,
     claim_digest,request_key,issued_at,expires_at)
     values(i.id,p_tenant_id,t.id,p_claim_digest,p_request_key,instant,
      least(instant+interval '15 minutes',t.expires_at)) returning * into c;
    if i.status='issued' then
     update identity_private.mobile_invitations set status='claimed' where id=i.id; end if;
    event_name:='claimed';
   end if;
  elsif c.id is null or c.state<>'active' or c.expires_at<=instant or c.token_id<>t.id
   or c.claim_digest<>p_claim_digest then return null;
  end if;
  if p_action='bind' then
   if i.bound_email_digest is not null and i.bound_email_digest<>mail_digest then return null; end if;
   if c.email_digest is null then
    update identity_private.mobile_invitation_claims set email_digest=mail_digest where id=c.id;
    update identity_private.mobile_invitation_contacts set claimed_email=mail where invitation_id=i.id;
    c.email_digest:=mail_digest; event_name:='email_bound';
   elsif c.email_digest<>mail_digest then return null; end if;
  end if;
  result:=jsonb_build_object('invitationId',i.id,'version',i.version,'claimId',c.id,
   'expiresAt',c.expires_at,'emailBound',c.email_digest is not null);
 end if;
 if event_name is not null then
  insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,
   event,request_key) values(i.id,p_tenant_id,i.version,event_name,p_request_key) returning id into event_id;
  -- System attribution is not a claim that the participant is an authenticated staff member.
  perform audit_private.append_audit_fact(p_tenant_id,'system',i.created_by_subject_id,
   'mobile_claim','system','mobile.invitation.'||replace(event_name,'_','.'),null,'mobile_invitation',i.id::text,
   'identity','mobile-invitation-v1','succeeded','MOBILE_CLAIM_RECORDED',event_id::text,
   p_request_key::text,instant,'{}'::jsonb);
 end if;
 return result;
end $$;
revoke all on function public.exchange_mobile_invitation(uuid,text,text,text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.exchange_mobile_invitation(uuid,text,text,text,uuid,text) to service_role;
commit;
