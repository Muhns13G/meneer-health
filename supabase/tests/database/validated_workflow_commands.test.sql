begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(47);

select has_table('public', 'workflow_instances', 'workflow state table exists');
select has_table('public', 'command_receipts', 'durable idempotency receipt table exists');
select has_function(
  'public',
  'execute_workflow_transition',
  array['uuid', 'uuid', 'text', 'text', 'text', 'text', 'integer', 'text', 'timestamptz'],
  'atomic workflow transition function exists'
);
select has_column('public', 'workflow_instances', 'version', 'workflows expose an optimistic version');
select has_column(
  'public',
  'workflow_instances',
  'clinical_state',
  'clinical authority remains explicit'
);
select has_column(
  'public',
  'workflow_instances',
  'payment_state',
  'payment authority remains explicit'
);
select has_column(
  'public',
  'workflow_instances',
  'refund_state',
  'refund authority remains explicit'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.workflow_instances'::regclass),
  'workflow rows enable RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.workflow_instances'::regclass),
  'workflow rows force RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.command_receipts'::regclass),
  'command receipts enable RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.command_receipts'::regclass),
  'command receipts force RLS'
);
select is(
  (
    select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('workflow_instances', 'command_receipts')
  ),
  0::bigint,
  'the command boundary creates no browser policy'
);
select ok(
  not has_table_privilege('anon', 'public.workflow_instances', 'select'),
  'anonymous callers cannot read workflow state'
);
select ok(
  not has_table_privilege('authenticated', 'public.workflow_instances', 'select'),
  'authenticated callers cannot read workflow state directly'
);
select ok(
  not has_table_privilege('anon', 'public.command_receipts', 'select')
  and not has_table_privilege('authenticated', 'public.command_receipts', 'select'),
  'browser roles cannot inspect command receipts'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.execute_workflow_transition(uuid,uuid,text,text,text,text,integer,text,timestamptz)'::regprocedure,
    'execute'
  ),
  'anonymous callers cannot invoke the command function'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.execute_workflow_transition(uuid,uuid,text,text,text,text,integer,text,timestamptz)'::regprocedure,
    'execute'
  ),
  'authenticated callers cannot invoke the command function'
);
select ok(
  not has_function_privilege(
    'service_role',
    'public.execute_workflow_transition(uuid,uuid,text,text,text,text,integer,text,timestamptz)'::regprocedure,
    'execute'
  ),
  'the server role cannot bypass the later audited command wrapper'
);
select ok(
  not has_table_privilege('service_role', 'public.workflow_instances', 'insert')
  and not has_table_privilege('service_role', 'public.workflow_instances', 'update')
  and not has_table_privilege('service_role', 'public.workflow_instances', 'delete')
  and not has_table_privilege('service_role', 'public.command_receipts', 'insert')
  and not has_table_privilege('service_role', 'public.command_receipts', 'update')
  and not has_table_privilege('service_role', 'public.command_receipts', 'delete'),
  'the server must use the command function and cannot mutate its tables directly'
);
select is(
  (
    select count(*) from public.workflow_instances
    where id = 'a0000000-0000-4000-8000-000000000002'
      and tenant_id = '10000000-0000-4000-8000-000000000002'
      and subject_id = '20000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'one synthetic tenant-scoped workflow is seeded'
);
select is(
  (
    select concat_ws(
      ':',
      clinical_state,
      payment_state,
      supply_state,
      hub_receipt_state,
      dispatch_state,
      delivery_state,
      cancellation_state,
      refund_state
    )
    from public.workflow_instances
    where id = 'a0000000-0000-4000-8000-000000000002'
  ),
  'not_started:not_started:not_started:not_started:not_ready:not_started:active:not_required',
  'all workflow authorities begin independently'
);
select throws_ok(
  $$
    update public.workflow_instances
    set dispatch_state = 'dispatched'
    where id = 'a0000000-0000-4000-8000-000000000002'
  $$,
  '23514',
  null,
  'database constraints reject dispatch without prerequisites'
);

select is(
  (
    public.execute_workflow_transition(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      'workflow.transition',
      'request_supply_01',
      'retry_supply_01',
      repeat('a', 64),
      0,
      'supply.request',
      '2030-01-01T00:10:00Z'
    )->>'version'
  ),
  '1',
  'a valid transition commits one aggregate version'
);
select is(
  (
    public.execute_workflow_transition(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      'workflow.transition',
      'request_supply_replay',
      'retry_supply_01',
      repeat('a', 64),
      0,
      'supply.request',
      '2030-01-01T00:10:00Z'
    )->>'replayed'
  ),
  'true',
  'an identical idempotency replay returns the committed result'
);
select is(
  (
    select count(*) from public.command_receipts
    where idempotency_key = 'retry_supply_01' and status = 'committed'
  ),
  1::bigint,
  'a replay creates only one durable receipt'
);
select throws_ok(
  $$
    select public.execute_workflow_transition(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      'workflow.transition',
      'request_supply_conflict',
      'retry_supply_01',
      repeat('b', 64),
      1,
      'supply.confirm',
      '2030-01-01T00:11:00Z'
    )
  $$,
  '23505',
  'COMMAND_IDEMPOTENCY_CONFLICT',
  'an idempotency key cannot be rebound to a different canonical payload'
);
select throws_ok(
  $$
    select public.execute_workflow_transition(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      'workflow.transition',
      'request_stale_01',
      'retry_stale_01',
      repeat('c', 64),
      0,
      'supply.confirm',
      '2030-01-01T00:11:00Z'
    )
  $$,
  'P0001',
  'COMMAND_VERSION_CONFLICT',
  'a stale expected version is rejected'
);
select is(
  (select count(*) from public.command_receipts where idempotency_key = 'retry_stale_01'),
  0::bigint,
  'a stale write leaves no false committed receipt'
);
select throws_ok(
  $$
    select public.execute_workflow_transition(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      'workflow.transition',
      'request_dispatch_invalid',
      'retry_dispatch_invalid',
      repeat('d', 64),
      1,
      'dispatch.ready',
      '2030-01-01T00:11:00Z'
    )
  $$,
  '23514',
  'COMMAND_PREREQUISITES_NOT_MET',
  'dispatch cannot infer clinical, payment, supply, or receipt success'
);
select is(
  (
    select version::text || ':' || dispatch_state
    from public.workflow_instances
    where id = 'a0000000-0000-4000-8000-000000000002'
  ),
  '1:not_ready',
  'a rejected transition cannot mutate the workflow'
);
select is(
  (
    select count(*) from public.command_receipts
    where idempotency_key = 'retry_dispatch_invalid'
  ),
  0::bigint,
  'a rejected transition cannot create false success evidence'
);

select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_supply_02',
    'retry_supply_02',
    repeat('e', 64),
    1,
    'supply.confirm',
    '2030-01-01T00:12:00Z'
  )->>'version',
  '2',
  'supply confirmation advances only after a request'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_hub_01',
    'retry_hub_01',
    repeat('f', 64),
    2,
    'hub.expect',
    '2030-01-01T00:13:00Z'
  )->>'version',
  '3',
  'hub receipt becomes expected only after supply is available'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_hub_02',
    'retry_hub_02',
    repeat('0', 64),
    3,
    'hub.receive',
    '2030-01-01T00:14:00Z'
  )->>'version',
  '4',
  'hub receipt is committed independently'
);
select throws_ok(
  $$
    select public.execute_workflow_transition(
      '10000000-0000-4000-8000-000000000002',
      'a0000000-0000-4000-8000-000000000002',
      'workflow.transition',
      'request_dispatch_still_blocked',
      'retry_dispatch_still_blocked',
      repeat('1', 64),
      4,
      'dispatch.ready',
      '2030-01-01T00:15:00Z'
    )
  $$,
  '23514',
  'COMMAND_PREREQUISITES_NOT_MET',
  'supply and receipt do not imply clinical approval or payment'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_payment_01',
    'retry_payment_01',
    repeat('2', 64),
    4,
    'payment.start',
    '2030-01-01T00:16:00Z'
  )->>'version',
  '5',
  'payment begins independently'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_payment_02',
    'retry_payment_02',
    repeat('3', 64),
    5,
    'payment.confirm',
    '2030-01-01T00:17:00Z'
  )->>'version',
  '6',
  'payment confirmation advances only the payment authority'
);
select is(
  (
    select clinical_state || ':' || payment_state || ':' || dispatch_state
    from public.workflow_instances
    where id = 'a0000000-0000-4000-8000-000000000002'
  ),
  'not_started:paid:not_ready',
  'paid never implies clinical approval or fulfilment readiness'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_clinical_01',
    'retry_clinical_01',
    repeat('4', 64),
    6,
    'clinical.start_review',
    '2030-01-01T00:18:00Z'
  )->>'version',
  '7',
  'clinical review begins independently'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_clinical_02',
    'retry_clinical_02',
    repeat('5', 64),
    7,
    'clinical.approve',
    '2030-01-01T00:19:00Z'
  )->>'version',
  '8',
  'clinical approval requires a review state'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_dispatch_01',
    'retry_dispatch_01',
    repeat('6', 64),
    8,
    'dispatch.ready',
    '2030-01-01T00:20:00Z'
  )->>'version',
  '9',
  'dispatch becomes ready only after every prerequisite'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_dispatch_02',
    'retry_dispatch_02',
    repeat('7', 64),
    9,
    'dispatch.send',
    '2030-01-01T00:21:00Z'
  )->>'version',
  '10',
  'dispatch requires the explicit ready state'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_delivery_01',
    'retry_delivery_01',
    repeat('8', 64),
    10,
    'delivery.start',
    '2030-01-01T00:22:00Z'
  )->>'version',
  '11',
  'delivery starts only after dispatch'
);
select is(
  public.execute_workflow_transition(
    '10000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000002',
    'workflow.transition',
    'request_delivery_02',
    'retry_delivery_02',
    repeat('9', 64),
    11,
    'delivery.confirm',
    '2030-01-01T00:23:00Z'
  )->>'version',
  '12',
  'delivery confirmation requires in-transit state'
);
select is(
  (
    select concat_ws(
      ':',
      version,
      clinical_state,
      payment_state,
      supply_state,
      hub_receipt_state,
      dispatch_state,
      delivery_state
    )
    from public.workflow_instances
    where id = 'a0000000-0000-4000-8000-000000000002'
  ),
  '12:approved:paid:available:received:dispatched:delivered',
  'the committed sequence retains every independent authority state'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'command_receipts'
      and indexname = 'command_receipts_idempotency_unique'
  ),
  'idempotency lookup is protected by a unique composite index'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'command_receipts'
      and indexname = 'command_receipts_aggregate_created_idx'
  ),
  'aggregate receipt history has a supporting index'
);

select * from finish();
rollback;
