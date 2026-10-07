import { z } from "zod";

export const evidenceKindSchema = z.enum([
  "delivered",
  "not_delivered",
  "acknowledged",
  "review_pending",
  "completed",
  "unable_to_complete",
  "client_declined",
  "cancel_confirmed",
]);
export const handoffEvidenceCommandSchema = z
  .object({
    caseId: z.uuid(),
    attemptId: z.uuid(),
    kind: evidenceKindSchema,
    externalReference: z.uuid(),
    sourceReference: z.uuid(),
    observedAt: z.iso.datetime({ offset: true }),
    requestKey: z.uuid(),
  })
  .strict();
export type HandoffEvidenceCommand = z.infer<typeof handoffEvidenceCommandSchema>;
export const destinationApprovalSchema = z
  .object({
    approvalReference: z.uuid(),
    requestKey: z.uuid(),
  })
  .strict();
export const portalLinkCommandSchema = z.object({ requestKey: z.uuid() }).strict();
export const evidenceResultSchema = z.object({ evidenceId: z.uuid() }).strict();
