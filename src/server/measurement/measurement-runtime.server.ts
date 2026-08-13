import "@tanstack/react-start/server-only";

import { createClient } from "@supabase/supabase-js";

import { SupabaseMeasurementRepository } from "@/adapters/persistence/supabase/supabase-measurement-repository";
import { MeasurementService } from "@/application/measurement/measurement-service";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { classifyTelemetryEnvironment } from "@/server/observability/telemetry";
import type { RateLimitPort } from "@/server/security/request-security";

export type MeasurementRuntimeBindings = Readonly<{
  MEASUREMENT_MODE?: unknown;
  SUPABASE_URL?: unknown;
  SUPABASE_SECRET_KEY?: unknown;
  REQUEST_RATE_LIMITER: RateLimitPort;
}>;

export class MeasurementRuntimeUnavailableError extends Error {
  constructor() {
    super("The measurement runtime is unavailable.");
    this.name = "MeasurementRuntimeUnavailableError";
  }
}

export function createMeasurementRuntime(request: Request, bindings: MeasurementRuntimeBindings) {
  let configuration;
  try {
    configuration = initialiseServerEnvironment({
      MEASUREMENT_MODE: bindings.MEASUREMENT_MODE,
      SUPABASE_URL: bindings.SUPABASE_URL,
      SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
    }).environment;
  } catch {
    throw new MeasurementRuntimeUnavailableError();
  }
  if (!configuration.measurement.enabled || !configuration.supabase) {
    throw new MeasurementRuntimeUnavailableError();
  }

  const client = createClient(configuration.supabase.url, configuration.supabase.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return {
    measurement: new MeasurementService(
      new SupabaseMeasurementRepository(client),
      classifyTelemetryEnvironment(new URL(request.url).hostname),
    ),
    rateLimiter: bindings.REQUEST_RATE_LIMITER,
  };
}
