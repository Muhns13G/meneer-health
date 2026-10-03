import type { defaultStreamHandler } from "@tanstack/react-start/server";

import { applyResponsePolicy } from "./response-policy";

type StreamHandlerResult = Awaited<ReturnType<typeof defaultStreamHandler>>;

/** Retain TanStack's stream cleanup ownership when adding security headers. */
export function applySsrResponsePolicy(
  request: Request,
  result: StreamHandlerResult,
  nonce: string,
): StreamHandlerResult {
  if (result instanceof Response) {
    return applyResponsePolicy(request, result, nonce);
  }
  return { ...result, response: applyResponsePolicy(request, result.response, nonce) };
}
