import { describe, expect, it } from "vitest";
import { queueCommandSchema, readinessSchema } from "./queue-command";
const command = {
  action: "claim",
  caseId: "a1000000-0000-4000-8000-000000000001",
  expectedVersion: 1,
  requestKey: "a1000000-0000-4000-8000-000000000002",
};
describe("operations command contract", () => {
  it("accepts only bounded administrative actions with opaque replay and version", () => {
    expect(queueCommandSchema.parse(command)).toEqual(command);
    for (const value of [
      { ...command, expectedVersion: 0 },
      { ...command, action: "handed_off" },
      { ...command, paid: true },
      { ...command, role: "admin" },
      { ...command, code: "free text" },
    ])
      expect(queueCommandSchema.safeParse(value).success).toBe(false);
    expect(
      queueCommandSchema.safeParse({
        ...command,
        action: "record_exception",
        code: "abandoned_case",
      }).success,
    ).toBe(true);
  });
  it("rejects invented payment or recipient clearance", () => {
    expect(
      readinessSchema.safeParse({
        profileActive: true,
        accountActive: true,
        emailVerified: true,
        instrumentsCurrent: true,
        authorisationCurrent: true,
        paymentReadiness: "paid",
        recipientReadiness: "verified",
        ready: true,
      }).success,
    ).toBe(false);
  });
});
