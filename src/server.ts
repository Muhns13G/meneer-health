import "@tanstack/react-start/server-only";

import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";

import { initialiseServerEnvironment } from "./server/config/environment.server";

const serverEnvironment = initialiseServerEnvironment();
const handleRequest = createStartHandler(defaultStreamHandler);

export type ServerEntry = { fetch: RequestHandler<Register> };

export function createServerEntry(entry: ServerEntry): ServerEntry {
  return {
    async fetch(...args) {
      if (serverEnvironment.bundleCanary.length === 0) {
        throw new Error("Server configuration is invalid.");
      }

      return await entry.fetch(...args);
    },
  };
}

export default createServerEntry({ fetch: handleRequest });
