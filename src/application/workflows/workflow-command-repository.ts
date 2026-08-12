import type {
  WorkflowSnapshot,
  WorkflowTransition,
  WorkflowTransitionResult,
} from "../../../contracts/workflows";
import type { AuthenticationAssurance } from "@/domain/access/identity";
import type { AuthorisationPurpose } from "@/domain/access/authorisation";
import type { MembershipRole } from "@/domain/access/models";

export type ExecuteWorkflowTransition = Readonly<{
  tenantId: string;
  workflowId: string;
  commandName: "workflow.transition";
  requestId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  expectedVersion: number;
  transition: WorkflowTransition;
  occurredAt: Date;
  actorType: "patient" | "workforce";
  actorSubjectId: string;
  actorRole: MembershipRole;
  assurance: AuthenticationAssurance;
  subjectId: string;
  purpose: AuthorisationPurpose;
  policyVersion: string;
  correlationId: string;
  causationId: string;
}>;

export interface WorkflowCommandRepository {
  findWorkflow(tenantId: string, workflowId: string): Promise<WorkflowSnapshot | null>;
  executeTransition(command: ExecuteWorkflowTransition): Promise<WorkflowTransitionResult>;
}

export type WorkflowRepositoryFailure =
  | "NOT_FOUND"
  | "CONFLICT"
  | "PENDING_RECONCILIATION"
  | "DEPENDENCY_UNAVAILABLE";

export class WorkflowRepositoryError extends Error {
  constructor(readonly failure: WorkflowRepositoryFailure) {
    super("The workflow command could not be completed.");
    this.name = "WorkflowRepositoryError";
  }
}
