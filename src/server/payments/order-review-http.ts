import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import {
  PatientPortalService,
  type PortalContext,
} from "@/application/identity/patient-portal-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import type { PatientSessionProof } from "@/application/identity/patient-session-service";
import {
  orderReviewCommandSchema,
  orderReviewResultSchema,
  checkoutResultSchema,
} from "@/domain/payments/order-review";
import { createPilotCheckoutCommands, PilotCheckoutProvider } from "./pilot-checkout";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  openPatientSession,
  patientSessionCookieName,
  readPatientSessionKey,
  clearPatientSessionCookie,
} from "@/server/identity/patient-session-cookie";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
export type CommerceReviewBindings = PatientSessionBindings & {
  COMMERCE_REVIEW_MODE?: unknown;
  COMMERCE_REVIEW_TENANT_ID?: unknown;
  COMMERCE_CHECKOUT_MODE?: unknown;
  STRIPE_CHECKOUT_ACCOUNT_ID?: unknown;
  STRIPE_RESTRICTED_KEY?: unknown;
};
type Dependencies = {
  authorise(proof: PatientSessionProof): Promise<{ context: PortalContext; expiresAt: Date }>;
  execute(context: PortalContext, command: unknown): Promise<unknown>;
  prepare?(context: PortalContext, key: string): Promise<void>;
  checkout?(context: PortalContext, offerId: string, key: string): Promise<unknown>;
  ready?(context: PortalContext): Promise<boolean>;
};
function response(status: number, value?: unknown, clear = false) {
  return new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/json",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
      ...(clear ? { "Set-Cookie": clearPatientSessionCookie() } : {}),
    },
  });
}
export function createOrderReviewHttpHandler(
  bindings: CommerceReviewBindings,
  injected?: Dependencies,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      url.pathname !== "/portal/order/command" ||
      url.search ||
      request.method !== "POST" ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname)
    )
      return response(404);
    if (bindings.COMMERCE_REVIEW_MODE !== "enabled") return response(412);
    try {
      const cookies = (request.headers.get("cookie") ?? "")
        .split(";")
        .map((v) => v.trim())
        .filter((v) => v.startsWith(patientSessionCookieName + "="));
      if (cookies.length !== 1) return response(401, undefined, true);
      const proof = await openPatientSession(
        cookies[0]!.slice(patientSessionCookieName.length + 1),
        readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
      );
      if (!proof) return response(401, undefined, true);
      if (proof.tenantId !== bindings.COMMERCE_REVIEW_TENANT_ID) return response(403);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "order-review",
          routeClass: "protected-command",
          maxBodyBytes: 4096,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return response(inspected.response.status);
      if (!z.uuid().safeParse(inspected.value.idempotencyKey).success) return response(422);
      const parsed = orderReviewCommandSchema.safeParse(inspected.value.body);
      if (!parsed.success) return response(422);
      if (
        parsed.data.action !== "read" &&
        parsed.data.requestKey !== inspected.value.idempotencyKey
      )
        return response(422);
      let dependencies = injected;
      if (!dependencies) {
        const config = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!config) return response(503);
        const client = createClient(config.url, config.secretKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const portal = new PatientPortalService(
          createSupabaseManagedIdentityProvider(config),
          new SupabaseIdentitySessionRepository(client),
          new SupabasePatientPortalRepository(client),
        );
        dependencies = {
          async authorise(p) {
            const { context, session, identity } = await portal.authorise(p);
            return {
              context,
              expiresAt: new Date(
                Math.min(
                  session.idleExpiresAt.getTime(),
                  session.absoluteExpiresAt.getTime(),
                  identity.expiresAt.getTime(),
                ),
              ),
            };
          },
          async execute(context, command) {
            const { data, error } = await client.rpc("patient_order_review", {
              p_context: context,
              p_command: command,
            });
            if (error) {
              if (error.code === "42501") {
                if (error.message === "PORTAL_REJECTED" || error.message === "INTAKE_REJECTED")
                  throw new IdentityRejectedError();
                throw new Error("COMMERCE_FORBIDDEN");
              }
              if (error.code === "40001" || error.code === "23505")
                throw new Error("COMMERCE_CONFLICT");
              throw new Error("COMMERCE_UNAVAILABLE");
            }
            return data;
          },
        };
        if (bindings.COMMERCE_CHECKOUT_MODE === "sandbox") {
          const account =
            typeof bindings.STRIPE_CHECKOUT_ACCOUNT_ID === "string"
              ? bindings.STRIPE_CHECKOUT_ACCOUNT_ID
              : "";
          const commands = createPilotCheckoutCommands(
            client,
            account,
            new PilotCheckoutProvider(bindings.STRIPE_RESTRICTED_KEY, account),
          );
          dependencies.prepare = commands.prepare;
          dependencies.checkout = commands.checkout;
          dependencies.ready = async (context) => {
            const { data, error } = await client.rpc("patient_checkout_ready", {
              p_context: context,
              p_account: account,
            });
            if (error) throw new Error("COMMERCE_FORBIDDEN");
            return data === true;
          };
        }
      }
      const authority = await dependencies.authorise(proof);
      if (parsed.data.action === "checkout") {
        if (bindings.COMMERCE_CHECKOUT_MODE !== "sandbox" || !dependencies.checkout)
          return response(412);
        const result = checkoutResultSchema.parse(
          await dependencies.checkout(
            authority.context,
            parsed.data.offerId,
            parsed.data.requestKey,
          ),
        );
        if (authority.expiresAt.getTime() <= Date.now()) return response(401, undefined, true);
        return response(200, result);
      }
      if (
        parsed.data.action === "read" &&
        bindings.COMMERCE_CHECKOUT_MODE === "sandbox" &&
        dependencies.prepare &&
        dependencies.ready &&
        (await dependencies.ready(authority.context))
      )
        await dependencies.prepare(authority.context, inspected.value.idempotencyKey!);
      const result = orderReviewResultSchema.parse(
        await dependencies.execute(authority.context, parsed.data),
      );
      if (result.review) {
        result.review.checkoutEnabled =
          bindings.COMMERCE_CHECKOUT_MODE === "sandbox" &&
          result.review.acceptance !== null &&
          Boolean(dependencies.ready && (await dependencies.ready(authority.context)));
        result.review.expiresAt = new Date(
          Math.min(Date.parse(result.review.expiresAt), authority.expiresAt.getTime()),
        ).toISOString();
        if (Date.parse(result.review.expiresAt) <= Date.now())
          return response(401, undefined, true);
      }
      return response(200, result);
    } catch (error) {
      if (error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError)
        return response(401, undefined, true);
      return response(
        error instanceof Error && error.message === "COMMERCE_CONFLICT"
          ? 409
          : error instanceof Error && error.message === "COMMERCE_FORBIDDEN"
            ? 403
            : 503,
      );
    }
  };
}
