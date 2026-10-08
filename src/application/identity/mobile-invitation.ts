import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(1)
  .max(100)
  // Deliberately reject control characters rather than allowing them into contacts or UI.
  // eslint-disable-next-line no-control-regex
  .regex(/^[^\u0000-\u001f\u007f]+$/);
const reference = z.uuid();
const mutation = {
  invitationId: reference,
  expectedVersion: z.number().int().min(1).max(999_999_999),
  requestKey: reference,
};
export const mobileInvitationCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      requestKey: reference,
      givenName: name,
      familyName: name,
      phone: z
        .string()
        .trim()
        .regex(/^\+[1-9][0-9]{7,14}$/),
      provenanceReference: reference,
      contactAuthorityReference: reference,
    })
    .strict(),
  z.object({ action: z.literal("review"), ...mutation }).strict(),
  z.object({ action: z.literal("send"), ...mutation }).strict(),
  z.object({ action: z.literal("resend"), ...mutation }).strict(),
  z.object({ action: z.literal("revoke"), ...mutation }).strict(),
]);
export type MobileInvitationCommand = z.infer<typeof mobileInvitationCommandSchema>;
export const mobileInvitationStatusSchema = z.enum([
  "draft",
  "issued",
  "claimed",
  "converted",
  "expired",
  "revoked",
  "declined",
]);
export const mobileInvitationResultSchema = z
  .object({
    invitationId: reference,
    version: z.number().int().positive(),
    status: mobileInvitationStatusSchema,
    action: z.enum(["create", "review", "send", "resend", "revoke"]),
    smsSent: z.literal(false),
  })
  .strict();
export const mobileInvitationPageSchema = z
  .object({
    invitations: z
      .array(
        z
          .object({
            id: reference,
            version: z.number().int().positive(),
            status: mobileInvitationStatusSchema,
            expiresAt: z.iso.datetime({ offset: true }).nullable(),
            givenName: name,
            familyName: name,
            maskedPhone: z.string().regex(/^\*\*\*\d{2}$/),
            reviewed: z.boolean(),
            sendReserved: z.boolean(),
            dispatchRequestKey: reference.nullable().optional(),
            delivery: z
              .object({
                status: z.enum([
                  "not_attempted",
                  "pending",
                  "accepted",
                  "sent",
                  "provider_delivered",
                  "failed",
                  "uncertain",
                  "conflict",
                ]),
                budgetReview: z.boolean(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .max(25),
    nextId: reference.nullable(),
    reservationEnabled: z.boolean(),
    sendingEnabled: z.boolean(),
  })
  .strict();
export type MobileInvitationPage = z.infer<typeof mobileInvitationPageSchema>;
export class MobileInvitationConflictError extends Error {}
export class MobileInvitationBudgetError extends Error {}
