-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION identity_private.guard_workforce_dispatch()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if tg_op='DELETE' then raise exception using errcode='42501',message='WORKFORCE_DISPATCH_IMMUTABLE'; end if;
  if old.status<>'prepared' or new.status not in ('accepted','uncertain')
    or (to_jsonb(old)-array['status','provider_subject','finished_at']) is distinct from
       (to_jsonb(new)-array['status','provider_subject','finished_at']) then
    raise exception using errcode='42501',message='WORKFORCE_DISPATCH_IMMUTABLE';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION identity_private.guard_workforce_dispatch() FROM PUBLIC;

CREATE FUNCTION public.finish_workforce_invitation (
  p_id               uuid,
  p_provider_subject uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if p_provider_subject is not null and not exists(select 1 from public.workforce_invitation_dispatches d
    join public.external_identities e on e.subject_id=d.target_subject_id and e.provider='supabase' and e.provider_subject=p_provider_subject::text
    where d.id=p_id) then raise exception using errcode='42501',message='WORKFORCE_REJECTED'; end if;
  update public.workforce_invitation_dispatches set status=case when p_provider_subject is null then 'uncertain' else 'accepted' end,
    provider_subject=p_provider_subject,finished_at=clock_timestamp() where id=p_id and status='prepared' and expires_at>now();
  if not found then raise exception using errcode='42501',message='WORKFORCE_REJECTED'; end if;
end;
$function$;

REVOKE ALL ON FUNCTION public.finish_workforce_invitation(uuid, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.finish_workforce_invitation(uuid, uuid) TO service_role;

CREATE FUNCTION public.reserve_workforce_invitation (
  p_provider_subject    uuid,
  p_provider_session_id uuid,
  p_verified_email      text,
  p_session_id          uuid,
  p_subject_id          uuid,
  p_tenant_id           uuid,
  p_target_email        text,
  p_request_key         uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare context jsonb; target uuid; result uuid;
begin
  if p_session_id is null or p_subject_id is null or p_tenant_id is null or p_request_key is null then
    raise exception using errcode='42501',message='WORKFORCE_REJECTED'; end if;
  context:=public.resolve_workforce_context(p_provider_subject,p_provider_session_id,p_verified_email,p_session_id,p_subject_id,p_tenant_id);
  if context->>'role'<>'admin' or not exists (select 1 from auth.mfa_amr_claims c where c.session_id=p_provider_session_id
    and c.authentication_method='totp' and c.updated_at<=now() and c.updated_at>now()-interval '5 minutes') then
    raise exception using errcode='42501',message='WORKFORCE_REJECTED'; end if;
  select c.subject_id into target from public.subject_contacts c
  join public.subjects sub on sub.id=c.subject_id and sub.status='active'
  join public.tenant_memberships m on m.subject_id=sub.id and m.tenant_id=p_tenant_id and m.role<>'patient'
    and m.status='active' and m.valid_from<=now() and m.expires_at>now()
    and m.approved_by_subject_id is not null and m.approved_by_subject_id<>sub.id
  where c.kind='email' and c.provider='supabase' and c.status='verified' and c.normalized_value=lower(btrim(p_target_email))
    and sub.id<>p_subject_id
    and exists(select 1 from public.access_assignments x where x.subject_id=p_subject_id and x.tenant_id=p_tenant_id
      and x.resource_type='identity_contact' and x.resource_id=sub.id and x.purpose='security_administration'
      and x.status='active' and x.valid_from<=now() and x.expires_at>now())
    and (select count(*) from public.tenant_memberships m2 where m2.subject_id=sub.id and m2.role<>'patient'
      and m2.status='active' and m2.valid_from<=now() and m2.expires_at>now())=1;
  if target is null then raise exception using errcode='42501',message='WORKFORCE_REJECTED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||target::text,0));
  if exists(select 1 from public.workforce_invitation_dispatches d where d.tenant_id=p_tenant_id and d.target_subject_id=target
    and (d.status in ('prepared','uncertain') or d.created_at>now()-interval '15 minutes')) then
    raise exception using errcode='42501',message='WORKFORCE_REJECTED'; end if;
  insert into public.workforce_invitation_dispatches(tenant_id,actor_subject_id,target_subject_id,request_key,contact_digest)
    values(p_tenant_id,p_subject_id,target,p_request_key,encode(extensions.digest(convert_to(lower(btrim(p_target_email)),'UTF8'),'sha256'),'hex')) returning id into result;
  return result;
end;
$function$;

REVOKE ALL ON FUNCTION public.reserve_workforce_invitation(uuid, uuid, text, uuid, uuid, uuid, text, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.reserve_workforce_invitation(uuid, uuid, text, uuid, uuid, uuid, text, uuid) TO service_role;

CREATE FUNCTION public.resolve_workforce_context (
  p_provider_subject    uuid,
  p_provider_session_id uuid,
  p_verified_email      text,
  p_session_id          uuid DEFAULT NULL::uuid,
  p_subject_id          uuid DEFAULT NULL::uuid,
  p_tenant_id           uuid DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare result jsonb;
begin
  select jsonb_build_object('subjectId', sub.id, 'tenantId', m.tenant_id, 'role', m.role,
    'purpose', case m.role when 'operations' then 'operations' when 'support' then 'support'
      when 'auditor' then 'privacy_review' when 'admin' then 'security_administration'
      when 'release' then 'release_management' when 'clinician' then 'care_delivery' when 'pharmacy' then 'dispensing' end)
  into result
  from auth.users u
  join auth.sessions a on a.user_id=u.id and a.id=p_provider_session_id
    and (a.not_after is null or a.not_after>now())
    and a.aal::text in ('aal1','aal2')
  join public.external_identities e on e.provider='supabase' and e.provider_subject=u.id::text
  join public.subjects sub on sub.id=e.subject_id and sub.status='active'
  join public.subject_contacts c on c.subject_id=sub.id and c.provider='supabase'
    and c.kind='email' and c.status='verified' and c.normalized_value=lower(u.email)
  join public.tenant_memberships m on m.subject_id=sub.id and m.role<>'patient'
    and m.status='active' and m.valid_from<=now() and m.expires_at>now()
    and m.approved_by_subject_id is not null and m.approved_by_subject_id<>sub.id
  join public.tenants t on t.id=m.tenant_id and t.status='active'
  where u.id=p_provider_subject and u.email_confirmed_at is not null and not u.is_anonymous
    and (u.banned_until is null or u.banned_until<=now())
    and lower(u.email)=lower(btrim(p_verified_email))
    and (p_subject_id is null or sub.id=p_subject_id) and (p_tenant_id is null or t.id=p_tenant_id)
    and (select count(*) from public.tenant_memberships m2 where m2.subject_id=sub.id and m2.role<>'patient'
      and m2.status='active' and m2.valid_from<=now() and m2.expires_at>now())=1
    and (p_session_id is null or exists (
      select 1 from public.identity_sessions s where s.id=p_session_id and s.subject_id=sub.id
        and s.provider_session_id=a.id and s.status='active' and s.assurance='aal2' and a.aal::text='aal2'
        and s.session_class=case when m.role in ('admin','release') then 'privileged' else 'workforce' end
        and s.idle_expires_at>now() and s.absolute_expires_at>now()))
    and not exists (select 1 from public.identity_sessions bad where bad.provider_session_id=a.id
      and (bad.status<>'active' or bad.idle_expires_at<=now() or bad.absolute_expires_at<=now()));
  if result is null then raise exception using errcode='42501',message='WORKFORCE_REJECTED'; end if;
  return result;
end;
$function$;

COMMENT ON FUNCTION public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid) IS 'Server-only identity context; live Auth/session/membership checks. Grants no case access.';

REVOKE ALL ON FUNCTION public.resolve_workforce_context(uuid, uuid, text, uuid, uuid, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.resolve_workforce_context(uuid, uuid, text, uuid, uuid, uuid) TO service_role;

CREATE TABLE public.workforce_invitation_dispatches (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id         uuid                     NOT NULL,
  actor_subject_id  uuid                     NOT NULL,
  target_subject_id uuid                     NOT NULL,
  request_key       uuid                     NOT NULL,
  contact_digest    text                     NOT NULL,
  status            text                     DEFAULT 'prepared'::text NOT NULL,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  expires_at        timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
  provider_subject  uuid,
  finished_at       timestamp with time zone
);

ALTER TABLE public.workforce_invitation_dispatches
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workforce_invitation_dispatches
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_check CHECK (actor_subject_id <> target_subject_id);

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_check1 CHECK (expires_at > created_at AND expires_at <= (created_at + '00:15:00'::interval));

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_check2 CHECK ((status = 'prepared'::text) = (finished_at IS NULL));

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_check3 CHECK ((status = 'accepted'::text) = (provider_subject IS NOT NULL));

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_contact_digest_check CHECK (contact_digest ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_pkey PRIMARY KEY (id);

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_request_key_key UNIQUE (request_key);

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_status_check CHECK (status = ANY (ARRAY['prepared'::text, 'accepted'::text, 'uncertain'::text]));

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_target_subject_id_fkey FOREIGN KEY (target_subject_id) REFERENCES public.subjects(id);

ALTER TABLE public.workforce_invitation_dispatches
  ADD CONSTRAINT workforce_invitation_dispatches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

CREATE INDEX workforce_invitation_dispatches_target_subject_idx ON public.workforce_invitation_dispatches (target_subject_id);

CREATE INDEX workforce_invitation_dispatches_actor_idx ON public.workforce_invitation_dispatches (actor_subject_id);

CREATE INDEX workforce_invitation_dispatches_target_idx ON public.workforce_invitation_dispatches (tenant_id, target_subject_id, created_at);

CREATE TRIGGER workforce_dispatch_immutable
  BEFORE DELETE OR UPDATE ON public.workforce_invitation_dispatches
  FOR EACH ROW
  EXECUTE FUNCTION identity_private.guard_workforce_dispatch();

-- Explicit ACLs are required: generated diffs can omit Supabase default privileges.
REVOKE ALL ON public.workforce_invitation_dispatches FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION identity_private.guard_workforce_dispatch() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_workforce_invitation(uuid,uuid,text,uuid,uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_workforce_invitation(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_workforce_context(uuid,uuid,text,uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_workforce_invitation(uuid,uuid,text,uuid,uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_workforce_invitation(uuid,uuid) TO service_role;
