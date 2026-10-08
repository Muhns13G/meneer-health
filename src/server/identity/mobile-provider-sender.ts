import "@tanstack/react-start/server-only";
import { z } from "zod";

// Only an owner-verified profile rewrite is allowed; never infer trust from provider input.
export const mobileAlphaSenderSchema = z
  .string()
  .min(1)
  .max(11)
  .regex(/^[A-Za-z0-9 ]+$/)
  .refine((value) => /[A-Za-z]/.test(value) && value === value.trim());

export function matchesMobileProviderSender(
  observed: string,
  config: { TELNYX_FROM_NUMBER: string; TELNYX_ALPHA_SENDER?: string },
): boolean {
  return (
    observed === config.TELNYX_FROM_NUMBER ||
    (config.TELNYX_ALPHA_SENDER !== undefined && observed === config.TELNYX_ALPHA_SENDER)
  );
}
