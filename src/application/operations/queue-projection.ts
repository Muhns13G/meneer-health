import { z } from "zod";
import { readinessSchema } from "./queue-command";
import {
  operationsStateSchema,
  operationsExceptionCodeSchema,
} from "../../../contracts/operations";

export const queueCursorSchema = z
  .object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() })
  .strict();
export const queueFilterSchema = z
  .object({
    state: operationsStateSchema.nullable(),
    cursor: queueCursorSchema.nullable(),
  })
  .strict();
export const queueCaseSchema = z
  .object({
    caseId: z.uuid(),
    state: operationsStateSchema,
    version: z.number().int().positive(),
    assignedOwner: z.uuid(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    profileActive: z.boolean(),
    emailVerified: z.boolean(),
    exceptionCode: operationsExceptionCodeSchema.nullable(),
    handoffReadiness: z.literal("not_evaluated"),
    paymentReadiness: z.literal("not_evaluated"),
  })
  .strict();
export const queuePageSchema = z
  .object({
    cases: z.array(queueCaseSchema).max(25),
    nextCursor: queueCursorSchema.nullable(),
  })
  .strict();
export const queueDetailSchema = queueCaseSchema
  .extend({
    claim: z.enum(["unclaimed", "yours", "other"]),
    readiness: readinessSchema,
    profile: z
      .object({
        givenName: z.string().max(100).nullable(),
        familyName: z.string().max(100).nullable(),
        status: z.enum(["active", "restricted", "closure_pending", "deidentified"]),
        maskedEmail: z.literal("***@***").nullable(),
        maskedMobile: z
          .string()
          .regex(/^\*\*\*\d{2}$/)
          .nullable(),
        contactPreference: z.enum(["email", "whatsapp"]),
        mobileVerificationStatus: z.enum(["pending", "verified", "revoked"]),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type QueueFilter = z.infer<typeof queueFilterSchema>;
export type QueuePage = z.infer<typeof queuePageSchema>;
export type QueueDetail = z.infer<typeof queueDetailSchema>;
