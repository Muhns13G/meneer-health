import type { IntegrationInboxReceipt } from "../../../contracts/audit";

export type ReceiveIntegrationMessage = Readonly<{
  tenantId: string;
  provider: string;
  environment: "local" | "preview" | "production";
  externalEventId: string;
  payloadFingerprint: string;
  correlationId: string;
  serviceIdentityId: string;
  receivedAt: Date;
  safeMetadata: Readonly<{
    eventName?: string;
  }>;
}>;

export interface IntegrationInboxRepository {
  receive(message: ReceiveIntegrationMessage): Promise<IntegrationInboxReceipt>;
}

export class IntegrationInboxRepositoryError extends Error {
  constructor() {
    super("The integration message could not be recorded.");
    this.name = "IntegrationInboxRepositoryError";
  }
}
