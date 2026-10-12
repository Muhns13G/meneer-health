import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PublicRegistrationService } from "@/application/identity/public-registration-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { SupabasePublicRegistrationRepository } from "@/adapters/identity/supabase/supabase-public-registration-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import { createPatientSessionService, type PatientSessionBindings } from "./patient-session-http";
import {
  readPatientSessionKey,
  sealPatientSession,
  patientSessionCookie,
} from "./patient-session-cookie";
import {
  preactivationCookieName,
  preactivationTtlSeconds,
  readPreactivationKey,
  sealPreactivationProof,
} from "./preactivation-cookie";
export type PublicRegistrationBindings = PatientSessionBindings & {
  PUBLIC_REGISTRATION_MODE?: unknown;
  PUBLIC_REGISTRATION_TENANT_ID?: unknown;
  IDENTITY_PREACTIVATION_KEY_BASE64?: unknown;
};
const empty = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      ...headers,
    },
  });
export function createPublicRegistrationHttpHandler(
  bindings: PublicRegistrationBindings,
  injected?: PublicRegistrationService,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) ||
      url.search ||
      !["/account/sign-up", "/account/sign-up/availability"].includes(url.pathname)
    )
      return empty(404);
    if (
      bindings.PUBLIC_REGISTRATION_MODE !== "enabled" ||
      !z.uuid().safeParse(bindings.PUBLIC_REGISTRATION_TENANT_ID).success
    )
      return empty(412);
    let service: PublicRegistrationService;
    try {
      if (injected) service = injected;
      else {
        readPreactivationKey(bindings.IDENTITY_PREACTIVATION_KEY_BASE64);
        readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64);
        const configuration = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        const sessions = createPatientSessionService(bindings);
        if (!configuration || !sessions) return empty(503);
        service = new PublicRegistrationService(
          String(bindings.PUBLIC_REGISTRATION_TENANT_ID),
          createSupabaseManagedIdentityProvider(configuration),
          new SupabasePublicRegistrationRepository(
            createClient(configuration.url, configuration.secretKey, {
              auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            }),
          ),
          sessions,
        );
      }
      if (url.pathname.endsWith("/availability")) {
        if (request.method !== "GET") return empty(405);
        const address = request.headers.get("cf-connecting-ip")?.trim() || "unattributed";
        if (
          !(
            await bindings.REQUEST_RATE_LIMITER.limit({
              key: `public-registration-availability:${address}`,
            })
          ).success
        )
          return empty(429);
        return empty((await service.available()) ? 204 : 412);
      }
      if (request.method !== "POST") return empty(405);
      const inspected = await inspectProtectedFormRequest(request, {
        action: "public-registration",
        rateLimiter: bindings.REQUEST_RATE_LIMITER,
        maximumBytes: 384,
      });
      if (!inspected.allowed) return inspected.response;
      const fields = inspected.value,
        action = fields.get("action");
      const keys = [...fields.keys()];
      if (
        !z.email().max(254).safeParse(fields.get("email")?.trim()).success ||
        (action !== "request" && action !== "verify") ||
        keys.length !== (action === "request" ? 2 : 3) ||
        keys.some(
          (k) => !["action", "email", ...(action === "verify" ? ["code"] : [])].includes(k),
        ) ||
        (action === "verify" && !/^\d{6}$/.test(fields.get("code") ?? ""))
      )
        return empty(422);
      if (!(await service.available())) return empty(412);
      if (action === "request") {
        try {
          await service.request(fields.get("email")!, new URL("/start", url).toString());
        } catch {
          /* Same outward response; no account enumeration or blind retry. */
        }
        return empty(202);
      }
      const verified = await service.verify(fields.get("email")!, fields.get("code")!);
      if (verified.kind === "session") {
        try {
          const token = await sealPatientSession(
            verified.session,
            readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
          );
          if (token.length > 3800) throw new Error("SESSION_TOO_LARGE");
          return empty(204, {
            "Set-Cookie": patientSessionCookie(token, verified.session.session.absoluteExpiresAt),
            "X-Meneer-Session": "ready",
          });
        } catch {
          await service.discard(verified.session.providerSession, verified.session);
          return empty(503);
        }
      }
      try {
        const token = await sealPreactivationProof(
          verified.verified,
          readPreactivationKey(bindings.IDENTITY_PREACTIVATION_KEY_BASE64),
        );
        if (token.length > 3800) throw new Error("PROOF_TOO_LARGE");
        return empty(204, {
          "Set-Cookie": `${preactivationCookieName}=${token}; Path=/; Max-Age=${preactivationTtlSeconds}; HttpOnly; Secure; SameSite=Strict`,
          "X-Meneer-Session": "activation",
        });
      } catch {
        await service.discard(verified.verified.session);
        return empty(503);
      }
    } catch (error) {
      return empty(error instanceof IdentityRejectedError ? 422 : 503);
    }
  };
}
