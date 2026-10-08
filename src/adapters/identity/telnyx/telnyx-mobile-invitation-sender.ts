import "@tanstack/react-start/server-only";
import { z } from "zod";
import { matchesMobileProviderSender } from "@/server/identity/mobile-provider-sender";
import {
  smsSegments,
  renderMobileInvitation,
  type MobileInvitationSender,
  type MobileSendOutcome,
} from "@/application/identity/mobile-invitation-delivery";
import {
  readMobileDeliveryConfiguration,
  type MobileDeliveryConfiguration,
} from "@/server/identity/mobile-invitation-delivery-config";

const acceptedSchema = z.object({
  data: z.object({
    id: z.uuid(),
    record_type: z.literal("message"),
    direction: z.literal("outbound"),
    type: z.literal("SMS"),
    messaging_profile_id: z.uuid(),
    from: z.object({ phone_number: z.string() }),
    to: z
      .array(
        z.object({ phone_number: z.string(), status: z.enum(["queued", "sent", "delivered"]) }),
      )
      .length(1),
    encoding: z.literal("GSM-7"),
    parts: z.number().int().min(1).max(2),
    cost: z
      .object({ amount: z.union([z.string(), z.number()]), currency: z.literal("USD") })
      .nullish(),
  }),
});
const uncertain: MobileSendOutcome = { outcome: "uncertain", providerMessageId: null };
export class TelnyxMobileInvitationSender implements MobileInvitationSender {
  constructor(
    private readonly config: MobileDeliveryConfiguration,
    // Invoke native Worker fetch as a global function, not with this adapter as receiver.
    private readonly transport: typeof fetch = (input, options) => fetch(input, options),
  ) {
    const parsed = readMobileDeliveryConfiguration(config);
    if (!parsed) throw new Error("MOBILE_DELIVERY_CONFIGURATION_INVALID");
    this.config = parsed;
  }
  async send(request: Parameters<MobileInvitationSender["send"]>[0]): Promise<MobileSendOutcome> {
    const count = smsSegments(request.text);
    const token = request.text.match(/\/mobile-invitation#([A-Za-z0-9_-]{43})\./)?.[1];
    if (
      !token ||
      request.text !== renderMobileInvitation(token).text ||
      count.encoding !== "GSM-7" ||
      count.segments > 2 ||
      !/^\+27[0-9]{9}$/.test(request.phone) ||
      !Number.isSafeInteger(request.reservedUsdMicros) ||
      request.reservedUsdMicros <= 0 ||
      !Number.isFinite(request.deadline) ||
      request.deadline <= Date.now()
    )
      return { outcome: "failed", providerMessageId: null };
    try {
      const response = await this.transport("https://api.telnyx.com/v2/messages", {
        method: "POST",
        // workerd rejects redirect:"error" before network I/O. Manual preserves the
        // no-follow credential boundary; every 3xx below remains uncertain, never retried.
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(Math.max(1, Math.min(10_000, request.deadline - Date.now()))),
        headers: {
          Authorization: `Bearer ${this.config.TELNYX_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.config.TELNYX_FROM_NUMBER,
          to: request.phone,
          text: request.text,
          type: "SMS",
          messaging_profile_id: this.config.TELNYX_MESSAGING_PROFILE_ID,
          webhook_url: "https://meneerhealth.co.za/api/invitations/telnyx/webhook",
          use_profile_webhooks: false,
        }),
      });
      // Never retain or print a provider error body, which can echo the contact/token/credential.
      if ([400, 401, 403, 422, 429].includes(response.status)) {
        await response.body?.cancel();
        return { outcome: "failed", providerMessageId: null };
      }
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        return uncertain;
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 16_384) {
          await reader.cancel();
          return uncertain;
        }
        chunks.push(chunk.value);
      }
      const joined = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) {
        joined.set(chunk, offset);
        offset += chunk.length;
      }
      const result = acceptedSchema.safeParse(JSON.parse(new TextDecoder().decode(joined)));
      if (!result.success) return uncertain;
      const data = result.data.data;
      if (
        data.messaging_profile_id !== this.config.TELNYX_MESSAGING_PROFILE_ID ||
        !matchesMobileProviderSender(data.from.phone_number, this.config) ||
        data.to[0]!.phone_number !== request.phone ||
        data.parts > count.segments
      )
        return uncertain;
      if (data.cost != null) {
        const amount = String(data.cost.amount);
        if (!/^\d+(\.\d{1,6})?$/.test(amount)) return { ...uncertain, providerMessageId: data.id };
        const [whole, fraction = ""] = amount.split(".");
        const micros = Number(whole) * 1_000_000 + Number(fraction.padEnd(6, "0"));
        if (!Number.isSafeInteger(micros) || micros > request.reservedUsdMicros)
          return { ...uncertain, providerMessageId: data.id };
      }
      // API acceptance is not handset delivery, link acceptance, consent or account activation.
      return { outcome: "accepted", providerMessageId: data.id };
    } catch {
      return uncertain;
    }
  }
}
