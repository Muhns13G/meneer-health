import type {
  FulfilmentCase,
  FulfilmentPartnerEventResult,
  VerifiedFulfilmentPartnerEvent,
} from "../../../contracts/fulfilment";

export type ApplyFulfilmentPartnerEvent = Readonly<{
  serviceIdentityId: string;
  event: VerifiedFulfilmentPartnerEvent;
}>;

export interface FulfilmentRepository {
  findCase(tenantId: string, workflowId: string): Promise<FulfilmentCase | null>;
  applyPartnerEvent(input: ApplyFulfilmentPartnerEvent): Promise<FulfilmentPartnerEventResult>;
}

export type FulfilmentRepositoryFailure =
  | "NOT_FOUND"
  | "GATE_DISABLED"
  | "CONFLICT"
  | "PENDING_RECONCILIATION"
  | "DEPENDENCY_UNAVAILABLE";

export class FulfilmentRepositoryError extends Error {
  constructor(readonly failure: FulfilmentRepositoryFailure) {
    super("The fulfilment operation could not be completed.");
    this.name = "FulfilmentRepositoryError";
  }
}
