-- Task 15.2: private preparation only. No payable catalogue bridge or service grants.
begin;
create table commerce_private.catalogue_versions (
 id uuid primary key,
 tenant_id uuid not null references public.tenants(id),
 version text not null check(version ~ '^[a-z0-9-]{1,80}$'),
 provenance text not null check(provenance in('local-synthetic','precise-wellness-rrp')),
 source_fingerprint text not null check(source_fingerprint ~ '^[a-f0-9]{64}$'),
 import_fingerprint text not null check(import_fingerprint ~ '^[a-f0-9]{64}$'),
 approval_reference uuid not null,
 imported_by uuid not null references public.subjects(id),
 reviewed_by uuid not null references public.subjects(id),
 currency text not null check(currency='zar'),
 tax_treatment text not null check(tax_treatment='vat-inclusive-planning'),
 effective_at timestamptz not null,
 expires_at timestamptz not null check(expires_at>effective_at),
 item_count integer not null check(item_count between 1 and 250),
 status text not null default 'approved' check(status in('approved','withdrawn')),
 created_at timestamptz not null default clock_timestamp(),
 unique(tenant_id,version), unique(id,tenant_id),
 check(imported_by<>reviewed_by),
 check(provenance<>'precise-wellness-rrp' or source_fingerprint=
  '6fb2afe26b479f3affa2ca3ca98a66d20d6c18406621e7e4e52d810826a41736')
);
create index catalogue_importer_idx on commerce_private.catalogue_versions(imported_by);
create index catalogue_reviewer_idx on commerce_private.catalogue_versions(reviewed_by);
create index catalogue_effective_idx on commerce_private.catalogue_versions(tenant_id,effective_at,expires_at) where status='approved';
create table commerce_private.catalogue_items (
 catalogue_id uuid not null,
 tenant_id uuid not null,
 product_id uuid not null,
 sku text not null check(sku ~ '^[a-z0-9-]{1,80}$'),
 description text not null check(length(btrim(description)) between 1 and 160),
 unit_amount_minor integer not null check(unit_amount_minor between 1 and 100000000),
 max_quantity integer not null check(max_quantity between 1 and 10),
 primary key(catalogue_id,product_id), unique(catalogue_id,sku),
 foreign key(catalogue_id,tenant_id) references commerce_private.catalogue_versions(id,tenant_id)
);
create index catalogue_item_tenant_idx on commerce_private.catalogue_items(tenant_id,catalogue_id);

create table commerce_private.shipping_address_snapshots (
 id uuid primary key,
 tenant_id uuid not null,
 subject_id uuid not null references public.subjects(id),
 case_id uuid not null,
 version integer not null check(version>0),
 envelope jsonb not null,
 captured_by uuid not null references public.subjects(id),
 created_at timestamptz not null default clock_timestamp(),
 status text not null default 'approved' check(status in('approved','withdrawn')),
 unique(id,tenant_id,case_id,subject_id), unique(case_id,version),
 foreign key(case_id,tenant_id,subject_id) references public.operations_cases(id,tenant_id,subject_id),
 check(jsonb_typeof(envelope)='object' and
  envelope ?& array['algorithm','keyId','scope','nonce','ciphertext'] and
  envelope - array['algorithm','keyId','scope','nonce','ciphertext'] = '{}'::jsonb and
  jsonb_typeof(envelope->'algorithm')='string' and jsonb_typeof(envelope->'keyId')='string' and
  jsonb_typeof(envelope->'nonce')='string' and jsonb_typeof(envelope->'ciphertext')='string' and
  jsonb_typeof(envelope->'scope')='object' and
  envelope->>'algorithm'='AES-256-GCM' and
  envelope->>'keyId' ~ '^[a-z0-9-]{1,48}$' and
  envelope->>'nonce' ~ '^[A-Za-z0-9+/]{16}$' and
  length(envelope->>'ciphertext') between 24 and 8192 and
  envelope->>'ciphertext' ~ '^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$' and
  envelope->'scope'=jsonb_build_object('tenantId',tenant_id,'subjectId',subject_id,
    'caseId',case_id,'snapshotId',id,'version',version))
);
create index shipping_address_subject_idx on commerce_private.shipping_address_snapshots(subject_id);
create index shipping_address_capture_idx on commerce_private.shipping_address_snapshots(captured_by);
create index shipping_address_scope_idx on commerce_private.shipping_address_snapshots(case_id,tenant_id,subject_id);

-- Links a separately approved monetary quote to an immutable private address and catalogue.
-- Does not create delivery rates or claim courier/cold-chain approval.
alter table commerce_private.delivery_quotes add constraint delivery_quotes_scope_unique unique(id,tenant_id,case_id,subject_id);
create table commerce_private.product_delivery_bindings (
 quote_id uuid primary key,
 tenant_id uuid not null,
 case_id uuid not null,
 subject_id uuid not null,
 address_snapshot_id uuid not null,
 catalogue_id uuid not null,
 custody_policy_reference uuid not null,
 evidence_reference uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 foreign key(quote_id,tenant_id,case_id,subject_id) references commerce_private.delivery_quotes(id,tenant_id,case_id,subject_id),
 foreign key(address_snapshot_id,tenant_id,case_id,subject_id) references commerce_private.shipping_address_snapshots(id,tenant_id,case_id,subject_id),
 foreign key(catalogue_id,tenant_id) references commerce_private.catalogue_versions(id,tenant_id)
);
create index product_delivery_address_idx on commerce_private.product_delivery_bindings(address_snapshot_id,tenant_id,case_id,subject_id);
create index product_delivery_catalogue_idx on commerce_private.product_delivery_bindings(catalogue_id,tenant_id);

create trigger catalogue_versions_immutable before update or delete on commerce_private.catalogue_versions
 for each row execute function commerce_private.immutable_version();
create trigger catalogue_items_immutable before update or delete on commerce_private.catalogue_items
 for each row execute function audit_private.reject_append_only_mutation();
create trigger shipping_address_immutable before update or delete on commerce_private.shipping_address_snapshots
 for each row execute function commerce_private.immutable_version();
create trigger product_delivery_immutable before update or delete on commerce_private.product_delivery_bindings
 for each row execute function audit_private.reject_append_only_mutation();

create function commerce_private.catalogue_item_insert_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
declare batch commerce_private.catalogue_versions;
begin
 select * into batch from commerce_private.catalogue_versions where id=new.catalogue_id for update;
 if batch.status<>'approved' or (select count(*) from commerce_private.catalogue_items where catalogue_id=new.catalogue_id)>=batch.item_count then
  raise exception using errcode='42501',message='CATALOGUE_ITEMS_SEALED';end if;
 return new;
end $$;
create trigger catalogue_item_insert_guard before insert on commerce_private.catalogue_items
for each row execute function commerce_private.catalogue_item_insert_guard();
revoke all on function commerce_private.catalogue_item_insert_guard() from public,anon,authenticated,service_role;

create function commerce_private.catalogue_complete_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
declare ref uuid; expected integer;
begin
 ref:=(to_jsonb(new)->>case when tg_table_name='catalogue_versions' then 'id' else 'catalogue_id' end)::uuid;
 select item_count into expected from commerce_private.catalogue_versions where id=ref;
 if expected is distinct from (select count(*)::integer from commerce_private.catalogue_items where catalogue_id=ref) then
  raise exception using errcode='23514',message='CATALOGUE_IMPORT_INCOMPLETE';end if;
 return new;
end $$;
create constraint trigger catalogue_complete_batch after insert on commerce_private.catalogue_versions
 deferrable initially deferred for each row execute function commerce_private.catalogue_complete_guard();
create constraint trigger catalogue_complete_items after insert on commerce_private.catalogue_items
 deferrable initially deferred for each row execute function commerce_private.catalogue_complete_guard();
revoke all on function commerce_private.catalogue_complete_guard() from public,anon,authenticated,service_role;

create function commerce_private.product_delivery_binding_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from commerce_private.delivery_quotes q where q.id=new.quote_id
   and q.status='approved' and q.effective_at<=clock_timestamp() and q.expires_at>clock_timestamp())
  or not exists(select 1 from commerce_private.shipping_address_snapshots a where a.id=new.address_snapshot_id and a.status='approved')
  or not exists(select 1 from commerce_private.catalogue_versions v where v.id=new.catalogue_id
   and v.status='approved' and v.effective_at<=clock_timestamp() and v.expires_at>clock_timestamp()) then
  raise exception using errcode='42501',message='PRODUCT_DELIVERY_BINDING_REJECTED';end if;
 return new;
end $$;
create trigger product_delivery_binding_guard before insert on commerce_private.product_delivery_bindings
for each row execute function commerce_private.product_delivery_binding_guard();
revoke all on function commerce_private.product_delivery_binding_guard() from public,anon,authenticated,service_role;

-- Invoker primitive for expressly authorised offline preparation, not a routed writer.
create function commerce_private.import_catalogue(manifest jsonb) returns uuid
 language plpgsql security invoker set search_path='' as $$
declare prior commerce_private.catalogue_versions; item jsonb; catalogue_ref uuid; t uuid; importer uuid; reviewer uuid;
 fingerprint text; effective timestamptz; expiry timestamptz;
begin
 if manifest is null or jsonb_typeof(manifest)<>'object' or not(manifest ?& array[
 'id','tenantId','version','provenance','sourceFingerprint','approvalReference','importedBy',
 'reviewedBy','currency','taxTreatment','effectiveAt','expiresAt','items']) or
 manifest-array['id','tenantId','version','provenance','sourceFingerprint','approvalReference',
 'importedBy','reviewedBy','currency','taxTreatment','effectiveAt','expiresAt','items']<>'{}'::jsonb or
 jsonb_typeof(manifest->'items')<>'array' or
 jsonb_array_length(manifest->'items') not between 1 and 250 or
 exists(select 1 from jsonb_each(manifest) e where e.value='null'::jsonb)
 then raise exception using errcode='22023',message='CATALOGUE_IMPORT_INVALID';end if;
 catalogue_ref:=(manifest->>'id')::uuid;t:=(manifest->>'tenantId')::uuid;
 importer:=(manifest->>'importedBy')::uuid;reviewer:=(manifest->>'reviewedBy')::uuid;
 effective:=(manifest->>'effectiveAt')::timestamptz;expiry:=(manifest->>'expiresAt')::timestamptz;
 if importer=reviewer or expiry<=effective then
 raise exception using errcode='22023',message='CATALOGUE_IMPORT_INVALID';end if;
 if not exists(select 1 from public.tenants where tenants.id=t and status='active') then
 raise exception using errcode='42501',message='CATALOGUE_IMPORT_REJECTED';end if;
 -- References are checked against independently approved current non-clinical memberships.
 if (select count(distinct subject_id) from public.tenant_memberships m where m.tenant_id=t
  and m.subject_id in(importer,reviewer) and m.role in('admin','operations') and m.status='active'
  and m.valid_from<=clock_timestamp() and m.expires_at>clock_timestamp()
  and m.approved_by_subject_id is not null and m.approved_by_subject_id<>m.subject_id)<>2 then
 raise exception using errcode='42501',message='CATALOGUE_IMPORT_REJECTED';end if;
 for item in select value from jsonb_array_elements(manifest->'items') loop
  if jsonb_typeof(item)<>'object' or not(item ?& array['productId','sku','description','unitAmountMinor','maxQuantity'])
   or item-array['productId','sku','description','unitAmountMinor','maxQuantity']<>'{}'::jsonb or
   exists(select 1 from jsonb_each(item) e where e.value='null'::jsonb) or
   jsonb_typeof(item->'unitAmountMinor')<>'number' or jsonb_typeof(item->'maxQuantity')<>'number' or
   (item->>'unitAmountMinor') !~ '^[1-9][0-9]*$' or (item->>'maxQuantity') !~ '^[1-9][0-9]*$' then
   raise exception using errcode='22023',message='CATALOGUE_IMPORT_INVALID';end if;
 end loop;
 fingerprint:=encode(extensions.digest(manifest::text,'sha256'),'hex');
 -- Serialise same-tenant version imports, including differently keyed conflicting retries.
 perform 1 from public.tenants where tenants.id=t for update;
 select * into prior from commerce_private.catalogue_versions v where v.id=catalogue_ref;
 if prior.id is not null then
  if prior.tenant_id<>t or prior.import_fingerprint<>fingerprint or prior.status<>'approved' then
   raise exception using errcode='PT409',message='CATALOGUE_IMPORT_CONFLICT';end if;
  return catalogue_ref;
 end if;
 if exists(select 1 from commerce_private.catalogue_versions v where v.tenant_id=t and v.version=manifest->>'version') then
 raise exception using errcode='PT409',message='CATALOGUE_IMPORT_CONFLICT';end if;
 insert into commerce_private.catalogue_versions(id,tenant_id,version,provenance,source_fingerprint,
 import_fingerprint,approval_reference,imported_by,reviewed_by,currency,tax_treatment,effective_at,expires_at,item_count)
 values(catalogue_ref,t,manifest->>'version',manifest->>'provenance',manifest->>'sourceFingerprint',fingerprint,
 (manifest->>'approvalReference')::uuid,importer,reviewer,manifest->>'currency',manifest->>'taxTreatment',
 effective,expiry,jsonb_array_length(manifest->'items'));
 for item in select value from jsonb_array_elements(manifest->'items') loop
  if jsonb_typeof(item)<>'object' or not(item ?& array['productId','sku','description','unitAmountMinor','maxQuantity'])
   or item-array['productId','sku','description','unitAmountMinor','maxQuantity']<>'{}'::jsonb or
   exists(select 1 from jsonb_each(item) e where e.value='null'::jsonb) or
   jsonb_typeof(item->'unitAmountMinor')<>'number' or jsonb_typeof(item->'maxQuantity')<>'number' or
   (item->>'unitAmountMinor') !~ '^[1-9][0-9]*$' or (item->>'maxQuantity') !~ '^[1-9][0-9]*$' then
   raise exception using errcode='22023',message='CATALOGUE_IMPORT_INVALID';end if;
  insert into commerce_private.catalogue_items(catalogue_id,tenant_id,product_id,sku,description,unit_amount_minor,max_quantity)
   values(catalogue_ref,t,(item->>'productId')::uuid,item->>'sku',btrim(item->>'description'),
    (item->>'unitAmountMinor')::integer,(item->>'maxQuantity')::integer);
 end loop;
 return catalogue_ref;
end $$;
revoke all on function commerce_private.import_catalogue(jsonb) from public,anon,authenticated,service_role;

do $$declare r text;begin
 foreach r in array array['catalogue_versions','catalogue_items','shipping_address_snapshots','product_delivery_bindings'] loop
  execute format('alter table commerce_private.%I enable row level security',r);
  execute format('alter table commerce_private.%I force row level security',r);
  execute format('revoke all on commerce_private.%I from public,anon,authenticated,service_role',r);
 end loop;
end $$;
comment on table commerce_private.catalogue_versions is 'Customer-RRP preparation only. Not clinical approval or payable-offer authority.';
comment on table commerce_private.shipping_address_snapshots is 'Encrypted, scope-bound shipping history; requires separately secured address key and recovery policy before activation.';
-- Preserve native retirement/quarantine coverage for every new subject foreign key.
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.catalogue_versions
 for each row execute function identity_private.guard_mobile_orphan_reference('imported_by','reviewed_by');
create trigger mobile_orphan_reference_guard before insert or update on commerce_private.shipping_address_snapshots
 for each row execute function identity_private.guard_mobile_orphan_reference('subject_id','captured_by');
select identity_private.assert_mobile_orphan_guard_coverage();
commit;
