begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'client_profiles', 'minimum client profiles exist');
select has_table('public', 'client_profile_events', 'profile lifecycle events exist');
select has_table('public', 'pilot_instrument_publications', 'approved instrument versions exist');
select has_table('public', 'pilot_instrument_receipts', 'immutable client actions exist');
select has_table('public', 'pilot_instrument_receipt_events', 'withdrawal events exist');
select has_table('public', 'pilot_account_lifecycle_events', 'account lifecycle events exist');

select is(
  (select count(*) from pg_class where oid in (
    'public.client_profiles'::regclass,
    'public.client_profile_events'::regclass,
    'public.pilot_instrument_publications'::regclass,
    'public.pilot_instrument_receipts'::regclass,
    'public.pilot_instrument_receipt_events'::regclass,
    'public.pilot_account_lifecycle_events'::regclass
  ) and relrowsecurity and relforcerowsecurity),
  6::bigint,
  'all six tables enable and force RLS'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and tablename in (
    'client_profiles', 'client_profile_events', 'pilot_instrument_publications',
    'pilot_instrument_receipts', 'pilot_instrument_receipt_events',
    'pilot_account_lifecycle_events'
  )),
  0::bigint,
  'no premature browser policies exist'
);
select ok(
  not has_table_privilege('anon', 'public.client_profiles', 'select')
  and not has_table_privilege('authenticated', 'public.client_profiles', 'select')
  and not has_table_privilege('anon', 'public.pilot_instrument_receipts', 'insert')
  and not has_table_privilege('authenticated', 'public.pilot_instrument_receipts', 'insert')
  and has_table_privilege('service_role', 'public.client_profiles', 'select')
  and not has_table_privilege('service_role', 'public.client_profiles', 'insert')
  and not has_table_privilege('service_role', 'public.client_profiles', 'update')
  and not has_table_privilege('service_role', 'public.pilot_instrument_receipts', 'insert'),
  'browser roles are denied and the server cannot bypass future governed write commands'
);
select is(
  (select count(*) from information_schema.columns where table_schema = 'public'
    and table_name = 'client_profiles' and column_name in (
      'email', 'password', 'birth_date', 'diagnosis', 'questionnaire_response',
      'prescription', 'protocol', 'delivery_address', 'free_text'
    )),
  0::bigint,
  'profile cannot hold excluded credential, clinical or delivery fields'
);

select lives_ok(
  $$ insert into public.client_profiles (
    id, tenant_id, subject_id, given_name, family_name, mobile_e164, contact_preference
  ) values (
    '81000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Synthetic', 'Patient', '+27821234567', 'email'
  ) $$,
  'an existing patient membership can own a minimum synthetic profile'
);
select throws_ok(
  $$ insert into public.client_profiles (
    tenant_id, subject_id, given_name, family_name, mobile_e164
  ) values (
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Wrong', 'Tenant', '+27821234567'
  ) $$,
  '23503', null,
  'profile cannot be attached to a tenant without matching patient membership'
);
select throws_ok(
  $$ insert into public.client_profiles (
    tenant_id, subject_id, given_name, family_name, mobile_e164
  ) values (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Duplicate', 'Patient', '+27821234567'
  ) $$,
  '23505', null,
  'one patient has only one current profile per tenant'
);
select throws_ok(
  $$ update public.client_profiles set mobile_e164 = '0821234567'
     where id = '81000000-0000-4000-8000-000000000001' $$,
  '23514', null,
  'non-E.164 mobile values are rejected'
);
select lives_ok(
  $$ insert into public.client_profile_events (
    profile_id, tenant_id, subject_id, profile_version, event_type,
    changed_fields, actor_subject_id, correlation_id, idempotency_key
  ) values (
    '81000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1, 'created', array['given_name', 'family_name'],
    '20000000-0000-4000-8000-000000000001',
    'profile_trace_01', '81000000-0000-4000-8000-000000000002'
  ) $$,
  'profile creation has an attributed, value-free event'
);
select throws_ok(
  $$ update public.client_profile_events set event_type = 'corrected'
     where profile_id = '81000000-0000-4000-8000-000000000001' $$,
  '55000', 'APPEND_ONLY_RECORD',
  'profile history is append-only'
);
select throws_ok(
  $$ insert into public.client_profile_events (
    profile_id, tenant_id, subject_id, profile_version, event_type,
    changed_fields, correlation_id, idempotency_key
  ) values (
    '81000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    2, 'corrected', array['diagnosis'], 'profile_trace_02',
    '81000000-0000-4000-8000-000000000003'
  ) $$,
  '23514', null,
  'profile history cannot name a clinical field'
);

select lives_ok(
  $$ insert into public.pilot_instrument_publications (
    id, instrument_id, instrument_version, document_body, rendered_locator,
    approval_reference, approved_by_subject_id, approved_at, effective_at
  ) values (
    '82000000-0000-4000-8000-000000000001',
    'pilot-account-terms', '1.0', 'Synthetic approved account terms.',
    '/account/terms', 'synthetic_review_01',
    '20000000-0000-4000-8000-000000000002',
    now() - interval '2 days', now() - interval '1 day'
  ) $$,
  'a synthetic approved account instrument can be published'
);
select is(
  (select content_sha256 from public.pilot_instrument_publications
   where id = '82000000-0000-4000-8000-000000000001'),
  encode(extensions.digest(convert_to('Synthetic approved account terms.', 'UTF8'), 'sha256'), 'hex'),
  'content hash is derived from the exact stored document'
);
select throws_ok(
  $$ update public.pilot_instrument_publications set document_body = 'Altered'
     where id = '82000000-0000-4000-8000-000000000001' $$,
  '55000', 'PUBLICATION_IMMUTABLE',
  'published content cannot be rewritten'
);
select lives_ok(
  $$ insert into public.pilot_instrument_receipts (
    id, tenant_id, subject_id, publication_id, instrument_id, instrument_version,
    locale, content_sha256, action, assurance, idempotency_key, correlation_id
  ) select
    '83000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    id, instrument_id, instrument_version, locale, content_sha256,
    'accepted', 'aal1', '83000000-0000-4000-8000-000000000002', 'receipt_trace_01'
  from public.pilot_instrument_publications
  where id = '82000000-0000-4000-8000-000000000001' $$,
  'receipt binds the exact published version and hash'
);
select throws_ok(
  $$ update public.pilot_instrument_receipts set action = 'acknowledged'
     where id = '83000000-0000-4000-8000-000000000001' $$,
  '55000', 'APPEND_ONLY_RECORD',
  'receipt cannot be edited'
);
select throws_ok(
  $$ insert into public.pilot_instrument_receipts (
    tenant_id, subject_id, publication_id, instrument_id, instrument_version,
    locale, content_sha256, action, assurance, idempotency_key, correlation_id
  ) values (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    'pilot-account-terms', '1.0', 'en-ZA', repeat('0', 64),
    'accepted', 'aal1', '83000000-0000-4000-8000-000000000003', 'receipt_trace_02'
  ) $$,
  '23503', null,
  'a mismatched content hash cannot create an acknowledgement'
);
select throws_ok(
  $$ insert into public.pilot_instrument_receipts (
    tenant_id, subject_id, publication_id, instrument_id, instrument_version,
    locale, content_sha256, action, assurance, idempotency_key, correlation_id
  ) select
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    id, instrument_id, instrument_version, locale, content_sha256,
    'acknowledged', 'aal1', '83000000-0000-4000-8000-000000000004', 'receipt_trace_03'
  from public.pilot_instrument_publications
  where id = '82000000-0000-4000-8000-000000000001' $$,
  '23514', null,
  'account terms cannot be misrecorded as privacy acknowledgement'
);
select throws_ok(
  $$ insert into public.pilot_instrument_publications (
    instrument_id, instrument_version, document_body, rendered_locator,
    approval_reference, approved_by_subject_id, approved_at, effective_at
  ) values (
    'pilot-account-terms', '1.1', 'Replacement synthetic terms.',
    '/account/terms', 'synthetic_review_02',
    '20000000-0000-4000-8000-000000000002',
    now() - interval '2 days', now() - interval '1 day'
  ) $$,
  '23505', null,
  'only one published version per instrument and locale can be active'
);
select lives_ok(
  $$ insert into public.pilot_instrument_receipt_events (
    receipt_id, tenant_id, subject_id, event_type, actor_subject_id,
    reason_code, idempotency_key, correlation_id
  ) values (
    '83000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'superseded', '20000000-0000-4000-8000-000000000001',
    'new_version', '83000000-0000-4000-8000-000000000005', 'receipt_trace_04'
  ) $$,
  'supersession appends a separate fact without rewriting the receipt'
);
select throws_ok(
  $$ delete from public.pilot_instrument_receipt_events
     where receipt_id = '83000000-0000-4000-8000-000000000001' $$,
  '55000', 'APPEND_ONLY_RECORD',
  'receipt lifecycle history cannot be deleted'
);
select lives_ok(
  $$ insert into public.pilot_account_lifecycle_events (
    tenant_id, subject_id, event_type, actor_subject_id,
    reason_code, idempotency_key, correlation_id
  ) values (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'activated', '20000000-0000-4000-8000-000000000001',
    'synthetic_activation', '84000000-0000-4000-8000-000000000001', 'account_trace_01'
  ) $$,
  'account activation can be recorded without raw contact values'
);
select throws_ok(
  $$ insert into public.pilot_account_lifecycle_events (
    tenant_id, subject_id, event_type, reason_code, idempotency_key, correlation_id
  ) values (
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'activated', 'wrong_tenant', '84000000-0000-4000-8000-000000000002',
    'account_trace_02'
  ) $$,
  '23503', null,
  'account event cannot claim an unrelated tenant'
);
select lives_ok(
  $$ update public.pilot_instrument_publications
     set status = 'superseded', retired_at = now()
     where id = '82000000-0000-4000-8000-000000000001' $$,
  'a published version can be retired without rewriting its content'
);
select throws_ok(
  $$ insert into public.pilot_instrument_receipts (
    tenant_id, subject_id, publication_id, instrument_id, instrument_version,
    locale, content_sha256, action, assurance, idempotency_key, correlation_id
  ) select
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    id, instrument_id, instrument_version, locale, content_sha256,
    'accepted', 'aal1', '83000000-0000-4000-8000-000000000006', 'receipt_trace_05'
  from public.pilot_instrument_publications
  where id = '82000000-0000-4000-8000-000000000001' $$,
  '42501', 'INSTRUMENT_NOT_ACTIVE',
  'retired instruments cannot receive new acceptance evidence'
);

select * from finish();
rollback;
