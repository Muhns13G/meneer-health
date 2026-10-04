import { expect, it } from "vitest";
import {
  destinationApprovalSchema,
  handoffEvidenceCommandSchema,
  portalLinkCommandSchema,
} from "./handoff-boundary";
const id = "b6000000-0000-4000-8000-000000000011";
const command = {
  caseId: id,
  attemptId: id,
  kind: "acknowledged",
  externalReference: id,
  sourceReference: id,
  observedAt: new Date().toISOString(),
  requestKey: id,
};
it("accepts only bounded nonclinical observations with opaque references", () => {
  expect(handoffEvidenceCommandSchema.safeParse(command).success).toBe(true);
  for (const bad of [
    { ...command, kind: "treatment_approved" },
    { ...command, sourceReference: "https://record.example.invalid/private" },
    { ...command, email: "client@example.invalid" },
    { ...command, protocol: "forbidden" },
    { ...command, role: "admin" },
  ])
    expect(handoffEvidenceCommandSchema.safeParse(bad).success).toBe(false);
});
it("never accepts a submitted recipient, payment or URL for portal issuance/admin approval", () => {
  expect(portalLinkCommandSchema.safeParse({ requestKey: id }).success).toBe(true);
  expect(portalLinkCommandSchema.safeParse({ requestKey: id, caseId: id }).success).toBe(false);
  expect(
    destinationApprovalSchema.safeParse({ requestKey: id, approvalReference: id }).success,
  ).toBe(true);
  expect(
    destinationApprovalSchema.safeParse({
      requestKey: id,
      approvalReference: id,
      url: "https://record.example.invalid/private",
    }).success,
  ).toBe(false);
});
