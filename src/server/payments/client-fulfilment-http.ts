import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientPortalService } from "@/application/identity/patient-portal-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import {
  clientFulfilmentViewSchema,
  clientFulfilmentRequestSchema,
} from "@/domain/payments/product-fulfilment";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  openPatientSession,
  readPatientSessionCookie,
  readPatientSessionKey,
} from "@/server/identity/patient-session-cookie";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import type { CommerceReviewBindings } from "./order-review-http";

type Authority = { tenantId: string; expiresAt: Date; args: Record<string, unknown> };
type Dependencies = {
  authorise(request: Request): Promise<Authority>;
  read(args: Record<string, unknown>): Promise<unknown>;
};
function response(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
    },
  });
}
export function createClientFulfilmentHttpHandler(
  bindings: CommerceReviewBindings,
  injected?: Dependencies,
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.pathname !== "/portal/order/fulfilment" ||
      url.search ||
      !(
        url.origin === "https://meneerhealth.co.za" ||
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return response(404);
    if (!["synthetic", "pilot"].includes(String(bindings.PRODUCT_ORDERING_MODE)))
      return response(412);
    if (request.method !== "POST") return response(405);
    if (
      request.headers.get("origin") !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return response(403);
    try {
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
        dependencies = {
          async authorise(req) {
            const value = readPatientSessionCookie(req);
            const proof =
              value &&
              (await openPatientSession(
                value,
                readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
              ));
            if (!proof) throw new IdentityRejectedError();
            const portal = new PatientPortalService(
              createSupabaseManagedIdentityProvider(config),
              new SupabaseIdentitySessionRepository(client),
              new SupabasePatientPortalRepository(client),
            );
            const { context, session, identity } = await portal.authorise(proof);
            return {
              tenantId: context.tenantId,
              args: { p_context: context },
              expiresAt: new Date(
                Math.min(
                  session.idleExpiresAt.getTime(),
                  session.absoluteExpiresAt.getTime(),
                  identity.expiresAt.getTime(),
                ),
              ),
            };
          },
          async read(args) {
            const { data, error } = await client.rpc("patient_product_fulfilment", args);
            if (error?.code === "42501") throw new IdentityRejectedError();
            if (error) throw new Error("CLIENT_FULFILMENT_UNAVAILABLE");
            return data;
          },
        };
      }
      const authority = await dependencies.authorise(request);
      if (authority.tenantId !== bindings.PRODUCT_ORDERING_TENANT_ID) return response(403);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "client-fulfilment-read",
          routeClass: "protected-command",
          maxBodyBytes: 512,
          requireAntiAutomation: false,
          requireIdempotency: false,
        },
        {
          rateLimiter: bindings.REQUEST_RATE_LIMITER,
          principalRateKey: (authority.args.p_context as { sessionId?: string })?.sessionId,
        },
      );
      if (!inspected.allowed) return response(inspected.response.status);
      const parsed = clientFulfilmentRequestSchema.safeParse(inspected.value.body);
      if (!parsed.success) return response(422);
      const result = clientFulfilmentViewSchema.parse(
        await dependencies.read({
          ...authority.args,
        }),
      );
      const current = await dependencies.authorise(request);
      if (current.tenantId !== authority.tenantId) return response(403);
      result.expiresAt = new Date(
        Math.min(
          Date.parse(result.expiresAt),
          authority.expiresAt.getTime(),
          current.expiresAt.getTime(),
        ),
      ).toISOString();
      if (Date.parse(result.expiresAt) <= Date.now()) return response(401);
      return response(200, result);
    } catch (error) {
      return response(
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 403
          : 503,
      );
    }
  };
}
