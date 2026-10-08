import { beforeEach, describe, expect, it, vi } from "vitest";
import { runMobileInvitationRetention } from "./mobile-invitation-retention";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/server/config/environment.server", () => ({
  initialiseServerEnvironment: () => ({
    environment: { supabase: { url: "http://127.0.0.1:54321", secretKey: "synthetic" } },
  }),
}));
describe("mobile register retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockReturnValue({ rpc: mocks.rpc });
  });
  it("does nothing with disabled defaults", async () => {
    await runMobileInvitationRetention({});
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("uses only the configured tenant and accepts count-only results", async () => {
    mocks.rpc.mockResolvedValue({ data: { expired: 1, contactsPurged: 0, eventsPurged: 0 } });
    await runMobileInvitationRetention({
      MOBILE_INVITATIONS_EMAIL_MODE: "enabled",
      MOBILE_INVITATIONS_TENANT_ID: "a1470000-0000-4000-8000-000000000001",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("sweep_mobile_invitation_retention", {
      p_tenant_id: "a1470000-0000-4000-8000-000000000001",
    });
  });
  it("rejects unexpected or failed results without logging contact data", async () => {
    mocks.rpc.mockResolvedValue({ data: { email: "synthetic@example.invalid" } });
    await expect(
      runMobileInvitationRetention({
        MOBILE_INVITATIONS_EMAIL_MODE: "enabled",
        MOBILE_INVITATIONS_TENANT_ID: "a1470000-0000-4000-8000-000000000001",
      }),
    ).rejects.toThrow("MOBILE_RETENTION_UNAVAILABLE");
  });
});
