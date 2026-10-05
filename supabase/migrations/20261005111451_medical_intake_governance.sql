-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION intake_private.grant_immutable()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$begin
 if tg_op='DELETE' or (to_jsonb(old)-'revoked_at') is distinct from (to_jsonb(new)-'revoked_at') or old.revoked_at is not null or new.revoked_at is null then
 raise exception using errcode='55000',message='MEDICAL_GRANT_IMMUTABLE';end if;return new;end $function$;

CREATE FUNCTION intake_private.medical_grant (
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
 if i.id is null or i.state='deleted' or (i.state='restricted' and purpose<>'medical_rights')
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

REVOKE ALL ON FUNCTION intake_private.medical_grant(jsonb, uuid, text) FROM PUBLIC;

CREATE FUNCTION intake_private.review_payment_ready (
  target uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$select false$function$;

COMMENT ON FUNCTION intake_private.review_payment_ready(uuid) IS 'Closed until Sprint 11 supplies authoritative review-deposit evidence. No runtime or browser bypass.';

REVOKE ALL ON FUNCTION intake_private.review_payment_ready(uuid) FROM PUBLIC;

CREATE FUNCTION intake_private.snapshot_disposition_guard()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$begin
 if tg_op='UPDATE' and new.envelope is null and (to_jsonb(old)-'envelope')=(to_jsonb(new)-'envelope') and exists(select 1 from intake_private.intakes i
 where i.id=old.intake_id and i.state='deleted' and not i.safety_hold and not i.lifecycle_hold and exists(select 1 from intake_private.lifecycle_events e where e.intake_id=i.id and e.event='disposition_approved')) then return new;end if;
 raise exception using errcode='55000',message='APPEND_ONLY_RECORD';end $function$;

REVOKE ALL ON FUNCTION intake_private.snapshot_disposition_guard() FROM PUBLIC;

CREATE FUNCTION intake_private.workforce (
  c jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;begin
 if c is null or (select count(*) from jsonb_object_keys(c))<>7 then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 ctx:=public.resolve_workforce_context((c->>'providerSubject')::uuid,(c->>'providerSessionId')::uuid,c->>'verifiedEmail',(c->>'sessionId')::uuid,(c->>'subjectId')::uuid,(c->>'tenantId')::uuid);
 if ctx->>'purpose' is distinct from c->>'purpose' or not exists(select 1 from public.identity_sessions s join auth.sessions a on a.id=s.provider_session_id
 join public.tenant_memberships m on m.subject_id=s.subject_id and m.tenant_id=(c->>'tenantId')::uuid and m.role=ctx->>'role' and m.status='active'
 where s.id=(c->>'sessionId')::uuid and s.assurance='aal2' and a.aal::text='aal2' and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp()
 and (a.not_after is null or a.not_after>clock_timestamp()) and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()) then
 raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;return ctx;end $function$;

REVOKE ALL ON FUNCTION intake_private.workforce(jsonb) FROM PUBLIC;

ALTER TABLE intake_private.snapshots
  ALTER COLUMN envelope DROP NOT NULL;

ALTER TABLE intake_private.access_grants
  ADD COLUMN snapshot_id uuid NOT NULL;

ALTER TABLE intake_private.access_grants
  ADD COLUMN approval_id uuid NOT NULL;

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_approval_id_key UNIQUE (approval_id);

CREATE TRIGGER intake_grant_immutable
  BEFORE DELETE OR UPDATE ON intake_private.access_grants
  FOR EACH ROW
  EXECUTE FUNCTION intake_private.grant_immutable();

CREATE TABLE intake_private.disposition_approvals (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id          uuid                     NOT NULL,
  snapshot_id        uuid                     NOT NULL,
  clinical_approver  uuid                     NOT NULL,
  evidence_reference uuid                     NOT NULL,
  eligible_at        timestamp with time zone NOT NULL,
  request_key        uuid                     NOT NULL,
  recorded_at        timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.disposition_approvals
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.disposition_approvals
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.disposition_approvals
  ADD CONSTRAINT disposition_approvals_clinical_approver_fkey FOREIGN KEY (clinical_approver) REFERENCES public.subjects(id);

ALTER TABLE intake_private.disposition_approvals
  ADD CONSTRAINT disposition_approvals_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.disposition_approvals
  ADD CONSTRAINT disposition_approvals_intake_id_request_key_key UNIQUE (intake_id, request_key);

ALTER TABLE intake_private.disposition_approvals
  ADD CONSTRAINT disposition_approvals_pkey PRIMARY KEY (id);

CREATE INDEX intake_disposition_actor_idx ON intake_private.disposition_approvals (clinical_approver);

CREATE TRIGGER disposition_approvals_append_only
  BEFORE DELETE OR UPDATE ON intake_private.disposition_approvals
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.grant_approvals (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id         uuid                     NOT NULL,
  snapshot_id       uuid                     NOT NULL,
  target_subject_id uuid                     NOT NULL,
  purpose           text                     NOT NULL,
  fields            text[]                   NOT NULL,
  roster_reference  uuid                     NOT NULL,
  clinical_approver uuid                     NOT NULL,
  expires_at        timestamp with time zone NOT NULL,
  request_key       uuid                     NOT NULL,
  recorded_at       timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.grant_approvals
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.grant_approvals
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_check CHECK (target_subject_id <> clinical_approver);

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_clinical_approver_fkey FOREIGN KEY (clinical_approver) REFERENCES public.subjects(id);

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_fields_check CHECK (cardinality(fields) >= 1 AND cardinality(fields) <= 26);

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_intake_id_request_key_key UNIQUE (intake_id, request_key);

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES intake_private.grant_approvals(id);

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_purpose_check CHECK (purpose = ANY (ARRAY['medical_review'::text, 'medical_transfer'::text, 'medical_safety'::text, 'medical_rights'::text]));

ALTER TABLE intake_private.grant_approvals
  ADD CONSTRAINT grant_approvals_target_subject_id_fkey FOREIGN KEY (target_subject_id) REFERENCES public.subjects(id);

CREATE INDEX intake_grant_approval_clinical ON intake_private.grant_approvals (clinical_approver);

CREATE INDEX intake_grant_approval_target ON intake_private.grant_approvals (target_subject_id);

CREATE TRIGGER grant_approvals_append_only
  BEFORE DELETE OR UPDATE ON intake_private.grant_approvals
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

ALTER TABLE intake_private.intakes
  ADD COLUMN lifecycle_hold boolean DEFAULT false NOT NULL;

ALTER TABLE intake_private.intakes
  ADD COLUMN retention_until timestamp with time zone;

CREATE UNIQUE INDEX intake_one_episode_idx ON intake_private.intakes (tenant_id, subject_id, publication_id)
  WHERE state <> 'deleted'::text;

CREATE TABLE intake_private.notification_attempts (
  lease_id        uuid                     NOT NULL,
  notification_id uuid                     NOT NULL,
  attempt         integer                  NOT NULL,
  recorded_at     timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.notification_attempts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notification_attempts
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notification_attempts
  ADD CONSTRAINT notification_attempts_notification_id_attempt_key UNIQUE (notification_id, attempt);

ALTER TABLE intake_private.notification_attempts
  ADD CONSTRAINT notification_attempts_pkey PRIMARY KEY (lease_id);

CREATE TRIGGER notification_attempts_append_only
  BEFORE DELETE OR UPDATE ON intake_private.notification_attempts
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.notification_receipts (
  lease_id    uuid                     NOT NULL,
  outcome     text                     NOT NULL,
  recorded_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.notification_receipts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notification_receipts
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notification_receipts
  ADD CONSTRAINT notification_receipts_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES intake_private.notification_attempts(lease_id);

ALTER TABLE intake_private.notification_receipts
  ADD CONSTRAINT notification_receipts_outcome_check CHECK (outcome = ANY (ARRAY['accepted'::text, 'retryable'::text, 'failed'::text, 'uncertain'::text]));

ALTER TABLE intake_private.notification_receipts
  ADD CONSTRAINT notification_receipts_pkey PRIMARY KEY (lease_id);

CREATE TRIGGER notification_receipts_append_only
  BEFORE DELETE OR UPDATE ON intake_private.notification_receipts
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.notifications (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id       uuid                     NOT NULL,
  flag_id         uuid                     NOT NULL,
  tier            text                     NOT NULL,
  state           text                     DEFAULT 'pending'::text NOT NULL,
  attempt         integer                  DEFAULT 0 NOT NULL,
  lease_id        uuid,
  lease_until     timestamp with time zone,
  next_attempt_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  created_at      timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.notifications
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notifications
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notifications
  ADD CONSTRAINT notifications_attempt_check CHECK (attempt >= 0 AND attempt <= 3);

ALTER TABLE intake_private.notifications
  ADD CONSTRAINT notifications_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES intake_private.safety_events(id);

ALTER TABLE intake_private.notifications
  ADD CONSTRAINT notifications_flag_id_tier_key UNIQUE (flag_id, tier);

ALTER TABLE intake_private.notifications
  ADD CONSTRAINT notifications_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.notifications
  ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.notification_attempts
  ADD CONSTRAINT notification_attempts_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES intake_private.notifications(id);

ALTER TABLE intake_private.notifications
  ADD CONSTRAINT notifications_state_check CHECK (state = ANY (ARRAY['pending'::text, 'leased'::text, 'accepted'::text, 'failed'::text, 'uncertain'::text]));

ALTER TABLE intake_private.notifications
  ADD CONSTRAINT notifications_tier_check CHECK (tier = ANY (ARRAY['primary'::text, 'fallback'::text]));

CREATE INDEX intake_notification_intake_idx ON intake_private.notifications (intake_id);

ALTER TABLE intake_private.publications
  ADD COLUMN transfer_notice text;

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_transfer_notice_check CHECK (transfer_notice IS NULL OR length(transfer_notice) >= 1 AND length(transfer_notice) <= 20000);

CREATE TABLE intake_private.transfer_authorisations (
  id                  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id           uuid                     NOT NULL,
  snapshot_id         uuid                     NOT NULL,
  publication_id      uuid                     NOT NULL,
  recipient_reference uuid                     NOT NULL,
  notice_hash         text                     NOT NULL,
  actor_subject_id    uuid                     NOT NULL,
  expires_at          timestamp with time zone DEFAULT (clock_timestamp() + '30 days'::interval) NOT NULL,
  request_key         uuid                     NOT NULL,
  recorded_at         timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.transfer_authorisations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.transfer_authorisations
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.transfer_authorisations
  ADD CONSTRAINT transfer_authorisations_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.transfer_authorisations
  ADD CONSTRAINT transfer_authorisations_intake_id_request_key_key UNIQUE (intake_id, request_key);

ALTER TABLE intake_private.transfer_authorisations
  ADD CONSTRAINT transfer_authorisations_intake_id_snapshot_id_fkey FOREIGN KEY (intake_id, snapshot_id) REFERENCES intake_private.snapshots(intake_id, id);

ALTER TABLE intake_private.transfer_authorisations
  ADD CONSTRAINT transfer_authorisations_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.transfer_authorisations
  ADD CONSTRAINT transfer_authorisations_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES intake_private.publications(id);

CREATE INDEX intake_transfer_auth_actor_idx ON intake_private.transfer_authorisations (actor_subject_id);

CREATE INDEX intake_transfer_auth_pub_idx ON intake_private.transfer_authorisations (publication_id);

CREATE TRIGGER transfer_authorisations_append_only
  BEFORE DELETE OR UPDATE ON intake_private.transfer_authorisations
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

ALTER TABLE intake_private.transfers
  ADD CONSTRAINT medical_transfer_authorisation_fk FOREIGN KEY (authorisation_receipt) REFERENCES intake_private.transfer_authorisations(id);

CREATE INDEX intake_transfer_auth_receipt_idx ON intake_private.transfers (authorisation_receipt);

CREATE OR REPLACE TRIGGER snapshots_append_only
  BEFORE DELETE OR UPDATE ON intake_private.snapshots
  FOR EACH ROW
  EXECUTE FUNCTION intake_private.snapshot_disposition_guard();

CREATE FUNCTION public.activate_medical_grant (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'admin','intake.grant.activated');perform intake_private.workforce(p_context);return result;end $function$;

REVOKE ALL ON FUNCTION public.activate_medical_grant(jsonb, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.activate_medical_grant(jsonb, uuid) TO service_role;

CREATE FUNCTION public.approve_medical_disposition (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'clinician','intake.disposition.approved');perform intake_private.workforce(p_context);return result;end $function$;

REVOKE ALL ON FUNCTION public.approve_medical_disposition(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.approve_medical_disposition(jsonb, jsonb) TO service_role;

CREATE FUNCTION public.approve_medical_grant (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'clinician','intake.grant.approved');perform intake_private.workforce(p_context);return result;end $function$;

REVOKE ALL ON FUNCTION public.approve_medical_grant(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.approve_medical_grant(jsonb, jsonb) TO service_role;

CREATE FUNCTION public.authorise_medical_transfer (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.transfer.authorised');perform intake_private.patient_authority(p_context);return result;end $function$;

REVOKE ALL ON FUNCTION public.authorise_medical_transfer(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.authorise_medical_transfer(jsonb, uuid, uuid, uuid, uuid) TO service_role;

CREATE FUNCTION public.claim_medical_safety_notification (
  p_tenant_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare claimed intake_private.notifications;episode intake_private.intakes;publication intake_private.publications;recipient uuid;address text;token uuid:=gen_random_uuid();begin
 perform pg_advisory_xact_lock(107,1);
 insert into intake_private.notification_receipts(lease_id,outcome)
 select lease_id,'uncertain' from intake_private.notifications where state='leased' and lease_until<=clock_timestamp() on conflict do nothing;
 update intake_private.notifications set state='uncertain' where state='leased' and lease_until<=clock_timestamp();
 if (select count(*) from audit_private.operations_alert_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+
 (select count(*) from intake_private.notification_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')>=50 then return null;end if;
 insert into intake_private.notifications(intake_id,flag_id,tier)
 select i.id,f.id,'primary' from intake_private.intakes i join public.tenants t on t.id=i.tenant_id and t.status='active'
 join lateral(select * from intake_private.safety_events f where f.intake_id=i.id and f.event='flagged' order by f.recorded_at desc,f.id desc limit 1)f on true
 where i.tenant_id=p_tenant_id and i.safety_hold and i.state not in('restricted','deleted') on conflict do nothing;
 insert into intake_private.notifications(intake_id,flag_id,tier)
 select n.intake_id,n.flag_id,'fallback' from intake_private.notifications n join intake_private.intakes i on i.id=n.intake_id
 join intake_private.publications p on p.id=i.publication_id where i.tenant_id=p_tenant_id and i.safety_hold and n.tier='primary'
 and (n.state in('failed','uncertain') or n.created_at+make_interval(secs=>p.acknowledgement_seconds)<=clock_timestamp())
 and not exists(select 1 from intake_private.safety_events e where e.intake_id=i.id and e.snapshot_id=i.snapshot_id and e.event='acknowledged' and e.recorded_at>=n.created_at)
 on conflict do nothing;
 select x.* into claimed from intake_private.notifications x join intake_private.intakes i on i.id=x.intake_id join public.tenants t on t.id=i.tenant_id and t.status='active'
 where i.tenant_id=p_tenant_id and i.safety_hold and i.state not in('restricted','deleted') and x.state='pending' and x.attempt<3 and x.next_attempt_at<=clock_timestamp()
 order by x.created_at,x.id limit 1 for update of x;
 if claimed.id is null then return null;end if;
 select * into episode from intake_private.intakes where id=claimed.intake_id;select * into publication from intake_private.publications where id=episode.publication_id;
 recipient:=case when claimed.tier='primary' then publication.primary_responder else publication.fallback_responder end;
 select c.normalized_value into address from public.subject_contacts c join public.tenant_memberships m on m.subject_id=c.subject_id and m.tenant_id=episode.tenant_id
 where c.subject_id=recipient and c.kind='email' and c.status='verified' and m.role='clinician' and m.status='active' and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()
 and publication.status='published' and publication.expires_at>clock_timestamp() limit 1;
 update intake_private.notifications set state='leased',attempt=attempt+1,lease_id=token,lease_until=clock_timestamp()+interval '2 minutes' where id=claimed.id returning * into claimed;
 insert into intake_private.notification_attempts(lease_id,notification_id,attempt) values(token,claimed.id,claimed.attempt);
 return jsonb_build_object('notificationId',claimed.id,'leaseId',token,'recipient',address);
end $function$;

REVOKE ALL ON FUNCTION public.claim_medical_safety_notification(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.claim_medical_safety_notification(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_operations_alert_notification (
  p_tenant_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare item audit_private.operations_alerts; cursor_row audit_private.operations_alert_dispatch; token uuid:=gen_random_uuid();
begin
  -- Global daily send-attempt budget leaves the shared free email allocation available for Auth.
  perform pg_advisory_xact_lock(107,1);
  insert into audit_private.operations_alert_delivery_facts(lease_id,outcome)
    select lease_id,'uncertain' from audit_private.operations_alert_dispatch
    where state='leased' and lease_until<=clock_timestamp() on conflict do nothing;
  update audit_private.operations_alert_dispatch set state='uncertain'
    where state='leased' and lease_until<=clock_timestamp();
  if (select count(*) from audit_private.operations_alert_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+(select count(*) from intake_private.notification_attempts where recorded_at>=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC')>=50 then return null; end if;
  insert into audit_private.operations_alert_dispatch(alert_id)
    select id from audit_private.operations_alerts where tenant_id=p_tenant_id on conflict do nothing;
  select a.* into item from audit_private.operations_alerts a join audit_private.operations_alert_dispatch d on d.alert_id=a.id
    where a.tenant_id=p_tenant_id and d.state='pending' and d.attempt<3 and d.next_attempt_at<=clock_timestamp()
    and not exists(select 1 from audit_private.operations_alert_responses r where r.alert_id=a.id)
    order by case a.severity when 'critical' then 0 else 1 end,a.recorded_at,a.id limit 1 for update of a;
  if item.id is null then return null; end if;
  -- Recheck after acquiring the alert lock: a responder may have committed while we waited.
  if exists(select 1 from audit_private.operations_alert_responses where alert_id=item.id) then return null; end if;
  update audit_private.operations_alert_dispatch set state='leased',attempt=attempt+1,lease_id=token,
    lease_until=clock_timestamp()+interval '2 minutes' where alert_id=item.id returning * into cursor_row;
  insert into audit_private.operations_alert_attempts(lease_id,alert_id,attempt) values(token,item.id,cursor_row.attempt);
  return jsonb_build_object('alertId',item.id,'leaseId',token,'code',item.code,'severity',item.severity,'owner',item.owner);
end$function$;

CREATE FUNCTION public.dispose_medical_intake (
  p_context     jsonb,
  p_approval_id uuid,
  p_request_key uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare a intake_private.disposition_approvals;i intake_private.intakes;g intake_private.access_grants;result uuid;begin
 select * into a from intake_private.disposition_approvals where id=p_approval_id;
 g:=intake_private.medical_grant(p_context,a.intake_id,'medical_rights');select * into i from intake_private.intakes where id=a.intake_id for update;
 if a.clinical_approver=(p_context->>'subjectId')::uuid or a.snapshot_id<>i.snapshot_id or a.eligible_at>clock_timestamp() or i.retention_until is null or i.retention_until>clock_timestamp()
 or i.safety_hold or i.lifecycle_hold or exists(select 1 from intake_private.transfers where intake_id=i.id) then raise exception using errcode='42501',message='MEDICAL_DISPOSITION_REJECTED';end if;
 insert into intake_private.lifecycle_events(intake_id,event,actor_subject_id,evidence_reference,request_key) values(i.id,'disposition_approved',(p_context->>'subjectId')::uuid,a.evidence_reference,p_request_key) returning id into result;
 update intake_private.intakes set state='deleted',envelope=null,version=version+1,updated_at=clock_timestamp() where id=i.id;
 update intake_private.snapshots set envelope=null where intake_id=i.id;
 update intake_private.access_grants set revoked_at=clock_timestamp() where intake_id=i.id and revoked_at is null;
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'auditor','intake.disposition.completed');perform intake_private.workforce(p_context);return result;end $function$;

REVOKE ALL ON FUNCTION public.dispose_medical_intake(jsonb, uuid, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.dispose_medical_intake(jsonb, uuid, uuid) TO service_role;

CREATE FUNCTION public.finish_medical_safety_notification (
  p_notification_id uuid,
  p_lease_id        uuid,
  p_outcome         text
)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare n intake_private.notifications;prior text;begin
 if p_outcome is null or p_outcome not in('accepted','retryable','failed','uncertain') then raise exception using errcode='22023',message='MEDICAL_INVALID';end if;
 select * into n from intake_private.notifications where id=p_notification_id for update;
 if n.id is null or not exists(select 1 from intake_private.notification_attempts where lease_id=p_lease_id and notification_id=n.id) then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 select outcome into prior from intake_private.notification_receipts where lease_id=p_lease_id;
 if prior is not null then if prior<>p_outcome then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;return true;end if;
 if n.state<>'leased' or n.lease_id<>p_lease_id or n.lease_until<=clock_timestamp() then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 insert into intake_private.notification_receipts(lease_id,outcome) values(p_lease_id,p_outcome);
 update intake_private.notifications set state=case when p_outcome='retryable' then case when attempt<3 then 'pending' else 'failed' end else p_outcome end,
 lease_until=null,next_attempt_at=clock_timestamp()+make_interval(secs=>case when attempt=1 then 60 else 300 end) where id=n.id;return true;end $function$;

REVOKE ALL ON FUNCTION public.finish_medical_safety_notification(uuid, uuid, text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.finish_medical_safety_notification(uuid, uuid, text) TO service_role;

CREATE FUNCTION public.list_medical_intakes (
  p_context jsonb,
  p_purpose text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare ctx jsonb;i intake_private.intakes;items jsonb:='[]';begin
 ctx:=intake_private.workforce(p_context);
 if (p_purpose in('medical_review','medical_safety') and ctx->>'role'<>'clinician') or (p_purpose='medical_transfer' and ctx->>'role' not in('clinician','operations'))
 or (p_purpose='medical_rights' and ctx->>'role'<>'auditor') or p_purpose not in('medical_review','medical_safety','medical_transfer','medical_rights') then raise exception using errcode='42501',message='MEDICAL_REJECTED';end if;
 for i in select x.* from intake_private.intakes x where x.tenant_id=(p_context->>'tenantId')::uuid and exists(select 1 from intake_private.access_grants g
 where g.intake_id=x.id and g.actor_subject_id=(p_context->>'subjectId')::uuid and g.purpose=p_purpose and g.snapshot_id=x.snapshot_id and g.revoked_at is null and g.expires_at>clock_timestamp())
 order by x.updated_at desc,x.id limit 20 loop
 begin
 perform intake_private.medical_grant(p_context,i.id,p_purpose);
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,ctx->>'role','intake.medical.list');
 perform intake_private.medical_grant(p_context,i.id,p_purpose);
 items:=items||jsonb_build_array(jsonb_build_object('intakeId',i.id,'snapshotId',i.snapshot_id,'version',i.version,'state',i.state,'safetyHold',i.safety_hold));
 exception when insufficient_privilege then null;end;
 end loop;
 perform intake_private.workforce(p_context);return items;end $function$;

REVOKE ALL ON FUNCTION public.list_medical_intakes(jsonb, text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.list_medical_intakes(jsonb, text) TO service_role;

CREATE FUNCTION public.patient_intake_history (
  p_context   jsonb,
  p_intake_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare i intake_private.intakes;items jsonb;begin
 perform public.patient_intake_read(p_context,p_intake_id);
 select * into i from intake_private.intakes where id=p_intake_id and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
 if i.id is null or (select count(*) from intake_private.snapshots s where s.intake_id=i.id)>100 then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('snapshotId',s.id,'version',s.version,'envelope',s.envelope,'publicationId',s.publication_id,'profileVersion',s.profile_version,'signatureAt',s.signature_at,'previousSnapshotId',s.previous_snapshot_id) order by s.version),'[]') into items
 from intake_private.snapshots s where s.intake_id=i.id;
 perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.export');perform intake_private.patient_authority(p_context);return items;end $function$;

REVOKE ALL ON FUNCTION public.patient_intake_history(jsonb, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.patient_intake_history(jsonb, uuid) TO service_role;

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
 perform intake_private.audit((p_context->>'tenantId')::uuid,(p_context->>'subjectId')::uuid,(p_context->>'subjectId')::uuid,'patient','intake.read');
 perform intake_private.patient_authority(p_context);
 if not exists(select 1 from intake_private.publications live where live.id=p.id and live.status='published' and live.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 return jsonb_build_object('record',case when i.id is null then null else jsonb_build_object('id',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'envelope',i.envelope,'state',i.state,'hasSubmitted',exists(select 1 from intake_private.snapshots s where s.intake_id=i.id),'safetyHold',i.safety_hold,'expiresAt',i.expires_at) end,
 'publication',jsonb_build_object('id',p.id,'catalogueHash',p.catalogue_hash,'privacy',p.privacy_body,'reviewDeclaration',p.review_body,'recipientReference',p.recipient_reference,'urgentGuidance',p.urgent_guidance,'afterHoursGuidance',p.after_hours_guidance,'transferNotice',p.transfer_notice),
 'profile',account->'profile');end $function$;

CREATE FUNCTION public.patient_intake_restrict (
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
 update intake_private.access_grants set revoked_at=clock_timestamp() where intake_id=i.id and revoked_at is null;
 perform intake_private.audit(i.tenant_id,i.subject_id,i.subject_id,'patient','intake.restrict');
 elsif prior.event<>'restricted' or prior.actor_subject_id<>i.subject_id then raise exception using errcode='40001',message='INTAKE_CONFLICT';end if;
 perform intake_private.patient_authority(p_context);
 return jsonb_build_object('intakeId',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',i.expires_at);end $function$;

REVOKE ALL ON FUNCTION public.patient_intake_restrict(jsonb, uuid, integer, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.patient_intake_restrict(jsonb, uuid, integer, uuid) TO service_role;

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
 perform intake_private.audit(t,actor,actor,'patient','intake.'||action);
 perform intake_private.patient_authority(p_context);
 if not exists(select 1 from intake_private.publications live where live.id=p.id and live.status='published' and live.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 result:=jsonb_build_object('intakeId',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',snap,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',i.expires_at);
 insert into intake_private.commands(intake_id,request_key,digest,result,actor_subject_id) values(i.id,req,p_command->>'digest',result,actor);
 return result;end $function$;

CREATE FUNCTION public.read_medical_intake (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,ctx->>'role','intake.medical.read');
 if (intake_private.medical_grant(p_context,p_intake_id,p_purpose)).id<>g.id or not exists(select 1 from intake_private.intakes current where current.id=i.id and current.snapshot_id=i.snapshot_id) then raise exception using errcode='40001',message='MEDICAL_CONFLICT';end if;
 return jsonb_build_object('scope',jsonb_build_object('tenantId',i.tenant_id,'subjectId',i.subject_id,'intakeId',i.id,'snapshotId',i.snapshot_id,'collectionVersion','1.1.0','controlVersion','1.0.0'),
 'envelope',i.envelope,'fields',to_jsonb(g.fields),'version',i.version,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',least(g.expires_at,(select idle_expires_at from public.identity_sessions where id=(p_context->>'sessionId')::uuid)));end $function$;

REVOKE ALL ON FUNCTION public.read_medical_intake(jsonb, uuid, text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.read_medical_intake(jsonb, uuid, text) TO service_role;

CREATE FUNCTION public.reconcile_medical_transfer (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'operations','intake.transfer.reconciled');perform intake_private.workforce(p_context);return result;end $function$;

REVOKE ALL ON FUNCTION public.reconcile_medical_transfer(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.reconcile_medical_transfer(jsonb, jsonb) TO service_role;

CREATE FUNCTION public.record_medical_lifecycle_hold (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'auditor','intake.lifecycle.'||replace(p_command->>'event','_','.'));
 perform intake_private.medical_grant(p_context,i.id,'medical_rights');return result;end $function$;

REVOKE ALL ON FUNCTION public.record_medical_lifecycle_hold(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.record_medical_lifecycle_hold(jsonb, jsonb) TO service_role;

CREATE FUNCTION public.record_medical_transfer (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,ctx->>'role','intake.transfer.recorded');
 perform intake_private.medical_grant(p_context,i.id,'medical_transfer');return result;end $function$;

REVOKE ALL ON FUNCTION public.record_medical_transfer(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.record_medical_transfer(jsonb, jsonb) TO service_role;

CREATE FUNCTION public.respond_medical_safety (
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
 perform intake_private.audit(i.tenant_id,i.subject_id,(p_context->>'subjectId')::uuid,'clinician','intake.safety.'||(p_command->>'action'));
 perform intake_private.medical_grant(p_context,i.id,'medical_safety');return result;end $function$;

REVOKE ALL ON FUNCTION public.respond_medical_safety(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.respond_medical_safety(jsonb, jsonb) TO service_role;
