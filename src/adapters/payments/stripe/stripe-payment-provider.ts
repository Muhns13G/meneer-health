import "@tanstack/react-start/server-only";

import Stripe from "stripe";

import {
  verifiedPaymentProviderEventSchema,
  type VerifiedPaymentProviderEvent,
} from "../../../../contracts/payments";
import {
  PaymentProviderError,
  type CheckoutSessionRequest,
  type PaymentProvider,
  type ProviderCheckoutSession,
} from "@/application/payments/payment-provider";

type StripeEnvironment = "local" | "production";

function idOf(value: string | Readonly<{ id: string }> | null): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;

  constructor(
    restrictedKey: string,
    private readonly webhookSigningSecret: string,
    private readonly environment: StripeEnvironment,
    stripeClient?: Stripe,
  ) {
    if (!restrictedKey.startsWith("rk_test_") || !webhookSigningSecret.startsWith("whsec_")) {
      throw new PaymentProviderError();
    }
    this.stripe =
      stripeClient ??
      new Stripe(restrictedKey, {
        apiVersion: "2026-07-29.dahlia",
        maxNetworkRetries: 2,
        timeout: 10_000,
        telemetry: false,
      });
  }

  async createCheckoutSession(input: CheckoutSessionRequest): Promise<ProviderCheckoutSession> {
    try {
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: "payment",
          client_reference_id: input.order.orderId,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          line_items: input.order.lines.map((line) => ({
            price: line.providerPriceId,
            quantity: line.quantity,
          })),
          metadata: {
            orderId: input.order.orderId,
            tenantId: input.order.tenantId,
          },
          payment_intent_data: {
            metadata: {
              orderId: input.order.orderId,
              tenantId: input.order.tenantId,
            },
          },
        },
        { idempotencyKey: input.idempotencyKey },
      );
      if (session.livemode || !session.id.startsWith("cs_test_") || !session.url) {
        throw new PaymentProviderError();
      }
      return { id: session.id, url: session.url };
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError();
    }
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<VerifiedPaymentProviderEvent> {
    try {
      const event = await this.stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        this.webhookSigningSecret,
      );
      if (event.livemode) throw new PaymentProviderError();

      let orderId: string | undefined;
      let checkoutSessionId: string | undefined;
      let paymentIntentId: string | undefined;
      let paymentStatus: "unpaid" | "paid" | "no_payment_required" | undefined;
      let refundComplete: boolean | undefined;
      let disputeOutcome: "won" | "lost" | "warning_closed" | undefined;

      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
        case "checkout.session.async_payment_failed":
        case "checkout.session.expired": {
          const session = event.data.object;
          orderId = session.client_reference_id ?? session.metadata?.orderId;
          checkoutSessionId = session.id;
          paymentIntentId = idOf(session.payment_intent);
          if (["unpaid", "paid", "no_payment_required"].includes(session.payment_status)) {
            paymentStatus = session.payment_status as typeof paymentStatus;
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const intent = event.data.object;
          orderId = intent.metadata.orderId;
          paymentIntentId = intent.id;
          break;
        }
        case "charge.refunded": {
          const charge = event.data.object;
          orderId = charge.metadata.orderId;
          paymentIntentId = idOf(charge.payment_intent);
          refundComplete = charge.refunded && charge.amount_refunded === charge.amount;
          break;
        }
        case "charge.dispute.created":
        case "charge.dispute.closed": {
          const dispute = event.data.object;
          orderId = dispute.metadata.orderId;
          paymentIntentId = idOf(dispute.payment_intent);
          if (event.type === "charge.dispute.closed") {
            if (["won", "lost", "warning_closed"].includes(dispute.status)) {
              disputeOutcome = dispute.status as typeof disputeOutcome;
            }
          }
          break;
        }
        default:
          throw new PaymentProviderError();
      }

      return verifiedPaymentProviderEventSchema.parse({
        contract: "payment.provider",
        version: 1,
        provider: "stripe",
        environment: this.environment,
        externalEventId: event.id,
        eventType: event.type,
        orderId,
        checkoutSessionId,
        paymentIntentId,
        paymentStatus,
        refundComplete,
        disputeOutcome,
        occurredAt: new Date(event.created * 1000).toISOString(),
        payloadFingerprint: await sha256(rawBody),
      });
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      throw new PaymentProviderError();
    }
  }
}
