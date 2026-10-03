-- Sprint 9.7: a server-only, own-patient, account-purpose projection.
-- Stable functions see one statement snapshot; browser roles retain no table/RPC authority.
create function public.read_patient_portal(
  p_tenant_id uuid, p_subject_id uuid, p_session_id uuid,
  p_provider_subject uuid, p_provider_session_id uuid, p_verified_email text, p_purpose text
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  profile jsonb;
  instruments jsonb;
  workflows jsonb;
begin
  if p_purpose is distinct from 'account' then
    raise exception using errcode = '42501', message = 'PORTAL_REJECTED';
  end if;
  select jsonb_build_object(
    'givenName', p.given_name, 'familyName', p.family_name, 'verifiedEmail', lower(u.email),
    'mobileE164', p.mobile_e164, 'mobileVerificationStatus', p.mobile_verification_status,
    'contactPreference', p.contact_preference, 'status', p.status, 'version', p.version,
    'createdAt', p.created_at, 'updatedAt', p.updated_at
  ) into profile
  from public.client_profiles p
  join public.subjects sub on sub.id = p.subject_id and sub.status = 'active'
  join public.tenants t on t.id = p.tenant_id and t.status = 'active'
  join public.tenant_memberships m on m.tenant_id = p.tenant_id and m.subject_id = p.subject_id
    and m.role = 'patient' and m.status = 'active' and m.valid_from <= now()
    and (m.expires_at is null or m.expires_at > now())
  join public.external_identities e on e.subject_id = sub.id and e.provider = 'supabase'
    and e.provider_subject = p_provider_subject::text
  join auth.users u on u.id = p_provider_subject and u.email_confirmed_at is not null
    and not u.is_anonymous and (u.banned_until is null or u.banned_until <= now())
  join auth.sessions a on a.id = p_provider_session_id and a.user_id = u.id
    and (a.not_after is null or a.not_after > now()) and a.aal::text in ('aal1','aal2')
  join public.identity_sessions s on s.id = p_session_id and s.subject_id = sub.id
    and s.provider_session_id = a.id and s.status = 'active' and s.session_class = 'patient'
    and s.idle_expires_at > now() and s.absolute_expires_at > now()
  where p.tenant_id = p_tenant_id and p.subject_id = p_subject_id and p.status = 'active'
    and lower(u.email) = lower(btrim(p_verified_email))
    and exists (select 1 from public.subject_contacts c where c.subject_id = sub.id
      and c.provider = 'supabase' and c.kind = 'email' and c.status = 'verified'
      and c.normalized_value = lower(u.email))
    and (select count(*) from public.tenant_memberships m2 where m2.subject_id = sub.id
      and m2.status = 'active' and m2.valid_from <= now()
      and (m2.expires_at is null or m2.expires_at > now())) = 1
    and (select l.event_type from public.pilot_account_lifecycle_events l
      where l.tenant_id = p.tenant_id and l.subject_id = sub.id
      order by l.recorded_at desc, l.id desc limit 1) = 'activated'
    and exists (select 1 from public.identity_invitations i
      where i.tenant_id = p.tenant_id and i.accepted_by_subject_id = sub.id
        and i.provider_subject = u.id::text and i.intended_role = 'patient'
        and i.status = 'accepted' and i.delivery_status = 'delivered'
        and i.contact_digest = encode(extensions.digest(convert_to(lower(btrim(u.email)), 'UTF8'), 'sha256'), 'hex'));
  if profile is null then
    raise exception using errcode = '42501', message = 'PORTAL_REJECTED';
  end if;
  select jsonb_agg(jsonb_build_object(
    'publicationId', d.id, 'instrumentId', d.instrument_id, 'version', d.instrument_version,
    'locale', d.locale, 'contentHash', d.content_sha256, 'body', d.document_body,
    'effectiveAt', d.effective_at, 'action', r.action, 'recordedAt', r.recorded_at
  ) order by d.instrument_id) into instruments
  from public.pilot_instrument_publications d
  join lateral (
    select r.action, r.recorded_at from public.pilot_instrument_receipts r
    where r.tenant_id = p_tenant_id and r.subject_id = p_subject_id and r.publication_id = d.id
      and r.content_sha256 = d.content_sha256 and r.instrument_version = d.instrument_version
      and r.locale = d.locale and r.instrument_id = d.instrument_id
      and r.action = case when d.instrument_id = 'pilot-account-terms' then 'accepted' else 'acknowledged' end
      and not exists (select 1 from public.pilot_instrument_receipt_events ev where ev.receipt_id = r.id)
    order by r.recorded_at desc, r.id desc limit 1
  ) r on true
  where d.instrument_id in ('pilot-account-terms','pilot-privacy-notice') and d.locale = 'en-ZA'
    and d.status = 'published' and d.published_at <= now() and d.effective_at <= now()
    and (d.expires_at is null or d.expires_at > now());
  if instruments is null or jsonb_array_length(instruments) <> 2 then
    raise exception using errcode = '42501', message = 'PORTAL_REJECTED';
  end if;
  -- Literal operations states only. Never project clinical, payment, product, protocol or notes.
  select coalesce(jsonb_agg(jsonb_build_object(
    'reference', w.id, 'dispatchState', w.dispatch_state, 'deliveryState', w.delivery_state,
    'cancellationState', w.cancellation_state, 'updatedAt', w.updated_at
  ) order by w.created_at, w.id), '[]'::jsonb) into workflows
  from public.workflow_instances w where w.tenant_id = p_tenant_id and w.subject_id = p_subject_id;
  return jsonb_build_object('profile', profile, 'instruments', instruments, 'workflows', workflows);
end;
$$;
revoke all on function public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text)
from public, anon, authenticated;
grant execute on function public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text) to service_role;
comment on function public.read_patient_portal(uuid,uuid,uuid,uuid,uuid,text,text) is
  'Server-only account projection; live provider/application session and exact current receipts required. No clinical or payment values.';
