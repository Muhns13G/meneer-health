import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { FulfilmentRepositoryError } from "@/application/fulfilment/fulfilment-repository";
import { SupabaseFulfilmentRepository } from "./supabase-fulfilment-repository";

const event = {
  contract: "fulfilment.partner",
  version: 1,
  provider: "meneer_hub",
  environment: "local",
  externalEventId: "synthetic_hub_event_01",
  eventType: "hub.receipt.confirmed",
  workflowId: "a0000000-0000-4000-8000-000000000002",
  providerReferenceDigest: "a".repeat(64),
  payloadFingerprint: "b".repeat(64),
  occurredAt: "2030-01-01T00:10:00Z",
} as const;

const result = {
  fulfilment: {
    fulfilmentId: "b0000000-0000-4000-8000-000000000020",
    tenantId: "10000000-0000-4000-8000-000000000002",
    workflowId: event.workflowId,
    version: 3,
    pathwayHandoffState: "accepted",
    pharmacyReleaseState: "released",
    hubCustodyState: "received",
    courierState: "not_started",
    reconciliationState: "matched",
    reconciliationCode: "NONE",
    eligibleForFulfilmentAt: "2030-01-01T00:10:00.000Z",
  },
  eventId: "b0000000-0000-4000-8000-000000000021",
  replayed: false,
  applied: true,
} as const;

describe("SupabaseFulfilmentRepository", () => {
  it("passes only opaque normalised fields to the server-only RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const repository = new SupabaseFulfilmentRepository({ rpc } as unknown as SupabaseClient);
    await expect(
      repository.applyPartnerEvent({
        serviceIdentityId: "80000000-0000-4000-8000-000000000001",
        event,
      }),
    ).resolves.toEqual(result);
    expect(rpc).toHaveBeenCalledWith("apply_fulfilment_partner_event", {
      p_service_identity_id: "80000000-0000-4000-8000-000000000001",
      p_provider: "meneer_hub",
      p_environment: "local",
      p_external_event_id: event.externalEventId,
      p_event_type: event.eventType,
      p_workflow_id: event.workflowId,
      p_provider_reference_digest: event.providerReferenceDigest,
      p_payload_fingerprint: event.payloadFingerprint,
      p_occurred_at: event.occurredAt,
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(
      /address|questionnaire|diagnosis|prescription|trackingNumber/i,
    );
  });

  it("maps inactive gates to a safe repository failure", async () => {
    const repository = new SupabaseFulfilmentRepository({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "FULFILMENT_PARTNER_GATE_DISABLED" },
      }),
    } as unknown as SupabaseClient);
    await expect(
      repository.applyPartnerEvent({
        serviceIdentityId: "80000000-0000-4000-8000-000000000001",
        event,
      }),
    ).rejects.toEqual(new FulfilmentRepositoryError("GATE_DISABLED"));
  });
});
