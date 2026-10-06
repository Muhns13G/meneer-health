import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  staffFollowupCommandSchema,
  staffFollowupViewSchema,
} from "@/domain/support/staff-followup";
import {
  supportCommandSchema,
  supportResultSchema,
  staffSupportCommandSchema,
  supportViewSchema,
} from "@/domain/support/support";
import {
  PatientPortalService,
  type PortalContext,
} from "@/application/identity/patient-portal-service";
import { SupabaseIdentitySessionRepository } from "@/adapters/identity/supabase/supabase-identity-session-repository";
import { SupabasePatientPortalRepository } from "@/adapters/identity/supabase/supabase-patient-portal-repository";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import {
  openPatientSession,
  patientSessionCookieName,
  readPatientSessionKey,
  clearPatientSessionCookie,
} from "@/server/identity/patient-session-cookie";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import type { PatientSessionProof } from "@/application/identity/patient-session-service";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import { initialiseServerEnvironment } from "@/server/config/environment.server";

type Rpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { code?: string } | null }>;
const reply = (status: number, value?: unknown, clear = false) =>
  new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
      ...(value === undefined ? {} : { "Content-Type": "application/json" }),
      ...(clear ? { "Set-Cookie": clearPatientSessionCookie() } : {}),
    },
  });

export function createSupportHttpHandler(
  bindings: PatientSessionBindings,
  injected?: {
    patient: (proof: PatientSessionProof) => Promise<PortalContext>;
    workforce: Pick<WorkforceSessionService, "authorise">;
    rpc: Rpc;
  },
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    const followup = url.pathname === "/staff/support/followup";
    const staff = followup || url.pathname === "/staff/support/command";
    if (
      !["/portal/support/command", "/staff/support/command", "/staff/support/followup"].includes(
        url.pathname,
      ) ||
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname)
    )
      return reply(404);
    try {
      let patientProof: PatientSessionProof | null = null;
      let workforceProof;
      if (staff) {
        workforceProof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
        if (!workforceProof?.sessionId) return reply(401);
      } else {
        const cookies = (request.headers.get("cookie") ?? "")
          .split(";")
          .map((c) => c.trim())
          .filter((c) => c.startsWith(`${patientSessionCookieName}=`));
        if (cookies.length !== 1) return reply(401, undefined, true);
        patientProof = await openPatientSession(
          cookies[0]!.slice(patientSessionCookieName.length + 1),
          readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64),
        );
        if (!patientProof) return reply(401, undefined, true);
      }
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "support-command",
          routeClass: "protected-command",
          maxBodyBytes: 1024,
          requireAntiAutomation: false,
          requireIdempotency: false,
        },
        {
          rateLimiter: bindings.REQUEST_RATE_LIMITER,
          principalRateKey: staff ? workforceProof!.sessionId : patientProof!.sessionId,
        },
      );
      if (!inspected.allowed) return reply(inspected.response.status);
      const parsed = (
        followup
          ? staffFollowupCommandSchema
          : staff
            ? staffSupportCommandSchema
            : supportCommandSchema
      ).safeParse(inspected.value.body);
      if (!parsed.success) return reply(422);
      if (
        parsed.data.action !== "read" &&
        request.headers.get("Idempotency-Key") !== parsed.data.requestKey
      )
        return reply(422);
      const configuration = injected
        ? undefined
        : initialiseServerEnvironment({
            SUPABASE_URL: bindings.SUPABASE_URL,
            SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
          }).environment.supabase;
      if (!injected && !configuration) return reply(503);
      const client = configuration
        ? createClient(configuration.url, configuration.secretKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          })
        : undefined;
      const rpc: Rpc = injected?.rpc ?? (async (name, args) => client!.rpc(name, args));
      let context: Record<string, unknown>;
      if (staff) {
        const authorised = await (injected?.workforce ?? workforceServiceFor(bindings)).authorise(
          workforceProof!,
        );
        if (
          authorised.identity.assurance !== "aal2" ||
          (![
            "auditor:privacy_review",
            "support:support",
            "operations:operations",
            "clinician:care_delivery",
          ].includes(`${authorised.context.role}:${authorised.context.purpose}`) &&
            !(
              followup &&
              authorised.context.role === "admin" &&
              authorised.context.purpose === "security_administration"
            ))
        )
          return reply(403);
        context = {
          tenantId: authorised.context.tenantId,
          subjectId: authorised.context.subjectId,
          sessionId: workforceProof!.sessionId,
          providerSubject: authorised.identity.providerSubject,
          providerSessionId: authorised.identity.providerSessionId,
          verifiedEmail: authorised.identity.verifiedContact.value.trim().toLowerCase(),
          purpose: authorised.context.purpose,
        };
      } else {
        context = injected
          ? await injected.patient(patientProof!)
          : (
              await new PatientPortalService(
                createSupabaseManagedIdentityProvider(configuration!),
                new SupabaseIdentitySessionRepository(client!),
                new SupabasePatientPortalRepository(client!),
              ).authorise(patientProof!)
            ).context;
      }
      const { data, error } = await rpc(
        followup
          ? "staff_support_followup"
          : staff
            ? "staff_support_command"
            : "patient_support_command",
        { p_context: context, p_command: parsed.data },
      );
      if (error)
        return reply(
          error.code === "42501"
            ? 403
            : ["40001", "23505", "55000"].includes(error.code ?? "")
              ? 409
              : error.code === "P0001"
                ? 429
                : 503,
        );
      const valid = staff
        ? (parsed.data.action === "read"
            ? followup
              ? staffFollowupViewSchema
              : supportViewSchema.shape.requests
            : z.uuid()
          ).safeParse(data)
        : supportResultSchema.safeParse(data);
      return valid.success ? reply(200, valid.data) : reply(503);
    } catch (error) {
      return reply(
        error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError
          ? 401
          : 503,
        undefined,
        !staff &&
          (error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError),
      );
    }
  };
}
