-- Synthetic local/CI fixtures only. Never copy pilot or patient data into this file.

insert into public.tenants (id, slug, display_name, status)
values
  ('10000000-0000-4000-8000-000000000001', 'synthetic-alpha', 'Synthetic Alpha', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'synthetic-beta', 'Synthetic Beta', 'active');

insert into public.subjects (id, status)
values
  ('20000000-0000-4000-8000-000000000001', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'active');

insert into public.external_identities (id, subject_id, provider, provider_subject)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'synthetic',
    'subject-alpha'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'synthetic',
    'subject-beta'
  );

insert into public.tenant_memberships (id, tenant_id, subject_id, role, status)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'patient',
    'active'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'operations',
    'active'
  );
