begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select ok(
  has_function_privilege(
    'service_role',
    'public.open_data_subject_request(uuid,uuid,uuid,text,text,text,text,timestamptz,text,text)'::regprocedure,
    'execute'
  ),
  'service role can use the governed lifecycle boundary'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.open_data_subject_request(uuid,uuid,uuid,text,text,text,text,timestamptz,text,text)'::regprocedure,
    'execute'
  ),
  'browser roles cannot open data-subject requests'
);

select is(
  public.open_data_subject_request(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor', 'aal2', 'privacy_review', 'lifecycle_export_trace_01',
    '2030-01-01T01:00:00Z', 'access_export', 'export-request-01'
  )->>'status',
  'verified',
  'a verified export request opens'
);
select is(
  public.complete_data_subject_export(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor', 'aal2', 'privacy_review', 'lifecycle_export_trace_02',
    '2030-01-01T01:05:00Z',
    (select id from public.data_subject_requests where idempotency_key = 'export-request-01')
  )->>'status',
  'completed',
  'the export completes with expiring digest-only evidence'
);
select is(
  public.complete_data_subject_export(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor', 'aal2', 'privacy_review', 'lifecycle_export_trace_retry',
    '2030-01-01T01:06:00Z',
    (select id from public.data_subject_requests where idempotency_key = 'export-request-01')
  )->>'status',
  'completed',
  'an export completion retry returns the committed result'
);
select is(
  (select export_expires_at - completed_at from public.data_subject_requests where idempotency_key = 'export-request-01'),
  interval '24 hours',
  'generated exports expire after 24 hours'
);

select ok(
  public.apply_record_hold(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor', 'aal2', 'privacy_review', 'lifecycle_hold_trace_01',
    '2030-01-01T01:10:00Z', 'legal', 'SYNTHETIC_MATTER'
  ) is not null,
  'an authorised reviewed hold can be applied'
);
select is(
  public.open_data_subject_request(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor', 'aal2', 'privacy_review', 'lifecycle_erasure_trace_01',
    '2030-01-01T01:11:00Z', 'erasure', 'erasure-request-01'
  )->>'status',
  'verified',
  'a verified erasure request opens'
);
select throws_ok(
  format(
    $$select public.execute_data_subject_erasure(
      '10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
      'auditor', 'aal2', 'privacy_review', 'lifecycle_erasure_trace_02',
      '2030-01-01T01:12:00Z', %L
    )$$,
    (select id from public.data_subject_requests where idempotency_key = 'erasure-request-01')
  ),
  '55000',
  'LIFECYCLE_HOLD_ACTIVE',
  'an active legal hold blocks erasure'
);
select lives_ok(
  format(
    $$select public.release_record_hold(
      '10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
      'auditor', 'aal2', 'privacy_review', 'lifecycle_hold_trace_02',
      '2030-01-01T01:13:00Z', %L
    )$$,
    (select id from public.record_holds where authority_code = 'SYNTHETIC_MATTER')
  ),
  'the hold can be explicitly released'
);
select is(
  public.execute_data_subject_erasure(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor', 'aal2', 'privacy_review', 'lifecycle_erasure_trace_03',
    '2030-01-01T01:14:00Z',
    (select id from public.data_subject_requests where idempotency_key = 'erasure-request-01')
  )->>'status',
  'pending_reconciliation',
  'erasure remains pending while processors and backups are unreconciled'
);
select is(
  public.execute_data_subject_erasure(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor', 'aal2', 'privacy_review', 'lifecycle_erasure_trace_retry',
    '2030-01-01T01:14:30Z',
    (select id from public.data_subject_requests where idempotency_key = 'erasure-request-01')
  )->>'status',
  'pending_reconciliation',
  'an erasure retry cannot duplicate or skip reconciliation'
);
select is((select status from public.subjects where id = '20000000-0000-4000-8000-000000000002'), 'erased', 'the opaque subject is marked erased');
select is((select count(*) from public.subject_contacts where subject_id = '20000000-0000-4000-8000-000000000002'), 0::bigint, 'contact data is removed');

select public.reconcile_data_subject_destination(
  '10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003', 'auditor', 'aal2', 'privacy_review',
  'lifecycle_reconcile_identity', '2030-01-01T01:15:00Z',
  (select id from public.data_subject_requests where idempotency_key = 'erasure-request-01'), 'identity'
);
select public.reconcile_data_subject_destination(
  '10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000003', 'auditor', 'aal2', 'privacy_review',
  'lifecycle_reconcile_storage', '2030-01-01T01:16:00Z',
  (select id from public.data_subject_requests where idempotency_key = 'erasure-request-01'), 'storage'
);
select is(
  public.reconcile_data_subject_destination(
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003', 'auditor', 'aal2', 'privacy_review',
    'lifecycle_reconcile_backup', '2030-01-01T01:17:00Z',
    (select id from public.data_subject_requests where idempotency_key = 'erasure-request-01'), 'recovery_backup'
  )->>'status',
  'completed',
  'the request closes only after backup reconciliation completes'
);
select ok(audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000002'), 'lifecycle evidence remains hash-chain valid');

select * from finish();
rollback;
