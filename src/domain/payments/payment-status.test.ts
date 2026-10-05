import { expect, it } from "vitest";
import { paymentStatusPageSchema } from "./payment-status";
import { paymentStatusFixture } from "@/test/payment-status-fixture";
it("rejects invented currency, provider fields, zero paid and positive free-payment facts", () => {
  const fixture = paymentStatusFixture();
  for (const overrides of [
    { currency: "usd" },
    { sessionId: "cs_test_private" },
    { amountTotalMinor: 0 },
    { status: "not_required" },
    { refundedMinor: 100000 },
  ]) {
    expect(
      paymentStatusPageSchema.safeParse({
        ...fixture,
        payments: [{ ...fixture.payments[0], ...overrides }],
      }).success,
    ).toBe(false);
  }
});
it("allows zero-payment and cumulative refund/dispute facts without erasing original capture", () => {
  const fixture = paymentStatusFixture();
  expect(
    paymentStatusPageSchema.safeParse({
      ...fixture,
      payments: [{ ...fixture.payments[0], status: "not_required", amountTotalMinor: 0 }],
    }).success,
  ).toBe(true);
  expect(
    paymentStatusPageSchema.safeParse({
      ...fixture,
      payments: [
        { ...fixture.payments[0], refundedMinor: 99900, requiresReview: true, dispute: true },
      ],
    }).success,
  ).toBe(true);
});
