import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import {
  PatientPortalService,
  type PortalContext,
} from "@/application/identity/patient-portal-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import type { PatientSessionProof } from "@/application/identity/patient-session-service";
import { portalLinkCommandSchema } from "@/application/operations/handoff-boundary";
import { readHandoffChannel } from "./handoff-channel";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import {
  openPatientSession,
  readPatientSessionCookie,
  readPatientSessionKey,
  patientSessionCookieName,
} from "@/server/identity/patient-session-cookie";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";

function response(status: number, body?: unknown) {
  return new Response(body ? JSON.stringify(body) : null, {
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
type Channel = Awaited<ReturnType<typeof readHandoffChannel>>;
export function createPortalHandoffHttpHandler(
  bindings: PatientSessionBindings,
  injected?: {
    authorise: (proof: PatientSessionProof) => Promise<{ context: PortalContext }>;
    issue: (context: PortalContext, channel: Channel, requestKey: string) => Promise<string>;
  },
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.pathname !== "/portal/handoff/open" ||
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname)
    )
      return response(404);
    const inspected = await inspectProtectedFormRequest(request, {
      action: "portal-handoff",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 128,
    });
    if (!inspected.allowed) return response(inspected.response.status);
    const parsed = portalLinkCommandSchema.safeParse(Object.fromEntries(inspected.value));
    if (!parsed.success) return response(422);
    try {
      if (
        (request.headers.get("cookie") ?? "")
          .split(";")
          .filter((item) => item.trim().startsWith(`${patientSessionCookieName}=`)).length !== 1
      )
        return response(401);
      const cookie = readPatientSessionCookie(request);
      const proof = cookie
        ? await openPatientSession(
            cookie,
            readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
          )
        : null;
      if (!proof) return response(401);
      if (
        !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `portal-handoff:${proof.sessionId}` }))
          .success
      )
        return response(429);
      const channel = await readHandoffChannel(bindings);
      let ports = injected;
      if (!ports) {
        const config = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!config) return response(503);
        const client = createClient(config.url, config.secretKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const service = new PatientPortalService(
          createSupabaseManagedIdentityProvider(config),
          new SupabaseIdentitySessionRepository(client),
          new SupabasePatientPortalRepository(client),
        );
        ports = {
          authorise: (value) => service.authorise(value),
          issue: async (context, destination, requestKey) => {
            const { data, error } = await client.rpc("issue_patient_handoff_link", {
              p_tenant_id: context.tenantId,
              p_subject_id: context.subjectId,
              p_session_id: context.sessionId,
              p_provider_subject: context.providerSubject,
              p_provider_session_id: context.providerSessionId,
              p_verified_email: context.verifiedEmail,
              p_destination_id: destination.destinationId,
              p_destination_version: destination.destinationVersion,
              p_destination_digest: destination.digest,
              p_request_key: requestKey,
            });
            if (error?.code === "42501") throw new IdentityRejectedError();
            if (error?.code === "55000") throw new Error("HANDOFF_NOT_READY");
            if (error?.code === "PT409" || error?.code === "40001")
              throw new Error("HANDOFF_CONFLICT");
            if (error || !z.uuid().safeParse(data).success) throw new Error("HANDOFF_UNAVAILABLE");
            return data as string;
          },
        };
      }
      const { context } = await ports.authorise(proof);
      const result = await ports.issue(context, channel, parsed.data.requestKey);
      if (!z.uuid().safeParse(result).success) return response(503);
      // This URL exists only in the authorised no-store response; never in projections, telemetry or email.
      return response(200, { url: channel.url });
    } catch (error) {
      if (error instanceof IdentityRejectedError) return response(401);
      if (error instanceof Error && error.message === "HANDOFF_NOT_READY") return response(412);
      if (error instanceof Error && error.message === "HANDOFF_CONFLICT") return response(409);
      return response(503);
    }
  };
}
