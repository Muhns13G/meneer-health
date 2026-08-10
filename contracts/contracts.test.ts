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
import {
  workflowTransitionCommandSchema,
  workflowTransitionContract,
  workflowTransitionResultSchema,
} from "./workflows";

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

describe("workflow command contracts", () => {
  const command = {
    contract: "workflow.transition",
    version: 1,
    requestId: "request_01",
    idempotencyKey: "retry_01",
    correlationId: "trace_01",
    actor: { type: "workforce", id: "20000000-0000-4000-8000-000000000002" },
    subjectId: "20000000-0000-4000-8000-000000000002",
    expectedVersion: 0,
    requestedAt: "2030-01-01T00:10:00Z",
    payload: {
      workflowId: "a0000000-0000-4000-8000-000000000002",
      transition: "supply.request",
    },
  } as const;

  it("accepts only the approved major, actor and transition payload", () => {
    expect(contractDefinitionSchema.parse(workflowTransitionContract)).toEqual(
      workflowTransitionContract,
    );
    expect(workflowTransitionCommandSchema.safeParse(command).success).toBe(true);
    expect(workflowTransitionCommandSchema.safeParse({ ...command, version: 2 }).success).toBe(
      false,
    );
    expect(
      workflowTransitionCommandSchema.safeParse({
        ...command,
        payload: { ...command.payload, authoritativeStatus: "approved" },
      }).success,
    ).toBe(false);
  });

  it("keeps every workflow authority explicit in committed results", () => {
    expect(
      workflowTransitionResultSchema.safeParse({
        replayed: false,
        workflowId: command.payload.workflowId,
        tenantId: "10000000-0000-4000-8000-000000000002",
        version: 1,
        clinicalState: "not_started",
        paymentState: "not_started",
        supplyState: "pending",
        hubReceiptState: "not_started",
        dispatchState: "not_ready",
        deliveryState: "not_started",
        cancellationState: "active",
        refundState: "not_required",
      }).success,
    ).toBe(true);
  });
});
