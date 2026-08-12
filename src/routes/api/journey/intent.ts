import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import {
  createTreatmentIntentHttpHandler,
  type TreatmentIntentBindings,
} from "@/server/journey/treatment-intent-http";

export const Route = createFileRoute("/api/journey/intent")({
  server: {
    handlers: {
      POST: ({ request }) =>
        createTreatmentIntentHttpHandler(env as unknown as TreatmentIntentBindings)(request),
    },
  },
});
