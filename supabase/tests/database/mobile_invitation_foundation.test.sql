begin;
-- Rollback-only synthetic storage proof; no Auth identity, send or hosted target.
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(c.relrowsecurity and c.relforcerowsecurity, c.relname || ' forces RLS')
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='identity_private' and c.relname like 'mobile_invitation%' and c.relkind='r';
select ok(not has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
  r || ' has no direct access to ' || c.relname)
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join unnest(array['anon','authenticated','service_role']) r
where n.nspname='identity_private' and c.relname like 'mobile_invitation%' and c.relkind='r';
select ok(p.prosecdef and p.proconfig=array['search_path=""'],p.proname || ' has pinned search path')
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='identity_private' and p.proname in ('guard_mobile_invitation',
 'guard_mobile_token','guard_mobile_claim','guard_mobile_contact','guard_mobile_event','sync_mobile_contact_state');
select ok(not has_function_privilege(r,p.oid,'EXECUTE'),r || ' cannot execute ' || p.proname)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join unnest(array['anon','authenticated','service_role']) r
where n.nspname='identity_private' and p.proname in ('guard_mobile_invitation',
 'guard_mobile_token','guard_mobile_claim','guard_mobile_contact','guard_mobile_event','sync_mobile_contact_state');
select is((select count(*)::integer from information_schema.columns
 where table_schema='identity_private' and table_name like 'mobile_invitation%'
 and column_name in ('raw_token','token','claim_secret','otp','sms_body','payload')),0,
 'no raw bearer, OTP, SMS body or arbitrary payload storage');

create function pg_temp.inv(n integer, tenant uuid default '10000000-0000-4000-8000-000000000001',
 phone_value text default '+999000000001') returns uuid language plpgsql as $$
declare i uuid:=md5('inv'||n)::uuid; moment timestamptz:=clock_timestamp();
begin
 insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,
 provenance_reference,contact_authority_reference,request_key) values(i,tenant,
 '20000000-0000-4000-8000-000000000001',md5('provenance'||n)::uuid,
 md5('authority'||n)::uuid,md5('request'||n)::uuid);
 insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,
 family_name,phone) values(i,tenant,'Synthetic','Participant',phone_value);
 update identity_private.mobile_invitations set status='issued',issued_at=moment,
 expires_at=moment+interval '48 hours' where id=i;
 insert into identity_private.mobile_invitation_tokens(id,invitation_id,tenant_id,
 invitation_version,digest,issued_at,expires_at) values(md5('token'||n)::uuid,i,tenant,1,
 encode(sha256(convert_to('synthetic-token-'||n,'UTF8')),'hex'),moment,moment+interval '48 hours');
 return i;
end $$;
create function pg_temp.claim(n integer, invitation_number integer, email_value text default null)
returns uuid language plpgsql as $$
declare i identity_private.mobile_invitations; moment timestamptz:=clock_timestamp();
begin
 select * into strict i from identity_private.mobile_invitations where id=md5('inv'||invitation_number)::uuid;
 insert into identity_private.mobile_invitation_claims(id,invitation_id,tenant_id,token_id,
 claim_digest,request_key,email_digest,issued_at,expires_at) values(md5('claim'||n)::uuid,i.id,i.tenant_id,
 md5('token'||invitation_number)::uuid,encode(sha256(convert_to('synthetic-claim-'||n,'UTF8')),'hex'),
 md5('claim-request'||n)::uuid,case when email_value is null then null else
 encode(sha256(convert_to(email_value,'UTF8')),'hex') end,moment,moment+interval '15 minutes');
 return md5('claim'||n)::uuid;
end $$;

select lives_ok($$select pg_temp.inv(1)$$,'first invitation and token issue');
select throws_ok($$select pg_temp.inv(2)$$,'23505',null,'same-tenant phone collision fails');
select lives_ok($$select pg_temp.inv(3,'10000000-0000-4000-8000-000000000002')$$,
 'same phone in separate tenant is isolated');
select lives_ok($$select pg_temp.inv(4,phone_value=>'+999000000004')$$,'second isolated invitation');
select throws_ok($$update identity_private.mobile_invitation_contacts set tenant_id=
 '10000000-0000-4000-8000-000000000002' where invitation_id=md5('inv1')::uuid$$,
 'PT409','MOBILE_CONTACT_CONFLICT','tenant cannot be replaced');
select throws_ok($$update identity_private.mobile_invitation_tokens set digest=repeat('a',64)
 where id=md5('token1')::uuid$$,'PT409','MOBILE_TOKEN_CONFLICT','token digest immutable');
select throws_ok($$update identity_private.mobile_invitations set expires_at=expires_at+interval '1 hour'
 where id=md5('inv1')::uuid$$,'PT409','MOBILE_INVITATION_CONFLICT','no lifetime extension');
select throws_ok($$insert into identity_private.mobile_invitations(tenant_id,created_by_subject_id,
 provenance_reference,contact_authority_reference,request_key,status,issued_at,expires_at)
 values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'issued',now(),now()+interval '48 hours')$$,
 'PT409','MOBILE_INVITATION_CONFLICT','insert cannot bypass draft transition');
select throws_ok($$update identity_private.mobile_invitation_contacts set phone='0821234567'
 where invitation_id=md5('inv1')::uuid$$,'PT409','MOBILE_CONTACT_CONFLICT',
 'issued contact cannot change even to unnormalised phone');
select throws_ok($$update identity_private.mobile_invitations set status='expired',terminal_at=now()
 where id=md5('inv1')::uuid$$,'PT409','MOBILE_INVITATION_EXPIRED','cannot expire future token');
select lives_ok($$select pg_temp.claim(1,1,'participant@synthetic.invalid')$$,'first claim binds email');
select throws_ok($$select pg_temp.claim(2,1,'participant@synthetic.invalid')$$,'23505',null,
 'one live claim wins; competing claim cannot overwrite');
select throws_ok($$update identity_private.mobile_invitation_claims set email_digest=repeat('b',64)
 where id=md5('claim1')::uuid$$,'PT409','MOBILE_CLAIM_CONFLICT','bound claim email cannot change');
update identity_private.mobile_invitation_claims set state='expired' where id=md5('claim1')::uuid;
select throws_ok($$select pg_temp.claim(3,1,'different@synthetic.invalid')$$,'PT409',
 'MOBILE_CLAIM_CONFLICT','new claim cannot replace email from expired claim');
select lives_ok($$select pg_temp.claim(3,1,'participant@synthetic.invalid')$$,
 'new explicit claim may resume same email');
select throws_ok($$select pg_temp.claim(1,1,'participant@synthetic.invalid')$$,'23505',null,
 'old request replay cannot create another record');
select lives_ok($$update identity_private.mobile_invitation_contacts
 set claimed_email='participant@synthetic.invalid' where invitation_id=md5('inv1')::uuid$$,
 'contact email matches frozen digest');
select throws_ok($$update identity_private.mobile_invitation_contacts set claimed_email='other@synthetic.invalid'
 where invitation_id=md5('inv1')::uuid$$,'PT409','MOBILE_CONTACT_CONFLICT','contact email cannot replace binding');
select throws_ok($$update identity_private.mobile_invitation_claims set expires_at=expires_at+interval '1 minute'
 where id=md5('claim3')::uuid$$,'PT409','MOBILE_CLAIM_CONFLICT','claim lifetime immutable');
select lives_ok($$update identity_private.mobile_invitations set version=2,status='draft',
 issued_at=null,expires_at=null,bound_email_digest=null where id=md5('inv1')::uuid$$,
 'explicit supersession resets version and invalidates dependent state');
select is((select state from identity_private.mobile_invitation_tokens where id=md5('token1')::uuid),
 'superseded','old token invalidated');
select is((select state from identity_private.mobile_invitation_claims where id=md5('claim3')::uuid),
 'revoked','old claim invalidated');
select ok((select claimed_email is null from identity_private.mobile_invitation_contacts
 where invitation_id=md5('inv1')::uuid),'supersession clears contact claim');
select throws_ok($$select pg_temp.claim(5,1)$$,'PT409','MOBILE_CLAIM_REJECTED',
 'superseded token cannot claim');
select throws_ok($$update identity_private.mobile_invitation_tokens set state='active'
 where id=md5('token1')::uuid$$,'PT409','MOBILE_TOKEN_CONFLICT','token replay cannot reactivate');
select lives_ok($$select pg_temp.claim(4,4,'purge@synthetic.invalid')$$,'bound active claim for retention');
select lives_ok($$update identity_private.mobile_invitations set status='revoked',terminal_at=clock_timestamp()
 where id=md5('inv4')::uuid$$,'revocation invalidates token and claim atomically');
select is((select state from identity_private.mobile_invitation_claims where id=md5('claim4')::uuid),
 'revoked','revoked invitation claim is unusable');
select throws_ok($$update identity_private.mobile_invitations set status='draft',terminal_at=null
 where id=md5('inv4')::uuid$$,'PT409','MOBILE_INVITATION_CONFLICT','terminal invitation cannot reopen');
select lives_ok($$select pg_temp.inv(5,phone_value=>'+999000000004')$$,
 'revocation releases phone for explicitly new invitation');
select throws_ok($$delete from identity_private.mobile_invitation_contacts where invitation_id=md5('inv4')::uuid$$,
 '42501','MOBILE_CONTACT_RETENTION_REJECTED','contact cannot purge before 30 days');
select ok((select purge_after=terminal_at+interval '30 days' from
 identity_private.mobile_invitation_contacts c join identity_private.mobile_invitations i on i.id=c.invitation_id
 where i.id=md5('inv4')::uuid),'30-day terminal retention derived by trigger');
select throws_ok($$delete from identity_private.mobile_invitation_tokens where id=md5('token4')::uuid$$,
 '42501','MOBILE_TOKEN_CONFLICT','token lineage cannot delete');
select throws_ok($$delete from identity_private.mobile_invitation_claims where id=md5('claim4')::uuid$$,
 '42501','MOBILE_CLAIM_CONFLICT','claim lineage cannot delete');
select throws_ok($$delete from identity_private.mobile_invitations where id=md5('inv4')::uuid$$,
 '42501','MOBILE_INVITATION_STATE_REJECTED','invitation lineage cannot delete');
insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,invitation_version,event,request_key)
values(md5('inv4')::uuid,'10000000-0000-4000-8000-000000000001',1,'revoked',md5('event4')::uuid);
select throws_ok($$update identity_private.mobile_invitation_events set event='created'$$,
 '42501','MOBILE_EVENT_IMMUTABLE','event journal immutable');
select throws_ok($$delete from identity_private.mobile_invitation_events$$,
 '42501','MOBILE_EVENT_IMMUTABLE','journal cannot purge before 90 days');
select throws_ok($$insert into identity_private.mobile_invitation_events(invitation_id,tenant_id,
 invitation_version,event,request_key) values(md5('inv4')::uuid,
 '10000000-0000-4000-8000-000000000002',1,'issued',gen_random_uuid())$$,
 '23503',null,'cross-tenant journal FK rejects');
select throws_ok($$insert into identity_private.mobile_invitation_tokens(invitation_id,tenant_id,
 invitation_version,digest,issued_at,expires_at) values(md5('inv5')::uuid,
 '10000000-0000-4000-8000-000000000001',2,repeat('c',64),now()-interval '3 days',now()-interval '1 day')$$,
 'PT409','MOBILE_TOKEN_REJECTED','expired issuance fails closed');
select throws_ok($$insert into identity_private.mobile_invitation_claims(invitation_id,tenant_id,token_id,
 claim_digest,request_key,issued_at,expires_at) values(md5('inv5')::uuid,
 '10000000-0000-4000-8000-000000000001',md5('token5')::uuid,repeat('d',64),gen_random_uuid(),
 now(),now()+interval '16 minutes')$$,'23514',null,'claim capped at 15 minutes');
select throws_ok($$insert into identity_private.mobile_invitation_claims(invitation_id,tenant_id,token_id,
 claim_digest,request_key,issued_at,expires_at) values(md5('inv5')::uuid,
 '10000000-0000-4000-8000-000000000002',md5('token5')::uuid,repeat('e',64),gen_random_uuid(),
 now(),now()+interval '15 minutes')$$,'PT409','MOBILE_CLAIM_REJECTED','cross-tenant claim rejected');

select lives_ok($$select pg_temp.inv(6,phone_value=>'+999000000006')$$,'conversion fixture issued');
select lives_ok($$select pg_temp.claim(6,6,'converted@synthetic.invalid')$$,'conversion fixture email bound');
update identity_private.mobile_invitations set status='claimed' where id=md5('inv6')::uuid;
insert into public.identity_invitations(id,tenant_id,contact_digest,intended_role,provider_subject,
 status,expires_at,accepted_by_subject_id,accepted_at,issued_by_subject_id,purpose,request_key,
 delivery_status,delivered_at) values(md5('email6')::uuid,'10000000-0000-4000-8000-000000000001',
 encode(sha256(convert_to('converted@synthetic.invalid','UTF8')),'hex'),'patient','synthetic-mobile-six',
 'accepted',now()+interval '1 day','20000000-0000-4000-8000-000000000002',now(),
 '20000000-0000-4000-8000-000000000001','operations',md5('email-request6')::uuid,'delivered',now());
select throws_ok($$update identity_private.mobile_invitations set status='converted',terminal_at=now(),
 converted_subject_id='20000000-0000-4000-8000-000000000003',email_invitation_id=md5('email6')::uuid
 where id=md5('inv6')::uuid$$,'42501','MOBILE_INVITATION_BINDING_REJECTED',
 'conversion rejects a different accepted subject');
select lives_ok($$update identity_private.mobile_invitations set status='converted',terminal_at=now(),
 converted_subject_id='20000000-0000-4000-8000-000000000002',email_invitation_id=md5('email6')::uuid
 where id=md5('inv6')::uuid$$,'conversion requires same-tenant accepted delivered email lineage');
select is((select state from identity_private.mobile_invitation_tokens where id=md5('token6')::uuid),
 'consumed','conversion consumes bearer token');
select is((select state from identity_private.mobile_invitation_claims where id=md5('claim6')::uuid),
 'completed','conversion completes claim');
select throws_ok($$select pg_temp.inv(7,phone_value=>'+999000000006')$$,'23505',null,
 'converted phone cannot autoassign to second account');
select throws_ok($$select pg_temp.claim(7,6)$$,'PT409','MOBILE_CLAIM_REJECTED','converted invitation single-use');

-- Historical fixtures only: backdate terminal/journal clocks under the local owner,
-- restoring triggers immediately inside this rollback-only transaction.
select lives_ok($$select pg_temp.inv(8,phone_value=>'+999000000008')$$,'expiry fixture issued');
select lives_ok($$select pg_temp.claim(8,8)$$,'expiry fixture has a claim');
alter table identity_private.mobile_invitations disable trigger mobile_invitation_guard;
update identity_private.mobile_invitations set issued_at=now()-interval '49 hours',
 expires_at=now()-interval '1 hour' where id=md5('inv8')::uuid;
alter table identity_private.mobile_invitations enable trigger mobile_invitation_guard;
select throws_ok($$select pg_temp.claim(9,8)$$,'PT409','MOBILE_CLAIM_REJECTED',
 'claim cannot outlive its invitation even before expiry sweeping');
select lives_ok($$update identity_private.mobile_invitations set status='expired',terminal_at=now()
 where id=md5('inv8')::uuid$$,'expired transition closes token and claim');
select is((select state from identity_private.mobile_invitation_claims where id=md5('claim8')::uuid),
 'expired','expiry invalidates existing claim');
select is((select state from identity_private.mobile_invitation_tokens where id=md5('token8')::uuid),
 'expired','expiry invalidates existing token');
alter table identity_private.mobile_invitations disable trigger mobile_invitation_guard;
update identity_private.mobile_invitations set terminal_at=now()-interval '31 days' where id=md5('inv4')::uuid;
alter table identity_private.mobile_invitations enable trigger mobile_invitation_guard;
select lives_ok($$delete from identity_private.mobile_invitation_contacts where invitation_id=md5('inv4')::uuid$$,
 'elapsed unconverted contacts can purge independently');
select ok((select bound_email_digest is null from identity_private.mobile_invitations where id=md5('inv4')::uuid),
 'contact purge also removes frozen email digest');
select ok((select email_digest is null from identity_private.mobile_invitation_claims where id=md5('claim4')::uuid),
 'contact purge also removes historical claim email digest');
alter table identity_private.mobile_invitation_events disable trigger mobile_event_immutable;
update identity_private.mobile_invitation_events set recorded_at=now()-interval '91 days',
 retain_until=now()-interval '1 day';
alter table identity_private.mobile_invitation_events enable trigger mobile_event_immutable;
select lives_ok($$delete from identity_private.mobile_invitation_events$$,'elapsed minimal journal can purge');

set local role anon;
select throws_ok($$select * from identity_private.mobile_invitations$$,'42501',null,'anonymous table denied');
reset role;
set local role authenticated;
select throws_ok($$select * from identity_private.mobile_invitation_contacts$$,'42501',null,'authenticated contacts denied');
reset role;
set local role service_role;
select throws_ok($$select * from identity_private.mobile_invitation_tokens$$,'42501',null,'service direct token access denied');
reset role;
select * from finish();
rollback;
