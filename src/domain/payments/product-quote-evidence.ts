import { z } from "zod";

export const productEvidenceKindSchema = z.enum([
  "clinical",
  "provider_stock",
  "pharmacy_authority",
  "address_custody",
]);
const target = z.union([
  z.object({ caseId: z.uuid() }).strict(),
  z.object({ intakeId: z.uuid() }).strict(),
]);
export const productEvidenceCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), target }).strict(),
  z
    .object({
      action: z.literal("record"),
      target,
      draftId: z.uuid(),
      kind: productEvidenceKindSchema,
      evidenceReference: z.uuid(),
      expiresAt: z.iso.datetime({ offset: true }),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("revoke"),
      target,
      draftId: z.uuid(),
      evidenceId: z.uuid(),
      evidenceReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
]);
export const productEvidenceViewSchema = z
  .object({
    draftId: z.uuid(),
    version: z.int().positive(),
    tenantName: z.string().min(1).max(160),
    synthetic: z.boolean(),
    role: z.enum(["operations", "clinician"]),
    canRecord: z.boolean(),
    items: z
      .array(
        z
          .object({ description: z.string().min(1).max(160), quantity: z.int().min(1).max(10) })
          .strict(),
      )
      .min(1)
      .max(20),
    evidence: z
      .array(
        z
          .object({
            id: z.uuid(),
            kind: productEvidenceKindSchema,
            expiresAt: z.iso.datetime({ offset: true }),
            current: z.boolean(),
            canRevoke: z.boolean(),
          })
          .strict(),
      )
      .max(4),
    expiresAt: z.iso.datetime({ offset: true }),
    recordUntil: z.iso.datetime({ offset: true }),
  })
  .strict();
export type ProductEvidenceView = z.infer<typeof productEvidenceViewSchema>;
