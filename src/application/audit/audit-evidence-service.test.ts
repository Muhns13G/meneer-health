import { describe, expect, it, vi } from "vitest";

import type { AuthorisationService } from "@/application/authorisation/authorisation-service";
import type { WorkflowCommandRepository } from "@/application/workflows/workflow-command-repository";
import { resolveServerWorkflowActor } from "@/application/workflows/workflow-command-service";
import type { AuditEvidenceRepository } from "./audit-evidence-repository";
import { AuditEvidenceService } from "./audit-evidence-service";

const tenantId = "10000000-0000-4000-8000-000000000002";
const subjectId = "20000000-0000-4000-8000-000000000002";
const auditorId = "20000000-0000-4000-8000-000000000003";
const workflowId = "a0000000-0000-4000-8000-000000000002";

const workflow = {
  workflowId,
  tenantId,
  subjectId,
  version: 1,
  clinicalState: "not_started",
  paymentState: "not_started",
  supplyState: "pending",
  hubReceiptState: "not_started",
  dispatchState: "not_ready",
  deliveryState: "not_started",
  cancellationState: "active",
  refundState: "not_required",
} as const;

const result = {
  reviewId: "b0000000-0000-4000-8000-000000000004",
  reviewedAt: "2030-01-01T00:20:00Z",
  reviewedThroughSequence: 1,
  chainVerified: true,
  events: [],
} as const;

function actor(role: "auditor" | "operations" = "auditor", assurance: "aal1" | "aal2" = "aal2") {
  return resolveServerWorkflowActor({
    providerSessionId: "71000000-0000-4000-8000-000000000003",
    subjectId: auditorId,
    tenantId,
    role,
    assurance,
    observedAt: new Date("2030-01-01T00:20:00Z"),
  });
}

function setup(allowed = true) {
  const auditRepository: AuditEvidenceRepository = {
    reviewEvidence: vi.fn().mockResolvedValue(result),
  };
  const workflowRepository = {
    findWorkflow: vi.fn().mockResolvedValue(workflow),
  } as unknown as WorkflowCommandRepository;
  const authorisation = {
    authoriseHuman: vi
      .fn()
      .mockResolvedValue(
        allowed
          ? { allowed: true, projection: "evidence", policyVersion: "authorisation.v1" }
          : { allowed: false, reason: "ROLE_ACTION_DENIED", policyVersion: "authorisation.v1" },
      ),
  } as unknown as AuthorisationService;
  return {
    auditRepository,
    workflowRepository,
    authorisation,
    service: new AuditEvidenceService(auditRepository, workflowRepository, authorisation),
  };
}

describe("AuditEvidenceService", () => {
  it("authorises a purpose-bound AAL2 auditor and records the review", async () => {
    const { service, auditRepository, authorisation } = setup();

    await expect(
      service.review(actor(), { workflowId, correlationId: "audit_review_01", limit: 50 }),
    ).resolves.toEqual({ ok: true, result });
    expect(authorisation.authoriseHuman).toHaveBeenCalledWith(
      expect.any(String),
      "auditor",
      expect.objectContaining({ action: "read", purpose: "privacy_review" }),
    );
    expect(auditRepository.reviewEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        actorRole: "auditor",
        assurance: "aal2",
        aggregateId: workflowId,
        policyVersion: "authorisation.v1",
      }),
    );
  });

  it("rejects raw actor objects and malformed review requests", async () => {
    const { service, auditRepository } = setup();

    await expect(
      service.review(
        { role: "auditor" },
        { workflowId, correlationId: "audit_review_01", limit: 50 },
      ),
    ).resolves.toMatchObject({ ok: false, error: { error: { code: "UNAUTHENTICATED" } } });
    await expect(
      service.review(actor(), { workflowId, correlationId: "audit_review_01", limit: 101 }),
    ).resolves.toMatchObject({ ok: false, error: { error: { code: "VALIDATION_FAILED" } } });
    expect(auditRepository.reviewEvidence).not.toHaveBeenCalled();
  });

  it("requires the dedicated auditor role and AAL2 assurance", async () => {
    const { service, auditRepository } = setup();

    await expect(
      service.review(actor("operations"), {
        workflowId,
        correlationId: "audit_review_01",
        limit: 50,
      }),
    ).resolves.toMatchObject({ ok: false, error: { error: { code: "FORBIDDEN" } } });
    await expect(
      service.review(actor("auditor", "aal1"), {
        workflowId,
        correlationId: "audit_review_01",
        limit: 50,
      }),
    ).resolves.toMatchObject({ ok: false, error: { error: { code: "FORBIDDEN" } } });
    expect(auditRepository.reviewEvidence).not.toHaveBeenCalled();
  });

  it("does not query evidence when contextual authorisation denies", async () => {
    const { service, auditRepository } = setup(false);

    await expect(
      service.review(actor(), { workflowId, correlationId: "audit_review_01", limit: 50 }),
    ).resolves.toMatchObject({ ok: false, error: { error: { code: "FORBIDDEN" } } });
    expect(auditRepository.reviewEvidence).not.toHaveBeenCalled();
  });
});
