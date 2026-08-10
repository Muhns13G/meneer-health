begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

select has_table('public', 'access_assignments', 'resource assignment evidence table exists');
select has_column(
  'public',
  'tenant_memberships',
  'valid_from',
  'memberships have an activation boundary'
);
select has_column(
  'public',
  'tenant_memberships',
  'expires_at',
  'memberships can expire'
);
select has_column(
  'public',
  'tenant_memberships',
  'approved_by_subject_id',
  'workforce memberships retain approval evidence'
);
select col_type_is(
  'public',
  'access_assignments',
  'resource_id',
  'uuid',
  'resource assignments use opaque identifiers'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.access_assignments'::regclass),
  'resource assignments enable RLS'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.access_assignments'::regclass),
  'resource assignments force RLS'
);
select is(
  (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'access_assignments'
  ),
  0::bigint,
  'server authorisation does not create a browser policy'
);
select ok(
  not has_table_privilege('anon', 'public.access_assignments', 'select'),
  'anonymous callers cannot read assignment evidence'
);
select ok(
  not has_table_privilege('authenticated', 'public.access_assignments', 'select'),
  'authenticated callers cannot bypass the server policy'
);
select ok(
  has_table_privilege('service_role', 'public.access_assignments', 'select'),
  'the server can resolve assignment evidence'
);
select ok(
  not has_table_privilege('service_role', 'public.access_assignments', 'insert')
  and not has_table_privilege('service_role', 'public.access_assignments', 'update')
  and not has_table_privilege('service_role', 'public.access_assignments', 'delete'),
  'the authorisation reader cannot mutate assignments'
);

select throws_ok(
  $$
    insert into public.tenant_memberships (tenant_id, subject_id, role, status)
    values (
      '10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      'support',
      'active'
    )
  $$,
  '23514',
  null,
  'workforce membership requires bounded approval evidence'
);
select throws_ok(
  $$
    insert into public.tenant_memberships (
      tenant_id, subject_id, role, status, expires_at, approved_by_subject_id
    )
    values (
      '10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      'auditor',
      'active',
      now() + interval '30 days',
      '20000000-0000-4000-8000-000000000001'
    )
  $$,
  '23514',
  null,
  'workforce membership cannot be self-approved'
);
select lives_ok(
  $$
    insert into public.tenant_memberships (tenant_id, subject_id, role, status)
    values (
      '10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      'patient',
      'active'
    )
  $$,
  'patient membership can remain open-ended under the approved policy'
);

select throws_ok(
  $$
    insert into public.access_assignments (
      tenant_id, subject_id, resource_type, resource_id, purpose, expires_at
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'unknown',
      gen_random_uuid(),
      'operations',
      now() + interval '1 day'
    )
  $$,
  '23514',
  null,
  'unknown resource types are rejected'
);
select throws_ok(
  $$
    insert into public.access_assignments (
      tenant_id, subject_id, resource_type, resource_id, purpose, expires_at
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'intake',
      gen_random_uuid(),
      'unknown',
      now() + interval '1 day'
    )
  $$,
  '23514',
  null,
  'unknown purposes are rejected'
);
select throws_ok(
  $$
    insert into public.access_assignments (
      tenant_id, subject_id, resource_type, resource_id, purpose, valid_from, expires_at
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'intake',
      gen_random_uuid(),
      'care_delivery',
      now(),
      now()
    )
  $$,
  '23514',
  null,
  'assignment expiry must follow activation'
);
select is(
  (
    select count(*) from public.access_assignments
    where id = '41000000-0000-4000-8000-000000000001'
      and tenant_id = '10000000-0000-4000-8000-000000000002'
      and subject_id = '20000000-0000-4000-8000-000000000002'
      and resource_type = 'fulfilment'
      and purpose = 'operations'
      and status = 'active'
  ),
  1::bigint,
  'one current purpose-bound assignment is seeded'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'access_assignments'
      and indexname = 'access_assignments_active_context_idx'
  ),
  'assignment policy lookup has a composite index'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'tenant_memberships'
      and indexname = 'tenant_memberships_active_context_idx'
  ),
  'membership policy lookup has a composite index'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'tenant_memberships'
      and indexname = 'tenant_memberships_approver_idx'
  ),
  'membership approver foreign key is indexed'
);

select * from finish();
rollback;
