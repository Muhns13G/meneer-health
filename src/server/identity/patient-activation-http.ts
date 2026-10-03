import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabasePatientActivationRepository } from "@/adapters/identity/supabase/supabase-patient-activation-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientActivationService } from "@/application/identity/patient-activation-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  openPreactivationProof,
  preactivationCookieName,
  readPreactivationKey,
} from "@/server/identity/preactivation-cookie";
import type { PatientVerificationBindings } from "@/server/identity/patient-verification-http";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";

type ActivationPort = Pick<PatientActivationService, "prepare" | "activate">;
function response(status: number, body?: unknown): Response {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      ...(body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
    },
  });
}

export function createPatientActivationHttpHandler(
  bindings: PatientVerificationBindings,
  injected?: ActivationPort,
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      !(
        (url.pathname === "/account/activate/instruments" && request.method === "GET") ||
        (url.pathname === "/account/activate" && request.method === "POST")
      )
    )
      return response(405);
    if (
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) &&
      !url.hostname.endsWith(".meneerhealth.co.za")
    )
      return response(404);
    if (url.search || !["GET", "POST"].includes(request.method)) return response(405);
    if (request.method === "GET" && request.headers.get("sec-fetch-site") === "cross-site")
      return response(403);
    let activation: ActivationPort;
    let proof;
    try {
      const cookies = (request.headers.get("cookie") ?? "")
        .split(";")
        .map((value) => value.trim())
        .filter((value) => value.startsWith(`${preactivationCookieName}=`));
      if (cookies.length !== 1) return response(401);
      proof = await openPreactivationProof(
        cookies[0].slice(preactivationCookieName.length + 1),
        readPreactivationKey(bindings.IDENTITY_PREACTIVATION_KEY_BASE64),
      );
      if (!proof) return response(401);
      if (injected) activation = injected;
      else {
        const configuration = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!configuration) return response(503);
        activation = new PatientActivationService(
          createSupabaseManagedIdentityProvider(configuration),
          new SupabasePatientActivationRepository(
            createClient(configuration.url, configuration.secretKey, {
              auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
            }),
          ),
        );
      }
    } catch {
      return response(503);
    }

    try {
      if (request.method === "GET") {
        if (
          !(
            await bindings.REQUEST_RATE_LIMITER.limit({
              key: `patient-activation-read:${proof.invitationId}`,
            })
          ).success
        )
          return response(429);
        return response(200, await activation.prepare(proof));
      }
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "patient-activation",
          routeClass: "protected-command",
          maxBodyBytes: 2048,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.invitationId },
      );
      if (!inspected.allowed) return inspected.response;
      if (inspected.value.body.requestKey !== inspected.value.idempotencyKey) return response(422);
      await activation.activate(proof, inspected.value.body);
      // Keep the short-lived proof for safe retries after a lost response. It is not an account session.
      return response(204);
    } catch (error) {
      return response(error instanceof IdentityRejectedError ? 422 : 503);
    }
  };
}
