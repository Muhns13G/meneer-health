begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select is((select count(*)::integer from pg_class c join pg_namespace n on n.oid=c.relnamespace where
 n.nspname='commerce_private' and c.relname in('catalogue_versions','catalogue_items','shipping_address_snapshots','product_delivery_bindings')
 and c.relrowsecurity and c.relforcerowsecurity),4,'all preparation tables force RLS');
select ok(not has_table_privilege('anon','commerce_private.catalogue_versions','SELECT'),'anon cannot read catalogue');
select ok(not has_table_privilege('authenticated','commerce_private.catalogue_items','SELECT'),'browser cannot read items directly');
select ok(not has_table_privilege('service_role','commerce_private.shipping_address_snapshots','SELECT'),'service cannot browse shipping ciphertext');
select ok(not has_table_privilege('service_role','commerce_private.product_delivery_bindings','INSERT'),'service cannot create delivery readiness');
select ok(not has_function_privilege('service_role','commerce_private.import_catalogue(jsonb)','EXECUTE'),'import not exposed to service');
select ok(not has_function_privilege('authenticated','commerce_private.import_catalogue(jsonb)','EXECUTE'),'import not exposed to browser');
select ok(not (select prosecdef from pg_proc where oid='commerce_private.import_catalogue(jsonb)'::regprocedure),'import runs as invoker');

insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','admin','active',now()-interval '1 day',now()+interval '1 day','20000000-0000-4000-8000-000000000002'),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','admin','active',now()-interval '1 day',now()+interval '1 day','20000000-0000-4000-8000-000000000001')
on conflict(tenant_id,subject_id,role) do update set status='active',valid_from=excluded.valid_from,expires_at=excluded.expires_at,approved_by_subject_id=excluded.approved_by_subject_id;
create function pg_temp.manifest() returns jsonb language sql as $$select jsonb_build_object(
 'id','15020000-0000-4000-8000-000000000001','tenantId','10000000-0000-4000-8000-000000000001',
 'version','synthetic-v1','provenance','local-synthetic','sourceFingerprint',repeat('a',64),
 'approvalReference','15020000-0000-4000-8000-000000000002',
 'importedBy','20000000-0000-4000-8000-000000000001','reviewedBy','20000000-0000-4000-8000-000000000002',
 'currency','zar','taxTreatment','vat-inclusive-planning','effectiveAt',now()-interval '1 day','expiresAt',now()+interval '1 day',
 'items',jsonb_build_array(jsonb_build_object('productId','15020000-0000-4000-8000-000000000003','sku','synthetic-item',
  'description','Synthetic non-medical item','unitAmountMinor',150000,'maxQuantity',2)))$$;
select lives_ok($$select commerce_private.import_catalogue(pg_temp.manifest())$$,'bounded synthetic import works');
select lives_ok($$select commerce_private.import_catalogue(pg_temp.manifest())$$,'exact replay works');
select is((select count(*)::integer from commerce_private.catalogue_items where catalogue_id='15020000-0000-4000-8000-000000000001'),1,'replay does not duplicate');
select throws_ok($$select commerce_private.import_catalogue(pg_temp.manifest()||' {"wholesaleCost":1}'::jsonb)$$,'22023','CATALOGUE_IMPORT_INVALID','unknown wholesale input rejected');
select throws_ok($$select commerce_private.import_catalogue(jsonb_set(pg_temp.manifest(),'{items,0,practitionerPrice}','1'))$$,'22023','CATALOGUE_IMPORT_INVALID','item wholesale input rejected before replay');
select throws_ok($$select commerce_private.import_catalogue(jsonb_set(pg_temp.manifest(),'{items,0,description}','"Changed"'))$$,'PT409','CATALOGUE_IMPORT_CONFLICT','changed replay rejected');
select throws_ok($$select commerce_private.import_catalogue(pg_temp.manifest()||'{"reviewedBy":"20000000-0000-4000-8000-000000000001"}')$$,'22023','CATALOGUE_IMPORT_INVALID','self review rejected');
select throws_ok($$select commerce_private.import_catalogue(pg_temp.manifest()||'{"tenantId":"10000000-0000-4000-8000-000000000099"}')$$,'42501','CATALOGUE_IMPORT_REJECTED','wrong tenant denied');
select throws_ok($$select commerce_private.import_catalogue(pg_temp.manifest()||'{"id":"15020000-0000-4000-8000-000000000009","provenance":"precise-wellness-rrp"}')$$,'PT409','CATALOGUE_IMPORT_CONFLICT','version cannot be overwritten by real classification');
select throws_ok($$select commerce_private.import_catalogue(pg_temp.manifest()||'{"id":"15020000-0000-4000-8000-000000000009","version":"real-v1","provenance":"precise-wellness-rrp"}')$$,'23514',null,'unapproved real source hash rejected');
select is((select count(*)::integer from commerce_private.catalogue_versions),1,'failed import leaves no partial batch');
select throws_ok($$insert into commerce_private.catalogue_items values('15020000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',gen_random_uuid(),'extra','Synthetic extra',1,1)$$,'42501','CATALOGUE_ITEMS_SEALED','complete import cannot append items');
select throws_ok($$update commerce_private.catalogue_items set unit_amount_minor=1$$,'55000','APPEND_ONLY_RECORD','customer price immutable');
select throws_ok($$update commerce_private.catalogue_versions set source_fingerprint=repeat('b',64)$$,'42501','COMMERCE_IMMUTABLE','source immutable');
select lives_ok($$update commerce_private.catalogue_versions set status='withdrawn' where id='15020000-0000-4000-8000-000000000001'$$,'withdrawal preserves history');
select throws_ok($$select commerce_private.import_catalogue(pg_temp.manifest())$$,'PT409','CATALOGUE_IMPORT_CONFLICT','withdrawn import cannot reactivate');
select throws_ok($$delete from commerce_private.catalogue_versions$$,'42501','COMMERCE_IMMUTABLE','catalogue history not deletable');

insert into public.operations_cases(id,tenant_id,subject_id) values('15020000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
create function pg_temp.envelope() returns jsonb language sql as $$select jsonb_build_object('algorithm','AES-256-GCM',
 'keyId','synthetic-address-v1','nonce',repeat('A',16),'ciphertext',repeat('A',24),'scope',jsonb_build_object(
 'tenantId','10000000-0000-4000-8000-000000000001','subjectId','20000000-0000-4000-8000-000000000001',
 'caseId','15020000-0000-4000-8000-000000000010','snapshotId','15020000-0000-4000-8000-000000000011','version',1))$$;
select lives_ok($$insert into commerce_private.shipping_address_snapshots(id,tenant_id,subject_id,case_id,version,envelope,captured_by)
 values('15020000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 '15020000-0000-4000-8000-000000000010',1,pg_temp.envelope(),'20000000-0000-4000-8000-000000000001')$$,'structurally valid encrypted snapshot accepted');
select throws_ok($$update commerce_private.shipping_address_snapshots set envelope=pg_temp.envelope()||'{"line1":"plaintext"}'$$,'42501','COMMERCE_IMMUTABLE','address snapshot immutable');
select throws_ok($$insert into commerce_private.shipping_address_snapshots(id,tenant_id,subject_id,case_id,version,envelope,captured_by)
 values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 '15020000-0000-4000-8000-000000000010',2,pg_temp.envelope(),'20000000-0000-4000-8000-000000000001')$$,'23514',null,'scope cannot be replayed into another snapshot');
select throws_ok($$insert into commerce_private.shipping_address_snapshots(id,tenant_id,subject_id,case_id,version,envelope,captured_by)
 values('15020000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 '15020000-0000-4000-8000-000000000010',2,'{"line1":"plaintext"}','20000000-0000-4000-8000-000000000001')$$,'23514',null,'plaintext storage rejected');
select is((select count(*)::integer from commerce_private.product_delivery_bindings),0,'no delivery authority manufactured');
select lives_ok($$select commerce_private.import_catalogue(pg_temp.manifest()||'{"id":"15020000-0000-4000-8000-000000000009","version":"synthetic-v2"}')$$,'new version retains historical catalogue');
insert into commerce_private.delivery_quotes(id,tenant_id,subject_id,case_id,version,amount_minor,approval_reference,effective_at,expires_at,status)
values('15020000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
'15020000-0000-4000-8000-000000000010','synthetic-v1',10000,gen_random_uuid(),now()-interval '1 day',now()+interval '1 day','approved');
select lives_ok($$insert into commerce_private.product_delivery_bindings(quote_id,tenant_id,case_id,subject_id,address_snapshot_id,catalogue_id,custody_policy_reference,evidence_reference)
values('15020000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','15020000-0000-4000-8000-000000000010',
'20000000-0000-4000-8000-000000000001','15020000-0000-4000-8000-000000000011','15020000-0000-4000-8000-000000000009',gen_random_uuid(),gen_random_uuid())$$,'current scoped delivery/address/catalogue bind');
select throws_ok($$update commerce_private.product_delivery_bindings set evidence_reference=gen_random_uuid()$$,'55000','APPEND_ONLY_RECORD','delivery binding immutable');
select lives_ok($$update commerce_private.shipping_address_snapshots set status='withdrawn'$$,'address withdrawal retains immutable record');
select throws_ok($$insert into commerce_private.product_delivery_bindings(quote_id,tenant_id,case_id,subject_id,address_snapshot_id,catalogue_id,custody_policy_reference,evidence_reference)
values('15020000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','15020000-0000-4000-8000-000000000010',
'20000000-0000-4000-8000-000000000001','15020000-0000-4000-8000-000000000011','15020000-0000-4000-8000-000000000009',gen_random_uuid(),gen_random_uuid())$$,'42501','PRODUCT_DELIVERY_BINDING_REJECTED','withdrawn address refuses new binding');
select lives_ok($$select identity_private.assert_mobile_orphan_guard_coverage()$$,'new subject references preserve retirement guard coverage');
select throws_ok($$select commerce_private.import_catalogue(pg_temp.manifest()||jsonb_build_object(
 'id','15020000-0000-4000-8000-000000000019','version','synthetic-duplicate',
 'items',(pg_temp.manifest()->'items')||jsonb_build_array((pg_temp.manifest()->'items'->0)||jsonb_build_object('productId',gen_random_uuid()))))$$,
 '23505',null,'duplicate SKU rolls back entire import');
select is((select count(*)::integer from commerce_private.catalogue_versions where id='15020000-0000-4000-8000-000000000019'),0,'duplicate import leaves no catalogue row');
select lives_ok($$set constraints all immediate$$,'all imported batches are complete');
select throws_ok($$insert into commerce_private.catalogue_versions(id,tenant_id,version,provenance,source_fingerprint,import_fingerprint,approval_reference,
 imported_by,reviewed_by,currency,tax_treatment,effective_at,expires_at,item_count)
values('15020000-0000-4000-8000-000000000020','10000000-0000-4000-8000-000000000001','synthetic-incomplete','local-synthetic',repeat('a',64),repeat('b',64),gen_random_uuid(),
 '20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','zar','vat-inclusive-planning',now()-interval '1 day',now()+interval '1 day',1)$$,
 '23514','CATALOGUE_IMPORT_INCOMPLETE','incomplete batch cannot commit');
select * from finish();
rollback;
