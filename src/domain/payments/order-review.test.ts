import { expect, it } from "vitest";
import { orderReviewFixture } from "@/test/order-review-fixture";
import { orderReviewCommandSchema, orderReviewResultSchema } from "./order-review";
it("accepts only explicit exact-order acceptance, never amounts or medical fields", () => {
  const r = orderReviewFixture();
  const command = {
    action: "accept",
    offerId: r.offerId,
    publicationId: r.terms.publicationId,
    snapshotHash: r.snapshotHash,
    contentHash: r.terms.contentHash,
    requestKey: r.offerId,
    accepted: true,
  };
  expect(orderReviewCommandSchema.safeParse(command).success).toBe(true);
  for (const extra of [
    { accepted: false },
    { accepted: undefined },
    { amountTotalMinor: 1 },
    { tenantId: r.offerId },
    { questionnaire: "private" },
  ])
    expect(orderReviewCommandSchema.safeParse({ ...command, ...extra }).success).toBe(false);
});
it("rejects provider and health data in the review projection", () => {
  const r = orderReviewFixture();
  expect(orderReviewResultSchema.safeParse({ review: r }).success).toBe(true);
  for (const extra of [
    { diagnosis: "private" },
    { checkoutUrl: "https://untrusted.invalid" },
    { providerPriceId: "price_unknown" },
  ])
    expect(orderReviewResultSchema.safeParse({ review: { ...r, ...extra } }).success).toBe(false);
});
