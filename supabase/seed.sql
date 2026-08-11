-- Synthetic local/CI fixtures only. Never copy pilot or patient data into this file.

insert into public.tenants (id, slug, display_name, status)
values
  ('10000000-0000-4000-8000-000000000001', 'synthetic-alpha', 'Synthetic Alpha', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'synthetic-beta', 'Synthetic Beta', 'active');

insert into public.subjects (id, status)
values
  ('20000000-0000-4000-8000-000000000001', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'active'),
  ('20000000-0000-4000-8000-000000000003', 'active');

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

insert into public.tenant_memberships (
  id,
  tenant_id,
  subject_id,
  role,
  status,
  valid_from,
  expires_at,
  approved_by_subject_id
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'patient',
    'active',
    '2030-01-01T00:00:00Z',
    null,
    null
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'operations',
    'active',
    '2030-01-01T00:00:00Z',
    '2031-01-01T00:00:00Z',
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'auditor',
    'active',
    '2030-01-01T00:00:00Z',
    '2031-01-01T00:00:00Z',
    '20000000-0000-4000-8000-000000000001'
  );

insert into public.access_assignments (
  id,
  tenant_id,
  subject_id,
  resource_type,
  resource_id,
  purpose,
  status,
  valid_from,
  expires_at
)
values
  (
    '41000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'fulfilment',
    'a0000000-0000-4000-8000-000000000002',
    'operations',
    'active',
    '2030-01-01T00:00:00Z',
    '2031-01-01T00:00:00Z'
  ),
  (
    '41000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'fulfilment',
    'a0000000-0000-4000-8000-000000000003',
    'operations',
    'active',
    '2030-01-01T00:00:00Z',
    '2031-01-01T00:00:00Z'
  ),
  (
    '41000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'audit_evidence',
    'a0000000-0000-4000-8000-000000000003',
    'privacy_review',
    'active',
    '2030-01-01T00:00:00Z',
    '2031-01-01T00:00:00Z'
  );

insert into public.workflow_instances (id, tenant_id, subject_id)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002'
  );

insert into public.subject_contacts (
  id, subject_id, kind, normalized_value, status, provider, verified_at
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'email',
    'patient.one@example.invalid',
    'verified',
    'synthetic',
    '2030-01-01T00:00:00Z'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'email',
    'patient.two@example.invalid',
    'verified',
    'synthetic',
    '2030-01-01T00:00:00Z'
  );

insert into public.identity_invitations (
  id, tenant_id, contact_digest, intended_role, provider_subject, status, expires_at
)
values (
  '60000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'patient',
  'synthetic-patient-alpha',
  'pending',
  '2031-01-01T00:00:00Z'
);

insert into public.identity_sessions (
  id,
  subject_id,
  provider_session_id,
  session_class,
  assurance,
  status,
  issued_at,
  last_seen_at,
  idle_expires_at,
  absolute_expires_at
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    'patient',
    'aal1',
    'active',
    '2030-01-01T00:00:00Z',
    '2030-01-01T00:05:00Z',
    '2030-01-01T00:35:00Z',
    '2030-01-01T12:00:00Z'
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000003',
    'privileged',
    'aal2',
    'active',
    '2030-01-01T00:00:00Z',
    '2030-01-01T00:15:00Z',
    '2030-01-01T00:25:00Z',
    '2030-01-01T02:00:00Z'
  );

insert into public.identity_recovery_cases (
  id, subject_id, recovery_class, status, requested_at, expires_at
)
values (
  '72000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'patient',
  'requested',
  '2030-01-01T00:00:00Z',
  '2030-01-01T00:15:00Z'
);

insert into public.service_identities (
  id, tenant_id, name, environment, purpose, status, expires_at
)
values (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'synthetic-fulfilment-adapter',
  'local',
  'operations',
  'active',
  '2031-01-01T00:00:00Z'
);

insert into public.service_identity_scopes (service_identity_id, resource, action)
values ('80000000-0000-4000-8000-000000000001', 'fulfilment', 'update');

insert into public.service_identity_credentials (
  id, service_identity_id, secret_digest, valid_from, expires_at
)
values (
  '90000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  decode(repeat('ab', 32), 'hex'),
  '2030-01-01T00:00:00Z',
  '2030-02-01T00:00:00Z'
);

-- Stripe sandbox Checkout fixtures. Provider IDs point to non-live sandbox objects; prices, tax
-- treatment, terms, and merchant responsibility remain internal test evidence, not public approval.
insert into public.payment_readiness (
  workflow_id,
  tenant_id,
  subject_id,
  access_confirmed,
  disclosures_confirmed,
  consent_confirmed,
  booking_ready,
  clinical_authorised,
  address_confirmed,
  stock_confirmed,
  pharmacy_eligible,
  updated_at
)
values (
  'a0000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  '2030-01-01T00:00:00Z'
);

insert into public.payment_price_catalogue (
  id,
  environment,
  scenario,
  line_type,
  description,
  quantity,
  unit_amount_minor,
  tax_treatment,
  terms_version,
  price_version,
  provider_price_id,
  status,
  effective_from,
  effective_to
)
values
  (
    'b1000000-0000-4000-8000-000000000001', 'local', 'consultation_only',
    'consultation', 'Consultation', 1, 10000, 'synthetic_tax_treatment',
    'synthetic_terms_v1', 'stripe_sandbox_v1', 'price_1U33vjFfj16Nnr1iG9nEWWAh',
    'test_approved', '2026-01-01T00:00:00Z', '2031-01-01T00:00:00Z'
  ),
  (
    'b1000000-0000-4000-8000-000000000002', 'local', 'medication_delivery',
    'medication', 'Medication', 1, 20000, 'synthetic_tax_treatment',
    'synthetic_terms_v1', 'stripe_sandbox_v1', 'price_1U33vkFfj16Nnr1itbqxCCfi',
    'test_approved', '2026-01-01T00:00:00Z', '2031-01-01T00:00:00Z'
  ),
  (
    'b1000000-0000-4000-8000-000000000003', 'local', 'medication_delivery',
    'delivery', 'Delivery', 1, 3000, 'synthetic_tax_treatment',
    'synthetic_terms_v1', 'stripe_sandbox_v1', 'price_1U33vlFfj16Nnr1iKKIs2Jwu',
    'test_approved', '2026-01-01T00:00:00Z', '2031-01-01T00:00:00Z'
  ),
  (
    'b1000000-0000-4000-8000-000000000004', 'local', 'bundle',
    'consultation', 'Consultation', 1, 10000, 'synthetic_tax_treatment',
    'synthetic_terms_v1', 'stripe_sandbox_v1', 'price_1U33vjFfj16Nnr1iG9nEWWAh',
    'test_approved', '2026-01-01T00:00:00Z', '2031-01-01T00:00:00Z'
  ),
  (
    'b1000000-0000-4000-8000-000000000005', 'local', 'bundle',
    'medication', 'Medication', 1, 20000, 'synthetic_tax_treatment',
    'synthetic_terms_v1', 'stripe_sandbox_v1', 'price_1U33vkFfj16Nnr1itbqxCCfi',
    'test_approved', '2026-01-01T00:00:00Z', '2031-01-01T00:00:00Z'
  ),
  (
    'b1000000-0000-4000-8000-000000000006', 'local', 'bundle',
    'delivery', 'Delivery', 1, 3000, 'synthetic_tax_treatment',
    'synthetic_terms_v1', 'stripe_sandbox_v1', 'price_1U33vlFfj16Nnr1iKKIs2Jwu',
    'test_approved', '2026-01-01T00:00:00Z', '2031-01-01T00:00:00Z'
  );

insert into public.service_identities (
  id, tenant_id, name, environment, purpose, status, expires_at
)
values (
  '80000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'synthetic-stripe-webhook',
  'local',
  'operations',
  'active',
  '2031-01-01T00:00:00Z'
);

insert into public.service_identity_scopes (service_identity_id, resource, action)
values
  ('80000000-0000-4000-8000-000000000002', 'payment', 'append'),
  ('80000000-0000-4000-8000-000000000002', 'payment', 'update');

insert into public.service_identity_credentials (
  id, service_identity_id, secret_digest, valid_from, expires_at
)
values (
  '90000000-0000-4000-8000-000000000002',
  '80000000-0000-4000-8000-000000000002',
  decode(repeat('cd', 32), 'hex'),
  '2030-01-01T00:00:00Z',
  '2030-02-01T00:00:00Z'
);
