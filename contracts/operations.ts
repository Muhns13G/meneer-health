import { z } from "zod";

import type { ContractDefinition } from "./catalogue";
import { rfc3339TimestampSchema } from "./shared";

export const operationsRecordContract = {
  name: "operations.record",
  kind: "result",
  owner: "Staff operations module",
  consumers: ["Governed operations repository", "Successor framework adapters"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "not-applicable",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const operationsStateSchema = z.enum([
  "onboarding_pending",
  "ready_for_handoff",
  "handed_off",
  "provider_acknowledged",
  "provider_review_pending",
  "provider_outcome_recorded",
  "handoff_exception",
  "cancelled",
]);
export const handoffAttemptStateSchema = z.enum([
  "prepared",
  "delivery_pending",
  "delivered",
  "failed",
  "uncertain",
  "cancelled",
]);
export const operationsExceptionCodeSchema = z.enum([
  "destination_unavailable",
  "authorisation_stale",
  "acknowledgement_missing",
  "delivery_uncertain",
  "version_conflict",
  "provider_unavailable",
  "client_withdrawal",
  "abandoned_case",
]);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const positiveVersion = z.number().int().positive();
const scope = {
  id: z.uuid(),
  tenantId: z.uuid(),
  caseId: z.uuid(),
  subjectId: z.uuid(),
};
const mutable = {
  version: positiveVersion,
  createdAt: rfc3339TimestampSchema,
  updatedAt: rfc3339TimestampSchema,
};
const evidence = {
  actorSubjectId: z.uuid(),
  idempotencyKey: z.uuid(),
  correlationId: z.uuid(),
  recordedAt: rfc3339TimestampSchema,
};
const chronologicalUpdate = (record: { createdAt: string; updatedAt: string }) =>
  Date.parse(record.updatedAt) >= Date.parse(record.createdAt);

export const operationsCaseSchema = z
  .object({
    kind: z.literal("case"),
    id: z.uuid(),
    tenantId: z.uuid(),
    subjectId: z.uuid(),
    state: operationsStateSchema,
    outcome: z.enum(["completed", "unable_to_complete", "client_declined"]).nullable(),
    ...mutable,
  })
  .strict()
  .refine(chronologicalUpdate, "Update cannot precede creation.")
  .refine(
    (record) => (record.state === "provider_outcome_recorded") === (record.outcome !== null),
    "Only a recorded provider outcome has an administrative outcome code.",
  );

export const operationsAssignmentSchema = z
  .object({
    kind: z.literal("assignment"),
    ...scope,
    workforceSubjectId: z.uuid(),
    purpose: z.literal("operations"),
    role: z.literal("operations"),
    grantedBySubjectId: z.uuid(),
    startsAt: rfc3339TimestampSchema,
    expiresAt: rfc3339TimestampSchema,
    revokedAt: rfc3339TimestampSchema.nullable(),
    ...mutable,
  })
  .strict()
  .refine(chronologicalUpdate, "Update cannot precede creation.")
  .refine(
    (r) => r.revokedAt === null || Date.parse(r.revokedAt) >= Date.parse(r.startsAt),
    "Revocation cannot precede assignment.",
  )
  .refine((r) => r.grantedBySubjectId !== r.workforceSubjectId, "Self-grant is forbidden.")
  .refine((r) => Date.parse(r.expiresAt) > Date.parse(r.startsAt), "Invalid assignment window.");

export const operationsClaimSchema = z
  .object({
    kind: z.literal("claim"),
    ...scope,
    assignmentId: z.uuid(),
    workforceSubjectId: z.uuid(),
    claimedAt: rfc3339TimestampSchema,
    releasedAt: rfc3339TimestampSchema.nullable(),
    ...mutable,
  })
  .strict()
  .refine(chronologicalUpdate, "Update cannot precede creation.")
  .refine(
    (r) => r.releasedAt === null || Date.parse(r.releasedAt) >= Date.parse(r.claimedAt),
    "Invalid claim release time.",
  );

export const handoffAuthorisationSchema = z
  .object({
    kind: z.literal("authorisation"),
    ...scope,
    receiptId: z.uuid(),
    destinationId: z.uuid(),
    destinationDigest: hash,
    destinationVersion: positiveVersion,
    authorisedAt: rfc3339TimestampSchema,
    expiresAt: rfc3339TimestampSchema,
  })
  .strict()
  .refine((r) => {
    const duration = Date.parse(r.expiresAt) - Date.parse(r.authorisedAt);
    return duration > 0 && duration <= 30 * 24 * 60 * 60 * 1000;
  }, "Hand-off authorisation must expire within 30 days.");

export const handoffAttemptSchema = z
  .object({
    kind: z.literal("attempt"),
    ...scope,
    authorisationId: z.uuid(),
    claimId: z.uuid(),
    workforceSubjectId: z.uuid(),
    retryOfAttemptId: z.uuid().nullable(),
    state: handoffAttemptStateSchema,
    requestKey: z.uuid(),
    requestDigest: hash,
    externalReference: z.uuid().nullable(),
    deliveredAt: rfc3339TimestampSchema.nullable(),
    ...mutable,
  })
  .strict()
  .refine(chronologicalUpdate, "Update cannot precede creation.")
  .refine(
    (r) => r.deliveredAt === null || Date.parse(r.deliveredAt) >= Date.parse(r.createdAt),
    "Delivery cannot precede creation.",
  )
  .refine(
    (r) => (r.state === "delivered") === (r.deliveredAt !== null),
    "Only delivered attempts have a delivery timestamp.",
  )
  .refine((r) => r.retryOfAttemptId !== r.id, "An attempt cannot retry itself.");

export const handoffAcknowledgementSchema = z
  .object({
    kind: z.literal("acknowledgement"),
    ...scope,
    attemptId: z.uuid(),
    evidenceReference: z.uuid(),
    acknowledgedAt: rfc3339TimestampSchema,
    ...evidence,
  })
  .strict()
  .refine(
    (r) => Date.parse(r.acknowledgedAt) <= Date.parse(r.recordedAt),
    "Acknowledgement cannot be recorded before it occurred.",
  );

export const operationsExceptionSchema = z
  .object({
    kind: z.literal("exception"),
    ...scope,
    attemptId: z.uuid().nullable(),
    code: operationsExceptionCodeSchema,
    priorState: operationsStateSchema,
    resolutionOfExceptionId: z.uuid().nullable(),
    ...evidence,
  })
  .strict()
  .refine((r) => r.resolutionOfExceptionId !== r.id, "An exception cannot resolve itself.");

export const operationsEventSchema = z
  .object({
    kind: z.literal("event"),
    ...scope,
    caseVersion: positiveVersion,
    event: z.enum([
      "created",
      "assigned",
      "assignment_revoked",
      "claimed",
      "released",
      "transitioned",
      "handoff_attempted",
      "acknowledged",
      "exception_recorded",
      "exception_resolved",
    ]),
    referenceId: z.uuid().nullable(),
    ...evidence,
  })
  .strict();

// Internal portable records, not a browser projection or permission to write a database row.
export const operationsRecordSchema = z
  .object({
    contract: z.literal("operations.record"),
    version: z.literal(1),
    record: z.discriminatedUnion("kind", [
      operationsCaseSchema,
      operationsAssignmentSchema,
      operationsClaimSchema,
      handoffAuthorisationSchema,
      handoffAttemptSchema,
      handoffAcknowledgementSchema,
      operationsExceptionSchema,
      operationsEventSchema,
    ]),
  })
  .strict();

export type OperationsRecord = z.infer<typeof operationsRecordSchema>;
export type OperationsCase = z.infer<typeof operationsCaseSchema>;
