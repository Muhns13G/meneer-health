import "@tanstack/react-start/server-only";

import { SERVER_ONLY_BUNDLE_CANARY } from "../../../config/environment-canary";
import { validateServerEnvironment } from "./environment-schema";

export function initialiseServerEnvironment(input: unknown = {}) {
  const environment = validateServerEnvironment(input);

  return Object.freeze({
    environment,
    bundleCanary: SERVER_ONLY_BUNDLE_CANARY,
  });
}
