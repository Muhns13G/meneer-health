begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(41);

select has_table('public', 'subject_contacts', 'verified contacts table exists');
select has_table('public', 'identity_invitations', 'cohort invitations table exists');
select has_table('public', 'identity_sessions', 'governed sessions table exists');
select has_table('public', 'identity_recovery_cases', 'governed recovery table exists');
select has_table('public', 'service_identities', 'service identities table exists');
select has_table('public', 'service_identity_scopes', 'service scopes table exists');
select has_table('public', 'service_identity_credentials', 'service credentials table exists');
select has_schema('identity_private', 'private identity schema exists');

select is(
  (
    select count(*)
    from pg_class
    where oid in (
      'public.subject_contacts'::regclass,
      'public.identity_invitations'::regclass,
      'public.identity_sessions'::regclass,
      'public.identity_recovery_cases'::regclass,
      'public.service_identities'::regclass,
      'public.service_identity_scopes'::regclass,
      'public.service_identity_credentials'::regclass
    ) and relrowsecurity
  ),
  7::bigint,
  'every identity-governance table enables RLS'
);
select is(
  (
    select count(*)
    from pg_class
    where oid in (
      'public.subject_contacts'::regclass,
      'public.identity_invitations'::regclass,
      'public.identity_sessions'::regclass,
      'public.identity_recovery_cases'::regclass,
      'public.service_identities'::regclass,
      'public.service_identity_scopes'::regclass,
      'public.service_identity_credentials'::regclass
    ) and relforcerowsecurity
  ),
  7::bigint,
  'every identity-governance table forces RLS'
);
select is(
  (
    select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in (
        'subject_contacts',
        'identity_invitations',
        'identity_sessions',
        'identity_recovery_cases',
        'service_identities',
        'service_identity_scopes',
        'service_identity_credentials'
      )
  ),
  0::bigint,
  'Task 5.7 creates no premature browser policy'
);
select is(
  (
    select count(*) from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name like any (array['subject_contacts', 'identity_%', 'service_identity%'])
  ),
  0::bigint,
  'anonymous role has no identity-table privileges'
);
select is(
  (
    select count(*) from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name like any (array['subject_contacts', 'identity_%', 'service_identity%'])
  ),
  0::bigint,
  'authenticated role has no identity-table privileges before Task 5.8'
);
select is(
  (
    select count(*) from information_schema.role_table_grants
    where grantee = 'service_role'
      and table_schema = 'public'
      and table_name in (
        'subject_contacts',
        'identity_invitations',
        'identity_sessions',
        'identity_recovery_cases',
        'service_identities',
        'service_identity_scopes',
        'service_identity_credentials'
      )
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE')
  ),
  21::bigint,
  'server identity adapter receives only the three required privileges per identity table'
);
select is(
  (
    select count(*) from information_schema.role_table_grants
    where grantee = 'service_role'
      and table_schema = 'public'
      and table_name in (
        'subject_contacts',
        'identity_invitations',
        'identity_sessions',
        'identity_recovery_cases',
        'service_identities',
        'service_identity_scopes',
        'service_identity_credentials'
      )
      and privilege_type not in ('SELECT', 'INSERT', 'UPDATE')
  ),
  0::bigint,
  'server identity adapter cannot delete, truncate, reference, or trigger identity tables'
);
select ok(
  not has_schema_privilege('service_role', 'identity_private', 'usage'),
  'service role cannot use the private identity schema'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'identity_private.sync_auth_user()'::regprocedure
  ),
  true,
  'auth-user synchronisation is a security-definer boundary'
);
select is(
  (
    select proconfig
    from pg_proc
    where oid = 'identity_private.sync_auth_user()'::regprocedure
  ),
  array['search_path=""']::text[],
  'privileged identity function pins an empty search path'
);
select has_trigger(
  'auth',
  'users',
  'sync_internal_subject_from_auth_user',
  'auth users map to stable internal subjects'
);
select lives_ok(
  $$
    insert into auth.users (id, email, email_confirmed_at, is_sso_user, is_anonymous)
    values (
      'a0000000-0000-4000-8000-000000000001',
      'synthetic.auth@example.invalid',
      '2030-01-01T00:00:00Z',
      false,
      false
    )
  $$,
  'a verified managed-auth user can be synchronised'
);
select is(
  (
    select count(*) from public.external_identities
    where provider = 'supabase'
      and provider_subject = 'a0000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'managed provider identity maps to one stable internal subject'
);
select is(
  (
    select count(*)
    from public.subject_contacts as contact
    inner join public.external_identities as identity
      on identity.subject_id = contact.subject_id
    where identity.provider_subject = 'a0000000-0000-4000-8000-000000000001'
      and contact.status = 'verified'
      and contact.normalized_value = 'synthetic.auth@example.invalid'
  ),
  1::bigint,
  'verified provider contact is linked without becoming an authority claim'
);

select lives_ok(
  $$
    insert into public.tenant_memberships (tenant_id, subject_id, role, status)
    values
      ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'support', 'active'),
      ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'auditor', 'active'),
      ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'release', 'active')
  $$,
  'the approved workforce roles are representable without a broad staff role'
);
select throws_ok(
  $$
    insert into public.identity_sessions (
      subject_id, provider_session_id, session_class, assurance, issued_at, last_seen_at,
      idle_expires_at, absolute_expires_at
    ) values (
      '20000000-0000-4000-8000-000000000002', gen_random_uuid(), 'workforce', 'aal1',
      now(), now(), now() + interval '15 minutes', now() + interval '8 hours'
    )
  $$,
  '23514',
  null,
  'workforce sessions reject aal1'
);
select throws_ok(
  $$
    insert into public.identity_sessions (
      subject_id, provider_session_id, session_class, assurance, issued_at, last_seen_at,
      idle_expires_at, absolute_expires_at
    ) values (
      '20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'patient', 'aal1',
      now(), now(), now() + interval '31 minutes', now() + interval '12 hours'
    )
  $$,
  '23514',
  null,
  'patient sessions reject idle windows beyond 30 minutes'
);
select throws_ok(
  $$
    insert into public.identity_sessions (
      subject_id, provider_session_id, session_class, assurance, issued_at, last_seen_at,
      idle_expires_at, absolute_expires_at
    ) values (
      '20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'patient', 'aal1',
      now(), now(), now() + interval '30 minutes', now() + interval '12 hours 1 minute'
    )
  $$,
  '23514',
  null,
  'patient sessions reject absolute windows beyond 12 hours'
);
select lives_ok(
  $$
    insert into public.identity_sessions (
      subject_id, provider_session_id, session_class, assurance, issued_at, last_seen_at,
      idle_expires_at, absolute_expires_at
    ) values (
      '20000000-0000-4000-8000-000000000002', gen_random_uuid(), 'workforce', 'aal2',
      now(), now(), now() + interval '15 minutes', now() + interval '8 hours'
    )
  $$,
  'aal2 workforce sessions fit the approved limits'
);
select throws_ok(
  $$
    insert into public.identity_invitations (
      tenant_id, contact_digest, intended_role, expires_at
    ) values (
      '10000000-0000-4000-8000-000000000001', 'raw-contact-is-not-allowed', 'patient', now() + interval '1 day'
    )
  $$,
  '23514',
  null,
  'invitation records reject raw contact in the digest field'
);
select throws_ok(
  $$
    insert into public.identity_invitations (
      tenant_id, contact_digest, intended_role, status, expires_at,
      accepted_by_subject_id, accepted_at
    ) values (
      '10000000-0000-4000-8000-000000000001', repeat('c', 64), 'patient', 'accepted',
      now() + interval '1 day', '20000000-0000-4000-8000-000000000001', now()
    )
  $$,
  '23514',
  null,
  'accepted invitations require a bound managed-provider subject'
);
select throws_ok(
  $$
    insert into public.identity_invitations (
      tenant_id, contact_digest, intended_role, provider_subject, expires_at
    ) values
      (
        '10000000-0000-4000-8000-000000000001', repeat('d', 64), 'patient',
        'duplicate-provider-subject', now() + interval '1 day'
      ),
      (
        '10000000-0000-4000-8000-000000000001', repeat('e', 64), 'patient',
        'duplicate-provider-subject', now() + interval '1 day'
      )
  $$,
  '23505',
  null,
  'one provider account cannot bind to multiple cohort invitations'
);
select throws_ok(
  $$
    insert into public.service_identity_credentials (
      service_identity_id, secret_digest, valid_from, expires_at
    ) values (
      '80000000-0000-4000-8000-000000000001', decode('abcd', 'hex'), now(), now() + interval '1 hour'
    )
  $$,
  '23514',
  null,
  'service credentials reject non-SHA-256-length digests'
);
select throws_ok(
  $$
    insert into public.service_identity_scopes (service_identity_id, resource, action)
    values ('80000000-0000-4000-8000-000000000001', 'synthetic-intake', '*')
  $$,
  '23514',
  null,
  'service identities reject wildcard actions'
);
select throws_ok(
  $$
    insert into public.subject_contacts (
      subject_id, kind, normalized_value, status, provider
    ) values (
      '20000000-0000-4000-8000-000000000001', 'phone', '+27110000000', 'verified', 'synthetic'
    )
  $$,
  '23514',
  null,
  'verified contact status requires verification evidence'
);
select throws_ok(
  $$
    insert into public.identity_recovery_cases (
      subject_id, recovery_class, status, requested_at, expires_at,
      approved_by_subject_id, approved_at
    ) values (
      '20000000-0000-4000-8000-000000000002', 'workforce', 'approved', now(),
      now() + interval '15 minutes', '20000000-0000-4000-8000-000000000002', now()
    )
  $$,
  '23514',
  null,
  'workforce recovery cannot be self-approved'
);
select lives_ok(
  $$
    insert into public.identity_recovery_cases (
      subject_id, recovery_class, status, requested_at, expires_at
    ) values (
      '20000000-0000-4000-8000-000000000001', 'patient', 'requested', now(),
      now() + interval '15 minutes'
    )
  $$,
  'patient recovery can begin without granting access or changing authority'
);

select is(
  (select count(*) from public.subject_contacts where provider = 'synthetic'),
  2::bigint,
  'two verified synthetic contact fixtures are seeded'
);
select is((select count(*) from public.identity_invitations), 1::bigint, 'one synthetic invitation is seeded');
select is(
  (
    select count(*) from public.identity_sessions
    where id = '70000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the bounded synthetic session fixture is seeded'
);
select is(
  (
    select count(*) from public.identity_recovery_cases
    where id = '72000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'the pending synthetic recovery fixture is seeded'
);
select is((select count(*) from public.service_identities), 1::bigint, 'one scoped synthetic service identity is seeded');
select is(
  (select count(*) from public.service_identity_credentials),
  1::bigint,
  'one hashed synthetic service credential is seeded'
);

select * from finish();
rollback;
