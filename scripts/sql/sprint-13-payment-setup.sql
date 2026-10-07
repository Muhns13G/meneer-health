-- Task 13.4 only. Operator substitutes fresh validated UUIDs; no local seed or real data.
-- Auth subjects/contacts and provider session already exist through actual Auth synchronisation.
begin;
do $$begin
 if (select count(*) from auth.users)<>5
 or (select count(*) from public.tenants)<>1
 or not exists(select 1 from public.tenants where id='80000000-0000-4000-8000-000000000001' and status='suspended')
 or exists(select 1 from public.client_profiles)
 or exists(select 1 from commerce_private.checkout_intents)
 or exists(select 1 from intake_private.intakes)
 then raise exception 'SPRINT13_PAYMENT_BASELINE_CHANGED';end if;
end $$;
insert into public.tenants(id,slug,display_name,status) values
 ('e1340000-0000-4000-8000-000000000001','synthetic-sprint13-payment','SYNTHETIC DEPOSIT ONLY','active');
-- Distinct actors: operations cannot grant its own assignment or commercial authority.
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 values ('e1340000-0000-4000-8000-000000000001','{{operations}}','operations','active',now()-interval '1 minute',now()+interval '2 hours','{{admin}}'),
 ('e1340000-0000-4000-8000-000000000001','{{alternate}}','operations','active',now()-interval '1 minute',now()+interval '2 hours','{{admin}}'),
 ('e1340000-0000-4000-8000-000000000001','{{admin}}','admin','active',now()-interval '1 minute',now()+interval '2 hours','{{clinician}}'),
 ('e1340000-0000-4000-8000-000000000001','{{clinician}}','clinician','active',now()-interval '1 minute',now()+interval '2 hours','{{admin}}');
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at,expires_at)
 values ('e1340000-0000-4000-8000-000000000004','pilot-account-terms','1.0','SYNTHETIC TEST ONLY account terms',repeat('0',64),'/account/activate','sprint13-synthetic-only','{{admin}}',now()-interval '1 hour',now()-interval '1 minute',now()+interval '2 hours'),
 ('e1340000-0000-4000-8000-000000000005','pilot-privacy-notice','1.0','SYNTHETIC TEST ONLY privacy notice',repeat('0',64),'/account/activate','sprint13-synthetic-only','{{admin}}',now()-interval '1 hour',now()-interval '1 minute',now()+interval '2 hours');
-- Declared generated-session/account prerequisites, NOT fresh email-delivery evidence.
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,expires_at,issued_by_subject_id,purpose,request_key,delivery_status,delivered_at)
 select 'e1340000-0000-4000-8000-000000000006','e1340000-0000-4000-8000-000000000001',encode(extensions.digest(convert_to(lower(email),'UTF8'),'sha256'),'hex'),'patient',id::text,now()+interval '2 hours','{{admin}}','operations',gen_random_uuid(),'delivered',now()
 from auth.users where id='{{patientAuth}}';
select public.activate_pilot_account('e1340000-0000-4000-8000-000000000006','e1340000-0000-4000-8000-000000000001','{{patientAuth}}','{{providerSession}}',
 jsonb_build_object('givenName','Synthetic','familyName','Payment','mobileE164','+27820000000','contactPreference','email','termsPublicationId','e1340000-0000-4000-8000-000000000004','termsHash',encode(extensions.digest(convert_to('SYNTHETIC TEST ONLY account terms','UTF8'),'sha256'),'hex'),'privacyPublicationId','e1340000-0000-4000-8000-000000000005','privacyHash',encode(extensions.digest(convert_to('SYNTHETIC TEST ONLY privacy notice','UTF8'),'sha256'),'hex'),'termsAccepted',true,'privacyAcknowledged',true,'requestKey',gen_random_uuid()));
insert into public.operations_cases(id,tenant_id,subject_id) values
 ('e1340000-0000-4000-8000-000000000010','e1340000-0000-4000-8000-000000000001','{{patient}}');
insert into intake_private.publications(id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,effective_at,expires_at,status)
 values('e1340000-0000-4000-8000-000000000002','e1340000-0000-4000-8000-000000000001','1.1.0','1.0.0','06db05e0eac46bebb855f4aa9afca05769603ce0c4f19282931904216cbd5a34','SYNTHETIC TEST ONLY privacy','SYNTHETIC TEST ONLY review',gen_random_uuid(),'{{clinician}}','{{admin}}','{{clinician}}','{{admin}}',300,gen_random_uuid(),'SYNTHETIC TEST ONLY urgent guidance','SYNTHETIC TEST ONLY fallback',now()-interval '1 minute',now()+interval '2 hours','published');
-- Declared submitted-intake prerequisite, not medical submission/UI/encryption evidence.
insert into intake_private.intakes(id,tenant_id,subject_id,case_id,publication_id,state,snapshot_id)
 values('e1340000-0000-4000-8000-000000000003','e1340000-0000-4000-8000-000000000001','{{patient}}','e1340000-0000-4000-8000-000000000010','e1340000-0000-4000-8000-000000000002','submitted',gen_random_uuid());
insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at)
 values('e1340000-0000-4000-8000-000000000011','review_deposit','synthetic-sprint13-deposit','SYNTHETIC review deposit',99900,'vat-inclusive-planning',repeat('a',64),gen_random_uuid(),'local-synthetic',now()-interval '1 minute',now()+interval '2 hours');
insert into commerce_private.order_publications(id,tenant_id,scenario,instrument_version,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
 values('e1340000-0000-4000-8000-000000000012','e1340000-0000-4000-8000-000000000001','review_deposit','1.0.0','SYNTHETIC TEST ONLY supplier','SYNTHETIC TEST ONLY deposit terms',repeat('0',64),gen_random_uuid(),now()-interval '1 minute',now()+interval '2 hours','published');
-- Time-limited test release under fresh owner sandbox authority; not product/clinical release.
insert into commerce_private.checkout_releases values
 ('e1340000-0000-4000-8000-000000000001','acct_1U32UbFfj16Nnr1i',gen_random_uuid(),now()+interval '2 hours',true);
insert into public.service_identities(id,tenant_id,name,environment,purpose,status,expires_at)
 values('e1340000-0000-4000-8000-000000000020','e1340000-0000-4000-8000-000000000001','synthetic-sprint13-deposit','preview','operations','active',now()+interval '2 hours');
insert into public.service_identity_scopes(service_identity_id,resource,action)
 values('e1340000-0000-4000-8000-000000000020','payment','append'),('e1340000-0000-4000-8000-000000000020','payment','update');
-- Assignment/claim, Checkout and funding are deliberately NOT seeded: prove actual boundaries.
commit;
