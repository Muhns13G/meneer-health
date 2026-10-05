import { z } from "zod";

export const paymentCursorSchema = z
  .object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() })
  .strict();
export const paymentStatusRequestSchema = z
  .object({ cursor: paymentCursorSchema.nullable(), caseId: z.uuid().optional() })
  .strict();
export const paymentStatusPageSchema = z
  .object({
    payments: z
      .array(
        z
          .object({
            reference: z.uuid(),
            scenario: z.enum(["review_deposit", "approved_product_order"]),
            currency: z.literal("zar"),
            amountTotalMinor: z.int().min(0).max(100_000_000),
            refundedMinor: z.int().min(0).max(100_000_000),
            status: z.enum([
              "not_started",
              "pending",
              "confirmed",
              "not_required",
              "failed",
              "expired",
            ]),
            dispute: z.boolean(),
            requiresReview: z.boolean(),
            createdAt: z.iso.datetime({ offset: true }),
          })
          .strict()
          .refine((value) => value.status !== "confirmed" || value.amountTotalMinor > 0)
          .refine((value) => value.status !== "not_required" || value.amountTotalMinor === 0)
          .refine((value) => value.refundedMinor <= value.amountTotalMinor),
      )
      .max(25),
    nextCursor: paymentCursorSchema.nullable(),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type PaymentStatusPage = z.infer<typeof paymentStatusPageSchema>;
