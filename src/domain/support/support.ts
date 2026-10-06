import { z } from "zod";

export const supportPurposeSchema = z.enum(["privacy", "complaint", "clinical"]);
export type SupportPurpose = z.infer<typeof supportPurposeSchema>;
export const supportCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("read") }),
  z.strictObject({
    action: z.literal("request"),
    purpose: supportPurposeSchema,
    urgent: z.boolean(),
    requestKey: z.uuid(),
  }),
]);
export const supportViewSchema = z.strictObject({
  routes: z
    .array(z.strictObject({ purpose: supportPurposeSchema, available: z.boolean() }))
    .length(3)
    .refine((routes) => new Set(routes.map((route) => route.purpose)).size === 3),
  requests: z
    .array(
      z.strictObject({
        reference: z.uuid(),
        purpose: supportPurposeSchema,
        state: z.enum(["received", "acknowledged", "resolved", "escalated"]),
        recordedAt: z.iso.datetime({ offset: true }),
      }),
    )
    .max(20),
});
export const supportResultSchema = z.discriminatedUnion("outcome", [
  supportViewSchema.extend({ outcome: z.literal("view") }).strict(),
  z.strictObject({ outcome: z.literal("received"), reference: z.uuid() }),
  z.strictObject({ outcome: z.literal("unavailable") }),
  z.strictObject({ outcome: z.literal("emergency") }),
]);
export const staffSupportCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("read") }),
  z.strictObject({
    action: z.enum(["acknowledged", "resolved"]),
    reference: z.uuid(),
    requestKey: z.uuid(),
  }),
]);
export const supportLabels = Object.freeze({
  privacy: "Privacy and data requests",
  complaint: "Service and commercial complaints",
  clinical: "Clinical and adverse-event support",
});
