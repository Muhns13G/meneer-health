-- Sprint 5.12 durable security-decision evidence.
-- Operational telemetry remains in Cloudflare; this function stores only identified, allowlisted
-- denied authorisation and break-glass facts in the existing append-only audit chain.

create or replace function public.record_security_audit_event(
  p_tenant_id uuid,
  p_actor_type text,
  p_actor_id uuid,
  p_actor_role text,
  p_assurance text,
  p_action text,
  p_subject_id uuid,
  p_resource_type text,
  p_resource_id text,
  p_purpose text,
  p_policy_version text,
  p_reason_code text,
  p_correlation_id text,
  p_occurred_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  fact public.audit_events%rowtype;
begin
  if p_actor_type not in ('patient', 'workforce', 'service')
    or (p_actor_type = 'patient' and p_actor_role <> 'patient')
    or (p_actor_type = 'workforce' and p_actor_role not in (
      'clinician', 'pharmacy', 'operations', 'support', 'auditor', 'admin', 'release'
    ))
    or (p_actor_type = 'service' and p_actor_role <> 'service_identity')
    or p_assurance not in ('aal1', 'aal2', 'service')
    or p_action not in ('authorisation.denied', 'breakglass.denied')
    or p_resource_type !~ '^[a-z][a-z0-9_]{1,47}$'
    or length(btrim(p_resource_id)) = 0
    or p_purpose !~ '^[a-z][a-z_]{1,47}$'
    or length(btrim(p_policy_version)) = 0
    or p_reason_code !~ '^[A-Z][A-Z0-9_]{1,63}$'
    or length(btrim(p_correlation_id)) = 0
  then
    raise exception using errcode = '22023', message = 'SECURITY_AUDIT_CONTEXT_INVALID';
  end if;

  if p_action = 'breakglass.denied'
    and (p_actor_type <> 'workforce' or p_actor_role not in ('clinician', 'admin'))
  then
    raise exception using errcode = '42501', message = 'BREAK_GLASS_ROLE_FORBIDDEN';
  end if;

  fact := audit_private.append_audit_fact(
    p_tenant_id,
    p_actor_type,
    p_actor_id,
    p_actor_role,
    p_assurance,
    p_action,
    p_subject_id,
    p_resource_type,
    p_resource_id,
    p_purpose,
    p_policy_version,
    'denied',
    p_reason_code,
    p_correlation_id,
    p_correlation_id,
    p_occurred_at,
    jsonb_build_object('eventName', 'security.' || p_action)
  );

  return jsonb_build_object(
    'factId', fact.id,
    'sequence', fact.sequence,
    'eventHash', fact.event_hash
  );
end;
$$;

revoke all on function public.record_security_audit_event(
  uuid, text, uuid, text, text, text, uuid, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.record_security_audit_event(
  uuid, text, uuid, text, text, text, uuid, text, text, text, text, text, text, timestamptz
) to service_role;

comment on function public.record_security_audit_event(
  uuid, text, uuid, text, text, text, uuid, text, text, text, text, text, text, timestamptz
) is 'Server-only append boundary for identified denied authorisation and break-glass facts; raw request and health payloads are prohibited.';
