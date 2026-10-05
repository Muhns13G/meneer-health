-- Reconcile only signed facts. Never force-clear conflicts or infer clinical approval.
create or replace function commerce_private.payment_status_page(t uuid,s uuid,c uuid,cursor jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb;
begin
 if cursor is not null and (jsonb_typeof(cursor)<>'object'
  or (select count(*) from jsonb_object_keys(cursor))<>2
  or not(cursor ? 'createdAt' and cursor ? 'id')
  or jsonb_typeof(cursor->'createdAt') is distinct from 'string'
  or jsonb_typeof(cursor->'id') is distinct from 'string') then
  raise exception using errcode='22023',message='PAYMENT_CURSOR_INVALID';
 end if;
 with facts as (
  select o.id,o.created_at,jsonb_build_object(
   'reference',o.id,'scenario',o.snapshot->>'scenario','currency','zar',
   'amountTotalMinor',(o.snapshot->>'amountTotalMinor')::integer,
   'refundedMinor',coalesce(f.refunded_minor,0),
   'status',case
    when f.paid_confirmed then 'confirmed'
    when f.no_additional_payment then 'not_required'
    when f.failure_seen then 'failed'
    when f.expiry_seen then 'expired'
    when i.id is not null then 'pending' else 'not_started' end,
   'dispute',coalesce(f.dispute_seen,false),
   'requiresReview',coalesce(f.reconciliation_required,false) or
   exists(select 1 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id
    where (j.source_intent_id=i.id or d.offer_id=o.id) and j.state not in ('confirmed','failed_verified')) or
   exists(select 1 from commerce_private.cancellation_requests where offer_id=o.id and state='staff_review'),
   'createdAt',o.created_at) payload
  from commerce_private.offers o
  left join commerce_private.checkout_intents i on i.offer_id=o.id
  left join commerce_private.settlements f on f.intent_id=i.id
  where o.tenant_id=t and o.subject_id=s and (c is null or o.case_id=c)
   and (cursor is null or (o.created_at,o.id)>
    ((cursor->>'createdAt')::timestamptz,(cursor->>'id')::uuid))
  order by o.created_at,o.id limit 26
 ), page as (select * from facts order by created_at,id limit 25)
 select jsonb_build_object('payments',coalesce((select jsonb_agg(payload order by created_at,id)
  from page),'[]'::jsonb),'nextCursor',case when (select count(*) from facts)>25 then
  (select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at desc,id desc limit 1)
  else null end) into result;
 return result;
end $$;

create or replace function commerce_private.refund_job_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' or (to_jsonb(new)-array['state','dispatch_started_at','provider_refund_id'])<>
  (to_jsonb(old)-array['state','dispatch_started_at','provider_refund_id']) or
  (old.state in ('confirmed','failed_verified') and new.state<>old.state) or
  (old.provider_refund_id is not null and new.provider_refund_id is distinct from old.provider_refund_id) or
  (old.dispatch_started_at is not null and new.dispatch_started_at is distinct from old.dispatch_started_at) then
  raise exception using errcode='42501',message='REFUND_IMMUTABLE';end if;
 return new;
end $$;
revoke all on function commerce_private.refund_job_guard() from public,anon,authenticated,service_role;

create function commerce_private.funding_current(c uuid,t uuid,s uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from commerce_private.deposit_funding f where f.case_id=c and f.tenant_id=t and f.subject_id=s
 and f.state in ('available','reserved','applied') and (
 (f.source_intent_id is not null and exists(select 1 from commerce_private.checkout_intents i
 join commerce_private.offers o on o.id=i.offer_id join commerce_private.settlements st on st.intent_id=i.id
 where i.id=f.source_intent_id and i.tenant_id=t and i.subject_id=s and o.case_id=c
 and o.snapshot->>'scenario'='review_deposit' and (i.payload->>'amountTotalMinor')::integer=99900 and st.paid_confirmed
 and not st.dispute_seen and not st.reconciliation_required
 and st.refunded_minor=coalesce((select cr.unused_refund_minor from commerce_private.credit_reservations cr where cr.case_id=c and cr.state='applied'),0)
 and not exists(select 1 from commerce_private.refund_jobs j where j.source_intent_id=i.id and j.state not in ('confirmed','failed_verified'))
 and not exists(select 1 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id where j.source_intent_id=i.id and j.state='confirmed' and d.reason<>'unused_deposit')))
 or (f.source_intent_id is null and exists(select 1 from public.payment_orders po where po.id=f.source_order_id
 and po.tenant_id=t and po.subject_id=s and po.environment='local' and po.status='paid'
 and po.amount_total_minor=99900 and po.refund_state='not_required' and po.dispute_state='none'))
 )) $$;
 revoke all on function commerce_private.funding_current(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function commerce_private.prepare_offer(t uuid,s uuid,c uuid,command jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior commerce_private.offers; funding commerce_private.deposit_funding;
 q commerce_private.delivery_quotes; p commerce_private.prices;
 k uuid; scenario text; items jsonb; item jsonb; lines jsonb:='[]';
 subtotal bigint:=0; quantity integer; expiry timestamptz:=clock_timestamp()+interval '15 minutes';
 result jsonb; offer_id uuid; first_order boolean; observed timestamptz:=clock_timestamp();
begin
 if command is null or jsonb_typeof(command)<>'object' or
   exists(select 1 from jsonb_object_keys(command) key where key not in ('scenario','items','deliveryQuoteId','requestKey'))
   or not(command ?& array['scenario','items','requestKey']) then
   raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
 k:=(command->>'requestKey')::uuid;scenario:=command->>'scenario';items:=command->'items';
 if k is null or scenario not in ('review_deposit','approved_product_order') or scenario is null
   or jsonb_typeof(items)<>'array' or items is null or jsonb_array_length(items)>20 then
   raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
 perform 1 from public.operations_cases where id=c and tenant_id=t and subject_id=s and state<>'cancelled' for update;
 if not found or not exists(select 1 from public.tenants where id=t and status='active')
   or not exists(select 1 from public.subjects where id=s and status='active')
   or not exists(select 1 from public.tenant_memberships m where m.tenant_id=t and m.subject_id=s
      and m.role='patient' and m.status='active' and m.valid_from<=observed
      and (m.expires_at is null or m.expires_at>observed))
   or not exists(select 1 from intake_private.intakes i join intake_private.publications pub on pub.id=i.publication_id
    where i.case_id=c and i.tenant_id=t and i.subject_id=s and i.state='submitted'
    and not i.safety_hold and i.snapshot_id is not null and pub.status='published'
    and pub.effective_at<=observed and pub.expires_at>observed) then
   raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
 select * into prior from commerce_private.offers where case_id=c and request_key=k;
 if prior.id is not null then
   if prior.tenant_id<>t or prior.subject_id<>s or prior.selection<>command then
    raise exception using errcode='40001',message='COMMERCE_CONFLICT';end if;
   if prior.expires_at<=observed then raise exception using errcode='42501',message='COMMERCE_OFFER_EXPIRED';end if;
   if exists(select 1 from jsonb_array_elements(prior.snapshot->'lines') line
    where not exists(select 1 from commerce_private.prices price where price.id=(line->>'id')::uuid
      and price.status='approved' and price.effective_at<=observed and price.expires_at>observed)) then
    raise exception using errcode='42501',message='COMMERCE_PRICE_UNAVAILABLE';end if;
   if scenario='approved_product_order' and (
    not exists(select 1 from commerce_private.product_release_gates g where g.case_id=c and g.tenant_id=t
      and g.subject_id=s and g.clinical_approved and g.stock_confirmed and g.pharmacy_authorised
      and g.address_confirmed and g.custody_ready and g.expires_at>observed)
    or not exists(select 1 from commerce_private.delivery_quotes dq where dq.id=(command->>'deliveryQuoteId')::uuid
      and dq.case_id=c and dq.tenant_id=t and dq.subject_id=s and dq.status='approved' and dq.expires_at>observed)
    or not commerce_private.funding_current(c,t,s)) then
    raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   return prior.snapshot||jsonb_build_object('offerId',prior.id,'replayed',true);
 end if;
 if scenario='review_deposit' then
   if jsonb_array_length(items)<>0 or command ? 'deliveryQuoteId'
     or exists(select 1 from commerce_private.deposit_funding where case_id=c)
     or exists(select 1 from commerce_private.offers where case_id=c and snapshot->>'scenario'='review_deposit') then
    raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   if (select count(*) from commerce_private.prices where kind='review_deposit' and status='approved'
      and effective_at<=observed and expires_at>observed)<>1 then
    raise exception using errcode='42501',message='COMMERCE_PRICE_UNAVAILABLE';end if;
   select * into p from commerce_private.prices where kind='review_deposit' and status='approved'
      and effective_at<=observed and expires_at>observed for share;
   expiry:=least(expiry,p.expires_at);
   result:=jsonb_build_object('scenario',scenario,'amountTotalMinor',99900,'currency','zar',
    'creditMinor',0,'unusedDepositRefundMinor',0,'noAdditionalPayment',false,
    'policyVersion','pilot-commerce-policy-v1','lines',jsonb_build_array(to_jsonb(p)));
 else
   if jsonb_array_length(items)=0 or not(command ? 'deliveryQuoteId') then
    raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
   -- Existing independent clinical/address/stock/pharmacy gates; custody remains a separate
   -- prerequisite and is deny-default until a verified commercial readiness record exists.
   if not exists(select 1 from commerce_private.product_release_gates g where g.case_id=c and g.tenant_id=t
      and g.subject_id=s and g.clinical_approved and g.stock_confirmed and g.pharmacy_authorised
      and g.address_confirmed and g.custody_ready and g.expires_at>observed) then
    raise exception using errcode='42501',message='COMMERCE_NOT_READY';end if;
   select * into funding from commerce_private.deposit_funding where case_id=c and tenant_id=t and subject_id=s for update;
   if funding.case_id is null or funding.state not in ('available','applied') then
    raise exception using errcode='42501',message='COMMERCE_DEPOSIT_UNAVAILABLE';end if;
   if not commerce_private.funding_current(c,t,s) then
    raise exception using errcode='42501',message='COMMERCE_DEPOSIT_UNAVAILABLE';end if;
   first_order:=funding.state='available';
   if not first_order and not exists(select 1 from commerce_private.credit_reservations
     where case_id=c and state='applied') then
    raise exception using errcode='42501',message='COMMERCE_DEPOSIT_UNAVAILABLE';end if;
   if exists(select 1 from commerce_private.credit_reservations where case_id=c and state='reserved') then
    raise exception using errcode='40001',message='COMMERCE_CREDIT_RESERVED';end if;
   select * into q from commerce_private.delivery_quotes where id=(command->>'deliveryQuoteId')::uuid
     and tenant_id=t and subject_id=s and case_id=c and status='approved'
     and effective_at<=observed and expires_at>observed for share;
   if q.id is null then raise exception using errcode='42501',message='COMMERCE_DELIVERY_UNAVAILABLE';end if;
   expiry:=least(expiry,q.expires_at);
   if (select count(distinct x->>'priceId') from jsonb_array_elements(items) x)<>jsonb_array_length(items) then
    raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
   for item in select value from jsonb_array_elements(items) order by value->>'priceId' loop
    if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2
      or not(item ?& array['priceId','quantity']) or (item->>'quantity') !~ '^[1-9][0-9]*$' then
     raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
    quantity:=(item->>'quantity')::integer;
    if quantity>10 then raise exception using errcode='22023',message='COMMERCE_SELECTION_INVALID';end if;
    select * into p from commerce_private.prices where id=(item->>'priceId')::uuid and kind='product'
      and status='approved' and effective_at<=observed and expires_at>observed for share;
    if p.id is null then raise exception using errcode='42501',message='COMMERCE_PRICE_UNAVAILABLE';end if;
    subtotal:=subtotal+p.unit_amount_minor::bigint*quantity;expiry:=least(expiry,p.expires_at);
    lines:=lines||jsonb_build_array(to_jsonb(p)||jsonb_build_object('quantity',quantity));
   end loop;
   result:=commerce_private.calculate(subtotal,q.amount_minor,first_order)||jsonb_build_object(
    'scenario',scenario,'currency','zar','lines',lines,'deliveryQuote',to_jsonb(q));
 end if;
 insert into commerce_private.offers(tenant_id,subject_id,case_id,request_key,selection,snapshot,expires_at)
 values(t,s,c,k,command,result,expiry) returning id into offer_id;
 if scenario='approved_product_order' and first_order then
  insert into commerce_private.credit_reservations(case_id,offer_id,credit_minor,unused_refund_minor,state)
    values(c,offer_id,(result->>'creditMinor')::integer,(result->>'unusedDepositRefundMinor')::integer,'reserved');
  update commerce_private.deposit_funding set state='reserved' where case_id=c;
 end if;
 return result||jsonb_build_object('offerId',offer_id,'replayed',false);
end $$;

create or replace function commerce_private.reserve_refund(decision uuid,source uuid,amount integer) returns void
language plpgsql set search_path='' as $$
declare capture integer; refunded integer; reserved bigint; account text; payment text;
begin
 if amount=0 then return;end if;
 if amount is null then raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
 select (i.payload->>'amountTotalMinor')::integer,s.refunded_minor,b.account_id,b.payment_intent_id
 into capture,refunded,account,payment from commerce_private.checkout_intents i
 join commerce_private.settlements s on s.intent_id=i.id
 join commerce_private.intent_payment_bindings b on b.intent_id=i.id
 where i.id=source and s.paid_confirmed and not s.dispute_seen and not s.reconciliation_required;
 select coalesce(sum(amount_minor),0) into reserved from commerce_private.refund_jobs where source_intent_id=source and state not in ('confirmed','failed_verified');
 if capture is null or amount<0 or refunded+reserved+amount>capture then
 raise exception using errcode='40001',message='REFUND_ALLOCATION_CONFLICT';end if;
 insert into commerce_private.refund_jobs(decision_id,source_intent_id,amount_minor,account_id,payment_intent_id)
 values(decision,source,amount,account,payment);
 update commerce_private.deposit_funding set state='uncertain' where source_intent_id=source;
end $$;
revoke all on function commerce_private.reserve_refund(uuid,uuid,integer) from public,anon,authenticated,service_role;


alter table commerce_private.refund_jobs drop constraint refund_jobs_state_check;
alter table commerce_private.refund_jobs add constraint refund_jobs_state_check
 check(state in ('queued','submitted','pending','uncertain','failed','confirmed','failed_verified'));
create table commerce_private.refund_provider_facts (
 account_id text not null, event_id text not null, refund_id text not null, job_reference uuid,
 payment_intent_id text not null, amount_minor integer not null check(amount_minor>0),
 currency text not null, status text not null check(status in ('pending','requires_action','succeeded','failed','canceled')),
 occurred_at timestamptz not null,
 primary key(account_id,event_id),
 foreign key(account_id,event_id) references commerce_private.provider_receipts(account_id,event_id)
);
create index refund_provider_job_idx on commerce_private.refund_provider_facts(job_reference);
create index refund_provider_id_idx on commerce_private.refund_provider_facts(account_id,refund_id);
create trigger refund_provider_facts_immutable before update or delete on commerce_private.refund_provider_facts
 for each row execute function audit_private.reject_append_only_mutation();
create table commerce_private.exception_resolutions (
 exception_id uuid primary key references commerce_private.provider_exceptions(id),
 recorded_at timestamptz not null default clock_timestamp()
);
create trigger exception_resolutions_immutable before update or delete on commerce_private.exception_resolutions
 for each row execute function audit_private.reject_append_only_mutation();
create table commerce_private.refund_retries (
 source_job uuid primary key references commerce_private.refund_jobs(id),
 replacement_job uuid unique not null references commerce_private.refund_jobs(id)
);
create table commerce_private.terminal_checks (
 id uuid primary key default gen_random_uuid(),
 intent_id uuid not null references commerce_private.checkout_intents(id), request_key uuid not null,
 session_id text not null, status text not null check(status in ('expired','complete')),
 verified_at timestamptz not null default clock_timestamp(), unique(intent_id,request_key)
);
create index terminal_check_intent_idx on commerce_private.terminal_checks(intent_id,verified_at);
create trigger terminal_checks_immutable before update or delete on commerce_private.terminal_checks
 for each row execute function audit_private.reject_append_only_mutation();
create trigger refund_retries_immutable before update or delete on commerce_private.refund_retries
 for each row execute function audit_private.reject_append_only_mutation();
do $$declare t text;begin
 foreach t in array array['refund_provider_facts','exception_resolutions','refund_retries','terminal_checks'] loop
 execute format('alter table commerce_private.%I enable row level security',t);
 execute format('alter table commerce_private.%I force row level security',t);
 execute format('revoke all on commerce_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

create function commerce_private.reconcile_refunds(account text,case_scope uuid) returns void
language plpgsql set search_path='' as $$
declare j commerce_private.refund_jobs; latest commerce_private.refund_provider_facts; total bigint;
 target uuid; offer uuid;
begin
 perform 1 from public.operations_cases where id=case_scope for update;
 for j in select jobs.* from commerce_private.refund_jobs jobs join commerce_private.refund_decisions d on d.id=jobs.decision_id
 join commerce_private.offers o on o.id=d.offer_id where jobs.account_id=account and o.case_id=case_scope loop
  select f.* into latest from commerce_private.refund_provider_facts f
  join commerce_private.provider_receipts r on r.account_id=f.account_id and r.event_id=f.event_id
  join commerce_private.checkout_intents i on i.id=j.source_intent_id and i.tenant_id=r.tenant_boundary
  where f.account_id=account and (f.job_reference=j.id or f.refund_id=j.provider_refund_id)
   and f.payment_intent_id=j.payment_intent_id and f.amount_minor=j.amount_minor and f.currency='zar'
   and j.dispatch_started_at is not null
   and (j.provider_refund_id is null or f.refund_id=j.provider_refund_id)
   and not exists(select 1 from commerce_private.provider_exceptions e where e.account_id=account
     and e.event_id=f.event_id and e.reason='EVENT_CONFLICT')
  order by f.occurred_at desc,f.event_id desc limit 1;
  if latest.event_id is null then continue;end if;
  if j.state='failed_verified' and latest.status not in ('failed','canceled') then
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
   values(account,latest.event_id,'EVENT_CONFLICT',j.source_intent_id) on conflict do nothing;
   continue;
  end if;
  -- A contradictory terminal fact remains an exception; never retry after known success.
  if j.state='confirmed' and latest.status<>'succeeded' then
   if latest.status in ('pending','requires_action') then continue;end if;
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
   values(account,latest.event_id,'EVENT_CONFLICT',j.source_intent_id) on conflict do nothing;
   update commerce_private.settlements set reconciliation_required=true where intent_id=j.source_intent_id;
   continue;
  end if;
  if exists(select 1 from commerce_private.refund_provider_facts f where f.account_id=account
   and (f.job_reference=j.id or f.refund_id=latest.refund_id)
   and (f.refund_id<>latest.refund_id or f.payment_intent_id<>j.payment_intent_id or f.amount_minor<>j.amount_minor or f.currency<>'zar')) then
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
   values(account,latest.event_id,'BINDING_MISMATCH',j.source_intent_id) on conflict do nothing;
   update commerce_private.settlements set reconciliation_required=true where intent_id=j.source_intent_id;
   continue;
  end if;
  update commerce_private.refund_jobs set provider_refund_id=latest.refund_id,
   state=case latest.status when 'succeeded' then 'confirmed' when 'failed' then 'failed_verified'
    when 'canceled' then 'failed_verified' else 'pending' end where id=j.id;
  update commerce_private.receipt_applications set intent_id=j.source_intent_id,outcome='applied'
   where account_id=account and event_id=latest.event_id;
 end loop;
 -- Job-specific successes are deduplicated by provider ID, not added to cumulative charge refunds.
 for target in select distinct jobs.source_intent_id from commerce_private.refund_jobs jobs
 join commerce_private.refund_decisions d on d.id=jobs.decision_id join commerce_private.offers o on o.id=d.offer_id
 where jobs.account_id=account and o.case_id=case_scope loop
  select coalesce(sum(amount_minor),0) into total from commerce_private.refund_jobs
   where source_intent_id=target and state='confirmed';
  if total>(select (payload->>'amountTotalMinor')::integer from commerce_private.checkout_intents where id=target) then
   update commerce_private.settlements set reconciliation_required=true where intent_id=target;
  else update commerce_private.settlements set refunded_minor=greatest(refunded_minor,total::integer) where intent_id=target;end if;
 end loop;
end $$;
revoke all on function commerce_private.reconcile_refunds(text,uuid) from public,anon,authenticated,service_role;

create function commerce_private.reconcile_case(target uuid) returns void
language plpgsql set search_path='' as $$
declare i commerce_private.checkout_intents; r record; total integer;
begin
 perform 1 from public.operations_cases where id=target for update;
 for i in select ci.* from commerce_private.checkout_intents ci join commerce_private.offers o on o.id=ci.offer_id
 where o.case_id=target order by case when o.snapshot->>'scenario'='review_deposit' then 0 else 1 end,ci.id loop
  for r in select a.event_id from commerce_private.receipt_applications a join commerce_private.provider_receipts p
   on p.account_id=a.account_id and p.event_id=a.event_id
   where a.account_id=i.provider_account_id and a.outcome='pending'
    and (p.intent_reference=i.id or p.payment_intent_id in(select payment_intent_id from commerce_private.intent_payment_bindings where intent_id=i.id))
    and p.event_type not like 'refund.%' order by p.occurred_at,a.event_id limit 100 loop
   perform commerce_private.reconcile_receipt(i.provider_account_id,r.event_id);
  end loop;
  -- Preserve exception history; resolve only demonstrably harmless/re-correlated evidence.
  insert into commerce_private.exception_resolutions(exception_id)
  select e.id from commerce_private.provider_exceptions e join commerce_private.receipt_applications a
   on a.account_id=e.account_id and a.event_id=e.event_id
   where (e.intent_id=i.id or a.intent_id=i.id) and e.reason in ('UNMATCHED','SESSION_UNATTACHED')
    and a.outcome='applied' on conflict do nothing;
  insert into commerce_private.exception_resolutions(exception_id)
  select e.id from commerce_private.provider_exceptions e
  where e.intent_id=i.id and e.reason='MONEY_EXCEPTION' and exists(select 1 from commerce_private.provider_receipts p
   where p.account_id=e.account_id and p.event_id=e.event_id and p.event_type='charge.refunded'
   and p.refund_minor=(select coalesce(sum(amount_minor),0) from commerce_private.refund_jobs where source_intent_id=i.id and state='confirmed'))
   on conflict do nothing;
  update commerce_private.settlements s set reconciliation_required=
   exists(select 1 from commerce_private.provider_exceptions e left join commerce_private.exception_resolutions x on x.exception_id=e.id
    where e.intent_id=i.id and x.exception_id is null)
   or exists(select 1 from commerce_private.refund_jobs where source_intent_id=i.id and state in ('submitted','pending','uncertain','failed'))
   or (s.paid_confirmed and (s.failure_seen or s.expiry_seen))
  where s.intent_id=i.id;
  -- Re-correlated receipts must also rebuild the funding/unused-refund effects, not just money.
  for r in select p.service_id from commerce_private.provider_receipts p
   join commerce_private.receipt_applications a on a.account_id=p.account_id and a.event_id=p.event_id
   where a.intent_id=i.id and a.outcome='applied' and p.account_id=i.provider_account_id
    and p.tenant_boundary=i.tenant_id and p.event_type in ('checkout.session.completed','checkout.session.async_payment_succeeded')
    and public.pilot_webhook_ready(i.tenant_id,p.service_id)
   order by p.occurred_at desc,p.event_id desc limit 1 loop
   perform commerce_private.queue_unused_deposit(i.id,r.service_id);
  end loop;
  -- Unpaid terminal evidence releases an unconsumed credit, never a paid/ambiguous source.
  if exists(select 1 from commerce_private.settlements where intent_id=i.id and not paid_confirmed
    and not no_additional_payment and (expiry_seen or failure_seen) and not reconciliation_required and not dispute_seen)
   and exists(select 1 from commerce_private.terminal_checks tc where tc.intent_id=i.id and tc.session_id=i.session_id
     and tc.verified_at>clock_timestamp()-interval '15 minutes'
     and (tc.status='expired' or exists(select 1 from commerce_private.provider_receipts p
       where p.intent_reference=i.id and p.event_type='checkout.session.async_payment_failed')))
   and exists(select 1 from commerce_private.credit_reservations where offer_id=i.offer_id and state='reserved') then
   update commerce_private.credit_reservations set state='released' where offer_id=i.offer_id and state='reserved';
   update commerce_private.deposit_funding set state='available' where case_id=target and state='reserved';
  end if;
 end loop;
 -- Refund-specific terminal evidence alone releases job reservations; funding stays quarantined
 -- except for exactly the approved unused remainder of a completed credited order.
 update commerce_private.deposit_funding f set state='applied' where f.case_id=target and f.source_intent_id is not null
  and exists(select 1 from commerce_private.credit_reservations c where c.case_id=target and c.state='applied'
   and c.unused_refund_minor=(select refunded_minor from commerce_private.settlements where intent_id=f.source_intent_id))
  and not exists(select 1 from commerce_private.refund_jobs j join commerce_private.refund_decisions d on d.id=j.decision_id
   where j.source_intent_id=f.source_intent_id and (j.state<>'confirmed' or d.reason<>'unused_deposit'))
  and exists(select 1 from commerce_private.settlements where intent_id=f.source_intent_id and not dispute_seen and not reconciliation_required);
end $$;
revoke all on function commerce_private.reconcile_case(uuid) from public,anon,authenticated,service_role;

alter function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) rename to apply_pilot_provider_event_before_reconciliation;
revoke all on function public.apply_pilot_provider_event_before_reconciliation(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.apply_pilot_provider_event(p_service_id uuid,p_tenant_id uuid,p_account text,p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; target uuid; job commerce_private.refund_jobs; r record;
begin
 if exists(select 1 from jsonb_object_keys(p_event) k where k not in ('eventId','fingerprint','eventType','intentId','tenantId',
 'sessionId','paymentIntentId','amountMinor','currency','paymentStatus','refundMinor','chargeId','disputeId','disputeStatus','occurredAt',
 'refundId','refundReference','refundStatus')) then raise exception using errcode='22023',message='WEBHOOK_EVENT_INVALID';end if;
 result:=public.apply_pilot_provider_event_before_reconciliation(p_service_id,p_tenant_id,p_account,p_event-array['refundId','refundReference','refundStatus']);
 if p_event->>'eventType' in ('refund.created','refund.updated','refund.failed') then
  if p_event->>'refundId' is null or p_event->>'refundId' !~ '^re_[A-Za-z0-9_]{8,120}$'
   or p_event->>'paymentIntentId' is null or p_event->>'currency' is distinct from 'zar'
   or p_event->>'amountMinor' is null or (p_event->>'amountMinor')::integer<=0 or p_event->>'refundStatus' is null
   or p_event->>'refundStatus' not in ('pending','requires_action','succeeded','failed','canceled') then
    raise exception using errcode='22023',message='REFUND_EVENT_INVALID';end if;
  select j.* into job from commerce_private.refund_jobs j join commerce_private.checkout_intents i on i.id=j.source_intent_id
  where j.account_id=p_account and (j.id=(p_event->>'refundReference')::uuid or j.provider_refund_id=p_event->>'refundId')
   and i.tenant_id=p_tenant_id;
  if job.id is null then
   update commerce_private.receipt_applications set outcome='pending' where account_id=p_account and event_id=p_event->>'eventId';
   select intent_id into target from commerce_private.intent_payment_bindings
    where account_id=p_account and payment_intent_id=p_event->>'paymentIntentId';
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
    values(p_account,p_event->>'eventId','UNMATCHED',target) on conflict do nothing;
  elsif job.payment_intent_id is distinct from p_event->>'paymentIntentId' or job.amount_minor is distinct from (p_event->>'amountMinor')::integer then
   insert into commerce_private.provider_exceptions(account_id,event_id,reason,intent_id)
    values(p_account,p_event->>'eventId','BINDING_MISMATCH',job.source_intent_id) on conflict do nothing;
  end if;
  insert into commerce_private.refund_provider_facts values(p_account,p_event->>'eventId',p_event->>'refundId',
   (p_event->>'refundReference')::uuid,p_event->>'paymentIntentId',(p_event->>'amountMinor')::integer,p_event->>'currency',
   p_event->>'refundStatus',(p_event->>'occurredAt')::timestamptz) on conflict do nothing;
 end if;
 for r in select distinct o.case_id from commerce_private.offers o join commerce_private.checkout_intents i on i.offer_id=o.id
  where i.tenant_id=p_tenant_id and i.provider_account_id=p_account
  and (i.id=(p_event->>'intentId')::uuid or i.id in(select intent_id from commerce_private.intent_payment_bindings
   where account_id=p_account and payment_intent_id=p_event->>'paymentIntentId')) loop
  perform commerce_private.reconcile_refunds(p_account,r.case_id);
  perform commerce_private.reconcile_case(r.case_id);
 end loop;
 return result;
end $$;
revoke all on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_pilot_provider_event(uuid,uuid,text,jsonb) to service_role;

-- The read/payment bridge is derived from current authority and signed net deposit facts only.
create function commerce_private.deposit_ready(target uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from commerce_private.offers o join commerce_private.checkout_intents i on i.offer_id=o.id
 join commerce_private.settlements s on s.intent_id=i.id join public.operations_cases c on c.id=o.case_id
 join public.tenants t on t.id=c.tenant_id join public.subjects u on u.id=c.subject_id
 where o.case_id=target and o.snapshot->>'scenario'='review_deposit' and (i.payload->>'amountTotalMinor')::integer=99900
 and i.tenant_id=c.tenant_id and i.subject_id=c.subject_id and s.paid_confirmed and s.refunded_minor=0
 and not s.dispute_seen and not s.reconciliation_required and c.state<>'cancelled' and t.status='active' and u.status='active'
 and not exists(select 1 from commerce_private.cancellation_requests q where q.offer_id=o.id)
 and not exists(select 1 from commerce_private.refund_jobs j where j.source_intent_id=i.id and j.state<>'failed_verified')
 and exists(select 1 from commerce_private.checkout_releases r where r.tenant_id=i.tenant_id and r.provider_account_id=i.provider_account_id and r.enabled and r.expires_at>clock_timestamp())
 and (select count(*) from commerce_private.offers d join commerce_private.checkout_intents ci on ci.offer_id=d.id
 join commerce_private.settlements ds on ds.intent_id=ci.id where d.case_id=target and d.snapshot->>'scenario'='review_deposit' and ds.paid_confirmed)=1
 ) $$;
revoke all on function commerce_private.deposit_ready(uuid) from public,anon,authenticated,service_role;
create or replace function identity_private.handoff_payment_ready(p_case_id uuid)
returns boolean language sql stable set search_path='' as $$select commerce_private.deposit_ready(p_case_id)$$;
create or replace function intake_private.review_payment_ready(target uuid)
returns boolean language sql stable set search_path='' as $$select commerce_private.deposit_ready((select case_id from intake_private.intakes where id=target))$$;
comment on function intake_private.review_payment_ready(uuid) is 'Current released, undisputed, unrefunded signed review-deposit ledger evidence. Not clinical authority.';

alter function public.staff_refund_command(jsonb,jsonb) rename to staff_refund_command_before_reconciliation;
revoke all on function public.staff_refund_command_before_reconciliation(jsonb,jsonb) from public,anon,authenticated,service_role;
create function public.staff_refund_command(p_authority jsonb,p_command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o commerce_private.offers; j commerce_private.refund_jobs; d commerce_private.refund_decisions; newdecision uuid; newjob uuid;
 key uuid; correlation uuid:=gen_random_uuid(); result jsonb; page jsonb;
begin
 if p_command->>'action' not in ('reconcile','retry','inspect','record_terminal') or p_command->>'action' is null then
  if p_command->>'action' in ('review','dispatch','record') then
   select * into o from commerce_private.offers where id=(p_command->>'offerId')::uuid and tenant_id=(p_authority->>'p_tenant_id')::uuid;
   if o.id is null then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
   perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
   perform pg_advisory_xact_lock(hashtextextended((select provider_account_id from commerce_private.checkout_intents where offer_id=o.id),0));
  end if;
  return public.staff_refund_command_before_reconciliation(p_authority,p_command);end if;
 if p_command->>'action' in ('reconcile','retry') and (jsonb_typeof(p_command)<>'object' or (select count(*) from jsonb_object_keys(p_command))<>
  (case when p_command->>'action'='retry' then 4 else 3 end) or not(p_command ?& array['action','offerId','requestKey'])
  or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('action','offerId','requestKey','refundId'))) then
  raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
 key:=(p_command->>'requestKey')::uuid;
 if key is null and p_command->>'action'<>'inspect' then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
 select * into o from commerce_private.offers where id=(p_command->>'offerId')::uuid and tenant_id=(p_authority->>'p_tenant_id')::uuid;
 if o.id is null then raise exception using errcode='42501',message='REFUND_REJECTED';end if;
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
 if p_command->>'action'='inspect' then
  if (select count(*) from jsonb_object_keys(p_command))<>2 then raise exception using errcode='22023',message='REFUND_COMMAND_INVALID';end if;
  select coalesce(jsonb_agg(plan),'[]'::jsonb) into result from (
   select jsonb_build_object('intentId',i.id,'tenantId',i.tenant_id,'accountId',i.provider_account_id,
    'sessionId',i.session_id,'amountMinor',(i.payload->>'amountTotalMinor')::integer,
    'paymentIntentId',(select payment_intent_id from commerce_private.intent_payment_bindings where intent_id=i.id)) plan
   from commerce_private.checkout_intents i join commerce_private.offers offer on offer.id=i.offer_id
   join commerce_private.settlements s on s.intent_id=i.id
   where offer.case_id=o.case_id and not s.paid_confirmed and not s.no_additional_payment
    and (s.failure_seen or s.expiry_seen) and i.session_id is not null
    and not s.dispute_seen and not s.reconciliation_required
   order by i.id limit 20) plans;
  perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
  return result;
 end if;
 -- Match callback lock order: account, case, job; no provider I/O inside the transaction.
 perform pg_advisory_xact_lock(hashtextextended((select provider_account_id from commerce_private.checkout_intents where offer_id=o.id),0));
 perform 1 from public.operations_cases where id=o.case_id for update;
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
 if p_command->>'action'='record_terminal' then
  if (select count(*) from jsonb_object_keys(p_command))<>6 or not(p_command ?& array['intentId','sessionId','status'])
    or p_command->>'status' is null or p_command->>'status' not in ('expired','complete')
    or not exists(select 1 from commerce_private.checkout_intents i join commerce_private.offers offer on offer.id=i.offer_id
      where i.id=(p_command->>'intentId')::uuid and offer.case_id=o.case_id and i.session_id=p_command->>'sessionId') then
    raise exception using errcode='42501',message='REFUND_REJECTED';end if;
  insert into commerce_private.terminal_checks(intent_id,request_key,session_id,status)
   values((p_command->>'intentId')::uuid,key,p_command->>'sessionId',p_command->>'status') on conflict do nothing;
 end if;
 perform commerce_private.reconcile_refunds((select provider_account_id from commerce_private.checkout_intents where offer_id=o.id),o.case_id);
 perform commerce_private.reconcile_case(o.case_id);
 if p_command->>'action'='retry' then
  select jobs.* into j from commerce_private.refund_jobs jobs join commerce_private.refund_decisions decisions on decisions.id=jobs.decision_id
   where jobs.id=(p_command->>'refundId')::uuid and decisions.offer_id=o.id for update of jobs;
  if j.id is null or j.state<>'failed_verified' then raise exception using errcode='40001',message='REFUND_RECONCILIATION_REQUIRED';end if;
  select * into d from commerce_private.refund_decisions where id=j.decision_id;
  if d.reason<>'unused_deposit' and not exists(select 1 from commerce_private.refund_evidence e where e.id=d.evidence_id and e.expires_at>clock_timestamp()) then
   raise exception using errcode='42501',message='REFUND_EVIDENCE_REQUIRED';end if;
  if not exists(select 1 from commerce_private.refund_retries where source_job=j.id) then
   insert into commerce_private.refund_decisions(offer_id,actor_id,request_key,reason,evidence_id)
   values(o.id,(p_authority->>'p_subject_id')::uuid,key,d.reason,d.evidence_id) returning id into newdecision;
   perform commerce_private.reserve_refund(newdecision,j.source_intent_id,j.amount_minor);
   select id into newjob from commerce_private.refund_jobs where decision_id=newdecision;
   insert into commerce_private.refund_retries values(j.id,newjob);
  end if;
 end if;
 perform audit_private.append_audit_fact(o.tenant_id,'workforce',(p_authority->>'p_subject_id')::uuid,'operations','aal2',
 'commerce.reconciliation',o.subject_id,'payment',o.id::text,'operations','sprint-11.8-v1','succeeded','RECONCILIATION_CHECKED',
 correlation::text,key::text,clock_timestamp(),'{}');
 page:=public.read_staff_payment_status((p_authority->>'p_provider_subject')::uuid,(p_authority->>'p_provider_session_id')::uuid,
 p_authority->>'p_verified_email',(p_authority->>'p_session_id')::uuid,(p_authority->>'p_subject_id')::uuid,(p_authority->>'p_tenant_id')::uuid,o.case_id);
 result:=commerce_private.refund_view(o.id,(page->>'expiresAt')::timestamptz);
 perform commerce_private.refund_staff_authority(p_authority,o.case_id,true);
 return result;
end $$;
revoke all on function public.staff_refund_command(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.staff_refund_command(jsonb,jsonb) to service_role;
create or replace function commerce_private.refund_view(offer uuid,deadline timestamptz) returns jsonb
language sql stable set search_path='' as $$ select jsonb_build_object(
 'requestState',coalesce((select state from commerce_private.cancellation_requests where offer_id=offer),'not_requested'),
 'refunds',coalesce((select jsonb_agg(jsonb_build_object('reference',j.id,'amountMinor',j.amount_minor,
 'state',j.state) order by d.recorded_at,j.id) from commerce_private.refund_jobs j
 join commerce_private.refund_decisions d on d.id=j.decision_id where d.offer_id=offer),'[]'::jsonb),
 'expiresAt',deadline,'exceptions',coalesce((select jsonb_agg(jsonb_build_object('reference',e.id,'code',e.reason,'state',case when x.exception_id is null then 'pending' else 'resolved' end)) from (select ex.* from commerce_private.provider_exceptions ex join commerce_private.checkout_intents i on i.id=ex.intent_id where i.offer_id=offer order by ex.recorded_at,ex.id limit 20) e left join commerce_private.exception_resolutions x on x.exception_id=e.id),'[]'::jsonb)) $$;
revoke all on function commerce_private.refund_view(uuid,timestamptz) from public,anon,authenticated,service_role;

-- Every newly journalled provider exception enters the existing content-free owned alert queue.
create function commerce_private.provider_exception_alert() returns trigger language plpgsql set search_path='' as $$
declare receipt commerce_private.provider_receipts; fact public.audit_events;
 subject uuid; correlation uuid:=gen_random_uuid();
begin
 select * into receipt from commerce_private.provider_receipts
 where account_id=new.account_id and event_id=new.event_id;
 if receipt.event_id is null then return new;end if;
 select subject_id into subject from commerce_private.checkout_intents where id=new.intent_id;
 fact:=audit_private.append_audit_fact(receipt.tenant_boundary,'service',receipt.service_id,
  'service_identity','service','commerce.reconciliation.exception',subject,'payment',new.id::text,
  'operations','sprint-11.8-v1','succeeded','PAYMENT_REVIEW_REQUIRED',correlation::text,
  correlation::text,clock_timestamp(),'{}');
 insert into audit_private.operations_alerts(tenant_id,audit_fact_id,code,owner,severity,deduplication_key)
 values(receipt.tenant_boundary,fact.id,'OPERATIONS_EXCEPTION','technology-operations','warning',
  'commerce-exception:'||new.id::text) on conflict do nothing;
 return new;
end $$;
revoke all on function commerce_private.provider_exception_alert() from public,anon,authenticated,service_role;
create trigger provider_exception_owned_alert after insert on commerce_private.provider_exceptions
 for each row execute function commerce_private.provider_exception_alert();
