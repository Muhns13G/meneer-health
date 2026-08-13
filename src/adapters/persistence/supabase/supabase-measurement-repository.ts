import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  MeasurementConsentCommand,
  MeasurementEnvironment,
  MeasurementEvent,
} from "../../../../contracts/measurement";
import {
  MeasurementRepositoryError,
  type MeasurementConsentReceipt,
  type MeasurementRepository,
} from "@/application/measurement/measurement-repository";

const consentReceiptSchema = z
  .object({
    flowId: z.uuid(),
    consentReceiptId: z.uuid(),
    status: z.enum(["granted", "withdrawn"]),
    expiresAt: z.iso.datetime({ offset: true }),
    deleteAfter: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

const eventReceiptSchema = z.object({ eventId: z.uuid(), replayed: z.boolean() }).strict();

function consentReceipt(value: unknown): MeasurementConsentReceipt {
  const parsed = consentReceiptSchema.safeParse(value);
  if (!parsed.success) throw new MeasurementRepositoryError();
  return {
    flowId: parsed.data.flowId,
    consentReceiptId: parsed.data.consentReceiptId,
    status: parsed.data.status,
    expiresAt: new Date(parsed.data.expiresAt),
    ...(parsed.data.deleteAfter ? { deleteAfter: new Date(parsed.data.deleteAfter) } : {}),
  };
}

export class SupabaseMeasurementRepository implements MeasurementRepository {
  constructor(private readonly client: SupabaseClient) {}

  async grantConsent(
    command: MeasurementConsentCommand,
    flowId: string,
    consentReceiptId: string,
    expiresAt: Date,
    environment: MeasurementEnvironment,
  ): Promise<MeasurementConsentReceipt> {
    const { data, error } = await this.client.rpc("grant_measurement_consent", {
      p_request_id: command.requestId,
      p_idempotency_key: command.idempotencyKey,
      p_correlation_id: command.correlationId,
      p_requested_at: command.requestedAt,
      p_flow_id: flowId,
      p_consent_receipt_id: consentReceiptId,
      p_expires_at: expiresAt.toISOString(),
      p_synthetic: command.synthetic,
      p_environment: environment,
    });
    if (error) throw new MeasurementRepositoryError();
    return consentReceipt(data);
  }

  async withdrawConsent(
    command: MeasurementConsentCommand,
    flowId: string,
    deleteAfter: Date,
    environment: MeasurementEnvironment,
  ): Promise<MeasurementConsentReceipt> {
    const { data, error } = await this.client.rpc("withdraw_measurement_consent", {
      p_request_id: command.requestId,
      p_idempotency_key: command.idempotencyKey,
      p_correlation_id: command.correlationId,
      p_requested_at: command.requestedAt,
      p_flow_id: flowId,
      p_delete_after: deleteAfter.toISOString(),
      p_synthetic: command.synthetic,
      p_environment: environment,
    });
    if (error) throw new MeasurementRepositoryError();
    return consentReceipt(data);
  }

  async recordEvent(event: MeasurementEvent): Promise<{ eventId: string; replayed: boolean }> {
    const { data, error } = await this.client.rpc("record_measurement_event", {
      p_event_id: event.eventId,
      p_idempotency_key: event.idempotencyKey,
      p_correlation_id: event.correlationId,
      p_occurred_at: event.occurredAt,
      p_environment: event.environment,
      p_flow_id: event.flowId,
      p_consent_receipt_id: event.consentReceiptId,
      p_event_name: event.data.name,
      p_campaign_id: "campaignId" in event.data ? event.data.campaignId : null,
      p_step: "step" in event.data ? event.data.step : null,
      p_outcome: "outcome" in event.data ? event.data.outcome : null,
      p_duration_bucket: "durationBucket" in event.data ? event.data.durationBucket : null,
      p_synthetic: event.synthetic,
    });
    if (error) throw new MeasurementRepositoryError();
    const parsed = eventReceiptSchema.safeParse(data);
    if (!parsed.success) throw new MeasurementRepositoryError();
    return parsed.data;
  }
}
