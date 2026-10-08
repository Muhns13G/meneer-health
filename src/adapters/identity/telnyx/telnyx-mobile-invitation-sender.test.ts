import { describe, expect, it, vi } from "vitest";
import { TelnyxMobileInvitationSender } from "./telnyx-mobile-invitation-sender";
import { readMobileDeliveryConfiguration } from "@/server/identity/mobile-invitation-delivery-config";
import {
  renderMobileInvitation,
  smsSegments,
} from "@/application/identity/mobile-invitation-delivery";
const id = "a1440000-0000-4000-8000-000000000001";
const config = readMobileDeliveryConfiguration({
  MOBILE_INVITATIONS_MODE: "telnyx",
  MOBILE_INVITATIONS_DELIVERY_READY: "true",
  MOBILE_INVITATIONS_TENANT_ID: id,
  TELNYX_API_KEY: "synthetic-key-not-a-credential",
  TELNYX_MESSAGING_PROFILE_ID: id,
  TELNYX_FROM_NUMBER: "+999000000001",
})!;
const request = {
  phone: "+27000000001",
  ...renderMobileInvitation("a".repeat(43)),
  reservedUsdMicros: 100000,
  deadline: Date.now() + 60000,
};
function receipt() {
  return {
    data: {
      id,
      record_type: "message",
      direction: "outbound",
      type: "SMS",
      messaging_profile_id: id,
      from: { phone_number: config.TELNYX_FROM_NUMBER },
      to: [{ phone_number: request.phone, status: "queued" }],
      encoding: "GSM-7",
      parts: 2,
      cost: { amount: "0.08", currency: "USD" },
    },
  };
}
describe("one-shot Telnyx sender", () => {
  it("accepts only an explicitly configured exact profile alpha rewrite", async () => {
    const body = receipt();
    body.data.from.phone_number = "TestSender";
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    expect(
      await new TelnyxMobileInvitationSender(
        { ...config, TELNYX_ALPHA_SENDER: "TestSender" },
        transport,
      ).send(request),
    ).toEqual({ outcome: "accepted", providerMessageId: id });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(JSON.parse(transport.mock.calls[0]![1]!.body as string).from).toBe(
      config.TELNYX_FROM_NUMBER,
    );
    for (const expected of [undefined, "OtherSender", "testsender"]) {
      const rejected = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
      expect(
        await new TelnyxMobileInvitationSender(
          { ...config, TELNYX_ALPHA_SENDER: expected },
          rejected,
        ).send(request),
      ).toEqual({ outcome: "uncertain", providerMessageId: null });
      expect(rejected).toHaveBeenCalledTimes(1);
    }
  });
  it.each(["", "123456", "+123456789", " Test", "Test ", "Test_Sender", "a".repeat(12)])(
    "rejects malformed configured alpha sender %j",
    (value) => {
      expect(() =>
        readMobileDeliveryConfiguration({ ...config, TELNYX_ALPHA_SENDER: value }),
      ).toThrow();
    },
  );
  it("invokes default fetch without binding the adapter as its receiver", async () => {
    const transport = vi.fn(function (this: unknown) {
      if (this instanceof TelnyxMobileInvitationSender) throw new TypeError("Illegal invocation");
      return Promise.resolve(Response.json(receipt()));
    });
    vi.stubGlobal("fetch", transport);
    try {
      expect(await new TelnyxMobileInvitationSender(config).send(request)).toEqual({
        outcome: "accepted",
        providerMessageId: id,
      });
      expect(transport).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("retains API acceptance as acceptance only when final cost is not yet available", async () => {
    const body = { data: { ...receipt().data, cost: null } };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    expect(await new TelnyxMobileInvitationSender(config, transport).send(request)).toEqual({
      outcome: "accepted",
      providerMessageId: id,
    });
  });
  it("defaults off and requires complete explicitly ready configuration", () => {
    expect(readMobileDeliveryConfiguration({})).toBeNull();
    expect(
      readMobileDeliveryConfiguration({
        MOBILE_INVITATIONS_MODE: "disabled",
        TELNYX_API_KEY: "unused",
      }),
    ).toBeNull();
    expect(() => readMobileDeliveryConfiguration({ MOBILE_INVITATIONS_MODE: "telnyx" })).toThrow(
      "MOBILE_DELIVERY_CONFIGURATION_INVALID",
    );
  });
  it("counts GSM extension septets and Unicode units", () => {
    expect(smsSegments("a".repeat(160))).toEqual({ encoding: "GSM-7", segments: 1 });
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
    expect(smsSegments("^".repeat(81)).segments).toBe(2);
    expect(smsSegments("a".repeat(307)).segments).toBe(3);
    expect(smsSegments("😀".repeat(36))).toEqual({ encoding: "UCS-2", segments: 2 });
    expect(request.segments).toBe(2);
    expect(request.text).toContain("/mobile-invitation#" + "a".repeat(43));
    expect(request.text).not.toMatch(/health condition|peptide|Synthetic Participant/i);
    expect(request.text.split("#")[0]).not.toContain("?");
  });
  it("sends once to the fixed API with explicit isolated callback and no shared-profile writes", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(receipt()));
    expect(await new TelnyxMobileInvitationSender(config, transport).send(request)).toEqual({
      outcome: "accepted",
      providerMessageId: id,
    });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, options] = transport.mock.calls[0]!;
    expect(url).toBe("https://api.telnyx.com/v2/messages");
    expect(options?.redirect).toBe("manual");
    expect(JSON.parse(options?.body as string)).toMatchObject({
      use_profile_webhooks: false,
      webhook_url: "https://meneerhealth.co.za/api/invitations/telnyx/webhook",
      text: request.text,
    });
  });
  it("does not follow a redirect or forward the credential to its Location", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 307,
        headers: { Location: "https://unexpected.example.invalid" },
      }),
    );
    expect(await new TelnyxMobileInvitationSender(config, transport).send(request)).toEqual({
      outcome: "uncertain",
      providerMessageId: null,
    });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[0]).toBe("https://api.telnyx.com/v2/messages");
    expect(transport.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });
  it.each([400, 401, 403, 422, 429, 500, 502, 302])("never retries response %i", async (status) => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("sensitive echoed body", { status }));
    const result = await new TelnyxMobileInvitationSender(config, transport).send(request);
    expect(result.outcome).toBe(status < 500 && status !== 302 ? "failed" : "uncertain");
    expect(JSON.stringify(result)).not.toContain("sensitive");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each(["timeout", "connection lost after acceptance"])(
    "holds unknown %s without retry",
    async (message) => {
      const transport = vi.fn<typeof fetch>().mockRejectedValue(new Error(message));
      expect(
        (await new TelnyxMobileInvitationSender(config, transport).send(request)).outcome,
      ).toBe("uncertain");
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["{}", "not-json", "x".repeat(16385)])(
    "rejects malformed/oversized response",
    async (body) => {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
      expect(
        (await new TelnyxMobileInvitationSender(config, transport).send(request)).outcome,
      ).toBe("uncertain");
    },
  );
  it.each(["destination", "profile", "segments", "cost"])("holds conflicting %s", async (field) => {
    const body = receipt();
    if (field === "destination") body.data.to[0]!.phone_number = "+27000000002";
    if (field === "profile")
      body.data.messaging_profile_id = "b1440000-0000-4000-8000-000000000001";
    if (field === "segments") body.data.parts = 3;
    if (field === "cost") body.data.cost.amount = "0.11";
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    expect((await new TelnyxMobileInvitationSender(config, transport).send(request)).outcome).toBe(
      "uncertain",
    );
  });
  it.each([
    { phone: "+999000000001" },
    { text: "😀" },
    { text: "a".repeat(307) },
    { reservedUsdMicros: 0 },
    { deadline: 0 },
    { deadline: Number.NaN },
    { text: "Unapproved marketing message" },
  ])("rejects preflight before network", async (change) => {
    const transport = vi.fn<typeof fetch>();
    expect(
      (await new TelnyxMobileInvitationSender(config, transport).send({ ...request, ...change }))
        .outcome,
    ).toBe("failed");
    expect(transport).not.toHaveBeenCalled();
  });
});
