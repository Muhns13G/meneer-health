import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SupabaseQueueRepository } from "@/adapters/persistence/supabase/supabase-queue-repository";
import { queueFilterSchema } from "@/application/operations/queue-projection";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";

function response(status: number, value?: unknown) {
  return new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
      "Content-Type": "application/json",
    },
  });
}
export function createQueueHttpHandler(
  bindings: PatientSessionBindings,
  injected?: {
    workforce: Pick<WorkforceSessionService, "authorise">;
    queue: Pick<SupabaseQueueRepository, "list" | "detail">;
  },
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) ||
      !["/staff/queue/read", "/staff/queue/detail"].includes(url.pathname)
    )
      return response(404);
    const inspected = await inspectProtectedFormRequest(request, {
      action: "operations-read",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 512,
    });
    if (!inspected.allowed) return response(inspected.response.status);
    const fields = inspected.value;
    const only = (...names: string[]) =>
      [...fields.keys()].length === names.length && names.every((n) => fields.has(n));
    let filter;
    const caseId = fields.get("caseId");
    if (url.pathname.endsWith("/detail")) {
      if (!only("caseId") || !z.uuid().safeParse(caseId).success) return response(422);
    } else {
      if (!only("state", "afterCreatedAt", "afterId")) return response(422);
      const parsed = queueFilterSchema.safeParse({
        state: fields.get("state") || null,
        cursor:
          fields.get("afterCreatedAt") || fields.get("afterId")
            ? {
                createdAt: fields.get("afterCreatedAt"),
                id: fields.get("afterId"),
              }
            : null,
      });
      if (!parsed.success) return response(422);
      filter = parsed.data;
    }
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return response(401);
      if (
        !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `queue-read:${proof.sessionId}` }))
          .success
      )
        return response(429);
      const workforce = injected?.workforce ?? workforceServiceFor(bindings);
      const { identity, context, session } = await workforce.authorise(proof);
      if (context.role !== "operations" || context.purpose !== "operations") return response(403);
      const config = injected
        ? undefined
        : initialiseServerEnvironment({
            SUPABASE_URL: bindings.SUPABASE_URL,
            SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
          }).environment.supabase;
      if (!injected && !config) return response(503);
      const queue =
        injected?.queue ??
        new SupabaseQueueRepository(
          createClient(config!.url, config!.secretKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          }),
        );
      const result = response(
        200,
        filter
          ? await queue.list(identity, proof, filter)
          : await queue.detail(identity, proof, caseId!),
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
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 403
          : 503,
      );
    }
  };
}
