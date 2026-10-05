import { expect, it, vi } from "vitest";
import Stripe from "stripe";
import { createPilotWebhookHandler, verifyPilotReceipt } from "./pilot-webhook";
const client = new Stripe("rk_test_synthetic_only", { apiVersion: "2026-07-29.dahlia" });
const secret = "whsec_synthetic_only_boundary";
const account = "acct_synthetic12345",
  id = "a4100000-0000-4000-8000-000000000001";
function payload(patch: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_synthetic12345",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: "cs_test_synthetic12345",
        client_reference_id: id,
        metadata: { orderId: id, tenantId: id, diagnosis: "synthetic-prohibited-value" },
        payment_intent: "pi_synthetic12345",
        payment_status: "paid",
        amount_total: 99900,
        currency: "zar",
        customer_email: "private@example.invalid",
      },
    },
    ...patch,
  });
}
const signature = (body: string) =>
  client.webhooks.generateTestHeaderString({ payload: body, secret });
it("verifies a real SDK signature before stripping customer/medical fields", async () => {
  const raw = payload();
  const result = await verifyPilotReceipt(raw, signature(raw), secret, account, client);
  expect(result).toMatchObject({
    intentId: id,
    tenantId: id,
    amountMinor: 99900,
    paymentStatus: "paid",
  });
  expect(JSON.stringify(result)).not.toMatch(/diagnosis|private@example|synthetic-prohibited/);
  await expect(
    verifyPilotReceipt(raw + " ", signature(raw), secret, account, client),
  ).rejects.toThrow();
  await expect(
    verifyPilotReceipt(raw, signature(raw), "whsec_wrong_synthetic", account, client),
  ).rejects.toThrow();
  const stale = client.webhooks.generateTestHeaderString({
    payload: raw,
    secret,
    timestamp: Math.floor(Date.now() / 1000) - 400,
  });
  await expect(verifyPilotReceipt(raw, stale, secret, account, client)).rejects.toThrow();
});
it("rejects signed live/foreign-account and inconsistent references", async () => {
  for (const patch of [
    { livemode: true },
    { account: "acct_other12345" },
    {
      data: {
        object: {
          id: "cs_test_synthetic12345",
          client_reference_id: id,
          metadata: { orderId: "a4100000-0000-4000-8000-000000000002" },
        },
      },
    },
  ]) {
    const body = payload(patch);
    await expect(
      verifyPilotReceipt(body, signature(body), secret, account, client),
    ).rejects.toThrow();
  }
});
it("retains safe unsupported receipts without persisting their object", async () => {
  const raw = payload({ type: "customer.updated" });
  const result = await verifyPilotReceipt(raw, signature(raw), secret, account, client);
  expect(result.intentId).toBeNull();
  expect(result.paymentIntentId).toBeNull();
  expect(result.eventType).toBe("customer.updated");
});
it("acknowledges only durable receipt processing and hides storage errors", async () => {
  const apply = vi.fn(async () => ({ replayed: false, outcome: "pending" }));
  const handler = createPilotWebhookHandler(
    { COMMERCE_WEBHOOK_MODE: "sandbox" },
    { verify: (r, s) => verifyPilotReceipt(r, s, secret, account, client), apply },
  );
  const raw = payload();
  const request = (body = raw, sig = signature(raw)) =>
    new Request("https://meneerhealth.co.za/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
      body,
    });
  expect((await handler(request(raw, "invalid"))).status).toBe(400);
  expect(apply).not.toHaveBeenCalled();
  const response = await handler(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: true, replayed: false });
  apply.mockRejectedValueOnce(new Error("synthetic private database detail"));
  const failed = await handler(request());
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("private");
  expect(
    (await createPilotWebhookHandler({ COMMERCE_WEBHOOK_MODE: "disabled" })(request())).status,
  ).toBe(404);
});
