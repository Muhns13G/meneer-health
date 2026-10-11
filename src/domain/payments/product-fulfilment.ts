import { z } from "zod";

export const productFulfilmentSteps = [
  "provider_ordered",
  "pharmacy_released",
  "hub_received",
  "courier_dispatched",
  "delivered",
] as const;
export const productFulfilmentCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), caseId: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("record"),
      caseId: z.uuid(),
      offerId: z.uuid(),
      expectedVersion: z.int().nonnegative(),
      event: z.enum([...productFulfilmentSteps, "exception", "exception_resolved"]),
      evidenceReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
]);
export const productFulfilmentViewSchema = z
  .object({
    caseId: z.uuid(),
    offerId: z.uuid().nullable(),
    version: z.int().nonnegative(),
    tenantName: z.string().min(1).max(160),
    synthetic: z.boolean(),
    stage: z.enum(["not_started", ...productFulfilmentSteps]),
    exception: z.boolean(),
    nextEvent: z.enum(productFulfilmentSteps).nullable(),
    canAdvance: z.boolean(),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((view, context) => {
    const next =
      productFulfilmentSteps[
        view.stage === "not_started" ? 0 : productFulfilmentSteps.indexOf(view.stage) + 1
      ] ?? null;
    if (
      view.nextEvent !== next ||
      (view.canAdvance && (!view.offerId || !next || view.exception)) ||
      (!view.offerId && (view.version !== 0 || view.stage !== "not_started" || view.exception))
    ) {
      context.addIssue({ code: "custom", message: "Inconsistent fulfilment projection." });
    }
  });
export const clientFulfilmentViewSchema = z
  .object({
    progress: z.enum([
      "not_started",
      "preparing",
      "received",
      "dispatched",
      "delivered",
      "needs_review",
    ]),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const clientFulfilmentRequestSchema = z.object({}).strict();
export type ProductFulfilmentView = z.infer<typeof productFulfilmentViewSchema>;

export function nextProductFulfilmentStep(stage: ProductFulfilmentView["stage"]) {
  return (
    productFulfilmentSteps[
      stage === "not_started" ? 0 : productFulfilmentSteps.indexOf(stage) + 1
    ] ?? null
  );
}
