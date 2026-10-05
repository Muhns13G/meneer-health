import "@tanstack/react-start/server-only";
import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { readBoundedTextRequest } from "@/server/security/request-security";
const optionalId = (prefix: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_[A-Za-z0-9_]{8,120}$`))
    .nullable();
const minor = z.int().min(0).max(100_000_000).nullable();
export const pilotProviderReceiptSchema = z
  .object({
    eventId: optionalId("evt").unwrap(),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    eventType: z.string().min(1).max(120),
    intentId: z.uuid().nullable(),
    tenantId: z.uuid().nullable(),
    sessionId: optionalId("cs_test"),
    paymentIntentId: optionalId("pi"),
    amountMinor: minor,
    currency: z.string().min(3).max(3).nullable(),
    paymentStatus: z.enum(["paid", "unpaid", "no_payment_required"]).nullable(),
    refundMinor: minor,
    chargeId: optionalId("ch"),
    disputeId: optionalId("dp"),
    disputeStatus: z
      .enum([
        "warning_needs_response",
        "warning_under_review",
        "warning_closed",
        "needs_response",
        "under_review",
        "won",
        "lost",
      ])
      .nullable(),
    occurredAt: z.iso.datetime({ offset: true }),
    refundId: optionalId("re").optional().default(null),
    refundReference: z.uuid().nullable().optional().default(null),
    refundStatus: z
      .enum(["pending", "requires_action", "succeeded", "failed", "canceled"])
      .nullable()
      .optional()
      .default(null),
  })
  .strict();
export type PilotProviderReceipt = z.infer<typeof pilotProviderReceiptSchema>;
const idOf = (v: unknown) =>
  typeof v === "string" ? v : v && typeof v === "object" && "id" in v ? v.id : null;
export async function verifyPilotReceipt(
  raw: string,
  signature: string,
  secret: string,
  account: string,
  client: Stripe,
): Promise<PilotProviderReceipt> {
  const e = await client.webhooks.constructEventAsync(
    raw,
    signature,
    secret,
    300,
    Stripe.createSubtleCryptoProvider(),
  );
  if (e.livemode !== false || (e.account && e.account !== account))
    throw new Error("WEBHOOK_REJECTED");
  const v = e.data.object as unknown as Record<string, unknown>;
  const metadata = (v.metadata ?? {}) as Record<string, unknown>;
  const supported = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "payment_intent.payment_failed",
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.updated",
    "charge.dispute.closed",
    "refund.created",
    "refund.updated",
    "refund.failed",
  ].includes(e.type);
  const session = e.type.startsWith("checkout.session."),
    charge = e.type === "charge.refunded",
    pi = e.type === "payment_intent.payment_failed";
  const dispute = e.type.startsWith("charge.dispute.");
  const refund = e.type.startsWith("refund.");
  if (supported && session && v.client_reference_id !== metadata.orderId)
    throw new Error("WEBHOOK_REFERENCE_REJECTED");
  const fingerprint = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw))),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  return pilotProviderReceiptSchema.parse({
    eventId: e.id,
    eventType: e.type,
    fingerprint,
    intentId: supported
      ? (metadata.orderId ?? (session ? v.client_reference_id : null) ?? null)
      : null,
    tenantId: supported ? (metadata.tenantId ?? null) : null,
    sessionId: supported && session ? v.id : null,
    paymentIntentId: !supported ? null : pi ? v.id : idOf(v.payment_intent),
    amountMinor: !supported
      ? null
      : session
        ? (v.amount_total ?? null)
        : pi || charge || dispute || refund
          ? (v.amount ?? null)
          : null,
    currency: supported ? (v.currency ?? null) : null,
    paymentStatus: supported && session ? (v.payment_status ?? null) : null,
    refundMinor: charge ? (v.amount_refunded ?? null) : null,
    chargeId: charge ? v.id : dispute ? idOf(v.charge) : null,
    disputeId: dispute ? v.id : null,
    disputeStatus: dispute ? (v.status ?? null) : null,
    occurredAt: new Date(e.created * 1000).toISOString(),
    refundId: supported && refund ? v.id : null,
    refundReference: supported && refund ? (metadata.refund_reference ?? null) : null,
    refundStatus: supported && refund ? (v.status ?? null) : null,
  });
}
export type PilotWebhookBindings = {
  COMMERCE_WEBHOOK_MODE?: unknown;
  COMMERCE_REVIEW_TENANT_ID?: unknown;
  STRIPE_CHECKOUT_ACCOUNT_ID?: unknown;
  STRIPE_RESTRICTED_KEY?: unknown;
  STRIPE_WEBHOOK_SIGNING_SECRET?: unknown;
  STRIPE_WEBHOOK_SERVICE_IDENTITY_ID?: unknown;
  SUPABASE_URL?: unknown;
  SUPABASE_SECRET_KEY?: unknown;
};
type Dependencies = {
  verify(raw: string, signature: string): Promise<PilotProviderReceipt>;
  apply(event: PilotProviderReceipt): Promise<unknown>;
};
const resultSchema = z
  .object({ replayed: z.boolean(), outcome: z.enum(["applied", "pending", "ignored"]) })
  .strict();
function response(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/json",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function createPilotWebhookHandler(bindings: PilotWebhookBindings, injected?: Dependencies) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      bindings.COMMERCE_WEBHOOK_MODE !== "sandbox" ||
      url.pathname !== "/api/payments/stripe/webhook" ||
      url.search ||
      request.method !== "POST" ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname)
    )
      return response(404);
    if (
      request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !==
        "application/json" ||
      !request.headers.get("stripe-signature")
    )
      return response(400);
    const raw = await readBoundedTextRequest(request, 256000);
    if (raw === "too-large" || raw === "malformed" || !raw) return response(400);
    let deps = injected;
    try {
      if (!deps) {
        const config = z
          .object({
            account: z.string().regex(/^acct_[A-Za-z0-9]{8,64}$/),
            tenant: z.uuid(),
            service: z.uuid(),
            key: z.string().startsWith("rk_test_"),
            secret: z.string().startsWith("whsec_"),
          })
          .parse({
            account: bindings.STRIPE_CHECKOUT_ACCOUNT_ID,
            tenant: bindings.COMMERCE_REVIEW_TENANT_ID,
            service: bindings.STRIPE_WEBHOOK_SERVICE_IDENTITY_ID,
            key: bindings.STRIPE_RESTRICTED_KEY,
            secret: bindings.STRIPE_WEBHOOK_SIGNING_SECRET,
          });
        const database = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!database) return response(503);
        const client = new Stripe(config.key, {
          apiVersion: "2026-07-29.dahlia",
          timeout: 10000,
          maxNetworkRetries: 2,
          telemetry: false,
        });
        const supabase = createClient(database.url, database.secretKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        deps = {
          verify: (body, signature) =>
            verifyPilotReceipt(body, signature, config.secret, config.account, client),
          async apply(event) {
            if ((await client.accounts.retrieveCurrent()).id !== config.account)
              throw new Error("WEBHOOK_ACCOUNT_REJECTED");
            const { data, error } = await supabase.rpc("apply_pilot_provider_event", {
              p_service_id: config.service,
              p_tenant_id: config.tenant,
              p_account: config.account,
              p_event: event,
            });
            if (error) throw new Error("WEBHOOK_STORAGE_UNAVAILABLE");
            return data;
          },
        };
      }
    } catch {
      return response(503);
    }
    let event: PilotProviderReceipt;
    try {
      event = pilotProviderReceiptSchema.parse(
        await deps.verify(raw, request.headers.get("stripe-signature")!),
      );
    } catch {
      return response(400);
    }
    try {
      const result = resultSchema.parse(await deps.apply(event));
      return response(200, { received: true, replayed: result.replayed });
    } catch {
      return response(503);
    }
  };
}
