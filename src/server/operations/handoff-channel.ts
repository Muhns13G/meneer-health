import "@tanstack/react-start/server-only";
import { z } from "zod";

// Owner-configured, server-only. No browser-selected destination or URL construction.
const channelSchema = z
  .object({
    url: z
      .url()
      .max(2048)
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          !url.hash &&
          url.port === "" &&
          /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) &&
          !/(^|\.)localhost$/i.test(url.hostname) &&
          !url.hostname.endsWith(".local") &&
          url.pathname !== "/" &&
          !/^\/(login|sign-in|admin)(\/|$)/i.test(url.pathname)
        );
      }),
    destinationId: z.uuid(),
    destinationVersion: z.coerce.number().int().min(1).max(999999),
  })
  .strict();
export type HandoffChannelBindings = {
  HANDOFF_INTAKE_URL?: unknown;
  HANDOFF_DESTINATION_ID?: unknown;
  HANDOFF_DESTINATION_VERSION?: unknown;
};
export async function readHandoffChannel(bindings: HandoffChannelBindings) {
  const parsed = channelSchema.safeParse({
    url: bindings.HANDOFF_INTAKE_URL,
    destinationId: bindings.HANDOFF_DESTINATION_ID,
    destinationVersion: bindings.HANDOFF_DESTINATION_VERSION,
  });
  if (!parsed.success) throw new Error("HANDOFF_CHANNEL_UNAVAILABLE");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parsed.data.url));
  const digest = Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return { ...parsed.data, digest };
}
