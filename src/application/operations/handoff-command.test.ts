import { describe, expect, it } from "vitest";
import { handoffCommandSchema, handoffResultSchema } from "./handoff-command";
const id = "a1000000-0000-4000-8000-000000000001";
const scope = { caseId: id, expectedVersion: 1, requestKey: id };
describe("minimum hand-off commands", () => {
  it.each([
    { action: "prepare", authorisationId: id },
    { action: "retry", attemptId: id, authorisationId: id },
    { action: "begin_delivery", attemptId: id },
    { action: "mark_uncertain", attemptId: id },
    ...["reconcile_delivery", "acknowledge", "review", "outcome"].map((action) => ({
      action,
      attemptId: id,
      evidenceId: id,
    })),
    { action: "cancel_handoff", attemptId: id, evidenceId: null },
    { action: "resolve_exception", exceptionId: id },
  ])("accepts the bounded $action shape", (command) => {
    expect(handoffCommandSchema.safeParse({ ...scope, ...command }).success).toBe(true);
    expect(handoffCommandSchema.safeParse({ ...scope, ...command, delivered: true }).success).toBe(
      false,
    );
  });
  it.each(["providerUrl", "health", "paid", "role", "tenantId", "notes", "state"])(
    "rejects %s",
    (field) => {
      expect(
        handoffCommandSchema.safeParse({
          ...scope,
          action: "prepare",
          authorisationId: id,
          [field]: "x",
        }).success,
      ).toBe(false);
    },
  );
  it("requires opaque evidence and rejects URL/clinical results", () => {
    expect(
      handoffCommandSchema.safeParse({
        ...scope,
        action: "acknowledge",
        attemptId: id,
        evidenceId: "https://provider.invalid/intake",
      }).success,
    ).toBe(false);
    expect(
      handoffResultSchema.safeParse({
        caseId: id,
        version: 1,
        state: "handed_off",
        attemptId: id,
        attemptState: "delivered",
        dosage: "x",
      }).success,
    ).toBe(false);
  });
});
