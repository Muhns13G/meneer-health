import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchMobileInvitation } from "./mobile-invitation-delivery-service";
import { readMobileDeliveryConfiguration } from "./mobile-invitation-delivery-config";
const id = "a1440000-0000-4000-8000-000000000001";
const request = { invitationId: id, expectedVersion: 1, reservationRequestKey: id };
const config = readMobileDeliveryConfiguration({
  MOBILE_INVITATIONS_MODE: "telnyx",
  MOBILE_INVITATIONS_DELIVERY_READY: "true",
  MOBILE_INVITATIONS_TENANT_ID: id,
  TELNYX_API_KEY: "synthetic-key-not-a-credential",
  TELNYX_MESSAGING_PROFILE_ID: id,
  TELNYX_FROM_NUMBER: "+999000000001",
})!;
function fixture() {
  const prepare = vi.fn().mockResolvedValue({
    attemptId: id,
    phone: "+27000000001",
    reservedUsdMicros: 100000,
    dispatchUntil: new Date(Date.now() + 60000).toISOString(),
  });
  const finish = vi.fn().mockResolvedValue(undefined);
  const send = vi.fn().mockResolvedValue({ outcome: "accepted", providerMessageId: id });
  return { prepare, finish, send };
}
describe("durable mobile dispatch", () => {
  beforeEach(() => vi.stubGlobal("crypto", webcrypto));
  afterEach(() => vi.unstubAllGlobals());
  it("does nothing while disabled", async () => {
    const f = fixture();
    expect(await dispatchMobileInvitation(request, null, f, f)).toEqual({ outcome: "disabled" });
    expect(f.prepare).not.toHaveBeenCalled();
    expect(f.send).not.toHaveBeenCalled();
  });
  it("commits only a digest before sending and returns no bearer/contact/provider fields", async () => {
    const f = fixture();
    const result = await dispatchMobileInvitation(request, config, f, f);
    const digest = f.prepare.mock.calls[0]![1] as string;
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(f.prepare.mock.invocationCallOrder[0]).toBeLessThan(f.send.mock.invocationCallOrder[0]!);
    expect(f.send.mock.invocationCallOrder[0]).toBeLessThan(f.finish.mock.invocationCallOrder[0]!);
    const text = f.send.mock.calls[0]![0].text as string;
    const token = text.split("#")[1]!.slice(0, 43);
    expect(JSON.stringify(f.prepare.mock.calls)).not.toContain(token);
    expect(JSON.stringify(f.finish.mock.calls)).not.toContain(token);
    expect(result).toEqual({ attemptId: id, outcome: "accepted" });
    expect(JSON.stringify(result)).not.toContain("+27");
  });
  it("replays never claim or send again", async () => {
    const f = fixture();
    f.prepare.mockResolvedValue(null);
    expect(await dispatchMobileInvitation(request, config, f, f)).toEqual({
      outcome: "already_attempted",
    });
    expect(f.send).not.toHaveBeenCalled();
  });
  it("failed preparation cannot contact provider", async () => {
    const f = fixture();
    f.prepare.mockRejectedValue(new Error("quota"));
    await expect(dispatchMobileInvitation(request, config, f, f)).rejects.toThrow("quota");
    expect(f.send).not.toHaveBeenCalled();
  });
  it("lost provider response is recorded uncertain", async () => {
    const f = fixture();
    f.send.mockRejectedValue(new Error("timeout"));
    expect((await dispatchMobileInvitation(request, config, f, f)).outcome).toBe("uncertain");
    expect(f.finish).toHaveBeenCalledWith(id, { outcome: "uncertain", providerMessageId: null });
    expect(f.send).toHaveBeenCalledTimes(1);
  });
  it("lost finish receipt cannot claim acceptance or retry", async () => {
    const f = fixture();
    f.finish.mockRejectedValue(new Error("database"));
    expect((await dispatchMobileInvitation(request, config, f, f)).outcome).toBe("uncertain");
    expect(f.send).toHaveBeenCalledTimes(1);
  });
});
