import "@tanstack/react-start/server-only";

import { createClient } from "@supabase/supabase-js";

import { SupabaseAuthorisationContextRepository } from "@/adapters/identity/supabase/supabase-authorisation-context-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { StripePaymentProvider } from "@/adapters/payments/stripe/stripe-payment-provider";
import { SupabaseAccessRepository } from "@/adapters/persistence/supabase/supabase-access-repository";
import { SupabasePaymentRepository } from "@/adapters/persistence/supabase/supabase-payment-repository";
import { SupabaseWorkflowCommandRepository } from "@/adapters/persistence/supabase/supabase-workflow-command-repository";
import { AuthorisationService } from "@/application/authorisation/authorisation-service";
import {
  PaymentCheckoutService,
  resolveServerPaymentActor,
} from "@/application/payments/payment-checkout-service";
import { PaymentWebhookService } from "@/application/payments/payment-webhook-service";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import type {
  PaymentRequestActorResolver,
  ResolvedPaymentRequestActor,
} from "@/server/payments/payment-http";
import type { RateLimitPort } from "@/server/security/request-security";

export type PaymentRuntimeBindings = Readonly<{
  SUPABASE_URL?: unknown;
  SUPABASE_SECRET_KEY?: unknown;
  STRIPE_RESTRICTED_KEY?: unknown;
  STRIPE_WEBHOOK_SIGNING_SECRET?: unknown;
  STRIPE_WEBHOOK_SERVICE_IDENTITY_ID?: unknown;
  REQUEST_RATE_LIMITER: RateLimitPort;
}>;

export type LocalPaymentRuntime = Readonly<{
  checkout: PaymentCheckoutService;
  webhook: PaymentWebhookService;
  resolveActor: PaymentRequestActorResolver;
  rateLimiter: RateLimitPort;
}>;

export class PaymentRuntimeUnavailableError extends Error {
  constructor() {
    super("The local payment runtime is unavailable.");
    this.name = "PaymentRuntimeUnavailableError";
  }
}

function bearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization")?.trim();
  const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  return match?.[1];
}

function isActivePatientMembership(
  membership: Readonly<{
    role: string;
    status: string;
    validFrom: Date;
    expiresAt?: Date;
  }>,
  observedAt: Date,
): boolean {
  return (
    membership.role === "patient" &&
    membership.status === "active" &&
    membership.validFrom <= observedAt &&
    (!membership.expiresAt || membership.expiresAt > observedAt)
  );
}

export function isLocalPaymentRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function createLocalPaymentRuntime(
  request: Request,
  bindings: PaymentRuntimeBindings,
): LocalPaymentRuntime {
  if (!isLocalPaymentRequest(request)) throw new PaymentRuntimeUnavailableError();

  let configuration;
  try {
    configuration = initialiseServerEnvironment({
      SUPABASE_URL: bindings.SUPABASE_URL,
      SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
      STRIPE_RESTRICTED_KEY: bindings.STRIPE_RESTRICTED_KEY,
      STRIPE_WEBHOOK_SIGNING_SECRET: bindings.STRIPE_WEBHOOK_SIGNING_SECRET,
      STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: bindings.STRIPE_WEBHOOK_SERVICE_IDENTITY_ID,
    }).environment;
  } catch {
    throw new PaymentRuntimeUnavailableError();
  }
  if (!configuration.supabase || !configuration.stripe) {
    throw new PaymentRuntimeUnavailableError();
  }

  const client = createClient(configuration.supabase.url, configuration.supabase.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const access = new SupabaseAccessRepository(client);
  const identity = createSupabaseManagedIdentityProvider(configuration.supabase);
  const resolveActor: PaymentRequestActorResolver = async (
    actorRequest,
    observedAt,
  ): Promise<ResolvedPaymentRequestActor | null> => {
    const token = bearerToken(actorRequest);
    if (!token) return null;
    const providerIdentity = await identity.verifyAccessToken(token);
    const subject = await access.findSubjectByExternalIdentity(
      providerIdentity.provider,
      providerIdentity.providerSubject,
    );
    if (!subject || subject.status !== "active") return null;
    const memberships = (await access.listMemberships(subject.id)).filter((membership) =>
      isActivePatientMembership(membership, observedAt),
    );
    if (memberships.length !== 1) return null;

    return {
      subjectId: subject.id,
      actor: resolveServerPaymentActor({
        providerSessionId: providerIdentity.providerSessionId,
        subjectId: subject.id,
        tenantId: memberships[0].tenantId,
        assurance: providerIdentity.assurance,
        observedAt,
      }),
    };
  };

  const provider = new StripePaymentProvider(
    configuration.stripe.restrictedKey,
    configuration.stripe.webhookSigningSecret,
    "local",
  );
  const payments = new SupabasePaymentRepository(client, "local");

  return {
    checkout: new PaymentCheckoutService(
      payments,
      new SupabaseWorkflowCommandRepository(client),
      new AuthorisationService(new SupabaseAuthorisationContextRepository(client)),
      provider,
      {
        successUrl: "https://meneerhealth.co.za/start?payment=success",
        cancelUrl: "https://meneerhealth.co.za/start?payment=cancelled",
      },
    ),
    webhook: new PaymentWebhookService(
      provider,
      payments,
      configuration.stripe.webhookServiceIdentityId,
    ),
    resolveActor,
    rateLimiter: bindings.REQUEST_RATE_LIMITER,
  };
}
