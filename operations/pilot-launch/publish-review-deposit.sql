-- Owner-approved R999 pilot deposit and seven-day database window, 10 October 2026.
-- Run rollback-only first; application requires the exact six reviewed migrations.
-- No client, paid flag, product publication, clinical authority or provider write.
begin;
set local lock_timeout='5s';
set local statement_timeout='20s';
lock table commerce_private.prices, commerce_private.review_price_bindings,
 commerce_private.checkout_releases, commerce_private.order_publications,
 public.service_identities in share row exclusive mode;
do $$declare tenant constant uuid:='80000000-0000-4000-8000-000000000001';
 service constant uuid:='c7a04672-992e-44fe-918b-76209f974adb';
 account constant text:='acct_1U32SWCBswMrhhx4';
 price uuid:=gen_random_uuid(); approval uuid:=gen_random_uuid();
 observed timestamptz:=clock_timestamp(); deadline timestamptz;
begin
 deadline:=observed+interval '7 days';
 if (select count(*) from auth.users)<>4 or
  (select count(*) from public.client_profiles)<>0 or
  (select count(*) from commerce_private.checkout_intents)<>0 or
  (select count(*) from commerce_private.prices where kind='review_deposit')<>0 or
  not exists(select 1 from public.tenants where id=tenant and slug='meneer-pilot' and status='active') or
  not exists(select 1 from commerce_private.checkout_releases where tenant_id=tenant
    and provider_account_id=account and payment_environment='live' and not enabled) or
  not exists(select 1 from public.service_identities where id=service and tenant_id=tenant
    and status='active' and expires_at>deadline) or
  (select count(*) from commerce_private.order_publications where tenant_id=tenant
    and scenario='review_deposit' and status='published' and effective_at<=observed and expires_at>deadline)<>1 or
  exists(select 1 from commerce_private.product_quote_releases where enabled) or
  exists(select 1 from commerce_private.catalogue_versions) then
  raise exception 'PILOT_DEPOSIT_PUBLICATION_BASELINE_CHANGED';end if;
 insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,currency,
  tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at,status)
 values(price,'review_deposit','pilot-review-deposit-approved-v1','Pilot clinical review deposit',
  99900,'zar','vat-inclusive-planning',encode(extensions.digest(
    'Owner-approved 2026-10-10: R999 review deposit; capped product credit; unused balance refund; separate delivery; seven-day initial release',
    'sha256'),'hex'),approval,'approved-pilot-review',observed,deadline,'approved');
 insert into commerce_private.review_price_bindings(price_id,tenant_id,approval_reference)
 values(price,tenant,approval);
 update commerce_private.checkout_releases set enabled=true,expires_at=deadline,
  approval_reference=approval where tenant_id=tenant and provider_account_id=account
  and payment_environment='live' and not enabled;
 if not found or not commerce_private.review_price_current(price,tenant) then
  raise exception 'PILOT_DEPOSIT_RELEASE_READBACK_FAILED';end if;
 if (select count(*) from commerce_private.prices where
  commerce_private.review_price_current(id,tenant))<>1 then
  raise exception 'PILOT_DEPOSIT_AMBIGUOUS_PRICE';end if;
end $$;
select p.id as price_id,p.unit_amount_minor,p.currency,p.environment,p.approval_reference,
 r.enabled,r.expires_at as release_expires_at,b.tenant_id,
 commerce_private.review_price_current(p.id,b.tenant_id) as price_current
 from commerce_private.review_price_bindings b join commerce_private.prices p on p.id=b.price_id
 join commerce_private.checkout_releases r on r.tenant_id=b.tenant_id
 where b.tenant_id='80000000-0000-4000-8000-000000000001';
commit;
