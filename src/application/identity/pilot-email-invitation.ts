import { z } from "zod";

export const pilotEmailInvitationRequestSchema = z
  .object({
    invitationId: z.uuid(),
    expectedVersion: z.number().int().min(1).max(999999999),
    requestKey: z.uuid(),
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  })
  .strict();
export type PilotEmailInvitationRequest = z.infer<typeof pilotEmailInvitationRequestSchema>;
export const pilotEmailInvitationResultSchema = z
  .object({
    outcome: z.enum(["accepted", "failed", "uncertain", "already_attempted"]),
  })
  .strict();
export type PilotEmailInvitationResult = z.infer<typeof pilotEmailInvitationResultSchema>;
