import "@tanstack/react-start/server-only";
import Stripe from "stripe";
import { z } from "zod";

export const refundDispatchSchema = z
  .object({
    refundId: z.uuid(),
    accountId: z.string().regex(/^acct_[A-Za-z0-9]{8,64}$/),
    paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]{8,120}$/),
    amountMinor: z.int().positive().max(100_000_000),
    currency: z.literal("zar"),
  })
  .strict();
export class PilotRefundProvider {
  private readonly client: Stripe;
  constructor(
    key: unknown,
    private readonly accountId: string,
    client?: Stripe,
  ) {
    if (
      typeof key !== "string" ||
      !key.startsWith("rk_test_") ||
      !/^acct_[A-Za-z0-9]{8,64}$/.test(accountId)
    )
      throw new Error("REFUND_CONFIGURATION_INVALID");
    this.client =
      client ??
      new Stripe(key, {
        apiVersion: "2026-07-29.dahlia",
        maxNetworkRetries: 2,
        timeout: 10000,
        telemetry: false,
      });
  }
  async submit(value: unknown) {
    const input = refundDispatchSchema.parse(value);
    if (input.accountId !== this.accountId) throw new Error("REFUND_ACCOUNT_MISMATCH");
    const account = await this.client.accounts.retrieveCurrent();
    if (account.id !== this.accountId) throw new Error("REFUND_ACCOUNT_MISMATCH");
    const payment = await this.client.paymentIntents.retrieve(input.paymentIntentId);
    if (
      payment.livemode ||
      payment.id !== input.paymentIntentId ||
      payment.currency !== "zar" ||
      payment.status !== "succeeded" ||
      payment.amount_received < input.amountMinor
    )
      throw new Error("REFUND_CAPTURE_INVALID");
    const result = await this.client.refunds.create(
      {
        payment_intent: input.paymentIntentId,
        amount: input.amountMinor,
        metadata: { refund_reference: input.refundId },
      },
      { idempotencyKey: `pilot-refund:${input.refundId}` },
    );
    const intent =
      typeof result.payment_intent === "string" ? result.payment_intent : result.payment_intent?.id;
    if (
      result.id === "" ||
      !/^re_[A-Za-z0-9_]{8,120}$/.test(result.id) ||
      intent !== input.paymentIntentId ||
      result.amount !== input.amountMinor ||
      result.currency !== "zar" ||
      !["pending", "succeeded", "failed", "canceled", "requires_action"].includes(
        result.status ?? "",
      )
    )
      throw new Error("REFUND_PROVIDER_RESPONSE_INVALID");
    // Even 'succeeded' is a submitted fact here; 11.8 reconciles provider evidence independently.
    return {
      providerId: result.id,
      state:
        result.status === "failed" || result.status === "canceled"
          ? ("failed" as const)
          : result.status === "pending" || result.status === "requires_action"
            ? ("pending" as const)
            : ("submitted" as const),
    };
  }
}

export async function dispatchRefund(
  claim: () => Promise<unknown>,
  provider: Pick<PilotRefundProvider, "submit">,
  record: (result: {
    providerId: string | null;
    state: "submitted" | "pending" | "failed" | "uncertain";
  }) => Promise<void>,
) {
  const input = refundDispatchSchema.parse(await claim());
  let result: Awaited<ReturnType<PilotRefundProvider["submit"]>>;
  try {
    result = await provider.submit(input);
  } catch {
    await record({ providerId: null, state: "uncertain" });
    return;
  }
  // A failed persistence attempt leaves the claim uncertain, never releases its money reservation.
  await record(result);
}
