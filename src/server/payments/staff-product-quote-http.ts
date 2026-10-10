import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  staffProductQuoteCommandSchema,
  staffProductQuoteViewSchema,
} from "@/domain/payments/staff-product-quote";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import { initialiseServerEnvironment } from "@/server/config/environment.server";

export type StaffProductQuoteBindings = PatientSessionBindings & {
  PRODUCT_QUOTES_MODE?: unknown;
  PRODUCT_QUOTES_TENANT_ID?: unknown;
};
const reply = (status: number, value?: unknown) =>
  new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/json",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
    },
  });
export function createStaffProductQuoteHttpHandler(
  bindings: StaffProductQuoteBindings,
  injected?: {
    workforce: Pick<WorkforceSessionService, "authorise">;
    execute(
      authority: Record<string, unknown>,
      command: unknown,
      provenance: string,
    ): Promise<unknown>;
  },
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      url.pathname !== "/staff/products/command" ||
      url.search ||
      request.method !== "POST" ||
      !(
        url.origin === "https://meneerhealth.co.za" ||
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return reply(404);
    const provenance =
      bindings.PRODUCT_QUOTES_MODE === "synthetic"
        ? "local-synthetic"
        : bindings.PRODUCT_QUOTES_MODE === "pilot"
          ? "precise-wellness-rrp"
          : null;
    if (!provenance || !z.uuid().safeParse(bindings.PRODUCT_QUOTES_TENANT_ID).success)
      return reply(412);
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return reply(401);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "staff-products",
          routeClass: "protected-command",
          maxBodyBytes: 4096,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return reply(inspected.response.status);
      const parsed = staffProductQuoteCommandSchema.safeParse(inspected.value.body);
      if (
        !parsed.success ||
        !z.uuid().safeParse(inspected.value.idempotencyKey).success ||
        (parsed.data.action === "prepare_draft" &&
          parsed.data.requestKey !== inspected.value.idempotencyKey)
      )
        return reply(422);
      const workforce = injected?.workforce ?? workforceServiceFor(bindings);
      const { identity, context, session } = await workforce.authorise(proof);
      if (
        context.tenantId !== bindings.PRODUCT_QUOTES_TENANT_ID ||
        context.role !== "operations" ||
        context.purpose !== "operations" ||
        identity.assurance !== "aal2" ||
        session.id !== proof.sessionId
      )
        return reply(403);
      const authority = {
        p_provider_subject: identity.providerSubject,
        p_provider_session_id: identity.providerSessionId,
        p_verified_email: identity.verifiedContact.value,
        p_session_id: session.id,
        p_subject_id: context.subjectId,
        p_tenant_id: context.tenantId,
      };
      let execute = injected?.execute;
      if (!execute) {
        const config = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!config) return reply(503);
        const client = createClient(config.url, config.secretKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        execute = async (a, c, p) => {
          const { data, error } = await client.rpc("staff_product_quote", {
            p_authority: a,
            p_command: c,
            p_provenance: p,
          });
          if (error) throw new Error(error.code);
          return data;
        };
      }
      const view = staffProductQuoteViewSchema.parse(
        await execute(authority, parsed.data, provenance),
      );
      if (
        view.caseId !== parsed.data.caseId ||
        view.synthetic !== (provenance === "local-synthetic")
      )
        return reply(503);
      await workforce.authorise(proof);
      view.expiresAt = new Date(
        Math.min(
          Date.parse(view.expiresAt),
          session.idleExpiresAt.getTime(),
          session.absoluteExpiresAt.getTime(),
          identity.expiresAt.getTime(),
        ),
      ).toISOString();
      if (Date.parse(view.expiresAt) <= Date.now()) return reply(401);
      return reply(200, view);
    } catch (error) {
      if (
        error instanceof IdentityRejectedError ||
        error instanceof IdentitySessionRejectedError ||
        (error instanceof Error && error.message === "42501")
      )
        return reply(403);
      return reply(
        error instanceof Error && ["PT409", "40001", "23505"].includes(error.message) ? 409 : 503,
      );
    }
  };
}
