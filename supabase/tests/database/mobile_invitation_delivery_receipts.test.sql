begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
 values('a1450000-0000-4000-8000-000000000001','mobile-delivery@example.invalid',now(),false,false);
create temporary table mobile_actor as select subject_id from public.external_identities
 where provider='supabase' and provider_subject='a1450000-0000-4000-8000-000000000001';
grant select on mobile_actor to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 values('a1450000-0000-4000-8000-000000000002','a1450000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003' from mobile_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
 select 'a1450000-0000-4000-8000-000000000003',subject_id,'a1450000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from mobile_actor;
insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
 select '10000000-0000-4000-8000-000000000001',subject_id,'identity_contact',
 '10000000-0000-4000-8000-000000000001','operations','active',now()-interval '1 day',now()+interval '1 day' from mobile_actor;
create function pg_temp.mobile_command(command jsonb) returns jsonb language sql as $$
 select public.command_mobile_invitation_register('a1450000-0000-4000-8000-000000000001',
 'a1450000-0000-4000-8000-000000000002','mobile-delivery@example.invalid',
 'a1450000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),
 '10000000-0000-4000-8000-000000000001',command)$$;
create temporary table target_mobile(id uuid,claim jsonb);
grant select,insert,update on target_mobile to service_role;
create function pg_temp.change_mobile(action text,version integer,n integer) returns jsonb language sql as $$
 select pg_temp.mobile_command(jsonb_build_object('action',action,'requestKey',md5('delivery-change'||n)::uuid,
 'invitationId',(select id from target_mobile),'expectedVersion',version))$$;
create function pg_temp.prepare_mobile(version integer,n integer,digest text default repeat('a',64)) returns jsonb language sql as $$
 select public.prepare_mobile_invitation_delivery('a1450000-0000-4000-8000-000000000001',
 'a1450000-0000-4000-8000-000000000002','mobile-delivery@example.invalid',
 'a1450000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),
 '10000000-0000-4000-8000-000000000001',(select id from target_mobile),version,md5('delivery-change'||n)::uuid,
 digest,'a1450000-0000-4000-8000-000000000010','+999000000001')$$;
create function pg_temp.finish_mobile(outcome text,provider_id uuid default null) returns boolean language sql as $$
 select public.finish_mobile_invitation_delivery('a1450000-0000-4000-8000-000000000001',
 'a1450000-0000-4000-8000-000000000002','mobile-delivery@example.invalid',
 'a1450000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),
 '10000000-0000-4000-8000-000000000001',((select claim from target_mobile)->>'attemptId')::uuid,outcome,provider_id)$$;
select ok(relrowsecurity and relforcerowsecurity,'delivery intents force RLS') from pg_class
 where oid='identity_private.mobile_invitation_delivery_intents'::regclass;

insert into target_mobile(id) select (pg_temp.mobile_command(jsonb_build_object('action','create','requestKey',gen_random_uuid(),
 'givenName','Synthetic','familyName','Receipt','phone','+27000000001',
 'provenanceReference',gen_random_uuid(),'contactAuthorityReference',gen_random_uuid()))->>'invitationId')::uuid;
select pg_temp.change_mobile('review',1,1);
insert into identity_private.mobile_invitation_policies(tenant_id,daily_reservation_limit,sending_enabled,delivery_ready,
 provider_profile_id,from_phone,per_segment_usd_micros,per_message_usd_micros,daily_usd_micros)
 values('10000000-0000-4000-8000-000000000001',10,true,true,'a1450000-0000-4000-8000-000000000010','+999000000001',40000,80000,800000);
select pg_temp.change_mobile('send',1,2);
update target_mobile set claim=pg_temp.prepare_mobile(1,2);
create function pg_temp.receipt(event_id uuid,outcome text,cost integer default 80000,digest text default repeat('a',64),message_id uuid default 'a1450000-0000-4000-8000-000000000011') returns boolean language sql as $$
 select public.record_mobile_invitation_receipt('10000000-0000-4000-8000-000000000001',event_id,message_id,
 case when outcome='sent' then 'message.sent' else 'message.finalized' end,outcome,
 (select prepared_at from identity_private.mobile_invitation_delivery_intents limit 1),digest,
 'a1450000-0000-4000-8000-000000000010','+999000000001','+27000000001',cost)$$;
-- pg_temp fixture reads are deliberately outside service_role; test the public RPC ACL separately.
select ok(relrowsecurity and relforcerowsecurity,'receipt RLS forced') from pg_class where oid='identity_private.mobile_invitation_delivery_receipts'::regclass;
select ok(not has_table_privilege(r,'identity_private.mobile_invitation_delivery_receipts','SELECT,INSERT,UPDATE,DELETE'),r||' no raw receipts')
 from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_function_privilege(r,'public.record_mobile_invitation_receipt(uuid,uuid,uuid,text,text,timestamptz,text,uuid,text,text,integer)','execute'),r||' no callback RPC')
 from unnest(array['anon','authenticated']) r;
select ok(has_function_privilege('service_role','public.record_mobile_invitation_receipt(uuid,uuid,uuid,text,text,timestamptz,text,uuid,text,text,integer)','execute'),'service only callback');
select ok(relrowsecurity and relforcerowsecurity,'binding/conflict RLS forced') from pg_class where oid in ('identity_private.mobile_invitation_provider_bindings'::regclass,'identity_private.mobile_invitation_receipt_conflicts'::regclass);
select ok(not has_table_privilege(r,'identity_private.mobile_invitation_provider_bindings','SELECT,INSERT,UPDATE,DELETE') and not has_table_privilege(r,'identity_private.mobile_invitation_receipt_conflicts','SELECT,INSERT,UPDATE,DELETE'),r||' has no binding/conflict grants') from unnest(array['anon','authenticated','service_role']) r;
create function pg_temp.spoof_receipt(tenant uuid default '10000000-0000-4000-8000-000000000001',profile uuid default 'a1450000-0000-4000-8000-000000000010',sender text default '+999000000001',recipient text default '+27000000001',delay interval default interval '0 seconds') returns boolean language sql as $$
 select public.record_mobile_invitation_receipt(tenant,'a1450000-0000-4000-8000-000000000020','a1450000-0000-4000-8000-000000000011','message.finalized','delivered',
 (select prepared_at+delay from identity_private.mobile_invitation_delivery_intents limit 1),repeat('a',64),profile,sender,recipient,80000)$$;
select throws_ok($$select pg_temp.spoof_receipt(tenant=>'10000000-0000-4000-8000-000000000002')$$,'42501','MOBILE_RECEIPT_UNATTRIBUTED','wrong tenant cannot attribute');
select throws_ok($$select pg_temp.spoof_receipt(profile=>'a1450000-0000-4000-8000-000000000099')$$,'42501','MOBILE_RECEIPT_UNATTRIBUTED','wrong profile cannot attribute');
select throws_ok($$select pg_temp.spoof_receipt(sender=>'+999000000002')$$,'42501','MOBILE_RECEIPT_UNATTRIBUTED','wrong sender cannot attribute');
select throws_ok($$select pg_temp.spoof_receipt(recipient=>'+27000000002')$$,'42501','MOBILE_RECEIPT_UNATTRIBUTED','wrong recipient cannot attribute');
select throws_ok($$select pg_temp.spoof_receipt(delay=>interval '-6 seconds')$$,'42501','MOBILE_RECEIPT_UNATTRIBUTED','pre-intent event cannot attribute');
select throws_ok($$select pg_temp.receipt('a1450000-0000-4000-8000-000000000020','delivered',80000,repeat('b',64))$$,'42501','MOBILE_RECEIPT_UNATTRIBUTED','wrong bearer digest denied');
create function pg_temp.fail_receipt_audit() returns trigger language plpgsql as $$begin
 if new.action='mobile.invitation.receipt' then raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end if; return new; end$$;
create trigger synthetic_receipt_failure before insert on public.audit_events for each row execute function pg_temp.fail_receipt_audit();
select throws_ok($$select pg_temp.receipt('a1450000-0000-4000-8000-000000000020','delivered')$$,'55000','SYNTHETIC_AUDIT_FAILURE','audit atomic failure');
select is((select count(*) from identity_private.mobile_invitation_delivery_receipts),0::bigint,'no unaudited receipt');
select is((select count(*) from identity_private.mobile_invitation_provider_bindings),0::bigint,'no unaudited binding');
drop trigger synthetic_receipt_failure on public.audit_events;
select ok(pg_temp.receipt('a1450000-0000-4000-8000-000000000020','delivered'),'callback can outrun lost response');
select ok(pg_temp.receipt('a1450000-0000-4000-8000-000000000020','delivered'),'exact replay safe');
select is((select count(*) from identity_private.mobile_invitation_delivery_receipts),1::bigint,'no duplicate fact');
select throws_ok($$select pg_temp.receipt('a1450000-0000-4000-8000-000000000021','sent',80000,repeat('a',64),'a1450000-0000-4000-8000-000000000099')$$,'PT409','MOBILE_RECEIPT_CONFLICT','second message cannot rebind');
select throws_ok($$select pg_temp.finish_mobile('accepted','a1450000-0000-4000-8000-000000000099')$$,'PT409','MOBILE_RECEIPT_CONFLICT','late send response cannot contradict callback binding');
select ok(pg_temp.receipt('a1450000-0000-4000-8000-000000000021','sent'),'out of order carrier acceptance recorded');
create function pg_temp.read_receipt_page() returns jsonb language sql as $$
 select public.read_mobile_invitation_register('a1450000-0000-4000-8000-000000000001','a1450000-0000-4000-8000-000000000002',
 'mobile-delivery@example.invalid','a1450000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),'10000000-0000-4000-8000-000000000001')$$;
select is(pg_temp.read_receipt_page()->'invitations'->0->'delivery'->>'status','provider_delivered','older sent cannot regress delivered');
select ok(pg_temp.receipt('a1450000-0000-4000-8000-000000000020','failed'),'changed replay quarantined without overwriting original');
select ok(pg_temp.receipt('a1450000-0000-4000-8000-000000000020','failed'),'same conflict replay idempotent');
select is((select count(*) from identity_private.mobile_invitation_receipt_conflicts),1::bigint,'one immutable conflict marker');
select is(pg_temp.read_receipt_page()->'invitations'->0->'delivery'->>'status','conflict','changed replay cannot leave a false clean delivered status');
select is((select status from identity_private.mobile_invitations),'issued','receipt never accepts invitation');
select is((select state from identity_private.mobile_invitation_delivery_intents),'prepared','callback preserves send evidence');
select ok(pg_temp.receipt('a1450000-0000-4000-8000-000000000022','failed',90000),'contradictory final fact preserved');
select is(pg_temp.read_receipt_page()->'invitations'->0->'delivery'->>'status','conflict','contradictory finals require review');
select is(pg_temp.read_receipt_page()->'invitations'->0->'delivery'->>'budgetReview','true','over reservation requires owner review');
select ok(not ((pg_temp.read_receipt_page()->'invitations'->0) ? 'messageId'),'no provider identity in staff projection');
select is((select sum(reserved_usd_micros) from identity_private.mobile_invitation_delivery_intents),80000::bigint,'failure never releases spend');
select pg_temp.change_mobile('revoke',1,3);
select ok(pg_temp.receipt('a1450000-0000-4000-8000-000000000023','delivered'),'late receipt allowed for revoked version');
select is((select status from identity_private.mobile_invitations),'revoked','late receipt does not revive invitation');
select throws_ok($$update identity_private.mobile_invitation_delivery_receipts set outcome='failed'$$,'42501','MOBILE_RECEIPT_IMMUTABLE','receipt immutable');
select throws_ok($$delete from identity_private.mobile_invitation_provider_bindings$$,'42501','MOBILE_RECEIPT_IMMUTABLE','binding immutable');
select * from finish();
rollback;
