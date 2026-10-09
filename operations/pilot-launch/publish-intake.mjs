// Owner-approved collection publication only: no clinical grants, transfer, sends or deployment.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { SQL } from "bun";

const tenant = "80000000-0000-4000-8000-000000000001";
const staff = {
  mansoer: "c72f29d8-a171-43bc-a942-47b07ce03246",
  tasneem: "6df7ac60-1192-4425-b86b-347cc7877bae",
  ziyaad: "8e090308-f15c-43ad-ba4c-f68b59324f20",
};
const text = readFileSync(
  new URL(
    "../../docs/02-implementation-plans/phase-02/annexures/pilot-client-terms-v1.md",
    import.meta.url,
  ),
  "utf8",
);
function section(start, end) {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error("INTAKE_TEXT_INVALID");
  return text.slice(from + start.length, to).trim();
}
const privacy = section("## B — Privacy Collection Notice", "## C — Questionnaire Acknowledgement");
const consent = section(
  "## C — Questionnaire Acknowledgement and Collection Consent",
  "## D — R999",
);
const catalogue = JSON.parse(
  readFileSync(new URL("../../content/medical-intake-catalogue.json", import.meta.url), "utf8"),
);
const hash = (body) => createHash("sha256").update(body).digest("hex");
const catalogueHash = hash(JSON.stringify(catalogue));
const acknowledgement = consent.slice(0, consent.indexOf("Collection consent:")).trim();
const review = consent
  .slice(consent.indexOf("Collection consent:"), consent.indexOf("Acknowledgement and affirmative"))
  .trim();
const privacyBody = privacy + "\n\n" + acknowledgement;
const proof = { catalogueHash, privacyHash: hash(privacyBody), reviewHash: hash(review) };
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ mode: "no-network-plan", ...proof, transferEnabled: false }));
} else {
  if (
    process.env.PILOT_INTAKE_PUBLICATION_CONFIRM !==
      "owner-reported-clinical-approval-collection-only" ||
    !process.env.SUPABASE_DB_URL?.includes("gibfpolrdjotwvewgfsz")
  ) {
    throw new Error("INTAKE_PUBLICATION_GUARD_REJECTED");
  }
  const db = new SQL(process.env.SUPABASE_DB_URL, { max: 1 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET LOCAL lock_timeout='5s'");
      await tx.unsafe("LOCK TABLE intake_private.publications IN SHARE ROW EXCLUSIVE MODE");
      const baseline = await tx.unsafe(`SELECT
        (SELECT count(*) FROM intake_private.publications)::int AS publications,
        (SELECT count(*) FROM intake_private.intakes)::int AS intakes,
        (SELECT count(*) FROM intake_private.access_grants)::int AS grants`);
      if (Object.values(baseline[0]).some((n) => n !== 0))
        throw new Error("INTAKE_BASELINE_CHANGED");
      for (const [name, id] of Object.entries(staff)) {
        const found = await tx.unsafe(
          `SELECT 1 FROM public.subjects s
          JOIN public.external_identities e ON e.subject_id=s.id
          JOIN auth.users u ON e.provider_subject=u.id::text
          WHERE s.id=$1 AND s.status='active' AND u.email=$2`,
          [id, `${name}@meneerhealth.co.za`],
        );
        if (found.length !== 1) throw new Error("REAL_STAFF_MAPPING_CHANGED");
      }
      const active = await tx.unsafe(
        "SELECT 1 FROM public.tenants WHERE id=$1 AND slug='meneer-pilot' AND status='active'",
        [tenant],
      );
      if (active.length !== 1) throw new Error("REAL_TENANT_CHANGED");
      const publicationId = randomUUID();
      const recipientReference = randomUUID();
      const guidanceVersion = randomUUID();
      await tx.unsafe(
        `INSERT INTO intake_private.publications
        (id,tenant_id,collection_version,control_version,catalogue_hash,privacy_body,review_body,
        recipient_reference,clinical_approver,privacy_approver,primary_responder,fallback_responder,
        acknowledgement_seconds,guidance_version,urgent_guidance,after_hours_guidance,
        effective_at,expires_at,status,transfer_notice)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$9,$11,86400,$12,
        'For urgent or life-threatening symptoms, seek immediate local emergency care. Do not wait for a portal, SMS or email response.',
        'This is not an emergency service. Ordinary enquiries are answered within 24 hours where possible; urgent symptoms require immediate local emergency care.',
        now(),now()+interval '30 days','published',NULL)`,
        [
          publicationId,
          tenant,
          catalogue.collectionVersion,
          catalogue.controlVersion,
          catalogueHash,
          privacyBody,
          review,
          recipientReference,
          staff.tasneem,
          staff.mansoer,
          staff.ziyaad,
          guidanceVersion,
        ],
      );
      if (process.argv.includes("--rollback")) throw new Error("INTAKE_ROLLBACK_ONLY");
      return {
        published: true,
        publicationId,
        recipientReference,
        guidanceVersion,
        ...proof,
        approvalBasis: "owner-reported-clinical-approval",
        clinicalGrantsCreated: 0,
        transferEnabled: false,
      };
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    if (error instanceof Error && error.message === "INTAKE_ROLLBACK_ONLY") {
      const rows = await db.unsafe("SELECT count(*)::int AS n FROM intake_private.publications");
      if (rows[0].n !== 0) throw new Error("INTAKE_ROLLBACK_BASELINE_CHANGED");
      console.log(JSON.stringify({ rollbackValidated: true, ...proof }));
    } else {
      console.error("INTAKE_PUBLICATION_FAILED; transaction rolled back.");
      process.exitCode = 1;
    }
  } finally {
    await db.close();
  }
}
