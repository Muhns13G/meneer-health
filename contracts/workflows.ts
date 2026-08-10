import { z } from "zod";

import type { ContractDefinition } from "./catalogue";
import { commandEnvelopeSchema } from "./envelopes";

export const workflowTransitionContract = {
  name: "workflow.transition",
  kind: "command",
  owner: "Orders and fulfilment module",
  consumers: ["Meneer application command service"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const workflowTransitionSchema = z.enum([
  "clinical.start_review",
  "clinical.approve",
  "clinical.reject",
  "payment.start",
  "payment.confirm",
  "payment.fail",
  "supply.request",
  "supply.confirm",
  "supply.reject",
  "hub.expect",
  "hub.receive",
  "hub.reject",
  "dispatch.ready",
  "dispatch.send",
  "delivery.start",
  "delivery.confirm",
  "delivery.fail",
  "cancellation.request",
  "cancellation.confirm",
  "cancellation.decline",
  "refund.request",
  "refund.confirm",
  "refund.fail",
]);

export const workflowTransitionCommandSchema = commandEnvelopeSchema.extend({
  contract: z.literal("workflow.transition"),
  version: z.literal(1),
  actor: z
    .object({
      type: z.enum(["patient", "workforce"]),
      id: z.uuid(),
    })
    .strict(),
  subjectId: z.uuid(),
  payload: z
    .object({
      workflowId: z.uuid(),
      transition: workflowTransitionSchema,
    })
    .strict(),
});

export const workflowSnapshotSchema = z
  .object({
    workflowId: z.uuid(),
    tenantId: z.uuid(),
    subjectId: z.uuid().optional(),
    version: z.number().int().nonnegative(),
    clinicalState: z.enum(["not_started", "under_review", "approved", "rejected"]),
    paymentState: z.enum(["not_started", "pending", "paid", "failed", "refunded", "disputed"]),
    supplyState: z.enum(["not_started", "pending", "available", "unavailable"]),
    hubReceiptState: z.enum(["not_started", "pending", "received", "rejected"]),
    dispatchState: z.enum(["not_ready", "ready", "dispatched", "blocked"]),
    deliveryState: z.enum(["not_started", "in_transit", "delivered", "failed"]),
    cancellationState: z.enum(["active", "requested", "cancelled", "declined"]),
    refundState: z.enum(["not_required", "pending", "refunded", "failed"]),
  })
  .strict();

export const workflowTransitionResultSchema = workflowSnapshotSchema
  .omit({ subjectId: true })
  .extend({
    replayed: z.boolean(),
  });

export type WorkflowTransition = z.infer<typeof workflowTransitionSchema>;
export type WorkflowTransitionCommand = z.infer<typeof workflowTransitionCommandSchema>;
export type WorkflowSnapshot = z.infer<typeof workflowSnapshotSchema>;
export type WorkflowTransitionResult = z.infer<typeof workflowTransitionResultSchema>;
