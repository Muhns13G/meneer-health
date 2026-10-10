import { z } from "zod";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const minor = z.int().min(0).max(100_000_000);
export const orderReviewCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read") }).strict(),
  z.object({ action: z.literal("checkout"), offerId: z.uuid(), requestKey: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("decline"),
      offerId: z.uuid(),
      snapshotHash: hash,
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("accept"),
      offerId: z.uuid(),
      publicationId: z.uuid(),
      snapshotHash: hash,
      contentHash: hash,
      requestKey: z.uuid(),
      accepted: z.literal(true),
    })
    .strict(),
]);
export const orderReviewResultSchema = z
  .object({
    quoteOutcome: z.literal("declined").optional(),
    review: z
      .object({
        offerId: z.uuid(),
        scenario: z.enum(["review_deposit", "approved_product_order"]),
        currency: z.literal("zar"),
        lines: z
          .array(
            z
              .object({
                description: z.string().min(1).max(160),
                quantity: z.int().min(1).max(10),
                unitAmountMinor: minor,
                priceVersion: z.string().min(1).max(80),
                taxTreatment: z.literal("vat-inclusive-planning"),
              })
              .strict(),
          )
          .min(1)
          .max(20),
        productSubtotalMinor: minor,
        deliveryMinor: minor,
        creditMinor: minor,
        amountTotalMinor: minor,
        unusedDepositRefundMinor: minor,
        deliveryVersion: z.string().min(1).max(80).nullable(),
        snapshotHash: hash,
        expiresAt: z.iso.datetime({ offset: true }),
        terms: z
          .object({
            effectiveAt: z.iso.datetime({ offset: true }),
            publicationId: z.uuid(),
            version: z.string().regex(/^\d+\.\d+\.\d+$/),
            locale: z.literal("en-ZA"),
            supplier: z.string().min(1).max(1200),
            body: z.string().min(1).max(16000),
            contentHash: hash,
          })
          .strict(),
        acceptance: z
          .object({ receiptId: z.uuid(), recordedAt: z.iso.datetime({ offset: true }) })
          .strict()
          .nullable(),
        checkoutEnabled: z.boolean(),
        quoteCurrent: z.boolean().optional(),
        productProvenance: z.enum(["local-synthetic", "precise-wellness-rrp"]).optional(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type OrderReview = NonNullable<z.infer<typeof orderReviewResultSchema>["review"]>;
export const checkoutResultSchema = z
  .object({
    checkoutUrl: z.url().refine((value) => {
      const url = new URL(value);
      return url.origin === "https://checkout.stripe.com" && !url.username && !url.password;
    }),
  })
  .strict();
