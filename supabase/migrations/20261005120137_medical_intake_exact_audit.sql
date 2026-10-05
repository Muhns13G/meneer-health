-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION intake_private.audit (
  t      uuid,
  s      uuid,
  a      uuid,
  r      text,
  event  text,
  target uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare correlation uuid:=gen_random_uuid();i intake_private.intakes;
begin
 if target is not null then
  select * into i from intake_private.intakes where id=target and tenant_id=t and subject_id=s;
  if i.id is null then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 end if;
 perform audit_private.append_audit_fact(t,case when r='patient' then 'patient' else 'workforce' end,a,r,
 case when r='patient' then 'aal1' else 'aal2' end,event,s,'medical_intake',coalesce(i.id::text||':'||i.snapshot_id::text,s::text),
 case r when 'patient' then 'account' when 'admin' then 'security_administration' when 'auditor' then 'privacy_review' when 'operations' then 'operations' else 'care_delivery' end,
 'medical-intake-v1','succeeded','INTAKE_FACT_RECORDED',correlation::text,correlation::text,clock_timestamp(),jsonb_build_object('aggregateVersion',i.version));
end $function$;

REVOKE ALL ON FUNCTION intake_private.audit(uuid, uuid, uuid, text, text, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.activate_medical_grant (
  p_context     jsonb,
  p_approval_id uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;a intake_private.grant_approvals;i intake_private.intakes;result uuid;begin
 ctx:=intake_private.workforce(p_context);select * into a from intake_private.grant_approvals where id=p_approval_id;
 select * into i from intake_private.intakes where id=a.intake_id and tenant_id=(p_context->>'tenantId')::uuid;
 if ctx->>'role'<>'admin' or i.id is null or (p_context->>'subjectId')::uuid in(a.target_subject_id,a.clinical_approver) or a.expires_at<=clock_timestamp()
 or a.snapshot_id<>i.snapshot_id then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select id into result from intake_private.access_grants where approval_id=a.id and security_approver=(p_context->>'subjectId')::uuid;
 if result is not null then return result;end if;
 if not exists(select 1 from public.tenant_memberships m where m.tenant_id=i.tenant_id and m.subject_id=a.clinical_approver and m.role='clinician' and m.status='active' and m.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 insert into intake_private.access_grants(intake_id,snapshot_id,actor_subject_id,purpose,fields,expires_at,clinical_approver,security_approver,roster_reference,approval_id)
 values(i.id,i.snapshot_id,a.target_subject_id,a.purpose,a.fields,a.expires_at,a.clinical_approver,(p_context->>'subjectId')::uuid,a.roster_reference,a.id) returning id into result;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'admin','intake.grant.activated',i.id);perform intake_private.workforce(p_context);return result;end $function$;

CREATE OR REPLACE FUNCTION public.approve_medical_disposition (
  p_context jsonb,
  p_command jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;i intake_private.intakes;p intake_private.publications;minimum_date timestamptz;result uuid;begin
 ctx:=intake_private.workforce(p_context);select * into i from intake_private.intakes where id=(p_command->>'intakeId')::uuid and tenant_id=(p_context->>'tenantId')::uuid for update;
 select * into p from intake_private.publications where id=i.publication_id;
 if i.id is null or ctx->>'role'<>'clinician' or (p_context->>'subjectId')::uuid not in(p.clinical_approver,p.primary_responder,p.fallback_responder)
 or i.safety_hold or i.lifecycle_hold or i.state='deleted' or (p_command->>'snapshotId')::uuid<>i.snapshot_id then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select max(created_at)+interval '6 years' into minimum_date from intake_private.snapshots where intake_id=i.id;
 if minimum_date is null then minimum_date:=i.expires_at;end if;
 if (p_command->>'eligibleAt')::timestamptz<minimum_date then raise exception using errcode='42501',message='MEDICAL_RETENTION_REQUIRED';end if;
 insert into intake_private.disposition_approvals(intake_id,snapshot_id,clinical_approver,evidence_reference,eligible_at,request_key)
 values(i.id,i.snapshot_id,(p_context->>'subjectId')::uuid,(p_command->>'evidenceReference')::uuid,(p_command->>'eligibleAt')::timestamptz,(p_command->>'requestKey')::uuid) returning id into result;
 update intake_private.intakes set retention_until=(p_command->>'eligibleAt')::timestamptz where id=i.id;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'clinician','intake.disposition.approved',i.id);perform intake_private.workforce(p_context);return result;end $function$;

CREATE OR REPLACE FUNCTION public.approve_medical_grant (
  p_context jsonb,
  p_command jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;i intake_private.intakes;p intake_private.publications;result uuid;begin
 ctx:=intake_private.workforce(p_context);
 select * into i from intake_private.intakes where id=(p_command->>'intakeId')::uuid and tenant_id=(p_context->>'tenantId')::uuid;
 select * into p from intake_private.publications where id=i.publication_id and status='published' and expires_at>clock_timestamp();
 if i.id is null or p.id is null or ctx->>'role'<>'clinician' or (p_context->>'subjectId')::uuid not in(p.clinical_approver,p.primary_responder,p.fallback_responder)
 or p_command->>'purpose' not in('medical_review','medical_transfer','medical_safety','medical_rights') or (p_command->>'targetSubjectId')::uuid=(p_context->>'subjectId')::uuid
 or not exists(select 1 from public.tenant_memberships m where m.tenant_id=i.tenant_id and m.subject_id=(p_command->>'targetSubjectId')::uuid and m.status='active' and m.expires_at>clock_timestamp()
 and m.role=case when p_command->>'purpose'='medical_rights' then 'auditor' when p_command->>'purpose'='medical_transfer' then m.role else 'clinician' end
 and (p_command->>'purpose'<>'medical_transfer' or m.role in('operations','clinician'))) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 if (p_command->>'snapshotId')::uuid<>i.snapshot_id or (p_command->>'expiresAt')::timestamptz<=clock_timestamp() or (p_command->>'expiresAt')::timestamptz>clock_timestamp()+interval '7 days' then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 if jsonb_array_length(p_command->'fields') not between 1 and 26 or exists(select 1 from jsonb_array_elements_text(p_command->'fields') f where f not in
 ('full_name','date_of_birth','identity_document','sex','contact','measurements','gp_contact','health_history','medications','allergies','diagnosed_conditions','family_history','lifestyle','mental_history','mental_safety','sexual_history','sti_symptoms','categories','category_ed','category_hair','category_weight','category_trt','category_peptides','accuracy_declaration','doctor_review_consent','signature')) then raise exception using errcode='22023',message='MEDICAL_INVALID';end if;
 insert into intake_private.grant_approvals(intake_id,snapshot_id,target_subject_id,purpose,fields,roster_reference,clinical_approver,expires_at,request_key)
 values(i.id,i.snapshot_id,(p_command->>'targetSubjectId')::uuid,p_command->>'purpose',array(select jsonb_array_elements_text(p_command->'fields')),(p_command->>'rosterReference')::uuid,
 (p_context->>'subjectId')::uuid,(p_command->>'expiresAt')::timestamptz,(p_command->>'requestKey')::uuid) returning id into result;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'clinician','intake.grant.approved',i.id);perform intake_private.workforce(p_context);return result;end $function$;

CREATE OR REPLACE FUNCTION public.authorise_medical_transfer (
  p_context        jsonb,
  p_intake_id      uuid,
  p_snapshot_id    uuid,
  p_publication_id uuid,
  p_request_key    uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare i intake_private.intakes;p intake_private.publications;a intake_private.transfer_authorisations;result uuid;begin
 perform intake_private.patient_authority(p_context);
 select * into i from intake_private.intakes where id=p_intake_id and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid for update;
 select * into p from intake_private.publications where id=i.publication_id and status='published' and expires_at>clock_timestamp() and transfer_notice is not null;
 if i.id is null or p.id is null or i.state<>'submitted' or i.safety_hold or i.snapshot_id<>p_snapshot_id or p.id<>p_publication_id then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into a from intake_private.transfer_authorisations where intake_id=i.id and request_key=p_request_key;
 if a.id is not null then if a.snapshot_id<>i.snapshot_id or a.publication_id<>p.id then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;return a.id;end if;
 insert into intake_private.transfer_authorisations(intake_id,snapshot_id,publication_id,recipient_reference,notice_hash,actor_subject_id,request_key)
 values(i.id,i.snapshot_id,p.id,p.recipient_reference,encode(extensions.digest(convert_to(p.transfer_notice,'UTF8'),'sha256'),'hex'),i.subject_id,p_request_key) returning id into result;
 perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.transfer.authorised',i.id);perform intake_private.patient_authority(p_context);return result;end $function$;

CREATE OR REPLACE FUNCTION public.dispose_medical_intake (
  p_context     jsonb,
  p_approval_id uuid,
  p_request_key uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare a intake_private.disposition_approvals;i intake_private.intakes;result uuid;
begin
 select * into a from intake_private.disposition_approvals where id=p_approval_id;
 perform intake_private.medical_grant(p_context,a.intake_id,'medical_rights');
 select * into i from intake_private.intakes where id=a.intake_id for update;
 if p_request_key is null or a.clinical_approver=(p_context->>'subjectId')::uuid or a.snapshot_id is distinct from i.snapshot_id or a.eligible_at>clock_timestamp()
 or i.retention_until is null or i.retention_until>clock_timestamp() or i.safety_hold or i.lifecycle_hold or i.restore_quarantined
 or exists(select 1 from intake_private.transfers t where t.intake_id=i.id and not exists(select 1 from intake_private.provider_disposition_receipts r where r.transfer_id=t.id and r.approval_id=a.id)) then
 raise exception using errcode='42501',message='MEDICAL_DISPOSITION_REJECTED';end if;
 insert into intake_private.lifecycle_events(intake_id,event,actor_subject_id,evidence_reference,request_key)
 values(i.id,'disposition_approved',(p_context->>'subjectId')::uuid,a.evidence_reference,p_request_key) returning id into result;
 update intake_private.intakes set state='deleted',envelope=null,version=version+1,updated_at=clock_timestamp() where id=i.id;
 update intake_private.snapshots set envelope=null where intake_id=i.id;
 update intake_private.access_grants set revoked_at=clock_timestamp() where intake_id=i.id and revoked_at is null;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'auditor','intake.disposition.completed',i.id);perform intake_private.workforce(p_context);return result;
end $function$;

CREATE OR REPLACE FUNCTION public.list_medical_intakes (
  p_context jsonb,
  p_purpose text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;i intake_private.intakes;items jsonb:='[]'::jsonb;begin
 ctx:=intake_private.workforce(p_context);
 if (p_purpose in('medical_review','medical_safety') and ctx->>'role'<>'clinician') or (p_purpose='medical_transfer' and ctx->>'role' not in('clinician','operations'))
 or (p_purpose='medical_rights' and ctx->>'role'<>'auditor') or p_purpose not in('medical_review','medical_safety','medical_transfer','medical_rights') then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 for i in select x.* from intake_private.intakes x where x.tenant_id=(p_context->>'tenantId')::uuid and exists(select 1 from intake_private.access_grants g
 where g.intake_id=x.id and g.actor_subject_id=(p_context->>'subjectId')::uuid and g.purpose=p_purpose and g.snapshot_id=x.snapshot_id and g.revoked_at is null and g.expires_at>clock_timestamp())
 order by x.updated_at desc,x.id limit 20 loop
 begin
 perform intake_private.medical_grant(p_context,i.id,p_purpose);
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,ctx->>'role','intake.medical.list',i.id);
 perform intake_private.medical_grant(p_context,i.id,p_purpose);
 items:=items||jsonb_build_array(jsonb_build_object('intakeId',i.id,'snapshotId',i.snapshot_id,'version',i.version,'state',i.state,'safetyHold',i.safety_hold));
 exception when insufficient_privilege then null;end;
 end loop;
 perform intake_private.workforce(p_context);return items;end $function$;

CREATE OR REPLACE FUNCTION public.patient_intake_export_view (
  p_context   jsonb,
  p_intake_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare account jsonb;i intake_private.intakes;p intake_private.publications;begin
account:=intake_private.patient_authority(p_context);
select * into i from intake_private.intakes where id=p_intake_id and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
if i.id is null then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
select * into p from intake_private.publications where id=i.publication_id;
perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.export',i.id);perform intake_private.patient_authority(p_context);
return jsonb_build_object('record',jsonb_build_object('id',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'envelope',i.envelope,'state',i.state,'hasSubmitted',exists(select 1 from intake_private.snapshots s where s.intake_id=i.id),'safetyHold',i.safety_hold,'expiresAt',i.expires_at),
'publication',jsonb_build_object('id',p.id,'catalogueHash',p.catalogue_hash,'privacy',p.privacy_body,'reviewDeclaration',p.review_body,'recipientReference',p.recipient_reference,'urgentGuidance',p.urgent_guidance,'afterHoursGuidance',p.after_hours_guidance,'transferNotice',p.transfer_notice),'profile',account->'profile');end $function$;

CREATE OR REPLACE FUNCTION public.patient_intake_read (
  p_context   jsonb,
  p_intake_id uuid  DEFAULT NULL::uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare account jsonb;i intake_private.intakes;p intake_private.publications;begin
 account:=intake_private.patient_authority(p_context);
 if p_intake_id is null then
 select * into p from intake_private.publications where tenant_id=(p_context->>'tenantId')::uuid and status='published'
 and effective_at<=clock_timestamp() and expires_at>clock_timestamp() order by effective_at desc,id desc limit 1;
 if p.id is null then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 select * into i from intake_private.intakes where tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid
 and publication_id=p.id and state<>'deleted';
 else
 select * into i from intake_private.intakes where id=p_intake_id and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
 if i.id is null then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 select * into p from intake_private.publications where id=i.publication_id;
 end if;
 if i.id is not null and (i.state in('restricted','deleted') or (i.state='draft' and i.expires_at<=clock_timestamp() and not i.safety_hold)) then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 if p.status<>'published' or p.effective_at>clock_timestamp() or p.expires_at<=clock_timestamp() then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 if i.id is not null and not exists(select 1 from intake_private.notice_receipts n where n.intake_id=i.id and n.publication_id=p.id and n.actor_subject_id=i.subject_id) then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 perform intake_private.audit((p_context->>'tenantId')::uuid,(p_context->>'subjectId')::uuid,(p_context->>'subjectId')::uuid,'patient','intake.read',i.id);
 perform intake_private.patient_authority(p_context);
 if not exists(select 1 from intake_private.publications live where live.id=p.id and live.status='published' and live.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 return jsonb_build_object('record',case when i.id is null then null else jsonb_build_object('id',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'envelope',i.envelope,'state',i.state,'hasSubmitted',exists(select 1 from intake_private.snapshots s where s.intake_id=i.id),'safetyHold',i.safety_hold,'expiresAt',i.expires_at) end,
 'publication',jsonb_build_object('id',p.id,'catalogueHash',p.catalogue_hash,'privacy',p.privacy_body,'reviewDeclaration',p.review_body,'recipientReference',p.recipient_reference,'urgentGuidance',p.urgent_guidance,'afterHoursGuidance',p.after_hours_guidance,'transferNotice',p.transfer_notice),
 'profile',account->'profile');end $function$;

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
 perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.restrict',i.id);
 elsif prior.event<>'restricted' or prior.actor_subject_id<>i.subject_id then raise exception using errcode='40001',message='INTAKE_CONFLICT';end if;
 perform intake_private.patient_authority(p_context);
 return jsonb_build_object('intakeId',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',i.expires_at);end $function$;

CREATE OR REPLACE FUNCTION public.patient_intake_write (
  p_context jsonb,
  p_command jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare account jsonb;i intake_private.intakes;p intake_private.publications;
 previous intake_private.commands;result jsonb;target_id uuid:=(p_command->>'intakeId')::uuid;req uuid:=(p_command->>'requestKey')::uuid;
 snap uuid:=(p_command->>'snapshotId')::uuid;action text:=p_command->>'action';actor uuid:=(p_context->>'subjectId')::uuid;t uuid:=(p_context->>'tenantId')::uuid;
 prior_snapshot uuid;new_case uuid;already_held boolean;begin
 account:=intake_private.patient_authority(p_context);
 if action is null or action not in('save','save_amendment','submit','amend') or p_command->>'digest' !~ '^[a-f0-9]{64}$' or req is null or snap is null then raise exception using errcode='22023',message='INTAKE_INVALID';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text||target_id::text,0));
 select * into i from intake_private.intakes where id=target_id;
 if i.id is not null and (i.tenant_id<>t or i.subject_id<>actor or i.state in('restricted','deleted')) then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 select * into p from intake_private.publications where id=(p_command->>'publicationId')::uuid and tenant_id=t and status='published' and effective_at<=clock_timestamp() and expires_at>clock_timestamp();
 if p.id is null or (i.id is not null and i.publication_id<>p.id) then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 select * into previous from intake_private.commands where intake_private.commands.intake_id=target_id and request_key=req;
 if previous.intake_id is not null then
 if previous.actor_subject_id<>actor or not previous.digest in(select jsonb_array_elements_text(p_command->'replayDigests')) then raise exception using errcode='40001',message='INTAKE_CONFLICT';end if;
 perform intake_private.patient_authority(p_context);return previous.result;end if;
 if coalesce(i.version,0)<>(p_command->>'expectedVersion')::integer or (i.id is null and action<>'save') or
 (action='save' and exists(select 1 from intake_private.snapshots where intake_private.snapshots.intake_id=i.id)) or (action in('amend','save_amendment') and not exists(select 1 from intake_private.snapshots where intake_private.snapshots.intake_id=i.id)) or (action='submit' and i.state<>'draft') then raise exception using errcode='40001',message='INTAKE_CONFLICT';end if;
 if not coalesce(intake_private.envelope_valid(p_command->'envelope',t,actor,target_id,snap),false) then raise exception using errcode='22023',message='INTAKE_INVALID';end if;
 if i.id is not null and i.state='draft' and i.expires_at<=clock_timestamp() and not i.safety_hold then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 if i.id is null then
 insert into public.operations_cases(tenant_id,subject_id) values(t,actor) returning id into new_case;
 insert into intake_private.intakes(id,tenant_id,subject_id,case_id,publication_id) values(target_id,t,actor,new_case,p.id) returning * into i;
 end if;
 select id into prior_snapshot from intake_private.snapshots where intake_id=i.id order by version desc limit 1;
 already_held:=i.safety_hold;
 insert into intake_private.notice_receipts(intake_id,publication_id,actor_subject_id) values(i.id,p.id,actor) on conflict do nothing;
 update intake_private.intakes set version=version+1,snapshot_id=snap,envelope=p_command->'envelope',
 state=case when action in('save','save_amendment') then 'draft' else 'submitted' end,safety_hold=safety_hold or (p_command->>'safetyFlag')::boolean,
 expires_at=clock_timestamp()+interval '30 days',updated_at=clock_timestamp() where id=i.id returning * into i;
 if action not in('save','save_amendment') then
 insert into intake_private.snapshots(id,intake_id,version,envelope,publication_id,profile_version,receipt_hash,previous_snapshot_id,actor_subject_id)
 values(snap,i.id,i.version,i.envelope,p.id,(account->'profile'->>'version')::integer,p_command->>'digest',
 (select id from intake_private.snapshots where intake_private.snapshots.id=prior_snapshot),actor);
 end if;
 if (p_command->>'safetyFlag')::boolean and not already_held then
 insert into intake_private.safety_events(intake_id,snapshot_id,event,actor_subject_id,request_key) values(i.id,snap,'flagged',actor,req);
 end if;
 perform intake_private.audit(t,actor,actor,'patient','intake.'||action,i.id);
 perform intake_private.patient_authority(p_context);
 if not exists(select 1 from intake_private.publications live where live.id=p.id and live.status='published' and live.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 result:=jsonb_build_object('intakeId',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',snap,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',i.expires_at);
 insert into intake_private.commands(intake_id,request_key,digest,result,actor_subject_id) values(i.id,req,p_command->>'digest',result,actor);
 return result;end $function$;

CREATE OR REPLACE FUNCTION public.read_medical_intake (
  p_context   jsonb,
  p_intake_id uuid,
  p_purpose   text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare g intake_private.access_grants;i intake_private.intakes;ctx jsonb;begin
 g:=intake_private.medical_grant(p_context,p_intake_id,p_purpose);ctx:=intake_private.workforce(p_context);
 select * into i from intake_private.intakes where id=p_intake_id;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,ctx->>'role','intake.medical.read',i.id);
 if (intake_private.medical_grant(p_context,p_intake_id,p_purpose)).id<>g.id or not exists(select 1 from intake_private.intakes current where current.id=i.id and current.snapshot_id=i.snapshot_id) then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 return jsonb_build_object('scope',jsonb_build_object('tenantId',i.tenant_id,'subjectId',i.subject_id,'intakeId',i.id,'snapshotId',i.snapshot_id,'collectionVersion','1.1.0','controlVersion','1.0.0'),
 'envelope',i.envelope,'fields',to_jsonb(g.fields),'version',i.version,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',least(g.expires_at,(select idle_expires_at from public.identity_sessions where id=(p_context->>'sessionId')::uuid)));end $function$;

CREATE OR REPLACE FUNCTION public.reconcile_medical_provider_disposition (
  p_context jsonb,
  p_command jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare ctx jsonb;t intake_private.transfers;a intake_private.disposition_approvals;i intake_private.intakes;prior intake_private.provider_disposition_receipts;result uuid;
begin
 ctx:=intake_private.workforce(p_context);
 select * into t from intake_private.transfers where id=(p_command->>'transferId')::uuid;
 select * into a from intake_private.disposition_approvals where id=(p_command->>'approvalId')::uuid and intake_id=t.intake_id;
 select * into i from intake_private.intakes where id=t.intake_id and tenant_id=(p_context->>'tenantId')::uuid for update;
 if ctx->>'role' is distinct from 'operations' or i.id is null or a.id is null or i.restore_quarantined
 or a.snapshot_id is distinct from i.snapshot_id or i.safety_hold or i.lifecycle_hold
 or (p_context->>'subjectId')::uuid in(t.entered_by,a.clinical_approver)
 or not exists(select 1 from public.operations_assignments x where x.case_id=i.case_id and x.workforce_subject_id=(p_context->>'subjectId')::uuid and x.revoked_at is null and x.starts_at<=clock_timestamp() and x.expires_at>clock_timestamp())
 or (p_command->>'evidenceReference') is null or (p_command->>'requestKey') is null then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into prior from intake_private.provider_disposition_receipts where transfer_id=t.id and (approval_id=a.id or request_key=(p_command->>'requestKey')::uuid);
 if prior.id is not null then
  if prior.approval_id<>a.id or prior.verified_by<>(p_context->>'subjectId')::uuid or prior.evidence_reference<>(p_command->>'evidenceReference')::uuid or prior.request_key<>(p_command->>'requestKey')::uuid then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
  return prior.id;
 end if;
 insert into intake_private.provider_disposition_receipts(transfer_id,approval_id,verified_by,evidence_reference,request_key)
 values(t.id,a.id,(p_context->>'subjectId')::uuid,(p_command->>'evidenceReference')::uuid,(p_command->>'requestKey')::uuid) returning id into result;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'operations','intake.provider.disposition.reconciled',i.id);
 perform intake_private.workforce(p_context);return result;
end $function$;

CREATE OR REPLACE FUNCTION public.reconcile_medical_transfer (
  p_context jsonb,
  p_command jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;t intake_private.transfers;i intake_private.intakes;prior intake_private.reconciliations;result uuid;begin
 ctx:=intake_private.workforce(p_context);if ctx->>'role'<>'operations' then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into t from intake_private.transfers where id=(p_command->>'transferId')::uuid;
 select * into i from intake_private.intakes where id=t.intake_id and tenant_id=(p_context->>'tenantId')::uuid for update;
 if i.id is null or t.entered_by=(p_context->>'subjectId')::uuid or t.snapshot_id<>i.snapshot_id or i.state<>'submitted' or i.safety_hold
 or not exists(select 1 from public.operations_assignments a where a.case_id=i.case_id and a.workforce_subject_id=(p_context->>'subjectId')::uuid and a.revoked_at is null and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp())
 then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into prior from intake_private.reconciliations where transfer_id=t.id;
 if prior.id is not null then if prior.request_key<>(p_command->>'requestKey')::uuid or prior.actor_subject_id<>(p_context->>'subjectId')::uuid or prior.evidence_reference<>(p_command->>'evidenceReference')::uuid then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;return prior.id;end if;
 insert into intake_private.reconciliations(transfer_id,actor_subject_id,evidence_reference,request_key) values(t.id,(p_context->>'subjectId')::uuid,(p_command->>'evidenceReference')::uuid,(p_command->>'requestKey')::uuid) returning id into result;
 update public.operations_cases set state='provider_acknowledged',version=version+1,updated_at=clock_timestamp() where id=i.case_id and state='handed_off';
 if not found then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'operations','intake.transfer.reconciled',i.id);perform intake_private.workforce(p_context);return result;end $function$;

CREATE OR REPLACE FUNCTION public.record_medical_lifecycle_hold (
  p_context jsonb,
  p_command jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare g intake_private.access_grants;i intake_private.intakes;result uuid;begin
 g:=intake_private.medical_grant(p_context,(p_command->>'intakeId')::uuid,'medical_rights');select * into i from intake_private.intakes where id=g.intake_id for update;
 if p_command->>'event' not in('hold_placed','hold_released') then raise exception using errcode='22023',message='MEDICAL_INVALID';end if;
 insert into intake_private.lifecycle_events(intake_id,event,actor_subject_id,evidence_reference,request_key)
 values(i.id,p_command->>'event',(p_context->>'subjectId')::uuid,(p_command->>'evidenceReference')::uuid,(p_command->>'requestKey')::uuid) returning id into result;
 update intake_private.intakes set lifecycle_hold=(p_command->>'event'='hold_placed') where id=i.id;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'auditor','intake.lifecycle.'||replace(p_command->>'event','_','.'),i.id);
 perform intake_private.medical_grant(p_context,i.id,'medical_rights');return result;end $function$;

CREATE OR REPLACE FUNCTION public.record_medical_transfer (
  p_context jsonb,
  p_command jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare g intake_private.access_grants;i intake_private.intakes;p intake_private.publications;ctx jsonb;
 a intake_private.transfer_authorisations;prior intake_private.transfers;o public.operations_cases;result uuid;begin
 g:=intake_private.medical_grant(p_context,(p_command->>'intakeId')::uuid,'medical_transfer');ctx:=intake_private.workforce(p_context);
 select * into i from intake_private.intakes where id=g.intake_id for update;select * into p from intake_private.publications where id=i.publication_id;
 if i.state<>'submitted' or i.safety_hold or i.snapshot_id<>(p_command->>'snapshotId')::uuid or p.status<>'published' or p.expires_at<=clock_timestamp() then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into prior from intake_private.transfers where intake_id=i.id and request_key=(p_command->>'requestKey')::uuid;
 if prior.id is not null then if prior.entered_by<>(p_context->>'subjectId')::uuid or prior.snapshot_id<>i.snapshot_id or prior.external_reference<>(p_command->>'externalReference')::uuid then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;return prior.id;end if;
 if not intake_private.review_payment_ready(i.id) then raise exception using errcode='P0001',message='MEDICAL_PAYMENT_NOT_READY';end if;
 select * into o from public.operations_cases where id=i.case_id for update;
 if o.state<>'ready_for_handoff' or o.version<>(p_command->>'caseVersion')::integer then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 if not exists(select 1 from public.operations_claims claim join public.operations_assignments assign on assign.id=claim.assignment_id
 where claim.case_id=o.id and claim.released_at is null and assign.revoked_at is null and assign.starts_at<=clock_timestamp() and assign.expires_at>clock_timestamp()
 and (ctx->>'role'='clinician' or claim.workforce_subject_id=(p_context->>'subjectId')::uuid)) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into a from intake_private.transfer_authorisations where intake_id=i.id and snapshot_id=i.snapshot_id and publication_id=p.id and recipient_reference=p.recipient_reference
 and notice_hash=encode(extensions.digest(convert_to(p.transfer_notice,'UTF8'),'sha256'),'hex') and expires_at>clock_timestamp() order by recorded_at desc,id desc limit 1;
 if a.id is null then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 insert into intake_private.transfers(intake_id,snapshot_id,recipient_reference,authorisation_receipt,entered_by,external_reference,request_key)
 values(i.id,i.snapshot_id,p.recipient_reference,a.id,(p_context->>'subjectId')::uuid,(p_command->>'externalReference')::uuid,(p_command->>'requestKey')::uuid) returning id into result;
 update public.operations_cases set state='handed_off',version=version+1,updated_at=clock_timestamp() where id=o.id;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,ctx->>'role','intake.transfer.recorded',i.id);
 perform intake_private.medical_grant(p_context,i.id,'medical_transfer');return result;end $function$;

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
 if p_command->>'action'='reviewed' then update intake_private.intakes set safety_hold=false where id=i.id;end if;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'clinician','intake.safety.'||(p_command->>'action'),i.id);
 perform intake_private.medical_grant(p_context,i.id,'medical_safety');return result;end $function$;
