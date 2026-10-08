import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  createMobileReceiptHandler,
  projectMobileReceipt,
  readMobileReceiptConfiguration,
} from "./mobile-invitation-receipts";
import { renderMobileInvitation } from "@/application/identity/mobile-invitation-delivery";
const id = "a1450000-0000-4000-8000-000000000001";
const token = "a".repeat(43);
let keys: CryptoKeyPair;
let config: Record<string, unknown>;
beforeAll(async () => {
  keys = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
  config = {
    MOBILE_INVITATIONS_WEBHOOK_MODE: "telnyx",
    MOBILE_INVITATIONS_TENANT_ID: id,
    TELNYX_MESSAGING_PROFILE_ID: id,
    TELNYX_FROM_NUMBER: "+999000000001",
    TELNYX_PUBLIC_KEY_BASE64: btoa(
      String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey))),
    ),
  };
});
function payload(status = "delivered", event = "message.finalized") {
  return {
    data: {
      id,
      event_type: event,
      occurred_at: new Date().toISOString(),
      payload: {
        id,
        direction: "outbound",
        type: "SMS",
        messaging_profile_id: id,
        from: { phone_number: "+999000000001" },
        to: [{ phone_number: "+27000000001", status }],
        text: renderMobileInvitation(token).text,
        encoding: "GSM-7",
        parts: 2,
        errors: [],
        cost: { amount: "0.08", currency: "USD" },
      },
    },
    meta: { attempt: 1 },
  };
}
async function request(
  body = JSON.stringify(payload()),
  timestamp = String(Math.floor(Date.now() / 1000)),
) {
  const signature = btoa(
    String.fromCharCode(
      ...new Uint8Array(
        await crypto.subtle.sign(
          "Ed25519",
          keys.privateKey,
          new TextEncoder().encode(`${timestamp}|${body}`),
        ),
      ),
    ),
  );
  return new Request("https://meneerhealth.co.za/api/invitations/telnyx/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "telnyx-timestamp": timestamp,
      "telnyx-signature-ed25519": signature,
    },
    body,
  });
}
describe("attributed mobile delivery receipts", () => {
  it("verifies real Ed25519 bytes and retains only minimal facts", async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const result = await createMobileReceiptHandler(config, record)(await request());
    expect(result.status).toBe(204);
    expect(result.headers.get("cache-control")).toBe("no-store");
    const receipt = record.mock.calls[0]![1];
    expect(receipt).toMatchObject({ outcome: "delivered", cost: 80000, profileId: id });
    expect(receipt.tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(receipt)).not.toContain(token);
    expect(receipt).not.toHaveProperty("text");
    expect(receipt).not.toHaveProperty("errors");
  });
  it.each(["delivery_failed", "sending_failed", "delivery_unconfirmed", "sent"])(
    "projects %s without acceptance",
    async (status) => {
      const receipt = await projectMobileReceipt(
        payload(status, status === "sent" ? "message.sent" : "message.finalized"),
        readMobileReceiptConfiguration(config)!,
      );
      expect(receipt.outcome).toBe(
        status === "sent" ? "sent" : status === "delivery_unconfirmed" ? "unconfirmed" : "failed",
      );
      expect(receipt).not.toHaveProperty("accepted");
    },
  );
  it("rejects tampering, wrong keys, stale/future timestamps before storage", async () => {
    const record = vi.fn();
    const handler = createMobileReceiptHandler(config, record);
    const r = await request();
    expect(
      (
        await handler(
          new Request(r.url, {
            method: "POST",
            headers: r.headers,
            body: JSON.stringify(payload("delivery_failed")),
          }),
        )
      ).status,
    ).toBe(401);
    for (const delta of [-301, 301])
      expect(
        (await handler(await request(undefined, String(Math.floor(Date.now() / 1000) + delta))))
          .status,
      ).toBe(401);
    expect(
      (
        await createMobileReceiptHandler(
          { ...config, TELNYX_PUBLIC_KEY_BASE64: btoa("x".repeat(32)) },
          record,
        )(await request())
      ).status,
    ).toBe(401);
    expect(record).not.toHaveBeenCalled();
  });
  it.each(["text", "direction", "messaging_profile_id", "encoding"])(
    "rejects unattributed %s",
    async (field) => {
      const p = payload();
      Object.assign(p.data.payload, { [field]: "wrong" });
      const record = vi.fn();
      expect(
        (await createMobileReceiptHandler(config, record)(await request(JSON.stringify(p)))).status,
      ).toBe(400);
      expect(record).not.toHaveBeenCalled();
    },
  );
  it("rejects false delivery, malformed/oversized input and retryable storage failure", async () => {
    const record = vi.fn().mockRejectedValue(new Error("synthetic"));
    const handler = createMobileReceiptHandler(config, record);
    const p = payload();
    Object.assign(p.data.payload, { errors: [{ detail: "private provider reason" }] });
    expect((await handler(await request(JSON.stringify(p)))).status).toBe(400);
    expect((await handler(await request("{"))).status).toBe(400);
    expect((await handler(await request("x".repeat(16385)))).status).toBe(413);
    expect(record).not.toHaveBeenCalled();
    expect((await handler(await request())).status).toBe(503);
  });
  it("defaults off and rejects wrong origin, method and content type", async () => {
    expect((await createMobileReceiptHandler({})(await request())).status).toBe(404);
    const r = await request();
    const handler = createMobileReceiptHandler(config);
    expect((await handler(new Request(r.url + "?token=x", r))).status).toBe(404);
    expect(
      (await handler(new Request("https://wrong.invalid/api/invitations/telnyx/webhook", r)))
        .status,
    ).toBe(404);
    expect((await handler(new Request(r.url))).status).toBe(405);
    const h = new Headers(r.headers);
    h.set("content-type", "text/plain");
    expect(
      (await handler(new Request(r.url, { method: "POST", headers: h, body: "{}" }))).status,
    ).toBe(415);
    expect(
      (
        await createMobileReceiptHandler({ ...config, TELNYX_PUBLIC_KEY_BASE64: "bad" })(
          await request(),
        )
      ).status,
    ).toBe(503);
  });
});
