import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/start-client-core";
import { env } from "cloudflare:workers";

import { createStripeWebhookHttpHandler } from "@/server/payments/payment-http";
import {
  createLocalPaymentRuntime,
  PaymentRuntimeUnavailableError,
  type PaymentRuntimeBindings,
} from "@/server/payments/payment-runtime.server";

function hidden(): Response {
  return Response.json(
    {
      contract: "error.response",
      version: 1,
      correlationId: crypto.randomUUID(),
      error: { code: "NOT_FOUND", message: "The resource was not found.", retry: "never" },
    },
    { status: 404 },
  );
}

export const Route = createFileRoute("/api/payments/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const runtime = createLocalPaymentRuntime(
            request,
            env as unknown as PaymentRuntimeBindings,
          );
          return createStripeWebhookHttpHandler(runtime)(request);
        } catch (error) {
          if (error instanceof PaymentRuntimeUnavailableError) return hidden();
          throw error;
        }
      },
    },
  },
});
