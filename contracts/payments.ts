import { z } from "zod";

import type { ContractDefinition } from "./catalogue";
import { commandEnvelopeSchema } from "./envelopes";
import { opaqueIdentifierSchema, rfc3339TimestampSchema } from "./shared";

export const paymentCheckoutContract = {
  name: "payment.checkout",
  kind: "command",
  owner: "Commerce and payments module",
  consumers: ["Server checkout service", "Stripe Checkout adapter"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const paymentProviderEventContract = {
  name: "payment.provider",
  kind: "integration-message",
  owner: "Commerce and payments module",
  consumers: ["Signed Stripe webhook service", "payment reconciliation ledger"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const chargeScenarioSchema = z.enum(["consultation_only", "medication_delivery", "bundle"]);

export const paymentLineTypeSchema = z.enum([
  "consultation",
  "medication",
  "delivery",
  "discount",
  "adjustment",
]);

export const paymentCheckoutCommandSchema = commandEnvelopeSchema.extend({
  contract: z.literal("payment.checkout"),
  version: z.literal(1),
  actor: z.object({ type: z.literal("patient"), id: z.uuid() }).strict(),
  subjectId: z.uuid(),
  payload: z
    .object({
      workflowId: z.uuid(),
      scenario: chargeScenarioSchema,
    })
    .strict(),
});

export const paymentLineSnapshotSchema = z
  .object({
    lineId: z.uuid(),
    lineType: paymentLineTypeSchema,
    description: z.enum(["Consultation", "Medication", "Delivery", "Discount", "Adjustment"]),
    quantity: z.int().positive().max(10),
    unitAmountMinor: z.int().nonnegative(),
    totalAmountMinor: z.int(),
    currency: z.literal("zar"),
    taxTreatment: opaqueIdentifierSchema,
    priceVersion: opaqueIdentifierSchema,
    providerPriceId: z.string().regex(/^price_[A-Za-z0-9]{8,96}$/),
  })
  .strict();

export const paymentOrderSchema = z
  .object({
    orderId: z.uuid(),
    tenantId: z.uuid(),
    workflowId: z.uuid(),
    subjectId: z.uuid(),
    scenario: chargeScenarioSchema,
    status: z.enum([
      "prepared",
      "checkout_open",
      "payment_pending",
      "paid",
      "failed",
      "expired",
      "refunded",
      "disputed",
      "pending_reconciliation",
    ]),
    refundState: z.enum(["not_required", "pending", "refunded", "failed"]),
    disputeState: z.enum(["none", "open", "won", "lost"]),
    currency: z.literal("zar"),
    amountTotalMinor: z.int().positive(),
    termsVersion: opaqueIdentifierSchema,
    priceVersion: opaqueIdentifierSchema,
    checkoutSessionId: z
      .string()
      .regex(/^cs_test_[A-Za-z0-9_]{8,120}$/)
      .optional(),
    paymentIntentId: z
      .string()
      .regex(/^pi_[A-Za-z0-9_]{8,120}$/)
      .optional(),
    lines: z.array(paymentLineSnapshotSchema).min(1).max(5),
    replayed: z.boolean(),
  })
  .strict();

export const paymentCheckoutResultSchema = z
  .object({
    order: paymentOrderSchema,
    checkoutUrl: z.url().startsWith("https://checkout.stripe.com/"),
  })
  .strict();

export const stripeProviderEventTypeSchema = z.enum([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
]);

export const verifiedPaymentProviderEventSchema = z
  .object({
    contract: z.literal("payment.provider"),
    version: z.literal(1),
    provider: z.literal("stripe"),
    environment: z.enum(["local", "production"]),
    externalEventId: z.string().regex(/^evt_[A-Za-z0-9_]{8,120}$/),
    eventType: stripeProviderEventTypeSchema,
    orderId: z.uuid().optional(),
    checkoutSessionId: z
      .string()
      .regex(/^cs_test_[A-Za-z0-9_]{8,120}$/)
      .optional(),
    paymentIntentId: z
      .string()
      .regex(/^pi_[A-Za-z0-9_]{8,120}$/)
      .optional(),
    paymentStatus: z.enum(["unpaid", "paid", "no_payment_required"]).optional(),
    refundComplete: z.boolean().optional(),
    disputeOutcome: z.enum(["won", "lost", "warning_closed"]).optional(),
    occurredAt: rfc3339TimestampSchema,
    payloadFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .superRefine((event, context) => {
    if (!event.orderId && !event.paymentIntentId) {
      context.addIssue({
        code: "custom",
        message: "A payment provider event requires an opaque order or payment reference.",
      });
    }
  });

export const paymentProviderEventResultSchema = z
  .object({
    order: paymentOrderSchema,
    eventId: z.uuid(),
    replayed: z.boolean(),
    reconciliationRequired: z.boolean(),
  })
  .strict();

export type ChargeScenario = z.infer<typeof chargeScenarioSchema>;
export type PaymentCheckoutCommand = z.infer<typeof paymentCheckoutCommandSchema>;
export type PaymentLineSnapshot = z.infer<typeof paymentLineSnapshotSchema>;
export type PaymentOrder = z.infer<typeof paymentOrderSchema>;
export type PaymentCheckoutResult = z.infer<typeof paymentCheckoutResultSchema>;
export type VerifiedPaymentProviderEvent = z.infer<typeof verifiedPaymentProviderEventSchema>;
export type PaymentProviderEventResult = z.infer<typeof paymentProviderEventResultSchema>;
