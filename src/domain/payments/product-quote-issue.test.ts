import { expect, it } from "vitest";
import { productQuoteIssueCommandSchema } from "./product-quote-issue";
const id = "15600000-0000-4000-8000-000000000001";
it("takes only exact opaque draft and request references", () => {
  expect(
    productQuoteIssueCommandSchema.parse({
      action: "issue",
      caseId: id,
      draftId: id,
      requestKey: id,
    }),
  ).toEqual({ action: "issue", caseId: id, draftId: id, requestKey: id });
});
it.each([
  "paid",
  "approved",
  "amountTotalMinor",
  "tenantId",
  "subjectId",
  "items",
  "clinicalApprovalId",
])("rejects caller %s", (key) => {
  expect(
    productQuoteIssueCommandSchema.safeParse({
      action: "issue",
      caseId: id,
      draftId: id,
      requestKey: id,
      [key]: true,
    }).success,
  ).toBe(false);
});
