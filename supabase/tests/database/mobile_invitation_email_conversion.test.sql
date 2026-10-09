begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create function pg_temp.mobile(n integer) returns void language plpgsql as $$
declare i uuid:=md5('email-inv'||n)::uuid; moment timestamptz:=clock_timestamp();
begin
 insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,provenance_reference,contact_authority_reference,request_key)
 values(i,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003',gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
 insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,family_name,phone)
 values(i,'10000000-0000-4000-8000-000000000001','Synthetic','Conversion','+9991000000'||n);
 update identity_private.mobile_invitations set status='issued',issued_at=moment,expires_at=moment+interval '48 hours' where id=i;
 insert into identity_private.mobile_invitation_tokens(invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
 values(i,'10000000-0000-4000-8000-000000000001',1,md5('email-token'||n)||md5('email-token'||n),moment,moment+interval '48 hours');
 perform public.exchange_mobile_invitation('10000000-0000-4000-8000-000000000001','redeem',md5('email-token'||n)||md5('email-token'||n),md5('email-secret'||n)||md5('email-secret'||n),md5('email-request'||n)::uuid);
 perform public.exchange_mobile_invitation('10000000-0000-4000-8000-000000000001','bind',md5('email-token'||n)||md5('email-token'||n),md5('email-secret'||n)||md5('email-secret'||n),md5('email-request'||n)::uuid,'mobile'||n||'@example.invalid');
end $$;
create function pg_temp.prepare(n integer default 1,secret text default null,tenant uuid default '10000000-0000-4000-8000-000000000001') returns jsonb language sql as $$
 select public.prepare_mobile_email_exchange(tenant,md5('email-token'||n)||md5('email-token'||n),coalesce(secret,md5('email-secret'||n)||md5('email-secret'||n)),md5('email-request'||n)::uuid) $$;
create function pg_temp.finish_email(n integer default 1,provider uuid default md5('email-auth1')::uuid) returns boolean language sql as $$
 select public.finish_mobile_email_exchange('10000000-0000-4000-8000-000000000001',md5('email-token'||n)||md5('email-token'||n),md5('email-secret'||n)||md5('email-secret'||n),md5('email-request'||n)::uuid,provider) $$;
create function pg_temp.read_email(n integer default 1) returns jsonb language sql as $$
 select public.read_mobile_email_exchange('10000000-0000-4000-8000-000000000001',md5('email-token'||n)||md5('email-token'||n),md5('email-secret'||n)||md5('email-secret'||n),md5('email-request'||n)::uuid) $$;
create function pg_temp.verify_email(n integer default 1,session uuid default md5('email-session1')::uuid) returns boolean language sql as $$
 select public.verify_mobile_email_exchange('10000000-0000-4000-8000-000000000001',md5('email-token'||n)||md5('email-token'||n),md5('email-secret'||n)||md5('email-secret'||n),md5('email-request'||n)::uuid,md5('email-auth'||n)::uuid,session) $$;
create function pg_temp.activate(n integer default 1,override jsonb default '{}'::jsonb) returns uuid language sql as $$
 select public.activate_pilot_account((select email_invitation_id from identity_private.mobile_email_exchanges where mobile_invitation_id=md5('email-inv'||n)::uuid),
 '10000000-0000-4000-8000-000000000001',md5('email-auth'||n)::uuid,md5('email-session'||n)::uuid,
 jsonb_build_object('givenName','Synthetic','familyName','Mobile','mobileE164','+99910000001','contactPreference','email',
 'termsPublicationId',md5('email-terms')::uuid,'termsHash',encode(sha256(convert_to('Synthetic mobile terms','UTF8')),'hex'),
 'privacyPublicationId',md5('email-privacy')::uuid,'privacyHash',encode(sha256(convert_to('Synthetic mobile privacy','UTF8')),'hex'),
 'termsAccepted',true,'privacyAcknowledged',true,'requestKey',md5('email-activation'||n)::uuid)||override) $$;
select ok(not has_table_privilege(r,'identity_private.mobile_email_exchanges','select'),r||' no private exchange table') from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_function_privilege(r,'public.prepare_mobile_email_exchange(uuid,text,text,uuid)','execute'),r||' no public reservation RPC') from unnest(array['anon','authenticated']) r;
select ok(not has_function_privilege('service_role','identity_private.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb)','execute'),'retired activation primitive stays private');
select ok(has_function_privilege('service_role','public.activate_pilot_account(uuid,uuid,uuid,uuid,jsonb)','execute'),'wrapper remains service only');
select pg_temp.mobile(1);
select is(pg_temp.prepare(secret=>repeat('c',64)),null::jsonb,'foreign claim secret denied');
select is(pg_temp.prepare(tenant=>'10000000-0000-4000-8000-000000000002'),null::jsonb,'wrong tenant denied');
select is(pg_temp.read_email(),null::jsonb,'no email lease before reservation');
create function pg_temp.fail_email_audit() returns trigger language plpgsql as $$begin
 if new.action='mobile.email.reserved' then raise exception 'synthetic email audit failure'; end if; return new; end$$;
create trigger synthetic_email_failure before insert on public.audit_events for each row execute function pg_temp.fail_email_audit();
select throws_ok($$select pg_temp.prepare()$$,'P0001','synthetic email audit failure','reservation/audit atomic');
select is((select count(*) from identity_private.mobile_email_exchanges),0::bigint,'failed reservation leaves no lease');
select is((select count(*) from identity_private.mobile_identity_creation_leases),0::bigint,'failed reservation leaves no creation capability');
drop trigger synthetic_email_failure on public.audit_events;
create temporary table reservation as select pg_temp.prepare() as result;
select is((select result->>'dispatch' from reservation),'true','one send lease');
select is((select result->>'email' from reservation),'mobile1@example.invalid','server-only bound email');
select is(pg_temp.prepare(),'{"dispatch":false,"state":"reserved"}'::jsonb,'exact retry never sends twice');
select is((select count(*) from identity_private.mobile_email_exchanges),1::bigint,'one durable lease');
select is((select count(*) from identity_private.mobile_identity_creation_leases),1::bigint,'exact reservation replay cannot mint another creation capability');
select ok(not exists(select 1 from identity_private.mobile_identity_creation_leases where proof_digest=(select result->>'creationProof' from reservation)),'creation lease stores only a digest');
select is(pg_temp.read_email(),null::jsonb,'reserved lease not delivered/verified');
insert into auth.users(id,email,is_sso_user,is_anonymous,raw_user_meta_data)
 values(md5('email-auth1')::uuid,'mobile1@example.invalid',false,false,
 jsonb_build_object('mobile_creation_proof',(select result->>'creationProof' from reservation)));
select is((select count(*) from identity_private.mobile_identity_creation_receipts),1::bigint,'Auth INSERT records exact creation provenance');
select ok(not has_table_privilege('service_role','identity_private.mobile_identity_creation_receipts','select'),'creation receipts stay private');
select is(pg_temp.verify_email(),false,'unconfirmed provider cannot verify');
select is(pg_temp.finish_email(provider=>md5('wrong-auth')::uuid),false,'wrong provider binding denied');
select is(pg_temp.finish_email(),true,'exact unconfirmed provider invitation binding succeeds');
select is(pg_temp.finish_email(),false,'completion is not a second send lease');
select is(pg_temp.prepare(),'{"dispatch":false,"state":"delivered"}'::jsonb,'interruption resumes delivered lease without resend');
select is(pg_temp.read_email()->>'email','mobile1@example.invalid','live claim reads bound provider email server-side');
select is((select status from identity_private.mobile_invitations where id=md5('email-inv1')::uuid),'claimed','delivery not conversion');
select is((select state from identity_private.mobile_invitation_tokens where invitation_id=md5('email-inv1')::uuid),'active','delivery not consumption');
update auth.users set email_confirmed_at=clock_timestamp() where id=md5('email-auth1')::uuid;
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(md5('email-session1')::uuid,md5('email-auth1')::uuid,clock_timestamp(),clock_timestamp(),'aal1');
select throws_ok($$select pg_temp.activate()$$,'42501','ACTIVATION_REJECTED','generic account proof cannot bypass mobile verification');
select is(pg_temp.verify_email(session=>md5('other-session')::uuid),false,'wrong provider session denied');
select is(pg_temp.verify_email(),true,'current verified contact/session recorded');
select is(pg_temp.verify_email(),true,'exact verification completion replay safe');
update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=md5('email-session1')::uuid;
select throws_ok($$select pg_temp.activate()$$,'42501','ACTIVATION_REJECTED','revoked provider session cannot activate');
select is(pg_temp.verify_email(),false,'expired provider session cannot refresh mobile proof');
update auth.sessions set not_after=null where id=md5('email-session1')::uuid;
select throws_ok($$select pg_temp.activate()$$,'42501','ACTIVATION_REJECTED','verified email alone does not approve missing terms');
insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
 values(md5('email-terms')::uuid,'pilot-account-terms','1.0','Synthetic mobile terms',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour'),
 (md5('email-privacy')::uuid,'pilot-privacy-notice','1.0','Synthetic mobile privacy',repeat('0',64),'/account/activate','synthetic-only','20000000-0000-4000-8000-000000000001',now()-interval '1 day',now()-interval '1 hour');
select throws_ok($$select pg_temp.activate(override=>'{"termsAccepted":false}')$$,'22023','ACTIVATION_REJECTED','existing exact terms consent remains required');
select throws_ok($$select pg_temp.activate(override=>'{"mobileE164":"+99910000999"}')$$,'42501','ACTIVATION_REJECTED','different roster phone requires staff exception');
create function pg_temp.fail_conversion() returns trigger language plpgsql as $$begin
 if new.action='mobile.invitation.converted' then raise exception 'synthetic conversion failure'; end if; return new; end$$;
create trigger synthetic_conversion_failure before insert on public.audit_events for each row execute function pg_temp.fail_conversion();
select throws_ok($$select pg_temp.activate()$$,'P0001','synthetic conversion failure','late mobile audit failure rolls entire activation back');
select is((select count(*) from public.client_profiles where subject_id=(select subject_id from public.external_identities where provider_subject=md5('email-auth1')::uuid::text)),0::bigint,'no partial profile');
select is((select status from public.identity_invitations where id=(select email_invitation_id from identity_private.mobile_email_exchanges where mobile_invitation_id=md5('email-inv1')::uuid)),'pending','no partial email acceptance');
select is((select state from identity_private.mobile_invitation_tokens where invitation_id=md5('email-inv1')::uuid),'active','no consumption on rollback');
drop trigger synthetic_conversion_failure on public.audit_events;
select lives_ok($$select pg_temp.activate()$$,'existing atomic profile/receipts plus mobile conversion succeeds');
select is((select status from identity_private.mobile_invitations where id=md5('email-inv1')::uuid),'converted','mobile terminal converted');
select is((select state from identity_private.mobile_invitation_tokens where invitation_id=md5('email-inv1')::uuid),'consumed','single-use consumed only at successful activation');
select is((select state from identity_private.mobile_invitation_claims where invitation_id=md5('email-inv1')::uuid),'completed','claim completed');
select lives_ok($$select pg_temp.activate()$$,'exact lost activation response safely retries');
select is((select count(*) from identity_private.mobile_invitation_events where event='converted'),1::bigint,'one conversion event');
select throws_ok($$select pg_temp.activate(override=>'{"givenName":"Changed"}')$$,'22023','ACTIVATION_REJECTED','changed activation replay denied');
select is(pg_temp.read_email(),null::jsonb,'converted link cannot issue another proof');
select pg_temp.mobile(6);
create temporary table foreign_creation_reservation as select pg_temp.prepare(6) as result;
insert into auth.users(id,email,is_sso_user,is_anonymous,raw_user_meta_data)
 values(md5('foreign-email-auth')::uuid,'foreign@example.invalid',false,false,
 jsonb_build_object('mobile_creation_proof',(select result->>'creationProof' from foreign_creation_reservation)));
select is((select count(*) from identity_private.mobile_identity_creation_receipts),1::bigint,'valid nonce cannot attribute a different email');
select is(pg_temp.finish_email(6,md5('foreign-email-auth')::uuid),false,'foreign creation cannot finish email exchange');
select pg_temp.mobile(7);
create temporary table missing_creation_reservation as select pg_temp.prepare(7) as result;
insert into auth.users(id,email,is_sso_user,is_anonymous)
 values(md5('email-auth7')::uuid,'mobile7@example.invalid',false,false);
select is(pg_temp.finish_email(7,md5('email-auth7')::uuid),false,'matching email without creation proof cannot finish');
update auth.users set raw_user_meta_data=jsonb_build_object('mobile_creation_proof',
 (select result->>'creationProof' from missing_creation_reservation)) where id=md5('email-auth7')::uuid;
select is((select count(*) from identity_private.mobile_identity_creation_receipts),1::bigint,'metadata UPDATE cannot invent historical creation provenance');
select pg_temp.mobile(8);
create temporary table returning_creation_reservation as select pg_temp.prepare(8) as result;
insert into public.subjects(id) values(md5('returning-stable-subject')::uuid);
insert into public.subject_contacts(subject_id,kind,normalized_value,status,provider,verified_at)
 values(md5('returning-stable-subject')::uuid,'email','mobile8@example.invalid','verified','supabase',clock_timestamp());
insert into auth.users(id,email,is_sso_user,is_anonymous,raw_user_meta_data)
 values(md5('email-auth8')::uuid,'mobile8@example.invalid',false,false,
 jsonb_build_object('mobile_creation_proof',(select result->>'creationProof' from returning_creation_reservation)));
select is((select subject_id from public.external_identities where provider_subject=md5('email-auth8')::uuid::text),md5('returning-stable-subject')::uuid,'returning contact preserves the stable subject');
select is((select count(*) from identity_private.mobile_identity_creation_receipts),1::bigint,'returning stable subject cannot be attributed as newly created');
select is(pg_temp.finish_email(8,md5('email-auth8')::uuid),false,'returning identity requires staff exception');
select ok(not has_function_privilege('service_role','public.prepare_mobile_email_exchange_before_provenance(uuid,text,text,uuid)','execute'),'retired reservation wrapper is inaccessible');
select ok(not has_function_privilege('service_role','public.finish_mobile_email_exchange_before_provenance(uuid,text,text,uuid,uuid)','execute'),'retired completion wrapper is inaccessible');
select throws_ok($$update identity_private.mobile_identity_creation_receipts set provider_subject_id=gen_random_uuid()$$,'55000','APPEND_ONLY_RECORD','creation receipt is immutable');
select throws_ok($$delete from identity_private.mobile_identity_creation_leases$$,'55000','APPEND_ONLY_RECORD','creation lease cannot be erased operationally');
select ok(not has_table_privilege(r,'identity_private.mobile_identity_creation_leases','select'),r||' cannot read creation capability digests') from unnest(array['anon','authenticated','service_role']) r;
select is((select count(*) from pg_class where oid in ('identity_private.mobile_identity_creation_leases'::regclass,'identity_private.mobile_identity_creation_receipts'::regclass) and relrowsecurity and relforcerowsecurity),2::bigint,'creation evidence has forced RLS');
select pg_temp.mobile(2);
insert into auth.users(id,email,is_sso_user,is_anonymous) values(md5('email-auth2')::uuid,'mobile2@example.invalid',false,false);
select is(pg_temp.prepare(2),null::jsonb,'existing Auth account requires staff exception before sending');
select pg_temp.mobile(3);
select pg_temp.prepare(3);
select is(pg_temp.finish_email(3,null),false,'uncertain send not delivered');
select is(pg_temp.prepare(3),'{"dispatch":false,"state":"uncertain"}'::jsonb,'uncertain delivery never resends');
select is(pg_temp.read_email(3),null::jsonb,'uncertainty cannot verify');
select pg_temp.mobile(4);
select pg_temp.prepare(4);
update identity_private.mobile_invitations set status='revoked',terminal_at=clock_timestamp() where id=md5('email-inv4')::uuid;
select is(pg_temp.read_email(4),null::jsonb,'revoke immediately rejects old cookie');
select is(pg_temp.finish_email(4,null),false,'late callback cannot revive revoked invitation');
select pg_temp.mobile(5);
select pg_temp.prepare(5);
update identity_private.mobile_invitations set version=2,status='draft',issued_at=null,expires_at=null,bound_email_digest=null where id=md5('email-inv5')::uuid;
select is(pg_temp.read_email(5),null::jsonb,'resend supersession invalidates old provider flow');
select is(public.sweep_mobile_invitation_retention('10000000-0000-4000-8000-000000000001')->>'contactsPurged','0','young/converted contacts retained');
select ok(not has_function_privilege('anon','public.sweep_mobile_invitation_retention(uuid)','execute'),'anonymous cannot purge');
-- Historical local-only fixture; guards remain enabled outside this rollback packet.
alter table identity_private.mobile_invitations disable trigger mobile_invitation_guard;
update identity_private.mobile_invitations set terminal_at=now()-interval '31 days' where id=md5('email-inv4')::uuid;
alter table identity_private.mobile_invitations enable trigger mobile_invitation_guard;
select is(public.sweep_mobile_invitation_retention('10000000-0000-4000-8000-000000000001')->>'contactsPurged','1','elapsed unconverted contact purged');
select is((select bound_email_digest from identity_private.mobile_invitations where id=md5('email-inv4')::uuid),null::text,'purge removes invitation email digest');
select is((select email_digest from identity_private.mobile_invitation_claims where invitation_id=md5('email-inv4')::uuid),null::text,'purge removes claim email digest');
alter table identity_private.mobile_invitation_events disable trigger mobile_event_immutable;
update identity_private.mobile_invitation_events set recorded_at=now()-interval '91 days',retain_until=now()-interval '1 day' where invitation_id=md5('email-inv4')::uuid;
alter table identity_private.mobile_invitation_events enable trigger mobile_event_immutable;
select ok((public.sweep_mobile_invitation_retention('10000000-0000-4000-8000-000000000001')->>'eventsPurged')::integer>0,'elapsed minimal mobile journal is purged');
select is((select count(*) from identity_private.mobile_invitation_events where invitation_id=md5('email-inv4')::uuid),0::bigint,'no retained expired mobile journal');
select is((select count(*) from pg_trigger where not tgisinternal and tgenabled='D'),0::bigint,'all guards restored');
select * from finish();
rollback;
