import { z } from "zod";

export const refundReasonSchema = z.enum([
  "no_review",
  "unsuitable",
  "expired_decision",
  "failed_handoff",
  "provider_unavailable",
  "product_before_release",
  "unused_deposit",
  "no_show",
  "late_cancellation",
  "post_release",
]);
export const refundCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request"), offerId: z.uuid(), requestKey: z.uuid() }).strict(),
  z.object({ action: z.literal("read"), offerId: z.uuid() }).strict(),
  z.object({ action: z.literal("reconcile"), offerId: z.uuid(), requestKey: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("retry"),
      offerId: z.uuid(),
      refundId: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("review"),
      offerId: z.uuid(),
      requestKey: z.uuid(),
      reason: refundReasonSchema.exclude(["unused_deposit"]),
      evidenceId: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("dispatch"),
      offerId: z.uuid(),
      refundId: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
]);
export const refundViewSchema = z
  .object({
    requestState: z.enum(["not_requested", "requested", "staff_review", "queued"]),
    refunds: z
      .array(
        z
          .object({
            reference: z.uuid(),
            amountMinor: z.int().positive().max(100_000_000),
            state: z.enum([
              "queued",
              "submitted",
              "pending",
              "uncertain",
              "failed",
              "confirmed",
              "failed_verified",
            ]),
          })
          .strict(),
      )
      .max(20),
    expiresAt: z.iso.datetime({ offset: true }),
    exceptions: z
      .array(
        z
          .object({
            reference: z.uuid(),
            code: z.string().max(40),
            state: z.enum(["pending", "resolved"]),
          })
          .strict(),
      )
      .max(20)
      .optional()
      .default([]),
  })
  .strict();
export type RefundView = z.infer<typeof refundViewSchema>;

// Original-method allocations are immutable; callers cannot supply new destinations or fees.
export function allocateRefund(input: {
  reason: z.infer<typeof refundReasonSchema>;
  depositCaptured: number;
  depositRefunded: number;
  depositReserved: number;
  orderCaptured: number;
  orderRefunded: number;
  orderReserved: number;
  credit: number;
  unusedDeposit: number;
}) {
  for (const value of Object.values(input).filter((value) => typeof value === "number"))
    if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000)
      throw new Error("REFUND_AMOUNT_INVALID");
  const depositAvailable = input.depositCaptured - input.depositRefunded - input.depositReserved;
  const orderAvailable = input.orderCaptured - input.orderRefunded - input.orderReserved;
  if (depositAvailable < 0 || orderAvailable < 0 || input.credit + input.unusedDeposit > 99900)
    throw new Error("REFUND_ALLOCATION_CONFLICT");
  if (["no_show", "late_cancellation", "post_release"].includes(input.reason)) return null;
  if (input.reason === "unused_deposit") {
    if (input.unusedDeposit > depositAvailable) throw new Error("REFUND_ALLOCATION_CONFLICT");
    return { deposit: input.unusedDeposit, order: 0 };
  }
  if (input.reason === "product_before_release") {
    if (input.credit > depositAvailable) throw new Error("REFUND_ALLOCATION_CONFLICT");
    return { deposit: input.credit, order: orderAvailable };
  }
  // A deposit allocated to an order cannot also be refunded as an unperformed review.
  if (input.credit || input.unusedDeposit) throw new Error("REFUND_ALLOCATION_CONFLICT");
  return { deposit: depositAvailable, order: 0 };
}
