import { describe, expect, it, vi } from "vitest";
import {
  alertClaimSchema,
  dispatchOperationsAlerts,
  runScheduledOperationsAlerts,
  sendBrevoOperationsAlert,
} from "./alert-dispatch";
const claim = alertClaimSchema.parse({
  alertId: "a1000000-0000-4000-8000-000000000001",
  leaseId: "a1000000-0000-4000-8000-000000000002",
  code: "ACCESS_DENIED",
  severity: "critical",
  owner: "security",
});
describe("generic internal alert dispatch", () => {
  it.each([
    [201, "accepted"],
    [429, "retryable"],
    [401, "failed"],
    [422, "failed"],
    [500, "uncertain"],
    [302, "uncertain"],
  ] as const)("classifies provider %s without claiming delivery", async (status, expected) => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    expect(await sendBrevoOperationsAlert("synthetic-api-key", claim, send)).toBe(expected);
    const [, init] = send.mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.headers.idempotencyKey).toBe(claim.alertId);
    expect(body.to).toEqual([{ email: "support@meneerhealth.co.za" }]);
    expect(body.textContent).not.toContain(claim.alertId);
    expect(body.textContent).not.toContain(claim.code);
    expect(body).not.toHaveProperty("htmlContent");
    expect(init!.redirect).toBe("manual");
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });
  it("does not retry an ambiguous network failure", async () => {
    const send = vi.fn<typeof fetch>().mockRejectedValue(new Error("private provider diagnostics"));
    expect(await sendBrevoOperationsAlert("synthetic", claim, send)).toBe("uncertain");
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("bounds each scheduled invocation to three persisted attempts", async () => {
    const repository = {
      sweep: vi.fn().mockResolvedValue(undefined),
      claim: vi.fn().mockResolvedValue(claim),
      finish: vi.fn().mockResolvedValue(undefined),
    };
    expect(await dispatchOperationsAlerts(repository, async () => "accepted")).toBe(3);
    expect(repository.finish).toHaveBeenCalledTimes(3);
    expect(repository.finish).toHaveBeenCalledWith(claim, "accepted");
  });
  it("records thrown transport as uncertain and fails when evidence cannot persist", async () => {
    const repository = {
      sweep: vi.fn().mockResolvedValue(undefined),
      claim: vi.fn().mockResolvedValue(claim),
      finish: vi.fn().mockRejectedValue(new Error("synthetic persistence failure")),
    };
    await expect(
      dispatchOperationsAlerts(repository, async () => {
        throw new Error("private");
      }),
    ).rejects.toThrow("synthetic persistence failure");
    expect(repository.finish).toHaveBeenCalledWith(claim, "uncertain");
    expect(repository.claim).toHaveBeenCalledTimes(1);
  });
  it("does nothing until enabled and rejects partial configuration", async () => {
    await expect(runScheduledOperationsAlerts({})).resolves.toBeUndefined();
    await expect(
      runScheduledOperationsAlerts({ OPERATIONS_ALERTS_MODE: "disabled" }),
    ).resolves.toBeUndefined();
    await expect(runScheduledOperationsAlerts({ OPERATIONS_ALERTS_MODE: "brevo" })).rejects.toThrow(
      "OPERATIONS_ALERT_CONFIGURATION_INVALID",
    );
  });
  it("rejects unexpected patient fields in a claimed notification", () => {
    expect(alertClaimSchema.safeParse({ ...claim, email: "client@example.invalid" }).success).toBe(
      false,
    );
  });
});
