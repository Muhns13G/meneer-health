import { expect, it, vi } from "vitest";
import {
  createNotificationReceiptHandler,
  notificationMessageHash,
  projectNotificationReceipt,
  readNotificationSendReference,
} from "./notification-receipts";
import { sendTransactionalNotification } from "./notification-dispatch";

const secret = "synthetic-notification-header-key-".padEnd(43, "x");
const bindings = {
  TRANSACTIONAL_NOTIFICATIONS_MODE: "brevo",
  TRANSACTIONAL_NOTIFICATIONS_TENANT_ID: "f1200000-0000-4000-8000-000000000001",
  TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET: secret,
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_SECRET_KEY: "synthetic-private-service-key",
};
const payload = {
  event: "delivered",
  "message-id": "20261006.12345@relay.brevo.invalid",
  ts_event: Math.floor(Date.now() / 1000),
  email: "client@example.invalid",
  subject: "private message subject",
  mirror_link: "https://private.example.invalid/preview",
};
function request(input: unknown = payload, headers: Record<string, string> = {}) {
  return new Request("https://meneerhealth.co.za/api/notifications/brevo/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-meneer-notification-secret": secret,
      ...headers,
    },
    body: typeof input === "string" ? input : JSON.stringify(input),
  });
}
it("keeps only opaque attribution, event and UTC time, never diagnostics or addresses", async () => {
  const receipt = await projectNotificationReceipt(payload);
  expect(Object.keys(receipt).sort()).toEqual(["event", "messageHash", "occurredAt"]);
  expect(receipt.messageHash).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(receipt)).not.toMatch(/client|subject|mirror_link|relay/);
  expect(await notificationMessageHash(`<${payload["message-id"]}>`)).toBe(receipt.messageHash);
});
it.each([
  "delivered",
  "hard_bounce",
  "soft_bounce",
  "blocked",
  "invalid_email",
  "spam",
  "unsubscribed",
  "error",
])("accepts attributed %s evidence without asserting human acknowledgement", async (event) => {
  const record = vi.fn().mockResolvedValue(undefined);
  const response = await createNotificationReceiptHandler(
    bindings,
    record,
  )(request({ ...payload, event }));
  expect(response.status).toBe(204);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(record).toHaveBeenCalledExactlyOnceWith(
    bindings.TRANSACTIONAL_NOTIFICATIONS_TENANT_ID,
    await projectNotificationReceipt({ ...payload, event }),
  );
});
it.each(["click", "opened", "unique_opened", "request", "deferred", "invalid"])(
  "rejects %s instead of adding marketing analytics to delivery facts",
  async (event) => {
    const record = vi.fn();
    expect(
      (await createNotificationReceiptHandler(bindings, record)(request({ ...payload, event })))
        .status,
    ).toBe(400);
    expect(record).not.toHaveBeenCalled();
  },
);
it("denies forged, malformed and oversized callbacks before persistence", async () => {
  const record = vi.fn();
  const handler = createNotificationReceiptHandler(bindings, record);
  expect(
    (await handler(request(payload, { "x-meneer-notification-secret": "wrong".padEnd(43, "z") })))
      .status,
  ).toBe(401);
  expect((await handler(request(payload, { "x-meneer-notification-secret": "" }))).status).toBe(
    401,
  );
  expect((await handler(request(payload, { "content-type": "text/plain" }))).status).toBe(415);
  expect((await handler(request("not json"))).status).toBe(400);
  expect((await handler(request("x".repeat(8193)))).status).toBe(413);
  expect(
    (await handler(request({ ...payload, ts_event: Math.floor(Date.now() / 1000) + 3600 }))).status,
  ).toBe(400);
  expect((await handler(request({ ...payload, "message-id": "bad\r\naddress" }))).status).toBe(400);
  expect(record).not.toHaveBeenCalled();
});
it("disabled and incomplete callback configuration stays closed", async () => {
  const record = vi.fn();
  expect((await createNotificationReceiptHandler({}, record)(request())).status).toBe(404);
  expect(
    (
      await createNotificationReceiptHandler(
        { ...bindings, TRANSACTIONAL_NOTIFICATIONS_MODE: "disabled" },
        record,
      )(request())
    ).status,
  ).toBe(404);
  expect(
    (
      await createNotificationReceiptHandler(
        { ...bindings, TRANSACTIONAL_NOTIFICATION_WEBHOOK_SECRET: undefined },
        record,
      )(request())
    ).status,
  ).toBe(503);
  expect(
    (
      await createNotificationReceiptHandler(
        bindings,
        record,
      )(new Request("https://meneerhealth.co.za/api/notifications/brevo/webhook"))
    ).status,
  ).toBe(405);
  expect(record).not.toHaveBeenCalled();
});
it("requests provider retry on receipt persistence failure without leaking diagnostics", async () => {
  const record = vi.fn().mockRejectedValue(new Error("private database detail"));
  const response = await createNotificationReceiptHandler(bindings, record)(request());
  expect(response.status).toBe(503);
  expect(await response.text()).toBe("");
});
it("bounds provider acceptance response and hashes only its message reference", async () => {
  const hash = await readNotificationSendReference(
    new Response(JSON.stringify({ messageId: `<${payload["message-id"]}>` })),
  );
  expect(hash).toBe(await notificationMessageHash(payload["message-id"]));
  await expect(readNotificationSendReference(new Response("x".repeat(4097)))).rejects.toThrow();
  await expect(readNotificationSendReference(new Response("private diagnostic"))).rejects.toThrow();
});
it("does not acknowledge acceptance if reference binding is uncertain", async () => {
  const send = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ messageId: `<${payload["message-id"]}>` }), { status: 201 }),
    );
  const bind = vi.fn().mockRejectedValue(new Error("private failure"));
  const claim = {
    notificationId: "f1200000-0000-4000-8000-000000000001",
    leaseId: "f1200000-0000-4000-8000-000000000002",
    template: "payment-v1" as const,
    recipient: "client@example.invalid",
  };
  expect(await sendTransactionalNotification("synthetic", claim, send, bind)).toBe("uncertain");
  expect(send).toHaveBeenCalledTimes(1);
  expect(bind).toHaveBeenCalledExactlyOnceWith(
    await notificationMessageHash(payload["message-id"]),
  );
});
