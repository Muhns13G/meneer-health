import { describe, expect, it, vi } from "vitest";

import { FulfilmentRepositoryError, type FulfilmentRepository } from "./fulfilment-repository";
import { FulfilmentPartnerEventService } from "./fulfilment-partner-event-service";

const event = {
  contract: "fulfilment.partner",
  version: 1,
  provider: "precise_wellness",
  environment: "local",
  externalEventId: "synthetic_pathway_event_01",
  eventType: "pathway.handoff.accepted",
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
    version: 1,
    pathwayHandoffState: "accepted",
    pharmacyReleaseState: "not_started",
    hubCustodyState: "not_started",
    courierState: "not_started",
    reconciliationState: "pending",
    reconciliationCode: "CLINICAL_NOT_APPROVED",
  },
  eventId: "b0000000-0000-4000-8000-000000000021",
  replayed: false,
  applied: true,
} as const;

function setup() {
  const repository: FulfilmentRepository = {
    findCase: vi.fn(),
    applyPartnerEvent: vi.fn().mockResolvedValue(result),
  };
  return {
    repository,
    service: new FulfilmentPartnerEventService(repository, "80000000-0000-4000-8000-000000000001"),
  };
}

describe("FulfilmentPartnerEventService", () => {
  it("validates and persists only the normalised event", async () => {
    const { service, repository } = setup();
    await expect(service.handle(event)).resolves.toEqual({ ok: true, result });
    expect(repository.applyPartnerEvent).toHaveBeenCalledWith({
      serviceIdentityId: "80000000-0000-4000-8000-000000000001",
      event,
    });
  });

  it("rejects provider mismatch and prohibited extra fields before persistence", async () => {
    const { service, repository } = setup();
    await expect(
      service.handle({ ...event, provider: "courier", diagnosis: "prohibited" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { error: { code: "VALIDATION_FAILED" } },
    });
    expect(repository.applyPartnerEvent).not.toHaveBeenCalled();
  });

  it("fails closed while the release gate is disabled", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.applyPartnerEvent).mockRejectedValue(
      new FulfilmentRepositoryError("GATE_DISABLED"),
    );
    await expect(service.handle(event)).resolves.toMatchObject({
      ok: false,
      error: { error: { code: "FORBIDDEN", retry: "never" } },
    });
  });

  it("does not expose unexpected provider diagnostics", async () => {
    const { service, repository } = setup();
    vi.mocked(repository.applyPartnerEvent).mockRejectedValue(
      new Error("raw questionnaire response leaked"),
    );
    await expect(service.handle(event)).resolves.toMatchObject({
      ok: false,
      error: {
        error: {
          code: "INTERNAL_FAILURE",
          message: "The partner event could not be completed.",
        },
      },
    });
  });
});
