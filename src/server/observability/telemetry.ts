import "@tanstack/react-start/server-only";

import {
  telemetryEventSchema,
  type TelemetryDurationBucket,
  type TelemetryEnvironment,
  type TelemetryEvent,
} from "../../../contracts";

type LogPort = Readonly<{ log(value: TelemetryEvent): void }>;

export function classifyTelemetryEnvironment(hostname: string): TelemetryEnvironment {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return "local";
  }
  return hostname === "meneerhealth.co.za" || hostname === "www.meneerhealth.co.za"
    ? "production"
    : "preview";
}

export function durationBucket(durationMs: number): TelemetryDurationBucket {
  if (durationMs < 250) return "under-250ms";
  if (durationMs < 1_000) return "250-999ms";
  if (durationMs < 5_000) return "1-4s";
  if (durationMs < 15_000) return "5-14s";
  return "15s-plus";
}

export function statusClass(status: number): TelemetryEvent["statusClass"] {
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "unavailable";
}

export function emitTelemetry(input: unknown, logger: LogPort = console): boolean {
  const event = telemetryEventSchema.safeParse(input);
  if (!event.success) return false;

  try {
    logger.log(event.data);
    return true;
  } catch {
    return false;
  }
}
