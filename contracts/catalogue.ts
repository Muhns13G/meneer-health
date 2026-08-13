import { z } from "zod";

import { contractMajorSchema, contractNameSchema } from "./shared";

export const contractKindSchema = z.enum([
  "command",
  "query",
  "result",
  "domain-event",
  "integration-message",
  "error",
  "audit-fact",
  "telemetry-event",
  "recovery-artifact",
  "content-catalogue",
]);

export const sensitivitySchema = z.enum([
  "public",
  "internal",
  "confidential",
  "special-personal-information",
]);

export const contractDefinitionSchema = z
  .object({
    name: contractNameSchema,
    kind: contractKindSchema,
    owner: z.string().min(1),
    consumers: z.array(z.string().min(1)).min(1),
    version: contractMajorSchema,
    sensitivity: sensitivitySchema,
    idempotency: z.enum(["required", "optional", "not-applicable"]),
    lifecycle: z.enum(["active", "deprecated", "retired"]),
  })
  .strict();

export type ContractDefinition = z.infer<typeof contractDefinitionSchema>;
