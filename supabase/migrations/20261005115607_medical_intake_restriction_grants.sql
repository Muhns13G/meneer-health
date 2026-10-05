-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE OR REPLACE FUNCTION public.patient_intake_restrict (
  p_context          jsonb,
  p_intake_id        uuid,
  p_expected_version integer,
  p_request_key      uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare i intake_private.intakes;prior intake_private.lifecycle_events;begin
 perform intake_private.patient_authority(p_context);
 select * into i from intake_private.intakes where id=p_intake_id and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid for update;
 if i.id is null or i.state='deleted' then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 select * into prior from intake_private.lifecycle_events where intake_id=i.id and request_key=p_request_key;
 if prior.id is null then
 if i.version<>p_expected_version or i.state='restricted' then raise exception using errcode='40001',message='INTAKE_CONFLICT';end if;
 update intake_private.intakes set state='restricted',version=version+1,updated_at=clock_timestamp() where id=i.id returning * into i;
 insert into intake_private.lifecycle_events(intake_id,event,actor_subject_id,evidence_reference,request_key) values(i.id,'restricted',i.subject_id,p_request_key,p_request_key);
 update intake_private.access_grants set revoked_at=clock_timestamp() where intake_id=i.id and revoked_at is null and not (purpose='medical_safety' and i.safety_hold);
 perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.restrict');
 elsif prior.event<>'restricted' or prior.actor_subject_id<>i.subject_id then raise exception using errcode='40001',message='INTAKE_CONFLICT';end if;
 perform intake_private.patient_authority(p_context);
 return jsonb_build_object('intakeId',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',i.expires_at);end $function$;
