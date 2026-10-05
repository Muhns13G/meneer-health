import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import catalogue from "../../../content/medical-intake-catalogue.json";
import { SupabaseIntakeRepository } from "@/adapters/intake/supabase-intake-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientPortalService } from "@/application/identity/patient-portal-service";
import {
  MedicalIntakeService,
  IntakeConflictError,
  IntakeValidationError,
} from "@/application/intake/medical-intake-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import {
  openPatientSession,
  patientSessionCookieName,
  readPatientSessionKey,
} from "@/server/identity/patient-session-cookie";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import { encryptIntake, decryptIntake, readIntakeKeyRing } from "./intake-envelope";
export type IntakeBindings = PatientSessionBindings & {
  MEDICAL_INTAKE_MODE?: unknown;
  MEDICAL_INTAKE_KEYRING_JSON?: unknown;
  MEDICAL_INTAKE_TENANT_ID?: unknown;
};
const hex = (v: ArrayBuffer) =>
  Array.from(new Uint8Array(v), (b) => b.toString(16).padStart(2, "0")).join("");
function response(status: number, value?: unknown) {
  return new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Type": "application/json",
      Vary: "Cookie",
    },
  });
}
export async function medicalCatalogueHash() {
  return hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(catalogue))),
  );
}
export function createPatientIntakeHttpHandler(
  bindings: IntakeBindings,
  injected?: Pick<MedicalIntakeService, "execute">,
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.pathname !== "/portal/intake/command" ||
      url.search ||
      request.method !== "POST" ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname)
    )
      return response(404);
    if (bindings.MEDICAL_INTAKE_MODE !== "enabled") return response(412);
    try {
      const cookies = (request.headers.get("cookie") ?? "")
        .split(";")
        .map((v) => v.trim())
        .filter((v) => v.startsWith(patientSessionCookieName + "="));
      if (cookies.length !== 1) return response(401);
      const proof = await openPatientSession(
        cookies[0]!.slice(patientSessionCookieName.length + 1),
        readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
      );
      if (!proof) return response(401);
      if (proof.tenantId !== bindings.MEDICAL_INTAKE_TENANT_ID) return response(403);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "medical-intake",
          routeClass: "protected-command",
          maxBodyBytes: 65536,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return response(inspected.response.status);
      const input = inspected.value.body;
      if (
        input.action !== "read" &&
        input.action !== "rights_read" &&
        input.action !== "export" &&
        input.requestKey !== inspected.value.idempotencyKey
      )
        return response(422);
      let service = injected;
      if (!service) {
        const config = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!config) return response(503);
        const ring = readIntakeKeyRing(bindings.MEDICAL_INTAKE_KEYRING_JSON);
        const client = createClient(config.url, config.secretKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        service = new MedicalIntakeService(
          new PatientPortalService(
            createSupabaseManagedIdentityProvider(config),
            new SupabaseIdentitySessionRepository(client),
            new SupabasePatientPortalRepository(client),
          ),
          new SupabaseIntakeRepository(client),
          {
            encrypt: (value, scope) => encryptIntake(value, scope, ring),
            decrypt: (value, scope) => decryptIntake(value, scope, ring),
            async digests(value) {
              return Promise.all(
                [ring.current, ...Object.keys(ring.keys).filter((id) => id !== ring.current)].map(
                  async (id) =>
                    hex(
                      await crypto.subtle.sign(
                        "HMAC",
                        await crypto.subtle.deriveKey(
                          {
                            name: "HKDF",
                            hash: "SHA-256",
                            salt: new Uint8Array(32),
                            info: new TextEncoder().encode("meneer-medical-replay-v1"),
                          },
                          await crypto.subtle.importKey("raw", ring.keys[id]!, "HKDF", false, [
                            "deriveKey",
                          ]),
                          { name: "HMAC", hash: "SHA-256", length: 256 },
                          false,
                          ["sign"],
                        ),
                        new TextEncoder().encode(JSON.stringify(value)),
                      ),
                    ),
                ),
              );
            },
          },
          await medicalCatalogueHash(),
        );
      }
      return response(200, await service.execute(proof, input));
    } catch (error) {
      if (error instanceof IntakeConflictError) return response(409);
      if (error instanceof IntakeValidationError) return response(422);
      return response(
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 401
          : 503,
      );
    }
  };
}
