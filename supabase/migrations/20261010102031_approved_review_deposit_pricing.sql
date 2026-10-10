-- Honest production review pricing; no publication, price insertion or release activation.
begin;
alter table commerce_private.prices drop constraint prices_environment_check;
alter table commerce_private.prices add constraint prices_environment_check check (
 environment='local-synthetic' or (kind='product' and environment='precise-wellness-rrp')
 or (kind='review_deposit' and environment='approved-pilot-review'));

create table commerce_private.review_price_bindings (
 price_id uuid primary key references commerce_private.prices(id),
 tenant_id uuid not null references public.tenants(id),
 approval_reference uuid not null,
 recorded_at timestamptz not null default clock_timestamp()
);
create index review_price_tenant_idx on commerce_private.review_price_bindings(tenant_id,price_id);
alter table commerce_private.review_price_bindings enable row level security;
alter table commerce_private.review_price_bindings force row level security;
revoke all on commerce_private.review_price_bindings from public,anon,authenticated,service_role;
create trigger review_price_binding_immutable before update or delete
 on commerce_private.review_price_bindings for each row
 execute function audit_private.reject_append_only_mutation();

create function commerce_private.review_price_current(target uuid,tenant uuid) returns boolean
language sql volatile security invoker set search_path='' as $$
 select exists(select 1 from commerce_private.prices p where p.id=target
 and p.kind='review_deposit' and p.unit_amount_minor=99900 and p.status='approved'
 and p.effective_at<=clock_timestamp() and p.expires_at>clock_timestamp()
 and case when exists(select 1 from commerce_private.checkout_releases r
   where r.tenant_id=tenant and r.payment_environment='live') then
   p.environment='approved-pilot-review' and exists(
    select 1 from commerce_private.review_price_bindings b where b.price_id=p.id
    and b.tenant_id=tenant and b.approval_reference=p.approval_reference)
 else p.environment='local-synthetic' end)
$$;
revoke all on function commerce_private.review_price_current(uuid,uuid)
 from public,anon,authenticated,service_role;

-- Patch the retired native primitive, not the product wrapper. Exact anchors and security
-- metadata comparisons fail closed if the expected committed prerequisite has not applied.
do $$declare target oid; definition text; original record; marker text; replacement text;
begin
 target:='commerce_private.prepare_offer_before_product_quotes(uuid,uuid,uuid,jsonb)'::regprocedure;
 select proacl,proowner,proconfig,prosecdef,provolatile into original from pg_proc where oid=target;
 definition:=pg_get_functiondef(target);
 marker:='where kind=''review_deposit'' and status=''approved''';
 replacement:=marker||' and commerce_private.review_price_current(id,t)';
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>2 then
  raise exception 'REVIEW_PRICE_PATCH_SHAPE_INVALID';end if;
 definition:=replace(definition,marker,replacement);
 marker:='and price.status=''approved'' and price.effective_at<=observed and price.expires_at>observed';
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then
  raise exception 'REVIEW_PRICE_REPLAY_PATCH_SHAPE_INVALID';end if;
 definition:=replace(definition,marker,marker||
  ' and (scenario<>''review_deposit'' or commerce_private.review_price_current(price.id,t))');
 execute definition;
 if exists(select 1 from pg_proc p where p.oid=target and
  (p.proacl is distinct from original.proacl or p.proowner<>original.proowner
   or p.proconfig is distinct from original.proconfig or p.prosecdef<>original.prosecdef
   or p.provolatile<>original.provolatile)) then
  raise exception 'REVIEW_PRICE_SECURITY_METADATA_CHANGED';end if;
end $$;
commit;
