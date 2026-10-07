import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import { operationsAlertListSchema } from "@/application/operations/alert-projection";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
const responseCommand = z.strictObject({
  alertId: z.uuid(),
  action: z.enum(["acknowledged", "resolved"]),
  requestKey: z.uuid(),
});
const result = (status: number, value?: unknown) =>
  new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
    },
  });

export function createAlertHttpHandler(
  bindings: PatientSessionBindings,
  injected?: {
    workforce: Pick<WorkforceSessionService, "authorise">;
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { code?: string } | null }>;
  },
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) ||
      !["/staff/alerts/read", "/staff/alerts/respond"].includes(url.pathname)
    )
      return result(404);
    const inspected = await inspectProtectedFormRequest(request, {
      action: url.pathname.endsWith("/respond") ? "operations-command" : "operations-read",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 512,
    });
    if (!inspected.allowed) return result(inspected.response.status);
    const isRead = url.pathname.endsWith("/read");
    const parsed = responseCommand.safeParse(Object.fromEntries(inspected.value));
    if (isRead ? [...inspected.value.keys()].length !== 0 : !parsed.success) return result(422);
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return result(401);
      if (
        !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `alerts:${proof.sessionId}` })).success
      )
        return result(429);
      const { identity, context } = await (
        injected?.workforce ?? workforceServiceFor(bindings)
      ).authorise(proof);
      if (
        context.role !== "admin" ||
        context.purpose !== "security_administration" ||
        identity.assurance !== "aal2"
      )
        return result(403);
      if (
        !injected &&
        (typeof bindings.SUPABASE_URL !== "string" ||
          typeof bindings.SUPABASE_SECRET_KEY !== "string")
      )
        return result(503);
      const rpc =
        injected?.rpc ??
        (async (name, args) => {
          const client = createClient(
            bindings.SUPABASE_URL as string,
            bindings.SUPABASE_SECRET_KEY as string,
            { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
          );
          return client.rpc(name, args);
        });
      const authority = {
        p_provider_subject: identity.providerSubject,
        p_provider_session_id: identity.providerSessionId,
        p_verified_email: identity.verifiedContact.value.trim().toLowerCase(),
        p_session_id: proof.sessionId,
        p_subject_id: proof.context.subjectId,
        p_tenant_id: proof.context.tenantId,
      };
      const { data, error } = await rpc(
        isRead ? "read_operations_alerts" : "respond_operations_alert",
        {
          ...authority,
          ...(!isRead && parsed.success
            ? {
                p_alert_id: parsed.data.alertId,
                p_action: parsed.data.action,
                p_request_key: parsed.data.requestKey,
              }
            : {}),
        },
      );
      if (error)
        return result(
          error.code === "42501"
            ? 403
            : ["23505", "40001", "55000"].includes(error.code ?? "")
              ? 409
              : 503,
        );
      const valid = isRead ? operationsAlertListSchema.safeParse(data) : z.uuid().safeParse(data);
      if (!valid.success) return result(503);
      return result(200, isRead ? { alerts: valid.data } : { responseId: valid.data });
    } catch (error) {
      return result(
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 401
          : 503,
      );
    }
  };
}
