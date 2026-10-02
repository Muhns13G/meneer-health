import { describe, expect, it } from "vitest";

import type { VerifiedPatientInvitation } from "@/application/identity/patient-invitation-verification-service";
import {
  openPreactivationProof,
  readPreactivationKey,
  sealPreactivationProof,
} from "./preactivation-cookie";

const now = Date.parse("2030-01-01T00:00:00.000Z");
const key = new Uint8Array(32).fill(7);
const verified: VerifiedPatientInvitation = {
  invitation: {
    id: "60000000-0000-4000-8000-000000000002",
    tenantId: "10000000-0000-4000-8000-000000000001",
    contactDigest: "a".repeat(64),
    intendedRole: "patient",
    providerSubject: "provider-subject",
    status: "pending",
    expiresAt: new Date(now + 3_600_000),
  },
  session: {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
    expiresAt: new Date(now + 3_600_000),
  },
};

describe("non-authorising preactivation proof", () => {
  it("encrypts provider credentials and expires within ten minutes", async () => {
    const token = await sealPreactivationProof(verified, key, now);
    expect(token).not.toContain("synthetic-access");
    expect(token).not.toContain(verified.invitation.id);
    await expect(openPreactivationProof(token, key, now + 1_000)).resolves.toMatchObject({
      invitationId: verified.invitation.id,
      providerSubject: verified.invitation.providerSubject,
      expiresAt: now + 600_000,
    });
    await expect(openPreactivationProof(token, key, now + 600_000)).resolves.toBeNull();
  });

  it("rejects tampering, wrong keys and invalid key material", async () => {
    const token = await sealPreactivationProof(verified, key, now);
    const parts = token.split(".");
    parts[2] = `${parts[2]?.startsWith("A") ? "B" : "A"}${parts[2]?.slice(1)}`;
    const tampered = parts.join(".");
    await expect(openPreactivationProof(tampered, key, now)).resolves.toBeNull();
    await expect(
      openPreactivationProof(token, new Uint8Array(32).fill(8), now),
    ).resolves.toBeNull();
    expect(() => readPreactivationKey("bad")).toThrow("PREACTIVATION_KEY_INVALID");
  });
});
