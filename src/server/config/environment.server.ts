import "@tanstack/react-start/server-only";

import { SERVER_ONLY_BUNDLE_CANARY } from "../../../config/environment-canary";
import { validateServerEnvironment } from "./environment-schema";

export function initialiseServerEnvironment() {
  const environment = validateServerEnvironment({});

  return Object.freeze({
    environment,
    bundleCanary: SERVER_ONLY_BUNDLE_CANARY,
  });
}
