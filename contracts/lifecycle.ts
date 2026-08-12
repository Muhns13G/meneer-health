import { z } from "zod";

import { contractDefinitionSchema } from "./catalogue";
import { commandEnvelopeSchema } from "./envelopes";

export const dataSubjectRequestTypeSchema = z.enum(["access_export", "erasure"]);
export const dataSubjectRequestStatusSchema = z.enum([
  "verified",
  "in_progress",
  "pending_reconciliation",
  "completed",
  "rejected",
]);

export const dataSubjectRequestCommandSchema = commandEnvelopeSchema.extend({
  contract: z.literal("lifecycle.request"),
  version: z.literal(1),
  actor: z.object({ type: z.literal("workforce"), id: z.uuid() }).strict(),
  subjectId: z.uuid(),
  payload: z
    .object({
      requestType: dataSubjectRequestTypeSchema,
    })
    .strict(),
});

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

export const recoveryManifestContract = contractDefinitionSchema.parse({
  name: "recovery.manifest",
  kind: "recovery-artifact",
  owner: "Recovery module",
  consumers: ["Recovery archive adapter", "restore reconciliation suite"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
});

export const encryptedRecoveryArchiveContract = contractDefinitionSchema.parse({
  name: "recovery.encrypted-archive",
  kind: "recovery-artifact",
  owner: "Recovery module",
  consumers: ["Off-site recovery writer", "staging restore exercise"],
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

export const recoveryArchiveReferenceSchema = z
  .object({
    contract: z.literal("recovery.archive"),
    version: z.literal(1),
    backupId: z.uuid(),
    manifestChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    keyReference: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/),
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
export type DataSubjectRequestCommand = z.infer<typeof dataSubjectRequestCommandSchema>;
export type RecoveryManifest = z.infer<typeof recoveryManifestSchema>;
export type RecoveryArchiveReference = z.infer<typeof recoveryArchiveReferenceSchema>;
export type EncryptedRecoveryArchive = z.infer<typeof encryptedRecoveryArchiveSchema>;
