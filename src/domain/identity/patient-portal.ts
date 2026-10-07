import { z } from "zod";
import { activationDocumentSchema } from "./pilot-activation";

export const clientCaseStatusSchema = z.enum([
  "waiting",
  "action_required",
  "handoff_pending",
  "handoff_recorded",
  "paused",
  "completed",
]);
export const clientCaseProjectionSchema = z
  .object({
    reference: z.uuid(),
    status: clientCaseStatusSchema,
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type ClientCaseProjection = z.infer<typeof clientCaseProjectionSchema>;

export const portalAccountSchema = z
  .object({
    profile: z
      .object({
        givenName: z.string().min(1).max(100),
        familyName: z.string().min(1).max(100),
        verifiedEmail: z.email(),
        mobileE164: z.string().regex(/^\+[1-9][0-9]{1,14}$/),
        mobileVerificationStatus: z.enum(["pending", "verified", "revoked"]),
        contactPreference: z.enum(["email", "whatsapp"]),
        status: z.literal("active"),
        version: z.number().int().positive(),
        createdAt: z.iso.datetime({ offset: true }),
        updatedAt: z.iso.datetime({ offset: true }),
      })
      .strict(),
    instruments: z
      .array(
        activationDocumentSchema
          .extend({
            action: z.enum(["accepted", "acknowledged"]),
            recordedAt: z.iso.datetime({ offset: true }),
          })
          .strict(),
      )
      .length(2),
    workflows: z.array(
      z
        .object({
          reference: z.uuid(),
          dispatchState: z.enum(["not_ready", "ready", "dispatched", "blocked"]),
          deliveryState: z.enum(["not_started", "in_transit", "delivered", "failed"]),
          cancellationState: z.enum(["active", "requested", "cancelled", "declined"]),
          updatedAt: z.iso.datetime({ offset: true }),
        })
        .strict(),
    ),
    operationsCases: z.array(clientCaseProjectionSchema).max(100),
  })
  .strict()
  .refine(
    ({ instruments }) =>
      instruments.some(
        (item) => item.instrumentId === "pilot-account-terms" && item.action === "accepted",
      ) &&
      instruments.some(
        (item) => item.instrumentId === "pilot-privacy-notice" && item.action === "acknowledged",
      ),
  );

export const portalViewSchema = z
  .object({
    account: portalAccountSchema,
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type PortalAccount = z.infer<typeof portalAccountSchema>;
export type PortalView = z.infer<typeof portalViewSchema>;
