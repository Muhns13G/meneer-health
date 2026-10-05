CREATE OR REPLACE FUNCTION public.respond_medical_safety (
  p_context jsonb,
  p_command jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare g intake_private.access_grants;i intake_private.intakes;e intake_private.safety_events;result uuid;begin
 g:=intake_private.medical_grant(p_context,(p_command->>'intakeId')::uuid,'medical_safety');
 select * into i from intake_private.intakes where id=g.intake_id for update;
 if (p_command->>'snapshotId')::uuid<>i.snapshot_id or p_command->>'action' not in('acknowledged','reviewed') then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 select * into e from intake_private.safety_events where intake_id=i.id and request_key=(p_command->>'requestKey')::uuid;
 if e.id is not null then
 if e.actor_subject_id<>(p_context->>'subjectId')::uuid or e.event<>p_command->>'action' or e.evidence_reference is distinct from (p_command->>'evidenceReference')::uuid or e.snapshot_id<>i.snapshot_id then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;return e.id;end if;
 if not i.safety_hold then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 if p_command->>'action'='reviewed' and not exists(select 1 from intake_private.safety_events where intake_id=i.id and snapshot_id=i.snapshot_id and event='acknowledged') then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 insert into intake_private.safety_events(intake_id,snapshot_id,event,actor_subject_id,evidence_reference,request_key)
 values(i.id,i.snapshot_id,p_command->>'action',(p_context->>'subjectId')::uuid,(p_command->>'evidenceReference')::uuid,(p_command->>'requestKey')::uuid) returning id into result;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'clinician','intake.safety.'||(p_command->>'action'),i.id);
 perform intake_private.medical_grant(p_context,i.id,'medical_safety');
 -- Recheck the restricted safety grant before clearing its unresolved hold.
 if p_command->>'action'='reviewed' then update intake_private.intakes set safety_hold=false where id=i.id;end if;
 return result;end $function$;
