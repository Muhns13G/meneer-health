import { describe, expect, it, vi } from "vitest";

import { MeasurementRepositoryError } from "@/application/measurement/measurement-repository";
import { SupabaseMeasurementRepository } from "./supabase-measurement-repository";

const command = {
  contract: "measurement.consent",
  version: 1,
  requestId: "10000000-0000-4000-8000-000000000004",
  idempotencyKey: "measurement_consent_01",
  correlationId: "measurement_trace_01",
  decision: "granted",
  requestedAt: "2030-01-01T00:00:00.000Z",
  synthetic: true,
} as const;

describe("Supabase measurement adapter", () => {
  it("maps consent to the narrow server-only RPC", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        flowId: "10000000-0000-4000-8000-000000000002",
        consentReceiptId: "10000000-0000-4000-8000-000000000003",
        status: "granted",
        expiresAt: "2030-01-01T00:30:00.000Z",
        deleteAfter: null,
      },
      error: null,
    }));
    const adapter = new SupabaseMeasurementRepository({ rpc } as never);
    await adapter.grantConsent(
      command,
      "10000000-0000-4000-8000-000000000002",
      "10000000-0000-4000-8000-000000000003",
      new Date("2030-01-01T00:30:00.000Z"),
      "local",
    );

    expect(rpc).toHaveBeenCalledWith(
      "grant_measurement_consent",
      expect.objectContaining({ p_environment: "local", p_synthetic: true }),
    );
  });

  it("maps only allowlisted event columns and normalises provider failures", async () => {
    const rpc = vi.fn(async () => ({
      data: { eventId: "10000000-0000-4000-8000-000000000001", replayed: false },
      error: null,
    }));
    const adapter = new SupabaseMeasurementRepository({ rpc } as never);
    await adapter.recordEvent({
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
      data: { name: "campaign_arrived", campaignId: "dads" },
    });
    expect(rpc).toHaveBeenCalledWith(
      "record_measurement_event",
      expect.objectContaining({
        p_campaign_id: "dads",
        p_step: null,
        p_outcome: null,
        p_duration_bucket: null,
      }),
    );

    const failing = new SupabaseMeasurementRepository({
      rpc: vi.fn(async () => ({ data: null, error: { message: "private detail" } })),
    } as never);
    await expect(
      failing.grantConsent(
        command,
        "10000000-0000-4000-8000-000000000002",
        "10000000-0000-4000-8000-000000000003",
        new Date("2030-01-01T00:30:00.000Z"),
        "local",
      ),
    ).rejects.toBeInstanceOf(MeasurementRepositoryError);
  });
});
