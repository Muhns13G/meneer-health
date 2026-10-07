create table commerce_private.provider_receipts (
 account_id text not null,
 event_id text not null,
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 event_type text not null,
 intent_reference uuid,
 metadata_tenant uuid,
 session_id text,
 payment_intent_id text,
 amount_minor integer,
 currency text,
 payment_status text,
 refund_minor integer,
 charge_id text,
 dispute_id text,
 dispute_status text,
 occurred_at timestamptz not null,
 received_at timestamptz not null default clock_timestamp(),
 service_id uuid not null references public.service_identities(id),
 tenant_boundary uuid not null references public.tenants(id),
 primary key(account_id,event_id)
);
create index commerce_receipt_intent_idx on commerce_private.provider_receipts(intent_reference);
create index commerce_receipt_payment_idx on commerce_private.provider_receipts(payment_intent_id);
create index commerce_receipt_service_idx on commerce_private.provider_receipts(service_id);
create index commerce_receipt_tenant_idx on commerce_private.provider_receipts(tenant_boundary);
create trigger provider_receipts_append_only before update or delete on commerce_private.provider_receipts
 for each row execute function audit_private.reject_append_only_mutation();
create table commerce_private.intent_payment_bindings (
 intent_id uuid primary key references commerce_private.checkout_intents(id),
 account_id text not null,
 payment_intent_id text not null,
 unique(account_id,payment_intent_id)
);
create trigger intent_payment_bindings_append_only before update or delete on commerce_private.intent_payment_bindings
 for each row execute function audit_private.reject_append_only_mutation();
create table commerce_private.settlements (
 intent_id uuid primary key references commerce_private.checkout_intents(id),
 paid_confirmed boolean not null default false,
 no_additional_payment boolean not null default false,
 failure_seen boolean not null default false,
 expiry_seen boolean not null default false,
 refunded_minor integer not null default 0 check(refunded_minor>=0),
 dispute_seen boolean not null default false,
 reconciliation_required boolean not null default false,
 updated_at timestamptz not null default clock_timestamp()
);
create table commerce_private.provider_exceptions (
 id uuid primary key default gen_random_uuid(),
 account_id text not null,
 event_id text not null,
 reason text not null check(reason in ('UNMATCHED','SESSION_UNATTACHED','BINDING_MISMATCH','AMOUNT_MISMATCH',
 'EVENT_CONFLICT','LATE_EVENT','READINESS_CHANGED','MONEY_EXCEPTION')),
 intent_id uuid references commerce_private.checkout_intents(id),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(account_id,event_id,reason)
);
create index commerce_exception_intent_idx on commerce_private.provider_exceptions(intent_id);
create table commerce_private.receipt_applications (
 account_id text not null,
 event_id text not null,
 intent_id uuid references commerce_private.checkout_intents(id),
 outcome text not null check(outcome in ('applied','pending','ignored')),
 primary key(account_id,event_id),
 foreign key(account_id,event_id) references commerce_private.provider_receipts(account_id,event_id)
);
create index commerce_application_intent_idx on commerce_private.receipt_applications(intent_id);
do $$declare t text;begin
 foreach t in array array['provider_receipts','intent_payment_bindings','settlements','provider_exceptions','receipt_applications'] loop
  execute format('alter table commerce_private.%I enable row level security',t);
  execute format('alter table commerce_private.%I force row level security',t);
  execute format('revoke all on commerce_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

create function commerce_private.reconcile_receipt(account text,event text) returns text
 language plpgsql security invoker set search_path='' as $$
declare r commerce_private.provider_receipts;i commerce_private.checkout_intents;o commerce_private.offers;
 state commerce_private.settlements;v_reason text;paid boolean:=false;free boolean:=false;binding text;correlation uuid:=gen_random_uuid();
begin
 select * into r from commerce_private.provider_receipts where account_id=account and event_id=event;
 if exists(select 1 from commerce_private.provider_exceptions ex where ex.account_id=account and ex.event_id=event and ex.reason='EVENT_CONFLICT') then
   return 'pending';end if;
 if r.event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded',
 'checkout.session.async_payment_failed','checkout.session.expired','payment_intent.payment_failed',
 'charge.refunded','charge.dispute.created','charge.dispute.closed') then
  insert into commerce_private.receipt_applications values(account,event,null,'ignored') on conflict do nothing;return 'ignored';end if;
 select * into i from commerce_private.checkout_intents where provider_account_id=account and
 (id=r.intent_reference or id in(select intent_id from commerce_private.intent_payment_bindings where account_id=account and payment_intent_id=r.payment_intent_id));
 if i.id is null then v_reason:='UNMATCHED';
 else
  select * into o from commerce_private.offers where id=i.offer_id;
  perform 1 from public.operations_cases where id=o.case_id for update;
  select * into i from commerce_private.checkout_intents where id=i.id for update;
  insert into commerce_private.settlements(intent_id) values(i.id) on conflict do nothing;
  select * into state from commerce_private.settlements where intent_id=i.id for update;
  select payment_intent_id into binding from commerce_private.intent_payment_bindings where intent_id=i.id;
  if (r.intent_reference is not null and r.intent_reference<>i.id) or
    (r.metadata_tenant is not null and r.metadata_tenant<>i.tenant_id) or
    (binding is not null and r.payment_intent_id is not null and binding<>r.payment_intent_id) then v_reason:='BINDING_MISMATCH';
  elsif r.event_type like 'checkout.session.%' and i.session_id is null then v_reason:='SESSION_UNATTACHED';
  elsif r.event_type like 'checkout.session.%' and (r.session_id is distinct from i.session_id or r.intent_reference is distinct from i.id
    or r.metadata_tenant is distinct from i.tenant_id) then v_reason:='BINDING_MISMATCH';
  elsif r.event_type not like 'checkout.session.%' and binding is null then v_reason:='SESSION_UNATTACHED';
  elsif r.event_type not like 'checkout.session.%' and r.payment_intent_id is distinct from binding then v_reason:='BINDING_MISMATCH';
  elsif (r.currency is distinct from 'zar' or (r.event_type not like 'charge.dispute.%' and r.amount_minor is distinct from (i.payload->>'amountTotalMinor')::integer)
    or (r.event_type like 'charge.dispute.%' and (r.amount_minor is null or r.amount_minor<0 or r.amount_minor>(i.payload->>'amountTotalMinor')::integer)))
    then v_reason:='AMOUNT_MISMATCH';
  elsif r.refund_minor is not null and (r.refund_minor<0 or r.refund_minor>(i.payload->>'amountTotalMinor')::integer) then v_reason:='AMOUNT_MISMATCH';
  else
   if r.event_type in ('checkout.session.completed','checkout.session.async_payment_succeeded') then
    paid:=r.payment_status='paid' and (i.payload->>'amountTotalMinor')::integer>0 and r.payment_intent_id is not null;
    free:=r.payment_status='no_payment_required' and (i.payload->>'amountTotalMinor')::integer=0 and r.payment_intent_id is null;
    if r.payment_status not in ('paid','unpaid','no_payment_required') or r.payment_status is null or
      (r.payment_status='paid' and not paid) or (r.payment_status='no_payment_required' and not free) then v_reason:='BINDING_MISMATCH';end if;
   end if;
   if v_reason is null and r.payment_intent_id is not null and r.event_type like 'checkout.session.%' then
    if exists(select 1 from commerce_private.intent_payment_bindings where account_id=account and payment_intent_id=r.payment_intent_id and intent_id<>i.id) then
      v_reason:='BINDING_MISMATCH';
    else insert into commerce_private.intent_payment_bindings values(i.id,account,r.payment_intent_id) on conflict do nothing;end if;
   end if;
   if v_reason is null then
    update commerce_private.settlements set
      paid_confirmed=paid_confirmed or paid,no_additional_payment=no_additional_payment or free,
      failure_seen=failure_seen or r.event_type in ('payment_intent.payment_failed','checkout.session.async_payment_failed'),
      expiry_seen=expiry_seen or r.event_type='checkout.session.expired',
      refunded_minor=greatest(refunded_minor,coalesce(r.refund_minor,0)),
      dispute_seen=dispute_seen or r.event_type like 'charge.dispute.%',updated_at=clock_timestamp()
    where intent_id=i.id;
    if r.event_type like 'charge.%' then v_reason:='MONEY_EXCEPTION';
    elsif (paid or free) and extract(epoch from r.occurred_at)>i.provider_expires_epoch then v_reason:='LATE_EVENT';
    elsif (paid or free) and (not exists(select 1 from commerce_private.checkout_releases where tenant_id=i.tenant_id
     and provider_account_id=account and enabled and expires_at>clock_timestamp())
     or not exists(select 1 from public.tenants where id=i.tenant_id and status='active')
     or not exists(select 1 from public.subjects where id=i.subject_id and status='active')
     or not exists(select 1 from commerce_private.order_acceptances a join commerce_private.order_publications p on p.id=a.publication_id
       where a.id=i.acceptance_id and p.status='published' and p.expires_at>clock_timestamp())
     or (i.payload->>'scenario'='approved_product_order' and not exists(select 1 from commerce_private.product_release_gates g
       where g.case_id=o.case_id and g.clinical_approved and g.stock_confirmed and g.pharmacy_authorised and g.address_confirmed
       and g.custody_ready and g.expires_at>clock_timestamp()))
     or not exists(select 1 from public.operations_cases c join intake_private.intakes x on x.case_id=c.id
      where c.id=o.case_id and c.state<>'cancelled' and x.state='submitted' and not x.safety_hold)) then v_reason:='READINESS_CHANGED';
    elsif exists(select 1 from commerce_private.settlements where intent_id=i.id and paid_confirmed and (failure_seen or expiry_seen)) then v_reason:='MONEY_EXCEPTION';end if;
   end if;
  end if;
 end if;
 if v_reason is not null then
  insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id) values(account,event,v_reason,i.id) on conflict do nothing;
  if i.id is not null then update commerce_private.settlements set reconciliation_required=true where intent_id=i.id;end if;
 end if;
 insert into commerce_private.receipt_applications values(account,event,i.id,case when v_reason is null then 'applied' else 'pending' end)
 on conflict(account_id,event_id) do update set intent_id=excluded.intent_id,outcome=excluded.outcome;
 return case when v_reason is null then 'applied' else 'pending' end;
end $$;
revoke all on function commerce_private.reconcile_receipt(text,text) from public,anon,authenticated,service_role;

create function public.apply_pilot_provider_event(p_service_id uuid,p_tenant_id uuid,p_account text,p_event jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare prior commerce_private.provider_receipts; event text;outcome text;r record;correlation uuid:=gen_random_uuid();target uuid;
begin
 if not exists(select 1 from public.service_identities s where s.id=p_service_id and s.tenant_id=p_tenant_id
  and s.status='active' and s.purpose='operations' and (s.expires_at is null or s.expires_at>clock_timestamp())
  and exists(select 1 from public.service_identity_scopes where service_identity_id=s.id and resource='payment' and action='append')
  and exists(select 1 from public.service_identity_scopes where service_identity_id=s.id and resource='payment' and action='update'))
 then raise exception using errcode='42501',message='WEBHOOK_SERVICE_REJECTED';end if;
 if p_event is null or jsonb_typeof(p_event)<>'object' or (select count(*) from jsonb_object_keys(p_event))<>15
   or p_account is null or p_account !~ '^acct_[A-Za-z0-9]{8,64}$'
   or p_event->>'eventId' is null or p_event->>'eventId' !~ '^evt_[A-Za-z0-9_]{8,120}$'
   or p_event->>'fingerprint' is null or p_event->>'fingerprint' !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='22023',message='WEBHOOK_EVENT_INVALID';end if;
 event:=p_event->>'eventId';perform pg_advisory_xact_lock(hashtextextended(p_account,0));
 -- Tenant is a deployment/service boundary, not an event-claimed authority.
 if (p_event->>'intentId') is not null and exists(select 1 from commerce_private.checkout_intents
  where id=(p_event->>'intentId')::uuid and (tenant_id<>p_tenant_id or provider_account_id<>p_account)) then
  raise exception using errcode='42501',message='WEBHOOK_SCOPE_REJECTED';end if;
 if exists(select 1 from commerce_private.intent_payment_bindings b join commerce_private.checkout_intents i on i.id=b.intent_id
  where b.account_id=p_account and b.payment_intent_id=p_event->>'paymentIntentId' and i.tenant_id<>p_tenant_id) then
  raise exception using errcode='42501',message='WEBHOOK_SCOPE_REJECTED';end if;
 select * into prior from commerce_private.provider_receipts where account_id=p_account and event_id=event;
 if prior.event_id is not null then
  if prior.fingerprint<>p_event->>'fingerprint' then
   select intent_id into target from commerce_private.receipt_applications where account_id=p_account and event_id=event;
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id) values(p_account,event,'EVENT_CONFLICT',target) on conflict do nothing;
   update commerce_private.settlements set reconciliation_required=true where intent_id=target;
   update commerce_private.receipt_applications set outcome='pending' where account_id=p_account and event_id=event;
   return jsonb_build_object('replayed',true,'outcome','pending');
  end if;
  if exists(select 1 from commerce_private.receipt_applications where account_id=p_account and event_id=event and receipt_applications.outcome in ('applied','ignored')) then
   return jsonb_build_object('replayed',true,'outcome',(select receipt_applications.outcome from commerce_private.receipt_applications where account_id=p_account and event_id=event));end if;
 else
  insert into commerce_private.provider_receipts values(p_account,event,p_event->>'fingerprint',p_event->>'eventType',
    (p_event->>'intentId')::uuid,(p_event->>'tenantId')::uuid,p_event->>'sessionId',p_event->>'paymentIntentId',
    (p_event->>'amountMinor')::integer,p_event->>'currency',p_event->>'paymentStatus',(p_event->>'refundMinor')::integer,
    p_event->>'chargeId',p_event->>'disputeId',p_event->>'disputeStatus',(p_event->>'occurredAt')::timestamptz,clock_timestamp(),p_service_id,p_tenant_id);
 end if;
 outcome:=commerce_private.reconcile_receipt(p_account,event);
 -- A newly bound PaymentIntent can correlate previously orphaned refund/dispute/failure receipts.
 for r in select a.event_id from commerce_private.receipt_applications a join commerce_private.provider_receipts e
 on e.account_id=a.account_id and e.event_id=a.event_id where a.account_id=p_account and a.outcome='pending'
 and a.event_id<>event and e.payment_intent_id=p_event->>'paymentIntentId'
 and exists(select 1 from commerce_private.provider_exceptions ex where ex.account_id=a.account_id and ex.event_id=a.event_id
   and ex.reason in ('UNMATCHED','SESSION_UNATTACHED'))
 and e.payment_intent_id in(select b.payment_intent_id from commerce_private.intent_payment_bindings b
   join commerce_private.checkout_intents ci on ci.id=b.intent_id where b.account_id=p_account and ci.tenant_id=p_tenant_id)
 order by a.event_id loop perform commerce_private.reconcile_receipt(p_account,r.event_id);end loop;
 select intent_id into target from commerce_private.receipt_applications where account_id=p_account and event_id=event;
  perform audit_private.append_audit_fact(p_tenant_id,'service',p_service_id,'service_identity','service',
   'commerce.provider.received',(select subject_id from commerce_private.checkout_intents where id=target),'payment',coalesce(target::text,event),
   'operations','sprint-11.5-v1','succeeded','PROVIDER_RECEIPT_RECORDED',correlation::text,event,clock_timestamp(),'{}');
 return jsonb_build_object('replayed',prior.event_id is not null,'outcome',outcome);
end $$;
revoke all on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) to service_role;

create function public.pilot_webhook_ready(p_tenant_id uuid,p_service_id uuid) returns boolean
 language sql security definer set search_path='' as $$select exists(
 select 1 from public.service_identities s where s.id=p_service_id and s.tenant_id=p_tenant_id
 and s.status='active' and s.purpose='operations' and (s.expires_at is null or s.expires_at>clock_timestamp())
 and exists(select 1 from public.service_identity_scopes where service_identity_id=s.id and resource='payment' and action='append')
 and exists(select 1 from public.service_identity_scopes where service_identity_id=s.id and resource='payment' and action='update'))$$;
revoke all on function public.pilot_webhook_ready(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pilot_webhook_ready(uuid,uuid) to service_role;
