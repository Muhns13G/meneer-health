begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_function(
  'public',
  'record_security_audit_event',
  array[
    'uuid', 'text', 'uuid', 'text', 'text', 'text', 'uuid', 'text', 'text', 'text',
    'text', 'text', 'text', 'timestamptz'
  ],
  'server-only security audit append function exists'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.record_security_audit_event(uuid,text,uuid,text,text,text,uuid,text,text,text,text,text,text,timestamptz)'::regprocedure,
    'execute'
  ),
  'service role can append through the validated boundary'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.record_security_audit_event(uuid,text,uuid,text,text,text,uuid,text,text,text,text,text,text,timestamptz)'::regprocedure,
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.record_security_audit_event(uuid,text,uuid,text,text,text,uuid,text,text,text,text,text,text,timestamptz)'::regprocedure,
    'execute'
  ),
  'browser roles cannot append security evidence'
);

select ok(
  (public.record_security_audit_event(
    '10000000-0000-4000-8000-000000000002', 'workforce',
    '20000000-0000-4000-8000-000000000002', 'operations', 'aal2',
    'authorisation.denied', '20000000-0000-4000-8000-000000000002',
    'fulfilment', 'a0000000-0000-4000-8000-000000000099', 'operations',
    '2026-08-10.1', 'RELATIONSHIP_REQUIRED', 'security_trace_denial_01',
    '2030-01-01T00:30:00Z'
  )->>'sequence')::bigint > 0,
  'identified authorisation denial is appended'
);
select is(
  (select action || ':' || outcome || ':' || reason_code from public.audit_events),
  'authorisation.denied:denied:RELATIONSHIP_REQUIRED',
  'the fact contains only the explicit denied outcome and reason'
);
select is(
  (select metadata from public.audit_events),
  '{"eventName":"security.authorisation.denied"}'::jsonb,
  'security metadata remains allowlisted and payload-free'
);
select ok(
  audit_private.verify_audit_chain('10000000-0000-4000-8000-000000000002'),
  'security evidence participates in the tenant hash chain'
);

select ok(
  (public.record_security_audit_event(
    '10000000-0000-4000-8000-000000000002', 'workforce',
    '20000000-0000-4000-8000-000000000003', 'admin', 'aal2',
    'breakglass.denied', '20000000-0000-4000-8000-000000000002',
    'privileged_asset', 'a0000000-0000-4000-8000-000000000003',
    'security_administration', 'break-glass.v1', 'BREAK_GLASS_DISABLED',
    'security_trace_break_glass_01', '2030-01-01T00:31:00Z'
  )->>'sequence')::bigint > 0,
  'disabled break-glass attempt is appended for immediate monitoring'
);

select throws_ok(
  $$
    select public.record_security_audit_event(
      '10000000-0000-4000-8000-000000000002', 'workforce',
      '20000000-0000-4000-8000-000000000002', 'support', 'aal2',
      'breakglass.denied', null, 'privileged_asset', 'synthetic', 'support',
      'break-glass.v1', 'BREAK_GLASS_DISABLED', 'security_trace_forbidden_role',
      '2030-01-01T00:32:00Z'
    )
  $$,
  '42501',
  'BREAK_GLASS_ROLE_FORBIDDEN',
  'an unapproved role cannot invoke break glass even to record a denial'
);
select throws_ok(
  $$
    select public.record_security_audit_event(
      '10000000-0000-4000-8000-000000000002', 'workforce',
      '20000000-0000-4000-8000-000000000002', 'operations', 'aal2',
      'authorisation.allowed', null, 'fulfilment', 'synthetic', 'operations',
      '2026-08-10.1', 'ALLOWED', 'security_trace_invalid_action',
      '2030-01-01T00:32:00Z'
    )
  $$,
  '22023',
  'SECURITY_AUDIT_CONTEXT_INVALID',
  'the narrow function cannot append an allow or arbitrary action'
);
select is((select count(*) from public.audit_events), 2::bigint, 'rejected calls add no evidence');

select * from finish();
rollback;
