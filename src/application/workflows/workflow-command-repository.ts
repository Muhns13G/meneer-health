import type {
  WorkflowSnapshot,
  WorkflowTransition,
  WorkflowTransitionResult,
} from "../../../contracts/workflows";

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
