import { z } from "zod";

import type { ContractDefinition } from "./catalogue";
import { eventEnvelopeSchema } from "./envelopes";
import { opaqueIdentifierSchema, rfc3339TimestampSchema } from "./shared";

export const auditFactContract = {
  name: "audit.fact",
  kind: "audit-fact",
  owner: "Audit and governance module",
  consumers: ["Authorised audit evidence service"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "not-applicable",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const workflowTransitionedEventContract = {
  name: "workflow.transitioned",
  kind: "domain-event",
  owner: "Orders and fulfilment module",
  consumers: ["Transactional integration outbox"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const integrationInboxContract = {
  name: "integration.received",
  kind: "integration-message",
  owner: "Integration module",
  consumers: ["Verified provider adapter"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const satisfies ContractDefinition;

const auditActorSchema = z
  .object({
    type: z.enum(["patient", "workforce", "service", "system"]),
    id: z.uuid(),
    role: z.string().regex(/^[a-z][a-z_]{1,47}$/),
    assurance: z.enum(["aal1", "aal2", "service", "system"]),
  })
  .strict();

const safeAuditMetadataSchema = z
  .object({
    transition: z
      .string()
      .regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/)
      .optional(),
    aggregateVersion: z.number().int().nonnegative().optional(),
    eventName: z
      .string()
      .regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/)
      .optional(),
    provider: z
      .string()
      .regex(/^[a-z][a-z0-9_-]{1,47}$/)
      .optional(),
    environment: z.enum(["local", "preview", "production"]).optional(),
    replayed: z.boolean().optional(),
    reviewEventCount: z.number().int().nonnegative().optional(),
    chainVerified: z.boolean().optional(),
  })
  .strict();

export const auditFactSchema = z
  .object({
    contract: z.literal("audit.fact"),
    version: z.literal(1),
    factId: z.uuid(),
    sequence: z.number().int().positive(),
    tenantId: z.uuid(),
    actor: auditActorSchema,
    action: z.string().regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/),
    subjectId: z.uuid().optional(),
    resource: z
      .object({
        type: z.string().regex(/^[a-z][a-z0-9_]{1,47}$/),
        id: opaqueIdentifierSchema,
      })
      .strict(),
    purpose: z.string().regex(/^[a-z][a-z_]{1,47}$/),
    policyVersion: opaqueIdentifierSchema,
    outcome: z.enum(["succeeded", "denied", "failed"]),
    reasonCode: z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/),
    correlationId: opaqueIdentifierSchema,
    causationId: opaqueIdentifierSchema,
    occurredAt: rfc3339TimestampSchema,
    recordedAt: rfc3339TimestampSchema,
    metadata: safeAuditMetadataSchema,
    previousHash: z.string().regex(/^[a-f0-9]{64}$/),
    eventHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const workflowTransitionedEventSchema = eventEnvelopeSchema.extend({
  event: z.literal("workflow.transitioned"),
  version: z.literal(1),
  aggregate: z
    .object({
      type: z.literal("workflow"),
      id: z.uuid(),
      version: z.number().int().positive(),
    })
    .strict(),
  payload: z
    .object({
      transition: z.string().regex(/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/),
    })
    .strict(),
});

export const integrationInboxReceiptSchema = z
  .object({
    contract: z.literal("integration.received"),
    version: z.literal(1),
    inboxId: z.uuid(),
    tenantId: z.uuid(),
    provider: z.string().regex(/^[a-z][a-z0-9_-]{1,47}$/),
    environment: z.enum(["local", "preview", "production"]),
    externalEventId: opaqueIdentifierSchema,
    correlationId: opaqueIdentifierSchema,
    status: z.enum(["verified", "pending_reconciliation", "rejected"]),
    replayed: z.boolean(),
    receivedAt: rfc3339TimestampSchema,
  })
  .strict();

export const auditReviewResultSchema = z
  .object({
    reviewId: z.uuid(),
    reviewedAt: rfc3339TimestampSchema,
    reviewedThroughSequence: z.number().int().nonnegative(),
    chainVerified: z.boolean(),
    events: z.array(auditFactSchema).max(100),
  })
  .strict();

export type AuditFact = z.infer<typeof auditFactSchema>;
export type AuditReviewResult = z.infer<typeof auditReviewResultSchema>;
export type IntegrationInboxReceipt = z.infer<typeof integrationInboxReceiptSchema>;
