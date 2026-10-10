import type { ProductQuoteIssueView } from "@/domain/payments/product-quote-issue";
export const quoteIssueFixtureId = "15600000-0000-4000-8000-000000000001";
export function productQuoteIssueFixture(): ProductQuoteIssueView {
  return {
    caseId: quoteIssueFixtureId,
    draftId: quoteIssueFixtureId,
    version: 1,
    tenantName: "Synthetic workspace",
    synthetic: true,
    canIssue: true,
    offerId: null,
    status: "not_issued",
    termsVersion: "1.0.0",
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  };
}
