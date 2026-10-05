-- Private commerce preparation only. No browser/service grants, Checkout, provider writes,
-- publication or paid-review adapter activation. Later tasks add governed callers.
create schema commerce_private authorization postgres;

create table commerce_private.prices (
  id uuid primary key,
  kind text not null check (kind in ('review_deposit','product')),
  version text not null check (version ~ '^[a-z0-9-]{1,80}$'),
  description text not null check (length(description) between 1 and 160),
  unit_amount_minor integer not null check (unit_amount_minor between 0 and 100000000),
  currency text not null default 'zar' check (currency='zar'),
  tax_treatment text not null check (tax_treatment='vat-inclusive-planning'),
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  approval_reference uuid not null,
  environment text not null check (environment='local-synthetic'),
  effective_at timestamptz not null,
  expires_at timestamptz not null check (expires_at>effective_at),
  status text not null default 'approved' check (status in ('approved','withdrawn')),
  check (kind<>'review_deposit' or unit_amount_minor=99900)
);
create index commerce_price_effective_idx on commerce_private.prices(kind,effective_at,expires_at)
  where status='approved';

create table commerce_private.delivery_quotes (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id),
  subject_id uuid not null references public.subjects(id),
  case_id uuid not null,
  version text not null check (version ~ '^[a-z0-9-]{1,80}$'),
  amount_minor integer not null check (amount_minor between 0 and 100000000),
  approval_reference uuid not null,
  effective_at timestamptz not null,
  expires_at timestamptz not null check (expires_at>effective_at),
  status text not null check (status in ('approved','withdrawn')),
  foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id)
);
create index commerce_delivery_scope_idx on commerce_private.delivery_quotes(tenant_id,subject_id,case_id);
create index commerce_delivery_subject_idx on commerce_private.delivery_quotes(subject_id);
create index commerce_delivery_case_idx on commerce_private.delivery_quotes(case_id);

-- Funding is not writable through any service/API. Task 11.5 must supply verified provider
-- evidence and allocation/refund transitions before any actual payment gate can use this ledger.
create table commerce_private.deposit_funding (
  case_id uuid primary key,
  tenant_id uuid not null references public.tenants(id),
  subject_id uuid not null references public.subjects(id),
  source_order_id uuid not null unique references public.payment_orders(id),
  evidence_reference uuid not null,
  amount_minor integer not null check (amount_minor=99900),
  state text not null check (state in ('available','reserved','applied','uncertain','refunded')),
  foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id)
);
create index commerce_deposit_subject_idx on commerce_private.deposit_funding(subject_id);
create index commerce_deposit_tenant_idx on commerce_private.deposit_funding(tenant_id);

create table commerce_private.offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  subject_id uuid not null references public.subjects(id),
  case_id uuid not null,
  request_key uuid not null,
  selection jsonb not null,
  snapshot jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  unique(case_id,request_key),
  foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id),
  check (jsonb_typeof(selection)='object' and jsonb_typeof(snapshot)='object'),
  check (expires_at>created_at)
);
create index commerce_offer_subject_idx on commerce_private.offers(tenant_id,subject_id,case_id);
create index commerce_offer_subject_fk_idx on commerce_private.offers(subject_id);
create index commerce_offer_case_idx on commerce_private.offers(case_id);

create table commerce_private.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references commerce_private.deposit_funding(case_id),
  offer_id uuid not null unique references commerce_private.offers(id),
  credit_minor integer not null check (credit_minor between 0 and 99900),
  unused_refund_minor integer not null check (unused_refund_minor between 0 and 99900),
  state text not null check (state in ('reserved','applied','released')),
  created_at timestamptz not null default clock_timestamp(),
  check (credit_minor+unused_refund_minor=99900)
);
create unique index commerce_one_credit_idx on commerce_private.credit_reservations(case_id)
  where state in ('reserved','applied');

create function commerce_private.immutable_version() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' or new.status<>'withdrawn' or old.status<>'approved'
    or (to_jsonb(new)-'status')<>(to_jsonb(old)-'status') then
    raise exception using errcode='42501',message='COMMERCE_IMMUTABLE';
  end if;
  return new;
end $$;
create trigger prices_immutable before update or delete on commerce_private.prices
  for each row execute function commerce_private.immutable_version();
create trigger quotes_immutable before update or delete on commerce_private.delivery_quotes
  for each row execute function commerce_private.immutable_version();
create trigger offers_immutable before update or delete on commerce_private.offers
  for each row execute function audit_private.reject_append_only_mutation();

create function commerce_private.calculate(p bigint,d bigint,first_order boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare c bigint;u bigint;t bigint;
begin
 if p is null or d is null or first_order is null or p<0 or d<0 or p>100000000 or d>100000000 then
   raise exception using errcode='22023',message='COMMERCE_AMOUNT_INVALID';end if;
 c:=case when first_order then least(p,99900) else 0 end;
 u:=case when first_order then 99900-c else 0 end;t:=p-c+d;
 if t>100000000 then raise exception using errcode='22023',message='COMMERCE_AMOUNT_INVALID';end if;
 return jsonb_build_object('productSubtotalMinor',p,'deliveryMinor',d,'creditMinor',c,
 'amountTotalMinor',t,'unusedDepositRefundMinor',u,'noAdditionalPayment',t=0,
 'policyVersion','pilot-commerce-policy-v1');
end $$;

-- Internal primitive, deliberately ungranted. Serialise on case then funding, lock prices in ID
-- order, keep immutable snapshot, and never release/consume credit from mere creation/expiry.
create function commerce_private.prepare_offer(t uuid,s uuid,c uuid,command jsonb)
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
    or not exists(select 1 from commerce_private.deposit_funding f join public.payment_orders po
      on po.id=f.source_order_id where f.case_id=c and f.tenant_id=t and f.subject_id=s
      and f.state in ('reserved','applied') and po.tenant_id=t and po.subject_id=s and po.environment='local'
      and po.status='paid' and po.amount_total_minor=99900 and po.refund_state='not_required'
      and po.dispute_state='none')) then
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
   if not exists(select 1 from public.payment_orders po where po.id=funding.source_order_id and
    po.tenant_id=t and po.subject_id=s and po.environment='local' and po.status='paid'
    and po.amount_total_minor=99900 and po.refund_state='not_required' and po.dispute_state='none') then
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

create table commerce_private.product_release_gates (
 case_id uuid primary key,
 tenant_id uuid not null references public.tenants(id),
 subject_id uuid not null references public.subjects(id),
 custody_ready boolean not null default false,
 clinical_approved boolean not null default false,
 stock_confirmed boolean not null default false,
 pharmacy_authorised boolean not null default false,
 address_confirmed boolean not null default false,
 evidence_reference uuid not null,
 expires_at timestamptz not null,
 foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id)
);
create index commerce_release_subject_idx on commerce_private.product_release_gates(subject_id);
create index commerce_release_tenant_idx on commerce_private.product_release_gates(tenant_id);

-- No Data API or service-role mutation/read path. Governed RPCs will be added separately.
do $$declare r record;begin
 for r in select tablename from pg_tables where schemaname='commerce_private' loop
  execute format('alter table commerce_private.%I enable row level security',r.tablename);
  execute format('alter table commerce_private.%I force row level security',r.tablename);
 end loop;
end $$;
revoke all on schema commerce_private from public,anon,authenticated,service_role;
revoke all on all tables in schema commerce_private from public,anon,authenticated,service_role;
revoke all on all functions in schema commerce_private from public,anon,authenticated,service_role;
