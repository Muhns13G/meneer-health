import { z } from "zod";

import {
  actorSchema,
  contractMajorSchema,
  contractNameSchema,
  opaqueIdentifierSchema,
  payloadSchema,
  rfc3339TimestampSchema,
} from "./shared";

export const commandEnvelopeSchema = z
  .object({
    contract: contractNameSchema,
    version: contractMajorSchema,
    requestId: opaqueIdentifierSchema,
    idempotencyKey: opaqueIdentifierSchema,
    correlationId: opaqueIdentifierSchema,
    actor: actorSchema,
    subjectId: opaqueIdentifierSchema,
    expectedVersion: z.number().int().nonnegative(),
    requestedAt: rfc3339TimestampSchema,
    payload: payloadSchema,
  })
  .strict();

export const eventEnvelopeSchema = z
  .object({
    eventId: opaqueIdentifierSchema,
    event: contractNameSchema,
    version: contractMajorSchema,
    aggregate: z
      .object({
        type: z.string().regex(/^[a-z][a-z0-9-]{1,47}$/),
        id: opaqueIdentifierSchema,
        version: z.number().int().positive(),
      })
      .strict(),
    occurredAt: rfc3339TimestampSchema,
    recordedAt: rfc3339TimestampSchema,
    actor: actorSchema,
    correlationId: opaqueIdentifierSchema,
    causationId: opaqueIdentifierSchema,
    payload: payloadSchema,
  })
  .strict();

export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
