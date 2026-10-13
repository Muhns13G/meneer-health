import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { activationViewSchema } from "@/domain/identity/pilot-activation";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import { createPatientSessionService, type PatientSessionBindings } from "./patient-session-http";
import {
  readPatientSessionKey,
  sealPatientSession,
  patientSessionCookie,
} from "./patient-session-cookie";
import { openAccountReview, clearReviewCookie } from "./account-review-cookie";

const commandSchema = z
  .object({
    requestKey: z.uuid(),
    termsPublicationId: z.uuid(),
    termsHash: z.string().regex(/^[a-f0-9]{64}$/),
    privacyPublicationId: z.uuid(),
    privacyHash: z.string().regex(/^[a-f0-9]{64}$/),
    termsAccepted: z.literal("true").transform(() => true),
    privacyAcknowledged: z.literal("true").transform(() => true),
  })
  .strict();
const response = (status: number, value?: unknown) =>
  new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      ...(value === undefined ? {} : { "Content-Type": "application/json" }),
    },
  });
export function createAccountReviewHttpHandler(bindings: PatientSessionBindings) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (!["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) || url.search)
      return response(404);
    if (
      !(
        (url.pathname === "/account/documents/current" && request.method === "GET") ||
        (url.pathname === "/account/documents" && request.method === "POST")
      )
    )
      return response(405);
    let command: z.infer<typeof commandSchema> | undefined;
    if (request.method === "POST") {
      const inspected = await inspectProtectedFormRequest(request, {
        action: "account-document-acknowledgement",
        rateLimiter: bindings.REQUEST_RATE_LIMITER,
        maximumBytes: 2048,
      });
      if (!inspected.allowed) return inspected.response;
      if (new Set([...inspected.value.keys()]).size !== [...inspected.value.keys()].length)
        return response(422);
      const parsed = commandSchema.safeParse(Object.fromEntries(inspected.value));
      if (!parsed.success) return response(422);
      command = parsed.data;
    } else if (
      !(
        await bindings.REQUEST_RATE_LIMITER.limit({
          key: `account-document-read:${request.headers.get("cf-connecting-ip") ?? "unattributed"}`,
        })
      ).success
    )
      return response(429);
    try {
      const key = readPatientSessionKey(bindings.IDENTITY_SESSION_KEY_BASE64);
      const proof = await openAccountReview(request, key);
      if (!proof) return response(401);
      const configuration = initialiseServerEnvironment({
        SUPABASE_URL: bindings.SUPABASE_URL,
        SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
      }).environment.supabase;
      if (!configuration) return response(503);
      const provider = createSupabaseManagedIdentityProvider(configuration);
      const identity = await provider.verifyAccessToken(proof.accessToken);
      if (
        identity.providerSubject !== proof.providerSubject ||
        identity.providerSessionId !== proof.providerSessionId ||
        identity.expiresAt.getTime() <= Date.now()
      )
        return response(401);
      const client = createClient(configuration.url, configuration.secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const args = {
        p_tenant_id: proof.tenantId,
        p_provider_subject: proof.providerSubject,
        p_provider_session_id: proof.providerSessionId,
      };
      if (!command) {
        const result = await client.rpc("read_account_document_review", args);
        if (result.error) return response(result.error.code === "42501" ? 403 : 503);
        return response(200, activationViewSchema.parse(result.data));
      }
      const result = await client.rpc("acknowledge_account_documents", {
        ...args,
        p_command: command,
      });
      if (result.error)
        return response(
          result.error.code === "42501" ? 409 : result.error.code === "22023" ? 422 : 503,
        );
      if (result.data !== true) return response(403);
      const sessions = createPatientSessionService(bindings);
      if (!sessions) return response(503);
      const session = await sessions.continueAfterActivation({
        tenantId: proof.tenantId,
        providerSubject: proof.providerSubject,
        accessToken: proof.accessToken,
        refreshToken: proof.refreshToken,
      });
      try {
        const token = await sealPatientSession(session, key);
        if (token.length > 3800) throw Error("SESSION_TOO_LARGE");
        const success = response(204);
        success.headers.append(
          "Set-Cookie",
          patientSessionCookie(token, session.session.absoluteExpiresAt),
        );
        success.headers.append("Set-Cookie", clearReviewCookie());
        return success;
      } catch {
        await sessions.signOut({
          sessionId: session.session.id,
          subjectId: session.session.subjectId,
          tenantId: session.tenantId,
          providerSessionId: session.session.providerSessionId,
          accessToken: session.providerSession.accessToken,
          refreshToken: session.providerSession.refreshToken,
          providerExpiresAt: session.providerSession.expiresAt.getTime(),
        });
        return response(503);
      }
    } catch {
      return response(503);
    }
  };
}
