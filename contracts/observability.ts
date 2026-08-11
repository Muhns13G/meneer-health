import { z } from "zod";

import { contractMajorSchema, opaqueIdentifierSchema } from "./shared";
import { requestRouteClassSchema, requestSecurityReasonSchema } from "./security";

export const telemetryEventContract = {
  name: "telemetry.event",
  kind: "telemetry-event",
  owner: "Operations and security",
  consumers: ["Cloudflare Workers Logs", "Monitoring policy"],
  version: 1,
  sensitivity: "internal",
  idempotency: "not-applicable",
  lifecycle: "active",
} as const;

export const telemetryEnvironmentSchema = z.enum(["local", "preview", "production"]);
export const telemetryEventNameSchema = z.enum([
  "request.completed",
  "request.denied",
  "authorisation.denied",
  "break_glass.denied",
  "incident.exercise",
]);
export const telemetryOutcomeSchema = z.enum(["succeeded", "denied", "failed"]);
export const telemetrySeveritySchema = z.enum(["info", "warning", "error", "critical"]);
export const telemetryStatusClassSchema = z.enum(["2xx", "3xx", "4xx", "5xx", "unavailable"]);
export const telemetryDurationBucketSchema = z.enum([
  "under-250ms",
  "250-999ms",
  "1-4s",
  "5-14s",
  "15s-plus",
]);
export const telemetryReasonCodeSchema = z.union([
  requestSecurityReasonSchema,
  z.literal("INTERNAL_FAILURE"),
]);

export const telemetryEventSchema = z
  .object({
    contract: z.literal("telemetry.event"),
    version: contractMajorSchema,
    occurredAt: z.iso.datetime({ offset: true }),
    environment: telemetryEnvironmentSchema,
    event: telemetryEventNameSchema,
    severity: telemetrySeveritySchema,
    outcome: telemetryOutcomeSchema,
    correlationId: opaqueIdentifierSchema,
    routeClass: requestRouteClassSchema.optional(),
    reasonCode: telemetryReasonCodeSchema.optional(),
    statusClass: telemetryStatusClassSchema.optional(),
    durationBucket: telemetryDurationBucketSchema.optional(),
  })
  .strict();

export type TelemetryEnvironment = z.infer<typeof telemetryEnvironmentSchema>;
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type TelemetryDurationBucket = z.infer<typeof telemetryDurationBucketSchema>;
