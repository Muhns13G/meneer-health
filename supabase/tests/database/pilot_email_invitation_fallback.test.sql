begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
 values(md5('fallback-operator')::uuid,'fallback-operator@example.invalid',now(),false,false);
create temporary table fallback_actor as select subject_id from public.external_identities where provider_subject=md5('fallback-operator')::uuid::text;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 values(md5('fallback-session')::uuid,md5('fallback-operator')::uuid,now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from fallback_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
 select md5('fallback-app-session')::uuid,subject_id,md5('fallback-session')::uuid,'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from fallback_actor;
insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
 select '10000000-0000-4000-8000-000000000001',subject_id,'identity_contact','10000000-0000-4000-8000-000000000001','operations','active',now()-interval '1 day',now()+interval '1 day' from fallback_actor;
create function pg_temp.email_prepare(n integer default 1,version integer default 1,mail text default 'fallback@example.invalid',tenant uuid default '10000000-0000-4000-8000-000000000001') returns jsonb language sql as $$
 select public.prepare_pilot_email_invitation(md5('fallback-operator')::uuid,md5('fallback-session')::uuid,'fallback-operator@example.invalid',md5('fallback-app-session')::uuid,(select subject_id from fallback_actor),tenant,md5('fallback-inv'||n)::uuid,version,md5('fallback-send'||n)::uuid,mail,repeat('f',64)) $$;
create function pg_temp.fixture(n integer,issued boolean default false) returns void language plpgsql as $$
declare moment timestamptz:=clock_timestamp();
begin
 insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,provenance_reference,contact_authority_reference,request_key)
 select md5('fallback-inv'||n)::uuid,'10000000-0000-4000-8000-000000000001',subject_id,gen_random_uuid(),gen_random_uuid(),gen_random_uuid() from fallback_actor;
 insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,family_name,phone)
 values(md5('fallback-inv'||n)::uuid,'10000000-0000-4000-8000-000000000001','Synthetic','Fallback','+9992000000'||n);
 insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,actor_subject_id,request_key)
 select md5('fallback-inv'||n)::uuid,'10000000-0000-4000-8000-000000000001',1,'reviewed',subject_id,gen_random_uuid() from fallback_actor;
 if issued then
  update identity_private.mobile_invitations set status='issued',issued_at=moment,expires_at=moment+interval '48 hours' where id=md5('fallback-inv'||n)::uuid;
  insert into identity_private.mobile_invitation_tokens(invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
  values(md5('fallback-inv'||n)::uuid,'10000000-0000-4000-8000-000000000001',1,repeat('a',64),moment,moment+interval '48 hours');
 end if;
end $$;
create function pg_temp.claim(action text,digest text default repeat('f',64),mail text default null) returns jsonb language sql as $$
 select public.exchange_mobile_invitation('10000000-0000-4000-8000-000000000001',action,digest,repeat('b',64),md5('fallback-claim')::uuid,mail) $$;
select ok(not has_function_privilege(r,'public.prepare_pilot_email_invitation(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,uuid,text,text)','execute'),r||' cannot call prepare') from unnest(array['anon','authenticated']) r;
select ok(not has_table_privilege(r,'identity_private.pilot_email_invitation_attempts','select,insert,update,delete'),r||' no attempt table access') from unnest(array['anon','authenticated','service_role']) r;
select ok(relrowsecurity and relforcerowsecurity,'attempt journal forces RLS') from pg_class where oid='identity_private.pilot_email_invitation_attempts'::regclass;
select pg_temp.fixture(1,true);
select throws_ok($$select pg_temp.email_prepare()$$,'42501','EMAIL_DELIVERY_DISABLED','email policy defaults off');
insert into identity_private.mobile_invitation_policies(tenant_id,email_delivery_enabled) values('10000000-0000-4000-8000-000000000001',true);
select throws_ok($$select pg_temp.email_prepare(version=>2)$$,'PT409','MOBILE_INVITATION_CONFLICT','stale staff version denied');
select throws_ok($$select pg_temp.email_prepare(mail=>'bad')$$,'22023','MOBILE_INPUT_INVALID','malformed email denied');
select throws_ok($$select pg_temp.email_prepare(tenant=>'10000000-0000-4000-8000-000000000002')$$,'42501','WORKFORCE_REJECTED','wrong tenant denied');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1' where id=md5('fallback-session')::uuid; perform pg_temp.email_prepare(); end$$$test$,'42501','WORKFORCE_REJECTED','email-only staff assurance denied');
select throws_ok($test$do $$begin update public.access_assignments set status='revoked' where subject_id=(select subject_id from fallback_actor); perform pg_temp.email_prepare(); end$$$test$,'42501','MOBILE_INVITATION_REJECTED','revoked assignment denied');
create temporary table fallback_reservation as select pg_temp.email_prepare() result;
select ok((select result->>'attemptId' from fallback_reservation) is not null,'one email lease acquired');
select is(pg_temp.email_prepare(),null::jsonb,'exact replay yields no send capability');
select is(pg_temp.email_prepare(mail=>'other@example.invalid'),null::jsonb,'changed replay cannot redirect email');
select is((select version from identity_private.mobile_invitations where id=md5('fallback-inv1')::uuid),2,'same cohort invitation version superseded');
select is((select state from identity_private.mobile_invitation_tokens where digest=repeat('a',64)),'superseded','old SMS bearer invalidated');
select is(pg_temp.claim('redeem',repeat('a',64)),null::jsonb,'old SMS link cannot claim');
select is((select expires_at-issued_at from identity_private.mobile_invitations where id=md5('fallback-inv1')::uuid),interval '48 hours','email link has 48-hour lifetime');
select is((select count(*) from public.client_profiles),0::bigint,'sending does not create a client profile');
select is((select count(*) from identity_private.mobile_invitation_delivery_intents),0::bigint,'email does not fake SMS dispatch or spend');
select throws_ok($$update identity_private.pilot_email_invitation_attempts set recipient_digest=repeat('e',64)$$,'42501','EMAIL_ATTEMPT_IMMUTABLE','recipient digest immutable');
select is(public.finish_pilot_email_invitation(md5('fallback-operator')::uuid,md5('fallback-session')::uuid,'fallback-operator@example.invalid',md5('fallback-app-session')::uuid,(select subject_id from fallback_actor),'10000000-0000-4000-8000-000000000001',(select (result->>'attemptId')::uuid from fallback_reservation),'accepted'),true,'provider acceptance recorded');
select ok(pg_temp.claim('redeem') is not null,'email-delivered capability uses existing native claim');
select is(pg_temp.claim('bind',mail=>'wrong@example.invalid'),null::jsonb,'forwarded link cannot bind a different mailbox');
select is(pg_temp.claim('bind',mail=>'fallback@example.invalid')->>'emailBound','true','addressed mailbox binding succeeds');
select is(pg_temp.email_prepare(1,2),null::jsonb,'claimed invitation cannot be sent again');
-- Native managed-email creation and verification remain unchanged and require provenance.
create temporary table managed_lease as select public.prepare_mobile_email_exchange('10000000-0000-4000-8000-000000000001',repeat('f',64),repeat('b',64),md5('fallback-claim')::uuid) result;
select is((select result->>'dispatch' from managed_lease),'true','existing Auth invitation lease acquired only after claim/bind');
insert into auth.users(id,email,is_sso_user,is_anonymous,raw_user_meta_data) values(md5('fallback-client')::uuid,'fallback@example.invalid',false,false,jsonb_build_object('mobile_creation_proof',(select result->>'creationProof' from managed_lease)));
select is(public.finish_mobile_email_exchange('10000000-0000-4000-8000-000000000001',repeat('f',64),repeat('b',64),md5('fallback-claim')::uuid,md5('fallback-client')::uuid),true,'existing managed delivery binds exact Auth identity');
select is(public.verify_mobile_email_exchange('10000000-0000-4000-8000-000000000001',repeat('f',64),repeat('b',64),md5('fallback-claim')::uuid,md5('fallback-client')::uuid,md5('fallback-client-session')::uuid),false,'unverified mailbox cannot activate');
update auth.users set email_confirmed_at=clock_timestamp() where id=md5('fallback-client')::uuid;
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(md5('fallback-client-session')::uuid,md5('fallback-client')::uuid,clock_timestamp(),clock_timestamp(),'aal1');
select is(public.verify_mobile_email_exchange('10000000-0000-4000-8000-000000000001',repeat('f',64),repeat('b',64),md5('fallback-claim')::uuid,md5('fallback-client')::uuid,md5('fallback-client-session')::uuid),true,'confirmed mailbox and actual session verified');
select pg_temp.fixture(2);
select throws_ok($$select pg_temp.email_prepare(2,1,'fallback@example.invalid')$$,'PT409','MOBILE_INVITATION_CONFLICT','existing account cannot be silently merged');
select throws_ok($$select public.prepare_pilot_account((select (result->>'invitationId')::uuid from managed_lease),'10000000-0000-4000-8000-000000000001',md5('fallback-client')::uuid,md5('fallback-client-session')::uuid)$$,'42501','ACTIVATION_REJECTED','unpublished account instruments still fail closed');
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
 values(md5('fallback-terms')::uuid,'pilot-account-terms','1.0','Synthetic fallback terms',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
 (md5('fallback-privacy')::uuid,'pilot-privacy-notice','1.0','Synthetic fallback privacy',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
create function pg_temp.activate() returns uuid language sql as $$
 select public.activate_pilot_account((select (result->>'invitationId')::uuid from managed_lease),'10000000-0000-4000-8000-000000000001',md5('fallback-client')::uuid,md5('fallback-client-session')::uuid,
 jsonb_build_object('givenName','Synthetic','familyName','Fallback','mobileE164','+99920000001','contactPreference','email',
 'termsPublicationId',md5('fallback-terms')::uuid,'termsHash',encode(sha256(convert_to('Synthetic fallback terms','UTF8')),'hex'),
 'privacyPublicationId',md5('fallback-privacy')::uuid,'privacyHash',encode(sha256(convert_to('Synthetic fallback privacy','UTF8')),'hex'),
 'termsAccepted',true,'privacyAcknowledged',true,'requestKey',md5('fallback-activation')::uuid)) $$;
select lives_ok($$select pg_temp.activate()$$,'email path activates existing profile and document receipts atomically');
select lives_ok($$select pg_temp.activate()$$,'lost activation response safely retries');
select is((select status from identity_private.mobile_invitations where id=md5('fallback-inv1')::uuid),'converted','original participant converted, not duplicated');
select is((select count(*) from public.client_profiles),1::bigint,'one activated profile');
select is((select count(*) from public.pilot_instrument_receipts),2::bigint,'one terms and one privacy receipt');
select is(pg_temp.claim('redeem'),null::jsonb,'consumed invitation cannot be reused');
select * from finish();
rollback;
