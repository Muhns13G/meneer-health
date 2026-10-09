import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabaseWorkforceContextRepository } from "@/adapters/identity/supabase/supabase-workforce-context-repository";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import {
  clearWorkforceCookie,
  openWorkforceProof,
  sealWorkforceProof,
} from "./workforce-session-cookie";
import type { PatientSessionBindings } from "./patient-session-http";

type Service = Pick<
  WorkforceSessionService,
  "requestCode" | "verifyCode" | "completeMfa" | "authorise" | "renew" | "invite" | "signOut"
> &
  Partial<Pick<WorkforceSessionService, "completeMfaForContextChoice" | "selectContext">>;
function response(status: number, body?: unknown, cookie?: string) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
}
export function workforceServiceFor(bindings: PatientSessionBindings) {
  const config = initialiseServerEnvironment({
    SUPABASE_URL: bindings.SUPABASE_URL,
    SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
  }).environment.supabase;
  if (!config) throw new Error("WORKFORCE_UNAVAILABLE");
  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return new WorkforceSessionService(
    createSupabaseManagedIdentityProvider(config),
    new SupabaseWorkforceContextRepository(client),
    new SupabaseIdentitySessionRepository(client),
  );
}
export function createWorkforceHttpHandler(bindings: PatientSessionBindings, injected?: Service) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.search || !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname))
      return response(404);
    if (!/^\/staff\/(sign-in|mfa|context|session|invite|sign-out)$/.test(url.pathname))
      return response(404);
    if (url.pathname === "/staff/session" && request.method === "GET") {
      if (
        request.headers.get("sec-fetch-site") === "cross-site" ||
        (request.headers.has("origin") && request.headers.get("origin") !== url.origin)
      )
        return response(403);
      try {
        const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
        if (!proof?.sessionId) return response(401, undefined, clearWorkforceCookie());
        if (
          !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `workforce-read:${proof.sessionId}` }))
            .success
        )
          return response(429);
        const { context, session } = await (injected ?? workforceServiceFor(bindings)).authorise(
          proof,
        );
        return response(200, {
          role: context.role,
          purpose: context.purpose,
          expiresAt: session.idleExpiresAt.toISOString(),
        });
      } catch (error) {
        return response(
          error instanceof IdentityRejectedError ? 401 : 503,
          undefined,
          clearWorkforceCookie(),
        );
      }
    }
    const inspected = await inspectProtectedFormRequest(request, {
      action: `workforce:${url.pathname}`,
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 512,
    });
    if (!inspected.allowed) return inspected.response;
    const fields = inspected.value;
    const only = (...names: string[]) =>
      [...fields.keys()].length === names.length && names.every((name) => fields.has(name));
    try {
      const service = injected ?? workforceServiceFor(bindings);
      if (url.pathname === "/staff/sign-in") {
        if (fields.get("action") === "request" && only("action", "email")) {
          await service.requestCode(fields.get("email")!);
          return response(202);
        }
        if (
          (fields.get("action") === "verify" || fields.get("action") === "invitation") &&
          only("action", "email", "code")
        ) {
          const result = await service.verifyCode(
            fields.get("email")!,
            fields.get("code")!,
            fields.get("action") === "invitation",
          );
          try {
            const cookie = await sealWorkforceProof(
              result.proof,
              new Date(Date.now() + 600_000),
              bindings.IDENTITY_SESSION_KEY_BASE64,
            );
            return response(
              200,
              result.enrollment
                ? {
                    enrollment: {
                      qrCode: result.enrollment.qrCode,
                      secret: result.enrollment.secret,
                    },
                  }
                : { enrollment: null },
              cookie,
            );
          } catch (error) {
            await service.signOut(result.proof);
            throw error;
          }
        }
        return response(422);
      }
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof) return response(401, undefined, clearWorkforceCookie());
      if (url.pathname === "/staff/mfa" && only("code")) {
        if (proof.contextChoiceRequired) {
          if (!service.completeMfaForContextChoice) throw new Error("WORKFORCE_UNAVAILABLE");
          const result = await service.completeMfaForContextChoice(proof, fields.get("code")!);
          try {
            return response(
              200,
              { contexts: result.contexts },
              await sealWorkforceProof(
                result.proof,
                new Date(Date.now() + 600_000),
                bindings.IDENTITY_SESSION_KEY_BASE64,
              ),
            );
          } catch (error) {
            await service.signOut(result.proof);
            throw error;
          }
        }
        const result = await service.completeMfa(proof, fields.get("code")!);
        try {
          return response(
            204,
            undefined,
            await sealWorkforceProof(
              result.proof,
              result.session.absoluteExpiresAt,
              bindings.IDENTITY_SESSION_KEY_BASE64,
            ),
          );
        } catch (error) {
          await service.signOut(result.proof);
          throw error;
        }
      }
      if (url.pathname === "/staff/context" && only("tenantId", "role")) {
        if (!service.selectContext) throw new Error("WORKFORCE_UNAVAILABLE");
        const result = await service.selectContext(
          proof,
          fields.get("tenantId")!,
          fields.get("role")!,
        );
        try {
          return response(
            204,
            undefined,
            await sealWorkforceProof(
              result.proof,
              result.session.absoluteExpiresAt,
              bindings.IDENTITY_SESSION_KEY_BASE64,
            ),
          );
        } catch (error) {
          await service.signOut(result.proof);
          throw error;
        }
      }
      if (url.pathname === "/staff/session" && only("action") && fields.get("action") === "renew") {
        const result = await service.renew(proof);
        try {
          return response(
            204,
            undefined,
            await sealWorkforceProof(
              result.proof,
              result.session.absoluteExpiresAt,
              bindings.IDENTITY_SESSION_KEY_BASE64,
            ),
          );
        } catch (error) {
          await service.signOut(result.proof);
          throw error;
        }
      }
      if (
        url.pathname === "/staff/sign-out" &&
        only("action") &&
        fields.get("action") === "sign-out"
      ) {
        await service.signOut(proof);
        return response(204, undefined, clearWorkforceCookie());
      }
      if (url.pathname === "/staff/invite" && only("email", "requestKey")) {
        await service.invite(proof, fields.get("email")!, fields.get("requestKey")!);
        return response(204);
      }
      return response(422);
    } catch (error) {
      if (
        url.pathname === "/staff/sign-in" &&
        fields.get("action") === "request" &&
        error instanceof IdentityRejectedError
      )
        return response(202);
      return response(
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 401
          : 503,
      );
    }
  };
}
