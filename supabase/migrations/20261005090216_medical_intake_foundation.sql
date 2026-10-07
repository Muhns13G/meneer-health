-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE SCHEMA intake_private AUTHORIZATION postgres;

CREATE FUNCTION intake_private.audit (
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
  AS $function$declare correlation uuid:=gen_random_uuid();begin
 perform audit_private.append_audit_fact(t,case when r='patient' then 'patient' else 'workforce' end,a,r,
 case when r='patient' then 'aal1' else 'aal2' end,event,s,'medical_intake',s::text,
 case when r='patient' then 'account' else 'care_delivery' end,'medical-intake-v1','succeeded','INTAKE_FACT_RECORDED',
 correlation::text,correlation::text,clock_timestamp(),'{}');end $function$;

REVOKE ALL ON FUNCTION intake_private.audit(uuid, uuid, uuid, text, text) FROM PUBLIC;

CREATE FUNCTION intake_private.envelope_valid (
  e jsonb,
  t uuid,
  s uuid,
  i uuid,
  v uuid
)
  RETURNS boolean
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$select e is not null and jsonb_typeof(e)='object'
 and (select count(*) from jsonb_object_keys(e))=5 and e->>'algorithm'='AES-256-GCM'
 and e->>'keyId' ~ '^[a-z0-9-]{1,48}$' and e->>'nonce' ~ '^[A-Za-z0-9+/]{16}$'
 and length(e->>'ciphertext') between 24 and 100000 and e->>'ciphertext' ~ '^[A-Za-z0-9+/]+={0,2}$'
 and (select count(*) from jsonb_object_keys(e->'scope'))=6 and e->'scope'->>'tenantId'=t::text
 and e->'scope'->>'subjectId'=s::text and e->'scope'->>'intakeId'=i::text and e->'scope'->>'snapshotId'=v::text
 and e->'scope'->>'collectionVersion'='1.1.0' and e->'scope'->>'controlVersion'='1.0.0'$function$;

REVOKE ALL ON FUNCTION intake_private.envelope_valid(jsonb, uuid, uuid, uuid, uuid) FROM PUBLIC;

CREATE FUNCTION intake_private.patient_authority (
  c jsonb
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$declare account jsonb;begin
 if c is null or (select count(*) from jsonb_object_keys(c))<>7 or c->>'purpose'<>'account' then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 account:=public.read_patient_portal((c->>'tenantId')::uuid,(c->>'subjectId')::uuid,(c->>'sessionId')::uuid,
 (c->>'providerSubject')::uuid,(c->>'providerSessionId')::uuid,c->>'verifiedEmail','account');
 if not exists(select 1 from public.identity_sessions s join auth.sessions a on a.id=s.provider_session_id
 join public.tenant_memberships m on m.subject_id=s.subject_id and m.tenant_id=(c->>'tenantId')::uuid and m.role='patient' and m.status='active'
 where s.id=(c->>'sessionId')::uuid and s.idle_expires_at>clock_timestamp() and s.absolute_expires_at>clock_timestamp()
 and (a.not_after is null or a.not_after>clock_timestamp()) and m.valid_from<=clock_timestamp() and (m.expires_at is null or m.expires_at>clock_timestamp())) then
 raise exception using errcode='42501',message='INTAKE_REJECTED';end if;return account;
end $function$;

REVOKE ALL ON FUNCTION intake_private.patient_authority(jsonb) FROM PUBLIC;

CREATE FUNCTION intake_private.publication_immutable()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$begin
 if tg_op='DELETE' or (old.status<>'draft' and ((to_jsonb(old)-'status') is distinct from (to_jsonb(new)-'status') or new.status<>'withdrawn')) then
 raise exception using errcode='42501',message='INTAKE_PUBLICATION_IMMUTABLE';end if;return new;end $function$;

CREATE TABLE intake_private.access_grants (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id         uuid                     NOT NULL,
  actor_subject_id  uuid                     NOT NULL,
  purpose           text                     NOT NULL,
  fields            text[]                   NOT NULL,
  starts_at         timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  expires_at        timestamp with time zone NOT NULL,
  clinical_approver uuid                     NOT NULL,
  security_approver uuid                     NOT NULL,
  roster_reference  uuid                     NOT NULL,
  revoked_at        timestamp with time zone
);

ALTER TABLE intake_private.access_grants
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.access_grants
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_check CHECK (expires_at > starts_at AND expires_at <= (starts_at + '7 days'::interval));

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_check1 CHECK (clinical_approver <> actor_subject_id AND security_approver <> actor_subject_id AND clinical_approver <> security_approver);

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_clinical_approver_fkey FOREIGN KEY (clinical_approver) REFERENCES public.subjects(id);

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_fields_check CHECK (cardinality(fields) >= 1 AND cardinality(fields) <= 26);

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_purpose_check CHECK (purpose = ANY (ARRAY['medical_review'::text, 'medical_transfer'::text, 'medical_safety'::text, 'medical_rights'::text]));

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_security_approver_fkey FOREIGN KEY (security_approver) REFERENCES public.subjects(id);

CREATE INDEX intake_grant_scope_idx ON intake_private.access_grants (intake_id, actor_subject_id, purpose);

CREATE INDEX intake_grant_clinical_idx ON intake_private.access_grants (clinical_approver);

CREATE INDEX intake_grant_security_idx ON intake_private.access_grants (security_approver);

CREATE TABLE intake_private.commands (
  intake_id        uuid                     NOT NULL,
  request_key      uuid                     NOT NULL,
  digest           text                     NOT NULL,
  result           jsonb                    NOT NULL,
  actor_subject_id uuid                     NOT NULL,
  created_at       timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.commands
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.commands
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.commands
  ADD CONSTRAINT commands_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.commands
  ADD CONSTRAINT commands_digest_check CHECK (digest ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE intake_private.commands
  ADD CONSTRAINT commands_pkey PRIMARY KEY (intake_id, request_key);

CREATE INDEX intake_command_actor_idx ON intake_private.commands (actor_subject_id);

CREATE TRIGGER commands_append_only
  BEFORE DELETE OR UPDATE ON intake_private.commands
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.intakes (
  id             uuid                     NOT NULL,
  tenant_id      uuid                     NOT NULL,
  subject_id     uuid                     NOT NULL,
  case_id        uuid                     NOT NULL,
  publication_id uuid                     NOT NULL,
  version        integer                  DEFAULT 0 NOT NULL,
  snapshot_id    uuid,
  envelope       jsonb,
  state          text                     DEFAULT 'draft'::text NOT NULL,
  safety_hold    boolean                  DEFAULT false NOT NULL,
  expires_at     timestamp with time zone DEFAULT (clock_timestamp() + '30 days'::interval) NOT NULL,
  created_at     timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  updated_at     timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.intakes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.intakes
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.intakes
  ADD CONSTRAINT intakes_case_id_tenant_id_subject_id_fkey FOREIGN KEY (case_id, tenant_id, subject_id) REFERENCES public.operations_cases(id, tenant_id, subject_id);

ALTER TABLE intake_private.intakes
  ADD CONSTRAINT intakes_check CHECK (state = 'deleted'::text OR envelope IS NULL OR jsonb_typeof(envelope) = 'object'::text);

ALTER TABLE intake_private.intakes
  ADD CONSTRAINT intakes_id_tenant_id_subject_id_key UNIQUE (id, tenant_id, subject_id);

ALTER TABLE intake_private.intakes
  ADD CONSTRAINT intakes_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.access_grants
  ADD CONSTRAINT access_grants_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.commands
  ADD CONSTRAINT commands_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.intakes
  ADD CONSTRAINT intakes_state_check CHECK (state = ANY (ARRAY['draft'::text, 'submitted'::text, 'restricted'::text, 'deleted'::text]));

ALTER TABLE intake_private.intakes
  ADD CONSTRAINT intakes_version_check CHECK (version >= 0);

CREATE INDEX intake_publication_idx ON intake_private.intakes (publication_id);

CREATE INDEX intake_subject_idx ON intake_private.intakes (tenant_id, subject_id, created_at);

CREATE INDEX intake_case_idx ON intake_private.intakes (case_id);

CREATE TABLE intake_private.lifecycle_events (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id          uuid                     NOT NULL,
  event              text                     NOT NULL,
  actor_subject_id   uuid                     NOT NULL,
  evidence_reference uuid                     NOT NULL,
  request_key        uuid                     NOT NULL,
  recorded_at        timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.lifecycle_events
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.lifecycle_events
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.lifecycle_events
  ADD CONSTRAINT lifecycle_events_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.lifecycle_events
  ADD CONSTRAINT lifecycle_events_event_check
    CHECK (event = ANY (ARRAY['restricted'::text, 'hold_placed'::text, 'hold_released'::text, 'disposition_approved'::text, 'deleted'::text, 'restore_restricted'::text]));

ALTER TABLE intake_private.lifecycle_events
  ADD CONSTRAINT lifecycle_events_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.lifecycle_events
  ADD CONSTRAINT lifecycle_events_intake_id_request_key_key UNIQUE (intake_id, request_key);

ALTER TABLE intake_private.lifecycle_events
  ADD CONSTRAINT lifecycle_events_pkey PRIMARY KEY (id);

CREATE INDEX intake_lifecycle_actor_idx ON intake_private.lifecycle_events (actor_subject_id);

CREATE TRIGGER lifecycle_events_append_only
  BEFORE DELETE OR UPDATE ON intake_private.lifecycle_events
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.notice_receipts (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id        uuid                     NOT NULL,
  publication_id   uuid                     NOT NULL,
  actor_subject_id uuid                     NOT NULL,
  recorded_at      timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.notice_receipts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notice_receipts
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.notice_receipts
  ADD CONSTRAINT notice_receipts_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.notice_receipts
  ADD CONSTRAINT notice_receipts_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.notice_receipts
  ADD CONSTRAINT notice_receipts_intake_id_publication_id_actor_subject_id_key UNIQUE (intake_id, publication_id, actor_subject_id);

ALTER TABLE intake_private.notice_receipts
  ADD CONSTRAINT notice_receipts_pkey PRIMARY KEY (id);

CREATE INDEX intake_notice_actor_idx ON intake_private.notice_receipts (actor_subject_id);

CREATE INDEX intake_notice_pub_idx ON intake_private.notice_receipts (publication_id);

CREATE TRIGGER notice_receipts_append_only
  BEFORE DELETE OR UPDATE ON intake_private.notice_receipts
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.publications (
  id                      uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id               uuid                     NOT NULL,
  collection_version      text                     NOT NULL,
  control_version         text                     NOT NULL,
  catalogue_hash          text                     NOT NULL,
  privacy_body            text                     NOT NULL,
  review_body             text                     NOT NULL,
  recipient_reference     uuid                     NOT NULL,
  clinical_approver       uuid                     NOT NULL,
  privacy_approver        uuid                     NOT NULL,
  primary_responder       uuid                     NOT NULL,
  fallback_responder      uuid                     NOT NULL,
  acknowledgement_seconds integer                  NOT NULL,
  guidance_version        uuid                     NOT NULL,
  urgent_guidance         text                     NOT NULL,
  after_hours_guidance    text                     NOT NULL,
  effective_at            timestamp with time zone NOT NULL,
  expires_at              timestamp with time zone NOT NULL,
  status                  text                     DEFAULT 'draft'::text NOT NULL
);

ALTER TABLE intake_private.publications
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.publications
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_acknowledgement_seconds_check CHECK (acknowledgement_seconds >= 60 AND acknowledgement_seconds <= 86400);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_after_hours_guidance_check CHECK (length(after_hours_guidance) >= 1 AND length(after_hours_guidance) <= 4000);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_catalogue_hash_check CHECK (catalogue_hash ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_check CHECK (expires_at > effective_at);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_check1 CHECK (primary_responder <> fallback_responder);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_check2 CHECK (clinical_approver <> privacy_approver);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_clinical_approver_fkey FOREIGN KEY (clinical_approver) REFERENCES public.subjects(id);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_collection_version_check CHECK (collection_version = '1.1.0'::text);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_control_version_check CHECK (control_version = '1.0.0'::text);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_fallback_responder_fkey FOREIGN KEY (fallback_responder) REFERENCES public.subjects(id);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.intakes
  ADD CONSTRAINT intakes_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES intake_private.publications(id);

ALTER TABLE intake_private.notice_receipts
  ADD CONSTRAINT notice_receipts_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES intake_private.publications(id);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_primary_responder_fkey FOREIGN KEY (primary_responder) REFERENCES public.subjects(id);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_privacy_approver_fkey FOREIGN KEY (privacy_approver) REFERENCES public.subjects(id);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_privacy_body_check CHECK (length(privacy_body) >= 1 AND length(privacy_body) <= 20000);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_review_body_check CHECK (length(review_body) >= 1 AND length(review_body) <= 20000);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'withdrawn'::text]));

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);

ALTER TABLE intake_private.publications
  ADD CONSTRAINT publications_urgent_guidance_check CHECK (length(urgent_guidance) >= 1 AND length(urgent_guidance) <= 4000);

CREATE INDEX intake_publication_tenant ON intake_private.publications (tenant_id, status, effective_at);

CREATE TRIGGER intake_publication_immutable
  BEFORE DELETE OR UPDATE ON intake_private.publications
  FOR EACH ROW
  EXECUTE FUNCTION intake_private.publication_immutable();

CREATE TABLE intake_private.reconciliations (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  transfer_id        uuid                     NOT NULL,
  actor_subject_id   uuid                     NOT NULL,
  evidence_reference uuid                     NOT NULL,
  request_key        uuid                     NOT NULL,
  recorded_at        timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.reconciliations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.reconciliations
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.reconciliations
  ADD CONSTRAINT reconciliations_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.reconciliations
  ADD CONSTRAINT reconciliations_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.reconciliations
  ADD CONSTRAINT reconciliations_request_key_key UNIQUE (request_key);

ALTER TABLE intake_private.reconciliations
  ADD CONSTRAINT reconciliations_transfer_id_key UNIQUE (transfer_id);

CREATE INDEX intake_reconciliation_actor_idx ON intake_private.reconciliations (actor_subject_id);

CREATE TRIGGER reconciliations_append_only
  BEFORE DELETE OR UPDATE ON intake_private.reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.safety_events (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id          uuid                     NOT NULL,
  snapshot_id        uuid,
  event              text                     NOT NULL,
  actor_subject_id   uuid                     NOT NULL,
  evidence_reference uuid,
  request_key        uuid                     NOT NULL,
  recorded_at        timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.safety_events
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.safety_events
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.safety_events
  ADD CONSTRAINT safety_events_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.safety_events
  ADD CONSTRAINT safety_events_event_check
    CHECK (event = ANY (ARRAY['flagged'::text, 'acknowledged'::text, 'reviewed'::text, 'delivery_accepted'::text, 'delivery_uncertain'::text, 'fallback_required'::text]));

ALTER TABLE intake_private.safety_events
  ADD CONSTRAINT safety_events_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.safety_events
  ADD CONSTRAINT safety_events_intake_id_request_key_key UNIQUE (intake_id, request_key);

ALTER TABLE intake_private.safety_events
  ADD CONSTRAINT safety_events_pkey PRIMARY KEY (id);

CREATE INDEX intake_safety_actor_idx ON intake_private.safety_events (actor_subject_id);

CREATE INDEX intake_safety_scope_idx ON intake_private.safety_events (intake_id, recorded_at);

CREATE TRIGGER safety_events_append_only
  BEFORE DELETE OR UPDATE ON intake_private.safety_events
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.snapshots (
  id                   uuid                     NOT NULL,
  intake_id            uuid                     NOT NULL,
  version              integer                  NOT NULL,
  envelope             jsonb                    NOT NULL,
  publication_id       uuid                     NOT NULL,
  profile_version      integer                  NOT NULL,
  signature_at         timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
  receipt_hash         text                     NOT NULL,
  previous_snapshot_id uuid,
  actor_subject_id     uuid                     NOT NULL,
  created_at           timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.snapshots
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.snapshots
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_intake_id_id_key UNIQUE (intake_id, id);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_intake_id_version_key UNIQUE (intake_id, VERSION);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_previous_snapshot_id_fkey FOREIGN KEY (previous_snapshot_id) REFERENCES intake_private.snapshots(id);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_publication_id_fkey FOREIGN KEY (publication_id) REFERENCES intake_private.publications(id);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_receipt_hash_check CHECK (receipt_hash ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE intake_private.snapshots
  ADD CONSTRAINT snapshots_version_check CHECK (version > 0);

CREATE INDEX intake_snapshot_previous_idx ON intake_private.snapshots (previous_snapshot_id);

CREATE INDEX intake_snapshot_publication_idx ON intake_private.snapshots (publication_id);

CREATE INDEX intake_snapshot_actor_idx ON intake_private.snapshots (actor_subject_id);

CREATE TRIGGER snapshots_append_only
  BEFORE DELETE OR UPDATE ON intake_private.snapshots
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE intake_private.transfers (
  id                    uuid                     DEFAULT gen_random_uuid() NOT NULL,
  intake_id             uuid                     NOT NULL,
  snapshot_id           uuid                     NOT NULL,
  recipient_reference   uuid                     NOT NULL,
  authorisation_receipt uuid                     NOT NULL,
  entered_by            uuid                     NOT NULL,
  external_reference    uuid                     NOT NULL,
  request_key           uuid                     NOT NULL,
  recorded_at           timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE intake_private.transfers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE intake_private.transfers
  FORCE ROW LEVEL SECURITY;

ALTER TABLE intake_private.transfers
  ADD CONSTRAINT transfers_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.subjects(id);

ALTER TABLE intake_private.transfers
  ADD CONSTRAINT transfers_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES intake_private.intakes(id);

ALTER TABLE intake_private.transfers
  ADD CONSTRAINT transfers_intake_id_request_key_key UNIQUE (intake_id, request_key);

ALTER TABLE intake_private.transfers
  ADD CONSTRAINT transfers_intake_id_snapshot_id_fkey FOREIGN KEY (intake_id, snapshot_id) REFERENCES intake_private.snapshots(intake_id, id);

ALTER TABLE intake_private.transfers
  ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);

ALTER TABLE intake_private.reconciliations
  ADD CONSTRAINT reconciliations_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES intake_private.transfers(id);

CREATE INDEX intake_transfer_actor_idx ON intake_private.transfers (entered_by);

CREATE TRIGGER transfers_append_only
  BEFORE DELETE OR UPDATE ON intake_private.transfers
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE FUNCTION public.patient_intake_read (
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
 else
 select * into i from intake_private.intakes where id=p_intake_id and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
 if i.id is null or i.state in('restricted','deleted') or (i.state='draft' and i.expires_at<=clock_timestamp() and not i.safety_hold) then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 select * into p from intake_private.publications where id=i.publication_id;
 if p.status<>'published' or p.effective_at>clock_timestamp() or p.expires_at<=clock_timestamp() then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 end if;
 perform intake_private.audit((p_context->>'tenantId')::uuid,(p_context->>'subjectId')::uuid,(p_context->>'subjectId')::uuid,'patient','intake.read');
 perform intake_private.patient_authority(p_context);
 if not exists(select 1 from intake_private.publications live where live.id=p.id and live.status='published' and live.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 return jsonb_build_object('record',case when i.id is null then null else jsonb_build_object('id',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',i.snapshot_id,'envelope',i.envelope,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',i.expires_at) end,
 'publication',jsonb_build_object('id',p.id,'catalogueHash',p.catalogue_hash,'privacy',p.privacy_body,'reviewDeclaration',p.review_body,'recipientReference',p.recipient_reference,'urgentGuidance',p.urgent_guidance,'afterHoursGuidance',p.after_hours_guidance),
 'profile',account->'profile');end $function$;

REVOKE ALL ON FUNCTION public.patient_intake_read(jsonb, uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.patient_intake_read(jsonb, uuid) TO service_role;

CREATE FUNCTION public.patient_intake_write (
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
 prior_snapshot uuid;new_case uuid;begin
 account:=intake_private.patient_authority(p_context);
 if action not in('save','submit','amend') or p_command->>'digest' !~ '^[a-f0-9]{64}$' or req is null or snap is null then raise exception using errcode='22023',message='INTAKE_INVALID';end if;
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
 (action='save' and i.state='submitted') or (action='amend' and i.state<>'submitted') or (action='submit' and i.state<>'draft') then raise exception using errcode='40001',message='INTAKE_CONFLICT';end if;
 if not coalesce(intake_private.envelope_valid(p_command->'envelope',t,actor,target_id,snap),false) then raise exception using errcode='22023',message='INTAKE_INVALID';end if;
 if i.id is not null and i.state='draft' and i.expires_at<=clock_timestamp() and not i.safety_hold then raise exception using errcode='42501',message='INTAKE_REJECTED';end if;
 if i.id is null then
 insert into public.operations_cases(tenant_id,subject_id) values(t,actor) returning id into new_case;
 insert into intake_private.intakes(id,tenant_id,subject_id,case_id,publication_id) values(target_id,t,actor,new_case,p.id) returning * into i;
 end if;
 prior_snapshot:=i.snapshot_id;
 insert into intake_private.notice_receipts(intake_id,publication_id,actor_subject_id) values(i.id,p.id,actor) on conflict do nothing;
 update intake_private.intakes set version=version+1,snapshot_id=snap,envelope=p_command->'envelope',
 state=case when action='save' then 'draft' else 'submitted' end,safety_hold=safety_hold or (p_command->>'safetyFlag')::boolean,
 expires_at=clock_timestamp()+interval '30 days',updated_at=clock_timestamp() where id=i.id returning * into i;
 if action<>'save' then
 insert into intake_private.snapshots(id,intake_id,version,envelope,publication_id,profile_version,receipt_hash,previous_snapshot_id,actor_subject_id)
 values(snap,i.id,i.version,i.envelope,p.id,(account->'profile'->>'version')::integer,p_command->>'digest',
 (select id from intake_private.snapshots where intake_private.snapshots.id=prior_snapshot),actor);
 end if;
 if (p_command->>'safetyFlag')::boolean then
 insert into intake_private.safety_events(intake_id,snapshot_id,event,actor_subject_id,request_key) values(i.id,snap,'flagged',actor,req);
 end if;
 perform intake_private.audit(t,actor,actor,'patient','intake.'||action);
 perform intake_private.patient_authority(p_context);
 if not exists(select 1 from intake_private.publications live where live.id=p.id and live.status='published' and live.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='INTAKE_NOT_ACTIVE';end if;
 result:=jsonb_build_object('intakeId',i.id,'caseId',i.case_id,'version',i.version,'snapshotId',snap,'state',i.state,'safetyHold',i.safety_hold,'expiresAt',i.expires_at);
 insert into intake_private.commands(intake_id,request_key,digest,result,actor_subject_id) values(i.id,req,p_command->>'digest',result,actor);
 return result;end $function$;

REVOKE ALL ON FUNCTION public.patient_intake_write(jsonb, jsonb) FROM PUBLIC;

GRANT ALL ON FUNCTION public.patient_intake_write(jsonb, jsonb) TO service_role;
