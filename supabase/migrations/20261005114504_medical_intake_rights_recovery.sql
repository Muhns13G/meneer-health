-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE OR REPLACE FUNCTION intake_private.audit (
  t     uuid,
  s     uuid,
  a     uuid,
  r     text,
  event text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare correlation uuid:=gen_random_uuid();i intake_private.intakes;
begin
 select * into i from intake_private.intakes where tenant_id=t and subject_id=s order by updated_at desc,id desc limit 1;
 perform audit_private.append_audit_fact(t,case when r='patient' then 'patient' else 'workforce' end,a,r,
 case when r='patient' then 'aal1' else 'aal2' end,event,s,'medical_intake',coalesce(i.id::text||':'||i.snapshot_id::text,s::text),
 case r when 'patient' then 'account' when 'admin' then 'security_administration' when 'auditor' then 'privacy_review' when 'operations' then 'operations' else 'care_delivery' end,
 'medical-intake-v1','succeeded','INTAKE_FACT_RECORDED',correlation::text,correlation::text,clock_timestamp(),jsonb_build_object('aggregateVersion',i.version));
end $function$;

CREATE OR REPLACE FUNCTION intake_private.medical_grant (
  c       jsonb,
  target  uuid,
  purpose text
)
  RETURNS intake_private.access_grants
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;i intake_private.intakes;g intake_private.access_grants;begin
 ctx:=intake_private.workforce(c);
 select * into i from intake_private.intakes where id=target and tenant_id=(c->>'tenantId')::uuid;
 if i.id is null or i.restore_quarantined or i.state='deleted' or (i.state='restricted' and purpose<>'medical_rights')
 or (purpose in('medical_review','medical_safety') and ctx->>'role'<>'clinician')
 or (purpose='medical_transfer' and ctx->>'role' not in('clinician','operations'))
 or (purpose='medical_rights' and ctx->>'role'<>'auditor') then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 if purpose not in('medical_review','medical_safety','medical_transfer','medical_rights') or not exists(select 1 from public.operations_cases o join public.subjects s on s.id=o.subject_id
 where o.id=i.case_id and s.status='active' and (purpose='medical_rights' or o.state not in('cancelled','provider_outcome_recorded'))) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 if ctx->>'role'='operations' and not exists(select 1 from public.operations_assignments a where a.case_id=i.case_id and a.workforce_subject_id=(c->>'subjectId')::uuid
 and a.starts_at<=clock_timestamp() and a.expires_at>clock_timestamp() and a.revoked_at is null) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select * into g from intake_private.access_grants where intake_id=i.id and actor_subject_id=(c->>'subjectId')::uuid and intake_private.access_grants.purpose=medical_grant.purpose
 and snapshot_id=i.snapshot_id and starts_at<=clock_timestamp() and expires_at>clock_timestamp() and revoked_at is null order by starts_at desc,id desc limit 1;
 if g.id is null or (i.state='draft' and i.expires_at<=clock_timestamp() and not i.safety_hold and purpose<>'medical_rights')
 or not exists(select 1 from public.tenant_memberships m where m.tenant_id=i.tenant_id and m.subject_id=g.clinical_approver and m.role='clinician' and m.status='active' and m.expires_at>clock_timestamp())
 or not exists(select 1 from public.tenant_memberships m where m.tenant_id=i.tenant_id and m.subject_id=g.security_approver and m.role='admin' and m.status='active' and m.expires_at>clock_timestamp())
 then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;return g;end $function$;

CREATE OR REPLACE FUNCTION intake_private.patient_authority (
  c jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare account jsonb;begin
 if exists(select 1 from intake_private.intakes where tenant_id=(c->>'tenantId')::uuid and subject_id=(c->>'subjectId')::uuid and restore_quarantined) then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 if c is null or (select count(*) from jsonb_object_keys(c))<>7 or c->>'purpose'<>'account' then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 account:=public.read_patient_portal((c->>'tenantId')::uuid,(c->>'subjectId')::uuid,(c->>'sessionId')::uuid,
 (c->>'providerSubject')::uuid,(c->>'providerSessionId')::uuid,c->>'verifiedEmail','account');
 if not exists(select 1 from public.identity_sessions s join auth.sessions a on a.id=s.provider_session_id
 join public.tenant_memberships m on m.subject_id=s.subject_id and m.tenant_id=(c->>'tenantId')::uuid and m.role='patient' and m.status='active'
 where s.id=(c->>'sessionId')::uuid and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp()
 and (a.not_after is null or a.not_after>clock_timestamp()) and m.valid_from<=clock_timestamp() and (m.expires_at is null or m.expires_at>clock_timestamp())) then
 raise exception using errcode='42501',message='INTAKE_REJECTED';end if;return account;
end $function$;

CREATE FUNCTION intake_private.quarantine_restored_medical_intakes()
  RETURNS bigint
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare total bigint;
begin
 update intake_private.intakes set restore_quarantined=true;
 get diagnostics total=row_count;
 update intake_private.access_grants set revoked_at=clock_timestamp() where revoked_at is null;
 return total;
end $function$;

REVOKE ALL ON FUNCTION intake_private.quarantine_restored_medical_intakes() FROM PUBLIC;

CREATE FUNCTION intake_private.reconcile_restored_medical_intakes (
  p_exercise uuid,
  p_evidence uuid,
  p_ledger   jsonb
)
  RETURNS bigint
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare item jsonb;i intake_private.intakes;total bigint:=0;expected bigint;
begin
 if p_exercise is null or p_evidence is null or jsonb_typeof(p_ledger) is distinct from 'array' or jsonb_array_length(p_ledger)>10000 then raise exception using errcode='22023',message='MEDICAL_RESTORE_INVALID';end if;
 select count(*) into expected from intake_private.intakes;
 if jsonb_array_length(p_ledger)<>expected or exists(select 1 from intake_private.intakes where not restore_quarantined) then raise exception using errcode='42501',message='MEDICAL_RESTORE_NOT_QUARANTINED';end if;
 for item in select value from jsonb_array_elements(p_ledger) loop
  if jsonb_typeof(item) is distinct from 'object' or (select count(*) from jsonb_object_keys(item))<>7 or
   item->>'state' is null or item->>'state' not in('draft','submitted','restricted','deleted') or
   jsonb_typeof(item->'safetyHold') is distinct from 'boolean' or jsonb_typeof(item->'lifecycleHold') is distinct from 'boolean' then raise exception using errcode='22023',message='MEDICAL_RESTORE_INVALID';end if;
  select * into i from intake_private.intakes where id=(item->>'intakeId')::uuid and tenant_id=(item->>'tenantId')::uuid and subject_id=(item->>'subjectId')::uuid for update;
  if i.id is null or (item->>'version')::integer is null or (item->>'version')::integer<i.version or
   (i.state='deleted' and item->>'state'<>'deleted') or (i.state='restricted' and item->>'state' not in('restricted','deleted')) or
   (item->>'state'='deleted' and ((item->>'safetyHold')::boolean or (item->>'lifecycleHold')::boolean)) then raise exception using errcode='42501',message='MEDICAL_RESTORE_RECONCILIATION_FAILED';end if;
  insert into intake_private.restore_dispositions(exercise_id,intake_id,evidence_reference,state,safety_hold,lifecycle_hold,disposition_version)
  values(p_exercise,i.id,p_evidence,item->>'state',(item->>'safetyHold')::boolean,(item->>'lifecycleHold')::boolean,(item->>'version')::integer);
  update intake_private.intakes set state=item->>'state',safety_hold=(item->>'safetyHold')::boolean,lifecycle_hold=(item->>'lifecycleHold')::boolean,
   version=(item->>'version')::integer,envelope=case when item->>'state'='deleted' then null else envelope end where id=i.id;
  if item->>'state'='deleted' then update intake_private.snapshots set envelope=null where intake_id=i.id;end if;
  total:=total+1;
 end loop;
 if total<>expected then raise exception using errcode='42501',message='MEDICAL_RESTORE_RECONCILIATION_FAILED';end if;
 return total;
end $function$;

REVOKE ALL ON FUNCTION intake_private.reconcile_restored_medical_intakes(uuid, uuid, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION intake_private.snapshot_disposition_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
 if tg_op='UPDATE' and new.envelope is null and (to_jsonb(old)-'envelope')=(to_jsonb(new)-'envelope') and exists(select 1 from intake_private.intakes i
 where i.id=old.intake_id and i.state='deleted' and not i.safety_hold and not i.lifecycle_hold and
 (exists(select 1 from intake_private.lifecycle_events e where e.intake_id=i.id and e.event='disposition_approved') or
 (i.restore_quarantined and exists(select 1 from intake_private.restore_dispositions d where d.intake_id=i.id and d.state='deleted' and not d.safety_hold and not d.lifecycle_hold)))) then return new;end if;
 raise exception using errcode='55000',message='APPEND_ONLY_RECORD';
end $function$;

ALTER TABLE intake_private.intakes
  ADD COLUMN restore_quarantined boolean DEFAULT false NOT NULL;

CREATE TABLE intake_private.provider_disposition_receipts (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  transfer_id        uuid                     NOT NULL,
  approval_id        uuid                     NOT NULL,
  verified_by        uuid                     NOT NULL,
  evidence_reference uuid                     NOT NULL,
  request_key        uuid                     NOT NULL,
  recorded_at        timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.provider_disposition_receipts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.provider_disposition_receipts
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.provider_disposition_receipts
  ADD CONSTRAINT provider_disposition_receipts_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES intake_private.disposition_approvals(id);

ALTER TABLE intake_private.provider_disposition_receipts
  ADD CONSTRAINT provider_disposition_receipts_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.provider_disposition_receipts
  ADD CONSTRAINT provider_disposition_receipts_transfer_id_approval_id_key UNIQUE (transfer_id, approval_id);

ALTER TABLE intake_private.provider_disposition_receipts
  ADD CONSTRAINT provider_disposition_receipts_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES intake_private.transfers(id);

ALTER TABLE intake_private.provider_disposition_receipts
  ADD CONSTRAINT provider_disposition_receipts_transfer_id_request_key_key UNIQUE (transfer_id, request_key);

ALTER TABLE intake_private.provider_disposition_receipts
  ADD CONSTRAINT provider_disposition_receipts_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.subjects(id);

CREATE INDEX medical_provider_disposition_actor_idx ON intake_private.provider_disposition_receipts (verified_by);

CREATE INDEX medical_provider_disposition_approval_idx ON intake_private.provider_disposition_receipts (approval_id);

CREATE TRIGGER provider_disposition_append_only
  BEFORE DELETE OR UPDATE ON intake_private.provider_disposition_receipts
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.restore_dispositions (
  exercise_id         uuid                     NOT NULL,
  intake_id           uuid                     NOT NULL,
  evidence_reference  uuid                     NOT NULL,
  state               text                     NOT NULL,
  safety_hold         boolean                  NOT NULL,
  lifecycle_hold      boolean                  NOT NULL,
  disposition_version integer                  NOT NULL,
  recorded_at         timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.restore_dispositions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.restore_dispositions
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.restore_dispositions
  ADD CONSTRAINT restore_dispositions_disposition_version_check CHECK (disposition_version > 0);

ALTER TABLE intake_private.restore_dispositions
  ADD CONSTRAINT restore_dispositions_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.restore_dispositions
  ADD CONSTRAINT restore_dispositions_pkey PRIMARY KEY (exercise_id, intake_id);

ALTER TABLE intake_private.restore_dispositions
  ADD CONSTRAINT restore_dispositions_state_check CHECK (state = ANY (ARRAY['draft'::text, 'submitted'::text, 'restricted'::text, 'deleted'::text]));

CREATE INDEX medical_restore_disposition_intake_idx ON intake_private.restore_dispositions (intake_id);

CREATE TRIGGER restore_dispositions_append_only
  BEFORE DELETE OR UPDATE ON intake_private.restore_dispositions
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

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
declare a intake_private.disposition_approvals;i intake_private.intakes;g intake_private.access_grants;result uuid;
begin
 select * into a from intake_private.disposition_approvals where id=p_approval_id;
 g:=intake_private.medical_grant(p_context,a.intake_id,'medical_rights');
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'auditor','intake.disposition.completed');perform intake_private.workforce(p_context);return result;
end $function$;

CREATE FUNCTION public.patient_intake_export_view (
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
perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.export');perform intake_private.patient_authority(p_context);
return jsonb_build_object('record',jsonb_build_object('id',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'envelope',i.envelope,'state',i.state,'hasSubmitted',exists(select 1 from intake_private.snapshots s where s.intake_id=i.id),'safetyHold',i.safety_hold,'expiresAt',i.expires_at),
'publication',jsonb_build_object('id',p.id,'catalogueHash',p.catalogue_hash,'privacy',p.privacy_body,'reviewDeclaration',p.review_body,'recipientReference',p.recipient_reference,'urgentGuidance',p.urgent_guidance,'afterHoursGuidance',p.after_hours_guidance,'transferNotice',p.transfer_notice),'profile',account->'profile');end $function$;

REVOKE ALL ON FUNCTION public.patient_intake_export_view(jsonb, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.patient_intake_export_view(jsonb, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.patient_intake_history (
  p_context   jsonb,
  p_intake_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare i intake_private.intakes;items jsonb;begin
perform public.patient_intake_export_view(p_context,p_intake_id);
select * into i from intake_private.intakes where id=p_intake_id and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
if i.id is null or (select count(*) from intake_private.snapshots s where s.intake_id=i.id)>100 then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
select coalesce(jsonb_agg(jsonb_build_object('snapshotId',s.id,'version',s.version,'envelope',s.envelope,'publicationId',s.publication_id,'profileVersion',s.profile_version,'signatureAt',s.signature_at,'previousSnapshotId',s.previous_snapshot_id) order by s.version),'[]') into items from intake_private.snapshots s where s.intake_id=i.id;
perform intake_private.patient_authority(p_context);return items;end $function$;

CREATE FUNCTION public.patient_intake_rights_record (
  p_context jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare i intake_private.intakes;begin
perform intake_private.patient_authority(p_context);
select * into i from intake_private.intakes where tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid order by updated_at desc,id desc limit 1;
perform intake_private.patient_authority(p_context);
return case when i.id is null then null else jsonb_build_object('intakeId',i.id,'state',i.state) end;end $function$;

REVOKE ALL ON FUNCTION public.patient_intake_rights_record(jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.patient_intake_rights_record(jsonb) TO service_role;

CREATE FUNCTION public.reconcile_medical_provider_disposition (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'operations','intake.provider.disposition.reconciled');
 perform intake_private.workforce(p_context);return result;
end $function$;

REVOKE ALL ON FUNCTION public.reconcile_medical_provider_disposition(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.reconcile_medical_provider_disposition(jsonb, jsonb) TO service_role;
