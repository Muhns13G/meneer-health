import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientPortalService } from "@/application/identity/patient-portal-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { refundCommandSchema, refundViewSchema } from "@/domain/payments/refund";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import {
  openPatientSession,
  readPatientSessionCookie,
  readPatientSessionKey,
} from "@/server/identity/patient-session-cookie";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import { dispatchRefund, PilotRefundProvider } from "./pilot-refund";
import type { CommerceReviewBindings } from "./order-review-http";

type Authority = { tenantId: string; sessionId: string; expiresAt: Date; context: unknown };
type Dependencies = {
  authorise(request: Request, staff: boolean): Promise<Authority>;
  command(staff: boolean, context: unknown, command: Record<string, unknown>): Promise<unknown>;
  provider: Pick<PilotRefundProvider, "submit">;
};
function reply(status: number, value?: unknown) {
  return new Response(value === undefined ? null : JSON.stringify(value), {
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
export function createRefundHttpHandler(
  bindings: CommerceReviewBindings & { COMMERCE_REFUND_MODE?: unknown },
  injected?: Dependencies,
) {
  return async (request: Request) => {
    const url = new URL(request.url),
      staff = url.pathname === "/staff/payments/refund";
    if (
      (!staff && url.pathname !== "/portal/payments/refund") ||
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname)
    )
      return reply(404);
    if (bindings.COMMERCE_REVIEW_MODE !== "enabled") return reply(412);
    if (request.method !== "POST") return reply(405);
    if (
      request.headers.get("origin") !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply(403);
    try {
      let dependencies = injected;
      if (!dependencies) {
        const config = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!config) return reply(503);
        const client = createClient(config.url, config.secretKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        dependencies = {
          async authorise(req, workforce) {
            if (workforce) {
              const proof = await openWorkforceProof(req, bindings.IDENTITY_SESSION_KEY_BASE64);
              if (!proof?.sessionId) throw new IdentityRejectedError();
              const { context, session, identity } =
                await workforceServiceFor(bindings).authorise(proof);
              if (
                context.role !== "operations" ||
                context.purpose !== "operations" ||
                identity.assurance !== "aal2"
              )
                throw new IdentityRejectedError();
              return {
                tenantId: context.tenantId,
                sessionId: proof.sessionId,
                expiresAt: new Date(
                  Math.min(
                    session.idleExpiresAt.getTime(),
                    session.absoluteExpiresAt.getTime(),
                    identity.expiresAt.getTime(),
                  ),
                ),
                context: {
                  p_provider_subject: identity.providerSubject,
                  p_provider_session_id: identity.providerSessionId,
                  p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
                  p_session_id: proof.sessionId,
                  p_subject_id: context.subjectId,
                  p_tenant_id: context.tenantId,
                },
              };
            }
            const cookie = readPatientSessionCookie(req);
            const proof =
              cookie &&
              (await openPatientSession(
                cookie,
                readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
              ));
            if (!proof) throw new IdentityRejectedError();
            const { context, session, identity } = await new PatientPortalService(
              createSupabaseManagedIdentityProvider(config),
              new SupabaseIdentitySessionRepository(client),
              new SupabasePatientPortalRepository(client),
            ).authorise(proof);
            return {
              tenantId: context.tenantId,
              sessionId: proof.sessionId,
              expiresAt: new Date(
                Math.min(
                  session.idleExpiresAt.getTime(),
                  session.absoluteExpiresAt.getTime(),
                  identity.expiresAt.getTime(),
                ),
              ),
              context,
            };
          },
          async command(workforce, context, command) {
            const { data, error } = await client.rpc(
              workforce ? "staff_refund_command" : "patient_refund_command",
              { [workforce ? "p_authority" : "p_context"]: context, p_command: command },
            );
            if (error?.code === "42501") throw new IdentityRejectedError();
            if (error) throw new Error("REFUND_UNAVAILABLE");
            return data as unknown;
          },
          // Lazy construction: read/request paths need no refund-capable credentials.
          provider: {
            submit: (value) =>
              new PilotRefundProvider(
                bindings.STRIPE_RESTRICTED_KEY,
                typeof bindings.STRIPE_CHECKOUT_ACCOUNT_ID === "string"
                  ? bindings.STRIPE_CHECKOUT_ACCOUNT_ID
                  : "",
              ).submit(value),
          },
        };
      }
      const authority = await dependencies.authorise(request, staff);
      if (
        authority.tenantId !== bindings.COMMERCE_REVIEW_TENANT_ID ||
        authority.expiresAt.getTime() <= Date.now()
      )
        return reply(403);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "payment-refund-command",
          routeClass: "protected-command",
          maxBodyBytes: 1024,
          requireAntiAutomation: false,
          requireIdempotency: false,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: authority.sessionId },
      );
      if (!inspected.allowed) return reply(inspected.response.status);
      const parsed = refundCommandSchema.safeParse(inspected.value.body);
      if (
        !parsed.success ||
        (!staff && !["request", "read"].includes(parsed.data.action)) ||
        (staff && parsed.data.action === "request")
      )
        return reply(422);
      const command = parsed.data;
      if (command.action === "dispatch") {
        if (
          bindings.COMMERCE_REFUND_MODE !== "sandbox" ||
          bindings.COMMERCE_CHECKOUT_MODE !== "sandbox" ||
          bindings.COMMERCE_WEBHOOK_MODE !== "sandbox"
        )
          return reply(412);
        const deps = dependencies;
        await dispatchRefund(
          () => deps.command(true, authority.context, command),
          deps.provider,
          (result) =>
            deps
              .command(true, authority.context, {
                action: "record",
                offerId: command.offerId,
                refundId: command.refundId,
                ...result,
              })
              .then(() => undefined),
        );
      }
      const value = refundViewSchema.parse(
        await dependencies.command(
          staff,
          authority.context,
          command.action === "dispatch" ? { action: "read", offerId: command.offerId } : command,
        ),
      );
      value.expiresAt = new Date(
        Math.min(Date.parse(value.expiresAt), authority.expiresAt.getTime()),
      ).toISOString();
      if (Date.parse(value.expiresAt) <= Date.now()) return reply(401);
      return reply(200, value);
    } catch (error) {
      return reply(
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 403
          : 503,
      );
    }
  };
}
