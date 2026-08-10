import "@tanstack/react-start/server-only";

import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";

import { initialiseServerEnvironment } from "./server/config/environment.server";
import { applyResponsePolicy } from "./server/security/response-policy";

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

      const response = await entry.fetch(...args);

      return applyResponsePolicy(args[0], response);
    },
  };
}

export default createServerEntry({ fetch: handleRequest });
