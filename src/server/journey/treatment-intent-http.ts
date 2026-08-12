import "@tanstack/react-start/server-only";

import {
  readTreatmentIntentEncryptionKey,
  resolveTreatmentIntentWireId,
  sealTreatmentIntent,
  treatmentIntentCookieName,
  treatmentIntentTtlSeconds,
} from "@/domain/journey/treatment-intent";
import {
  inspectProtectedFormRequest,
  type RateLimitPort,
} from "@/server/security/request-security";

export type TreatmentIntentBindings = Readonly<{
  JOURNEY_INTENT_ENCRYPTION_KEY_BASE64?: string;
  REQUEST_RATE_LIMITER: RateLimitPort;
}>;

function redirectWithoutState(request: Request, cookie?: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/start", request.url).toString(),
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
}

export function createTreatmentIntentHttpHandler(bindings: TreatmentIntentBindings) {
  return async (request: Request): Promise<Response> => {
    const inspected = await inspectProtectedFormRequest(request, {
      action: "journey-intent",
      rateLimiter: bindings.REQUEST_RATE_LIMITER,
      maximumBytes: 128,
    });
    if (!inspected.allowed) return inspected.response;

    if (!bindings.JOURNEY_INTENT_ENCRYPTION_KEY_BASE64) {
      return redirectWithoutState(request);
    }

    let key: Uint8Array<ArrayBuffer>;
    try {
      key = readTreatmentIntentEncryptionKey(bindings.JOURNEY_INTENT_ENCRYPTION_KEY_BASE64);
    } catch {
      return redirectWithoutState(request);
    }

    const intent = resolveTreatmentIntentWireId(inspected.value.get("selection"));
    if (!intent) return redirectWithoutState(request);

    const token = await sealTreatmentIntent(intent, key);
    return redirectWithoutState(
      request,
      `${treatmentIntentCookieName}=${token}; Path=/; Max-Age=${treatmentIntentTtlSeconds}; HttpOnly; Secure; SameSite=Strict`,
    );
  };
}
