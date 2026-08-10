import { z } from "zod";

import { contractMajorSchema, opaqueIdentifierSchema } from "./shared";

export const requestSecurityReasonSchema = z.enum([
  "ALLOWED",
  "ANTI_AUTOMATION_FAILED",
  "BODY_NOT_ALLOWED",
  "BODY_TOO_LARGE",
  "CONTENT_TYPE_REJECTED",
  "DEPENDENCY_UNAVAILABLE",
  "DIRECT_ENDPOINT_DENIED",
  "DUPLICATE_CONTROL_REQUIRED",
  "HEADER_LIMIT_EXCEEDED",
  "MALFORMED_BODY",
  "METHOD_NOT_ALLOWED",
  "ORIGIN_REJECTED",
  "RATE_LIMITED",
  "REQUEST_TIMEOUT",
  "URL_LIMIT_EXCEEDED",
]);

export const requestRouteClassSchema = z.enum([
  "public-read",
  "protected-command",
  "provider-callback",
  "unknown",
]);

export const requestSecurityDecisionSchema = z
  .object({
    contract: z.literal("security.request-decision"),
    version: contractMajorSchema,
    correlationId: opaqueIdentifierSchema,
    outcome: z.enum(["allowed", "denied"]),
    reason: requestSecurityReasonSchema,
    routeClass: requestRouteClassSchema,
  })
  .strict();

export type RequestSecurityDecision = z.infer<typeof requestSecurityDecisionSchema>;
export type RequestSecurityReason = z.infer<typeof requestSecurityReasonSchema>;
export type RequestRouteClass = z.infer<typeof requestRouteClassSchema>;
