begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(26);

select has_table('public', 'tenants', 'tenants table exists');
select has_table('public', 'subjects', 'subjects table exists');
select has_table('public', 'external_identities', 'external identities table exists');
select has_table('public', 'tenant_memberships', 'tenant memberships table exists');

select col_type_is('public', 'tenants', 'id', 'uuid', 'tenant IDs are opaque UUIDs');
select col_type_is('public', 'subjects', 'id', 'uuid', 'subject IDs are opaque UUIDs');
select has_pk('public', 'tenants', 'tenants have a primary key');
select has_pk('public', 'subjects', 'subjects have a primary key');
select has_fk('public', 'external_identities', 'external identities reference subjects');
select has_fk('public', 'tenant_memberships', 'memberships use foreign keys');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.tenants'::regclass),
  'tenants have RLS enabled'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.tenants'::regclass),
  'tenants force RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.subjects'::regclass),
  'subjects have RLS enabled'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.subjects'::regclass),
  'subjects force RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.external_identities'::regclass),
  'external identities have RLS enabled'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.external_identities'::regclass),
  'external identities force RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tenant_memberships'::regclass),
  'memberships have RLS enabled'
);
select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.tenant_memberships'::regclass),
  'memberships force RLS'
);

select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename in (
    'tenants', 'subjects', 'external_identities', 'tenant_memberships'
  )),
  0::bigint,
  'Task 5.6 leaves no premature browser policies'
);
select is(
  (select count(*) from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in ('tenants', 'subjects', 'external_identities', 'tenant_memberships')),
  0::bigint,
  'anonymous role has no foundation-table privileges'
);
select is(
  (select count(*) from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name in ('tenants', 'subjects', 'external_identities', 'tenant_memberships')),
  0::bigint,
  'authenticated role has no foundation-table privileges yet'
);
select is(
  (select count(*) from information_schema.role_table_grants
    where grantee = 'service_role'
      and table_schema = 'public'
      and table_name in ('tenants', 'subjects', 'external_identities', 'tenant_memberships')
      and privilege_type = 'SELECT'),
  4::bigint,
  'server service role may read every foundation table'
);
select is(
  (select count(*) from information_schema.role_table_grants
    where grantee = 'service_role'
      and table_schema = 'public'
      and table_name in ('tenants', 'subjects', 'external_identities', 'tenant_memberships')
      and privilege_type <> 'SELECT'),
  0::bigint,
  'server service role has no non-read foundation-table privileges'
);
select is((select count(*) from public.tenants), 2::bigint, 'two synthetic tenants are seeded');
select is((select count(*) from public.subjects), 3::bigint, 'three synthetic subjects are seeded');
select is(
  (select count(*) from public.tenant_memberships),
  3::bigint,
  'synthetic memberships do not cross tenants'
);

select * from finish();
rollback;
