import {
  measurementConsentCommandSchema,
  measurementEventSchema,
  type MeasurementConsentCommand,
  type MeasurementEnvironment,
  type MeasurementEventInput,
} from "../../../contracts/measurement";
import type { MeasurementConsentReceipt, MeasurementRepository } from "./measurement-repository";

export const measurementFlowTtlMs = 30 * 60 * 1_000;
export const measurementWithdrawalDeletionMs = 7 * 24 * 60 * 60 * 1_000;

export class MeasurementService {
  constructor(
    private readonly repository: MeasurementRepository,
    private readonly environment: MeasurementEnvironment,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async grant(command: MeasurementConsentCommand): Promise<MeasurementConsentReceipt> {
    const validated = measurementConsentCommandSchema.parse(command);
    if (validated.decision !== "granted") throw new Error("MEASUREMENT_DECISION_INVALID");
    const observedAt = new Date(validated.requestedAt);
    return this.repository.grantConsent(
      validated,
      crypto.randomUUID(),
      crypto.randomUUID(),
      new Date(observedAt.getTime() + measurementFlowTtlMs),
      this.environment,
    );
  }

  async withdraw(
    command: MeasurementConsentCommand,
    flowId: string,
  ): Promise<MeasurementConsentReceipt> {
    const validated = measurementConsentCommandSchema.parse(command);
    if (validated.decision !== "withdrawn") throw new Error("MEASUREMENT_DECISION_INVALID");
    return this.repository.withdrawConsent(
      validated,
      flowId,
      new Date(new Date(validated.requestedAt).getTime() + measurementWithdrawalDeletionMs),
      this.environment,
    );
  }

  async record(
    input: MeasurementEventInput,
    context: Readonly<{
      flowId: string;
      consentReceiptId: string;
      idempotencyKey: string;
      correlationId: string;
      synthetic: boolean;
    }>,
  ): Promise<{ eventId: string; replayed: boolean }> {
    const event = measurementEventSchema.parse({
      contract: "measurement.event",
      version: 1,
      eventId: crypto.randomUUID(),
      idempotencyKey: context.idempotencyKey,
      correlationId: context.correlationId,
      occurredAt: this.now().toISOString(),
      environment: this.environment,
      flowId: context.flowId,
      consentReceiptId: context.consentReceiptId,
      synthetic: context.synthetic,
      data: input,
    });
    return this.repository.recordEvent(event);
  }
}
