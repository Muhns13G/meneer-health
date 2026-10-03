-- Read-only minimum operations projection. No claim, invitation or hand-off authority.
create function public.read_operations_queue(
  p_provider_subject uuid, p_provider_session_id uuid, p_verified_email text,
  p_session_id uuid, p_subject_id uuid, p_tenant_id uuid,
  p_case_id uuid default null, p_state text default null,
  p_after_created_at timestamptz default null, p_after_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare context jsonb; result jsonb;
begin
  if p_session_id is null or p_subject_id is null or p_tenant_id is null then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  context := public.resolve_workforce_context(p_provider_subject,p_provider_session_id,
    p_verified_email,p_session_id,p_subject_id,p_tenant_id);
  if context->>'role'<>'operations' or context->>'purpose'<>'operations' then
    raise exception using errcode='42501',message='QUEUE_REJECTED';
  end if;
  if (p_after_created_at is null) <> (p_after_id is null)
    or (p_case_id is not null and (p_state is not null or p_after_id is not null))
    or (p_state is not null and p_state not in ('onboarding_pending','ready_for_handoff',
      'handed_off','provider_acknowledged','provider_review_pending','provider_outcome_recorded',
      'handoff_exception','cancelled')) then
    raise exception using errcode='22023',message='QUEUE_INPUT_INVALID';
  end if;
  with scoped as (
    select c.*, a.workforce_subject_id, p.given_name,p.family_name,p.mobile_e164,
      p.contact_preference,p.mobile_verification_status,p.status as profile_status,
      exists(select 1 from public.subject_contacts sc where sc.subject_id=c.subject_id
        and sc.kind='email' and sc.status='verified') as email_verified,
      (select e.code from public.operations_exceptions e where e.case_id=c.id
        and e.tenant_id=c.tenant_id and e.subject_id=c.subject_id
        and e.resolution_of_exception_id is null
        and not exists(select 1 from public.operations_exceptions r where r.resolution_of_exception_id=e.id)
        order by e.recorded_at desc,e.id desc limit 1) as exception_code
    from public.operations_cases c
    join public.operations_assignments a on a.case_id=c.id and a.tenant_id=c.tenant_id
      and a.subject_id=c.subject_id and a.workforce_subject_id=p_subject_id
      and a.role='operations' and a.purpose='operations' and a.revoked_at is null
      and a.starts_at<=now() and a.expires_at>now()
    left join public.client_profiles p on p.tenant_id=c.tenant_id and p.subject_id=c.subject_id
    where c.tenant_id=p_tenant_id and (p_case_id is null or c.id=p_case_id)
      and (p_state is null or c.state=p_state)
      and (p_after_id is null or (c.created_at,c.id)>(p_after_created_at,p_after_id))
    order by c.created_at,c.id limit 26
  ), projected as (
    select created_at,id,jsonb_build_object(
      'caseId',id,'state',state,'version',version,'assignedOwner',workforce_subject_id,
      'createdAt',created_at,'updatedAt',updated_at,'profileActive',coalesce(profile_status='active',false),
      'emailVerified',email_verified,'exceptionCode',exception_code,
      'handoffReadiness','not_evaluated','paymentReadiness','not_evaluated') ||
      case when p_case_id is null then '{}'::jsonb else jsonb_build_object('profile',
        case when profile_status is null then null else jsonb_build_object(
          'givenName',given_name,'familyName',family_name,'status',profile_status,
          'maskedEmail',case when email_verified then '***@***' else null end,
          'maskedMobile',case when mobile_e164 is not null then '***' || right(mobile_e164,2) else null end,
          'contactPreference',contact_preference,'mobileVerificationStatus',mobile_verification_status)
        end) end as payload from scoped
  ), page as (select * from projected order by created_at,id limit 25)
  select case when p_case_id is not null then (select payload from page limit 1)
    else jsonb_build_object('cases',coalesce((select jsonb_agg(payload order by created_at,id) from page),'[]'::jsonb),
      'nextCursor',case when (select count(*) from projected)>25 then
        (select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at desc,id desc limit 1)
        else null end) end into result;
  if result is null then raise exception using errcode='42501',message='QUEUE_REJECTED'; end if;
  return result;
end;
$$;
revoke all on function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid)
  from public,anon,authenticated;
grant execute on function public.read_operations_queue(uuid,uuid,text,uuid,uuid,uuid,uuid,text,timestamptz,uuid) to service_role;
