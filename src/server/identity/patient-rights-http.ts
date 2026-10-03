import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabasePatientRightsRepository } from "@/adapters/identity/supabase/supabase-patient-rights-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientPortalService } from "@/application/identity/patient-portal-service";
import { PatientRightsService } from "@/application/identity/patient-rights-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import {
  PatientRightsConflictError,
  patientRightsResultSchema,
} from "@/domain/identity/patient-rights";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import {
  openPatientSession,
  patientSessionCookieName,
  readPatientSessionKey,
  clearPatientSessionCookie,
} from "./patient-session-cookie";
import type { PatientSessionBindings } from "./patient-session-http";

function response(status: number, body?: unknown, clear = false) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
      ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      ...(clear ? { "Set-Cookie": clearPatientSessionCookie() } : {}),
    },
  });
}
export function createPatientRightsHttpHandler(
  bindings: PatientSessionBindings,
  injected?: Pick<PatientRightsService, "execute">,
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname !== "/portal/rights/command" || url.search || request.method !== "POST")
      return response(405);
    if (
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) &&
      !url.hostname.endsWith(".meneerhealth.co.za")
    )
      return response(404);
    try {
      const cookies = (request.headers.get("cookie") ?? "")
        .split(";")
        .map((c) => c.trim())
        .filter((c) => c.startsWith(`${patientSessionCookieName}=`));
      if (cookies.length !== 1) return response(401, undefined, true);
      const proof = await openPatientSession(
        cookies[0].slice(patientSessionCookieName.length + 1),
        readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
      );
      if (!proof) return response(401, undefined, true);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "patient-rights",
          routeClass: "protected-command",
          maxBodyBytes: 1024,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return inspected.response;
      if (inspected.value.body.requestKey !== inspected.value.idempotencyKey) return response(422);
      let service = injected;
      if (!service) {
        const config = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!config) return response(503);
        const client = createClient(config.url, config.secretKey, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        service = new PatientRightsService(
          new PatientPortalService(
            createSupabaseManagedIdentityProvider(config),
            new SupabaseIdentitySessionRepository(client),
            new SupabasePatientPortalRepository(client),
          ),
          new SupabasePatientRightsRepository(client),
        );
      }
      const parsed = patientRightsResultSchema.safeParse(
        await service.execute(proof, inspected.value.body),
      );
      if (!parsed.success) return response(503);
      return response(200, parsed.data);
    } catch (error) {
      if (error instanceof PatientRightsConflictError) return response(409);
      return error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
        ? response(401, undefined, true)
        : response(503);
    }
  };
}
