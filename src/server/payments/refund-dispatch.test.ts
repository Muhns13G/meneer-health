import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), submit: vi.fn(), client: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.client }));
vi.mock("./pilot-refund", async (original) => ({
  ...(await original<typeof import("./pilot-refund")>()),
  PilotRefundProvider: class {
    submit = mocks.submit;
  },
}));
import { runScheduledRefunds } from "./refund-dispatch";
const id = "a4700000-0000-4000-8000-000000000001";
const bindings = {
  COMMERCE_REFUND_MODE: "sandbox",
  COMMERCE_WEBHOOK_MODE: "sandbox",
  COMMERCE_CHECKOUT_MODE: "sandbox",
  COMMERCE_REVIEW_TENANT_ID: id,
  STRIPE_WEBHOOK_SERVICE_IDENTITY_ID: id,
  STRIPE_CHECKOUT_ACCOUNT_ID: "acct_synthetic12345",
  STRIPE_WEBHOOK_SIGNING_SECRET: "whsec_synthetic_not_a_secret",
  STRIPE_RESTRICTED_KEY: "rk_test_synthetic_not_a_secret",
  SUPABASE_URL: "https://synthetic.example.invalid",
  SUPABASE_SECRET_KEY: "sb_secret_synthetic_not_a_secret",
};
const job = {
  refundId: id,
  accountId: bindings.STRIPE_CHECKOUT_ACCOUNT_ID,
  paymentIntentId: "pi_synthetic12345",
  amountMinor: 19900,
  currency: "zar",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockReturnValue({ rpc: mocks.rpc });
  mocks.submit.mockResolvedValue({ providerId: "re_synthetic12345", state: "submitted" });
});
it("is disabled unless independently opted into test mode", async () => {
  expect(await runScheduledRefunds({})).toBe(0);
  expect(mocks.client).not.toHaveBeenCalled();
  await expect(
    runScheduledRefunds({ ...bindings, COMMERCE_WEBHOOK_MODE: "disabled" }),
  ).rejects.toThrow();
  expect(mocks.submit).not.toHaveBeenCalled();
});
it("claims and durably records each result before looking for another job", async () => {
  mocks.rpc
    .mockResolvedValueOnce({ data: job })
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: null });
  expect(await runScheduledRefunds(bindings)).toBe(1);
  expect(mocks.rpc.mock.calls.map((call) => call[1].p_command.action)).toEqual([
    "claim",
    "record",
    "claim",
  ]);
  expect(mocks.rpc.mock.calls[1]![1].p_command).toEqual({
    action: "record",
    refundId: id,
    providerId: "re_synthetic12345",
    state: "submitted",
  });
});
it("retains a timed-out provider request as uncertain and refuses malformed claims", async () => {
  mocks.rpc
    .mockResolvedValueOnce({ data: job })
    .mockResolvedValueOnce({ data: null })
    .mockResolvedValueOnce({ data: null });
  mocks.submit.mockRejectedValueOnce(new Error("synthetic timeout"));
  expect(await runScheduledRefunds(bindings)).toBe(1);
  expect(mocks.rpc.mock.calls[1]![1].p_command.state).toBe("uncertain");
  mocks.rpc.mockResolvedValueOnce({ data: { ...job, amountMinor: -1 } });
  await expect(runScheduledRefunds(bindings)).rejects.toThrow();
  expect(mocks.submit).toHaveBeenCalledOnce();
});
