import { expect, it, vi } from "vitest";
import { PatientRightsService } from "./patient-rights-service";
import { IdentityRejectedError, IdentityUnavailableError } from "./managed-identity-provider";
import { patientRightsCommandSchema, rightsRequestKinds } from "@/domain/identity/patient-rights";
const id = "98000000-0000-4000-8000-000000000001";
const context = {
  tenantId: id,
  subjectId: id,
  sessionId: id,
  providerSubject: id,
  providerSessionId: id,
  verifiedEmail: "rights@example.invalid",
  purpose: "account" as const,
};
const proof = {
  tenantId: id,
  subjectId: id,
  sessionId: id,
  providerSessionId: id,
  accessToken: "synthetic",
  refreshToken: "synthetic",
  providerExpiresAt: Date.now() + 60000,
};
const command = { action: "request", kind: "export", expectedVersion: 1, requestKey: id };
function harness() {
  const authorise = vi.fn(
    async () =>
      ({ context }) as Awaited<
        ReturnType<import("./patient-portal-service").PatientPortalService["authorise"]>
      >,
  );
  const execute = vi.fn(async () => ({
    reference: id,
    outcome: "received" as const,
    profileVersion: 1,
  }));
  return { authorise, execute, service: new PatientRightsService({ authorise }, { execute }) };
}
it("uses fresh server authority and returns only the durable receipt", async () => {
  const h = harness();
  expect(await h.service.execute(proof, command)).toEqual({
    reference: id,
    outcome: "received",
    profileVersion: 1,
  });
  expect(h.execute).toHaveBeenCalledWith(context, command);
});
it.each(rightsRequestKinds)("accepts only a request category: %s", (kind) => {
  expect(patientRightsCommandSchema.safeParse({ ...command, kind }).success).toBe(true);
});
it.each([
  { ...command, tenantId: id },
  { ...command, notes: "health details" },
  { ...command, expectedVersion: 0 },
  { ...command, kind: "export_all" },
  { ...command, requestKey: "forged" },
])("rejects authority and unapproved fields before any dependency", async (input) => {
  const h = harness();
  await expect(h.service.execute(proof, input)).rejects.toBeInstanceOf(IdentityRejectedError);
  expect(h.authorise).not.toHaveBeenCalled();
  expect(h.execute).not.toHaveBeenCalled();
});
it("rejects contact correction, blank/control names and supplied server state", () => {
  const correction = {
    action: "correct",
    requestKey: id,
    expectedVersion: 1,
    givenName: "Synthetic",
    familyName: "Client",
    contactPreference: "email",
  };
  expect(patientRightsCommandSchema.safeParse(correction).success).toBe(true);
  for (const change of [
    { mobileE164: "+27820000000" },
    { email: "rights@example.invalid" },
    { givenName: " " },
    { familyName: "a\nb" },
    { status: "active" },
  ])
    expect(patientRightsCommandSchema.safeParse({ ...correction, ...change }).success).toBe(false);
});
it("does not write or report success when authority or durable storage fails", async () => {
  const h = harness();
  h.authorise.mockRejectedValueOnce(new IdentityRejectedError());
  await expect(h.service.execute(proof, command)).rejects.toBeInstanceOf(IdentityRejectedError);
  expect(h.execute).not.toHaveBeenCalled();
  h.execute.mockRejectedValueOnce(new IdentityUnavailableError());
  await expect(h.service.execute(proof, command)).rejects.toBeInstanceOf(IdentityUnavailableError);
});
it("rejects a mismatched success outcome", async () => {
  const h = harness();
  await expect(
    h.service.execute(proof, {
      action: "correct",
      requestKey: id,
      expectedVersion: 1,
      givenName: "Synthetic",
      familyName: "Client",
      contactPreference: "email",
    }),
  ).rejects.toBeInstanceOf(IdentityUnavailableError);
});
