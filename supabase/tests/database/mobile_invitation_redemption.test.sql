begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create function pg_temp.invite(n integer) returns void language plpgsql as $$
declare i uuid:=md5('redemption-inv'||n)::uuid; moment timestamptz:=clock_timestamp();
begin
 insert into identity_private.mobile_invitations(id,tenant_id,created_by_subject_id,provenance_reference,contact_authority_reference,request_key)
 values(i,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003',gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
 insert into identity_private.mobile_invitation_contacts(invitation_id,tenant_id,given_name,family_name,phone)
 values(i,'10000000-0000-4000-8000-000000000001','Synthetic','Redemption','+9990000000'||n);
 update identity_private.mobile_invitations set status='issued',issued_at=moment,expires_at=moment+interval '48 hours' where id=i;
 insert into identity_private.mobile_invitation_tokens(invitation_id,tenant_id,invitation_version,digest,issued_at,expires_at)
 values(i,'10000000-0000-4000-8000-000000000001',1,encode(sha256(convert_to('redemption-token'||n,'UTF8')),'hex'),moment,moment+interval '48 hours');
end $$;
create function pg_temp.exchange(action text,n integer default 1,request_n integer default 1,email text default null,
 tenant uuid default '10000000-0000-4000-8000-000000000001',secret_n integer default 1) returns jsonb language sql as $$
 select public.exchange_mobile_invitation(tenant,action,encode(sha256(convert_to('redemption-token'||n,'UTF8')),'hex'),
 encode(sha256(convert_to('redemption-secret'||secret_n,'UTF8')),'hex'),md5('redemption-request'||request_n)::uuid,email) $$;
select pg_temp.invite(1);
select ok(not has_function_privilege(r,'public.exchange_mobile_invitation(uuid,text,text,text,uuid,text)','execute'),r||' no redemption RPC') from unnest(array['anon','authenticated']) r;
select ok(has_function_privilege('service_role','public.exchange_mobile_invitation(uuid,text,text,text,uuid,text)','execute'),'service only exchange');
select ok(prosecdef and provolatile='v' and proconfig=array['search_path=""'],'definer/time-sensitive RPC pins empty search_path') from pg_proc where oid='public.exchange_mobile_invitation(uuid,text,text,text,uuid,text)'::regprocedure;
select is(pg_temp.exchange('redeem',tenant=>'10000000-0000-4000-8000-000000000002'),null::jsonb,'wrong tenant indistinguishable');
select is(pg_temp.exchange('redeem',n=>99),null::jsonb,'unknown digest indistinguishable');
select throws_ok($$select public.exchange_mobile_invitation('10000000-0000-4000-8000-000000000001','redeem','raw-token',repeat('b',64),gen_random_uuid())$$,'22023','MOBILE_INPUT_INVALID','raw bearer cannot be stored by RPC');
select throws_ok($$select pg_temp.exchange('convert')$$,'22023','MOBILE_INPUT_INVALID','conversion not implemented by exchange');
select is(pg_temp.exchange('read'),null::jsonb,'read cannot create a claim');
select is((select count(*) from identity_private.mobile_invitation_claims),0::bigint,'read creates no row');
create function pg_temp.fail_claim_audit() returns trigger language plpgsql as $$begin
 if new.action='mobile.invitation.claimed' then raise exception using errcode='55000',message='SYNTHETIC_AUDIT_FAILURE'; end if; return new; end$$;
create trigger synthetic_claim_failure before insert on public.audit_events for each row execute function pg_temp.fail_claim_audit();
select throws_ok($$select pg_temp.exchange('redeem')$$,'55000','SYNTHETIC_AUDIT_FAILURE','audit failure rolls back reservation');
select is((select count(*) from identity_private.mobile_invitation_claims),0::bigint,'no unaudited claim');
select is((select status from identity_private.mobile_invitations where id=md5('redemption-inv1')::uuid),'issued','state unchanged on failed audit');
drop trigger synthetic_claim_failure on public.audit_events;
create temporary table claim_result as select pg_temp.exchange('redeem') as result;
select is((select result->>'emailBound' from claim_result),'false','no email bound yet');
select ok((select (result->>'expiresAt')::timestamptz<=clock_timestamp()+interval '15 minutes' from claim_result),'claim bounded 15 minutes');
select is(pg_temp.exchange('redeem'),(select result from claim_result),'exact retry returns same claim/deadline');
select is(pg_temp.exchange('redeem',secret_n=>2),null::jsonb,'changed same-key secret cannot recover');
select is(pg_temp.exchange('redeem',request_n=>2,secret_n=>2),null::jsonb,'second claimant cannot displace active claim');
select is((select count(*) from identity_private.mobile_invitation_claims),1::bigint,'one active claimant');
select is((select count(*) from identity_private.mobile_invitation_events where event='claimed'),1::bigint,'replay creates no additional audit event');
select is(pg_temp.exchange('bind',email=>'synthetic@example.invalid')->>'emailBound','true','email binding succeeds');
select is((select claimed_email from identity_private.mobile_invitation_contacts where invitation_id=md5('redemption-inv1')::uuid),'synthetic@example.invalid','normalized email kept private');
select is(pg_temp.exchange('bind',email=>' SYNTHETIC@EXAMPLE.INVALID ')->>'emailBound','true','normalisation/replay safe');
select is(pg_temp.exchange('bind',email=>'replacement@example.invalid'),null::jsonb,'different email cannot replace binding');
select is(pg_temp.exchange('bind',request_n=>2,email=>'replacement@example.invalid'),null::jsonb,'foreign request cannot bind');
select is(pg_temp.exchange('read')->>'emailBound','true','resume only original claim');
select is((select count(*) from identity_private.mobile_invitation_events where event='email_bound'),1::bigint,'one immutable binding fact');
select ok(not (pg_temp.exchange('read') ?| array['givenName','familyName','phone','email','secret','tokenDigest']),'no contact or bearer returned');
select is((select state from identity_private.mobile_invitation_tokens where invitation_id=md5('redemption-inv1')::uuid),'active','redemption does not consume token');
select is((select converted_subject_id from identity_private.mobile_invitations where id=md5('redemption-inv1')::uuid),null::uuid,'no account conversion');
-- Historical local fixture: expiry is not made mutable in production.
alter table identity_private.mobile_invitation_claims disable trigger mobile_claim_guard;
update identity_private.mobile_invitation_claims set issued_at=statement_timestamp()-interval '16 minutes',expires_at=statement_timestamp()-interval '1 minute' where invitation_id=md5('redemption-inv1')::uuid;
alter table identity_private.mobile_invitation_claims enable trigger mobile_claim_guard;
select is(pg_temp.exchange('read'),null::jsonb,'elapsed claim denied before sweep');
select ok(pg_temp.exchange('redeem',request_n=>3,secret_n=>3) is not null,'new claim allowed only within original invitation lifetime');
select is(pg_temp.exchange('bind',request_n=>3,secret_n=>3,email=>'replacement@example.invalid'),null::jsonb,'expiry does not unlock email change');
select is(pg_temp.exchange('bind',request_n=>3,secret_n=>3,email=>'synthetic@example.invalid')->>'emailBound','true','fresh claim may resume same bound email');
select is((select count(*) from identity_private.mobile_invitation_claims where state='active'),1::bigint,'old claim expired before replacement');
select is(pg_temp.exchange('decline',request_n=>3,secret_n=>3),jsonb_build_object('declined',true),'deliberate decline terminal');
select is(pg_temp.exchange('decline',request_n=>3,secret_n=>3),jsonb_build_object('declined',true),'exact interrupted decline replay');
select is(pg_temp.exchange('redeem',request_n=>4,secret_n=>4),null::jsonb,'declined bearer cannot reopen');
select is((select phone_reserved from identity_private.mobile_invitation_contacts where invitation_id=md5('redemption-inv1')::uuid),false,'decline releases contact reservation');
select is((select state from identity_private.mobile_invitation_tokens where invitation_id=md5('redemption-inv1')::uuid),'revoked','decline revokes token');
select pg_temp.invite(2);
select pg_temp.exchange('redeem',n=>2,request_n=>5,secret_n=>5);
update identity_private.mobile_invitations set status='revoked',terminal_at=clock_timestamp() where id=md5('redemption-inv2')::uuid;
select is(pg_temp.exchange('read',n=>2,request_n=>5,secret_n=>5),null::jsonb,'staff revoke immediately invalidates cookie authority');
select pg_temp.invite(3);
select pg_temp.exchange('redeem',n=>3,request_n=>6,secret_n=>6);
update identity_private.mobile_invitations set version=2,status='draft',issued_at=null,expires_at=null,bound_email_digest=null where id=md5('redemption-inv3')::uuid;
select is(pg_temp.exchange('read',n=>3,request_n=>6,secret_n=>6),null::jsonb,'resend version invalidates claim');
select is(pg_temp.exchange('redeem',n=>3,request_n=>7,secret_n=>7),null::jsonb,'superseded token cannot redeem');
select pg_temp.invite(4);
alter table identity_private.mobile_invitations disable trigger mobile_invitation_guard;
update identity_private.mobile_invitations set issued_at=statement_timestamp()-interval '49 hours',expires_at=statement_timestamp()-interval '1 hour' where id=md5('redemption-inv4')::uuid;
alter table identity_private.mobile_invitations enable trigger mobile_invitation_guard;
select is(pg_temp.exchange('redeem',n=>4,request_n=>8,secret_n=>8),null::jsonb,'48-hour expiry denied before sweep');
select is(pg_temp.exchange('decline',n=>4,request_n=>8,secret_n=>8),null::jsonb,'expired token cannot mutate');
select is((select count(*) from pg_trigger where not tgisinternal and tgenabled='D'),0::bigint,'all local guards restored');
select * from finish();
rollback;
