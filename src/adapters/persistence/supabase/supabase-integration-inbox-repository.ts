import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  integrationInboxReceiptSchema,
  type IntegrationInboxReceipt,
} from "../../../../contracts/audit";
import {
  IntegrationInboxRepositoryError,
  type IntegrationInboxRepository,
  type ReceiveIntegrationMessage,
} from "@/application/integration/integration-inbox-repository";

export class SupabaseIntegrationInboxRepository implements IntegrationInboxRepository {
  constructor(private readonly client: SupabaseClient) {}

  async receive(message: ReceiveIntegrationMessage): Promise<IntegrationInboxReceipt> {
    const { data, error } = await this.client.rpc("record_integration_inbox", {
      p_tenant_id: message.tenantId,
      p_provider: message.provider,
      p_environment: message.environment,
      p_external_event_id: message.externalEventId,
      p_payload_fingerprint: message.payloadFingerprint,
      p_correlation_id: message.correlationId,
      p_service_identity_id: message.serviceIdentityId,
      p_received_at: message.receivedAt.toISOString(),
      p_safe_metadata: message.safeMetadata,
    });
    if (error) throw new IntegrationInboxRepositoryError();
    const parsed = integrationInboxReceiptSchema.safeParse(data);
    if (!parsed.success) throw new IntegrationInboxRepositoryError();
    return parsed.data;
  }
}
