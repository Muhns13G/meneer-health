-- Sprint 10.2: local schema diff, reviewed for replay and deny-default ACLs.
-- No staff API, scoped read/write command or provider hand-off is activated.
-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION identity_private.guard_handoff_authorisation_record()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if not exists (
    select 1 from public.pilot_instrument_receipts r
    join public.pilot_instrument_publications p on p.id = r.publication_id
    where r.id = new.receipt_id and r.tenant_id = new.tenant_id and r.subject_id = new.subject_id
      and r.instrument_id = 'pilot-handoff-authorisation' and r.action = 'accepted'
      and r.workflow_reference = new.case_id and r.recipient_reference = new.destination_id
      and r.purpose = 'operations' and r.recorded_at = new.authorised_at
      and p.status = 'published' and p.effective_at <= clock_timestamp()
      and (p.expires_at is null or p.expires_at > clock_timestamp())
      and new.expires_at > clock_timestamp()
      and not exists (select 1 from public.pilot_instrument_receipt_events e where e.receipt_id = r.id)
  ) then
    raise exception using errcode = '42501', message = 'HANDOFF_AUTHORISATION_INVALID';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION identity_private.guard_handoff_authorisation_record() FROM PUBLIC;

CREATE TABLE public.handoff_acknowledgements (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id          uuid                     NOT NULL,
  case_id            uuid                     NOT NULL,
  subject_id         uuid                     NOT NULL,
  attempt_id         uuid                     NOT NULL,
  evidence_reference uuid                     NOT NULL,
  acknowledged_at    timestamp with time zone NOT NULL,
  actor_subject_id   uuid                     NOT NULL,
  idempotency_key    uuid                     NOT NULL,
  correlation_id     uuid                     NOT NULL,
  recorded_at        timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

COMMENT ON TABLE public.handoff_acknowledgements IS 'Immutable recipient evidence reference; not clinical approval.';

ALTER TABLE public.handoff_acknowledgements
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.handoff_acknowledgements
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.handoff_acknowledgements
  ADD CONSTRAINT handoff_acknowledgements_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id) ON DELETE RESTRICT;

ALTER TABLE public.handoff_acknowledgements
  ADD CONSTRAINT handoff_acknowledgements_attempt_id_key UNIQUE (attempt_id);

ALTER TABLE public.handoff_acknowledgements
  ADD CONSTRAINT handoff_acknowledgements_check CHECK (acknowledged_at <= recorded_at);

ALTER TABLE public.handoff_acknowledgements
  ADD CONSTRAINT handoff_acknowledgements_pkey PRIMARY KEY (id);

ALTER TABLE public.handoff_acknowledgements
  ADD CONSTRAINT handoff_acknowledgements_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);

CREATE INDEX handoff_acknowledgements_actor_idx ON public.handoff_acknowledgements (actor_subject_id);

CREATE TRIGGER handoff_acknowledgements_append_only
  BEFORE DELETE OR UPDATE ON public.handoff_acknowledgements
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE public.handoff_attempts (
  id                   uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id            uuid                     NOT NULL,
  case_id              uuid                     NOT NULL,
  subject_id           uuid                     NOT NULL,
  authorisation_id     uuid                     NOT NULL,
  claim_id             uuid                     NOT NULL,
  workforce_subject_id uuid                     NOT NULL,
  retry_of_attempt_id  uuid,
  state                text                     DEFAULT 'prepared'::text NOT NULL,
  request_key          uuid                     NOT NULL,
  request_digest       text                     NOT NULL,
  external_reference   uuid,
  delivered_at         timestamp with time zone,
  version              integer                  DEFAULT 1 NOT NULL,
  created_at           timestamp with time zone DEFAULT now() NOT NULL,
  updated_at           timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.handoff_attempts IS 'Idempotent attempt storage; no external delivery capability is activated.';

ALTER TABLE public.handoff_attempts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.handoff_attempts
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_check CHECK (retry_of_attempt_id IS NULL OR retry_of_attempt_id <> id);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_check1 CHECK ((state = 'delivered'::text) = (delivered_at IS NOT NULL));

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_check2 CHECK (delivered_at IS NULL OR delivered_at >= created_at);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_check3 CHECK (updated_at >= created_at);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_id_tenant_id_case_id_subject_id_key UNIQUE (id, tenant_id, case_id, subject_id);

ALTER TABLE public.handoff_acknowledgements
  ADD CONSTRAINT handoff_acknowledgements_attempt_id_tenant_id_case_id_subj_fkey FOREIGN KEY (attempt_id, tenant_id, case_id, subject_id)
    REFERENCES public.handoff_attempts(id, tenant_id, case_id, subject_id) ON DELETE RESTRICT;

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_pkey PRIMARY KEY (id);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_request_digest_check CHECK (request_digest ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_retry_of_attempt_id_tenant_id_case_id_sub_fkey FOREIGN KEY (retry_of_attempt_id, tenant_id, case_id, subject_id)
    REFERENCES public.handoff_attempts(id, tenant_id, case_id, subject_id) ON DELETE RESTRICT;

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_state_check
    CHECK (state = ANY (ARRAY['prepared'::text, 'delivery_pending'::text, 'delivered'::text, 'failed'::text, 'uncertain'::text, 'cancelled'::text]));

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_tenant_id_request_key_key UNIQUE (tenant_id, request_key);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_version_check CHECK (version > 0);

CREATE UNIQUE INDEX handoff_attempts_one_unresolved ON public.handoff_attempts (authorisation_id)
  WHERE state = ANY (ARRAY['prepared'::text, 'delivery_pending'::text, 'uncertain'::text, 'delivered'::text]);

CREATE INDEX handoff_attempts_case_idx ON public.handoff_attempts (case_id, created_at);

CREATE INDEX handoff_attempts_claim_idx ON public.handoff_attempts (claim_id);

CREATE INDEX handoff_attempts_retry_idx ON public.handoff_attempts (retry_of_attempt_id)
  WHERE retry_of_attempt_id IS NOT NULL;

CREATE TABLE public.handoff_authorisations (
  id                  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id           uuid                     NOT NULL,
  case_id             uuid                     NOT NULL,
  subject_id          uuid                     NOT NULL,
  receipt_id          uuid                     NOT NULL,
  destination_id      uuid                     NOT NULL,
  destination_digest  text                     NOT NULL,
  destination_version integer                  NOT NULL,
  authorised_at       timestamp with time zone NOT NULL,
  expires_at          timestamp with time zone NOT NULL
);

COMMENT ON TABLE public.handoff_authorisations IS 'Immutable exact receipt and recipient-version binding; no provider URL.';

ALTER TABLE public.handoff_authorisations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.handoff_authorisations
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_check CHECK (expires_at > authorised_at AND expires_at <= (authorised_at + '30 days'::interval));

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_destination_digest_check CHECK (destination_digest ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_destination_version_check CHECK (destination_version > 0);

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_id_tenant_id_case_id_subject_id_key UNIQUE (id, tenant_id, case_id, subject_id);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_authorisation_id_tenant_id_case_id_subjec_fkey FOREIGN KEY (authorisation_id, tenant_id, case_id, subject_id)
    REFERENCES public.handoff_authorisations(id, tenant_id, case_id, subject_id) ON DELETE RESTRICT;

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_pkey PRIMARY KEY (id);

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_receipt_id_key UNIQUE (receipt_id);

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_receipt_id_tenant_id_subject_id_fkey FOREIGN KEY (receipt_id, tenant_id, subject_id)
    REFERENCES public.pilot_instrument_receipts(id, tenant_id, subject_id) ON DELETE RESTRICT;

CREATE INDEX handoff_authorisations_case_idx ON public.handoff_authorisations (case_id);

CREATE TRIGGER handoff_authorisations_append_only
  BEFORE DELETE OR UPDATE ON public.handoff_authorisations
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TRIGGER handoff_authorisations_receipt_guard
  BEFORE INSERT ON public.handoff_authorisations
  FOR EACH ROW
  EXECUTE FUNCTION identity_private.guard_handoff_authorisation_record();

CREATE TABLE public.operations_assignments (
  id                    uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id             uuid                     NOT NULL,
  case_id               uuid                     NOT NULL,
  subject_id            uuid                     NOT NULL,
  workforce_subject_id  uuid                     NOT NULL,
  role                  text                     DEFAULT 'operations'::text NOT NULL,
  purpose               text                     DEFAULT 'operations'::text NOT NULL,
  granted_by_subject_id uuid                     NOT NULL,
  starts_at             timestamp with time zone NOT NULL,
  expires_at            timestamp with time zone NOT NULL,
  revoked_at            timestamp with time zone,
  version               integer                  DEFAULT 1 NOT NULL,
  created_at            timestamp with time zone DEFAULT now() NOT NULL,
  updated_at            timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.operations_assignments IS 'Scoped operations membership grant; claim is not permission.';

ALTER TABLE public.operations_assignments
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operations_assignments
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_check CHECK (granted_by_subject_id <> workforce_subject_id);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_check1 CHECK (expires_at > starts_at);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_check2 CHECK (revoked_at IS NULL OR revoked_at >= starts_at);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_check3 CHECK (updated_at >= created_at);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_granted_by_subject_id_fkey FOREIGN KEY (granted_by_subject_id) REFERENCES public.subjects(id) ON DELETE RESTRICT;

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_id_tenant_id_case_id_subject_id_work_key UNIQUE (id, tenant_id, case_id, subject_id, workforce_subject_id);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_pkey PRIMARY KEY (id);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_purpose_check CHECK (purpose = 'operations'::text);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_role_check CHECK (role = 'operations'::text);

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_tenant_id_workforce_subject_id_role_fkey FOREIGN KEY (tenant_id, workforce_subject_id, ROLE)
    REFERENCES public.tenant_memberships(tenant_id, subject_id, ROLE) ON DELETE RESTRICT;

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_version_check CHECK (version > 0);

CREATE INDEX operations_assignments_workforce_idx ON public.operations_assignments (tenant_id, workforce_subject_id, ROLE);

CREATE UNIQUE INDEX operations_assignments_current_key ON public.operations_assignments (case_id, workforce_subject_id)
  WHERE revoked_at IS NULL;

CREATE INDEX operations_assignments_grantor_idx ON public.operations_assignments (granted_by_subject_id);

CREATE TABLE public.operations_cases (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id       uuid                     NOT NULL,
  subject_id      uuid                     NOT NULL,
  membership_role text                     DEFAULT 'patient'::text NOT NULL,
  state           text                     DEFAULT 'onboarding_pending'::text NOT NULL,
  outcome         text,
  version         integer                  DEFAULT 1 NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.operations_cases IS 'Non-clinical operations aggregate; no clinical or payment authority.';

ALTER TABLE public.operations_cases
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operations_cases
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_membership_fk FOREIGN KEY (tenant_id, subject_id, membership_role) REFERENCES public.tenant_memberships(tenant_id, subject_id, ROLE)
    ON DELETE RESTRICT;

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_membership_role_check CHECK (membership_role = 'patient'::text);

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_outcome_check CHECK (outcome = ANY (ARRAY['completed'::text, 'unable_to_complete'::text, 'client_declined'::text]));

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_outcome_consistent CHECK ((state = 'provider_outcome_recorded'::text) = (outcome IS NOT NULL));

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_pkey PRIMARY KEY (id);

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_scope_key UNIQUE (id, tenant_id, subject_id);

ALTER TABLE public.handoff_authorisations
  ADD CONSTRAINT handoff_authorisations_case_id_tenant_id_subject_id_fkey FOREIGN KEY (case_id, tenant_id, subject_id) REFERENCES public.operations_cases(id, tenant_id, subject_id)
    ON DELETE RESTRICT;

ALTER TABLE public.operations_assignments
  ADD CONSTRAINT operations_assignments_case_id_tenant_id_subject_id_fkey FOREIGN KEY (case_id, tenant_id, subject_id) REFERENCES public.operations_cases(id, tenant_id, subject_id)
    ON DELETE RESTRICT;

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_state_check
    CHECK
    (state = ANY (ARRAY['onboarding_pending'::text, 'ready_for_handoff'::text, 'handed_off'::text, 'provider_acknowledged'::text, 'provider_review_pending'::text,
    'provider_outcome_recorded'::text, 'handoff_exception'::text, 'cancelled'::text]));

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_time_valid CHECK (updated_at >= created_at);

ALTER TABLE public.operations_cases
  ADD CONSTRAINT operations_cases_version_check CHECK (version > 0);

CREATE INDEX operations_cases_queue_idx ON public.operations_cases (tenant_id, state, created_at, id)
  WHERE state <> ALL (ARRAY['provider_outcome_recorded'::text, 'cancelled'::text]);

CREATE INDEX operations_cases_patient_idx ON public.operations_cases (tenant_id, subject_id);

CREATE TABLE public.operations_claims (
  id                   uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id            uuid                     NOT NULL,
  case_id              uuid                     NOT NULL,
  subject_id           uuid                     NOT NULL,
  assignment_id        uuid                     NOT NULL,
  workforce_subject_id uuid                     NOT NULL,
  claimed_at           timestamp with time zone DEFAULT now() NOT NULL,
  released_at          timestamp with time zone,
  version              integer                  DEFAULT 1 NOT NULL,
  created_at           timestamp with time zone DEFAULT now() NOT NULL,
  updated_at           timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.operations_claims IS 'One processing reservation per case; no automatic permission escalation.';

ALTER TABLE public.operations_claims
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operations_claims
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.operations_claims
  ADD CONSTRAINT operations_claims_assignment_id_tenant_id_case_id_subject__fkey FOREIGN KEY (assignment_id, tenant_id, case_id, subject_id, workforce_subject_id)
    REFERENCES public.operations_assignments(id, tenant_id, case_id, subject_id, workforce_subject_id) ON DELETE RESTRICT;

ALTER TABLE public.operations_claims
  ADD CONSTRAINT operations_claims_check CHECK (released_at IS NULL OR released_at >= claimed_at);

ALTER TABLE public.operations_claims
  ADD CONSTRAINT operations_claims_check1 CHECK (updated_at >= created_at);

ALTER TABLE public.operations_claims
  ADD CONSTRAINT operations_claims_id_tenant_id_case_id_subject_id_workforce_key UNIQUE (id, tenant_id, case_id, subject_id, workforce_subject_id);

ALTER TABLE public.handoff_attempts
  ADD CONSTRAINT handoff_attempts_claim_id_tenant_id_case_id_subject_id_wor_fkey FOREIGN KEY (claim_id, tenant_id, case_id, subject_id, workforce_subject_id)
    REFERENCES public.operations_claims(id, tenant_id, case_id, subject_id, workforce_subject_id) ON DELETE RESTRICT;

ALTER TABLE public.operations_claims
  ADD CONSTRAINT operations_claims_pkey PRIMARY KEY (id);

ALTER TABLE public.operations_claims
  ADD CONSTRAINT operations_claims_version_check CHECK (version > 0);

CREATE INDEX operations_claims_assignment_idx ON public.operations_claims (assignment_id);

CREATE UNIQUE INDEX operations_claims_one_active ON public.operations_claims (case_id)
  WHERE released_at IS NULL;

CREATE INDEX operations_claims_workforce_idx ON public.operations_claims (workforce_subject_id);

CREATE TABLE public.operations_events (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id        uuid                     NOT NULL,
  case_id          uuid                     NOT NULL,
  subject_id       uuid                     NOT NULL,
  case_version     integer                  NOT NULL,
  event            text                     NOT NULL,
  reference_id     uuid,
  actor_subject_id uuid                     NOT NULL,
  idempotency_key  uuid                     NOT NULL,
  correlation_id   uuid                     NOT NULL,
  recorded_at      timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.operations_events IS 'Append-only assignment and transition evidence foundation.';

ALTER TABLE public.operations_events
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operations_events
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.operations_events
  ADD CONSTRAINT operations_events_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id) ON DELETE RESTRICT;

ALTER TABLE public.operations_events
  ADD CONSTRAINT operations_events_case_id_case_version_key UNIQUE (case_id, case_version);

ALTER TABLE public.operations_events
  ADD CONSTRAINT operations_events_case_id_tenant_id_subject_id_fkey FOREIGN KEY (case_id, tenant_id, subject_id) REFERENCES public.operations_cases(id, tenant_id, subject_id)
    ON DELETE RESTRICT;

ALTER TABLE public.operations_events
  ADD CONSTRAINT operations_events_case_version_check CHECK (case_version > 0);

ALTER TABLE public.operations_events
  ADD CONSTRAINT operations_events_event_check
    CHECK
    (event = ANY (ARRAY['created'::text, 'assigned'::text, 'assignment_revoked'::text, 'claimed'::text, 'released'::text, 'transitioned'::text, 'handoff_attempted'::text,
    'acknowledged'::text, 'exception_recorded'::text, 'exception_resolved'::text]));

ALTER TABLE public.operations_events
  ADD CONSTRAINT operations_events_pkey PRIMARY KEY (id);

ALTER TABLE public.operations_events
  ADD CONSTRAINT operations_events_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);

CREATE INDEX operations_events_actor_idx ON public.operations_events (actor_subject_id);

CREATE TRIGGER operations_events_append_only
  BEFORE DELETE OR UPDATE ON public.operations_events
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

CREATE TABLE public.operations_exceptions (
  id                         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  tenant_id                  uuid                     NOT NULL,
  case_id                    uuid                     NOT NULL,
  subject_id                 uuid                     NOT NULL,
  attempt_id                 uuid,
  code                       text                     NOT NULL,
  prior_state                text                     NOT NULL,
  resolution_of_exception_id uuid,
  actor_subject_id           uuid                     NOT NULL,
  idempotency_key            uuid                     NOT NULL,
  correlation_id             uuid                     NOT NULL,
  recorded_at                timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.operations_exceptions IS 'Coded exceptions and linked resolution facts without free text.';

ALTER TABLE public.operations_exceptions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operations_exceptions
  FORCE ROW LEVEL SECURITY;

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_actor_subject_id_fkey FOREIGN KEY (actor_subject_id) REFERENCES public.subjects(id) ON DELETE RESTRICT;

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_attempt_id_tenant_id_case_id_subject_fkey FOREIGN KEY (attempt_id, tenant_id, case_id, subject_id)
    REFERENCES public.handoff_attempts(id, tenant_id, case_id, subject_id) ON DELETE RESTRICT;

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_case_id_tenant_id_subject_id_fkey FOREIGN KEY (case_id, tenant_id, subject_id) REFERENCES public.operations_cases(id, tenant_id, subject_id)
    ON DELETE RESTRICT;

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_check CHECK (resolution_of_exception_id IS NULL OR resolution_of_exception_id <> id);

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_code_check
    CHECK
    (code = ANY (ARRAY['destination_unavailable'::text, 'authorisation_stale'::text, 'acknowledgement_missing'::text, 'delivery_uncertain'::text, 'version_conflict'::text,
    'provider_unavailable'::text, 'client_withdrawal'::text, 'abandoned_case'::text]));

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_id_tenant_id_case_id_subject_id_key UNIQUE (id, tenant_id, case_id, subject_id);

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_pkey PRIMARY KEY (id);

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_prior_state_check
    CHECK
    (prior_state = ANY (ARRAY['onboarding_pending'::text, 'ready_for_handoff'::text, 'handed_off'::text, 'provider_acknowledged'::text, 'provider_review_pending'::text,
    'provider_outcome_recorded'::text, 'handoff_exception'::text, 'cancelled'::text]));

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_resolution_of_exception_id_key UNIQUE (resolution_of_exception_id);

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_resolution_of_exception_id_tenant_id_fkey FOREIGN KEY (resolution_of_exception_id, tenant_id, case_id, subject_id)
    REFERENCES public.operations_exceptions(id, tenant_id, case_id, subject_id) ON DELETE RESTRICT;

ALTER TABLE public.operations_exceptions
  ADD CONSTRAINT operations_exceptions_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);

CREATE INDEX operations_exceptions_actor_idx ON public.operations_exceptions (actor_subject_id);

CREATE INDEX operations_exceptions_attempt_idx ON public.operations_exceptions (attempt_id)
  WHERE attempt_id IS NOT NULL;

CREATE INDEX operations_exceptions_case_idx ON public.operations_exceptions (case_id, recorded_at);

CREATE TRIGGER operations_exceptions_append_only
  BEFORE DELETE OR UPDATE ON public.operations_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION audit_private.reject_append_only_mutation();

-- Preserve deny-default access on replay regardless of environment default grants.
REVOKE ALL ON public.operations_cases, public.operations_assignments, public.operations_claims,
  public.handoff_authorisations, public.handoff_attempts, public.handoff_acknowledgements,
  public.operations_exceptions, public.operations_events
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION identity_private.guard_handoff_authorisation_record()
  FROM PUBLIC, anon, authenticated, service_role;
SET check_function_bodies = true;

-- Structural evidence guard only; Task 10.6 still verifies independent recipient authority.
CREATE FUNCTION identity_private.guard_handoff_acknowledgement_record()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.handoff_attempts a
    WHERE a.id = NEW.attempt_id AND a.tenant_id = NEW.tenant_id
      AND a.case_id = NEW.case_id AND a.subject_id = NEW.subject_id
      AND a.state = 'delivered' AND a.delivered_at <= NEW.acknowledged_at
  ) THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'HANDOFF_ACKNOWLEDGEMENT_INVALID';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION identity_private.guard_handoff_acknowledgement_record()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER handoff_acknowledgements_delivery_guard
BEFORE INSERT ON public.handoff_acknowledgements FOR EACH ROW
EXECUTE FUNCTION identity_private.guard_handoff_acknowledgement_record();
