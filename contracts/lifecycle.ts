import { z } from "zod";

import { contractDefinitionSchema } from "./catalogue";

export const dataSubjectRequestTypeSchema = z.enum(["access_export", "erasure"]);
export const dataSubjectRequestStatusSchema = z.enum([
  "verified",
  "in_progress",
  "pending_reconciliation",
  "completed",
  "rejected",
]);

export const dataSubjectRequestResultSchema = z
  .object({
    requestId: z.uuid(),
    status: dataSubjectRequestStatusSchema,
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    reconciliationPending: z.array(z.enum(["database", "identity", "storage", "recovery_backup"])),
  })
  .strict();

export const dataSubjectRequestContract = contractDefinitionSchema.parse({
  name: "lifecycle.request",
  kind: "command",
  owner: "Data lifecycle module",
  consumers: ["Server lifecycle adapter", "migration acceptance suite"],
  version: 1,
  sensitivity: "special-personal-information",
  idempotency: "required",
  lifecycle: "active",
});

export const recoveryArchiveContract = contractDefinitionSchema.parse({
  name: "recovery.archive",
  kind: "recovery-artifact",
  owner: "Recovery module",
  consumers: ["Recovery archive adapter", "recovery exercise"],
  version: 1,
  sensitivity: "special-personal-information",
  idempotency: "required",
  lifecycle: "active",
});

export const recoveryManifestSchema = z
  .object({
    contract: z.literal("recovery.manifest"),
    version: z.literal(1),
    createdAt: z.iso.datetime(),
    environment: z.enum(["local", "production"]),
    backupId: z.uuid(),
    schemaVersion: z.string().regex(/^\d{14}$/),
    recordCounts: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), z.int().nonnegative()),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const encryptedRecoveryArchiveSchema = z
  .object({
    contract: z.literal("recovery.encrypted-archive"),
    version: z.literal(1),
    algorithm: z.literal("AES-256-GCM"),
    keyReference: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/),
    iv: z.string().min(16),
    ciphertext: z.string().min(16),
  })
  .strict();

export type DataSubjectRequestResult = z.infer<typeof dataSubjectRequestResultSchema>;
export type RecoveryManifest = z.infer<typeof recoveryManifestSchema>;
export type EncryptedRecoveryArchive = z.infer<typeof encryptedRecoveryArchiveSchema>;
