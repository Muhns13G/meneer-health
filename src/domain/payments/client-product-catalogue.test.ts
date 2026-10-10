import { expect, it } from "vitest";
import { clientCatalogueViewSchema, clientProductCommandSchema } from "./client-product-catalogue";
import { clientProductsFixture } from "@/test/client-products-fixture";
it("allows only minimum customer projection and exact-version interest", () => {
  const v = clientProductsFixture();
  expect(clientCatalogueViewSchema.safeParse(v).success).toBe(true);
  expect(
    clientProductCommandSchema.safeParse({
      action: "register_interest",
      catalogueId: v.catalogueId,
      productId: v.items[0]!.productId,
      requestKey: v.catalogueId,
    }).success,
  ).toBe(true);
  expect(
    clientProductCommandSchema.safeParse({
      action: "register_interest",
      productId: v.items[0]!.productId,
      requestKey: v.catalogueId,
    }).success,
  ).toBe(false);
});
it.each(["wholesaleCost", "tenantId", "approvalReference", "sourceFingerprint"])(
  "rejects private %s fields",
  (field) => {
    expect(
      clientCatalogueViewSchema.safeParse({ ...clientProductsFixture(), [field]: "private" })
        .success,
    ).toBe(false);
    expect(
      clientProductCommandSchema.safeParse({ action: "read", [field]: "private" }).success,
    ).toBe(false);
  },
);
it("rejects inconsistent empty/duplicate projections", () => {
  const v = clientProductsFixture();
  expect(clientCatalogueViewSchema.safeParse({ ...v, catalogueId: null }).success).toBe(false);
  expect(
    clientCatalogueViewSchema.safeParse({ ...v, items: [...v.items, ...v.items] }).success,
  ).toBe(false);
});
