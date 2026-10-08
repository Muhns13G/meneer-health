import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import {
  inspectProtectedFormRequest,
  type RateLimitPort,
} from "@/server/security/request-security";
import { mobileInvitationDocument } from "./mobile-invitation-page";
import { createSupabaseManagedIdentityProvider } from "@/adapters/identity/supabase/supabase-managed-identity-provider";
import {
  MobileInvitationEmailService,
  mobileEmailRepository,
} from "./mobile-invitation-email-service";
import {
  preactivationCookieName,
  readPreactivationKey,
  sealPreactivationProof,
} from "./preactivation-cookie";
import {
  mobileClaimCookie,
  mobileClaimKey,
  mobileClaimSecret,
  mobileDigest,
  sealMobileClaim,
  openMobileClaim,
  mobileClaimResultSchema,
} from "./mobile-invitation-claim";

export type MobileRedemptionBindings = {
  REQUEST_RATE_LIMITER: RateLimitPort;
  SUPABASE_URL?: unknown;
  SUPABASE_SECRET_KEY?: unknown;
  MOBILE_INVITATIONS_REDEMPTION_MODE?: unknown;
  MOBILE_INVITATIONS_TENANT_ID?: unknown;
  MOBILE_INVITATION_CLAIM_KEY_BASE64?: unknown;
  MOBILE_INVITATIONS_EMAIL_MODE?: unknown;
  IDENTITY_PREACTIVATION_KEY_BASE64?: unknown;
};
export type MobileExchangePort = (input: {
  p_tenant_id: string;
  p_action: string;
  p_token_digest: string;
  p_claim_digest: string | null;
  p_request_key: string;
  p_email: string | null;
}) => Promise<unknown>;
const tokenSchema = z
  .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), requestKey: z.uuid() })
  .strict();
const emailSchema = z
  .object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()) })
  .strict();
const clearCookie = `${mobileClaimCookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
function response(status: number, body: unknown, cookie?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
}
export function createMobileRedemptionHandler(
  bindings: MobileRedemptionBindings,
  injected?: MobileExchangePort,
  injectedEmail?: Pick<MobileInvitationEmailService, "request" | "verify">,
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) ||
      (url.hostname === "meneerhealth.co.za" && url.protocol !== "https:")
    )
      return response(404, null);
    if (url.pathname === "/mobile-invitation" && ["GET", "HEAD"].includes(request.method)) {
      const page = mobileInvitationDocument();
      return request.method === "HEAD" ? new Response(null, { headers: page.headers }) : page;
    }
    const action = url.pathname.replace("/mobile-invitation/", "");
    if (!["redeem", "read", "bind", "decline", "email", "verify"].includes(action))
      return response(404, null);
    const inspected = await inspectProtectedFormRequest(request, {
      action: "mobile-redemption",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 768,
    });
    if (!inspected.allowed) return response(inspected.response.status, null);
    const fields = Object.fromEntries(inspected.value);
    if (Object.keys(fields).length !== [...inspected.value.keys()].length)
      return response(422, null);
    try {
      if (bindings.MOBILE_INVITATIONS_REDEMPTION_MODE !== "enabled") return response(503, null);
      const tenant = z.uuid().parse(bindings.MOBILE_INVITATIONS_TENANT_ID);
      const key = mobileClaimKey(bindings.MOBILE_INVITATION_CLAIM_KEY_BASE64);
      const cookies =
        request.headers
          .get("cookie")
          ?.split(";")
          .map((s) => s.trim())
          .filter((s) => s.startsWith(`${mobileClaimCookie}=`)) ?? [];
      const proof =
        cookies.length === 1
          ? await openMobileClaim(cookies[0]!.slice(mobileClaimCookie.length + 1), key)
          : null;
      if (action === "email" || action === "verify") {
        if (bindings.MOBILE_INVITATIONS_EMAIL_MODE !== "enabled") return response(503, null);
        const preactivationKey = readPreactivationKey(bindings.IDENTITY_PREACTIVATION_KEY_BASE64);
        if (!proof || proof.tenantId !== tenant)
          return response(200, { status: "unavailable" }, clearCookie);
        if (
          (action === "email" && Object.keys(fields).length) ||
          (action === "verify" &&
            !z
              .object({ code: z.string().regex(/^\d{6}$/) })
              .strict()
              .safeParse(fields).success)
        )
          return response(422, null);
        if (
          !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `mobile-email:${proof.tokenDigest}` }))
            .success
        )
          return response(429, null);
        let service = injectedEmail;
        if (!service) {
          const config = initialiseServerEnvironment({
            SUPABASE_URL: bindings.SUPABASE_URL,
            SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
          }).environment.supabase;
          if (!config) return response(503, null);
          const client = createClient(config.url, config.secretKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          });
          service = new MobileInvitationEmailService(
            mobileEmailRepository(client),
            createSupabaseManagedIdentityProvider(config),
          );
        }
        if (action === "email")
          return response(200, {
            status: (await service.request(proof)) ? "code-requested" : "unavailable",
          });
        try {
          const verified = await service.verify(proof, fields.code!);
          const cookie = await sealPreactivationProof(verified, preactivationKey);
          if (cookie.length > 3800) throw new Error("MOBILE_PREACTIVATION_INVALID");
          return response(
            200,
            { status: "verified" },
            `${preactivationCookieName}=${cookie}; Path=/; Max-Age=${Math.max(0, Math.floor((Math.min(Date.now() + 600000, verified.session.expiresAt.getTime()) - Date.now()) / 1000))}; HttpOnly; Secure; SameSite=Strict`,
          );
        } catch {
          return response(422, null);
        }
      }
      const bearer =
        action === "redeem" || (action === "decline" && Object.hasOwn(fields, "token"))
          ? tokenSchema.safeParse(fields)
          : null;
      const email = action === "bind" ? emailSchema.safeParse(fields) : null;
      if (
        (bearer && !bearer.success) ||
        (email && !email.success) ||
        (!bearer && !email && Object.keys(fields).length)
      )
        return response(422, null);
      if (!bearer && (!proof || proof.tenantId !== tenant))
        return response(200, { status: "unavailable" }, clearCookie);
      const tokenDigest = bearer?.success
        ? await mobileDigest(bearer.data.token)
        : proof!.tokenDigest;
      const requestKey = bearer?.success ? bearer.data.requestKey : proof!.requestKey;
      const secret = bearer?.success
        ? await mobileClaimSecret(key, tenant, tokenDigest, requestKey)
        : proof!.secret;
      if (
        !(await bindings.REQUEST_RATE_LIMITER.limit({ key: `mobile-claim:${tokenDigest}` })).success
      )
        return response(429, null);
      let exchange = injected;
      if (!exchange) {
        const config = initialiseServerEnvironment({
          SUPABASE_URL: bindings.SUPABASE_URL,
          SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
        }).environment.supabase;
        if (!config) return response(503, null);
        const client = createClient(config.url, config.secretKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        exchange = async (input) => {
          const { data, error } = await client.rpc("exchange_mobile_invitation", input);
          if (error) throw new Error("MOBILE_EXCHANGE_UNAVAILABLE");
          return data;
        };
      }
      const data = await exchange({
        p_tenant_id: tenant,
        p_action: action,
        p_token_digest: tokenDigest,
        p_claim_digest: await mobileDigest(secret),
        p_request_key: requestKey,
        p_email: email?.success ? email.data.email : null,
      });
      if (data === null) return response(200, { status: "unavailable" }, clearCookie);
      if (action === "decline") {
        if (
          !z
            .object({ declined: z.literal(true) })
            .strict()
            .safeParse(data).success
        )
          throw new Error("MOBILE_EXCHANGE_INVALID");
        return response(200, { status: "declined" }, clearCookie);
      }
      const claim = mobileClaimResultSchema.parse(data);
      const expiry = Date.parse(claim.expiresAt);
      if (
        proof &&
        !bearer &&
        (claim.invitationId !== proof.invitationId ||
          claim.version !== proof.version ||
          claim.claimId !== proof.claimId ||
          expiry !== proof.expiresAt)
      )
        throw new Error("MOBILE_EXCHANGE_INVALID");
      const cookie = await sealMobileClaim(
        {
          tenantId: tenant,
          invitationId: claim.invitationId,
          version: claim.version,
          claimId: claim.claimId,
          requestKey,
          tokenDigest,
          secret,
          expiresAt: expiry,
        },
        key,
      );
      return response(
        200,
        { status: "claimed", expiresAt: claim.expiresAt, emailBound: claim.emailBound },
        `${mobileClaimCookie}=${cookie}; Path=/; Max-Age=${Math.max(0, Math.floor((expiry - Date.now()) / 1000))}; HttpOnly; Secure; SameSite=Strict`,
      );
    } catch {
      return response(503, null);
    }
  };
}
