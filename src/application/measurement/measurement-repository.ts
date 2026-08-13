import type {
  MeasurementConsentCommand,
  MeasurementEnvironment,
  MeasurementEvent,
} from "../../../contracts/measurement";

export type MeasurementConsentReceipt = Readonly<{
  flowId: string;
  consentReceiptId: string;
  status: "granted" | "withdrawn";
  expiresAt: Date;
  deleteAfter?: Date;
}>;

export interface MeasurementRepository {
  grantConsent(
    command: MeasurementConsentCommand,
    flowId: string,
    consentReceiptId: string,
    expiresAt: Date,
    environment: MeasurementEnvironment,
  ): Promise<MeasurementConsentReceipt>;
  withdrawConsent(
    command: MeasurementConsentCommand,
    flowId: string,
    deleteAfter: Date,
    environment: MeasurementEnvironment,
  ): Promise<MeasurementConsentReceipt>;
  recordEvent(event: MeasurementEvent): Promise<{ eventId: string; replayed: boolean }>;
}

export class MeasurementRepositoryError extends Error {
  constructor() {
    super("Measurement could not be recorded.");
    this.name = "MeasurementRepositoryError";
  }
}
