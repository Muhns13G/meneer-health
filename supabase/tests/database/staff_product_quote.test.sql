begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,is_sso_user,is_anonymous)
values('a4000000-0000-4000-8000-000000000001','commands@example.invalid',now(),false,false);
create temporary table command_actor as select subject_id from public.external_identities
where provider='supabase' and provider_subject='a4000000-0000-4000-8000-000000000001';
grant select on command_actor to service_role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
values('a4000000-0000-4000-8000-000000000002','a4000000-0000-4000-8000-000000000001',now(),now(),'aal2');
insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
select '10000000-0000-4000-8000-000000000001',subject_id,'operations','active',now()-interval '1 day',now()+interval '1 day',
 '20000000-0000-4000-8000-000000000003' from command_actor;
insert into public.identity_sessions(id,subject_id,provider_session_id,session_class,assurance,issued_at,last_seen_at,idle_expires_at,absolute_expires_at)
select 'a4000000-0000-4000-8000-000000000003',subject_id,'a4000000-0000-4000-8000-000000000002',
 'workforce','aal2',now(),now(),now()+interval '15 minutes',now()+interval '8 hours' from command_actor;
insert into public.operations_cases(id,tenant_id,subject_id)
values('a4000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
insert into public.operations_assignments(tenant_id,case_id,subject_id,workforce_subject_id,granted_by_subject_id,starts_at,expires_at)
select '10000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000010',
 '20000000-0000-4000-8000-000000000001',subject_id,'20000000-0000-4000-8000-000000000003',now()-interval '1 minute',now()+interval '1 hour' from command_actor;

insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
values(gen_random_uuid(),'a4000000-0000-4000-8000-000000000002','totp',now(),now());
update public.tenant_memberships set valid_from=now()-interval '1 day',expires_at=now()+interval '1 day'
 where tenant_id='10000000-0000-4000-8000-000000000001' and subject_id='20000000-0000-4000-8000-000000000001' and role='patient';
insert into public.client_profiles(tenant_id,subject_id,given_name,family_name,mobile_e164,status)
values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic','Client','+27820000012','active');
insert into commerce_private.catalogue_versions(id,tenant_id,version,provenance,source_fingerprint,import_fingerprint,approval_reference,imported_by,reviewed_by,currency,tax_treatment,effective_at,expires_at,item_count)
values('15400000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','synthetic-quote-v1','local-synthetic',repeat('a',64),repeat('b',64),gen_random_uuid(),'20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','zar','vat-inclusive-planning',now()-interval '1 day',now()+interval '1 day',1);
insert into commerce_private.catalogue_items values('15400000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','15400000-0000-4000-8000-000000000002','synthetic-item','Synthetic item',150000,2);
insert into commerce_private.shipping_address_snapshots(id,tenant_id,subject_id,case_id,version,envelope,captured_by)
values('15400000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000010',1,jsonb_build_object(
'algorithm','AES-256-GCM','keyId','synthetic-address','nonce',repeat('A',16),'ciphertext',repeat('A',24),'scope',jsonb_build_object(
'tenantId','10000000-0000-4000-8000-000000000001','subjectId','20000000-0000-4000-8000-000000000001','caseId','a4000000-0000-4000-8000-000000000010','snapshotId','15400000-0000-4000-8000-000000000003','version',1)),
'20000000-0000-4000-8000-000000000001');
insert into commerce_private.delivery_quotes(id,tenant_id,subject_id,case_id,version,amount_minor,approval_reference,effective_at,expires_at,status)
values('15400000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000010','synthetic-v1',10000,gen_random_uuid(),now()-interval '1 day',now()+interval '1 day','approved');
insert into commerce_private.product_delivery_bindings(quote_id,tenant_id,case_id,subject_id,address_snapshot_id,catalogue_id,custody_policy_reference,evidence_reference)
values('15400000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001','15400000-0000-4000-8000-000000000003','15400000-0000-4000-8000-000000000001',gen_random_uuid(),gen_random_uuid());
create function pg_temp.authority() returns jsonb language sql as $$select jsonb_build_object(
'p_provider_subject','a4000000-0000-4000-8000-000000000001','p_provider_session_id','a4000000-0000-4000-8000-000000000002','p_verified_email','commands@example.invalid','p_session_id','a4000000-0000-4000-8000-000000000003','p_subject_id',(select subject_id from command_actor),'p_tenant_id','10000000-0000-4000-8000-000000000001')$$;
create function pg_temp.input() returns jsonb language sql as $$select jsonb_build_object(
'action','prepare_draft','caseId','a4000000-0000-4000-8000-000000000010','catalogueId','15400000-0000-4000-8000-000000000001','deliveryQuoteId','15400000-0000-4000-8000-000000000004','expectedCaseVersion',1,'expectedDraftVersion',0,'requestKey','15400000-0000-4000-8000-000000000005',
'items',jsonb_build_array(jsonb_build_object('productId','15400000-0000-4000-8000-000000000002','quantity',2)))$$;
create function pg_temp.quote(command jsonb default pg_temp.input()) returns jsonb language sql as $$
select public.staff_product_quote(pg_temp.authority(),command,'local-synthetic')$$;
select ok(not has_table_privilege(r,'commerce_private.product_quote_drafts',p),r||' direct '||p||' denied')
from unnest(array['anon','authenticated','service_role']) r cross join unnest(array['select','insert','update','delete']) p;
select ok(not has_function_privilege(r,'public.staff_product_quote(jsonb,jsonb,text)','execute'),r||' RPC denied')
from unnest(array['anon','authenticated']) r;
select ok(not has_function_privilege('service_role','public.list_workforce_contexts_before_labels(uuid,uuid,text)','execute'),'retired label primitive hidden');
select is(public.list_workforce_contexts('a4000000-0000-4000-8000-000000000001','a4000000-0000-4000-8000-000000000002','commands@example.invalid')->0->>'tenantName',
(select left(display_name,160) from public.tenants where id='10000000-0000-4000-8000-000000000001'),'authorised tenant label from database');
set local role service_role;
select is(pg_temp.quote()->'draft'->>'productSubtotalMinor','300000','quantities priced by server');
select is(pg_temp.quote()->'draft'->>'totalBeforeCreditMinor','310000','delivery separate and credit not applied');
select is(pg_temp.quote()->'draft'->>'version','1','exact retry yields one immutable version');
reset role;
select lives_ok($test$do $$begin update public.tenant_memberships set expires_at=null where role='patient';perform pg_temp.quote();end$$$test$,'native unbounded patient membership remains eligible');
set local role service_role;
select throws_ok($$select pg_temp.quote(pg_temp.input()||'{"paid":true}')$$,'22023','QUOTE_INPUT_INVALID','browser paid override rejected');
select throws_ok($$select pg_temp.quote(jsonb_set(pg_temp.input(),'{items,0,quantity}','1'))$$,'PT409','QUOTE_CONFLICT','changed key rejected');
select throws_ok($$select pg_temp.quote(pg_temp.input()||jsonb_build_object('requestKey',gen_random_uuid()))$$,'PT409','QUOTE_CONFLICT','stale competing draft rejected');
select throws_ok($$select pg_temp.quote(pg_temp.input()||jsonb_build_object('requestKey',gen_random_uuid(),'expectedDraftVersion',1,'expectedCaseVersion',99))$$,'PT409','QUOTE_CONFLICT','stale case version rejected');
select throws_ok($$select pg_temp.quote(jsonb_set(pg_temp.input()||jsonb_build_object('requestKey',gen_random_uuid(),'expectedDraftVersion',1),'{items,0,quantity}','3'))$$,'PT409','QUOTE_CONFLICT','product quantity cap enforced');
select throws_ok($$select pg_temp.quote(pg_temp.input()||jsonb_build_object('requestKey',gen_random_uuid(),'items',(pg_temp.input()->'items')||(pg_temp.input()->'items')))$$,'22023','QUOTE_INPUT_INVALID','duplicate items denied');
select throws_ok($$select pg_temp.quote(pg_temp.input()||jsonb_build_object('deliveryQuoteId',gen_random_uuid()))$$,'PT409','QUOTE_CONFLICT','unknown delivery denied');
select throws_ok($$select public.staff_product_quote(pg_temp.authority()||'{"p_tenant_id":"10000000-0000-4000-8000-000000000002"}',pg_temp.input(),'local-synthetic')$$,'42501','WORKFORCE_REJECTED','wrong tenant denied');
reset role;
select is((select count(*)::integer from commerce_private.product_quote_drafts),1,'replay and conflict append no drafts');
select is((select count(*)::integer from public.audit_events where action='product.quote.drafted'),1,'one metadata-free audit per draft');
select ok(not exists(select 1 from public.audit_events where action='product.quote.drafted' and metadata<>'{}'),'audit contains no product or contact details');
select is((select count(*)::integer from commerce_private.offers),0,'no payable offers');
select is((select version from public.operations_cases where id='a4000000-0000-4000-8000-000000000010'),1,'draft does not change case workflow');
select throws_ok($$update commerce_private.product_quote_drafts set snapshot='{}'$$,'55000','APPEND_ONLY_RECORD','snapshot immutable');
select throws_ok($$delete from commerce_private.product_quote_drafts$$,'55000','APPEND_ONLY_RECORD','draft history immutable');
select throws_ok($test$do $$begin update auth.mfa_amr_claims set updated_at=now()-interval '6 minutes';perform pg_temp.quote();end$$$test$,'42501','QUOTE_REJECTED','old TOTP denies exact replay');
select throws_ok($test$do $$begin update auth.sessions set aal='aal1';perform pg_temp.quote();end$$$test$,'42501','WORKFORCE_REJECTED','AAL downgrade denied');
select throws_ok($test$do $$begin update public.operations_assignments set revoked_at=clock_timestamp();perform pg_temp.quote();end$$$test$,'42501','QUEUE_REJECTED','assignment revocation denies replay');
select throws_ok($test$do $$begin update commerce_private.catalogue_versions set status='withdrawn';perform pg_temp.quote();end$$$test$,'PT409','QUOTE_CONFLICT','withdrawal denies replay');
select throws_ok($test$do $$begin update commerce_private.shipping_address_snapshots set status='withdrawn';perform pg_temp.quote();end$$$test$,'PT409','QUOTE_CONFLICT','withdrawn address denied');
select throws_ok($test$do $$begin update commerce_private.delivery_quotes set status='withdrawn';perform pg_temp.quote();end$$$test$,'PT409','QUOTE_CONFLICT','withdrawn delivery denied');
select throws_ok($test$do $$begin update public.client_profiles set status='restricted';perform pg_temp.quote();end$$$test$,'42501','QUOTE_REJECTED','restricted client denied');
select throws_ok($test$do $$begin update public.identity_sessions set status='revoked',revoked_at=now(),revocation_reason='synthetic';perform pg_temp.quote();end$$$test$,'42501','WORKFORCE_REJECTED','revoked session denied');
select throws_ok($test$do $$begin update public.tenant_memberships set status='revoked' where role='patient';perform pg_temp.quote();end$$$test$,'42501','QUOTE_REJECTED','inactive client membership denied');
select throws_ok($test$do $$declare membership uuid;begin
 insert into public.tenant_memberships(tenant_id,subject_id,role,status,valid_from,expires_at,approved_by_subject_id)
 select '10000000-0000-4000-8000-000000000001',subject_id,'auditor','active',now()-interval '1 day',now()+interval '1 day','20000000-0000-4000-8000-000000000003' from command_actor returning id into membership;
 insert into identity_private.workforce_context_selections(provider_session_id,subject_id,tenant_id,membership_id,role,purpose)
 select 'a4000000-0000-4000-8000-000000000002',subject_id,'10000000-0000-4000-8000-000000000001',membership,'auditor','privacy_review' from command_actor;
 perform pg_temp.quote();end$$$test$,'42501','QUOTE_REJECTED','non-operations role denied');
select throws_ok($test$do $$begin update public.operations_cases set state='cancelled';perform pg_temp.quote();end$$$test$,'42501','QUOTE_REJECTED','cancelled case denied');
select is(pg_temp.quote(pg_temp.input()||jsonb_build_object('requestKey',gen_random_uuid(),'expectedDraftVersion',1))->'draft'->>'version','2','new draft supersedes without overwriting');
select is((select count(*)::integer from commerce_private.product_quote_drafts),2,'both immutable versions retained');
select lives_ok($$select identity_private.assert_mobile_orphan_guard_coverage()$$,'native retirement coverage retained');
select * from finish();
rollback;

