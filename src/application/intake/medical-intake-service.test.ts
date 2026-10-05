import { expect, it, vi } from "vitest";
import { MedicalIntakeService, IntakeValidationError } from "./medical-intake-service";
import { IdentityRejectedError } from "../identity/managed-identity-provider";
import { portalAccountFixture } from "@/test/patient-portal-fixture";
import { completeSyntheticAnswers } from "../../../contracts/fixtures/medical-intake-synthetic";
import type { IntakeRepository, MedicalEnvelope } from "./medical-intake-service";
import type { IdentitySession, ProviderIdentity } from "@/domain/access/identity";
const id = "d3000000-0000-4000-8000-000000000001";
const context = {
  tenantId: id,
  subjectId: id,
  sessionId: id,
  providerSubject: id,
  providerSessionId: id,
  verifiedEmail: "intake@example.invalid",
  purpose: "account" as const,
};
const proof = {
  ...context,
  accessToken: "synthetic",
  refreshToken: "synthetic",
  providerExpiresAt: Date.now() + 60000,
};
export const syntheticIntakePublication = {
  id,
  catalogueHash: "a".repeat(64),
  privacy: "Synthetic medical notice",
  reviewDeclaration: "Synthetic doctor review declaration",
  recipientReference: id,
  urgentGuidance: "Synthetic urgent guidance",
  afterHoursGuidance: "Synthetic after-hours guidance",
  transferNotice: "Synthetic deliberate disclosure notice",
};
function harness() {
  const now = new Date();
  const until = new Date(Date.now() + 60000);
  const session: IdentitySession = {
    id,
    subjectId: id,
    providerSessionId: id,
    sessionClass: "patient",
    assurance: "aal1",
    status: "active",
    issuedAt: now,
    lastSeenAt: now,
    idleExpiresAt: until,
    absoluteExpiresAt: until,
  };
  const identity: ProviderIdentity = {
    provider: "supabase",
    providerSubject: id,
    providerSessionId: id,
    assurance: "aal1",
    authenticatedAt: now,
    expiresAt: until,
    verifiedContact: { kind: "email", value: "intake@example.invalid", verifiedAt: now },
  };
  const authorise = vi.fn(async () => ({ context, session, identity }));
  const read = vi.fn(async () => ({
    record: null,
    publication: syntheticIntakePublication,
    profile: portalAccountFixture.profile,
  }));
  const write = vi.fn<IntakeRepository["write"]>(async () => ({
    intakeId: id,
    caseId: id,
    version: 1,
    snapshotId: id,
    state: "draft",
    safetyHold: true,
    expiresAt: "2030-01-01T00:00:00Z",
  }));
  const restrict = vi.fn();
  const exportView = vi.fn<IntakeRepository["exportView"]>();
  const rightsRecord = vi.fn<IntakeRepository["rightsRecord"]>(async () => null);
  const encrypt = vi.fn<MedicalEnvelope["encrypt"]>(async () => ({ ciphertext: "synthetic" }));
  const decrypt = vi.fn(async () => ({
    answers: completeSyntheticAnswers,
    contact: { email: "snapshot@example.invalid", mobile: "+27820000000", profileVersion: 1 },
  }));
  return {
    authorise,
    read,
    write,
    encrypt,
    decrypt,
    exportView,
    rightsRecord,
    service: new MedicalIntakeService(
      { authorise },
      {
        read,
        write,
        restrict,
        history: vi.fn(async () => []),
        exportView,
        rightsRecord,
        authoriseTransfer: vi.fn(async () => id),
      },
      { encrypt, decrypt, digests: async () => ["a".repeat(64)] },
      "a".repeat(64),
    ),
  };
}
const command = {
  action: "save",
  intakeId: id,
  publicationId: id,
  expectedVersion: 0,
  privacyAcknowledged: true,
  requestKey: id,
  answers: { mental_safety: "yes" },
};
it("binds own authority, snapshot contact and encrypted payload; derives affirmative hold", async () => {
  const h = harness();
  const result = await h.service.execute(proof, command);
  expect(result).toHaveProperty("safetyHold", true);
  expect(h.read).toHaveBeenCalledWith(context, null);
  expect(h.encrypt.mock.calls[0]![0]).toEqual({
    answers: { mental_safety: "yes" },
    contact: {
      email: portalAccountFixture.profile.verifiedEmail,
      mobile: portalAccountFixture.profile.mobileE164,
      profileVersion: 1,
    },
  });
  expect(h.write.mock.calls[0]![1]).toHaveProperty("safetyFlag", true);
  expect(JSON.stringify(result)).not.toContain("mental_safety");
});
it("rejects browser-supplied authority and missing notice acknowledgement", async () => {
  const h = harness();
  for (const c of [
    { ...command, tenantId: id },
    { ...command, privacyAcknowledged: false },
  ])
    await expect(h.service.execute(proof, c)).rejects.toBeInstanceOf(IntakeValidationError);
  expect(h.authorise).not.toHaveBeenCalled();
});
it("does not persist incomplete submission or forged publication", async () => {
  const h = harness();
  await expect(h.service.execute(proof, { ...command, action: "submit" })).rejects.toBeInstanceOf(
    IntakeValidationError,
  );
  await expect(
    h.service.execute(proof, { ...command, publicationId: "d3000000-0000-4000-8000-000000000002" }),
  ).rejects.toBeInstanceOf(IdentityRejectedError);
  expect(h.write).not.toHaveBeenCalled();
});
it("fails closed when publication hash or result fields are wrong", async () => {
  const h = harness();
  h.read.mockResolvedValueOnce({
    record: null,
    publication: { ...syntheticIntakePublication, catalogueHash: "b".repeat(64) },
    profile: portalAccountFixture.profile,
  });
  await expect(h.service.execute(proof, command)).rejects.toThrow();
  expect(h.encrypt).not.toHaveBeenCalled();
});
it("never claims successful persistence after dependency rejection", async () => {
  const h = harness();
  h.write.mockRejectedValueOnce(new Error("private diagnostics"));
  await expect(h.service.execute(proof, command)).rejects.toThrow();
});
it("independently authorises retained-record discovery without ordinary questionnaire reads", async () => {
  const h = harness();
  h.rightsRecord.mockResolvedValue({ intakeId: id, state: "restricted" });
  const result = await h.service.execute(proof, { action: "rights_read" });
  expect(result).toHaveProperty("record.state", "restricted");
  expect(h.read).not.toHaveBeenCalled();
  expect(h.authorise).toHaveBeenCalledTimes(2);
});
it.each(["restricted", "deleted"])(
  "exports own %s record without reviving ordinary access",
  async (state) => {
    const h = harness();
    h.exportView.mockResolvedValue({
      record: {
        id,
        caseId: id,
        version: 1,
        snapshotId: id,
        envelope: state === "deleted" ? null : {},
        state,
        hasSubmitted: true,
        safetyHold: false,
        expiresAt: "2030-01-01T00:00:00Z",
      },
      publication: syntheticIntakePublication,
      profile: portalAccountFixture.profile,
    });
    const result = await h.service.execute(proof, { action: "export", intakeId: id });
    expect(result).toHaveProperty("record.state", state);
    expect(result).not.toHaveProperty("record.envelope");
    if (state === "deleted") {
      expect(result).toHaveProperty("record.answers", null);
      expect(h.decrypt).not.toHaveBeenCalled();
    }
    expect(h.read).not.toHaveBeenCalled();
    expect(h.authorise).toHaveBeenCalledTimes(2);
  },
);
