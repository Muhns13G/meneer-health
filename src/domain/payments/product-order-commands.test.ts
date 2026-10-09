import { expect, it } from "vitest";
import { productInterestCommandSchema, productQuoteCommandSchema } from "./product-order-commands";

const id = "15000000-0000-4000-8000-000000000001";
const quote = {
  action: "prepare_quote",
  expectedCaseVersion: 1,
  addressSnapshotId: id,
  clinicalApprovalId: id,
  selection: {
    caseId: id,
    scenario: "approved_product_order",
    items: [{ priceId: id, quantity: 1 }],
    deliveryQuoteId: id,
    requestKey: id,
  },
};

it("accepts reference-only interest without creating an order or authority", () => {
  expect(
    productInterestCommandSchema.parse({
      action: "register_interest",
      productId: id,
      requestKey: id,
    }),
  ).toEqual({ action: "register_interest", productId: id, requestKey: id });
});

it("requires a product quote with versioned case and address/clinical references", () => {
  expect(productQuoteCommandSchema.parse(quote)).toEqual(quote);
  for (const field of ["addressSnapshotId", "clinicalApprovalId", "expectedCaseVersion"] as const) {
    expect(productQuoteCommandSchema.safeParse({ ...quote, [field]: undefined }).success).toBe(
      false,
    );
  }
});

it.each([
  "tenantId",
  "subjectId",
  "paid",
  "clinicalApproved",
  "amountTotalMinor",
  "providerPriceId",
])("rejects caller-injected %s authority or monetary fields", (field) => {
  expect(productQuoteCommandSchema.safeParse({ ...quote, [field]: id }).success).toBe(false);
  expect(
    productInterestCommandSchema.safeParse({
      action: "register_interest",
      productId: id,
      requestKey: id,
      [field]: id,
    }).success,
  ).toBe(false);
});

it("rejects deposits, missing delivery, duplicate items and caller prices", () => {
  for (const selection of [
    { ...quote.selection, scenario: "review_deposit", items: [], deliveryQuoteId: undefined },
    { ...quote.selection, deliveryQuoteId: undefined },
    { ...quote.selection, items: [...quote.selection.items, ...quote.selection.items] },
    { ...quote.selection, items: [{ priceId: id, quantity: 1, unitAmountMinor: 1 }] },
  ])
    expect(productQuoteCommandSchema.safeParse({ ...quote, selection }).success).toBe(false);
});

it.each([0, -1, 0.5, 11])("rejects invalid quantity %s", (quantity) => {
  expect(
    productQuoteCommandSchema.safeParse({
      ...quote,
      selection: { ...quote.selection, items: [{ priceId: id, quantity }] },
    }).success,
  ).toBe(false);
});

it("rejects invalid references and fractional case versions", () => {
  expect(productQuoteCommandSchema.safeParse({ ...quote, expectedCaseVersion: 1.5 }).success).toBe(
    false,
  );
  expect(
    productQuoteCommandSchema.safeParse({ ...quote, clinicalApprovalId: "approved" }).success,
  ).toBe(false);
  expect(
    productInterestCommandSchema.safeParse({
      action: "register_interest",
      productId: id,
      requestKey: "retry",
    }).success,
  ).toBe(false);
});
