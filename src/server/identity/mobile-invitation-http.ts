import "@tanstack/react-start/server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SupabaseMobileInvitationRepository } from "@/adapters/identity/supabase/supabase-mobile-invitation-repository";
import {
  mobileInvitationCommandSchema,
  MobileInvitationConflictError,
  MobileInvitationBudgetError,
} from "@/application/identity/mobile-invitation";
import type { WorkforceSessionService } from "@/application/identity/workforce-session-service";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedFormRequest } from "@/server/security/request-security";
import { workforceServiceFor } from "./workforce-http";
import { openWorkforceProof } from "./workforce-session-cookie";
import type { PatientSessionBindings } from "./patient-session-http";
import { mobileDeliveryRequestSchema } from "@/application/identity/mobile-invitation-delivery";
import { SupabaseMobileDeliveryRepository } from "@/adapters/identity/supabase/supabase-mobile-delivery-repository";
import { TelnyxMobileInvitationSender } from "@/adapters/identity/telnyx/telnyx-mobile-invitation-sender";
import { readMobileDeliveryConfiguration } from "./mobile-invitation-delivery-config";
import { readMobileReceiptConfiguration } from "./mobile-invitation-receipts";
import { dispatchMobileInvitation } from "./mobile-invitation-delivery-service";
import type { MobileDeliveryRequest } from "@/application/identity/mobile-invitation-delivery";
import type { ProviderIdentity } from "@/domain/access/identity";
import type { WorkforceProof } from "@/application/identity/workforce-session-service";

function response(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      Vary: "Cookie",
    },
  });
}
export function createMobileInvitationHttpHandler(
  bindings: PatientSessionBindings & {
    MOBILE_INVITATIONS_MODE?: unknown;
    MOBILE_INVITATIONS_DELIVERY_READY?: unknown;
    MOBILE_INVITATIONS_WEBHOOK_MODE?: unknown;
    MOBILE_INVITATIONS_TENANT_ID?: unknown;
    TELNYX_API_KEY?: unknown;
    TELNYX_PUBLIC_KEY_BASE64?: unknown;
    TELNYX_MESSAGING_PROFILE_ID?: unknown;
    TELNYX_FROM_NUMBER?: unknown;
  },
  injected?: {
    workforce: Pick<WorkforceSessionService, "authorise">;
    repository: Pick<SupabaseMobileInvitationRepository, "read" | "command">;
    dispatch?: (
      request: MobileDeliveryRequest,
      identity: ProviderIdentity,
      proof: WorkforceProof,
    ) => ReturnType<typeof dispatchMobileInvitation>;
  },
) {
  return async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.search ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(url.hostname) ||
      ![
        "/staff/mobile-invitations/read",
        "/staff/mobile-invitations/command",
        "/staff/mobile-invitations/dispatch",
      ].includes(url.pathname)
    )
      return response(404);
    const inspected = await inspectProtectedFormRequest(request, {
      action: "mobile-invitation-staff",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 2048,
    });
    if (!inspected.allowed) return response(inspected.response.status);
    if (new Set(inspected.value.keys()).size !== [...inspected.value.keys()].length)
      return response(422);
    const fields = Object.fromEntries(inspected.value);
    const reading = url.pathname.endsWith("/read");
    const dispatching = url.pathname.endsWith("/dispatch");
    const parsed = reading
      ? null
      : (dispatching ? mobileDeliveryRequestSchema : mobileInvitationCommandSchema).safeParse({
          ...fields,
          ...(Object.hasOwn(fields, "expectedVersion")
            ? {
                expectedVersion: /^[1-9][0-9]{0,8}$/.test(fields.expectedVersion!)
                  ? Number(fields.expectedVersion)
                  : null,
              }
            : {}),
        });
    if (
      reading
        ? Object.keys(fields).length !== 1 ||
          !Object.hasOwn(fields, "afterId") ||
          (fields.afterId !== "" && !z.uuid().safeParse(fields.afterId).success)
        : !parsed?.success
    )
      return response(422);
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return response(401);
      if (
        !(
          await bindings.REQUEST_RATE_LIMITER.limit({ key: `mobile-invitation:${proof.sessionId}` })
        ).success
      )
        return response(429);
      const { identity, context, session } = await (
        injected?.workforce ?? workforceServiceFor(bindings)
      ).authorise(proof);
      if (context.role !== "operations" || context.purpose !== "operations") return response(403);
      const input = bindings as unknown as Record<string, unknown>;
      const receiptConfig = readMobileReceiptConfiguration(input);
      const deliveryConfig =
        input.MOBILE_INVITATIONS_MODE === "telnyx" &&
        input.MOBILE_INVITATIONS_DELIVERY_READY === "true"
          ? readMobileDeliveryConfiguration(input)
          : null;
      const ready =
        !!deliveryConfig &&
        !!receiptConfig &&
        deliveryConfig.MOBILE_INVITATIONS_TENANT_ID === context.tenantId &&
        receiptConfig.MOBILE_INVITATIONS_TENANT_ID ===
          deliveryConfig.MOBILE_INVITATIONS_TENANT_ID &&
        receiptConfig.TELNYX_MESSAGING_PROFILE_ID === deliveryConfig.TELNYX_MESSAGING_PROFILE_ID &&
        receiptConfig.TELNYX_FROM_NUMBER === deliveryConfig.TELNYX_FROM_NUMBER;
      if (dispatching && (!ready || (injected && !injected.dispatch))) return response(503);
      const config = injected
        ? undefined
        : initialiseServerEnvironment({
            SUPABASE_URL: bindings.SUPABASE_URL,
            SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
          }).environment.supabase;
      if (!injected && !config) return response(503);
      const client = config
        ? createClient(config.url, config.secretKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          })
        : null;
      const repository = injected?.repository ?? new SupabaseMobileInvitationRepository(client!);
      const body = dispatching
        ? injected?.dispatch
          ? await injected.dispatch(
              mobileDeliveryRequestSchema.parse(parsed!.data),
              identity,
              proof,
            )
          : await dispatchMobileInvitation(
              mobileDeliveryRequestSchema.parse(parsed!.data),
              deliveryConfig!,
              new SupabaseMobileDeliveryRepository(client!, identity, proof),
              new TelnyxMobileInvitationSender(deliveryConfig!),
            )
        : reading
          ? await repository.read(identity, proof, fields.afterId || null)
          : await repository.command(
              identity,
              proof,
              mobileInvitationCommandSchema.parse(parsed!.data),
            );
      if (reading && "sendingEnabled" in body) body.sendingEnabled = body.sendingEnabled && ready;
      const result = response(200, body);
      result.headers.set(
        "X-Session-Expires-At",
        new Date(
          Math.min(
            session.idleExpiresAt.getTime(),
            session.absoluteExpiresAt.getTime(),
            identity.expiresAt.getTime(),
          ),
        ).toISOString(),
      );
      return result;
    } catch (error) {
      return response(
        error instanceof MobileInvitationConflictError
          ? 409
          : error instanceof MobileInvitationBudgetError
            ? 429
            : error instanceof IdentityRejectedError ||
                error instanceof IdentitySessionRejectedError
              ? 403
              : 503,
      );
    }
  };
}
