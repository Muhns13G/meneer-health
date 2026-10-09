-- TD-043: explicit multi-role context, immutable for one provider session.
-- Switching requires sign-out/new provider authentication; no grants are created here.
begin;
create table identity_private.workforce_context_selections (
 provider_session_id uuid primary key,
 subject_id uuid not null,
 tenant_id uuid not null,
 membership_id uuid not null,
 role text not null,
 purpose text not null,
 selected_at timestamptz not null default clock_timestamp()
);
alter table identity_private.workforce_context_selections enable row level security;
alter table identity_private.workforce_context_selections force row level security;
revoke all on identity_private.workforce_context_selections from public,anon,authenticated,service_role;
create trigger workforce_context_selection_immutable before update or delete
 on identity_private.workforce_context_selections for each row
 execute function audit_private.reject_append_only_mutation();

create function public.list_workforce_contexts(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;
begin
 select jsonb_agg(jsonb_build_object('subjectId',sub.id,'tenantId',m.tenant_id,'role',m.role,
  'purpose',case m.role when 'operations' then 'operations' when 'support' then 'support'
   when 'auditor' then 'privacy_review' when 'admin' then 'security_administration'
   when 'release' then 'release_management' when 'clinician' then 'care_delivery'
   when 'pharmacy' then 'dispensing' end) order by m.tenant_id,m.role) into result
 from auth.users u join auth.sessions a on a.user_id=u.id and a.id=p_provider_session_id
 join public.external_identities e on e.provider='supabase' and e.provider_subject=u.id::text
 join public.subjects sub on sub.id=e.subject_id and sub.status='active'
 join public.subject_contacts c on c.subject_id=sub.id and c.provider='supabase'
  and c.kind='email' and c.status='verified' and c.normalized_value=lower(u.email)
 join public.tenant_memberships m on m.subject_id=sub.id and m.role<>'patient'
  and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()
  and m.approved_by_subject_id is not null and m.approved_by_subject_id<>sub.id
 join public.tenants t on t.id=m.tenant_id and t.status='active'
 where u.id=p_provider_subject and u.email_confirmed_at is not null and not u.is_anonymous
  and (u.banned_until is null or u.banned_until<=clock_timestamp())
  and lower(u.email)=lower(btrim(p_verified_email))
  and a.aal::text in('aal1','aal2') and (a.not_after is null or a.not_after>clock_timestamp())
  and not exists(select 1 from public.identity_sessions bad where bad.provider_session_id=a.id
   and (bad.status<>'active' or bad.idle_expires_at<=clock_timestamp()
    or bad.absolute_expires_at<=clock_timestamp()));
 if result is null or jsonb_array_length(result)>32 then
  raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 return result;
end $$;
revoke all on function public.list_workforce_contexts(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.list_workforce_contexts(uuid,uuid,text) to service_role;

create function public.select_workforce_context(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_tenant_id uuid,p_role text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare choices jsonb; chosen jsonb; membership uuid;
begin
 -- Lock the exact provider session before checking MFA and reserving its one context.
 perform 1 from auth.sessions where id=p_provider_session_id and user_id=p_provider_subject for update;
 if not found or not exists(select 1 from auth.sessions where id=p_provider_session_id and aal::text='aal2')
  or not exists(select 1 from auth.mfa_amr_claims where session_id=p_provider_session_id
   and authentication_method='totp' and updated_at<=clock_timestamp()
   and updated_at>clock_timestamp()-interval '5 minutes')
  or exists(select 1 from public.identity_sessions where provider_session_id=p_provider_session_id)
  or exists(select 1 from identity_private.workforce_context_selections where provider_session_id=p_provider_session_id)
 then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 choices:=public.list_workforce_contexts(p_provider_subject,p_provider_session_id,p_verified_email);
 select value into chosen from jsonb_array_elements(choices)
  where value->>'tenantId'=p_tenant_id::text and value->>'role'=p_role;
 if chosen is null then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 select id into membership from public.tenant_memberships
  where subject_id=(chosen->>'subjectId')::uuid and tenant_id=p_tenant_id and role::text=p_role
   and status='active' and valid_from<=clock_timestamp() and expires_at>clock_timestamp()
   and approved_by_subject_id is not null and approved_by_subject_id<>subject_id for share;
 if membership is null then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 insert into identity_private.workforce_context_selections(provider_session_id,subject_id,tenant_id,membership_id,role,purpose)
  values(p_provider_session_id,(chosen->>'subjectId')::uuid,p_tenant_id,membership,p_role,chosen->>'purpose');
 return chosen;
end $$;
revoke all on function public.select_workforce_context(uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.select_workforce_context(uuid,uuid,text,uuid,text) to service_role;

alter function public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid)
 rename to resolve_workforce_context_before_selection;
revoke all on function public.resolve_workforce_context_before_selection(uuid,uuid,text,uuid,uuid,uuid)
 from public,anon,authenticated,service_role;
create function public.resolve_workforce_context(p_provider_subject uuid,p_provider_session_id uuid,
 p_verified_email text,p_session_id uuid default null,p_subject_id uuid default null,p_tenant_id uuid default null)
 returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare selection identity_private.workforce_context_selections; result jsonb; choices jsonb;
begin
 select * into selection from identity_private.workforce_context_selections where provider_session_id=p_provider_session_id;
 if selection.provider_session_id is null then
  return public.resolve_workforce_context_before_selection(p_provider_subject,p_provider_session_id,
   p_verified_email,p_session_id,p_subject_id,p_tenant_id);
 end if;
 -- Keep revocation serialized with the protected command's transaction.
 perform 1 from auth.sessions where id=p_provider_session_id and user_id=p_provider_subject for share;
 if not found then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 choices:=public.list_workforce_contexts(p_provider_subject,p_provider_session_id,p_verified_email);
 select value into result from jsonb_array_elements(choices) where
  value->>'subjectId'=selection.subject_id::text and value->>'tenantId'=selection.tenant_id::text
  and value->>'role'=selection.role and value->>'purpose'=selection.purpose;
 if result is null or (p_subject_id is not null and p_subject_id<>selection.subject_id)
  or (p_tenant_id is not null and p_tenant_id<>selection.tenant_id)
 then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 perform 1 from public.tenant_memberships where id=selection.membership_id
   and subject_id=selection.subject_id and tenant_id=selection.tenant_id and role::text=selection.role
   and status='active' and valid_from<=clock_timestamp() and expires_at>clock_timestamp()
   and approved_by_subject_id is not null and approved_by_subject_id<>subject_id for share;
 if not found then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 perform 1 from public.tenants where id=selection.tenant_id and status='active' for share;
 if not found then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 if p_session_id is not null then
  perform 1 from public.identity_sessions s join auth.sessions a on a.id=s.provider_session_id
   where s.id=p_session_id and s.subject_id=selection.subject_id and s.provider_session_id=p_provider_session_id
    and s.status='active' and s.assurance='aal2' and a.aal::text='aal2'
    and s.session_class=case when selection.role in('admin','release') then 'privileged' else 'workforce' end
    and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp() for share of s;
  if not found then raise exception using errcode='42501',message='WORKFORCE_REJECTED';end if;
 end if;
 return result;
end $$;
revoke all on function public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid) to service_role;
commit;
