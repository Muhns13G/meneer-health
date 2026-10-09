import { z } from "zod";
import { pilotOfferSelectionSchema } from "./pilot-commerce";

// Portable input boundaries only. Later routed commands must derive current authority,
// prices and independent clinical/supply evidence server-side; parsing grants no access.
export const productInterestCommandSchema = z
  .object({
    action: z.literal("register_interest"),
    productId: z.uuid(),
    requestKey: z.uuid(),
  })
  .strict();

export const productQuoteCommandSchema = z
  .object({
    action: z.literal("prepare_quote"),
    expectedCaseVersion: z.int().min(1),
    addressSnapshotId: z.uuid(),
    clinicalApprovalId: z.uuid(),
    selection: pilotOfferSelectionSchema.refine(
      (selection) => selection.scenario === "approved_product_order",
      "Product quotes cannot prepare a review deposit.",
    ),
  })
  .strict();

export type ProductInterestCommand = z.infer<typeof productInterestCommandSchema>;
export type ProductQuoteCommand = z.infer<typeof productQuoteCommandSchema>;
