import { z } from "zod";
import { activationCommandSchema } from "./pilot-activation";

export const rightsRequestKinds = [
  "export",
  "restriction",
  "closure",
  "contact_change",
  "support",
] as const;
export const patientRightsCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("correct"),
      requestKey: z.uuid(),
      expectedVersion: z.number().int().positive(),
      givenName: activationCommandSchema.shape.givenName,
      familyName: activationCommandSchema.shape.familyName,
      contactPreference: z.enum(["email", "whatsapp"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("request"),
      requestKey: z.uuid(),
      expectedVersion: z.number().int().positive(),
      kind: z.enum(rightsRequestKinds),
    })
    .strict(),
]);
export const patientRightsResultSchema = z
  .object({
    reference: z.uuid(),
    outcome: z.enum(["corrected", "received"]),
    profileVersion: z.number().int().positive(),
  })
  .strict();
export type PatientRightsCommand = z.infer<typeof patientRightsCommandSchema>;
export type PatientRightsResult = z.infer<typeof patientRightsResultSchema>;
export class PatientRightsConflictError extends Error {
  constructor() {
    super("The account version or request key has changed.");
  }
}
