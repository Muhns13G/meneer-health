import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientPortalService } from "@/application/identity/patient-portal-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { portalViewSchema } from "@/domain/identity/patient-portal";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  clearPatientSessionCookie,
  openPatientSession,
  patientSessionCookieName,
  readPatientSessionKey,
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

export function createPatientPortalHttpHandler(
  bindings: PatientSessionBindings,
  injected?: Pick<PatientPortalService, "read">,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname !== "/portal/account") return response(404);
    if (request.method !== "GET" || url.search) return response(405);
    if (
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) &&
      !url.hostname.endsWith(".meneerhealth.co.za")
    )
      return response(404);
    if (
      request.headers.get("sec-fetch-site") === "cross-site" ||
      (request.headers.has("origin") && request.headers.get("origin") !== url.origin)
    )
      return response(403);
    if (
      request.headers.has("transfer-encoding") ||
      (request.headers.has("content-length") && request.headers.get("content-length") !== "0")
    )
      return response(400);
    const cookies = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((c) => c.trim())
      .filter((c) => c.startsWith(`${patientSessionCookieName}=`));
    if (cookies.length !== 1) return response(401, undefined, true);
    try {
      const proof = await openPatientSession(
        cookies[0].slice(patientSessionCookieName.length + 1),
        readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
      );
      if (!proof) return response(401, undefined, true);
      if (
        !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `patient-portal:${proof.sessionId}` }))
          .success
      )
        return response(429);
      let service = injected;
      if (!service) {
        const configuration = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!configuration) return response(503);
        const client = createClient(configuration.url, configuration.secretKey, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        service = new PatientPortalService(
          createSupabaseManagedIdentityProvider(configuration),
          new SupabaseIdentitySessionRepository(client),
          new SupabasePatientPortalRepository(client),
        );
      }
      const parsed = portalViewSchema.safeParse(await service.read(proof));
      if (!parsed.success) return response(503);
      return response(200, parsed.data);
    } catch (error) {
      return error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
        ? response(401, undefined, true)
        : response(503);
    }
  };
}
