import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientPortalService } from "@/application/identity/patient-portal-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import {
  paymentStatusPageSchema,
  paymentStatusRequestSchema,
} from "@/domain/payments/payment-status";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import {
  openPatientSession,
  readPatientSessionCookie,
  readPatientSessionKey,
} from "@/server/identity/patient-session-cookie";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import type { CommerceReviewBindings } from "./order-review-http";

type Authority = { tenantId: string; expiresAt: Date; args: Record<string, unknown> };
type Dependencies = {
  authorise(request: Request, staff: boolean): Promise<Authority>;
  read(staff: boolean, args: Record<string, unknown>): Promise<unknown>;
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
export function createPaymentStatusHttpHandler(
  bindings: CommerceReviewBindings,
  injected?: Dependencies,
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    const staff = url.pathname === "/staff/payments/read";
    if (
      (!staff && url.pathname !== "/portal/payments/read") ||
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname)
    )
      return response(404);
    if (bindings.COMMERCE_REVIEW_MODE !== "enabled") return response(412);
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
          async authorise(req, workforce) {
            if (workforce) {
              const proof = await openWorkforceProof(req, bindings.IDENTITY_SESSION_KEY_BASE64);
              if (!proof?.sessionId) throw new IdentityRejectedError();
              const { identity, context, session } =
                await workforceServiceFor(bindings).authorise(proof);
              if (
                context.role !== "operations" ||
                context.purpose !== "operations" ||
                identity.assurance !== "aal2"
              )
                throw new IdentityRejectedError();
              return {
                tenantId: context.tenantId,
                expiresAt: new Date(
                  Math.min(
                    session.idleExpiresAt.getTime(),
                    session.absoluteExpiresAt.getTime(),
                    identity.expiresAt.getTime(),
                  ),
                ),
                args: {
                  p_provider_subject: identity.providerSubject,
                  p_provider_session_id: identity.providerSessionId,
                  p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
                  p_session_id: proof.sessionId,
                  p_subject_id: context.subjectId,
                  p_tenant_id: context.tenantId,
                },
              };
            }
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
          async read(workforce, args) {
            const { data, error } = await client.rpc(
              workforce ? "read_staff_payment_status" : "read_patient_payment_status",
              args,
            );
            if (error?.code === "42501") throw new IdentityRejectedError();
            if (error) throw new Error("PAYMENT_STATUS_UNAVAILABLE");
            return data;
          },
        };
      }
      const authority = await dependencies.authorise(request, staff);
      if (authority.tenantId !== bindings.COMMERCE_REVIEW_TENANT_ID) return response(403);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "payment-status-read",
          routeClass: "protected-command",
          maxBodyBytes: 512,
          requireAntiAutomation: false,
          requireIdempotency: false,
        },
        {
          rateLimiter: bindings.REQUEST_RATE_LIMITER,
          principalRateKey: staff
            ? (authority.args.p_session_id as string)
            : (authority.args.p_context as { sessionId?: string })?.sessionId,
        },
      );
      if (!inspected.allowed) return response(inspected.response.status);
      const parsed = paymentStatusRequestSchema.safeParse(inspected.value.body);
      if (!parsed.success || (staff ? !parsed.data.caseId : parsed.data.caseId !== undefined))
        return response(422);
      const result = paymentStatusPageSchema.parse(
        await dependencies.read(staff, {
          ...authority.args,
          p_cursor: parsed.data.cursor,
          ...(staff ? { p_case_id: parsed.data.caseId } : {}),
        }),
      );
      result.expiresAt = new Date(
        Math.min(Date.parse(result.expiresAt), authority.expiresAt.getTime()),
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
