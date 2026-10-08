begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('a1430000-0000-4000-8000-000000000001','mobile-operator@example.invalid',now(),false,false);
create temporary table mobile_actor as select subject_id from public.external_identities
where provider='supabase' and provider_subject='a1430000-0000-4000-8000-000000000001';
grant select on mobile_actor to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('a1430000-0000-4000-8000-000000000002','a1430000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
'20000000-0000-4000-8000-000000000003' from mobile_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select 'a1430000-0000-4000-8000-000000000003',subject_id,'a1430000-0000-4000-8000-000000000002',
'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from mobile_actor;
insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
select '10000000-0000-4000-8000-000000000001',subject_id,'identity_contact',
'10000000-0000-4000-8000-000000000001','operations','active',now()-interval '1 day',now()+interval '1 day' from mobile_actor;
create function pg_temp.mobile_command(command jsonb,tenant uuid default '10000000-0000-4000-8000-000000000001')
returns jsonb language sql as $$select public.command_mobile_invitation_register(
'a1430000-0000-4000-8000-000000000001','a1430000-0000-4000-8000-000000000002','mobile-operator@example.invalid',
'a1430000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),tenant,command)$$;
create function pg_temp.mobile_read() returns jsonb language sql as $$select public.read_mobile_invitation_register(
'a1430000-0000-4000-8000-000000000001','a1430000-0000-4000-8000-000000000002','mobile-operator@example.invalid',
'a1430000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),'10000000-0000-4000-8000-000000000001')$$;
create function pg_temp.create_mobile(n integer,phone_value text default '+999000000001') returns jsonb language sql as $$
select pg_temp.mobile_command(jsonb_build_object('action','create','requestKey',md5('mobile-create'||n)::uuid,
'givenName','Synthetic','familyName','Participant','phone',phone_value,'provenanceReference',md5('provenance'||n)::uuid,
'contactAuthorityReference',md5('authority'||n)::uuid))$$;
-- Helpers below use an opaque result fixture visible to the caller, never private table access.
create temporary table target_mobile(id uuid);
grant select,insert on target_mobile to service_role;
create function pg_temp.change_mobile(action text,version integer,n integer) returns jsonb language sql as $$
select pg_temp.mobile_command(jsonb_build_object('action',action,'requestKey',md5('mobile-change'||n)::uuid,
'invitationId',(select id from target_mobile),'expectedVersion',version))$$;

select ok(not has_function_privilege('anon','public.command_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,jsonb)','execute'),'anonymous mutation denied');
select ok(not has_function_privilege('authenticated','public.read_mobile_invitation_register(uuid,uuid,text,uuid,uuid,uuid,uuid)','execute'),'browser direct read denied');
select ok(not has_function_privilege('service_role','identity_private.require_mobile_invitation_operator(uuid,uuid,text,uuid,uuid,uuid)','execute'),'private authority helper not exposed');
select ok(relrowsecurity and relforcerowsecurity,relname||' forces RLS') from pg_class
where oid in ('identity_private.mobile_invitation_policies'::regclass,'identity_private.mobile_invitation_commands'::regclass,
'identity_private.mobile_invitation_send_reservations'::regclass);
select ok(not has_table_privilege(r,t,'SELECT,INSERT,UPDATE,DELETE'),r||' cannot access '||t)
from unnest(array['anon','authenticated','service_role']) r cross join unnest(array[
'identity_private.mobile_invitation_policies','identity_private.mobile_invitation_commands','identity_private.mobile_invitation_send_reservations']) t;
set local role service_role;
insert into target_mobile select (pg_temp.create_mobile(1)->>'invitationId')::uuid;
select is(pg_temp.create_mobile(1)->>'invitationId',(select id::text from target_mobile),'same create replay returns same opaque record');
select throws_ok($$select pg_temp.create_mobile(1,'+999000000002')$$,'PT409','MOBILE_INVITATION_CONFLICT','changed replay cannot replace contact');
select throws_ok($$select pg_temp.create_mobile(2)$$,'PT409','MOBILE_INVITATION_CONFLICT','duplicate phone rejected');
select throws_ok($$select pg_temp.create_mobile(2,'0821234567')$$,'22023','MOBILE_INPUT_INVALID','non-E164 rejected');
select throws_ok($$select pg_temp.change_mobile('send',1,1)$$,'PT409','MOBILE_INVITATION_CONFLICT','send requires review');
select is(pg_temp.change_mobile('review',1,2)->>'smsSent','false','review does not send SMS');
select throws_ok($$select pg_temp.change_mobile('send',1,3)$$,'PT429','MOBILE_BUDGET_EXCEEDED','missing policy defaults reservations off');
select is(pg_temp.mobile_read()->>'sendingEnabled','false','staff projection never asserts sending enabled');
select is(pg_temp.mobile_read()->'invitations'->0->>'maskedPhone','***01','register masks phone');
select ok(pg_temp.mobile_read()::text not like '%+999%' and pg_temp.mobile_read()::text not like '%digest%',
'projection contains neither phone nor bearer/contact digests');
reset role;
insert into identity_private.mobile_invitation_policies(tenant_id,daily_reservation_limit)
values('10000000-0000-4000-8000-000000000001',5);
set local role service_role;
select is(pg_temp.change_mobile('send',1,3)->>'smsSent','false','send reserves without provider dispatch');
select is(pg_temp.change_mobile('send',1,3)->>'version','1','exact reservation replay returns receipt');
select throws_ok($$select pg_temp.change_mobile('send',1,4)$$,'PT409','MOBILE_INVITATION_CONFLICT','new send key cannot duplicate current reservation');
reset role;
-- Synthetic issued token/claim stand in for later 14.4/14.6 machinery, without a provider call.
update identity_private.mobile_invitations set status='issued',issued_at=now(),expires_at=now()+interval '48 hours'
where id=(select id from target_mobile);
insert into identity_private.mobile_invitation_tokens(id,invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
select 'a1430000-0000-4000-8000-000000000011',id,tenant_id,version,repeat('a',64),issued_at,expires_at
from identity_private.mobile_invitations;
insert into identity_private.mobile_invitation_claims(invitation_id,tenant_id,token_id,claim_digest,request_key,expires_at)
select id,tenant_id,'a1430000-0000-4000-8000-000000000011',repeat('b',64),gen_random_uuid(),clock_timestamp()+interval '15 minutes'
from identity_private.mobile_invitations;
set local role service_role;
select is(pg_temp.change_mobile('resend',1,5)->>'version','2','resend supersedes under tenant lock');
select throws_ok($$select pg_temp.change_mobile('resend',1,6)$$,'PT409','MOBILE_INVITATION_CONFLICT','stale version rejected');
reset role;
select is((select state from identity_private.mobile_invitation_tokens),'superseded','resend invalidates old token atomically');
select is((select state from identity_private.mobile_invitation_claims),'revoked','resend invalidates old claim atomically');
select is((select count(*) from identity_private.mobile_invitation_send_reservations),2::bigint,'replays consume no second budget');
set local role service_role;
select is(pg_temp.change_mobile('resend',2,6)->>'version','3','third reserved attempt allowed');
select throws_ok($$select pg_temp.change_mobile('resend',3,7)$$,'PT429','MOBILE_BUDGET_EXCEEDED','fourth attempt in 24h rejected');
select throws_ok($$select pg_temp.mobile_command(jsonb_build_object('action','revoke','invitationId',gen_random_uuid(),
'expectedVersion',1,'requestKey',gen_random_uuid()))$$,'42501','MOBILE_INVITATION_REJECTED','unknown invitation does not expose roster');
select throws_ok($$select pg_temp.mobile_command(jsonb_build_object('action','create','requestKey',gen_random_uuid(),
'givenName','Synthetic','familyName','Participant','phone','+999000000003','provenanceReference',gen_random_uuid(),
'contactAuthorityReference',gen_random_uuid()),'10000000-0000-4000-8000-000000000002')$$,
'42501','WORKFORCE_REJECTED','foreign tenant denied');
reset role;
select throws_ok($test$do $$begin update public.access_assignments set status='revoked' where subject_id=(select subject_id from mobile_actor);
perform pg_temp.change_mobile('send',1,3); end$$$test$,'42501','MOBILE_INVITATION_REJECTED','scope revocation denies exact replay');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1' where id='a1430000-0000-4000-8000-000000000002';
perform pg_temp.mobile_read(); end$$$test$,'42501','WORKFORCE_REJECTED','email-only assurance denied');
select throws_ok($test$do $$begin update public.tenant_memberships set role='support' where subject_id=(select subject_id from mobile_actor);
perform pg_temp.mobile_read(); end$$$test$,'42501','MOBILE_INVITATION_REJECTED','wrong role and purpose denied');
select throws_ok($test$do $$begin update public.identity_sessions set idle_expires_at=clock_timestamp()+interval '100 milliseconds'
where id='a1430000-0000-4000-8000-000000000003'; perform pg_sleep(0.15); perform pg_temp.mobile_read(); end$$$test$,
'42501','MOBILE_INVITATION_REJECTED','transaction-fixed time does not prolong authority');
create function pg_temp.fail_mobile_audit() returns trigger language plpgsql as $$begin
raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end$$;
create trigger synthetic_mobile_audit_failure before insert on identity_private.mobile_invitation_events
for each row execute function pg_temp.fail_mobile_audit();
select throws_ok($$select pg_temp.change_mobile('revoke',3,8)$$,'55000','SYNTHETIC_AUDIT_FAILURE','audit failure rolls back revocation');
select is((select status from identity_private.mobile_invitations),'draft','audit failure preserves original state');
drop trigger synthetic_mobile_audit_failure on identity_private.mobile_invitation_events;
set local role service_role;
select is(pg_temp.change_mobile('revoke',3,8)->>'status','revoked','explicit revoke succeeds');
select throws_ok($$select pg_temp.change_mobile('resend',3,9)$$,'PT409','MOBILE_INVITATION_CONFLICT','terminal state cannot resend');
reset role;
select is((select count(*) from public.audit_events where action like 'mobile.invitation.%'),6::bigint,
'each committed command has one central audit fact; replays/denials have none');
select throws_ok($test$do $$declare second_id uuid; begin
update identity_private.mobile_invitation_policies set daily_reservation_limit=3;
second_id:=(pg_temp.create_mobile(2,'+999000000002')->>'invitationId')::uuid;
perform pg_temp.mobile_command(jsonb_build_object('action','review','invitationId',second_id,
'expectedVersion',1,'requestKey',gen_random_uuid()));
perform pg_temp.mobile_command(jsonb_build_object('action','send','invitationId',second_id,
'expectedVersion',1,'requestKey',gen_random_uuid())); end$$$test$,
'PT429','MOBILE_BUDGET_EXCEEDED','tenant rolling budget shared across invitations');
select throws_ok($test$do $$begin
for n in 2..11 loop perform pg_temp.create_mobile(n,'+999000000'||lpad(n::text,3,'0')); end loop;
end$$$test$,'PT429','MOBILE_BUDGET_EXCEEDED','staff hourly creation budget enforced');
select throws_ok($$select pg_temp.mobile_command(jsonb_build_object('action','revoke',
'invitationId',(select id from target_mobile),'expectedVersion',3,'requestKey',gen_random_uuid(),
'healthAnswers','forbidden'))$$,'22023','MOBILE_INPUT_INVALID','SQL boundary rejects extra private health payload');
select is((select count(*) from identity_private.mobile_invitation_tokens),1::bigint,'no staff command generates another token');
select throws_ok($$update identity_private.mobile_invitation_send_reservations set invitation_version=99$$,
'55000','APPEND_ONLY_RECORD','reservations immutable');
select throws_ok($$delete from identity_private.mobile_invitation_commands$$,'55000','APPEND_ONLY_RECORD','replay receipts immutable');
select * from finish();
rollback;
