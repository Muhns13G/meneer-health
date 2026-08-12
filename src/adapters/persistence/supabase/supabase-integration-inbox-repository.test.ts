import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { IntegrationInboxRepositoryError } from "@/application/integration/integration-inbox-repository";
import { SupabaseIntegrationInboxRepository } from "./supabase-integration-inbox-repository";

const message = {
  tenantId: "10000000-0000-4000-8000-000000000002",
  provider: "synthetic",
  environment: "local",
  externalEventId: "provider_event_01",
  payloadFingerprint: "a".repeat(64),
  correlationId: "integration_trace_01",
  serviceIdentityId: "80000000-0000-4000-8000-000000000001",
  receivedAt: new Date("2030-01-01T00:10:00Z"),
  safeMetadata: { eventName: "synthetic.received" },
} as const;

const receipt = {
  contract: "integration.received",
  version: 1,
  inboxId: "b0000000-0000-4000-8000-000000000003",
  tenantId: message.tenantId,
  provider: message.provider,
  environment: message.environment,
  externalEventId: message.externalEventId,
  correlationId: message.correlationId,
  status: "verified",
  replayed: false,
  receivedAt: "2030-01-01T00:10:00Z",
};

describe("SupabaseIntegrationInboxRepository", () => {
  it("records only the fingerprint and approved safe metadata", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: receipt, error: null });
    const repository = new SupabaseIntegrationInboxRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.receive(message)).resolves.toEqual(receipt);
    expect(rpc).toHaveBeenCalledWith(
      "record_integration_inbox",
      expect.objectContaining({
        p_payload_fingerprint: "a".repeat(64),
        p_safe_metadata: { eventName: "synthetic.received" },
      }),
    );
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("payload_body");
  });

  it("fails closed for provider errors and malformed receipts", async () => {
    const providerFailure = new SupabaseIntegrationInboxRepository({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } }),
    } as unknown as SupabaseClient);
    const malformed = new SupabaseIntegrationInboxRepository({
      rpc: vi.fn().mockResolvedValue({ data: { status: "accepted" }, error: null }),
    } as unknown as SupabaseClient);

    await expect(providerFailure.receive(message)).rejects.toBeInstanceOf(
      IntegrationInboxRepositoryError,
    );
    await expect(malformed.receive(message)).rejects.toBeInstanceOf(
      IntegrationInboxRepositoryError,
    );
  });
});
