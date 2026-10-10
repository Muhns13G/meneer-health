import { z } from "zod";

const line = z.object({ productId: z.uuid(), quantity: z.int().min(1).max(10) }).strict();
export const staffProductQuoteCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), caseId: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("prepare_draft"),
      caseId: z.uuid(),
      catalogueId: z.uuid(),
      expectedCaseVersion: z.int().min(1).max(999_999_999),
      expectedDraftVersion: z.int().min(0).max(999_999_999),
      deliveryQuoteId: z.uuid(),
      requestKey: z.uuid(),
      items: z
        .array(line)
        .min(1)
        .max(20)
        .refine((v) => new Set(v.map((i) => i.productId)).size === v.length),
    })
    .strict(),
]);
const money = z.int().min(0).max(100_000_000);
export const staffProductQuoteViewSchema = z
  .object({
    caseId: z.uuid(),
    caseVersion: z.int().positive(),
    tenantName: z.string().trim().min(1).max(160),
    catalogueId: z.uuid().nullable(),
    synthetic: z.boolean(),
    items: z
      .array(
        z
          .object({
            productId: z.uuid(),
            description: z.string().min(1).max(160),
            unitAmountMinor: money,
            maxQuantity: z.int().min(1).max(10),
            interested: z.boolean(),
          })
          .strict(),
      )
      .max(250),
    deliveries: z
      .array(
        z
          .object({ deliveryQuoteId: z.uuid(), addressSnapshotId: z.uuid(), amountMinor: money })
          .strict(),
      )
      .max(25),
    draft: z
      .object({
        draftId: z.uuid(),
        version: z.int().positive(),
        productSubtotalMinor: money,
        deliveryMinor: money,
        totalBeforeCreditMinor: money,
        items: z
          .array(line.extend({ description: z.string().min(1).max(160), unitAmountMinor: money }))
          .min(1)
          .max(20),
      })
      .strict()
      .nullable(),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((view, ctx) => {
    const duplicate = new Set(view.items.map((i) => i.productId)).size !== view.items.length;
    const draft = view.draft;
    if (
      duplicate ||
      (view.catalogueId === null && (view.items.length > 0 || view.deliveries.length > 0)) ||
      (draft &&
        (new Set(draft.items.map((i) => i.productId)).size !== draft.items.length ||
          draft.productSubtotalMinor !==
            draft.items.reduce((total, i) => total + i.unitAmountMinor * i.quantity, 0) ||
          draft.totalBeforeCreditMinor !== draft.productSubtotalMinor + draft.deliveryMinor))
    ) {
      ctx.addIssue({ code: "custom", message: "Inconsistent non-payable draft projection." });
    }
  });
export type StaffProductQuoteCommand = z.infer<typeof staffProductQuoteCommandSchema>;
export type StaffProductQuoteView = z.infer<typeof staffProductQuoteViewSchema>;
