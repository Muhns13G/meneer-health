import { z } from "zod";
import { handoffAttemptStateSchema, operationsStateSchema } from "../../../contracts/operations";

const scope = {
  caseId: z.uuid(),
  expectedVersion: z.number().int().positive().max(999_999_999),
  requestKey: z.uuid(),
};
const attempt = { ...scope, attemptId: z.uuid() };
// Only references to independently reviewed, server-held evidence are accepted.
// No target state, delivery checkbox, URL, contact, payment or clinical payload.
export const handoffCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...scope, action: z.literal("prepare"), authorisationId: z.uuid() }).strict(),
  z.object({ ...attempt, action: z.literal("retry"), authorisationId: z.uuid() }).strict(),
  z.object({ ...attempt, action: z.literal("begin_delivery") }).strict(),
  z.object({ ...attempt, action: z.literal("mark_uncertain") }).strict(),
  z.object({ ...attempt, action: z.literal("reconcile_delivery"), evidenceId: z.uuid() }).strict(),
  z.object({ ...attempt, action: z.literal("acknowledge"), evidenceId: z.uuid() }).strict(),
  z.object({ ...attempt, action: z.literal("review"), evidenceId: z.uuid() }).strict(),
  z.object({ ...attempt, action: z.literal("outcome"), evidenceId: z.uuid() }).strict(),
  z
    .object({ ...attempt, action: z.literal("cancel_handoff"), evidenceId: z.uuid().nullable() })
    .strict(),
  z.object({ ...scope, action: z.literal("resolve_exception"), exceptionId: z.uuid() }).strict(),
]);
export const handoffResultSchema = z
  .object({
    caseId: z.uuid(),
    state: operationsStateSchema,
    version: z.number().int().positive(),
    attemptId: z.uuid().nullable(),
    attemptState: handoffAttemptStateSchema.nullable(),
  })
  .strict()
  .refine(
    (value) => (value.attemptId === null) === (value.attemptState === null),
    "Attempt reference and state must agree.",
  );
export type HandoffCommand = z.infer<typeof handoffCommandSchema>;
