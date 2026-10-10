import { describe, expect, it } from "vitest";
import { staffProductQuoteCommandSchema, staffProductQuoteViewSchema } from "./staff-product-quote";
import { staffQuoteFixture, quoteFixtureId as id } from "@/test/staff-product-quote-fixture";
const draft = {
  action: "prepare_draft",
  caseId: id,
  catalogueId: id,
  deliveryQuoteId: id,
  expectedCaseVersion: 1,
  expectedDraftVersion: 0,
  requestKey: id,
  items: [{ productId: id, quantity: 1 }],
};
describe("non-payable quote boundaries", () => {
  it("accepts bounded opaque references", () => {
    expect(staffProductQuoteCommandSchema.parse(draft)).toEqual(draft);
  });
  it.each([
    "paid",
    "tenantId",
    "subjectId",
    "amountTotalMinor",
    "clinicalApproved",
    "addressConfirmed",
  ])("rejects %s", (field) => {
    expect(staffProductQuoteCommandSchema.safeParse({ ...draft, [field]: true }).success).toBe(
      false,
    );
  });
  it.each([0, -1, 1.5, 11])("rejects quantity %s", (quantity) => {
    expect(
      staffProductQuoteCommandSchema.safeParse({ ...draft, items: [{ productId: id, quantity }] })
        .success,
    ).toBe(false);
  });
  it("rejects duplicate products and an issued DTO", () => {
    expect(
      staffProductQuoteCommandSchema.safeParse({
        ...draft,
        items: [...draft.items, ...draft.items],
      }).success,
    ).toBe(false);
    expect(
      staffProductQuoteViewSchema.safeParse({ ...staffQuoteFixture(), approved: true }).success,
    ).toBe(false);
  });
  it("accepts the minimum private view", () => {
    expect(staffProductQuoteViewSchema.parse(staffQuoteFixture()).draft).toBeNull();
  });
});
