import { z } from "zod";

const opaqueValuePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const contractNamePattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;

export const contractNameSchema = z
  .string()
  .regex(contractNamePattern, "Contract names must use lower-case dot notation.");

export const contractMajorSchema = z.number().int().positive();

export const opaqueIdentifierSchema = z
  .string()
  .regex(opaqueValuePattern, "Identifiers must be opaque, non-empty, and transport safe.");

export const rfc3339TimestampSchema = z.iso.datetime({ offset: true });

export const actorSchema = z
  .object({
    type: z.string().regex(/^[a-z][a-z0-9-]{1,47}$/),
    id: opaqueIdentifierSchema,
  })
  .strict();

export const payloadSchema = z.record(z.string(), z.unknown());

export type ContractActor = z.infer<typeof actorSchema>;
