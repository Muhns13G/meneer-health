import { describe, expect, it, vi } from "vitest";
import { PatientActivationService } from "./patient-activation-service";
import { activationCommandSchema } from "@/domain/identity/pilot-activation";

const id = "91000000-0000-4000-8000-000000000001";
const command = {
  givenName: "Synthetic",
  familyName: "Client",
  mobileE164: "+27820000000",
  contactPreference: "email",
  termsPublicationId: id,
  termsHash: "a".repeat(64),
  privacyPublicationId: id,
  privacyHash: "b".repeat(64),
  termsAccepted: true,
  privacyAcknowledged: true,
  requestKey: id,
};
const proof = { invitationId: id, tenantId: id, providerSubject: id, accessToken: "synthetic" };
function harness() {
  const verifyAccessToken = vi.fn(async () => ({
    provider: "supabase" as const,
    providerSubject: id,
    providerSessionId: id,
    assurance: "aal1" as const,
    authenticatedAt: new Date(),
    expiresAt: new Date(Date.now() + 60000),
    verifiedContact: {
      kind: "email" as const,
      value: "synthetic@example.invalid",
      verifiedAt: new Date(),
    },
  }));
  const activate = vi.fn(async () => id);
  const prepare = vi.fn();
  return {
    verifyAccessToken,
    activate,
    service: new PatientActivationService({ verifyAccessToken }, { activate, prepare }),
  };
}
describe("patient activation", () => {
  it("passes only trusted identity context and a strict normalized command to durable storage", async () => {
    const h = harness();
    await h.service.activate(proof, { ...command, givenName: " Synthetic " });
    expect(h.activate).toHaveBeenCalledWith(
      { invitationId: id, tenantId: id, providerSubject: id, providerSessionId: id },
      { ...command, givenName: "Synthetic" },
    );
  });
  it.each([
    { termsAccepted: false },
    { privacyAcknowledged: false },
    { mobileE164: "0820000000" },
    { password: "excluded" },
    { email: "other@example.invalid" },
    { givenName: "\n" },
  ])("rejects refusal, invalid profile and additional fields: %j", async (override) => {
    const h = harness();
    await expect(h.service.activate(proof, { ...command, ...override })).rejects.toThrow();
    expect(h.activate).not.toHaveBeenCalled();
  });
  it("rejects a provider subject mismatch", async () => {
    const h = harness();
    await expect(
      h.service.activate({ ...proof, providerSubject: "different" }, command),
    ).rejects.toThrow();
    expect(h.activate).not.toHaveBeenCalled();
  });
  it("does not report success after a durable failure", async () => {
    const h = harness();
    h.activate.mockRejectedValue(new Error("synthetic failure"));
    await expect(h.service.activate(proof, command)).rejects.toThrow();
  });
  it("keeps separate unchecked actions mandatory", () => {
    expect(
      activationCommandSchema.safeParse({ ...command, privacyAcknowledged: undefined }).success,
    ).toBe(false);
  });
});
