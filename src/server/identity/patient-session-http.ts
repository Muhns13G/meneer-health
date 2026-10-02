import "@tanstack/react-start/server-only";

import { createClient } from "@supabase/supabase-js";

import { SupabaseIdentityGovernanceRepository } from "@/adapters/identity/supabase/supabase-identity-governance-repository";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { SupabaseAccessRepository } from "@/adapters/persistence/supabase/supabase-access-repository";
import {
  PatientSessionService,
  type PatientSession,
} from "@/application/identity/patient-session-service";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  asPatientSessionProof,
  clearPatientSessionCookie,
  openPatientSession,
  patientSessionCookie,
  readPatientSessionCookie,
  readPatientSessionKey,
  sealPatientSession,
} from "@/server/identity/patient-session-cookie";
import {
  inspectProtectedFormRequest,
  type RateLimitPort,
} from "@/server/security/request-security";

export type PatientSessionBindings = Readonly<{
  SUPABASE_URL?: unknown;
  SUPABASE_SECRET_KEY?: unknown;
  IDENTITY_SESSION_KEY_BASE64?: unknown;
  REQUEST_RATE_LIMITER: RateLimitPort;
}>;

type SessionPort = Pick<
  PatientSessionService,
  "requestSignIn" | "signIn" | "renew" | "signOut" | "requestRecovery" | "completeRecovery"
>;

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

function expectedFields(fields: URLSearchParams, names: readonly string[]): boolean {
  const keys = [...fields.keys()];
  return keys.length === names.length && names.every((name) => keys.includes(name));
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

function serviceFor(bindings: PatientSessionBindings): SessionPort | null {
  const configuration = initialiseServerEnvironment({
    SUPABASE_URL: bindings.SUPABASE_URL,
    SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
  }).environment.supabase;
  if (!configuration) return null;
  const client = createClient(configuration.url, configuration.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return new PatientSessionService(
    createSupabaseManagedIdentityProvider(configuration),
    new SupabaseAccessRepository(client),
    new SupabaseIdentitySessionRepository(client),
    new SupabaseIdentityGovernanceRepository(client),
  );
}

async function revokeUndeliveredSession(
  service: SessionPort,
  session: PatientSession,
): Promise<void> {
  try {
    await service.signOut({
      sessionId: session.session.id,
      subjectId: session.session.subjectId,
      tenantId: session.tenantId,
      providerSessionId: session.session.providerSessionId,
      accessToken: session.providerSession.accessToken,
      refreshToken: session.providerSession.refreshToken,
      providerExpiresAt: session.providerSession.expiresAt.getTime(),
    });
  } catch {
    // No browser credential was issued; a later authorisation still checks local state.
  }
}

export function createPatientSessionHttpHandler(
  bindings: PatientSessionBindings,
  injected?: SessionPort,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!approvedHost(request)) return empty(404);
    const pathname = new URL(request.url).pathname;
    if (
      ![
        "/account/sign-in",
        "/account/recover",
        "/account/sign-out",
        "/account/session/renew",
      ].includes(pathname)
    ) {
      return empty(404);
    }
    const inspected = await inspectProtectedFormRequest(request, {
      action: `patient-session:${pathname}`,
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 384,
    });
    if (!inspected.allowed) return inspected.response;

    let key: Uint8Array<ArrayBuffer>;
    let service: SessionPort | null;
    try {
      key = readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64);
      service = injected ?? serviceFor(bindings);
    } catch {
      return empty(503);
    }
    if (!service) return empty(503);
    const fields = inspected.value;
    const action = fields.get("action");

    if (pathname === "/account/sign-out" || pathname === "/account/session/renew") {
      const expectedAction = pathname === "/account/sign-out" ? "sign-out" : "renew";
      if (!expectedFields(fields, ["action"]) || action !== expectedAction) return empty(422);
      const proof = await openPatientSession(readPatientSessionCookie(request), key);
      if (!proof)
        return pathname === "/account/sign-out"
          ? empty(204, clearPatientSessionCookie())
          : empty(401, clearPatientSessionCookie());
      try {
        if (pathname === "/account/sign-out") {
          await service.signOut(asPatientSessionProof(proof));
          return empty(204, clearPatientSessionCookie());
        }
        const renewed = await service.renew(asPatientSessionProof(proof));
        try {
          const token = await sealPatientSession(renewed, key);
          if (token.length > 3_800) throw new Error("PATIENT_SESSION_COOKIE_TOO_LARGE");
          return empty(204, patientSessionCookie(token, renewed.session.absoluteExpiresAt));
        } catch {
          await revokeUndeliveredSession(service, renewed);
          return empty(503, clearPatientSessionCookie());
        }
      } catch {
        return empty(401, clearPatientSessionCookie());
      }
    }

    if (
      !["request", "verify"].includes(action ?? "") ||
      !expectedFields(
        fields,
        action === "request" ? ["action", "email"] : ["action", "email", "code"],
      ) ||
      (fields.get("email")?.length ?? 0) > 254 ||
      (action === "verify" && !/^\d{6}$/.test(fields.get("code") ?? ""))
    ) {
      return empty(422);
    }
    const email = fields.get("email") ?? "";
    const code = fields.get("code") ?? "";
    try {
      if (action === "request") {
        if (pathname === "/account/sign-in") {
          await service.requestSignIn(email, new URL("/account/sign-in", request.url).toString());
        } else {
          await service.requestRecovery(email, new URL("/account/recover", request.url).toString());
        }
        // Same response for known and unknown email; do not reveal provider details.
        return empty(202);
      }
      if (pathname === "/account/recover") {
        await service.completeRecovery(email, code);
        return empty(204, clearPatientSessionCookie());
      }
      const signedIn = await service.signIn(email, code);
      try {
        const token = await sealPatientSession(signedIn, key);
        if (token.length > 3_800) throw new Error("PATIENT_SESSION_COOKIE_TOO_LARGE");
        return empty(204, patientSessionCookie(token, signedIn.session.absoluteExpiresAt));
      } catch {
        await revokeUndeliveredSession(service, signedIn);
        return empty(503);
      }
    } catch {
      return empty(action === "request" ? 202 : 422);
    }
  };
}
