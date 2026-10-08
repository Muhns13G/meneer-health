import { z } from "zod";

export const mobileDeliveryRequestSchema = z
  .object({
    invitationId: z.uuid(),
    expectedVersion: z.number().int().positive(),
    reservationRequestKey: z.uuid(),
  })
  .strict();
export type MobileDeliveryRequest = z.infer<typeof mobileDeliveryRequestSchema>;
export type MobileSendOutcome = Readonly<{
  outcome: "accepted" | "failed" | "uncertain";
  providerMessageId: string | null;
}>;
export interface MobileInvitationSender {
  send(
    request: Readonly<{ phone: string; text: string; reservedUsdMicros: number; deadline: number }>,
  ): Promise<MobileSendOutcome>;
}

// Count GSM-7 septets, including the two-septet extension characters; never silently transliterate.
const gsmBasic =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const gsmExtension = "\f^{}\\[~]|€";
export function smsSegments(text: string): { encoding: "GSM-7" | "UCS-2"; segments: number } {
  let septets = 0;
  for (const character of text) {
    if (gsmBasic.includes(character)) septets++;
    else if (gsmExtension.includes(character)) septets += 2;
    else
      return { encoding: "UCS-2", segments: text.length <= 70 ? 1 : Math.ceil(text.length / 67) };
  }
  return { encoding: "GSM-7", segments: septets <= 160 ? 1 : Math.ceil(septets / 153) };
}
export function renderMobileInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("MOBILE_TOKEN_INVALID");
  const text = `Meneer Health: Your pilot invitation: https://meneerhealth.co.za/mobile-invitation#${token}. Valid 48 hours. Not for you? Do not share; use the link to decline. Help: support@meneerhealth.co.za.`;
  const count = smsSegments(text);
  if (count.encoding !== "GSM-7" || count.segments !== 2) throw new Error("MOBILE_SEGMENT_LIMIT");
  return { text, segments: count.segments };
}

export const mobileDeliveryClaimSchema = z
  .object({
    attemptId: z.uuid(),
    phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
    reservedUsdMicros: z.number().int().positive().max(2_000_000_000),
    dispatchUntil: z.iso.datetime({ offset: true }),
  })
  .strict();
