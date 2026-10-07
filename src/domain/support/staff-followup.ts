import { z } from "zod";
import { notificationTemplateSchema } from "@/application/notifications/transactional-notifications";
import { supportPurposeSchema, supportViewSchema } from "./support";

export const notificationReviewReasons = {
  acknowledged: "review_started",
  resolved: "secure_followup_completed",
  resend: "confirmed_non_acceptance",
} as const;
export const staffFollowupCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("read") }),
  ...(["acknowledged", "resolved", "resend"] as const).map((action) =>
    z.strictObject({
      action: z.literal(action),
      reference: z.uuid(),
      requestKey: z.uuid(),
      reason: z.literal(notificationReviewReasons[action]),
    }),
  ),
]);
export type StaffFollowupCommand = z.infer<typeof staffFollowupCommandSchema>;
export const staffFollowupViewSchema = z.strictObject({
  cases: z
    .array(supportViewSchema.shape.requests.element.extend({ canRespond: z.boolean() }).strict())
    .max(20),
  notifications: z
    .array(
      z.strictObject({
        reference: z.uuid(),
        template: notificationTemplateSchema,
        state: z.enum([
          "pending",
          "leased",
          "accepted",
          "delivered",
          "retryable",
          "failed",
          "uncertain",
          "suppressed",
          "deferred",
          "delivery_failed",
        ]),
        reason: z
          .enum([
            "RECIPIENT_UNAVAILABLE",
            "CHANNEL_UNAVAILABLE",
            "AUTHORITY_CHANGED",
            "CONTACT_CHANGED",
            "SUPPRESSED",
            "BUDGET_EXHAUSTED",
            "ATTEMPTS_EXHAUSTED",
            "TRANSPORT_FAILED",
            "TRANSPORT_UNCERTAIN",
          ])
          .nullable(),
        recordedAt: z.iso.datetime({ offset: true }),
        reviewState: z.enum(["unreviewed", "acknowledged", "resolved"]),
        canResend: z.boolean(),
      }),
    )
    .max(20),
  coverage: z
    .array(
      z.strictObject({
        reference: z.uuid().nullable(),
        purpose: supportPurposeSchema,
        reason: z.literal("coverage_unavailable"),
      }),
    )
    .max(20),
});
export type StaffFollowupView = z.infer<typeof staffFollowupViewSchema>;
