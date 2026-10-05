-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION public.read_patient_portal_with_operations (
  p_tenant_id           uuid,
  p_subject_id          uuid,
  p_session_id          uuid,
  p_provider_subject    uuid,
  p_provider_session_id uuid,
  p_verified_email      text,
  p_purpose             text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare account jsonb; cases jsonb; correlation uuid:=gen_random_uuid();
begin
  account:=public.read_patient_portal(p_tenant_id,p_subject_id,p_session_id,
    p_provider_subject,p_provider_session_id,p_verified_email,p_purpose);
  if (select count(*) from public.operations_cases c where c.tenant_id=p_tenant_id and c.subject_id=p_subject_id)>100 then
    raise exception using errcode='54000',message='PORTAL_CAPACITY_EXCEEDED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('reference',c.id,'status',
    case c.state
      when 'onboarding_pending' then 'waiting'
      when 'ready_for_handoff' then 'handoff_pending'
      when 'handed_off' then 'handoff_recorded'
      when 'provider_acknowledged' then 'handoff_recorded'
      when 'provider_review_pending' then 'handoff_recorded'
      when 'provider_outcome_recorded' then 'completed'
      when 'handoff_exception' then 'paused'
      when 'cancelled' then 'paused'
    end,'updatedAt',c.updated_at) order by c.created_at,c.id),'[]'::jsonb) into cases
    from public.operations_cases c where c.tenant_id=p_tenant_id and c.subject_id=p_subject_id;
  perform audit_private.append_audit_fact(p_tenant_id,'patient',p_subject_id,'patient','aal1',
    'operations.client.status.read',p_subject_id,'operations',p_subject_id::text,'account',
    'sprint-10.8-v1','succeeded','OWN_STATUS_READ',correlation::text,correlation::text,
    clock_timestamp(),'{}');
  -- A volatile call gets fresh snapshots after audit-lock waiting. Never return stale authority.
  account:=public.read_patient_portal(p_tenant_id,p_subject_id,p_session_id,
    p_provider_subject,p_provider_session_id,p_verified_email,p_purpose);
  if not exists(select 1 from public.identity_sessions s join auth.sessions a
    on a.id=s.provider_session_id join public.tenant_memberships m on m.subject_id=s.subject_id
    and m.tenant_id=p_tenant_id and m.role='patient' and m.status='active'
    where s.id=p_session_id and s.subject_id=p_subject_id and s.status='active'
      and s.session_class='patient' and a.id=p_provider_session_id and a.user_id=p_provider_subject
      and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp()
      and (a.not_after is null or a.not_after>clock_timestamp())
      and m.valid_from<=clock_timestamp() and (m.expires_at is null or m.expires_at>clock_timestamp()))
    or exists(select 1 from public.pilot_instrument_publications d
      where d.id in(select (x->>'publicationId')::uuid from jsonb_array_elements(account->'instruments') x)
        and d.expires_at is not null and d.expires_at<=clock_timestamp()) then
    raise exception using errcode='42501',message='PORTAL_REJECTED';
  end if;
  return account||jsonb_build_object('operationsCases',cases);
end;
$function$;

COMMENT ON FUNCTION public.read_patient_portal_with_operations(uuid,uuid,uuid,uuid,uuid,text,text) IS 'Own active patient account and coarse case status only; audited, no internal reasons, outcomes or clinical fields. Browser execution denied.';

REVOKE ALL ON FUNCTION public.read_patient_portal_with_operations(uuid, uuid, uuid, uuid, uuid, text, text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.read_patient_portal_with_operations(uuid, uuid, uuid, uuid, uuid, text, text) TO service_role;
