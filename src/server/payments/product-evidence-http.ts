import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  productEvidenceCommandSchema,
  productEvidenceViewSchema,
} from "@/domain/payments/product-quote-evidence";
import type { StaffProductQuoteBindings } from "./staff-product-quote-http";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";

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
export function createProductEvidenceHttpHandler(
  bindings: StaffProductQuoteBindings,
  injected?: {
    workforce: Pick<WorkforceSessionService, "authorise">;
    execute(
      context: Record<string, unknown>,
      command: unknown,
      provenance: string,
    ): Promise<unknown>;
  },
) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (
      url.pathname !== "/staff/products/evidence" ||
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
          action: "product-evidence",
          routeClass: "protected-command",
          maxBodyBytes: 4096,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return reply(inspected.response.status);
      const command = productEvidenceCommandSchema.safeParse(inspected.value.body);
      if (
        !command.success ||
        !z.uuid().safeParse(inspected.value.idempotencyKey).success ||
        (command.data.action !== "read" &&
          command.data.requestKey !== inspected.value.idempotencyKey)
      )
        return reply(422);
      const workforce = injected?.workforce ?? workforceServiceFor(bindings);
      const { identity, context, session } = await workforce.authorise(proof);
      if (
        context.tenantId !== bindings.PRODUCT_QUOTES_TENANT_ID ||
        identity.assurance !== "aal2" ||
        session.id !== proof.sessionId ||
        !(
          (context.role === "operations" && context.purpose === "operations") ||
          (context.role === "clinician" && context.purpose === "care_delivery")
        )
      )
        return reply(403);
      if (
        (context.role === "clinician") !== "intakeId" in command.data.target ||
        (command.data.action === "record" &&
          (context.role === "clinician") !== (command.data.kind === "clinical"))
      )
        return reply(403);
      const native = {
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
        execute = async (c, v, p) => {
          const { data, error } = await client.rpc("staff_product_evidence", {
            p_context: c,
            p_command: v,
            p_provenance: p,
          });
          if (error) throw new Error(error.code);
          return data;
        };
      }
      const view = productEvidenceViewSchema.parse(await execute(native, command.data, provenance));
      if (
        view.role !== context.role ||
        view.synthetic !== (provenance === "local-synthetic") ||
        (command.data.action !== "read" && view.draftId !== command.data.draftId)
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
        error instanceof Error && ["PT409", "40001", "23505"].includes(error.message)
          ? 409
          : error instanceof Error && error.message === "22023"
            ? 422
            : 503,
      );
    }
  };
}
