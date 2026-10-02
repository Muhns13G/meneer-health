-- Sprint 8.9 establishes the sole hosted pilot tenant after the authorised
-- pre-pilot reset. It contains no person, contact, health, payment or order data.
-- Keep the tenant suspended until a later release task explicitly activates it.

insert into public.tenants (id, slug, display_name, status)
values (
  '80000000-0000-4000-8000-000000000001',
  'meneer-pilot',
  'Meneer Health Pilot',
  'suspended'
);
