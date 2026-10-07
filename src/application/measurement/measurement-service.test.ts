import { describe, expect, it, vi } from "vitest";

import type { MeasurementRepository } from "./measurement-repository";
import {
  measurementFlowTtlMs,
  MeasurementService,
  measurementWithdrawalDeletionMs,
} from "./measurement-service";

const now = new Date("2030-01-01T00:00:00.000Z");
const command = {
  contract: "measurement.consent",
  version: 1,
  requestId: "10000000-0000-4000-8000-000000000004",
  idempotencyKey: "measurement_consent_01",
  correlationId: "measurement_trace_01",
  decision: "granted",
  requestedAt: now.toISOString(),
  synthetic: true,
} as const;

function repository(): MeasurementRepository {
  return {
    grantConsent: vi.fn(async (_command, flowId, consentReceiptId, expiresAt) => ({
      flowId,
      consentReceiptId,
      status: "granted" as const,
      expiresAt,
    })),
    withdrawConsent: vi.fn(async (_command, flowId, deleteAfter) => ({
      flowId,
      consentReceiptId: "10000000-0000-4000-8000-000000000003",
      status: "withdrawn" as const,
      expiresAt: new Date(now.getTime() + measurementFlowTtlMs),
      deleteAfter,
    })),
    recordEvent: vi.fn(async (event) => ({ eventId: event.eventId, replayed: false })),
  };
}

describe("measurement service", () => {
  it("creates an isolated 30-minute consented flow", async () => {
    const storage = repository();
    const service = new MeasurementService(storage, "local", () => now);
    const receipt = await service.grant(command);

    expect(receipt.expiresAt.toISOString()).toBe(
      new Date(now.getTime() + measurementFlowTtlMs).toISOString(),
    );
    expect(storage.grantConsent).toHaveBeenCalledWith(
      command,
      expect.any(String),
      expect.any(String),
      receipt.expiresAt,
      "local",
    );
  });

  it("stops collection and schedules withdrawal deletion within seven days", async () => {
    const storage = repository();
    const service = new MeasurementService(storage, "local", () => now);
    const withdrawn = await service.withdraw(
      { ...command, decision: "withdrawn", idempotencyKey: "measurement_withdraw_01" },
      "10000000-0000-4000-8000-000000000002",
    );

    expect(withdrawn.deleteAfter?.toISOString()).toBe(
      new Date(now.getTime() + measurementWithdrawalDeletionMs).toISOString(),
    );
  });

  it("constructs only the validated server-owned event envelope", async () => {
    const storage = repository();
    const service = new MeasurementService(storage, "preview", () => now);
    await service.record(
      { name: "journey_step_completed", step: 2 },
      {
        flowId: "10000000-0000-4000-8000-000000000002",
        consentReceiptId: "10000000-0000-4000-8000-000000000003",
        idempotencyKey: "measurement_event_0001",
        correlationId: "measurement_trace_01",
        synthetic: true,
      },
    );

    expect(storage.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        contract: "measurement.event",
        environment: "preview",
        data: { name: "journey_step_completed", step: 2 },
      }),
    );
  });
});
