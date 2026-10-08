import "@tanstack/react-start/server-only";
import { z } from "zod";
const enabled = z.object({
  MOBILE_INVITATIONS_MODE: z.literal("telnyx"),
  MOBILE_INVITATIONS_DELIVERY_READY: z.literal("true"),
  MOBILE_INVITATIONS_TENANT_ID: z.uuid(),
  TELNYX_API_KEY: z
    .string()
    .min(20)
    .max(512)
    .regex(/^[A-Za-z0-9_-]+$/),
  TELNYX_MESSAGING_PROFILE_ID: z.uuid(),
  TELNYX_FROM_NUMBER: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
});
export type MobileDeliveryConfiguration = z.infer<typeof enabled>;
export function readMobileDeliveryConfiguration(
  input: Record<string, unknown>,
): MobileDeliveryConfiguration | null {
  if (input.MOBILE_INVITATIONS_MODE === undefined || input.MOBILE_INVITATIONS_MODE === "disabled")
    return null;
  const parsed = enabled.safeParse(input);
  if (!parsed.success) throw new Error("MOBILE_DELIVERY_CONFIGURATION_INVALID");
  return Object.freeze(parsed.data);
}
