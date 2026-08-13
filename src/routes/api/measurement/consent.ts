import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { createMeasurementConsentHttpHandler } from "@/server/measurement/measurement-http";
import {
  createMeasurementRuntime,
  MeasurementRuntimeUnavailableError,
  type MeasurementRuntimeBindings,
} from "@/server/measurement/measurement-runtime.server";

function hidden(): Response {
  return Response.json(
    {
      contract: "error.response",
      version: 1,
      correlationId: crypto.randomUUID(),
      error: { code: "NOT_FOUND", message: "The resource was not found.", retry: "never" },
    },
    { status: 404 },
  );
}

export const Route = createFileRoute("/api/measurement/consent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return createMeasurementConsentHttpHandler(
            createMeasurementRuntime(request, env as unknown as MeasurementRuntimeBindings),
          )(request);
        } catch (error) {
          if (error instanceof MeasurementRuntimeUnavailableError) return hidden();
          throw error;
        }
      },
    },
  },
});
