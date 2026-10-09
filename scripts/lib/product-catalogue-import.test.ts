import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  assertLocalCatalogueImport,
  catalogueImportSql,
  validateCatalogueImport,
} from "./product-catalogue-import";

const source = new TextEncoder().encode("Synthetic non-medical source only");
const id = "15020000-0000-4000-8000-000000000001";
const manifest = {
  id,
  tenantId: id,
  version: "synthetic-v1",
  provenance: "local-synthetic",
  sourceFingerprint: createHash("sha256").update(source).digest("hex"),
  approvalReference: id,
  importedBy: id,
  reviewedBy: "15020000-0000-4000-8000-000000000002",
  currency: "zar",
  taxTreatment: "vat-inclusive-planning",
  effectiveAt: "2026-01-01T00:00:00Z",
  expiresAt: "2027-01-01T00:00:00Z",
  items: [
    {
      productId: id,
      sku: "synthetic-item",
      description: "Synthetic item",
      unitAmountMinor: 10000,
      maxQuantity: 2,
    },
  ],
};
it("verifies source bytes before accepting customer-only manifest", () => {
  expect(validateCatalogueImport(manifest, source)).toEqual(manifest);
  expect(() => validateCatalogueImport(manifest, new Uint8Array([1]))).toThrow(
    "CATALOGUE_SOURCE_MISMATCH",
  );
  expect(() => validateCatalogueImport({ ...manifest, wholesaleCost: "private" }, source)).toThrow(
    "CATALOGUE_MANIFEST_INVALID",
  );
});
it("quotes SQL literals without allowing product description injection", () => {
  const sql = catalogueImportSql({
    ...manifest,
    items: [{ ...manifest.items[0], description: "Synthetic ' quote" }],
  });
  expect(sql).toContain("Synthetic '' quote");
  expect(sql).toMatch(/^select commerce_private\.import_catalogue\('/);
  expect(sql).not.toContain("security definer");
});
it("restricts actual execution to no-provider synthetic local scope", () => {
  expect(() => assertLocalCatalogueImport({}, "local-synthetic")).not.toThrow();
  expect(() => assertLocalCatalogueImport({}, "precise-wellness-rrp")).toThrow();
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_DB_URL",
    "POSTGRES_URL",
    "DATABASE_URL",
    "PGHOST",
    "STRIPE_RESTRICTED_KEY",
    "R2_SECRET_ACCESS_KEY",
  ])
    expect(() =>
      assertLocalCatalogueImport({ [name]: "synthetic-hosted-value" }, "local-synthetic"),
    ).toThrow("CATALOGUE_LOCAL_IMPORT_GUARD_REJECTED");
});
