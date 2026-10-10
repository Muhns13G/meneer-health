import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  productQuoteIssueCommandSchema,
  productQuoteIssueViewSchema,
} from "@/domain/payments/product-quote-issue";
import type { PatientSessionBindings } from "@/server/identity/patient-session-http";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import { initialiseServerEnvironment } from "@/server/config/environment.server";

export type ProductQuoteIssueBindings = PatientSessionBindings & {
  PRODUCT_ORDERING_MODE?: unknown;
  PRODUCT_ORDERING_TENANT_ID?: unknown;
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
export function createProductQuoteIssueHttpHandler(
  bindings: ProductQuoteIssueBindings,
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
      url.pathname !== "/staff/products/issue" ||
      url.search ||
      request.method !== "POST" ||
      !(
        url.origin === "https://meneerhealth.co.za" ||
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return reply(404);
    const provenance =
      bindings.PRODUCT_ORDERING_MODE === "synthetic"
        ? "local-synthetic"
        : bindings.PRODUCT_ORDERING_MODE === "pilot"
          ? "precise-wellness-rrp"
          : null;
    if (!provenance || !z.uuid().safeParse(bindings.PRODUCT_ORDERING_TENANT_ID).success)
      return reply(412);
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return reply(401);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "staff-product-issue",
          routeClass: "protected-command",
          maxBodyBytes: 4096,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return reply(inspected.response.status);
      const parsed = productQuoteIssueCommandSchema.safeParse(inspected.value.body);
      if (
        !parsed.success ||
        !z.uuid().safeParse(inspected.value.idempotencyKey).success ||
        (parsed.data.action === "issue" &&
          parsed.data.requestKey !== inspected.value.idempotencyKey)
      )
        return reply(422);
      const workforce = injected?.workforce ?? workforceServiceFor(bindings);
      const { identity, context, session } = await workforce.authorise(proof);
      if (
        context.tenantId !== bindings.PRODUCT_ORDERING_TENANT_ID ||
        context.role !== "operations" ||
        context.purpose !== "operations" ||
        identity.assurance !== "aal2" ||
        session.id !== proof.sessionId
      )
        return reply(403);
      const authority = {
        providerSubject: identity.providerSubject,
        providerSessionId: identity.providerSessionId,
        verifiedEmail: identity.verifiedContact.value,
        sessionId: session.id,
        subjectId: context.subjectId,
        tenantId: context.tenantId,
        purpose: context.purpose,
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
          const { data, error } = await client.rpc("staff_issue_product_quote", {
            p_context: a,
            p_command: c,
            p_provenance: p,
          });
          if (error) throw new Error(error.code);
          return data;
        };
      }
      const view = productQuoteIssueViewSchema.parse(
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
