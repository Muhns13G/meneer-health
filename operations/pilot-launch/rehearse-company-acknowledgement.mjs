// Produces one rollback-only SQL packet. No network, credentials or full local seed.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

if (process.argv[2] !== "--sql") {
  console.log(JSON.stringify({ mode: "plan", rollbackOnly: true, sends: 0, publishes: 0 }));
  process.exit(0);
}
const tenant = randomUUID();
const alternate = randomUUID();
const approver = randomUUID();
const versionSuffix = String(Number.parseInt(tenant.slice(0, 8), 16));
let packet = readFileSync(
  "supabase/tests/database/account_document_reacknowledgement.test.sql",
  "utf8",
);
packet = packet.replace("create extension if not exists pgtap with schema extensions;", "");
packet = packet.replace(
  "set local search_path=public,extensions;",
  "set local search_path=pg_temp,public,extensions;",
);
packet = packet
  .replaceAll("10000000-0000-4000-8000-000000000001", tenant)
  .replaceAll("10000000-0000-4000-8000-000000000002", alternate)
  .replaceAll("20000000-0000-4000-8000-000000000001", approver);
// Global version uniqueness survives supersession. Never reuse real published versions.
packet = packet
  .replaceAll("'1.1'", `'991.${versionSuffix}'`)
  .replaceAll("'1.2'", `'992.${versionSuffix}'`);
for (const id of new Set(packet.match(/fb200000-[0-9a-f-]{27}/g)))
  packet = packet.replaceAll(id, randomUUID());
const harness = `
set local statement_timeout='20s';
set local lock_timeout='3s';
create function pg_temp.no_plan() returns text language sql as $$select 'bounded-hosted-reacknowledgement'::text$$;
create function pg_temp.ok(value boolean,label text) returns text language plpgsql as $$begin if value is distinct from true then raise exception 'REHEARSAL_ASSERTION_FAILED: %',label;end if;return label;end$$;
create function pg_temp.is(actual bigint,expected bigint,label text) returns text language plpgsql as $$begin perform pg_temp.ok(actual is not distinct from expected,label);return label;end$$;
create function pg_temp.is(actual text,expected text,label text) returns text language plpgsql as $$begin perform pg_temp.ok(actual is not distinct from expected,label);return label;end$$;
create function pg_temp.throws_ok(command text,expected_code text,expected_message text,label text) returns text language plpgsql as $$declare caught boolean:=false;begin begin execute command;exception when others then caught:=true;if sqlstate<>expected_code or sqlerrm<>expected_message then raise;end if;end;perform pg_temp.ok(caught,label);return label;end$$;
create function pg_temp.finish() returns text language sql as $$select 'all bounded assertions passed'::text$$;
insert into public.tenants(id,slug,display_name,status) values('${tenant}','synthetic-reack-${tenant}','Synthetic acknowledgement rehearsal','active');
insert into public.subjects(id,status) values('${approver}','active');
-- Only uncommitted test visibility changes. ROLLBACK restores every publication.
update public.pilot_instrument_publications set status='superseded',retired_at=clock_timestamp()
where status='published' and locale='en-ZA' and instrument_id in('pilot-account-terms','pilot-privacy-notice');
`;
// Callback preserves PostgreSQL dollar quotes; replacement strings collapse $$ to $.
packet = packet.replace("begin;", () => `begin;${harness}`);
if (!packet.trimEnd().endsWith("rollback;")) throw Error("ROLLBACK_PACKET_REQUIRED");
const body = packet
  .replace(/^begin;/, "")
  .replace(/rollback;\s*$/, "")
  .replace(/(?<![\w.])(no_plan|ok|is|throws_ok|finish)\(/g, "pg_temp.$1(")
  .replace(/^select /gm, "perform ");
// Fingerprints never leave PostgreSQL. The nested exception rolls back fixtures before
// comparing; the outer ROLLBACK also removes this temporary comparison infrastructure.
process.stdout.write(`begin isolation level repeatable read;
set local statement_timeout='20s';set local lock_timeout='3s';
create temporary table reack_baseline_internal(schema_name text,table_name text,fingerprint text) on commit drop;
do $baseline$ declare item record; value text;begin
for item in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and (n.nspname in('public','auth') or right(n.nspname,8)='_private') loop
execute format('select md5(coalesce(string_agg(to_jsonb(t)::text,%L order by to_jsonb(t)::text),%L)) from %I.%I t','|','',item.nspname,item.relname) into value;
insert into reack_baseline_internal values(item.nspname,item.relname,value);
end loop;end $baseline$;
do $bounded_rehearsal$ declare item record; value text;begin
begin
${body}
raise exception using errcode='ZX001',message='EXPECTED_SYNTHETIC_ROLLBACK';
exception when sqlstate 'ZX001' then if sqlerrm<>'EXPECTED_SYNTHETIC_ROLLBACK' then raise;end if;end;
for item in select * from reack_baseline_internal loop
execute format('select md5(coalesce(string_agg(to_jsonb(t)::text,%L order by to_jsonb(t)::text),%L)) from %I.%I t','|','',item.schema_name,item.table_name) into value;
if value is distinct from item.fingerprint then raise exception 'REHEARSAL_BASELINE_CHANGED';end if;
end loop;end $bounded_rehearsal$;
select true as assertions_passed,true as full_row_baseline_restored,'rollback-only-no-data-egress'::text as scope;
rollback;
`);
