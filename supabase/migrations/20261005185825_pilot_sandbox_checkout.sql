create table commerce_private.checkout_releases (
 tenant_id uuid primary key references public.tenants(id),
 provider_account_id text not null check(provider_account_id ~ '^acct_[A-Za-z0-9]{8,64}$'),
 approval_reference uuid not null,
 expires_at timestamptz not null,
 enabled boolean not null default false
);
create table commerce_private.checkout_intents (
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null unique references commerce_private.offers(id),
 tenant_id uuid not null references public.tenants(id),
 subject_id uuid not null references public.subjects(id),
 acceptance_id uuid not null references commerce_private.order_acceptances(id),
 provider_account_id text not null,
 request_key uuid not null,
 payload jsonb not null,
 creation_deadline timestamptz not null,
 provider_expires_epoch bigint not null,
 state text not null default 'preparing' check(state in ('preparing','open')),
 session_id text unique check(session_id is null or session_id ~ '^cs_test_[A-Za-z0-9_]{8,120}$'),
 checkout_url text,
 created_at timestamptz not null default clock_timestamp(),
 unique(tenant_id,subject_id,request_key),
 check((state='open')=(session_id is not null and checkout_url is not null))
);
create index commerce_checkout_subject_idx on commerce_private.checkout_intents(subject_id);
create index commerce_checkout_acceptance_idx on commerce_private.checkout_intents(acceptance_id);
alter table commerce_private.checkout_releases enable row level security;
alter table commerce_private.checkout_releases force row level security;
alter table commerce_private.checkout_intents enable row level security;
alter table commerce_private.checkout_intents force row level security;
revoke all on commerce_private.checkout_releases,commerce_private.checkout_intents from public,anon,authenticated,service_role;

create function commerce_private.checkout_release(t uuid,account text) returns void
 language plpgsql security invoker set search_path='' as $$begin
 if account is null or not exists(select 1 from commerce_private.checkout_releases where tenant_id=t
  and provider_account_id=account and enabled and expires_at>clock_timestamp()) then
  raise exception using errcode='42501',message='COMMERCE_RELEASE_DISABLED';end if;
end $$;
revoke all on function commerce_private.checkout_release(uuid,text) from public,anon,authenticated,service_role;

create function public.patient_checkout_ready(p_context jsonb,p_account text) returns boolean
 language plpgsql security definer set search_path='' as $$begin
 perform intake_private.patient_authority(p_context);
 return exists(select 1 from commerce_private.checkout_releases where tenant_id=(p_context->>'tenantId')::uuid
   and provider_account_id=p_account and enabled and expires_at>clock_timestamp());
end $$;
revoke all on function public.patient_checkout_ready(jsonb,text) from public,anon,authenticated;
grant execute on function public.patient_checkout_ready(jsonb,text) to service_role;

create function commerce_private.checkout_intent_guard() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' or (to_jsonb(new)-array['state','session_id','checkout_url'])<>(to_jsonb(old)-array['state','session_id','checkout_url'])
  or (old.state='open' and to_jsonb(new)<>to_jsonb(old)) or new.state<>'open' then
  raise exception using errcode='42501',message='CHECKOUT_INTENT_IMMUTABLE';end if;
 return new;
end $$;
create trigger checkout_intents_guard before update or delete on commerce_private.checkout_intents
 for each row execute function commerce_private.checkout_intent_guard();
revoke all on function commerce_private.checkout_intent_guard() from public,anon,authenticated,service_role;

create function public.patient_prepare_deposit_offer(p_context jsonb,p_request_key uuid,p_account text)
 returns void language plpgsql security definer set search_path='' as $$declare c uuid;begin
 perform intake_private.patient_authority(p_context);
 perform commerce_private.checkout_release((p_context->>'tenantId')::uuid,p_account);
 if p_request_key is null then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 if exists(select 1 from commerce_private.offers where tenant_id=(p_context->>'tenantId')::uuid
  and subject_id=(p_context->>'subjectId')::uuid and expires_at>clock_timestamp()) then return;end if;
 if not exists(select 1 from commerce_private.order_publications where tenant_id=(p_context->>'tenantId')::uuid
  and scenario='review_deposit' and status='published' and effective_at<=clock_timestamp() and expires_at>clock_timestamp()) then
   raise exception using errcode='42501',message='COMMERCE_TERMS_UNAVAILABLE';end if;
 if (select count(*) from intake_private.intakes where tenant_id=(p_context->>'tenantId')::uuid
   and subject_id=(p_context->>'subjectId')::uuid and state='submitted' and not safety_hold)<>1 then
  raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
 select case_id into c from intake_private.intakes where tenant_id=(p_context->>'tenantId')::uuid
   and subject_id=(p_context->>'subjectId')::uuid and state='submitted' and not safety_hold;
 perform commerce_private.prepare_offer((p_context->>'tenantId')::uuid,(p_context->>'subjectId')::uuid,c,
   jsonb_build_object('scenario','review_deposit','items','[]'::jsonb,'requestKey',p_request_key));
 perform intake_private.patient_authority(p_context);
end $$;

create function public.patient_prepare_checkout(p_context jsonb,p_offer_id uuid,p_request_key uuid,p_account text)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare view jsonb;o commerce_private.offers;receipt commerce_private.order_acceptances;
 intent commerce_private.checkout_intents;correlation uuid:=gen_random_uuid();expires_epoch bigint;
begin
 perform intake_private.patient_authority(p_context);
 perform commerce_private.checkout_release((p_context->>'tenantId')::uuid,p_account);
 if p_offer_id is null or p_request_key is null then raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 select * into o from commerce_private.offers where id=p_offer_id and tenant_id=(p_context->>'tenantId')::uuid
   and subject_id=(p_context->>'subjectId')::uuid;
 if o.id is null then raise exception using errcode='42501',message='COMMERCE_REJECTED';end if;
 -- Acquire the same case-first preparation lock before the offer/intent locks.
 perform commerce_private.prepare_offer(o.tenant_id,o.subject_id,o.case_id,o.selection);
 select * into o from commerce_private.offers where id=p_offer_id for update;
 view:=public.patient_order_review(p_context,'{"action":"read"}')->'review';
 if view is null or view='null'::jsonb or view->>'offerId'<>p_offer_id::text or view->'acceptance'='null'::jsonb then
   raise exception using errcode='42501',message='COMMERCE_ACCEPTANCE_REQUIRED';end if;
 select * into receipt from commerce_private.order_acceptances where offer_id=o.id;
 if receipt.id is null or receipt.subject_id<>o.subject_id or receipt.tenant_id<>o.tenant_id then
   raise exception using errcode='42501',message='COMMERCE_ACCEPTANCE_REQUIRED';end if;
 if exists(select 1 from commerce_private.checkout_intents where tenant_id=o.tenant_id and subject_id=o.subject_id
  and request_key=p_request_key and offer_id<>o.id) then raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
 select * into intent from commerce_private.checkout_intents where offer_id=o.id for update;
 if intent.id is null then
  expires_epoch:=floor(extract(epoch from clock_timestamp()))::bigint+3600;
  insert into commerce_private.checkout_intents(offer_id,tenant_id,subject_id,acceptance_id,provider_account_id,
   request_key,payload,creation_deadline,provider_expires_epoch)
  values(o.id,o.tenant_id,o.subject_id,receipt.id,p_account,p_request_key,
   jsonb_build_object('scenario',o.snapshot->>'scenario','currency','zar',
   'amountTotalMinor',(o.snapshot->>'amountTotalMinor')::integer,
   'productBalanceMinor',case when o.snapshot->>'scenario'='review_deposit' then 0 else
     (o.snapshot->>'productSubtotalMinor')::integer-(o.snapshot->>'creditMinor')::integer end,
   'deliveryMinor',coalesce((o.snapshot->>'deliveryMinor')::integer,0)),
   least(o.expires_at,(view->>'expiresAt')::timestamptz),expires_epoch) returning * into intent;
 else
  if intent.provider_account_id<>p_account or intent.acceptance_id<>receipt.id then
   raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
 end if;
 if intent.creation_deadline<=clock_timestamp() then raise exception using errcode='40001',message='COMMERCE_RECONCILIATION_REQUIRED';end if;
 perform audit_private.append_audit_fact(o.tenant_id,'patient',o.subject_id,'patient','aal1',
 'commerce.checkout.prepared',o.subject_id,'payment',intent.id::text,'account','sprint-11.4-v1',
 'succeeded','CHECKOUT_PREPARED',correlation::text,correlation::text,clock_timestamp(),'{}');
 perform intake_private.patient_authority(p_context);
 return intent.payload||jsonb_build_object('intentId',intent.id,'tenantId',intent.tenant_id,
 'accountId',intent.provider_account_id,'expiresEpoch',intent.provider_expires_epoch,
 'checkoutUrl',intent.checkout_url,'sessionId',intent.session_id);
end $$;

create function public.patient_attach_checkout(p_context jsonb,p_intent_id uuid,p_session_id text,p_url text)
 returns void language plpgsql security definer set search_path='' as $$
declare i commerce_private.checkout_intents;correlation uuid:=gen_random_uuid();begin
 select * into i from commerce_private.checkout_intents where id=p_intent_id
 and tenant_id=(p_context->>'tenantId')::uuid and subject_id=(p_context->>'subjectId')::uuid;
 if i.id is null then raise exception using errcode='42501',message='COMMERCE_REJECTED';end if;
 perform public.patient_prepare_checkout(p_context,i.offer_id,i.request_key,i.provider_account_id);
 select * into i from commerce_private.checkout_intents where id=p_intent_id for update;
 if p_session_id is null or p_session_id !~ '^cs_test_[A-Za-z0-9_]{8,120}$' or p_url is null
   or p_url !~ '^https://checkout\.stripe\.com/[^[:space:]]+$' then
   raise exception using errcode='22023',message='COMMERCE_INVALID';end if;
 if i.state='open' and (i.session_id<>p_session_id or i.checkout_url<>p_url) then
   raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
 update commerce_private.checkout_intents set state='open',session_id=p_session_id,checkout_url=p_url where id=p_intent_id;
 perform audit_private.append_audit_fact(i.tenant_id,'patient',i.subject_id,'patient','aal1',
 'commerce.checkout.open',i.subject_id,'payment',i.id::text,'account','sprint-11.4-v1',
 'succeeded','CHECKOUT_OPEN',correlation::text,correlation::text,clock_timestamp(),'{}');
 perform intake_private.patient_authority(p_context);
end $$;
revoke all on function public.patient_prepare_deposit_offer(jsonb,uuid,text),
 public.patient_prepare_checkout(jsonb,uuid,uuid,text),public.patient_attach_checkout(jsonb,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.patient_prepare_deposit_offer(jsonb,uuid,text),
 public.patient_prepare_checkout(jsonb,uuid,uuid,text),public.patient_attach_checkout(jsonb,uuid,text,text)
 to service_role;
