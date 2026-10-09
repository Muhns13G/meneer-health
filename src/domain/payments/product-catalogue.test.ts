import { expect, it } from "vitest";
import {
  catalogueImportSchema,
  preciseWellnessScheduleHash,
  shippingAddressSchema,
} from "./product-catalogue";

export const syntheticCatalogueManifest = {
  id: "15020000-0000-4000-8000-000000000001",
  tenantId: "10000000-0000-4000-8000-000000000001",
  version: "synthetic-v1",
  provenance: "local-synthetic",
  sourceFingerprint: "a".repeat(64),
  approvalReference: "15020000-0000-4000-8000-000000000002",
  importedBy: "20000000-0000-4000-8000-000000000001",
  reviewedBy: "20000000-0000-4000-8000-000000000002",
  currency: "zar",
  taxTreatment: "vat-inclusive-planning",
  effectiveAt: "2026-01-01T00:00:00Z",
  expiresAt: "2027-01-01T00:00:00Z",
  items: [
    {
      productId: "15020000-0000-4000-8000-000000000003",
      sku: "synthetic-item",
      description: "Synthetic non-medical item",
      unitAmountMinor: 150000,
      maxQuantity: 2,
    },
  ],
};
it("accepts bounded customer RRP preparation, not automatic product release", () => {
  expect(catalogueImportSchema.parse(syntheticCatalogueManifest).items).toHaveLength(1);
});
it("requires the recorded real schedule hash and independent review", () => {
  expect(
    catalogueImportSchema.safeParse({
      ...syntheticCatalogueManifest,
      provenance: "precise-wellness-rrp",
    }).success,
  ).toBe(false);
  expect(
    catalogueImportSchema.safeParse({
      ...syntheticCatalogueManifest,
      provenance: "precise-wellness-rrp",
      sourceFingerprint: preciseWellnessScheduleHash,
    }).success,
  ).toBe(true);
  expect(
    catalogueImportSchema.safeParse({
      ...syntheticCatalogueManifest,
      reviewedBy: syntheticCatalogueManifest.importedBy,
    }).success,
  ).toBe(false);
});
it.each(["wholesaleCost", "practitionerPrice", "medicalClaims", "providerPriceId"])(
  "rejects private/unreviewed %s fields",
  (field) => {
    expect(
      catalogueImportSchema.safeParse({ ...syntheticCatalogueManifest, [field]: 1 }).success,
    ).toBe(false);
    expect(
      catalogueImportSchema.safeParse({
        ...syntheticCatalogueManifest,
        items: [{ ...syntheticCatalogueManifest.items[0], [field]: 1 }],
      }).success,
    ).toBe(false);
  },
);
it("rejects duplicate IDs/SKUs, empty/oversized imports and invalid validity", () => {
  for (const change of [
    { items: [] },
    { items: Array(251).fill(syntheticCatalogueManifest.items[0]) },
    { items: [...syntheticCatalogueManifest.items, ...syntheticCatalogueManifest.items] },
    { expiresAt: syntheticCatalogueManifest.effectiveAt },
  ])
    expect(
      catalogueImportSchema.safeParse({ ...syntheticCatalogueManifest, ...change }).success,
    ).toBe(false);
});
it.each([0, -1, 1.5, 100000001])("rejects invalid price %s", (unitAmountMinor) => {
  expect(
    catalogueImportSchema.safeParse({
      ...syntheticCatalogueManifest,
      items: [{ ...syntheticCatalogueManifest.items[0], unitAmountMinor }],
    }).success,
  ).toBe(false);
});
it("requires an actual shipping address without clinical/contact extras", () => {
  const address = {
    recipient: "Synthetic client",
    line1: "1 Example Road",
    locality: "Synthetic town",
    province: "Western Cape",
    postalCode: "7201",
    country: "ZA",
  };
  expect(shippingAddressSchema.parse(address)).toEqual(address);
  for (const change of [
    { postalCode: "mail@example.invalid" },
    { country: "US" },
    { diagnosis: "none" },
    { line1: " " },
  ])
    expect(shippingAddressSchema.safeParse({ ...address, ...change }).success).toBe(false);
});
