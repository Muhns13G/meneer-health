import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fulfilmentCaseSchema,
  fulfilmentPartnerEventResultSchema,
  type FulfilmentCase,
  type FulfilmentPartnerEventResult,
} from "../../../../contracts/fulfilment";
import {
  FulfilmentRepositoryError,
  type ApplyFulfilmentPartnerEvent,
  type FulfilmentRepository,
  type FulfilmentRepositoryFailure,
} from "@/application/fulfilment/fulfilment-repository";

type ProviderError = Readonly<{ code?: string; message?: string }>;

type FulfilmentRow = Readonly<{
  id: string;
  tenant_id: string;
  workflow_id: string;
  version: number;
  pathway_handoff_state: string;
  pharmacy_release_state: string;
  hub_custody_state: string;
  courier_state: string;
  reconciliation_state: string;
  reconciliation_code: string;
  eligible_for_fulfilment_at: string | null;
}>;

function providerFailure(error: ProviderError): FulfilmentRepositoryFailure {
  if (error.message?.includes("NOT_FOUND") || error.code === "P0002") return "NOT_FOUND";
  if (error.message?.includes("GATE_DISABLED") || error.code === "42501") {
    return "GATE_DISABLED";
  }
  if (error.message?.includes("RECONCILIATION")) return "PENDING_RECONCILIATION";
  if (
    ["22023", "23505", "23514", "40001"].includes(error.code ?? "") ||
    error.message?.startsWith("FULFILMENT_")
  ) {
    return "CONFLICT";
  }
  return "DEPENDENCY_UNAVAILABLE";
}

function mapCase(row: FulfilmentRow): FulfilmentCase {
  return fulfilmentCaseSchema.parse({
    fulfilmentId: row.id,
    tenantId: row.tenant_id,
    workflowId: row.workflow_id,
    version: row.version,
    pathwayHandoffState: row.pathway_handoff_state,
    pharmacyReleaseState: row.pharmacy_release_state,
    hubCustodyState: row.hub_custody_state,
    courierState: row.courier_state,
    reconciliationState: row.reconciliation_state,
    reconciliationCode: row.reconciliation_code,
    eligibleForFulfilmentAt: row.eligible_for_fulfilment_at ?? undefined,
  });
}

export class SupabaseFulfilmentRepository implements FulfilmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findCase(tenantId: string, workflowId: string): Promise<FulfilmentCase | null> {
    const { data, error } = await this.client
      .from("fulfilment_cases")
      .select(
        "id, tenant_id, workflow_id, version, pathway_handoff_state, pharmacy_release_state, hub_custody_state, courier_state, reconciliation_state, reconciliation_code, eligible_for_fulfilment_at",
      )
      .eq("tenant_id", tenantId)
      .eq("workflow_id", workflowId)
      .maybeSingle<FulfilmentRow>();
    if (error) throw new FulfilmentRepositoryError(providerFailure(error));
    return data ? mapCase(data) : null;
  }

  async applyPartnerEvent(
    input: ApplyFulfilmentPartnerEvent,
  ): Promise<FulfilmentPartnerEventResult> {
    const event = input.event;
    const { data, error } = await this.client.rpc("apply_fulfilment_partner_event", {
      p_service_identity_id: input.serviceIdentityId,
      p_provider: event.provider,
      p_environment: event.environment,
      p_external_event_id: event.externalEventId,
      p_event_type: event.eventType,
      p_workflow_id: event.workflowId,
      p_provider_reference_digest: event.providerReferenceDigest,
      p_payload_fingerprint: event.payloadFingerprint,
      p_occurred_at: event.occurredAt,
    });
    if (error) throw new FulfilmentRepositoryError(providerFailure(error));
    const parsed = fulfilmentPartnerEventResultSchema.safeParse(data);
    if (!parsed.success) throw new FulfilmentRepositoryError("DEPENDENCY_UNAVAILABLE");
    return parsed.data;
  }
}
