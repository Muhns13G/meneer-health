begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(35);

insert into auth.users (id,email,email_confirmed_at,is_sso_user,is_anonymous)
values ('96000000-0000-4000-8000-000000000001','activation@example.invalid',now(),false,false);
insert into auth.sessions (id,user_id,created_at,updated_at,aal)
values ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001',now(),now(),'aal1');
insert into public.identity_invitations (id,tenant_id,contact_digest,intended_role,provider_subject,
  expires_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
values ('96000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001',
  encode(extensions.digest(convert_to('activation@example.invalid','UTF8'),'sha256'),'hex'),
  'patient','96000000-0000-4000-8000-000000000001',now()+interval '1 hour',
  '20000000-0000-4000-8000-000000000001','operations',gen_random_uuid(),'delivered',now());

create function pg_temp.activation(override jsonb default '{}'::jsonb) returns uuid language sql as $$
  select public.activate_pilot_account('96000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000002',jsonb_build_object(
      'givenName','Synthetic','familyName','Client','mobileE164','+27820000000','contactPreference','whatsapp',
      'termsPublicationId','96000000-0000-4000-8000-000000000004',
      'termsHash',encode(extensions.digest(convert_to('Synthetic account terms only','UTF8'),'sha256'),'hex'),
      'privacyPublicationId','96000000-0000-4000-8000-000000000005',
      'privacyHash',encode(extensions.digest(convert_to('Synthetic privacy notice only','UTF8'),'sha256'),'hex'),
      'termsAccepted',true,'privacyAcknowledged',true,'requestKey','96000000-0000-4000-8000-000000000006'
    ) || override);
$$;

select ok(not has_function_privilege('anon','public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb)','execute'),'anonymous cannot activate');
select ok(not has_function_privilege('authenticated','public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb)','execute'),'browser JWT cannot activate directly');
select ok(not has_table_privilege('service_role','public.client_profiles','insert'),'service cannot write profiles outside command');
select throws_ok($$select pg_temp.activation()$$,'42501','ACTIVATION_REJECTED','missing documents leave activation closed');
select is((select count(*) from public.client_profiles where given_name='Synthetic'),0::bigint,'no profile after missing documents');

insert into public.pilot_instrument_publications (id,instrument_id,instrument_version,document_body,
  content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
values
('96000000-0000-4000-8000-000000000004','pilot-account-terms','1.0','Synthetic account terms only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
('96000000-0000-4000-8000-000000000005','pilot-privacy-notice','1.0','Synthetic privacy notice only',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');

select lives_ok($$select public.prepare_pilot_account('96000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000002')$$,'verified invitation can view exact instruments');
select throws_ok($$select public.prepare_pilot_account('96000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000002')$$,'42501','ACTIVATION_REJECTED','wrong tenant rejected');
select throws_ok($$select public.prepare_pilot_account('96000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000008',
  '96000000-0000-4000-8000-000000000002')$$,'42501','ACTIVATION_REJECTED','wrong provider rejected');
select throws_ok($$select pg_temp.activation('{"termsAccepted":false}')$$,'22023','ACTIVATION_REJECTED','terms refusal rejected');
select throws_ok($$select pg_temp.activation('{"privacyAcknowledged":false}')$$,'22023','ACTIVATION_REJECTED','privacy refusal rejected');
select throws_ok($$select pg_temp.activation('{"privacyHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}')$$,'42501','ACTIVATION_REJECTED','hash mismatch rejected');
select throws_ok($$select pg_temp.activation('{"password":"excluded"}')$$,'22023','ACTIVATION_REJECTED','additional field rejected');
select throws_ok($$select pg_temp.activation('{"mobileE164":"0820000000"}')$$,'22023','ACTIVATION_REJECTED','invalid mobile rejected');

update public.tenants set status='suspended' where id='10000000-0000-4000-8000-000000000001';
select throws_ok($$select pg_temp.activation()$$,'42501','ACTIVATION_REJECTED','suspended tenant rejected');
update public.tenants set status='active' where id='10000000-0000-4000-8000-000000000001';
update public.identity_invitations set created_at=now()-interval '2 hours',expires_at=now()-interval '1 minute'
where id='96000000-0000-4000-8000-000000000003';
select throws_ok($$select pg_temp.activation()$$,'42501','ACTIVATION_REJECTED','expired invitation rejected');
update public.identity_invitations set expires_at=now()+interval '1 hour'
where id='96000000-0000-4000-8000-000000000003';
update auth.sessions set not_after=now()-interval '1 minute'
where id='96000000-0000-4000-8000-000000000002';
select throws_ok($$select pg_temp.activation()$$,'42501','ACTIVATION_REJECTED','expired provider session rejected');
update auth.sessions set not_after=null where id='96000000-0000-4000-8000-000000000002';
select throws_ok($test$do $$begin
  update public.pilot_instrument_publications set status='withdrawn',retired_at=now()
    where id='96000000-0000-4000-8000-000000000004';
  perform pg_temp.activation();
end;$$$test$,'42501','ACTIVATION_REJECTED','withdrawn document rejected');
select throws_ok($test$do $$begin
  update public.subjects set status='suspended' where id=(select subject_id from public.external_identities
    where provider_subject='96000000-0000-4000-8000-000000000001');
  perform pg_temp.activation();
end;$$$test$,'42501','ACTIVATION_REJECTED','suspended subject rejected');
select throws_ok($test$do $$begin
  insert into public.tenant_memberships(tenant_id,subject_id,role,status)
  select '10000000-0000-4000-8000-000000000002',subject_id,'patient','invited'
    from public.external_identities where provider_subject='96000000-0000-4000-8000-000000000001';
  perform pg_temp.activation();
end;$$$test$,'42501','ACTIVATION_REJECTED','another tenant membership rejected');

-- Force a late failure to prove the entire command rolls back, including receipts/membership.
create function pg_temp.fail_activation_audit() returns trigger language plpgsql as $$
begin
  if new.action='identity.account.activated' then raise exception 'synthetic audit failure'; end if;
  return new;
end; $$;
create trigger synthetic_activation_failure before insert on public.audit_events
for each row execute function pg_temp.fail_activation_audit();
select throws_ok($$select pg_temp.activation()$$,'P0001','synthetic audit failure','late failure propagates');
select is((select count(*) from public.client_profiles where given_name='Synthetic'),0::bigint,'late failure rolls profile back');
select is((select count(*) from public.pilot_instrument_receipts where publication_id='96000000-0000-4000-8000-000000000004'),0::bigint,'late failure rolls receipts back');
select is((select status from public.identity_invitations where id='96000000-0000-4000-8000-000000000003'),'pending','late failure leaves invitation pending');
select is((select count(*) from public.tenant_memberships where subject_id=(select subject_id from public.external_identities
  where provider_subject='96000000-0000-4000-8000-000000000001')),0::bigint,'late failure leaves no active membership');
drop trigger synthetic_activation_failure on public.audit_events;

select lives_ok($$select pg_temp.activation()$$,'complete atomic activation succeeds');
select is((select count(*) from public.pilot_instrument_receipts where publication_id in ('96000000-0000-4000-8000-000000000004','96000000-0000-4000-8000-000000000005')),2::bigint,'two exact separate receipts persist');
select is((select mobile_verification_status from public.client_profiles where given_name='Synthetic'),'pending','WhatsApp is not falsely verified');
select is((select status from public.identity_invitations where id='96000000-0000-4000-8000-000000000003'),'accepted','invitation accepted');
select is((select status from public.tenant_memberships where subject_id=(select subject_id from public.external_identities
  where provider_subject='96000000-0000-4000-8000-000000000001')),'active','patient membership activated');
select is((select metadata from public.audit_events where action='identity.account.activated'
  and correlation_id='96000000-0000-4000-8000-000000000006'),'{}'::jsonb,'audit contains no profile values');
select is((select count(*) from public.pilot_account_lifecycle_events where event_type='activated' and idempotency_key='96000000-0000-4000-8000-000000000006'),1::bigint,'one lifecycle fact persists');
select lives_ok($$select pg_temp.activation()$$,'identical retry returns original result');
select is((select count(*) from public.client_profiles where given_name='Synthetic'),1::bigint,'retry does not duplicate profile');
select throws_ok($$select pg_temp.activation('{"givenName":"Changed"}')$$,'22023','ACTIVATION_REJECTED','conflicting replay rejected');
select throws_ok($$select pg_temp.activation('{"requestKey":"96000000-0000-4000-8000-000000000007"}')$$,'22023','ACTIVATION_REJECTED','different key cannot reuse invitation');
select * from finish();
rollback;
