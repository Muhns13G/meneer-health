import { expect, it } from "vitest";
import { allocateRefund, refundCommandSchema, refundViewSchema } from "./refund";
const id = "a4700000-0000-4000-8000-000000000001";
const input = {
  reason: "no_review" as const,
  depositCaptured: 99900,
  depositRefunded: 0,
  depositReserved: 0,
  orderCaptured: 60100,
  orderRefunded: 0,
  orderReserved: 0,
  credit: 0,
  unusedDeposit: 0,
};
it("allocates only the unreserved original captures without an invented fee", () => {
  expect(allocateRefund(input)).toEqual({ deposit: 99900, order: 0 });
  expect(allocateRefund({ ...input, reason: "product_before_release", credit: 99900 })).toEqual({
    deposit: 99900,
    order: 60100,
  });
  expect(
    allocateRefund({ ...input, reason: "unused_deposit", credit: 80000, unusedDeposit: 19900 }),
  ).toEqual({ deposit: 19900, order: 0 });
  expect(allocateRefund({ ...input, depositReserved: 99900 })).toEqual({ deposit: 0, order: 0 });
});
it("keeps unresolved exceptions in review and rejects overlap/overflow", () => {
  for (const reason of ["no_show", "late_cancellation", "post_release"] as const)
    expect(allocateRefund({ ...input, reason })).toBeNull();
  for (const value of [NaN, 0.5, -1, 100000001])
    expect(() => allocateRefund({ ...input, depositCaptured: value })).toThrow();
  expect(() => allocateRefund({ ...input, credit: 1 })).toThrow();
  expect(() => allocateRefund({ ...input, depositReserved: 100000 })).toThrow();
});
it("rejects amounts, destinations, paid claims and unsupported browser commands", () => {
  expect(refundCommandSchema.parse({ action: "request", offerId: id, requestKey: id }).action).toBe(
    "request",
  );
  for (const field of ["amountMinor", "destination", "paid", "tenantId"])
    expect(
      refundCommandSchema.safeParse({ action: "request", offerId: id, requestKey: id, [field]: 1 })
        .success,
    ).toBe(false);
  expect(refundCommandSchema.safeParse({ action: "record", offerId: id }).success).toBe(false);
  expect(
    refundCommandSchema.safeParse({
      action: "review",
      offerId: id,
      requestKey: id,
      evidenceId: id,
      reason: "unused_deposit",
    }).success,
  ).toBe(false);
  expect(
    refundViewSchema.safeParse({
      requestState: "queued",
      refunds: [{ reference: id, amountMinor: 99900, state: "refunded" }],
      expiresAt: new Date().toISOString(),
    }).success,
  ).toBe(false);
});
