begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('measurement_private', 'consents', 'private consent evidence exists');
select has_table('measurement_private', 'events', 'private strict measurement events exist');
select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity)
   from pg_class
   where oid in (
     'measurement_private.consents'::regclass,
     'measurement_private.events'::regclass
   )),
  'measurement tables enable and force RLS'
);
select is(
  (select count(*) from pg_policies where schemaname = 'measurement_private'),
  0::bigint,
  'no browser policy exposes private measurement records'
);
select ok(
  not has_schema_privilege('anon', 'measurement_private', 'usage')
  and not has_schema_privilege('authenticated', 'measurement_private', 'usage')
  and not has_table_privilege('service_role', 'measurement_private.events', 'select')
  and not has_table_privilege('service_role', 'measurement_private.events', 'insert'),
  'browser and service roles cannot directly access private measurement tables'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.grant_measurement_consent(uuid,text,text,timestamptz,uuid,uuid,timestamptz,boolean,text)'::regprocedure,
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.grant_measurement_consent(uuid,text,text,timestamptz,uuid,uuid,timestamptz,boolean,text)'::regprocedure,
    'execute'
  ),
  'only the server role can invoke the measurement RPC boundary'
);

select is(
  public.grant_measurement_consent(
    '70000000-0000-4000-8000-000000000001',
    'measurement_consent_0001',
    'measurement_trace_01',
    '2030-01-01T00:00:00Z',
    '70000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000003',
    '2030-01-01T00:30:00Z',
    true,
    'local'
  )->>'status',
  'granted',
  'explicit consent creates one short-lived synthetic flow'
);
select is(
  (select event_name from measurement_private.events),
  'measurement_consent_granted',
  'grant records the allowlisted consent event'
);
select is(
  public.record_measurement_event(
    '70000000-0000-4000-8000-000000000004',
    'measurement_event_0001',
    'measurement_trace_02',
    '2030-01-01T00:01:00Z',
    'local',
    '70000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000003',
    'campaign_arrived',
    'dads',
    null,
    null,
    null,
    true
  )->>'replayed',
  'false',
  'a strict allowlisted campaign event is accepted'
);
select is(
  public.record_measurement_event(
    '70000000-0000-4000-8000-000000000005',
    'measurement_event_0001',
    'measurement_trace_replay',
    '2030-01-01T00:02:00Z',
    'local',
    '70000000-0000-4000-8000-000000000002',
    '70000000-0000-4000-8000-000000000003',
    'campaign_arrived',
    'dads',
    null,
    null,
    null,
    true
  )->>'replayed',
  'true',
  'an exact payload replay deduplicates despite transport fields changing'
);
select throws_ok(
  $$
    select public.record_measurement_event(
      '70000000-0000-4000-8000-000000000008',
      'measurement_event_cross_environment',
      'measurement_trace_cross_environment',
      '2030-01-01T00:02:30Z',
      'preview',
      '70000000-0000-4000-8000-000000000002',
      '70000000-0000-4000-8000-000000000003',
      'journey_started', null, null, null, null, true
    )
  $$,
  '42501',
  'MEASUREMENT_CONSENT_REQUIRED',
  'a flow cannot cross its issuing environment boundary'
);

select is(
  public.withdraw_measurement_consent(
    '70000000-0000-4000-8000-000000000006',
    'measurement_withdraw_01',
    'measurement_trace_03',
    '2030-01-01T00:03:00Z',
    '70000000-0000-4000-8000-000000000002',
    '2030-01-08T00:03:00Z',
    true,
    'local'
  )->>'status',
  'withdrawn',
  'withdrawal stops collection and schedules deletion within seven days'
);
select throws_ok(
  $$
    select public.record_measurement_event(
      '70000000-0000-4000-8000-000000000007',
      'measurement_event_0002',
      'measurement_trace_04',
      '2030-01-01T00:04:00Z',
      'local',
      '70000000-0000-4000-8000-000000000002',
      '70000000-0000-4000-8000-000000000003',
      'journey_started', null, null, null, null, true
    )
  $$,
  '42501',
  'MEASUREMENT_CONSENT_REQUIRED',
  'withdrawn consent fails subsequent collection closed'
);

select * from finish();
rollback;
