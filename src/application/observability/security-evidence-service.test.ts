import { describe, expect, it, vi } from "vitest";

import { authorisationPolicyVersion } from "@/domain/access/authorisation";
import type { SecurityEvidenceRepository } from "./security-evidence-repository";
import { SecurityEvidenceService } from "./security-evidence-service";

const receipt = { factId: crypto.randomUUID(), sequence: 1, eventHash: "a".repeat(64) };
const context = {
  tenantId: "10000000-0000-4000-8000-000000000002",
  actorId: "20000000-0000-4000-8000-000000000002",
  role: "operations",
  assurance: "aal2",
  subjectId: "20000000-0000-4000-8000-000000000001",
  resourceType: "fulfilment",
  resourceId: "a0000000-0000-4000-8000-000000000002",
  purpose: "operations",
  correlationId: "security_trace_01",
  occurredAt: new Date("2030-01-01T00:00:00Z"),
} as const;

describe("security evidence service", () => {
  it("maps an identified denied authorisation decision to safe durable evidence", async () => {
    const record = vi.fn(async () => receipt);
    const service = new SecurityEvidenceService({ record });

    await expect(
      service.recordHumanAuthorisationDenial(context, {
        allowed: false,
        reason: "RELATIONSHIP_REQUIRED",
        policyVersion: authorisationPolicyVersion,
      }),
    ).resolves.toEqual(receipt);
    expect(record).toHaveBeenCalledWith({
      tenantId: context.tenantId,
      actorId: context.actorId,
      subjectId: context.subjectId,
      resourceType: context.resourceType,
      resourceId: context.resourceId,
      purpose: context.purpose,
      correlationId: context.correlationId,
      occurredAt: context.occurredAt,
      actorType: "workforce",
      actorRole: "operations",
      assurance: "aal2",
      action: "authorisation.denied",
      policyVersion: authorisationPolicyVersion,
      reasonCode: "RELATIONSHIP_REQUIRED",
    });
  });

  it("refuses to misrepresent an allowed decision as denial evidence", async () => {
    const repository: SecurityEvidenceRepository = { record: vi.fn(async () => receipt) };
    const service = new SecurityEvidenceService(repository);

    await expect(
      service.recordHumanAuthorisationDenial(context, {
        allowed: true,
        reason: "ALLOWED",
        policyVersion: authorisationPolicyVersion,
        projection: "operations",
      }),
    ).rejects.toThrow("Allowed decisions are not denial evidence.");
    expect(repository.record).not.toHaveBeenCalled();
  });

  it("records only a denied, monitored break-glass attempt", async () => {
    const record = vi.fn(async () => receipt);
    const service = new SecurityEvidenceService({ record });

    await service.recordBreakGlassDenial(
      { ...context, role: "admin", purpose: "security_administration" },
      "BREAK_GLASS_DISABLED",
      "break-glass.v1",
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "breakglass.denied",
        reasonCode: "BREAK_GLASS_DISABLED",
      }),
    );
  });
});
