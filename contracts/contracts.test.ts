import { describe, expect, it } from "vitest";

import { contractDefinitionSchema } from "./catalogue";
import { commandEnvelopeSchema, eventEnvelopeSchema } from "./envelopes";
import { errorContractSchema, stableErrorCodes } from "./errors";
import {
  invalidCommandFixtures,
  validCommandEnvelope,
  validEventEnvelope,
} from "./fixtures/envelopes";
import {
  assertSupportedContractMajor,
  supportsContractMajor,
  UnsupportedContractMajorError,
} from "./versioning";

describe("canonical contract envelopes", () => {
  it("accepts a framework-neutral command fixture", () => {
    expect(commandEnvelopeSchema.parse(validCommandEnvelope)).toEqual(validCommandEnvelope);
  });

  it("accepts a framework-neutral committed-event fixture", () => {
    expect(eventEnvelopeSchema.parse(validEventEnvelope)).toEqual(validEventEnvelope);
  });

  it.each(invalidCommandFixtures)("rejects malformed or unauthorised command fields", (fixture) => {
    expect(commandEnvelopeSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects framework or provider objects hidden in the envelope", () => {
    const result = eventEnvelopeSchema.safeParse({ ...validEventEnvelope, headers: new Headers() });

    expect(result.success).toBe(false);
  });
});

describe("stable errors", () => {
  it("implements every error class required by DR-004", () => {
    expect(stableErrorCodes).toEqual([
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
    ]);
  });

  it("accepts a safe machine-readable error", () => {
    expect(
      errorContractSchema.safeParse({
        contract: "error.response",
        version: 1,
        correlationId: "trace_01",
        error: {
          code: "DEPENDENCY_UNAVAILABLE",
          message: "The service is temporarily unavailable.",
          retry: "after-delay",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown codes and multi-line diagnostic leakage", () => {
    expect(
      errorContractSchema.safeParse({
        contract: "error.response",
        version: 1,
        correlationId: "trace_01",
        error: {
          code: "DATABASE_STACK_TRACE",
          message: "Database failed\nselect * from patient",
          retry: "safe",
        },
      }).success,
    ).toBe(false);
  });
});

describe("catalogue and major-version compatibility", () => {
  const supportedMajors = { "example.perform": [1] } as const;

  it("requires ownership, consumers, sensitivity, idempotency, and lifecycle metadata", () => {
    expect(
      contractDefinitionSchema.safeParse({
        name: "example.perform",
        kind: "command",
        owner: "Example module",
        consumers: ["Example adapter"],
        version: 1,
        sensitivity: "internal",
        idempotency: "required",
        lifecycle: "active",
      }).success,
    ).toBe(true);
  });

  it("accepts only explicitly registered positive integer majors", () => {
    expect(supportsContractMajor(supportedMajors, "example.perform", 1)).toBe(true);
    expect(supportsContractMajor(supportedMajors, "example.perform", 2)).toBe(false);
    expect(supportsContractMajor(supportedMajors, "example.perform", 1.5)).toBe(false);
  });

  it("rejects an unsupported major before boundary processing", () => {
    expect(() => assertSupportedContractMajor(supportedMajors, "example.perform", 2)).toThrow(
      UnsupportedContractMajorError,
    );
  });
});
