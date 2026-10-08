-- Explicitly authorised disposable prerequisites, not real legal or clinical approvals.
-- Operator substitutes only the exact UUID returned by the fresh Auth invitation.
begin;
do $$begin
  if (select count(*) from auth.users) <> 1
    or not exists(select 1 from auth.users where id = '{{patientAuth}}'::uuid)
    or (select count(*) from public.tenants) <> 1
    or not exists(select 1 from public.tenants
      where id = '80000000-0000-4000-8000-000000000001' and status = 'suspended')
    or exists(select 1 from public.pilot_instrument_publications)
  then raise exception 'ONBOARDING_SETUP_BASELINE_CHANGED'; end if;
end $$;
insert into public.tenants(id, slug, display_name, status) values
  ('e1330000-0000-4000-8000-000000000001', 'synthetic-sprint13-onboarding',
    'SYNTHETIC ONBOARDING ONLY', 'active');
-- No workforce Auth identity or login is created. This subject identifies test-only authority.
insert into public.subjects(id) values ('e1330000-0000-4000-8000-000000000002');
insert into public.pilot_instrument_publications(
  id, instrument_id, instrument_version, document_body, content_sha256, rendered_locator,
  approval_reference, approved_by_subject_id, approved_at, effective_at, expires_at
) values
  ('e1330000-0000-4000-8000-000000000004', 'pilot-account-terms', '1.0',
    'SYNTHETIC TEST ONLY account terms', repeat('0',64), '/account/activate',
    'sprint13-synthetic-only', 'e1330000-0000-4000-8000-000000000002',
    now()-interval '1 hour', now()-interval '1 minute', now()+interval '2 hours'),
  ('e1330000-0000-4000-8000-000000000005', 'pilot-privacy-notice', '1.0',
    'SYNTHETIC TEST ONLY privacy notice', repeat('0',64), '/account/activate',
    'sprint13-synthetic-only', 'e1330000-0000-4000-8000-000000000002',
    now()-interval '1 hour', now()-interval '1 minute', now()+interval '2 hours');
-- Delivery is deliberately reserved until actual mailbox receipt is confirmed.
insert into public.identity_invitations(
  id, tenant_id, contact_digest, intended_role, provider_subject, expires_at,
  issued_by_subject_id, purpose, request_key, delivery_status
)
select 'e1330000-0000-4000-8000-000000000006',
  'e1330000-0000-4000-8000-000000000001',
  encode(extensions.digest(convert_to(lower(email),'UTF8'),'sha256'),'hex'),
  'patient', id::text, now()+interval '2 hours',
  'e1330000-0000-4000-8000-000000000002', 'operations', gen_random_uuid(), 'reserved'
from auth.users where id = '{{patientAuth}}'::uuid;
commit;
