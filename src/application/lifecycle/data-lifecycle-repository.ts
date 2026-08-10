import type { DataSubjectRequestResult } from "../../../contracts/lifecycle";

export type DataSubjectRequestContext = Readonly<{
  tenantId: string;
  subjectId: string;
  actorSubjectId: string;
  actorRole: "auditor" | "admin";
  assurance: "aal2";
  purpose: "privacy_review";
  correlationId: string;
  occurredAt: Date;
}>;

export interface DataLifecycleRepository {
  openRequest(
    context: DataSubjectRequestContext,
    requestType: "access_export" | "erasure",
    idempotencyKey: string,
  ): Promise<DataSubjectRequestResult>;
  completeExport(
    context: DataSubjectRequestContext,
    requestId: string,
  ): Promise<DataSubjectRequestResult>;
  executeErasure(
    context: DataSubjectRequestContext,
    requestId: string,
  ): Promise<DataSubjectRequestResult>;
  reconcileDestination(
    context: DataSubjectRequestContext,
    requestId: string,
    destination: "identity" | "storage" | "recovery_backup",
  ): Promise<DataSubjectRequestResult>;
}

export class DataLifecycleRepositoryError extends Error {
  constructor() {
    super("The data lifecycle operation could not be completed.");
    this.name = "DataLifecycleRepositoryError";
  }
}
