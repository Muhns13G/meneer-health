// Preparation only: no network or SQL execution. Publication requires separate approval
// after owner deployment and independent routed acceptance.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { companyProfile } from "../../content/company-profile.ts";
import { replacePilotCompanyIdentity } from "../../content/company-notice-transition.ts";

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sha = (value) => createHash("sha256").update(value).digest("hex");
export function buildCompanyPublicationSql(preview) {
  if (preview.stage !== "read-only-preview-not-published" || preview.publications.length !== 4)
    throw Error("PUBLICATION_PREVIEW_INVALID");
  const rows = preview.publications;
  const accounts = rows.filter((r) => r.predecessor.kind === "account");
  const payment = rows.find((r) => r.predecessor.kind === "payment");
  const medical = rows.find((r) => r.predecessor.kind === "intake");
  if (
    accounts.length !== 2 ||
    new Set(accounts.map((r) => r.predecessor.instrument)).size !== 2 ||
    !accounts.every((r) =>
      ["pilot-account-terms", "pilot-privacy-notice"].includes(r.predecessor.instrument),
    ) ||
    new Set(rows.map((r) => r.predecessor.id)).size !== 4 ||
    !payment ||
    !medical ||
    payment.predecessor.version !== "1.0.0"
  )
    throw Error("PUBLICATION_SCOPE_CHANGED");
  for (const row of rows) {
    if (!/^[a-f0-9-]{36}$/.test(row.predecessor.id)) throw Error("PUBLICATION_ID_INVALID");
    const expected =
      row.predecessor.kind === "intake"
        ? {
            privacy: replacePilotCompanyIdentity(row.predecessor.privacy),
            declaration: replacePilotCompanyIdentity(row.predecessor.declaration),
          }
        : {
            body: replacePilotCompanyIdentity(row.predecessor.body),
            ...(row.predecessor.supplier
              ? { supplier: replacePilotCompanyIdentity(row.predecessor.supplier) }
              : {}),
          };
    for (const [name, value] of Object.entries(expected))
      if (value !== row.successor[name] || sha(value) !== row.successorHashes[name])
        throw Error("SUCCESSOR_COPY_CHANGED");
  }
  const tenant = "80000000-0000-4000-8000-000000000001";
  const owner = "c72f29d8-a171-43bc-a942-47b07ce03246";
  const assertions = accounts
    .map(
      ({ predecessor: p }) => `
if not exists(select 1 from public.pilot_instrument_publications where id=${quote(p.id)} and status='published'
 and instrument_id=${quote(p.instrument)} and instrument_version='1.1' and content_sha256=${quote(p.hash)}) then raise exception 'ACCOUNT_PREDECESSOR_CHANGED';end if;`,
    )
    .join("\n");
  const accountWrites = accounts
    .map(
      ({ predecessor: p, successor: s }) => `
update public.pilot_instrument_publications set status='superseded',retired_at=clock_timestamp() where id=${quote(p.id)};
insert into public.pilot_instrument_publications(instrument_id,instrument_version,locale,document_body,content_sha256,rendered_locator,
approval_reference,approved_by_subject_id,approved_at,effective_at,expires_at)
select instrument_id,'1.2',locale,${quote(s.body)},${quote(sha(s.body))},'/account/documents',
'owner-confirmed-company-transition-2026-10-13',${quote(owner)},clock_timestamp(),clock_timestamp(),expires_at
from public.pilot_instrument_publications where id=${quote(p.id)};`,
    )
    .join("\n");
  const p = payment.predecessor,
    m = medical.predecessor;
  return `-- ${companyProfile.legalName}: approved copy only; owner deployment/readback required first.
begin isolation level repeatable read;
set local lock_timeout='3s';set local statement_timeout='20s';
lock table public.pilot_instrument_publications,intake_private.publications,commerce_private.order_publications in share row exclusive mode;
do $guard$ begin
if not exists(select 1 from supabase_migrations.schema_migrations where version='20261012232415')
 or not exists(select 1 from supabase_migrations.schema_migrations where version='20261012234348')
 or to_regprocedure('public.patient_acknowledge_collection_notice(jsonb,jsonb)') is null then raise exception 'PRESERVATION_MIGRATION_REQUIRED';end if;
if not exists(select 1 from public.subjects where id=${quote(owner)} and status='active') then raise exception 'APPROVER_UNAVAILABLE';end if;
${assertions}
if (select count(*) from public.pilot_instrument_publications where status='published' and locale='en-ZA' and instrument_id in('pilot-account-terms','pilot-privacy-notice'))<>2
 or exists(select 1 from public.pilot_instrument_publications where locale='en-ZA' and instrument_version='1.2' and instrument_id in('pilot-account-terms','pilot-privacy-notice')) then raise exception 'ACCOUNT_PUBLICATION_SCOPE_CHANGED';end if;
if not exists(select 1 from commerce_private.order_publications where id=${quote(p.id)} and tenant_id=${quote(tenant)} and status='published'
 and scenario='review_deposit' and content_hash=${quote(p.hash)} and expires_at>clock_timestamp())
 or (select count(*) from commerce_private.order_publications where tenant_id=${quote(tenant)} and status='published' and scenario='review_deposit')<>1 then raise exception 'COMMERCE_PREDECESSOR_CHANGED';end if;
if not exists(select 1 from intake_private.publications where id=${quote(m.id)} and tenant_id=${quote(tenant)} and status='published' and expires_at>clock_timestamp()
 and encode(extensions.digest(privacy_body,'sha256'),'hex')=${quote(sha(m.privacy))} and encode(extensions.digest(review_body,'sha256'),'hex')=${quote(sha(m.declaration))})
 or (select count(*) from intake_private.publications where tenant_id=${quote(tenant)} and status='published')<>1 then raise exception 'MEDICAL_PREDECESSOR_CHANGED';end if;
end $guard$;
${accountWrites}
-- Old commerce publication stays readable for actual accepted contracts. Fresh offers select the newer publication.
insert into commerce_private.order_publications(tenant_id,scenario,instrument_version,locale,supplier,body,content_hash,approval_reference,effective_at,expires_at,status)
select tenant_id,scenario,'1.1.0',locale,${quote(payment.successor.supplier)},${quote(payment.successor.body)},repeat('0',64),gen_random_uuid(),clock_timestamp(),expires_at,'published'
from commerce_private.order_publications where id=${quote(p.id)};
-- Keep the old publication active for its original episodes, never rewrite their encryption scope.
insert into intake_private.publications select (jsonb_populate_record(null::intake_private.publications,
to_jsonb(old)||jsonb_build_object('id',gen_random_uuid(),'privacy_body',${quote(medical.successor.privacy)},
'review_body',${quote(medical.successor.declaration)},'effective_at',clock_timestamp()))).*
from intake_private.publications old where id=${quote(m.id)};
commit;
`;
}
if (import.meta.main) {
  if (process.argv[2] !== "--sql")
    console.log(
      JSON.stringify({
        mode: "preparation-only",
        publishes: 0,
        sends: 0,
        charges: 0,
        deploymentRequired: true,
      }),
    );
  else {
    if (process.env.COMPANY_NOTICE_SQL_CONFIRM !== "prepare-only-owner-release-before-publication")
      throw Error("PREPARATION_CONFIRM_REQUIRED");
    process.stdout.write(
      buildCompanyPublicationSql(
        JSON.parse(readFileSync(".company-identity-publication.local", "utf8")),
      ),
    );
  }
}
