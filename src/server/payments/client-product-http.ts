import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  clientCatalogueViewSchema,
  clientProductCommandSchema,
} from "@/domain/payments/client-product-catalogue";
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
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import {
  openPatientSession,
  patientSessionCookieName,
  readPatientSessionKey,
  clearPatientSessionCookie,
} from "@/server/identity/patient-session-cookie";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import { initialiseServerEnvironment } from "@/server/config/environment.server";

export type ClientProductBindings = PatientSessionBindings & {
  PRODUCT_CATALOGUE_MODE?: unknown;
  PRODUCT_CATALOGUE_TENANT_ID?: unknown;
};
type Dependencies = {
  authorise(proof: PatientSessionProof): Promise<{ context: PortalContext; expiresAt: Date }>;
  execute(context: PortalContext, command: unknown, provenance: string): Promise<unknown>;
};
function response(status: number, body?: unknown, clear = false) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
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
export function createClientProductHttpHandler(
  bindings: ClientProductBindings,
  injected?: Dependencies,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      url.pathname !== "/portal/products/command" ||
      url.search ||
      request.method !== "POST" ||
      !(
        url.origin === "https://meneerhealth.co.za" ||
        ["127.0.0.1", "localhost"].includes(url.hostname)
      )
    )
      return response(404);
    const provenance =
      bindings.PRODUCT_CATALOGUE_MODE === "synthetic"
        ? "local-synthetic"
        : bindings.PRODUCT_CATALOGUE_MODE === "pilot"
          ? "precise-wellness-rrp"
          : null;
    if (!provenance || !z.uuid().safeParse(bindings.PRODUCT_CATALOGUE_TENANT_ID).success)
      return response(412);
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
      if (proof.tenantId !== bindings.PRODUCT_CATALOGUE_TENANT_ID) return response(403);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "client-products",
          routeClass: "protected-command",
          maxBodyBytes: 1024,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return response(inspected.response.status);
      const command = clientProductCommandSchema.safeParse(inspected.value.body);
      if (
        !command.success ||
        !z.uuid().safeParse(inspected.value.idempotencyKey).success ||
        (command.data.action === "register_interest" &&
          command.data.requestKey !== inspected.value.idempotencyKey)
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
          async execute(context, c, source) {
            const { data, error } = await client.rpc("patient_product_catalogue", {
              p_context: context,
              p_command: c,
              p_provenance: source,
            });
            if (error?.code === "42501") throw new IdentityRejectedError();
            if (error?.code === "PT409") throw new Error("CATALOGUE_CONFLICT");
            if (error) throw new Error("CATALOGUE_UNAVAILABLE");
            return data;
          },
        };
      }
      const authority = await dependencies.authorise(proof);
      if (
        authority.context.tenantId !== proof.tenantId ||
        authority.context.subjectId !== proof.subjectId ||
        authority.context.sessionId !== proof.sessionId ||
        authority.context.purpose !== "account"
      )
        throw new IdentityRejectedError();
      const result = clientCatalogueViewSchema.parse(
        await dependencies.execute(authority.context, command.data, provenance),
      );
      if (result.synthetic !== (provenance === "local-synthetic"))
        throw new Error("CATALOGUE_UNAVAILABLE");
      result.expiresAt = new Date(
        Math.min(Date.parse(result.expiresAt), authority.expiresAt.getTime()),
      ).toISOString();
      if (Date.parse(result.expiresAt) <= Date.now()) return response(401, undefined, true);
      return response(200, result);
    } catch (error) {
      if (error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError)
        return response(401, undefined, true);
      return response(error instanceof Error && error.message === "CATALOGUE_CONFLICT" ? 409 : 503);
    }
  };
}
