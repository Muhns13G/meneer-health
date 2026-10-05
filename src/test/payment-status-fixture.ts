import type { PaymentStatusPage } from "@/domain/payments/payment-status";
export function paymentStatusFixture(): PaymentStatusPage {
  return {
    payments: [
      {
        reference: "a4600000-0000-4000-8000-000000000001",
        scenario: "review_deposit",
        currency: "zar",
        amountTotalMinor: 99900,
        refundedMinor: 0,
        status: "confirmed",
        dispute: false,
        requiresReview: false,
        createdAt: "2026-10-05T12:00:00Z",
      },
    ],
    nextCursor: null,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}
