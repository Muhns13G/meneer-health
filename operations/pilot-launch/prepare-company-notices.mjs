// Read-only predecessor inventory and successor copy. Never publishes or changes a receipt.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { companyProfile } from "../../content/company-profile.ts";
import { replacePilotCompanyIdentity } from "../../content/company-notice-transition.ts";

if (process.argv[2] !== "--inspect") {
  console.log(
    JSON.stringify({
      mode: "no-network-plan",
      operator: companyProfile.legalName,
      registration: companyProfile.registrationNumber,
      vatDisclosed: false,
      publishes: false,
      sends: 0,
      charges: 0,
    }),
  );
  process.exit(0);
}
if (
  process.env.CI ||
  process.env.COMPANY_NOTICE_INSPECT_CONFIRM !== "read-only-predecessors-new-company-no-publication"
)
  throw Error("READ_ONLY_SCOPE_REQUIRED");
const token = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
const query = `select jsonb_build_object('kind','account','id',id,'instrument',instrument_id,'version',instrument_version,'body',document_body,'hash',content_sha256) as predecessor from public.pilot_instrument_publications where status='published' and locale='en-ZA' and instrument_id in('pilot-account-terms','pilot-privacy-notice')
union all select jsonb_build_object('kind','payment','id',id,'instrument',scenario,'version',instrument_version,'body',body,'hash',content_hash,'supplier',supplier,'hashValid',content_hash=encode(extensions.digest(convert_to(jsonb_build_object('version',instrument_version,'locale',locale,'supplier',supplier,'body',body)::text,'UTF8'),'sha256'),'hex')) from commerce_private.order_publications where tenant_id='80000000-0000-4000-8000-000000000001' and status='published' and scenario='review_deposit'
union all select jsonb_build_object('kind','intake','id',id,'instrument','medical-intake','version',collection_version,'privacy',privacy_body,'declaration',review_body) from intake_private.publications where tenant_id='80000000-0000-4000-8000-000000000001' and status='published';`;
const r = await fetch("https://api.supabase.com/v1/projects/gibfpolrdjotwvewgfsz/database/query", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: true }),
  signal: AbortSignal.timeout(30000),
});
if (!r.ok) throw Error("PREDECESSOR_READ_FAILED");
const rows = await r.json();
if (
  rows.filter((x) => x.predecessor.kind === "account").length !== 2 ||
  rows.filter((x) => x.predecessor.kind === "payment").length !== 1 ||
  rows.filter((x) => x.predecessor.kind === "intake").length !== 1
)
  throw Error("PREDECESSOR_INVENTORY_CHANGED");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const preview = rows.map(({ predecessor: p }) => {
  if (p.kind === "payment" ? p.hashValid !== true : p.body && hash(p.body) !== p.hash)
    throw Error("PREDECESSOR_HASH_MISMATCH");
  const next =
    p.kind === "intake"
      ? {
          privacy: replacePilotCompanyIdentity(p.privacy),
          declaration: replacePilotCompanyIdentity(p.declaration),
        }
      : {
          body: replacePilotCompanyIdentity(p.body),
          ...(p.supplier ? { supplier: replacePilotCompanyIdentity(p.supplier) } : {}),
        };
  return {
    predecessor: p,
    proposedVersion:
      p.kind === "account"
        ? "1.2"
        : p.kind === "payment"
          ? "1.1.0"
          : "new-publication-same-question-catalogue",
    successor: next,
    successorHashes: Object.fromEntries(
      Object.entries(next).map(([key, value]) => [key, hash(value)]),
    ),
  };
});
writeFileSync(
  ".company-identity-publication.local",
  JSON.stringify(
    {
      stage: "read-only-preview-not-published",
      operator: companyProfile,
      preparedAt: new Date().toISOString(),
      publications: preview,
      existingReceiptTransition: "genuine-reacknowledgement-required-no-blanket-compatibility",
      publishes: 0,
      sends: 0,
      charges: 0,
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    stage: "successor-preview-prepared-not-published",
    instruments: preview.map((p) => ({
      kind: p.predecessor.kind,
      version: p.predecessor.version,
      proposedVersion: p.proposedVersion,
      hashes: p.successorHashes,
    })),
    oldReceiptsChanged: 0,
    vatDisclosed: false,
    sends: 0,
    charges: 0,
  }),
);
