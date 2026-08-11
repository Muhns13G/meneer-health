import { describe, expect, it, vi } from "vitest";

import type { PaymentCheckoutOutcome } from "@/application/payments/payment-checkout-service";
import { resolveServerPaymentActor } from "@/application/payments/payment-checkout-service";
import { createPaymentCheckoutHttpHandler, createStripeWebhookHttpHandler } from "./payment-http";

const origin = "http://127.0.0.1:8080";
const subjectId = "20000000-0000-4000-8000-000000000001";
const workflowId = "a0000000-0000-4000-8000-000000000001";
const now = new Date("2030-01-01T00:10:00Z");
const actor = resolveServerPaymentActor({
  providerSessionId: "71000000-0000-4000-8000-000000000001",
  subjectId,
  tenantId: "10000000-0000-4000-8000-000000000001",
  assurance: "aal1",
  observedAt: now,
});

function checkoutRequest(body: unknown, headers?: HeadersInit): Request {
  return new Request(`${origin}/api/payments/checkout`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: "Bearer synthetic",
      "Content-Type": "application/json",
      "Idempotency-Key": "payment_http_retry_0001",
      Origin: origin,
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
  });
}

describe("payment checkout HTTP boundary", () => {
  it("builds authoritative actor fields on the server", async () => {
    const create = vi.fn(
      async (_actor, command): Promise<PaymentCheckoutOutcome> => ({
        ok: false,
        error: {
          contract: "error.response",
          version: 1,
          correlationId: command.correlationId,
          error: { code: "FORBIDDEN", message: "The action is not permitted.", retry: "never" },
        },
      }),
    );
    const handler = createPaymentCheckoutHttpHandler({
      resolveActor: vi.fn(async () => ({ actor, subjectId })),
      checkout: { create },
      rateLimiter: { limit: vi.fn(async () => ({ success: true })) },
      now: () => now,
    });

    const response = await handler(
      checkoutRequest({ workflowId, scenario: "consultation_only", expectedVersion: 0 }),
    );

    expect(response.status).toBe(403);
    expect(create).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        actor: { type: "patient", id: subjectId },
        subjectId,
        idempotencyKey: "payment_http_retry_0001",
        requestedAt: now.toISOString(),
      }),
    );
  });

  it("rejects unauthenticated, cross-origin, and client-authority fields", async () => {
    const checkout = { create: vi.fn() };
    const rateLimiter = { limit: vi.fn(async () => ({ success: true })) };
    const unauthenticated = createPaymentCheckoutHttpHandler({
      resolveActor: vi.fn(async () => null),
      checkout,
      rateLimiter,
    });
    expect(
      await unauthenticated(
        checkoutRequest({ workflowId, scenario: "consultation_only", expectedVersion: 0 }),
      ),
    ).toMatchObject({ status: 401 });

    const authenticated = createPaymentCheckoutHttpHandler({
      resolveActor: vi.fn(async () => ({ actor, subjectId })),
      checkout,
      rateLimiter,
    });
    expect(
      await authenticated(
        checkoutRequest(
          { workflowId, scenario: "consultation_only", expectedVersion: 0 },
          { Origin: "https://attacker.invalid" },
        ),
      ),
    ).toMatchObject({ status: 403 });
    expect(
      await authenticated(
        checkoutRequest({
          workflowId,
          scenario: "consultation_only",
          expectedVersion: 0,
          actor: { id: "forged" },
        }),
      ),
    ).toMatchObject({ status: 422 });
    expect(checkout.create).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook HTTP boundary", () => {
  it("passes the exact raw body and signature and returns replay evidence", async () => {
    const handle = vi.fn(async () => ({
      accepted: true as const,
      result: { replayed: true },
    }));
    const handler = createStripeWebhookHttpHandler({ webhook: { handle } as never });
    const payload = '{"id":"evt_synthetic"}\n';
    const response = await handler(
      new Request(`${origin}/api/payments/stripe/webhook`, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json", "Stripe-Signature": "signed" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, replayed: true });
    expect(handle).toHaveBeenCalledWith(payload, "signed");
  });

  it("fails closed for malformed input and provider rejection", async () => {
    const rejected = createStripeWebhookHttpHandler({
      webhook: {
        handle: vi.fn(async () => ({
          accepted: false as const,
          status: 400 as const,
          code: "SIGNATURE_INVALID" as const,
        })),
      } as never,
    });
    const invalidMedia = await rejected(
      new Request(`${origin}/api/payments/stripe/webhook`, {
        method: "POST",
        body: "{}",
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const invalidSignature = await rejected(
      new Request(`${origin}/api/payments/stripe/webhook`, {
        method: "POST",
        body: "{}",
        headers: { "Content-Type": "application/json", "Stripe-Signature": "invalid" },
      }),
    );

    expect(invalidMedia.status).toBe(400);
    expect(invalidSignature.status).toBe(400);
    expect(invalidSignature.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
});
