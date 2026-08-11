import type { PaymentProviderEventResult } from "../../../contracts/payments";
import { PaymentProviderError, type PaymentProvider } from "./payment-provider";
import { PaymentRepositoryError, type PaymentRepository } from "./payment-repository";

export type PaymentWebhookOutcome =
  | Readonly<{ accepted: true; result: PaymentProviderEventResult }>
  | Readonly<{
      accepted: false;
      status: 400 | 503;
      code: "SIGNATURE_INVALID" | "PROCESSING_FAILED";
    }>;

export class PaymentWebhookService {
  constructor(
    private readonly provider: PaymentProvider,
    private readonly repository: PaymentRepository,
    private readonly serviceIdentityId: string,
  ) {}

  async handle(rawBody: string, signature: string | null): Promise<PaymentWebhookOutcome> {
    if (
      !signature ||
      rawBody.length === 0 ||
      new TextEncoder().encode(rawBody).byteLength > 256_000
    ) {
      return { accepted: false, status: 400, code: "SIGNATURE_INVALID" };
    }

    try {
      const event = await this.provider.verifyWebhook(rawBody, signature);
      const result = await this.repository.applyProviderEvent({
        serviceIdentityId: this.serviceIdentityId,
        event,
      });
      return { accepted: true, result };
    } catch (error) {
      if (error instanceof PaymentProviderError) {
        return { accepted: false, status: 400, code: "SIGNATURE_INVALID" };
      }
      if (error instanceof PaymentRepositoryError) {
        return { accepted: false, status: 503, code: "PROCESSING_FAILED" };
      }
      return { accepted: false, status: 503, code: "PROCESSING_FAILED" };
    }
  }
}
