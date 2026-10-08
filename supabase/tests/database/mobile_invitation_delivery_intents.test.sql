begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
 values('a1440000-0000-4000-8000-000000000001','mobile-delivery@example.invalid',now(),false,false);
create temporary table mobile_actor as select subject_id from public.external_identities
 where provider='supabase' and provider_subject='a1440000-0000-4000-8000-000000000001';
grant select on mobile_actor to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 values('a1440000-0000-4000-8000-000000000002','a1440000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003' from mobile_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
 select 'a1440000-0000-4000-8000-000000000003',subject_id,'a1440000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from mobile_actor;
insert into public.access_assignments(tenant_id,subject_id,resource_type,resource_id,purpose,status,valid_from,expires_at)
 select '10000000-0000-4000-8000-000000000001',subject_id,'identity_contact',
 '10000000-0000-4000-8000-000000000001','operations','active',now()-interval '1 day',now()+interval '1 day' from mobile_actor;
create function pg_temp.mobile_command(command jsonb) returns jsonb language sql as $$
 select public.command_mobile_invitation_register('a1440000-0000-4000-8000-000000000001',
 'a1440000-0000-4000-8000-000000000002','mobile-delivery@example.invalid',
 'a1440000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),
 '10000000-0000-4000-8000-000000000001',command)$$;
create temporary table target_mobile(id uuid,claim jsonb);
grant select,insert,update on target_mobile to service_role;
create function pg_temp.change_mobile(action text,version integer,n integer) returns jsonb language sql as $$
 select pg_temp.mobile_command(jsonb_build_object('action',action,'requestKey',md5('delivery-change'||n)::uuid,
 'invitationId',(select id from target_mobile),'expectedVersion',version))$$;
create function pg_temp.prepare_mobile(version integer,n integer,digest text default repeat('a',64)) returns jsonb language sql as $$
 select public.prepare_mobile_invitation_delivery('a1440000-0000-4000-8000-000000000001',
 'a1440000-0000-4000-8000-000000000002','mobile-delivery@example.invalid',
 'a1440000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),
 '10000000-0000-4000-8000-000000000001',(select id from target_mobile),version,md5('delivery-change'||n)::uuid,
 digest,'a1440000-0000-4000-8000-000000000010','+999000000001')$$;
create function pg_temp.finish_mobile(outcome text,provider_id uuid default null) returns boolean language sql as $$
 select public.finish_mobile_invitation_delivery('a1440000-0000-4000-8000-000000000001',
 'a1440000-0000-4000-8000-000000000002','mobile-delivery@example.invalid',
 'a1440000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),
 '10000000-0000-4000-8000-000000000001',((select claim from target_mobile)->>'attemptId')::uuid,outcome,provider_id)$$;
select ok(relrowsecurity and relforcerowsecurity,'delivery intents force RLS') from pg_class
 where oid='identity_private.mobile_invitation_delivery_intents'::regclass;
select ok(not has_table_privilege(r,'identity_private.mobile_invitation_delivery_intents','SELECT,INSERT,UPDATE,DELETE'),r||' has no delivery table grants')
 from unnest(array['anon','authenticated','service_role']) r;
select ok(not has_function_privilege(r,'public.prepare_mobile_invitation_delivery(uuid,uuid,text,uuid,uuid,uuid,uuid,integer,uuid,text,uuid,text)','execute'),r||' cannot prepare directly')
 from unnest(array['anon','authenticated']) r;
select ok(not has_function_privilege(r,'public.finish_mobile_invitation_delivery(uuid,uuid,text,uuid,uuid,uuid,uuid,text,uuid)','execute'),r||' cannot finish directly')
 from unnest(array['anon','authenticated']) r;
set local role service_role;
insert into target_mobile(id) select (pg_temp.mobile_command(jsonb_build_object('action','create','requestKey',gen_random_uuid(),
 'givenName','Synthetic','familyName','Participant','phone','+27000000001',
 'provenanceReference',gen_random_uuid(),'contactAuthorityReference',gen_random_uuid()))->>'invitationId')::uuid;
select throws_ok($$select pg_temp.prepare_mobile(1,1)$$,'42501','MOBILE_INVITATION_REJECTED','no dispatch without reviewed reservation');
select lives_ok($$select pg_temp.change_mobile('review',1,1)$$,'review permitted');
reset role;
insert into identity_private.mobile_invitation_policies(tenant_id,daily_reservation_limit)
 values('10000000-0000-4000-8000-000000000001',10);
select ok(not sending_enabled and not delivery_ready and daily_usd_micros=0,'new policies default sending and spend off') from identity_private.mobile_invitation_policies;
set local role service_role;
select lives_ok($$select pg_temp.change_mobile('send',1,2)$$,'reservation permitted without provider');
select throws_ok($$select pg_temp.prepare_mobile(1,2)$$,'42501','MOBILE_DELIVERY_DISABLED','reservation is not sending authority');
reset role;
select is((select count(*) from identity_private.mobile_invitation_tokens),0::bigint,'disabled preparation issues no bearer');
update identity_private.mobile_invitation_policies set sending_enabled=true,delivery_ready=true,
 provider_profile_id='a1440000-0000-4000-8000-000000000010',from_phone='+999000000001',
 per_segment_usd_micros=40000,per_message_usd_micros=80000,daily_usd_micros=80000;
update identity_private.mobile_invitation_policies set per_message_usd_micros=70000;
set local role service_role;
select throws_ok($$select pg_temp.prepare_mobile(1,2)$$,'PT429','MOBILE_BUDGET_EXCEEDED','message ceiling enforces both segments');
reset role;
update identity_private.mobile_invitation_policies set per_message_usd_micros=80000;
create function pg_temp.fail_delivery_audit() returns trigger language plpgsql as $$begin
 if new.action='mobile.invitation.prepared' then
  raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end if;
 return new; end$$;
create trigger synthetic_delivery_audit_failure before insert on public.audit_events
 for each row execute function pg_temp.fail_delivery_audit();
set local role service_role;
select throws_ok($$select pg_temp.prepare_mobile(1,2)$$,'55000','SYNTHETIC_AUDIT_FAILURE','audit failure aborts preparation');
reset role;
select is((select count(*) from identity_private.mobile_invitation_tokens),0::bigint,'audit failure rolls token issuance back');
select is((select count(*) from identity_private.mobile_invitation_delivery_intents),0::bigint,'audit failure rolls spend reservation back');
select is((select status from identity_private.mobile_invitations),'draft','audit failure preserves invitation version/state');
drop trigger synthetic_delivery_audit_failure on public.audit_events;
set local role service_role;
update target_mobile set claim=pg_temp.prepare_mobile(1,2);
select is((select claim->>'reservedUsdMicros' from target_mobile),'80000','two segments reserved before provider');
select is((select claim->>'phone' from target_mobile),'+27000000001','destination comes only from scoped contact');
select is(pg_temp.prepare_mobile(1,2,repeat('b',64)),null::jsonb,'changed-token replay cannot reclaim raw bearer or send');
select throws_ok($$select pg_temp.finish_mobile('accepted')$$,'22023','MOBILE_INPUT_INVALID','acceptance requires provider message identity');
select ok(pg_temp.finish_mobile('uncertain'),'uncertain fact can be recorded');
select ok(pg_temp.finish_mobile('uncertain'),'same finish fact replays safely');
select throws_ok($$select pg_temp.finish_mobile('failed')$$,'PT409','MOBILE_INVITATION_CONFLICT','conflicting finish cannot rewrite unknown');
reset role;
select is((select count(*) from identity_private.mobile_invitation_delivery_intents),1::bigint,'one reservation has one durable attempt');
select is((select state from identity_private.mobile_invitation_delivery_intents),'uncertain','unknown outcome persisted');
select is((select digest from identity_private.mobile_invitation_tokens),repeat('a',64),'only original digest persists');
select ok((select expires_at-issued_at=interval '48 hours' from identity_private.mobile_invitation_tokens),'token duration remains 48h');
select throws_ok($$update identity_private.mobile_invitation_delivery_intents set state='failed'$$,'42501','MOBILE_DELIVERY_IMMUTABLE','settled attempts cannot mutate');
select throws_ok($$delete from identity_private.mobile_invitation_delivery_intents$$,'42501','MOBILE_DELIVERY_IMMUTABLE','attempts cannot be deleted');
set local role service_role;
select lives_ok($$select pg_temp.change_mobile('resend',1,3)$$,'explicit resend creates new version');
select throws_ok($$select pg_temp.prepare_mobile(2,3,repeat('b',64))$$,'PT429','MOBILE_BUDGET_EXCEEDED','unknown outcome does not release tenant spend');
reset role;
select is((select state from identity_private.mobile_invitation_tokens),'superseded','manual supersession invalidates old bearer');
update identity_private.mobile_invitation_policies set daily_usd_micros=160000;
set local role service_role;
update target_mobile set claim=pg_temp.prepare_mobile(2,3,repeat('b',64));
reset role;
create function pg_temp.fail_delivery_finish() returns trigger language plpgsql as $$begin
 if new.action='mobile.invitation.accepted' then raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end if;
 return new; end$$;
create trigger synthetic_delivery_finish_failure before insert on public.audit_events
 for each row execute function pg_temp.fail_delivery_finish();
set local role service_role;
select throws_ok($$select pg_temp.finish_mobile('accepted','a1440000-0000-4000-8000-000000000011')$$,
 '55000','SYNTHETIC_AUDIT_FAILURE','audit failure cannot falsely settle acceptance');
reset role;
select is((select state from identity_private.mobile_invitation_delivery_intents where invitation_version=2),
 'prepared','failed finish remains unresolved and cannot be redispatched');
select is((select sum(reserved_usd_micros) from identity_private.mobile_invitation_delivery_intents),160000::bigint,
 'failed finish preserves spend hold');
drop trigger synthetic_delivery_finish_failure on public.audit_events;
set local role service_role;
select ok(pg_temp.finish_mobile('accepted','a1440000-0000-4000-8000-000000000011'),'provider acceptance recorded once');
select lives_ok($$select pg_temp.change_mobile('revoke',2,4)$$,'revoke remains available after provider acceptance');
reset role;
select is((select status from identity_private.mobile_invitations),'revoked','provider acceptance is not invitation acceptance');
select is((select count(*) from identity_private.mobile_invitation_tokens where state='active'),0::bigint,'revocation invalidates active bearer');
select is((select sum(reserved_usd_micros) from identity_private.mobile_invitation_delivery_intents),160000::bigint,'accepted and uncertain costs both retained');
select throws_ok($test$do $$declare second_id uuid; request_id uuid:=gen_random_uuid(); begin
 second_id:=(pg_temp.mobile_command(jsonb_build_object('action','create','requestKey',gen_random_uuid(),
 'givenName','Other','familyName','Synthetic','phone','+27000000002',
 'provenanceReference',gen_random_uuid(),'contactAuthorityReference',gen_random_uuid()))->>'invitationId')::uuid;
 perform pg_temp.mobile_command(jsonb_build_object('action','review','requestKey',gen_random_uuid(),'invitationId',second_id,'expectedVersion',1));
 perform pg_temp.mobile_command(jsonb_build_object('action','send','requestKey',request_id,'invitationId',second_id,'expectedVersion',1));
 perform public.prepare_mobile_invitation_delivery('a1440000-0000-4000-8000-000000000001',
 'a1440000-0000-4000-8000-000000000002','mobile-delivery@example.invalid',
 'a1440000-0000-4000-8000-000000000003',(select subject_id from mobile_actor),
 '10000000-0000-4000-8000-000000000001',second_id,1,request_id,repeat('c',64),
 'a1440000-0000-4000-8000-000000000010','+999000000001'); end$$$test$,
 'PT429','MOBILE_BUDGET_EXCEEDED','tenant spend is shared across invitations');
select throws_ok($test$do $$begin
 update public.access_assignments set status='revoked' where subject_id=(select subject_id from mobile_actor);
 perform pg_temp.finish_mobile('accepted','a1440000-0000-4000-8000-000000000011'); end$$$test$,
 '42501','MOBILE_INVITATION_REJECTED','assignment revocation denies even exact finish replay');
update auth.sessions set aal='aal1' where id='a1440000-0000-4000-8000-000000000002';
set local role service_role;
select throws_ok($$select pg_temp.finish_mobile('accepted','a1440000-0000-4000-8000-000000000011')$$,'42501','WORKFORCE_REJECTED','email-only authority cannot finish receipts');
reset role;
select * from finish();
rollback;
