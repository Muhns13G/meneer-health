import { describe, expect, it } from "vitest";

import {
  measurementConsentCommandSchema,
  measurementEventSchema,
  measurementEventInputSchema,
} from "./measurement";

const common = {
  contract: "measurement.event",
  version: 1,
  eventId: "10000000-0000-4000-8000-000000000001",
  idempotencyKey: "measurement_event_0001",
  correlationId: "measurement_trace_01",
  occurredAt: "2030-01-01T00:00:00.000Z",
  environment: "local",
  flowId: "10000000-0000-4000-8000-000000000002",
  consentReceiptId: "10000000-0000-4000-8000-000000000003",
  synthetic: true,
} as const;

describe("pilot measurement contracts", () => {
  it("accepts only the nine allowlisted strict event shapes", () => {
    expect(
      measurementEventSchema.safeParse({
        ...common,
        data: { name: "campaign_arrived", campaignId: "dads" },
      }).success,
    ).toBe(true);
    expect(
      measurementEventSchema.safeParse({
        ...common,
        data: {
          name: "handoff_failed",
          outcome: "recovery-required",
          durationBucket: "30-119s",
        },
      }).success,
    ).toBe(true);
    expect(measurementEventInputSchema.options).toHaveLength(9);
  });

  it("rejects every prohibited identity, transport, replay, clinical, and free-text canary", () => {
    for (const prohibited of [
      { treatment: "peptides" },
      { email: "patient@example.invalid" },
      { phone: "+27000000000" },
      { ipAddress: "192.0.2.1" },
      { userAgent: "synthetic-browser-canary" },
      { url: "https://example.invalid/start?condition=peptides" },
      { query: "condition=peptides" },
      { referrer: "https://example.invalid/private-canary" },
      { sessionReplay: "synthetic-replay-canary" },
      { cookie: "synthetic-cookie-canary" },
      { paymentReference: "synthetic-payment-canary" },
      { notes: "free text" },
      { metadata: { arbitrary: true } },
    ]) {
      expect(
        measurementEventSchema.safeParse({
          ...common,
          data: { name: "journey_started", ...prohibited },
        }).success,
      ).toBe(false);
    }
  });

  it("keeps analytics consent separate and payload-free", () => {
    const command = {
      contract: "measurement.consent",
      version: 1,
      requestId: "10000000-0000-4000-8000-000000000004",
      idempotencyKey: "measurement_consent_01",
      correlationId: "measurement_trace_02",
      decision: "granted",
      requestedAt: "2030-01-01T00:00:00.000Z",
      synthetic: true,
    };
    expect(measurementConsentCommandSchema.safeParse(command).success).toBe(true);
    expect(
      measurementConsentCommandSchema.safeParse({ ...command, healthConsent: true }).success,
    ).toBe(false);
  });
});
