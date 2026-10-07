import { expect, it, vi } from "vitest";
import { PatientPortalService } from "./patient-portal-service";
import { IdentityRejectedError } from "./managed-identity-provider";
import type { IdentitySession, ProviderIdentity } from "@/domain/access/identity";
import { portalAccountFixture } from "@/test/patient-portal-fixture";

const now = new Date("2030-01-01T00:05:00Z");
const id = "97000000-0000-4000-8000-000000000001";
const session: IdentitySession = {
  id,
  subjectId: id,
  providerSessionId: id,
  sessionClass: "patient",
  assurance: "aal1",
  status: "active",
  issuedAt: now,
  lastSeenAt: now,
  idleExpiresAt: new Date("2030-01-01T00:35:00Z"),
  absoluteExpiresAt: new Date("2030-01-01T12:00:00Z"),
};
const identity: ProviderIdentity = {
  provider: "supabase",
  providerSubject: id,
  providerSessionId: id,
  assurance: "aal1",
  authenticatedAt: now,
  expiresAt: new Date("2030-01-01T01:00:00Z"),
  verifiedContact: { kind: "email", value: "portal@example.invalid", verifiedAt: now },
};
const proof = {
  sessionId: id,
  subjectId: id,
  tenantId: id,
  providerSessionId: id,
  accessToken: "synthetic-access",
  refreshToken: "synthetic-refresh",
  providerExpiresAt: identity.expiresAt.getTime(),
};
function harness() {
  const verifyAccessToken = vi.fn(async () => identity);
  const findActive = vi.fn<() => Promise<IdentitySession | null>>(async () => session);
  const touch = vi.fn(async () => session);
  const readOwnAccount = vi.fn(async () => portalAccountFixture);
  return {
    verifyAccessToken,
    findActive,
    touch,
    readOwnAccount,
    service: new PatientPortalService(
      { verifyAccessToken },
      { findActive, touch },
      { readOwnAccount },
      () => now,
    ),
  };
}
it("freshly verifies and supplies only server-derived authority; touches after a successful projection", async () => {
  const h = harness();
  await expect(h.service.read(proof)).resolves.toEqual({
    account: portalAccountFixture,
    expiresAt: session.idleExpiresAt.toISOString(),
  });
  expect(h.readOwnAccount).toHaveBeenCalledWith({
    sessionId: id,
    subjectId: id,
    tenantId: id,
    providerSubject: id,
    providerSessionId: id,
    verifiedEmail: "portal@example.invalid",
    purpose: "account",
  });
  expect(h.touch).toHaveBeenCalledWith(session, now);
});
it.each([
  null,
  { ...session, id: "another" },
  { ...session, subjectId: "another" },
  { ...session, sessionClass: "workforce" as const },
])("rejects missing, mismatched or non-patient application sessions", async (current) => {
  const h = harness();
  h.findActive.mockResolvedValueOnce(current);
  await expect(h.service.read(proof)).rejects.toBeInstanceOf(IdentityRejectedError);
  expect(h.readOwnAccount).not.toHaveBeenCalled();
});
it.each([
  { ...identity, providerSessionId: "another" },
  { ...identity, expiresAt: now },
  { ...identity, verifiedContact: { ...identity.verifiedContact, kind: "phone" as const } },
])("rejects stale or changed provider authority before storage", async (current) => {
  const h = harness();
  h.verifyAccessToken.mockResolvedValueOnce(current);
  await expect(h.service.read(proof)).rejects.toBeInstanceOf(IdentityRejectedError);
  expect(h.readOwnAccount).not.toHaveBeenCalled();
});
it("never returns a projection if durable authority or session touch fails", async () => {
  const h = harness();
  h.readOwnAccount.mockRejectedValueOnce(new IdentityRejectedError());
  await expect(h.service.read(proof)).rejects.toBeInstanceOf(IdentityRejectedError);
  expect(h.touch).not.toHaveBeenCalled();
  h.touch.mockRejectedValueOnce(new IdentityRejectedError());
  await expect(h.service.read(proof)).rejects.toBeInstanceOf(IdentityRejectedError);
});
