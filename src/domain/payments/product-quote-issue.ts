import { z } from "zod";
export const productQuoteIssueCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), caseId: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("issue"),
      caseId: z.uuid(),
      draftId: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
]);
export const productQuoteIssueViewSchema = z
  .object({
    caseId: z.uuid(),
    draftId: z.uuid().nullable(),
    version: z.int().nonnegative(),
    tenantName: z.string().min(1).max(160),
    synthetic: z.boolean(),
    canIssue: z.boolean(),
    offerId: z.uuid().nullable(),
    status: z.enum(["draft_missing", "not_issued", "issued", "declined", "needs_review"]),
    termsVersion: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .nullable(),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type ProductQuoteIssueView = z.infer<typeof productQuoteIssueViewSchema>;
