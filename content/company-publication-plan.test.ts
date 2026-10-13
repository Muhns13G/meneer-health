import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildCompanyPublicationSql } from "../operations/pilot-launch/prepare-company-publication-sql.mjs";
import { replacePilotCompanyIdentity } from "./company-notice-transition";

const body =
  "Synthetic only: OCTOTHORP ZA, K2024185008, VAT number 9279262266, De Chatillon Cres - Onrus, 7201, South Africa";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function preview() {
  const rows = [
    { kind: "account", instrument: "pilot-account-terms", version: "1.1", body, hash: hash(body) },
    { kind: "account", instrument: "pilot-privacy-notice", version: "1.1", body, hash: hash(body) },
    {
      kind: "payment",
      instrument: "review_deposit",
      version: "1.0.0",
      body,
      supplier: body,
      hash: "a".repeat(64),
    },
    {
      kind: "intake",
      instrument: "medical-intake",
      version: "1.1.0",
      privacy: body,
      declaration: body,
    },
  ];
  return {
    stage: "read-only-preview-not-published",
    publications: rows.map((row, index) => {
      const successor =
        row.kind === "intake"
          ? {
              privacy: replacePilotCompanyIdentity(body),
              declaration: replacePilotCompanyIdentity(body),
            }
          : {
              body: replacePilotCompanyIdentity(body),
              ...(row.kind === "payment" ? { supplier: replacePilotCompanyIdentity(body) } : {}),
            };
      return {
        predecessor: { ...row, id: `ee000000-0000-4000-8000-00000000000${index + 1}` },
        successor,
        successorHashes: Object.fromEntries(
          Object.entries(successor).map(([key, value]) => [key, hash(value)]),
        ),
      };
    }),
  };
}
it("prepares one guarded transaction without rewriting client or historical financial/medical records", () => {
  const sql = buildCompanyPublicationSql(preview());
  expect(sql).toContain("PRESERVATION_MIGRATION_REQUIRED");
  expect(sql).toContain("ACCOUNT_PREDECESSOR_CHANGED");
  expect(sql).toContain("COMMERCE_PREDECESSOR_CHANGED");
  expect(sql).toContain("MEDICAL_PREDECESSOR_CHANGED");
  expect(sql).toContain("Meneer Health (Pty) Ltd");
  expect(sql).not.toMatch(/9279262266|VAT number|De Chatillon/);
  expect(sql).not.toMatch(
    /(?:update|delete from) (?:intake_private|commerce_private|auth|public\.client_profiles|public\.pilot_instrument_receipts)/i,
  );
  expect(sql).toContain("'1.2'");
  expect(sql).toContain("'1.1.0'");
  // published_at defaults to transaction time; approval must not be later than publication.
  expect(sql).toContain("transaction_timestamp(),transaction_timestamp(),expires_at");
  expect(sql.trim()).toMatch(/commit;$/);
});
it("rejects altered successor text even when its hash is refreshed", () => {
  const value = preview();
  const row = value.publications[0];
  if (!("body" in row.successor) || !row.successor.body) throw Error("TEST_BODY_REQUIRED");
  row.successor.body += " Invented fee";
  row.successorHashes.body = hash(row.successor.body);
  expect(() => buildCompanyPublicationSql(value)).toThrow("SUCCESSOR_COPY_CHANGED");
});
it("rejects an already published preview and unexpected predecessor version", () => {
  expect(() => buildCompanyPublicationSql({ ...preview(), stage: "published" })).toThrow(
    "PUBLICATION_PREVIEW_INVALID",
  );
  const value = preview();
  value.publications[2].predecessor.version = "2.0.0";
  expect(() => buildCompanyPublicationSql(value)).toThrow("PUBLICATION_SCOPE_CHANGED");
});
