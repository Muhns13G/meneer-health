-- Separate standalone live and sandbox accounts permanently. This migration enables no release.
lock table commerce_private.checkout_releases,commerce_private.checkout_intents,
 commerce_private.provider_receipts,commerce_private.refund_jobs in share row exclusive mode;
create table commerce_private.payment_account_environments (
 provider_account_id text primary key check(provider_account_id ~ '^acct_[A-Za-z0-9]{8,64}$'),
 payment_environment text not null check(payment_environment in ('sandbox','live'))
);
alter table commerce_private.payment_account_environments enable row level security;
alter table commerce_private.payment_account_environments force row level security;
revoke all on commerce_private.payment_account_environments from public,anon,authenticated,service_role;
insert into commerce_private.payment_account_environments
select provider_account_id,'sandbox' from commerce_private.checkout_releases
union select provider_account_id,'sandbox' from commerce_private.checkout_intents
union select account_id,'sandbox' from commerce_private.provider_receipts
union select account_id,'sandbox' from commerce_private.refund_jobs;
create trigger payment_account_environments_immutable before update or delete
 on commerce_private.payment_account_environments for each row
 execute function audit_private.reject_append_only_mutation();

alter table commerce_private.checkout_releases add column payment_environment text not null
 default 'sandbox' check(payment_environment in ('sandbox','live'));
alter table commerce_private.checkout_intents add column payment_environment text not null
 default 'sandbox' check(payment_environment in ('sandbox','live'));
alter table commerce_private.checkout_intents drop constraint checkout_intents_session_id_check;
alter table commerce_private.checkout_intents add constraint checkout_intents_session_id_check
 check(session_id is null or session_id ~ case when payment_environment='live'
 then '^cs_live_[A-Za-z0-9_]{8,120}$' else '^cs_test_[A-Za-z0-9_]{8,120}$' end);

create function commerce_private.bind_payment_environment(account text,environment text)
returns void language plpgsql set search_path='' as $$begin
 if account is null or environment is null or environment not in ('sandbox','live') then
  raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
 insert into commerce_private.payment_account_environments values(account,environment)
 on conflict do nothing;
 if not exists(select 1 from commerce_private.payment_account_environments
 where provider_account_id=account and payment_environment=environment) then
  raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
end $$;
revoke all on function commerce_private.bind_payment_environment(text,text)
 from public,anon,authenticated,service_role;

create function commerce_private.payment_release_environment_guard() returns trigger
language plpgsql set search_path='' as $$begin
 -- Never rebind a funded/history-bearing tenant to another account, even after deletion.
 perform pg_advisory_xact_lock(hashtextextended('payment-tenant:'||
  case when tg_op='DELETE' then old.tenant_id::text else new.tenant_id::text end,0));
 if tg_op='DELETE' then
  if exists(select 1 from commerce_private.checkout_intents where tenant_id=old.tenant_id)
   or exists(select 1 from commerce_private.provider_receipts where tenant_boundary=old.tenant_id) then
   raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
  return old;
 end if;
 if tg_op='UPDATE' and new.tenant_id is distinct from old.tenant_id then
  raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
 if exists(select 1 from commerce_private.checkout_intents where tenant_id=new.tenant_id
  and (provider_account_id<>new.provider_account_id or payment_environment<>new.payment_environment))
  or exists(select 1 from commerce_private.provider_receipts where tenant_boundary=new.tenant_id
  and account_id<>new.provider_account_id) then
  raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
 perform commerce_private.bind_payment_environment(new.provider_account_id,new.payment_environment);
 return new;
end $$;
create trigger payment_release_environment_guard before insert or update or delete
 on commerce_private.checkout_releases for each row
 execute function commerce_private.payment_release_environment_guard();
revoke all on function commerce_private.payment_release_environment_guard()
 from public,anon,authenticated,service_role;

create function commerce_private.payment_intent_environment_guard() returns trigger
language plpgsql set search_path='' as $$declare release commerce_private.checkout_releases;begin
 perform pg_advisory_xact_lock(hashtextextended('payment-tenant:'||new.tenant_id::text,0));
 select * into release from commerce_private.checkout_releases where tenant_id=new.tenant_id;
 if release.tenant_id is not null then
  if release.provider_account_id<>new.provider_account_id then
   raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
  new.payment_environment:=release.payment_environment;
 elsif new.payment_environment='live' then
  raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';
 end if;
 perform commerce_private.bind_payment_environment(new.provider_account_id,new.payment_environment);
 return new;
end $$;
create trigger payment_intent_environment_guard before insert on commerce_private.checkout_intents
 for each row execute function commerce_private.payment_intent_environment_guard();
revoke all on function commerce_private.payment_intent_environment_guard()
 from public,anon,authenticated,service_role;

-- Narrow checked edits preserve current business logic, owners and every existing ACL.
do $$declare signature text; definition text; needle text; replacement text; before_meta jsonb;after_meta jsonb;
begin
 for signature,needle,replacement in select * from (values
 ('public.patient_prepare_checkout(jsonb,uuid,uuid,text)',
 '''accountId'',intent.provider_account_id,',
 '''paymentEnvironment'',intent.payment_environment,''accountId'',intent.provider_account_id,'),
 ('public.patient_attach_checkout(jsonb,uuid,text,text)',
 'p_session_id !~ ''^cs_test_[A-Za-z0-9_]{8,120}$''',
 'p_session_id !~ (case when i.payment_environment=''live'' then ''^cs_live_[A-Za-z0-9_]{8,120}$'' else ''^cs_test_[A-Za-z0-9_]{8,120}$'' end)')
 ) edits loop
 select jsonb_build_array(proowner,proacl,prosecdef,proconfig,provolatile) into before_meta
 from pg_proc where oid=signature::regprocedure;
 definition:=pg_get_functiondef(signature::regprocedure);
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then
  raise exception 'PAYMENT_ENVIRONMENT_MIGRATION_DRIFT';end if;
 execute replace(definition,needle,replacement);
 select jsonb_build_array(proowner,proacl,prosecdef,proconfig,provolatile) into after_meta
 from pg_proc where oid=signature::regprocedure;
 if after_meta is distinct from before_meta then raise exception 'PAYMENT_ENVIRONMENT_SECURITY_DRIFT';end if;
 end loop;
end $$;

create function public.patient_checkout_environment_ready(p_context jsonb,p_account text,p_environment text)
returns boolean language plpgsql security definer set search_path='' as $$begin
 if not public.patient_checkout_ready(p_context,p_account) then return false;end if;
 return exists(select 1 from commerce_private.checkout_releases r
 join commerce_private.payment_account_environments a using(provider_account_id)
 where r.tenant_id=(p_context->>'tenantId')::uuid and r.provider_account_id=p_account
 and r.payment_environment=p_environment and a.payment_environment=p_environment);
end $$;
revoke all on function public.patient_checkout_environment_ready(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.patient_checkout_environment_ready(jsonb,text,text) to service_role;

alter function public.apply_pilot_provider_event(uuid,uuid,text,jsonb)
 rename to apply_pilot_provider_event_before_environment;
revoke all on function public.apply_pilot_provider_event_before_environment(uuid,uuid,text,jsonb)
 from public,anon,authenticated,service_role;
create function public.apply_commerce_provider_event(p_service_id uuid,p_tenant_id uuid,p_account text,
 p_environment text,p_event jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$begin
 if not public.pilot_webhook_ready(p_tenant_id,p_service_id) then
  raise exception using errcode='42501',message='WEBHOOK_SERVICE_REJECTED';end if;
 if p_environment is null or p_environment not in ('sandbox','live') then
  raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
 perform pg_advisory_xact_lock(hashtextextended('payment-tenant:'||p_tenant_id::text,0));
 -- Legacy sandbox unmatched receipts remain journalled; live accounts need an explicit release.
 if p_environment='sandbox' then perform commerce_private.bind_payment_environment(p_account,'sandbox');end if;
 if not exists(select 1 from commerce_private.payment_account_environments
  where provider_account_id=p_account and payment_environment=p_environment)
  or (p_environment='live' and not exists(select 1 from commerce_private.checkout_releases
   where tenant_id=p_tenant_id and provider_account_id=p_account and payment_environment='live'))
  or (p_event->>'sessionId' is not null and p_event->>'sessionId' !~
   case when p_environment='live' then '^cs_live_[A-Za-z0-9_]{8,120}$' else '^cs_test_[A-Za-z0-9_]{8,120}$' end)
  then raise exception using errcode='42501',message='PAYMENT_ENVIRONMENT_REJECTED';end if;
 -- Disabled/expired releases must still receive refunds and disputes. Association remains immutable.
 return public.apply_pilot_provider_event_before_environment(p_service_id,p_tenant_id,p_account,p_event);
end $$;
revoke all on function public.apply_commerce_provider_event(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_commerce_provider_event(uuid,uuid,text,text,jsonb) to service_role;
create function public.apply_pilot_provider_event(p_service_id uuid,p_tenant_id uuid,p_account text,p_event jsonb)
returns jsonb language sql security definer set search_path='' as $$
 select public.apply_commerce_provider_event(p_service_id,p_tenant_id,p_account,'sandbox',p_event)
$$;
revoke all on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) to service_role;

-- The legacy local synthetic funding primitive is never a source for a live product credit.
alter function commerce_private.funding_current(uuid,uuid,uuid) rename to funding_current_before_environment;
create function commerce_private.funding_current(c uuid,t uuid,s uuid) returns boolean
language sql stable set search_path='' as $$
 select commerce_private.funding_current_before_environment(c,t,s) and not exists(
 select 1 from commerce_private.checkout_releases r join commerce_private.deposit_funding f
 on f.tenant_id=r.tenant_id where r.tenant_id=t and r.payment_environment='live'
 and f.case_id=c and (f.source_intent_id is null or not exists(
 select 1 from commerce_private.checkout_intents i where i.id=f.source_intent_id
 and i.provider_account_id=r.provider_account_id and i.payment_environment='live')))
$$;
revoke all on function commerce_private.funding_current(uuid,uuid,uuid),
 commerce_private.funding_current_before_environment(uuid,uuid,uuid) from public,anon,authenticated,service_role;
