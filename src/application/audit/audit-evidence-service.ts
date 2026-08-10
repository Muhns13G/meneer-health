import { z } from "zod";

import type { ErrorContract } from "../../../contracts/errors";
import type { AuditReviewResult } from "../../../contracts/audit";
import { opaqueIdentifierSchema } from "../../../contracts/shared";
import type { AuthorisationService } from "@/application/authorisation/authorisation-service";
import type { WorkflowCommandRepository } from "@/application/workflows/workflow-command-repository";
import {
  isServerWorkflowActor,
  type ServerWorkflowActor,
} from "@/application/workflows/workflow-command-service";
import { resolveServerAuthorisationResource } from "@/domain/access/authorisation";
import {
  AuditEvidenceRepositoryError,
  type AuditEvidenceRepository,
} from "./audit-evidence-repository";

const auditReviewRequestSchema = z
  .object({
    workflowId: z.uuid(),
    correlationId: opaqueIdentifierSchema,
    limit: z.number().int().min(1).max(100),
  })
  .strict();

type AuditReviewOutcome =
  | Readonly<{ ok: true; result: AuditReviewResult }>
  | Readonly<{ ok: false; error: ErrorContract }>;

function safeError(
  correlationId: string,
  code: "VALIDATION_FAILED" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_FAILURE",
  message: string,
): ErrorContract {
  return {
    contract: "error.response",
    version: 1,
    correlationId,
    error: { code, message, retry: "never" },
  };
}

function isPrivilegedAuditor(actor: ServerWorkflowActor): actor is ServerWorkflowActor & {
  role: "auditor";
  assurance: "aal2";
} {
  return actor.role === "auditor" && actor.assurance === "aal2";
}

export class AuditEvidenceService {
  constructor(
    private readonly auditRepository: AuditEvidenceRepository,
    private readonly workflowRepository: WorkflowCommandRepository,
    private readonly authorisation: AuthorisationService,
  ) {}

  async review(actor: unknown, input: unknown): Promise<AuditReviewOutcome> {
    const parsed = auditReviewRequestSchema.safeParse(input);
    const correlationId = parsed.success ? parsed.data.correlationId : "correlation_unknown";
    if (!parsed.success) {
      return {
        ok: false,
        error: safeError(correlationId, "VALIDATION_FAILED", "The review request is invalid."),
      };
    }
    if (!isServerWorkflowActor(actor)) {
      return {
        ok: false,
        error: safeError(correlationId, "UNAUTHENTICATED", "Authentication is required."),
      };
    }
    if (!isPrivilegedAuditor(actor)) {
      return {
        ok: false,
        error: safeError(correlationId, "FORBIDDEN", "The action is not permitted."),
      };
    }

    try {
      const workflow = await this.workflowRepository.findWorkflow(
        actor.tenantId,
        parsed.data.workflowId,
      );
      if (!workflow) {
        return {
          ok: false,
          error: safeError(correlationId, "NOT_FOUND", "The resource was not found."),
        };
      }

      const observedAt = new Date(actor.observedAtEpochMs);
      const decision = await this.authorisation.authoriseHuman(
        actor.providerSessionId,
        actor.role,
        {
          action: "read",
          purpose: "privacy_review",
          observedAt,
          resource: resolveServerAuthorisationResource({
            tenantId: workflow.tenantId,
            type: "audit_evidence",
            id: workflow.workflowId,
            ownerSubjectId: workflow.subjectId,
            workflowState: "active",
            restriction: "none",
            allowedPurposes: ["privacy_review"],
          }),
        },
      );
      if (!decision.allowed) {
        return {
          ok: false,
          error: safeError(correlationId, "FORBIDDEN", "The action is not permitted."),
        };
      }

      const result = await this.auditRepository.reviewEvidence({
        tenantId: actor.tenantId,
        aggregateId: workflow.workflowId,
        actorSubjectId: actor.subjectId,
        actorRole: actor.role,
        assurance: actor.assurance,
        purpose: "privacy_review",
        policyVersion: decision.policyVersion,
        correlationId,
        occurredAt: observedAt,
        limit: parsed.data.limit,
      });
      return { ok: true, result };
    } catch (error) {
      if (error instanceof AuditEvidenceRepositoryError) {
        return {
          ok: false,
          error: safeError(correlationId, "INTERNAL_FAILURE", "The review could not be completed."),
        };
      }
      return {
        ok: false,
        error: safeError(correlationId, "INTERNAL_FAILURE", "The review could not be completed."),
      };
    }
  }
}
