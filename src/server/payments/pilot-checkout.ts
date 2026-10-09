import "@tanstack/react-start/server-only";
import Stripe from "stripe";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortalContext } from "@/application/identity/patient-portal-service";
import {
  assertStripeCredential,
  stripeObjectMatchesEnvironment,
  stripeSessionSchema,
  type StripePaymentEnvironment,
} from "./stripe-payment-environment";
const minor = z.int().min(0).max(100_000_000);
export const checkoutIntentSchemaForEnvironment = (environment: StripePaymentEnvironment) =>
  z
    .object({
      intentId: z.uuid(),
      tenantId: z.uuid(),
      accountId: z.string().regex(/^acct_[A-Za-z0-9]{8,64}$/),
      paymentEnvironment: z.enum(["sandbox", "live"]).optional(),
      scenario: z.enum(["review_deposit", "approved_product_order"]),
      currency: z.literal("zar"),
      amountTotalMinor: minor,
      productBalanceMinor: minor,
      deliveryMinor: minor,
      expiresEpoch: z.int().positive(),
      sessionId: stripeSessionSchema(environment).nullable(),
      checkoutUrl: z
        .url()
        .refine(
          (v) =>
            new URL(v).origin === "https://checkout.stripe.com" &&
            !new URL(v).username &&
            !new URL(v).password,
        )
        .nullable(),
    })
    .strict()
    .refine((v) => (v.paymentEnvironment ?? "sandbox") === environment)
    .refine((v) =>
      v.scenario === "review_deposit"
        ? v.amountTotalMinor === 99900 && v.productBalanceMinor === 0 && v.deliveryMinor === 0
        : v.amountTotalMinor === v.productBalanceMinor + v.deliveryMinor,
    );
export const checkoutIntentSchema = checkoutIntentSchemaForEnvironment("sandbox");
export type CheckoutIntent = z.infer<typeof checkoutIntentSchema>;
export class PilotCheckoutProvider {
  private readonly client: Stripe;
  constructor(
    key: unknown,
    private readonly accountId: string,
    client?: Stripe,
    private readonly environment: StripePaymentEnvironment = "sandbox",
  ) {
    assertStripeCredential(key, accountId, environment, "CHECKOUT_CONFIGURATION_INVALID");
    this.client =
      client ??
      new Stripe(key, {
        apiVersion: "2026-07-29.dahlia",
        maxNetworkRetries: 2,
        timeout: 10000,
        telemetry: false,
      });
  }
  async create(input: CheckoutIntent) {
    const intent = checkoutIntentSchemaForEnvironment(this.environment).parse(input);
    if (intent.accountId !== this.accountId) throw new Error("CHECKOUT_ACCOUNT_MISMATCH");
    // This is the current standalone account, not a Connect destination or browser account claim.
    if ((await this.client.accounts.retrieveCurrent()).id !== this.accountId)
      throw new Error("CHECKOUT_ACCOUNT_MISMATCH");
    const line = (name: string, value: number) => ({
      price_data: { currency: "zar", unit_amount: value, product_data: { name } },
      quantity: 1,
    });
    const lines =
      intent.scenario === "review_deposit"
        ? [line("Review deposit", 99900)]
        : [
            line("Approved product order balance after deposit credit", intent.productBalanceMinor),
            ...(intent.deliveryMinor > 0 ? [line("Delivery", intent.deliveryMinor)] : []),
          ];
    const session = await this.client.checkout.sessions.create(
      {
        mode: "payment",
        integration_identifier: "meneer_health_checkout_kqtdvzmp",
        adaptive_pricing: { enabled: false },
        client_reference_id: intent.intentId,
        success_url: "https://meneerhealth.co.za/portal/order",
        cancel_url: "https://meneerhealth.co.za/portal/order",
        expires_at: intent.expiresEpoch,
        line_items: lines,
        metadata: { orderId: intent.intentId, tenantId: intent.tenantId },
        ...(intent.amountTotalMinor > 0
          ? {
              payment_intent_data: {
                metadata: { orderId: intent.intentId, tenantId: intent.tenantId },
              },
            }
          : {}),
      },
      { idempotencyKey: `pilot-checkout:${intent.intentId}` },
    );
    if (
      !stripeObjectMatchesEnvironment(session, this.environment) ||
      session.expires_at !== intent.expiresEpoch ||
      !stripeSessionSchema(this.environment).safeParse(session.id).success ||
      session.currency !== "zar" ||
      session.amount_total !== intent.amountTotalMinor ||
      session.client_reference_id !== intent.intentId ||
      session.mode !== "payment" ||
      !session.url
    )
      throw new Error("CHECKOUT_PROVIDER_INVALID");
    const url = new URL(session.url);
    if (url.origin !== "https://checkout.stripe.com" || url.username || url.password)
      throw new Error("CHECKOUT_PROVIDER_INVALID");
    return { id: session.id, url: session.url };
  }
}
export function createPilotCheckoutCommands(
  client: SupabaseClient,
  accountId: string,
  provider: PilotCheckoutProvider,
  environment: StripePaymentEnvironment = "sandbox",
) {
  async function rpc(name: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(name, args);
    if (error)
      throw new Error(
        ["PT409", "40001", "23505"].includes(error.code)
          ? "COMMERCE_CONFLICT"
          : "COMMERCE_FORBIDDEN",
      );
    return data as unknown;
  }
  return {
    async prepare(context: PortalContext, key: string) {
      await rpc("patient_prepare_deposit_offer", {
        p_context: context,
        p_request_key: key,
        p_account: accountId,
      });
    },
    async checkout(context: PortalContext, offerId: string, key: string) {
      const intent = checkoutIntentSchemaForEnvironment(environment).parse(
        await rpc("patient_prepare_checkout", {
          p_context: context,
          p_offer_id: offerId,
          p_request_key: key,
          p_account: accountId,
        }),
      );
      if (intent.accountId !== accountId) throw new Error("CHECKOUT_ACCOUNT_MISMATCH");
      const session =
        intent.checkoutUrl && intent.sessionId
          ? { id: intent.sessionId, url: intent.checkoutUrl }
          : await provider.create(intent);
      await rpc("patient_attach_checkout", {
        p_context: context,
        p_intent_id: intent.intentId,
        p_session_id: session.id,
        p_url: session.url,
      });
      return { checkoutUrl: session.url };
    },
  };
}
