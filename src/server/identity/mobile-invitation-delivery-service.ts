import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  mobileDeliveryRequestSchema,
  renderMobileInvitation,
  type MobileDeliveryRequest,
  type MobileSendOutcome,
  type MobileInvitationSender,
} from "@/application/identity/mobile-invitation-delivery";
import type { MobileDeliveryConfiguration } from "./mobile-invitation-delivery-config";

export interface MobileDeliveryRepository {
  prepare(
    request: MobileDeliveryRequest,
    digest: string,
    configuration: MobileDeliveryConfiguration,
  ): Promise<{
    attemptId: string;
    phone: string;
    reservedUsdMicros: number;
    dispatchUntil: string;
  } | null>;
  finish(attemptId: string, outcome: MobileSendOutcome): Promise<void>;
}
// No durable raw-token payload or background retry: one committed claim owns one provider POST.
export async function dispatchMobileInvitation(
  request: MobileDeliveryRequest,
  configuration: MobileDeliveryConfiguration | null,
  repository: MobileDeliveryRepository,
  sender: MobileInvitationSender,
) {
  if (!configuration) return { outcome: "disabled" as const };
  const input = mobileDeliveryRequestSchema.parse(request);
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
  const digest = Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const claim = await repository.prepare(input, digest, configuration);
  if (!claim) return { outcome: "already_attempted" as const };
  const rendered = renderMobileInvitation(token);
  let result: MobileSendOutcome = { outcome: "uncertain", providerMessageId: null };
  try {
    const returned = await sender.send({
      phone: claim.phone,
      text: rendered.text,
      reservedUsdMicros: claim.reservedUsdMicros,
      deadline: Date.parse(claim.dispatchUntil),
    });
    const parsed = z
      .object({
        outcome: z.enum(["accepted", "failed", "uncertain"]),
        providerMessageId: z.uuid().nullable(),
      })
      .strict()
      .safeParse(returned);
    if (parsed.success && (parsed.data.outcome !== "accepted" || parsed.data.providerMessageId))
      result = parsed.data;
  } catch {
    /* A provider may have accepted before the response was lost. Never retry. */
  }
  try {
    await repository.finish(claim.attemptId, result);
  } catch {
    return { attemptId: claim.attemptId, outcome: "uncertain" as const };
  }
  return { attemptId: claim.attemptId, outcome: result.outcome };
}
