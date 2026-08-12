import { z } from "zod";

import type { ContractDefinition } from "./catalogue";
import { opaqueIdentifierSchema } from "./shared";

export const errorResponseContract = {
  name: "error.response",
  kind: "error",
  owner: "Application boundary",
  consumers: ["Every framework and provider adapter"],
  version: 1,
  sensitivity: "internal",
  idempotency: "not-applicable",
  lifecycle: "active",
} as const satisfies ContractDefinition;

export const stableErrorCodes = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "DUPLICATE",
  "RATE_LIMITED",
  "DEPENDENCY_UNAVAILABLE",
  "PENDING_RECONCILIATION",
  "INTERNAL_FAILURE",
] as const;

export const stableErrorCodeSchema = z.enum(stableErrorCodes);
export const retryClassificationSchema = z.enum(["never", "safe", "after-delay", "reconcile"]);

const safeErrorMessageSchema = z
  .string()
  .min(1)
  .max(240)
  .refine((value) => !/[\r\n]/.test(value), "Error messages must remain single-line and safe.");

export const errorContractSchema = z
  .object({
    contract: z.literal("error.response"),
    version: z.literal(1),
    correlationId: opaqueIdentifierSchema,
    error: z
      .object({
        code: stableErrorCodeSchema,
        message: safeErrorMessageSchema,
        retry: retryClassificationSchema,
      })
      .strict(),
  })
  .strict();

export type ErrorContract = z.infer<typeof errorContractSchema>;
export type StableErrorCode = z.infer<typeof stableErrorCodeSchema>;
