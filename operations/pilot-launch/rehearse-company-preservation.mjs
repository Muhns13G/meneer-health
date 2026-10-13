// Approved rollback-only SQL preparation. No network, full seed or provider operations.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
if (process.argv[2] !== "--sql") {
  console.log(JSON.stringify({ mode: "plan", rollbackOnly: true, sends: 0, charges: 0 }));
  process.exit(0);
}
const source = readFileSync("supabase/tests/database/medical_intake_foundation.test.sql", "utf8");
let packet =
  source.slice(0, source.indexOf("-- Task 11.4:")) +
  source.slice(source.indexOf("-- Company successor notices:"));
packet = packet.replace("create extension if not exists pgtap with schema extensions;", "");
packet = packet.replace(
  /insert into public\.pilot_instrument_publications[\s\S]*?;\s*(?=select public\.activate_pilot_account)/,
  "",
);
for (const [id, instrument, body] of [
  ["97000000-0000-4000-8000-000000000004", "pilot-account-terms", "Synthetic terms only"],
  ["97000000-0000-4000-8000-000000000005", "pilot-privacy-notice", "Synthetic privacy only"],
]) {
  packet = packet.replaceAll(
    `'${id}'`,
    `(select id::text from public.pilot_instrument_publications where instrument_id='${instrument}' and status='published' and locale='en-ZA' limit 1)`,
  );
  packet = packet.replace(
    `encode(extensions.digest(convert_to('${body}','UTF8'),'sha256'),'hex')`,
    `(select content_sha256 from public.pilot_instrument_publications where instrument_id='${instrument}' and status='published' and locale='en-ZA' limit 1)`,
  );
}
const intake = "d2000000-0000-4000-8000-000000000001";
packet = packet
  .replace(
    "(select case_id from intake_private.intakes limit 1)",
    `(select case_id from intake_private.intakes where id='${intake}')`,
  )
  .replaceAll(
    "from intake_private.snapshots)",
    `from intake_private.snapshots where intake_id='${intake}')`,
  )
  .replaceAll(
    "from intake_private.notice_receipts)",
    `from intake_private.notice_receipts where intake_id='${intake}')`,
  )
  .replaceAll(
    "from intake_private.collection_notice_actions)",
    `from intake_private.collection_notice_actions where intake_id='${intake}')`,
  )
  .replaceAll(
    "from commerce_private.order_acceptances)",
    "from commerce_private.order_acceptances where subject_id=(select subject_id from portal_context))",
  )
  .replace(
    "update intake_private.intakes set safety_hold=false;",
    `update intake_private.intakes set safety_hold=false where id='${intake}';`,
  )
  .replace(
    "update intake_private.snapshots set envelope='{}'",
    `update intake_private.snapshots set envelope='{}' where intake_id='${intake}'`,
  )
  .replace(
    "delete from intake_private.snapshots$$",
    () => `delete from intake_private.snapshots where intake_id='${intake}'$$`,
  )
  .replace(
    "update intake_private.publications set privacy_body='changed'",
    "update intake_private.publications set privacy_body='changed' where tenant_id='10000000-0000-4000-8000-000000000001'",
  )
  .replace(
    "update intake_private.publications set status='withdrawn';",
    "update intake_private.publications set status='withdrawn' where tenant_id='10000000-0000-4000-8000-000000000001';",
  )
  .replace(
    "update commerce_private.order_publications set body='changed'",
    "update commerce_private.order_publications set body='changed' where tenant_id='10000000-0000-4000-8000-000000000001'",
  )
  .replace(
    "update commerce_private.order_publications set status='withdrawn';",
    "update commerce_private.order_publications set status='withdrawn' where tenant_id='10000000-0000-4000-8000-000000000001';",
  )
  .replace(
    "update commerce_private.order_acceptances set content_hash=repeat('f',64)",
    "update commerce_private.order_acceptances set content_hash=repeat('f',64) where tenant_id='10000000-0000-4000-8000-000000000001'",
  )
  .replace(
    "from intake_private.snapshots s;",
    `from intake_private.snapshots s where intake_id='${intake}';`,
  )
  .replace(
    "update intake_private.collection_notice_actions set privacy_hash=repeat('f',64)",
    `update intake_private.collection_notice_actions set privacy_hash=repeat('f',64) where intake_id='${intake}'`,
  );
const tenant = randomUUID();
const approver = randomUUID();
const second = randomUUID();
packet = packet
  .replaceAll("10000000-0000-4000-8000-000000000001", tenant)
  .replaceAll("10000000-0000-4000-8000-000000000002", randomUUID())
  .replaceAll("20000000-0000-4000-8000-000000000001", approver)
  .replaceAll("20000000-0000-4000-8000-000000000002", second);
for (const id of new Set(packet.match(/(?:97000000|d2000000|a2200000|a2300000)-[a-f0-9-]{27}/g)))
  packet = packet.replaceAll(id, randomUUID());
const harness = `
create function pg_temp.no_plan() returns text language sql as $$select 'company-preservation'::text$$;
create function pg_temp.ok(value boolean,label text) returns text language plpgsql as $$begin if value is distinct from true then raise exception 'REHEARSAL_ASSERTION_FAILED: %',label;end if;return label;end$$;
create function pg_temp.is(actual bigint,expected bigint,label text) returns text language plpgsql as $$begin perform pg_temp.ok(actual is not distinct from expected,label);return label;end$$;
create function pg_temp.is(actual text,expected text,label text) returns text language plpgsql as $$begin perform pg_temp.ok(actual is not distinct from expected,label);return label;end$$;
create function pg_temp.is(actual jsonb,expected jsonb,label text) returns text language plpgsql as $$begin perform pg_temp.ok(actual is not distinct from expected,label);return label;end$$;
create function pg_temp.throws_ok(command text,expected_code text,expected_message text,label text) returns text language plpgsql as $$declare caught boolean:=false;begin begin execute command;exception when others then caught:=true;if sqlstate<>expected_code or sqlerrm<>expected_message then raise;end if;end;perform pg_temp.ok(caught,label);return label;end$$;
create function pg_temp.lives_ok(command text,label text) returns text language plpgsql as $$begin execute command;return label;end$$;
create function pg_temp.finish() returns text language sql as $$select 'all checks passed'::text$$;
insert into public.tenants(id,slug,display_name,status) values('${tenant}','synthetic-preservation-${tenant}','Synthetic preservation','active');
insert into public.subjects(id,status) values('${approver}','active'),('${second}','active');
-- Empty local stacks need synthetic account documents; hosted current documents are read only.
if not exists(select 1 from public.pilot_instrument_publications where status='published' and locale='en-ZA' and instrument_id in('pilot-account-terms','pilot-privacy-notice')) then
insert into public.pilot_instrument_publications(instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,effective_at)
values('pilot-account-terms','991.${Number.parseInt(tenant.slice(0, 8), 16)}','Synthetic rehearsal terms',repeat('0',64),'/account/activate','synthetic-only','${approver}',clock_timestamp()-interval '1 day',clock_timestamp()-interval '1 hour'),
('pilot-privacy-notice','991.${Number.parseInt(tenant.slice(0, 8), 16)}','Synthetic rehearsal privacy',repeat('0',64),'/account/activate','synthetic-only','${approver}',clock_timestamp()-interval '1 day',clock_timestamp()-interval '1 hour');
end if;
if not exists(select 1 from commerce_private.prices where kind='review_deposit' and environment='local-synthetic' and status='approved' and effective_at<=clock_timestamp() and expires_at>clock_timestamp()) then
insert into commerce_private.prices(id,kind,version,description,unit_amount_minor,tax_treatment,source_fingerprint,approval_reference,environment,effective_at,expires_at)
values(gen_random_uuid(),'review_deposit','synthetic-preservation','Synthetic deposit',99900,'vat-inclusive-planning',repeat('a',64),gen_random_uuid(),'local-synthetic',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day');
end if;
`;
packet = packet
  .replace(/^begin;/, () => harness)
  .replace(/rollback;\s*$/, "")
  .replace(/(?<![\w.])(no_plan|ok|is|throws_ok|lives_ok|finish)\(/g, "pg_temp.$1(")
  .replace(/^select /gm, "perform ")
  // This is the INSERT ... SELECT for the isolated native application session.
  .replace(/^perform '/gm, "select '")
  .replace(/^perform jsonb_build_object/gm, "select jsonb_build_object");
process.stdout
  .write(`begin isolation level repeatable read;set local statement_timeout='20s';set local lock_timeout='3s';
create temporary table company_baseline_internal(schema_name text,table_name text,fingerprint text) on commit drop;
do $baseline$ declare item record;value text;begin for item in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in('public','auth') or right(n.nspname,8)='_private') loop
execute format('select md5(coalesce(string_agg(to_jsonb(t)::text,%L order by to_jsonb(t)::text),%L)) from %I.%I t','|','',item.nspname,item.relname) into value;insert into company_baseline_internal values(item.nspname,item.relname,value);end loop;end $baseline$;
do $rehearsal$ declare item record;value text;begin begin
${packet}
raise exception using errcode='ZX001',message='EXPECTED_SYNTHETIC_ROLLBACK';exception when sqlstate 'ZX001' then if sqlerrm<>'EXPECTED_SYNTHETIC_ROLLBACK' then raise;end if;end;
for item in select * from company_baseline_internal loop execute format('select md5(coalesce(string_agg(to_jsonb(t)::text,%L order by to_jsonb(t)::text),%L)) from %I.%I t','|','',item.schema_name,item.table_name) into value;if value is distinct from item.fingerprint then raise exception 'BASELINE_CHANGED';end if;end loop;end $rehearsal$;
select true as preservation_checks_passed,true as full_row_baseline_restored;rollback;
`);
