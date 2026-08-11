import { describe, expect, it } from "vitest";

import {
  auditFactContract,
  auditFactSchema,
  integrationInboxContract,
  integrationInboxReceiptSchema,
  workflowTransitionedEventContract,
  workflowTransitionedEventSchema,
} from "./audit";
import { contractDefinitionSchema } from "./catalogue";
import { commandEnvelopeSchema, eventEnvelopeSchema } from "./envelopes";
import { errorContractSchema, stableErrorCodes } from "./errors";
import { fulfilmentPartnerEventContract, verifiedFulfilmentPartnerEventSchema } from "./fulfilment";
import {
  dataSubjectRequestContract,
  dataSubjectRequestResultSchema,
  recoveryArchiveContract,
  recoveryManifestSchema,
} from "./lifecycle";
import { telemetryEventContract, telemetryEventSchema } from "./observability";
import {
  paymentCheckoutCommandSchema,
  paymentCheckoutContract,
  paymentProviderEventContract,
  verifiedPaymentProviderEventSchema,
} from "./payments";
import { requestSecurityDecisionSchema } from "./security";
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

describe("request security evidence", () => {
  it("accepts a portable safe denial decision", () => {
    expect(
      requestSecurityDecisionSchema.safeParse({
        contract: "security.request-decision",
        version: 1,
        correlationId: "trace_request_01",
        outcome: "denied",
        reason: "RATE_LIMITED",
        routeClass: "protected-command",
      }).success,
    ).toBe(true);
  });

  it("rejects raw request or challenge material", () => {
    expect(
      requestSecurityDecisionSchema.safeParse({
        contract: "security.request-decision",
        version: 1,
        correlationId: "trace_request_01",
        outcome: "denied",
        reason: "ANTI_AUTOMATION_FAILED",
        routeClass: "protected-command",
        token: "must-not-be-recorded",
      }).success,
    ).toBe(false);
  });
});

describe("privacy-safe observability evidence", () => {
  it("registers and accepts the allowlisted telemetry contract", () => {
    expect(contractDefinitionSchema.parse(telemetryEventContract)).toEqual(telemetryEventContract);
    expect(
      telemetryEventSchema.safeParse({
        contract: "telemetry.event",
        version: 1,
        occurredAt: "2030-01-01T00:00:00.000Z",
        environment: "local",
        event: "request.completed",
        severity: "info",
        outcome: "succeeded",
        correlationId: "synthetic_trace_01",
        routeClass: "public-read",
        statusClass: "2xx",
        durationBucket: "under-250ms",
      }).success,
    ).toBe(true);
  });
});

describe("lifecycle and recovery evidence", () => {
  it("registers the rights workflow and strict recovery manifest", () => {
    expect(contractDefinitionSchema.parse(dataSubjectRequestContract)).toEqual(
      dataSubjectRequestContract,
    );
    expect(contractDefinitionSchema.parse(recoveryArchiveContract)).toEqual(
      recoveryArchiveContract,
    );
    expect(
      dataSubjectRequestResultSchema.safeParse({
        requestId: "b0000000-0000-4000-8000-000000000013",
        status: "pending_reconciliation",
        expiresAt: null,
        reconciliationPending: ["identity", "storage", "recovery_backup"],
      }).success,
    ).toBe(true);
    expect(
      recoveryManifestSchema.safeParse({
        contract: "recovery.manifest",
        version: 1,
        createdAt: "2030-01-01T00:00:00.000Z",
        environment: "local",
        backupId: "b0000000-0000-4000-8000-000000000013",
        schemaVersion: "20260810222608",
        recordCounts: { subjects: 3 },
        checksum: "a".repeat(64),
        patient: "prohibited",
      }).success,
    ).toBe(false);
  });
});

describe("payment contracts", () => {
  it("registers one-time checkout and signed provider-event boundaries", () => {
    expect(contractDefinitionSchema.parse(paymentCheckoutContract)).toEqual(
      paymentCheckoutContract,
    );
    expect(contractDefinitionSchema.parse(paymentProviderEventContract)).toEqual(
      paymentProviderEventContract,
    );
  });

  it("accepts an opaque checkout command and rejects health or browser amounts", () => {
    const command = {
      contract: "payment.checkout",
      version: 1,
      requestId: "payment_request_01",
      idempotencyKey: "payment_retry_01",
      correlationId: "payment_trace_01",
      actor: { type: "patient", id: "20000000-0000-4000-8000-000000000001" },
      subjectId: "20000000-0000-4000-8000-000000000001",
      expectedVersion: 0,
      requestedAt: "2030-01-01T00:10:00Z",
      payload: {
        workflowId: "a0000000-0000-4000-8000-000000000001",
        scenario: "consultation_only",
      },
    };

    expect(paymentCheckoutCommandSchema.safeParse(command).success).toBe(true);
    expect(
      paymentCheckoutCommandSchema.safeParse({
        ...command,
        payload: { ...command.payload, amount: 123, diagnosis: "prohibited" },
      }).success,
    ).toBe(false);
  });

  it("keeps the verified provider event strict and free of health payloads", () => {
    const event = {
      contract: "payment.provider",
      version: 1,
      provider: "stripe",
      environment: "local",
      externalEventId: "evt_synthetic_0001",
      eventType: "checkout.session.completed",
      orderId: "b0000000-0000-4000-8000-000000000014",
      checkoutSessionId: "cs_test_synthetic_0001",
      paymentIntentId: "pi_synthetic_0001",
      paymentStatus: "paid",
      occurredAt: "2030-01-01T00:10:00Z",
      payloadFingerprint: "a".repeat(64),
    };

    expect(verifiedPaymentProviderEventSchema.safeParse(event).success).toBe(true);
    expect(
      verifiedPaymentProviderEventSchema.safeParse({
        ...event,
        questionnaireResponse: "prohibited",
      }).success,
    ).toBe(false);
  });
});

describe("fulfilment partner contracts", () => {
  const event = {
    contract: "fulfilment.partner",
    version: 1,
    provider: "dispensing_pharmacy",
    environment: "local",
    externalEventId: "synthetic_pharmacy_event_01",
    eventType: "pharmacy.release.confirmed",
    workflowId: "a0000000-0000-4000-8000-000000000002",
    providerReferenceDigest: "a".repeat(64),
    payloadFingerprint: "b".repeat(64),
    occurredAt: "2030-01-01T00:10:00Z",
  } as const;

  it("registers the minimum-data provider boundary", () => {
    expect(contractDefinitionSchema.parse(fulfilmentPartnerEventContract)).toEqual(
      fulfilmentPartnerEventContract,
    );
    expect(verifiedFulfilmentPartnerEventSchema.safeParse(event).success).toBe(true);
  });

  it("rejects mismatched providers and operational or health payloads", () => {
    expect(
      verifiedFulfilmentPartnerEventSchema.safeParse({ ...event, provider: "courier" }).success,
    ).toBe(false);
    expect(
      verifiedFulfilmentPartnerEventSchema.safeParse({
        ...event,
        address: "prohibited",
        questionnaireResponse: "prohibited",
        trackingNumber: "prohibited",
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

describe("audit and integration evidence contracts", () => {
  it("registers the append-only audit, event and inbox families", () => {
    expect(contractDefinitionSchema.parse(auditFactContract)).toEqual(auditFactContract);
    expect(contractDefinitionSchema.parse(workflowTransitionedEventContract)).toEqual(
      workflowTransitionedEventContract,
    );
    expect(contractDefinitionSchema.parse(integrationInboxContract)).toEqual(
      integrationInboxContract,
    );
  });

  it("accepts a minimum safe audit fact and rejects unapproved metadata", () => {
    const fact = {
      contract: "audit.fact",
      version: 1,
      factId: "b0000000-0000-4000-8000-000000000001",
      sequence: 1,
      tenantId: "10000000-0000-4000-8000-000000000002",
      actor: {
        type: "workforce",
        id: "20000000-0000-4000-8000-000000000002",
        role: "operations",
        assurance: "aal2",
      },
      action: "workflow.transition",
      subjectId: "20000000-0000-4000-8000-000000000002",
      resource: { type: "workflow", id: "a0000000-0000-4000-8000-000000000002" },
      purpose: "operations",
      policyVersion: "authorisation.v1",
      outcome: "succeeded",
      reasonCode: "COMMAND_COMMITTED",
      correlationId: "trace_01",
      causationId: "request_01",
      occurredAt: "2030-01-01T00:10:00Z",
      recordedAt: "2030-01-01T00:10:01Z",
      metadata: { transition: "supply.request", aggregateVersion: 1 },
      previousHash: "0".repeat(64),
      eventHash: "a".repeat(64),
    } as const;

    expect(auditFactSchema.safeParse(fact).success).toBe(true);
    expect(
      auditFactSchema.safeParse({ ...fact, metadata: { questionnaireResponse: "private" } })
        .success,
    ).toBe(false);
  });

  it("keeps outbox and inbox contracts minimal and provider neutral", () => {
    expect(
      workflowTransitionedEventSchema.safeParse({
        eventId: "b0000000-0000-4000-8000-000000000002",
        event: "workflow.transitioned",
        version: 1,
        aggregate: {
          type: "workflow",
          id: "a0000000-0000-4000-8000-000000000002",
          version: 1,
        },
        occurredAt: "2030-01-01T00:10:00Z",
        recordedAt: "2030-01-01T00:10:01Z",
        actor: { type: "workforce", id: "20000000-0000-4000-8000-000000000002" },
        correlationId: "trace_01",
        causationId: "request_01",
        payload: { transition: "supply.request" },
      }).success,
    ).toBe(true);
    expect(
      integrationInboxReceiptSchema.safeParse({
        contract: "integration.received",
        version: 1,
        inboxId: "b0000000-0000-4000-8000-000000000003",
        tenantId: "10000000-0000-4000-8000-000000000002",
        provider: "synthetic",
        environment: "local",
        externalEventId: "provider_event_01",
        correlationId: "trace_02",
        status: "verified",
        replayed: false,
        receivedAt: "2030-01-01T00:10:00Z",
      }).success,
    ).toBe(true);
  });
});
