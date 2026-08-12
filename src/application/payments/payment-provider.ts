import type { PaymentOrder, VerifiedPaymentProviderEvent } from "../../../contracts/payments";

export type CheckoutSessionRequest = Readonly<{
  order: PaymentOrder;
  idempotencyKey: string;
  successUrl: string;
  cancelUrl: string;
}>;

export type ProviderCheckoutSession = Readonly<{
  id: string;
  url: string;
}>;

export interface PaymentProvider {
  createCheckoutSession(input: CheckoutSessionRequest): Promise<ProviderCheckoutSession>;
  verifyWebhook(rawBody: string, signature: string): Promise<VerifiedPaymentProviderEvent>;
}

export class PaymentProviderError extends Error {
  constructor() {
    super("The payment provider request could not be completed.");
    this.name = "PaymentProviderError";
  }
}
