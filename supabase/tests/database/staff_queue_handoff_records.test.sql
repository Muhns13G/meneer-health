begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

-- Fixed local-only fixtures; all changes roll back, including publications and receipts.
insert into public.tenant_memberships (tenant_id, subject_id, role, status, valid_from, expires_at, approved_by_subject_id)
values ('10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002', 'operations', 'active', now() - interval '1 day', now() + interval '1 day',
  '20000000-0000-4000-8000-000000000003');

select has_table('public', name, name || ' exists') from unnest(array[
  'operations_cases', 'operations_assignments', 'operations_claims', 'handoff_authorisations',
  'handoff_attempts', 'handoff_acknowledgements', 'operations_exceptions', 'operations_events'
]) name;
select is(count(*), 8::bigint, 'all eight tables enable and force RLS')
from pg_class where relnamespace = 'public'::regnamespace
  and relname in ('operations_cases', 'operations_assignments', 'operations_claims',
    'handoff_authorisations', 'handoff_attempts', 'handoff_acknowledgements',
    'operations_exceptions', 'operations_events') and relrowsecurity and relforcerowsecurity;
select is(count(*), 0::bigint, 'no premature browser policies') from pg_policies
where tablename in ('operations_cases', 'operations_assignments', 'operations_claims',
  'handoff_authorisations', 'handoff_attempts', 'handoff_acknowledgements',
  'operations_exceptions', 'operations_events') and schemaname = 'public';
select ok(not has_table_privilege(role_name, 'public.' || table_name, privilege_name),
  role_name || ' cannot ' || privilege_name || ' ' || table_name)
from unnest(array['anon', 'authenticated', 'service_role']) role_name
cross join unnest(array['operations_cases', 'operations_assignments', 'operations_claims',
  'handoff_authorisations', 'handoff_attempts', 'handoff_acknowledgements',
  'operations_exceptions', 'operations_events']) table_name
cross join unnest(array['select', 'insert', 'update', 'delete']) privilege_name;
select ok(not has_function_privilege('authenticated',
  'identity_private.guard_handoff_authorisation_record()', 'execute'), 'receipt guard is not a public RPC');
select is(count(*), 0::bigint, 'no clinical, free-text or provider URL columns')
from information_schema.columns where table_schema = 'public'
  and table_name in ('operations_cases', 'operations_assignments', 'operations_claims',
    'handoff_authorisations', 'handoff_attempts', 'handoff_acknowledgements',
    'operations_exceptions', 'operations_events')
  and column_name in ('notes', 'email', 'phone', 'diagnosis', 'protocol', 'dosage', 'product',
    'provider_url', 'questionnaire', 'payment_state', 'clinical_state');

select lives_ok($$insert into public.operations_cases (id, tenant_id, subject_id) values (
  '91000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001')$$, 'case attaches to existing patient membership');
select throws_ok($$insert into public.operations_cases (tenant_id, subject_id) values (
  '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001')$$,
  '23503', null, 'cross-tenant patient case is denied');
select throws_ok($$update public.operations_cases set state = 'clinical.approve'$$,
  '23514', null, 'clinical state is not an operations state');
select throws_ok($$update public.operations_cases set state = 'provider_outcome_recorded'$$,
  '23514', null, 'outcome-recorded requires its bounded administrative code');
select throws_ok($$update public.operations_cases set outcome = 'completed'$$,
  '23514', null, 'waiting case cannot imply completed provider outcome');
select throws_ok($$update public.operations_cases set version = 0$$,
  '23514', null, 'invalid aggregate version is denied');

select lives_ok($$insert into public.operations_assignments (
  id, tenant_id, case_id, subject_id, workforce_subject_id, granted_by_subject_id, starts_at, expires_at
) values ('92000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003', now() - interval '1 day', now() + interval '1 day')$$,
  'assignment binds actual operations membership and patient case');
select throws_ok($$update public.operations_assignments
  set granted_by_subject_id = workforce_subject_id$$, '23514', null, 'self-grant rejected');
select throws_ok($$update public.operations_assignments set purpose = 'clinical_care'$$,
  '23514', null, 'wrong assignment purpose rejected');
select throws_ok($$update public.operations_assignments
  set workforce_subject_id = '20000000-0000-4000-8000-000000000003',
      granted_by_subject_id = '20000000-0000-4000-8000-000000000001'$$,
  '23503', null, 'subject without tenant operations role cannot own an assignment');
select throws_ok($$update public.operations_assignments set expires_at = starts_at$$,
  '23514', null, 'assignment requires a valid bounded window');

select lives_ok($$insert into public.operations_claims (
  id, tenant_id, case_id, subject_id, assignment_id, workforce_subject_id
) values ('93000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002')$$, 'claim requires matching case and assignee');
select throws_ok($$insert into public.operations_claims (
  tenant_id, case_id, subject_id, assignment_id, workforce_subject_id
) select tenant_id, case_id, subject_id, assignment_id, workforce_subject_id
  from public.operations_claims$$, '23505', null, 'unique index rejects a second active claim');
select throws_ok($$update public.operations_claims
  set workforce_subject_id = '20000000-0000-4000-8000-000000000003'$$,
  '23503', null, 'claim is not a grant to an unassigned worker');

insert into public.pilot_instrument_publications (
  id, instrument_id, instrument_version, document_body, rendered_locator,
  approval_reference, approved_by_subject_id, approved_at, effective_at
) values ('94000000-0000-4000-8000-000000000001', 'pilot-handoff-authorisation', '1.0',
  'Synthetic nonbinding hand-off instrument.', '/account/synthetic-handoff', 'synthetic-only',
  '20000000-0000-4000-8000-000000000003', now() - interval '2 days', now() - interval '1 day');
insert into public.pilot_instrument_receipts (
  id, tenant_id, subject_id, publication_id, instrument_id, instrument_version, locale,
  content_sha256, action, assurance, workflow_reference, purpose, recipient_reference,
  idempotency_key, correlation_id
) select '95000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  id, instrument_id, instrument_version, locale, content_sha256, 'accepted', 'aal1',
  '91000000-0000-4000-8000-000000000001', 'operations',
  '96000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000002', 'synthetic_handoff'
from public.pilot_instrument_publications where id = '94000000-0000-4000-8000-000000000001';

select throws_ok($$insert into public.handoff_authorisations (
  tenant_id, case_id, subject_id, receipt_id, destination_id, destination_digest,
  destination_version, authorised_at, expires_at
) select tenant_id, workflow_reference, subject_id, id,
  '96000000-0000-4000-8000-000000000002', repeat('a', 64), 1,
  recorded_at, recorded_at + interval '1 day' from public.pilot_instrument_receipts
where id = '95000000-0000-4000-8000-000000000001'$$,
  '42501', 'HANDOFF_AUTHORISATION_INVALID', 'changed recipient requires fresh authorisation');
select throws_ok($$insert into public.handoff_authorisations (
  tenant_id, case_id, subject_id, receipt_id, destination_id, destination_digest,
  destination_version, authorised_at, expires_at
) select tenant_id, workflow_reference, subject_id, id, recipient_reference, repeat('a', 64), 1,
  recorded_at, recorded_at + interval '31 days' from public.pilot_instrument_receipts
where id = '95000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'authorisation cannot exceed 30 days');
select lives_ok($$insert into public.handoff_authorisations (
  id, tenant_id, case_id, subject_id, receipt_id, destination_id, destination_digest,
  destination_version, authorised_at, expires_at
) select '97000000-0000-4000-8000-000000000001', tenant_id, workflow_reference, subject_id,
  id, recipient_reference, repeat('a', 64), 1, recorded_at, recorded_at + interval '1 day'
from public.pilot_instrument_receipts where id = '95000000-0000-4000-8000-000000000001'$$,
  'authorisation binds exact receipt, patient, case and recipient');
select throws_ok($$update public.handoff_authorisations set destination_version = 2$$,
  '55000', 'APPEND_ONLY_RECORD', 'authorisation cannot silently change recipient version');

select lives_ok($$insert into public.handoff_attempts (
  id, tenant_id, case_id, subject_id, authorisation_id, claim_id, workforce_subject_id,
  request_key, request_digest
) values ('98000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
  '98000000-0000-4000-8000-000000000002', repeat('b', 64))$$,
  'attempt binds authorised recipient and claimed assignee without a URL');
select throws_ok($$update public.handoff_attempts set state = 'delivered'$$,
  '23514', null, 'delivery state without timestamp rejected');
select throws_ok($$update public.handoff_attempts set external_reference = 'https://provider.invalid/intake'$$,
  '22P02', null, 'external reference rejects provider URL');
select throws_ok($$update public.handoff_attempts set retry_of_attempt_id = id$$,
  '23514', null, 'self-retry rejected');
select throws_ok($$insert into public.handoff_attempts (
  tenant_id, case_id, subject_id, authorisation_id, claim_id, workforce_subject_id,
  request_key, request_digest
) select tenant_id, case_id, subject_id, authorisation_id, claim_id, workforce_subject_id,
  gen_random_uuid(), request_digest from public.handoff_attempts$$,
  '23505', null, 'new key cannot duplicate an unresolved delivery');

select lives_ok($$insert into public.operations_exceptions (
  id, tenant_id, case_id, subject_id, attempt_id, code, prior_state, actor_subject_id,
  idempotency_key, correlation_id
) select '99000000-0000-4000-8000-000000000001', tenant_id, case_id, subject_id, id,
  'delivery_uncertain', 'ready_for_handoff', workforce_subject_id, gen_random_uuid(), gen_random_uuid()
from public.handoff_attempts$$, 'uncertain delivery is a coded exception');
select throws_ok($$update public.operations_exceptions set code = 'provider_unavailable'$$,
  '55000', 'APPEND_ONLY_RECORD', 'exception history cannot be overwritten');
select throws_ok($$insert into public.operations_exceptions (
  tenant_id, case_id, subject_id, code, prior_state, actor_subject_id, idempotency_key, correlation_id
) select tenant_id, case_id, subject_id, 'diagnosis text', prior_state, actor_subject_id,
  gen_random_uuid(), gen_random_uuid() from public.operations_exceptions$$,
  '23514', null, 'free-text exceptions rejected');

select lives_ok($$insert into public.operations_events (
  tenant_id, case_id, subject_id, case_version, event, actor_subject_id, idempotency_key, correlation_id
) select tenant_id, id, subject_id, 1, 'created',
  '20000000-0000-4000-8000-000000000002', gen_random_uuid(), gen_random_uuid()
from public.operations_cases$$, 'case/assignment transition history has append-only storage');
select throws_ok($$delete from public.operations_events$$,
  '55000', 'APPEND_ONLY_RECORD', 'event deletion rejected');
select throws_ok($$insert into public.operations_events (
  tenant_id, case_id, subject_id, case_version, event, actor_subject_id, idempotency_key, correlation_id
) select tenant_id, case_id, subject_id, case_version, event, actor_subject_id,
  gen_random_uuid(), gen_random_uuid() from public.operations_events$$,
  '23505', null, 'one attributed event per case version');

select throws_ok($$insert into public.handoff_acknowledgements (
  tenant_id, case_id, subject_id, attempt_id, evidence_reference, acknowledged_at,
  actor_subject_id, idempotency_key, correlation_id
) select tenant_id, case_id, subject_id, id, gen_random_uuid(), clock_timestamp(),
  workforce_subject_id, gen_random_uuid(), gen_random_uuid() from public.handoff_attempts$$,
  '42501', 'HANDOFF_ACKNOWLEDGEMENT_INVALID', 'prepared attempt cannot imply recipient acknowledgement');
update public.handoff_attempts set state = 'delivered', delivered_at = clock_timestamp();
select lives_ok($$insert into public.handoff_acknowledgements (
  tenant_id, case_id, subject_id, attempt_id, evidence_reference, acknowledged_at,
  actor_subject_id, idempotency_key, correlation_id
) select tenant_id, case_id, subject_id, id, gen_random_uuid(), clock_timestamp(),
  workforce_subject_id, gen_random_uuid(), gen_random_uuid() from public.handoff_attempts$$,
  'delivered attempt can have a separate opaque recipient-evidence record');
select throws_ok($$delete from public.handoff_acknowledgements$$,
  '55000', 'APPEND_ONLY_RECORD', 'recipient acknowledgement cannot be erased');
select throws_ok($$insert into public.handoff_acknowledgements (
  tenant_id, case_id, subject_id, attempt_id, evidence_reference, acknowledged_at,
  actor_subject_id, idempotency_key, correlation_id
) select tenant_id, case_id, subject_id, attempt_id, gen_random_uuid(), acknowledged_at,
  actor_subject_id, gen_random_uuid(), gen_random_uuid() from public.handoff_acknowledgements$$,
  '23505', null, 'duplicate acknowledgement rejected');

insert into public.pilot_instrument_receipt_events (
  receipt_id, tenant_id, subject_id, event_type, actor_subject_id, reason_code,
  idempotency_key, correlation_id
) select id, tenant_id, subject_id, 'withdrawn', subject_id, 'synthetic_withdrawal',
  gen_random_uuid(), 'synthetic_withdrawal' from public.pilot_instrument_receipts
where id = '95000000-0000-4000-8000-000000000001';
select throws_ok($$insert into public.handoff_authorisations (
  tenant_id, case_id, subject_id, receipt_id, destination_id, destination_digest,
  destination_version, authorised_at, expires_at
) select tenant_id, workflow_reference, subject_id, id, recipient_reference, repeat('a', 64), 1,
  recorded_at, recorded_at + interval '1 day' from public.pilot_instrument_receipts
where id = '95000000-0000-4000-8000-000000000001'$$,
  '42501', 'HANDOFF_AUTHORISATION_INVALID', 'withdrawn receipt cannot authorise new work');

set local role authenticated;
select throws_ok($$select * from public.operations_cases$$, '42501', null, 'authenticated direct read denied');
select throws_ok($$insert into public.operations_cases default values$$, '42501', null, 'authenticated write denied');
reset role;
set local role service_role;
select throws_ok($$select * from public.operations_cases$$, '42501', null, 'service role cannot bypass future scoped read RPC');
select throws_ok($$update public.operations_claims set released_at = now()$$, '42501', null,
  'service role cannot mutate claims directly');
reset role;

select * from finish();
rollback;
