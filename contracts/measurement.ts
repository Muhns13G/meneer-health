import { z } from "zod";

import { opaqueIdentifierSchema, rfc3339TimestampSchema } from "./shared";

export const measurementConsentContract = {
  name: "measurement.consent",
  kind: "command",
  owner: "Privacy and product measurement",
  consumers: ["Measurement service", "Private measurement persistence"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const;

export const measurementEventContract = {
  name: "measurement.event",
  kind: "domain-event",
  owner: "Privacy and product measurement",
  consumers: ["Measurement service", "Private measurement persistence"],
  version: 1,
  sensitivity: "confidential",
  idempotency: "required",
  lifecycle: "active",
} as const;

export const measurementEnvironmentSchema = z.enum(["local", "preview", "production"]);
export const measurementConsentDecisionSchema = z.enum(["granted", "withdrawn"]);
export const measurementCampaignSchema = z.enum(["dads", "thanks_dad"]);
export const measurementDurationBucketSchema = z.enum(["under-30s", "30-119s", "2-4m", "5m-plus"]);
export const measurementOutcomeSchema = z.enum(["succeeded", "failed", "recovery-required"]);

export const measurementConsentCommandSchema = z
  .object({
    contract: z.literal("measurement.consent"),
    version: z.literal(1),
    requestId: z.uuid(),
    idempotencyKey: opaqueIdentifierSchema,
    correlationId: opaqueIdentifierSchema,
    decision: measurementConsentDecisionSchema,
    requestedAt: rfc3339TimestampSchema,
    synthetic: z.boolean(),
  })
  .strict();

const measurementEventDataSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("measurement_consent_granted") }).strict(),
  z.object({ name: z.literal("measurement_consent_withdrawn") }).strict(),
  z.object({ name: z.literal("campaign_arrived"), campaignId: measurementCampaignSchema }).strict(),
  z.object({ name: z.literal("journey_started") }).strict(),
  z
    .object({ name: z.literal("journey_step_completed"), step: z.number().int().min(1).max(5) })
    .strict(),
  z.object({ name: z.literal("journey_completed") }).strict(),
  z.object({ name: z.literal("handoff_attempted") }).strict(),
  z
    .object({
      name: z.literal("handoff_succeeded"),
      outcome: z.literal("succeeded"),
      durationBucket: measurementDurationBucketSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal("handoff_failed"),
      outcome: z.enum(["failed", "recovery-required"]),
      durationBucket: measurementDurationBucketSchema,
    })
    .strict(),
]);

export const measurementEventSchema = z
  .object({
    contract: z.literal("measurement.event"),
    version: z.literal(1),
    eventId: z.uuid(),
    idempotencyKey: opaqueIdentifierSchema,
    correlationId: opaqueIdentifierSchema,
    occurredAt: rfc3339TimestampSchema,
    environment: measurementEnvironmentSchema,
    flowId: z.uuid(),
    consentReceiptId: z.uuid(),
    synthetic: z.boolean(),
    data: measurementEventDataSchema,
  })
  .strict();

export const measurementEventInputSchema = measurementEventDataSchema;

export type MeasurementConsentCommand = z.infer<typeof measurementConsentCommandSchema>;
export type MeasurementEvent = z.infer<typeof measurementEventSchema>;
export type MeasurementEventInput = z.infer<typeof measurementEventInputSchema>;
export type MeasurementEnvironment = z.infer<typeof measurementEnvironmentSchema>;
