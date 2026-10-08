import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SupabaseMobileInvitationRepository } from "@/adapters/identity/supabase/supabase-mobile-invitation-repository";
import {
  mobileInvitationCommandSchema,
  MobileInvitationConflictError,
  MobileInvitationBudgetError,
} from "@/application/identity/mobile-invitation";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import { workforceServiceFor } from "./workforce-http";
import { openWorkforceProof } from "./workforce-session-cookie";
import type { PatientSessionBindings } from "./patient-session-http";

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
export function createMobileInvitationHttpHandler(
  bindings: PatientSessionBindings,
  injected?: {
    workforce: Pick<WorkforceSessionService, "authorise">;
    repository: Pick<SupabaseMobileInvitationRepository, "read" | "command">;
  },
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) ||
      !["/staff/mobile-invitations/read", "/staff/mobile-invitations/command"].includes(
        url.pathname,
      )
    )
      return response(404);
    const inspected = await inspectProtectedFormRequest(request, {
      action: "mobile-invitation-staff",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 2048,
    });
    if (!inspected.allowed) return response(inspected.response.status);
    if (new Set(inspected.value.keys()).size !== [...inspected.value.keys()].length)
      return response(422);
    const fields = Object.fromEntries(inspected.value);
    const reading = url.pathname.endsWith("/read");
    const parsed = reading
      ? null
      : mobileInvitationCommandSchema.safeParse({
          ...fields,
          ...(Object.hasOwn(fields, "expectedVersion")
            ? {
                expectedVersion: /^[1-9][0-9]{0,8}$/.test(fields.expectedVersion!)
                  ? Number(fields.expectedVersion)
                  : null,
              }
            : {}),
        });
    if (
      reading
        ? Object.keys(fields).length !== 1 ||
          !Object.hasOwn(fields, "afterId") ||
          (fields.afterId !== "" && !z.uuid().safeParse(fields.afterId).success)
        : !parsed?.success
    )
      return response(422);
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return response(401);
      if (
        !(
          await bindings.REQUEST_RATE_LIMITER.limit({ key: `mobile-invitation:${proof.sessionId}` })
        ).success
      )
        return response(429);
      const { identity, context, session } = await (
        injected?.workforce ?? workforceServiceFor(bindings)
      ).authorise(proof);
      if (context.role !== "operations" || context.purpose !== "operations") return response(403);
      const config = injected
        ? undefined
        : initialiseServerEnvironment({
            SUPABASE_URL: bindings.SUPABASE_URL,
            SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
          }).environment.supabase;
      if (!injected && !config) return response(503);
      const repository =
        injected?.repository ??
        new SupabaseMobileInvitationRepository(
          createClient(config!.url, config!.secretKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          }),
        );
      const result = response(
        200,
        reading
          ? await repository.read(identity, proof, fields.afterId || null)
          : await repository.command(identity, proof, parsed!.data!),
      );
      result.headers.set(
        "X-Session-Expires-At",
        new Date(
          Math.min(
            session.idleExpiresAt.getTime(),
            session.absoluteExpiresAt.getTime(),
            identity.expiresAt.getTime(),
          ),
        ).toISOString(),
      );
      return result;
    } catch (error) {
      return response(
        error instanceof MobileInvitationConflictError
          ? 409
          : error instanceof MobileInvitationBudgetError
            ? 429
            : error instanceof IdentityRejectedError ||
                error instanceof IdentitySessionRejectedError
              ? 403
              : 503,
      );
    }
  };
}
