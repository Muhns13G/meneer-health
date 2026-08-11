begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'audit_events', 'append-only audit facts exist');
select has_table('public', 'audit_chain_heads', 'tenant audit chain heads exist');
select has_table('public', 'integration_outbox', 'transactional outbox exists');
select has_table('public', 'integration_inbox', 'idempotent inbox exists');
select has_table('public', 'audit_access_reviews', 'privileged review evidence exists');
select has_function(
  'public',
  'execute_audited_workflow_transition',
  array[
    'uuid', 'uuid', 'text', 'text', 'text', 'text', 'integer', 'text', 'timestamptz',
    'text', 'uuid', 'text', 'text', 'uuid', 'text', 'text', 'text', 'text'
  ],
  'audited workflow wrapper exists'
);
select has_function(
  'public',
  'record_integration_inbox',
  array['uuid', 'text', 'text', 'text', 'text', 'text', 'uuid', 'timestamptz', 'jsonb'],
  'verified integration inbox function exists'
);
select has_function(
  'public',
  'review_audit_evidence',
  array['uuid', 'uuid', 'uuid', 'text', 'text', 'text', 'text', 'text', 'timestamptz', 'integer'],
  'purpose-bound audit review function exists'
);

select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity)
   from pg_class
   where oid in (
     'public.audit_events'::regclass,
     'public.audit_chain_heads'::regclass,
     'public.integration_outbox'::regclass,
     'public.integration_inbox'::regclass,
     'public.audit_access_reviews'::regclass
   )),
  'every audit and integration table enables and forces RLS'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename in (
    'audit_events', 'audit_chain_heads', 'integration_outbox', 'integration_inbox',
    'audit_access_reviews'
  )),
  0::bigint,
  'no browser policy exposes audit or integration evidence'
);
select ok(
  not has_table_privilege('anon', 'public.audit_events', 'select')
  and not has_table_privilege('authenticated', 'public.audit_events', 'select')
  and not has_table_privilege('service_role', 'public.audit_events', 'select'),
  'audit events have no direct browser or service table reads'
);
select ok(
  not has_table_privilege('service_role', 'public.audit_events', 'insert')
  and not has_table_privilege('service_role', 'public.audit_events', 'update')
  and not has_table_privilege('service_role', 'public.audit_events', 'delete')
  and not has_table_privilege('service_role', 'public.integration_outbox', 'insert')
  and not has_table_privilege('service_role', 'public.integration_inbox', 'insert'),
  'service traffic must use the trusted functions instead of direct mutation'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.execute_workflow_transition(uuid,uuid,text,text,text,text,integer,text,timestamptz)'::regprocedure,
    'execute'
  ),
  'the unaudited workflow primitive is not a server API'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.execute_audited_workflow_transition(uuid,uuid,text,text,text,text,integer,text,timestamptz,text,uuid,text,text,uuid,text,text,text,text)'::regprocedure,
    'execute'
  ),
  'the server can call only the audited workflow boundary'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.execute_audited_workflow_transition(uuid,uuid,text,text,text,text,integer,text,timestamptz,text,uuid,text,text,uuid,text,text,text,text)'::regprocedure,
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.review_audit_evidence(uuid,uuid,uuid,text,text,text,text,text,timestamptz,integer)'::regprocedure,
    'execute'
  ),
  'browser roles cannot invoke command or audit review functions'
);

select is(
  public.execute_audited_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'audit_request_supply_01',
    'audit_retry_supply_01',
    repeat('a', 64),
    0,
    'supply.request',
    '2030-01-01T00:10:00Z',
    'workforce',
    '20000000-0000-4000-8000-000000000002',
    'operations',
    'aal2',
    '20000000-0000-4000-8000-000000000002',
    'operations',
    'authorisation.v1',
    'audit_trace_supply_01',
    'audit_request_supply_01'
  )->>'version',
  '1',
  'an audited workflow transition commits'
);
select is((select count(*) from public.audit_events), 1::bigint, 'one command creates one audit fact');
select is((select count(*) from public.integration_outbox), 1::bigint, 'one command creates one outbox event');
select is((select count(*) from public.command_receipts), 1::bigint, 'one command retains one receipt');
select is(
  (select action || ':' || outcome || ':' || reason_code from public.audit_events limit 1),
  'workflow.transition:succeeded:COMMAND_COMMITTED',
  'the audit fact records a safe explicit outcome'
);
select is(
  (select correlation_id || ':' || causation_id from public.audit_events limit 1),
  'audit_trace_supply_01:audit_request_supply_01',
  'audit correlation and causation are retained'
);
select is(
  (select metadata from public.audit_events limit 1),
  '{"eventName":"workflow.transitioned","transition":"supply.request","aggregateVersion":1}'::jsonb,
  'audit metadata contains only the approved minimum fact'
);
select ok(
  (select previous_hash = repeat('0', 64) and event_hash ~ '^[a-f0-9]{64}$'
   from public.audit_events limit 1),
  'the first audit fact is anchored and hashed'
);
select ok(
  audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000002'),
  'the committed audit chain verifies'
);
select is(
  (select event_name || ':' || status || ':' || (payload->>'transition')
   from public.integration_outbox limit 1),
  'workflow.transitioned:pending:supply.request',
  'the outbox stores one minimum pending domain event'
);

select is(
  public.execute_audited_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'audit_request_supply_replay',
    'audit_retry_supply_01',
    repeat('a', 64),
    0,
    'supply.request',
    '2030-01-01T00:10:00Z',
    'workforce',
    '20000000-0000-4000-8000-000000000002',
    'operations',
    'aal2',
    '20000000-0000-4000-8000-000000000002',
    'operations',
    'authorisation.v1',
    'audit_trace_supply_replay',
    'audit_request_supply_replay'
  )->>'replayed',
  'true',
  'an exact replay returns the prior result'
);
select is((select count(*) from public.audit_events), 1::bigint, 'replay does not duplicate audit facts');
select is((select count(*) from public.integration_outbox), 1::bigint, 'replay does not duplicate outbox events');

select throws_ok(
  $$
    select public.execute_audited_workflow_transition(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      'workflow.transition',
      'audit_request_invalid',
      'audit_retry_invalid',
      repeat('b', 64),
      1,
      'dispatch.ready',
      '2030-01-01T00:11:00Z',
      'workforce',
      '20000000-0000-4000-8000-000000000002',
      'operations',
      'aal2',
      '20000000-0000-4000-8000-000000000002',
      'operations',
      'authorisation.v1',
      'audit_trace_invalid',
      'audit_request_invalid'
    )
  $$,
  '23514',
  'COMMAND_PREREQUISITES_NOT_MET',
  'an impossible transition fails before any success evidence'
);
select is((select count(*) from public.audit_events), 1::bigint, 'failed state transition adds no false success audit');
select is((select count(*) from public.integration_outbox), 1::bigint, 'failed transition adds no false outbox event');
select is(
  (select count(*) from public.command_receipts where idempotency_key = 'audit_retry_invalid'),
  0::bigint,
  'failed transition leaves no false receipt'
);

select throws_ok(
  $$
    update public.audit_events
    set reason_code = 'ALTERED'
    where sequence = (select min(sequence) from public.audit_events)
  $$,
  '55000',
  'APPEND_ONLY_RECORD',
  'ordinary updates cannot alter accepted audit history'
);
select throws_ok(
  $$
    delete from public.audit_events
    where sequence = (select min(sequence) from public.audit_events)
  $$,
  '55000',
  'APPEND_ONLY_RECORD',
  'ordinary deletes cannot erase accepted audit history'
);

select is(
  public.record_integration_inbox(
    '10000000-0000-4000-8000-000000000002',
    'synthetic',
    'local',
    'synthetic_event_01',
    repeat('c', 64),
    'integration_trace_01',
    '80000000-0000-4000-8000-000000000001',
    '2030-01-01T00:12:00Z',
    '{"eventName":"synthetic.received"}'::jsonb
  )->>'replayed',
  'false',
  'a verified integration receipt is recorded without a raw payload'
);
select is((select count(*) from public.integration_inbox), 1::bigint, 'one inbox receipt is durable');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'integration_inbox'
      and column_name in ('payload', 'body', 'message_body', 'questionnaire_response')
  ),
  'the inbox has no raw payload or message body column'
);
select is(
  public.record_integration_inbox(
    '10000000-0000-4000-8000-000000000002',
    'synthetic',
    'local',
    'synthetic_event_01',
    repeat('c', 64),
    'integration_trace_replay',
    '80000000-0000-4000-8000-000000000001',
    '2030-01-01T00:12:00Z',
    '{"eventName":"synthetic.received"}'::jsonb
  )->>'replayed',
  'true',
  'an exact inbox replay is idempotent'
);
select is((select count(*) from public.integration_inbox), 1::bigint, 'inbox replay creates no duplicate');
select throws_ok(
  $$
    select public.record_integration_inbox(
      '10000000-0000-4000-8000-000000000002',
      'synthetic',
      'local',
      'synthetic_event_01',
      repeat('d', 64),
      'integration_trace_conflict',
      '80000000-0000-4000-8000-000000000001',
      '2030-01-01T00:12:00Z',
      '{}'::jsonb
    )
  $$,
  '23505',
  'INBOX_REPLAY_CONFLICT',
  'an inbox identifier cannot be rebound to another payload fingerprint'
);
select throws_ok(
  $$
    select public.record_integration_inbox(
      '10000000-0000-4000-8000-000000000002',
      'synthetic',
      'local',
      'synthetic_event_02',
      repeat('e', 64),
      'integration_trace_unsafe',
      '80000000-0000-4000-8000-000000000001',
      '2030-01-01T00:12:00Z',
      '{"questionnaireResponse":"private"}'::jsonb
    )
  $$,
  '22023',
  'INBOX_VALIDATION_FAILED',
  'unapproved sensitive metadata is rejected'
);

select is(
  public.review_audit_evidence(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor',
    'aal2',
    'privacy_review',
    'authorisation.v1',
    'audit_review_trace_01',
    '2030-01-01T00:20:00Z',
    50
  )->>'chainVerified',
  'true',
  'a purpose-bound AAL2 audit review verifies the chain'
);
select is((select count(*) from public.audit_access_reviews), 1::bigint, 'the privileged review is recorded');
select is(
  (select event_count::text || ':' || chain_verified::text from public.audit_access_reviews),
  '1:true',
  'the review records its evidence count and integrity result'
);
select is(
  (select count(*) from public.audit_events where action = 'audit.review'),
  1::bigint,
  'audit evidence access is itself audited'
);
select ok(
  audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000002'),
  'the chain remains valid after recording review access'
);
select throws_ok(
  $$
    select public.review_audit_evidence(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
      'auditor',
      'aal1',
      'privacy_review',
      'authorisation.v1',
      'audit_review_trace_denied',
      '2030-01-01T00:20:00Z',
      50
    )
  $$,
  '42501',
  'AUDIT_REVIEW_FORBIDDEN',
  'audit review requires AAL2 even behind the server boundary'
);

alter table public.audit_events disable trigger audit_events_append_only;
update public.audit_events
set reason_code = 'TAMPERED'
where sequence = (select min(sequence) from public.audit_events);
select ok(
  not audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000002'),
  'hash-chain verification detects privileged storage tampering'
);

select * from finish();
rollback;
