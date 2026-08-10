import "@tanstack/react-start/server-only";

import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { initialiseServerEnvironment } from "./server/config/environment.server";
import { applyResponsePolicy } from "./server/security/response-policy";
import {
  applyCorrelationHeader,
  executeWithRequestTimeout,
  inspectPublicRequest,
} from "./server/security/request-security";

const serverEnvironment = initialiseServerEnvironment();
const handleRequest = createStartHandler(async (context) => {
  const nonce = crypto.randomUUID().replaceAll("-", "");

  context.router.update({ ssr: { nonce } });

  const response = await defaultStreamHandler(context);

  return applyResponsePolicy(context.request, response, nonce);
});

export type ServerEntry = { fetch: RequestHandler<Register> };

export function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(...args) {
      if (serverEnvironment.bundleCanary.length === 0) {
        throw new Error("Server configuration is invalid.");
      }

      const requestDecision = await inspectPublicRequest(args[0], env.REQUEST_RATE_LIMITER);
      if (!requestDecision.allowed) {
        return applyResponsePolicy(args[0], requestDecision.response);
      }

      const response = await executeWithRequestTimeout(args[0], (boundedRequest) =>
        Promise.resolve(entry.fetch(boundedRequest, args[1])),
      );

      return applyResponsePolicy(
        args[0],
        applyCorrelationHeader(response, requestDecision.decision),
      );
    },
  };
}

export default createServerEntry({ fetch: handleRequest });
