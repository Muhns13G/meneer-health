import "@tanstack/react-start/server-only";

import { createClient } from "@supabase/supabase-js";

import { SupabaseIdentityGovernanceRepository } from "@/adapters/identity/supabase/supabase-identity-governance-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { PatientInvitationVerificationService } from "@/application/identity/patient-invitation-verification-service";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  preactivationCookieName,
  preactivationTtlSeconds,
  readPreactivationKey,
  sealPreactivationProof,
} from "@/server/identity/preactivation-cookie";
import {
  inspectProtectedFormRequest,
  type RateLimitPort,
} from "@/server/security/request-security";

export type PatientVerificationBindings = Readonly<{
  SUPABASE_URL?: unknown;
  SUPABASE_SECRET_KEY?: unknown;
  IDENTITY_PREACTIVATION_KEY_BASE64?: unknown;
  REQUEST_RATE_LIMITER: RateLimitPort;
}>;

type VerificationPort = Pick<PatientInvitationVerificationService, "verify">;

function empty(status: number, cookie?: string): Response {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
}

function approvedHost(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return (
    hostname === "meneerhealth.co.za" ||
    hostname.endsWith(".meneerhealth.co.za") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

export function createPatientVerificationHttpHandler(
  bindings: PatientVerificationBindings,
  injected?: VerificationPort,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!approvedHost(request)) return empty(404);
    const inspected = await inspectProtectedFormRequest(request, {
      action: "patient-invitation-otp",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 384,
    });
    if (!inspected.allowed) return inspected.response;

    let key: Uint8Array<ArrayBuffer>;
    let verification: VerificationPort;
    try {
      key = readPreactivationKey(bindings.IDENTITY_PREACTIVATION_KEY_BASE64);
      if (injected) {
        verification = injected;
      } else {
        const configuration = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!configuration) return empty(503);
        const client = createClient(configuration.url, configuration.secretKey, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
        verification = new PatientInvitationVerificationService(
          createSupabaseManagedIdentityProvider(configuration),
          new SupabaseIdentityGovernanceRepository(client),
        );
      }
    } catch {
      return empty(503);
    }

    const keys = [...inspected.value.keys()];
    if (
      keys.length !== 2 ||
      !keys.includes("email") ||
      !keys.includes("code") ||
      (inspected.value.get("email")?.length ?? 0) > 254 ||
      !/^\d{6}$/.test(inspected.value.get("code") ?? "")
    ) {
      return empty(422);
    }

    try {
      const verified = await verification.verify(
        inspected.value.get("email") ?? "",
        inspected.value.get("code") ?? "",
      );
      const token = await sealPreactivationProof(verified, key);
      if (token.length > 3_800) return empty(503);
      return empty(
        204,
        `${preactivationCookieName}=${token}; Path=/; Max-Age=${preactivationTtlSeconds}; HttpOnly; Secure; SameSite=Strict`,
      );
    } catch {
      // Invalid, stale and mismatched invitations have the same outward response.
      return empty(422);
    }
  };
}
