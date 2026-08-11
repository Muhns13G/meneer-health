import { z } from "zod";

import type { ContractDefinition } from "./catalogue";
import { opaqueIdentifierSchema, rfc3339TimestampSchema } from "./shared";

export const fulfilmentPartnerEventContract = {
  name: "fulfilment.partner",
  kind: "integration-message",
  owner: "Orders and fulfilment module",
  consumers: ["Server partner adapter", "Fulfilment reconciliation ledger"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const fulfilmentPartnerSchema = z.enum([
  "precise_wellness",
  "dispensing_pharmacy",
  "meneer_hub",
  "courier",
]);

export const fulfilmentPartnerEventTypeSchema = z.enum([
  "pathway.handoff.accepted",
  "pathway.handoff.rejected",
  "pharmacy.release.confirmed",
  "pharmacy.release.rejected",
  "hub.receipt.confirmed",
  "hub.receipt.rejected",
  "courier.dispatch.confirmed",
  "courier.delivery.confirmed",
  "courier.delivery.failed",
]);

export const verifiedFulfilmentPartnerEventSchema = z
  .object({
    contract: z.literal("fulfilment.partner"),
    version: z.literal(1),
    provider: fulfilmentPartnerSchema,
    environment: z.enum(["local", "preview", "production"]),
    externalEventId: opaqueIdentifierSchema,
    eventType: fulfilmentPartnerEventTypeSchema,
    workflowId: z.uuid(),
    providerReferenceDigest: z.string().regex(/^[a-f0-9]{64}$/),
    payloadFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    occurredAt: rfc3339TimestampSchema,
  })
  .strict()
  .superRefine((event, context) => {
    const expectedProvider = event.eventType.startsWith("pathway.")
      ? "precise_wellness"
      : event.eventType.startsWith("pharmacy.")
        ? "dispensing_pharmacy"
        : event.eventType.startsWith("hub.")
          ? "meneer_hub"
          : "courier";
    if (event.provider !== expectedProvider) {
      context.addIssue({
        code: "custom",
        message: "The event type does not belong to the declared provider boundary.",
      });
    }
  });

export const fulfilmentReconciliationCodeSchema = z.enum([
  "NONE",
  "PARTNER_GATE_DISABLED",
  "PREREQUISITES_NOT_MET",
  "CLINICAL_NOT_APPROVED",
  "PAYMENT_NOT_PAID",
  "PHARMACY_NOT_RELEASED",
  "HUB_NOT_RECEIVED",
  "CANCELLATION_BLOCKED",
  "REFUND_REQUIRED",
  "REFUND_FAILED",
  "DELIVERY_EXCEPTION",
]);

export const fulfilmentCaseSchema = z
  .object({
    fulfilmentId: z.uuid(),
    tenantId: z.uuid(),
    workflowId: z.uuid(),
    version: z.int().nonnegative(),
    pathwayHandoffState: z.enum(["not_started", "accepted", "rejected"]),
    pharmacyReleaseState: z.enum(["not_started", "released", "rejected"]),
    hubCustodyState: z.enum(["not_started", "received", "rejected"]),
    courierState: z.enum(["not_started", "dispatched", "delivered", "failed"]),
    reconciliationState: z.enum(["matched", "pending", "blocked"]),
    reconciliationCode: fulfilmentReconciliationCodeSchema,
    eligibleForFulfilmentAt: rfc3339TimestampSchema.optional(),
  })
  .strict();

export const fulfilmentPartnerEventResultSchema = z
  .object({
    fulfilment: fulfilmentCaseSchema,
    eventId: z.uuid(),
    replayed: z.boolean(),
    applied: z.boolean(),
  })
  .strict();

export type FulfilmentPartner = z.infer<typeof fulfilmentPartnerSchema>;
export type VerifiedFulfilmentPartnerEvent = z.infer<typeof verifiedFulfilmentPartnerEventSchema>;
export type FulfilmentCase = z.infer<typeof fulfilmentCaseSchema>;
export type FulfilmentPartnerEventResult = z.infer<typeof fulfilmentPartnerEventResultSchema>;
