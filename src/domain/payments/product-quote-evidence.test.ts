import { expect, it } from "vitest";
import { productEvidenceCommandSchema, productEvidenceViewSchema } from "./product-quote-evidence";
const id = "15500000-0000-4000-8000-000000000001";
const record = {
  action: "record",
  target: { intakeId: id },
  draftId: id,
  kind: "clinical",
  evidenceReference: id,
  expiresAt: "2030-01-01T00:00:00Z",
  requestKey: id,
};
it("accepts exact opaque evidence and revocation commands", () => {
  expect(productEvidenceCommandSchema.parse(record)).toEqual(record);
  expect(
    productEvidenceCommandSchema.safeParse({
      action: "revoke",
      target: { caseId: id },
      draftId: id,
      evidenceId: id,
      evidenceReference: id,
      requestKey: id,
    }).success,
  ).toBe(true);
});
it.each([
  "subjectId",
  "tenantId",
  "approved",
  "paid",
  "products",
  "providerPayload",
  "medicalAnswers",
])("rejects caller %s", (key) => {
  expect(productEvidenceCommandSchema.safeParse({ ...record, [key]: true }).success).toBe(false);
});
it.each([{ caseId: id, intakeId: id }, {}, { intakeId: "invalid" }])(
  "rejects ambiguous/invalid target %j",
  (target) => {
    expect(productEvidenceCommandSchema.safeParse({ ...record, target }).success).toBe(false);
  },
);
it("rejects provider documents and medical details in projections", () => {
  expect(productEvidenceViewSchema.safeParse({ providerPayload: "private" }).success).toBe(false);
});
