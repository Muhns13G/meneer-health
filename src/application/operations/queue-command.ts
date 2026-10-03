import { z } from "zod";
import {
  operationsExceptionCodeSchema,
  operationsStateSchema,
} from "../../../contracts/operations";

const scope = {
  caseId: z.uuid(),
  expectedVersion: z.number().int().positive().max(999_999_999),
  requestKey: z.uuid(),
};
export const queueCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...scope, action: z.literal("claim") }).strict(),
  z.object({ ...scope, action: z.literal("release") }).strict(),
  z.object({ ...scope, action: z.literal("mark_ready") }).strict(),
  z.object({ ...scope, action: z.literal("cancel") }).strict(),
  z
    .object({
      ...scope,
      action: z.literal("record_exception"),
      code: operationsExceptionCodeSchema,
    })
    .strict(),
]);
export const readinessSchema = z
  .object({
    profileActive: z.boolean(),
    accountActive: z.boolean(),
    emailVerified: z.boolean(),
    instrumentsCurrent: z.boolean(),
    authorisationCurrent: z.boolean(),
    // Sprint 11 owns deposit credit/refund reconciliation. No operator-supplied bypass.
    paymentReadiness: z.literal("integration_pending"),
    recipientReadiness: z.literal("integration_pending"),
    ready: z.literal(false),
  })
  .strict();
export const queueCommandResultSchema = z
  .object({
    caseId: z.uuid(),
    state: operationsStateSchema,
    version: z.number().int().positive(),
    claim: z.enum(["unclaimed", "yours", "other"]),
    readiness: readinessSchema,
  })
  .strict();
export type QueueCommand = z.infer<typeof queueCommandSchema>;
export class QueueConflictError extends Error {}
export class QueueReadinessError extends Error {}
