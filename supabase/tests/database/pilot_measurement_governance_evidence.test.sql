begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table(
  'measurement_private',
  'daily_aggregates',
  'private deidentified daily measurement aggregates exist'
);
select has_table(
  'measurement_private',
  'access_evidence',
  'private governed-access evidence exists'
);
select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity)
   from pg_class
   where oid in (
     'measurement_private.daily_aggregates'::regclass,
     'measurement_private.access_evidence'::regclass
   )),
  'governance tables enable and force RLS'
);
select ok(
  not has_table_privilege('anon', 'measurement_private.daily_aggregates', 'select')
  and not has_table_privilege('authenticated', 'measurement_private.daily_aggregates', 'select')
  and not has_table_privilege('service_role', 'measurement_private.daily_aggregates', 'select')
  and not has_table_privilege('service_role', 'measurement_private.access_evidence', 'select'),
  'browser and service roles receive no direct measurement read access'
);
select is(
  (select count(*)
   from information_schema.columns
   where table_schema = 'measurement_private'
     and table_name = 'daily_aggregates'
     and column_name in (
       'flow_id', 'consent_receipt_id', 'actor_id', 'email', 'phone', 'ip_address', 'user_agent',
       'url', 'query', 'referrer', 'replay', 'free_text', 'treatment', 'health_data'
     )),
  0::bigint,
  'daily aggregates contain no direct, joinable, URL, replay, free-text or health fields'
);
select ok(
  exists(select 1 from cron.job where jobname = 'measurement-retention-daily'),
  'a daily measurement retention purge is scheduled'
);

select is(
  public.grant_measurement_consent(
    '79000000-0000-4000-8000-000000000001',
    'governance_consent_0001',
    'governance_trace_01',
    '2030-01-01T00:00:00Z',
    '79000000-0000-4000-8000-000000000002',
    '79000000-0000-4000-8000-000000000003',
    '2030-01-01T00:30:00Z',
    true,
    'local'
  )->>'status',
  'granted',
  'synthetic governance flow receives explicit consent'
);
select is(
  public.record_measurement_event(
    '79000000-0000-4000-8000-000000000004',
    'governance_event_0001',
    'governance_trace_02',
    '2030-01-01T00:05:00Z',
    'local',
    '79000000-0000-4000-8000-000000000002',
    '79000000-0000-4000-8000-000000000003',
    'journey_started', null, null, null, null, true
  )->>'replayed',
  'false',
  'strict synthetic raw event is recorded'
);

select throws_ok(
  $$select public.export_measurement_flow_inventory(
    '79000000-0000-4000-8000-000000000005',
    'product_reviewer', 'aal2', 'product_review',
    '79000000-0000-4000-8000-000000000002',
    '2030-01-01T00:10:00Z'
  )$$,
  '42501',
  'MEASUREMENT_ACCESS_DENIED',
  'product reviewers cannot inspect raw flow records'
);
select ok(
  (public.export_measurement_flow_inventory(
    '79000000-0000-4000-8000-000000000006',
    'privacy_reviewer', 'aal2', 'privacy_request',
    '79000000-0000-4000-8000-000000000002',
    '2030-01-01T00:11:00Z'
  ) ? 'events'),
  'AAL2 privacy review can inventory a requested raw flow'
);
select is(
  (select action from measurement_private.access_evidence where action = 'raw_inventory'),
  'raw_inventory',
  'raw inventory access leaves purpose-bound evidence'
);

select is(
  public.withdraw_measurement_consent(
    '79000000-0000-4000-8000-000000000007',
    'governance_withdraw_01',
    'governance_trace_03',
    '2030-01-01T00:12:00Z',
    '79000000-0000-4000-8000-000000000002',
    '2030-01-08T00:12:00Z',
    true,
    'local'
  )->>'status',
  'withdrawn',
  'synthetic opt-out stops collection and queues raw deletion'
);
select is(
  public.run_measurement_retention('2030-01-02T03:00:00Z')->>'aggregatedEvents',
  '3',
  'the daily job aggregates each eligible event once'
);
select is(
  public.run_measurement_retention('2030-01-02T04:00:00Z')->>'aggregatedEvents',
  '0',
  'a retry cannot double count previously aggregated events'
);
select is(
  (select sum(event_count) from measurement_private.daily_aggregates),
  3::numeric,
  'deidentified daily aggregate totals reconcile with raw records'
);
select ok(
  jsonb_array_length(public.export_measurement_daily_aggregates(
    '79000000-0000-4000-8000-000000000008',
    'product_reviewer', 'aal2', 'product_review', 'local',
    '2030-01-01', '2030-01-02', '2030-01-02T04:10:00Z'
  )) > 0,
  'product review exports only deidentified aggregate records'
);
select throws_ok(
  $$select public.export_measurement_daily_aggregates(
    '79000000-0000-4000-8000-000000000009',
    'product_reviewer', 'aal2', 'privacy_request', 'local',
    '2030-01-01', '2030-01-02', '2030-01-02T04:11:00Z'
  )$$,
  '42501',
  'MEASUREMENT_ACCESS_DENIED',
  'an approved aggregate role cannot present a purpose assigned to another reviewer class'
);
select is(
  public.run_measurement_retention('2030-01-08T00:13:00Z')->>'withdrawnRawDeleted',
  '3',
  'withdrawal-linked raw records are deleted no later than seven days'
);
select is(
  (select count(*) from measurement_private.events
   where flow_id = '79000000-0000-4000-8000-000000000002'),
  0::bigint,
  'withdrawal purge removes every linked raw event'
);
select is(
  (select count(*) from measurement_private.consents
   where flow_id = '79000000-0000-4000-8000-000000000002'),
  1::bigint,
  'minimal consent evidence remains under its separate twelve-month schedule'
);

select lives_ok(
  $$select public.grant_measurement_consent(
    '79000000-0000-4000-8000-000000000011',
    'governance_consent_0002',
    'governance_trace_11',
    '2030-02-01T00:00:00Z',
    '79000000-0000-4000-8000-000000000012',
    '79000000-0000-4000-8000-000000000013',
    '2030-02-01T00:30:00Z',
    true,
    'local'
  )$$,
  'a disposable synthetic deletion flow can be created'
);
select lives_ok(
  $$select public.withdraw_measurement_consent(
    '79000000-0000-4000-8000-000000000014',
    'governance_withdraw_02',
    'governance_trace_12',
    '2030-02-01T00:01:00Z',
    '79000000-0000-4000-8000-000000000012',
    '2030-02-08T00:01:00Z',
    true,
    'local'
  )$$,
  'the disposable synthetic flow can opt out'
);
select is(
  public.delete_withdrawn_measurement_flow(
    '79000000-0000-4000-8000-000000000015',
    'privacy_reviewer', 'aal2', 'privacy_request',
    '79000000-0000-4000-8000-000000000012',
    '2030-02-01T00:02:00Z'
  )->>'consentEvidenceRetained',
  'false',
  'the synthetic deletion exercise removes its disposable consent evidence'
);
select is(
  (select count(*) from measurement_private.consents
   where flow_id = '79000000-0000-4000-8000-000000000012'),
  0::bigint,
  'the synthetic deletion exercise leaves no linked measurement records'
);
select is(
  public.run_measurement_retention('2031-02-01T00:00:00Z')->>'expiredConsentDeleted',
  '1',
  'consent evidence is removed after twelve months'
);
select is(
  public.run_measurement_retention('2031-02-01T00:01:00Z')->>'expiredAggregatesDeleted',
  '0',
  'aggregate expiry is idempotent after the first retention pass'
);
select is(
  (select count(*) from measurement_private.daily_aggregates),
  0::bigint,
  'daily aggregate records are removed after twelve months'
);

select * from finish();
rollback;
