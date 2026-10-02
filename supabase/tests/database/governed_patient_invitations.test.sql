begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(22);

select ok(not has_table_privilege('service_role', 'public.identity_invitations', 'insert'),
  'server cannot bypass governed reservation with a direct insert');
select ok(not has_function_privilege('anon',
  'public.reserve_patient_invitation(uuid,uuid,text,timestamptz,uuid)', 'execute'),
  'anonymous callers cannot reserve invitations');
select ok(not has_function_privilege('authenticated',
  'public.reserve_patient_invitation(uuid,uuid,text,timestamptz,uuid)', 'execute'),
  'browser sessions cannot reserve invitations');
select ok(has_function_privilege('service_role',
  'public.reserve_patient_invitation(uuid,uuid,text,timestamptz,uuid)', 'execute'),
  'server may call the governed reservation command');
select ok(not has_function_privilege('authenticated',
  'public.complete_patient_invitation_delivery(uuid,text,boolean)', 'execute'),
  'browser sessions cannot complete provider delivery');

insert into public.subjects (id, status)
values ('91000000-0000-4000-8000-000000000001', 'active');
insert into public.tenant_memberships (
  tenant_id, subject_id, role, status, valid_from, expires_at, approved_by_subject_id
) values (
  '10000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001', 'operations', 'active',
  now() - interval '1 day', now() + interval '1 day',
  '20000000-0000-4000-8000-000000000001'
);
insert into public.identity_sessions (
  subject_id, provider_session_id, session_class, assurance, status,
  issued_at, last_seen_at, idle_expires_at, absolute_expires_at
) values (
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001', 'workforce', 'aal2', 'active',
  now() - interval '1 minute', now() - interval '1 minute',
  now() + interval '10 minutes', now() + interval '1 hour'
);
insert into public.access_assignments (
  tenant_id, subject_id, resource_type, resource_id, purpose,
  status, valid_from, expires_at
) values (
  '10000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001', 'identity_contact',
  '10000000-0000-4000-8000-000000000001', 'operations', 'active',
  now() - interval '1 day', now() + interval '1 day'
);

select lives_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('a',64),
    now() + interval '30 minutes', '93000000-0000-4000-8000-000000000001')
$$, 'assigned AAL2 operations staff may reserve one bounded invitation');
select is((select count(*) from public.identity_invitations
  where request_key = '93000000-0000-4000-8000-000000000001'),
  1::bigint, 'reservation persists exactly one invitation');
select is((select count(*) from public.audit_events
  where action = 'identity.invitation.reserved'
    and resource_id = (select id::text from public.identity_invitations
      where request_key = '93000000-0000-4000-8000-000000000001')),
  1::bigint, 'reservation appends a safe audit fact');

select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('a',64),
    now() + interval '30 minutes', '93000000-0000-4000-8000-000000000001')
$$, '22023', 'INVITATION_REJECTED', 'same idempotency key cannot resend');
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('a',64),
    now() + interval '30 minutes', '93000000-0000-4000-8000-000000000002')
$$, '22023', 'INVITATION_REJECTED', 'pending contact cannot receive a duplicate invitation');
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002', repeat('b',64),
    now() + interval '30 minutes', '93000000-0000-4000-8000-000000000003')
$$, '42501', 'INVITATION_REJECTED', 'cross-tenant reservation is denied');
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('b',64),
    now() + interval '2 minutes', '93000000-0000-4000-8000-000000000004')
$$, '22023', 'INVITATION_REJECTED', 'short expiry is denied');

select lives_ok($$
  select public.complete_patient_invitation_delivery(
    (select id from public.identity_invitations
      where request_key = '93000000-0000-4000-8000-000000000001'),
    'synthetic-provider-subject', false)
$$, 'provider binding may complete a reserved invitation');
select throws_ok($$
  select public.complete_patient_invitation_delivery(
    (select id from public.identity_invitations
      where request_key = '93000000-0000-4000-8000-000000000001'),
    'synthetic-provider-subject', false)
$$, '22023', 'INVITATION_REJECTED', 'provider delivery cannot be replayed');
select lives_ok($$
  update public.identity_invitations set status = 'revoked'
  where request_key = '93000000-0000-4000-8000-000000000001'
$$, 'pending invitation can be revoked');
select throws_ok($$
  update public.identity_invitations set status = 'pending'
  where request_key = '93000000-0000-4000-8000-000000000001'
$$, '22023', 'INVITATION_REPLAY_REJECTED', 'terminal invitation cannot be reopened');
select is((select count(*) from public.identity_invitations
  where request_key = '93000000-0000-4000-8000-000000000001'
    and status = 'revoked'), 1::bigint, 'revoked state persists');

update public.access_assignments set purpose = 'support'
where subject_id = '91000000-0000-4000-8000-000000000001';
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('d',64),
    now() + interval '30 minutes', gen_random_uuid())
$$, '42501', 'INVITATION_REJECTED', 'wrong assignment purpose denies invitation');
update public.access_assignments set purpose = 'operations'
where subject_id = '91000000-0000-4000-8000-000000000001';

update public.identity_sessions set status = 'revoked', revoked_at = now()
where provider_session_id = '92000000-0000-4000-8000-000000000001';
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('d',64),
    now() + interval '30 minutes', gen_random_uuid())
$$, '42501', 'INVITATION_REJECTED', 'revoked staff session cannot reserve');
update public.identity_sessions set status = 'active', revoked_at = null
where provider_session_id = '92000000-0000-4000-8000-000000000001';

update public.tenants set status = 'suspended'
where id = '10000000-0000-4000-8000-000000000001';
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('d',64),
    now() + interval '30 minutes', gen_random_uuid())
$$, '42501', 'INVITATION_REJECTED', 'suspended tenant cannot receive invitations');
update public.tenants set status = 'active'
where id = '10000000-0000-4000-8000-000000000001';

insert into public.identity_invitations (
  tenant_id, contact_digest, intended_role, status, expires_at,
  issued_by_subject_id, purpose, request_key, delivery_status
)
select '10000000-0000-4000-8000-000000000001',
  encode(extensions.digest(n::text, 'sha256'), 'hex'), 'patient', 'revoked',
  now() + interval '1 hour', '91000000-0000-4000-8000-000000000001',
  'operations', gen_random_uuid(), 'failed'
from generate_series(1, 9) as n;
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('e',64),
    now() + interval '30 minutes', gen_random_uuid())
$$, '22023', 'INVITATION_REJECTED', 'actor hourly rate limit denies eleventh attempt');
delete from public.identity_invitations
where issued_by_subject_id = '91000000-0000-4000-8000-000000000001'
  and delivery_status = 'failed';

insert into public.identity_invitations (
  tenant_id, contact_digest, intended_role, status, expires_at,
  issued_by_subject_id, purpose, request_key, delivery_status
)
select '10000000-0000-4000-8000-000000000001', repeat('c',64),
  'patient', 'revoked', now() + interval '1 hour',
  '91000000-0000-4000-8000-000000000001', 'operations', gen_random_uuid(), 'failed'
from generate_series(1, 3);
select throws_ok($$
  select public.reserve_patient_invitation(
    '92000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001', repeat('c',64),
    now() + interval '30 minutes', gen_random_uuid())
$$, '22023', 'INVITATION_REJECTED', 'contact daily rate limit denies fourth attempt');

select * from finish();
rollback;
