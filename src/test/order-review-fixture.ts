import type { OrderReview } from "@/domain/payments/order-review";
export function orderReviewFixture(): OrderReview {
  return {
    offerId: "a2100000-0000-4000-8000-000000000001",
    scenario: "review_deposit",
    currency: "zar",
    lines: [
      {
        description: "Synthetic review deposit",
        quantity: 1,
        unitAmountMinor: 99900,
        priceVersion: "pilot-review-deposit-v1",
        taxTreatment: "vat-inclusive-planning",
      },
    ],
    productSubtotalMinor: 0,
    deliveryMinor: 0,
    creditMinor: 0,
    amountTotalMinor: 99900,
    unusedDepositRefundMinor: 0,
    deliveryVersion: null,
    snapshotHash: "a".repeat(64),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    terms: {
      effectiveAt: "2026-10-01T00:00:00Z",
      publicationId: "a2100000-0000-4000-8000-000000000002",
      version: "1.1.0",
      locale: "en-ZA",
      supplier: "Synthetic supplier — test-only",
      body: "Synthetic order terms only. No clinical or supply guarantee.",
      contentHash: "b".repeat(64),
    },
    acceptance: null,
    checkoutEnabled: false,
  };
}
