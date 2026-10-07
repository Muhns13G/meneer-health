import { describe, expect, it } from "vitest";

import { operationsRecordSchema } from "./operations";

const id = "91000000-0000-4000-8000-000000000001";
const other = "91000000-0000-4000-8000-000000000002";
const third = "91000000-0000-4000-8000-000000000003";
const time = "2026-10-03T00:00:00Z";
const scope = { id, tenantId: id, caseId: id, subjectId: other };
const mutable = { version: 1, createdAt: time, updatedAt: time };
const evidence = { actorSubjectId: third, idempotencyKey: id, correlationId: id, recordedAt: time };
const records = [
  {
    kind: "case",
    id,
    tenantId: id,
    subjectId: other,
    state: "onboarding_pending",
    outcome: null,
    ...mutable,
  },
  {
    kind: "assignment",
    ...scope,
    workforceSubjectId: other,
    purpose: "operations",
    role: "operations",
    grantedBySubjectId: third,
    startsAt: time,
    expiresAt: "2026-10-04T00:00:00Z",
    revokedAt: null,
    ...mutable,
  },
  {
    kind: "claim",
    ...scope,
    assignmentId: id,
    workforceSubjectId: other,
    claimedAt: time,
    releasedAt: null,
    ...mutable,
  },
  {
    kind: "authorisation",
    ...scope,
    receiptId: id,
    destinationId: id,
    destinationDigest: "a".repeat(64),
    destinationVersion: 1,
    authorisedAt: time,
    expiresAt: "2026-10-04T00:00:00Z",
  },
  {
    kind: "attempt",
    ...scope,
    authorisationId: id,
    claimId: id,
    workforceSubjectId: other,
    retryOfAttemptId: null,
    state: "prepared",
    requestKey: id,
    requestDigest: "a".repeat(64),
    externalReference: null,
    deliveredAt: null,
    ...mutable,
  },
  {
    kind: "acknowledgement",
    ...scope,
    attemptId: id,
    evidenceReference: id,
    acknowledgedAt: time,
    ...evidence,
  },
  {
    kind: "exception",
    ...scope,
    attemptId: null,
    code: "provider_unavailable",
    priorState: "handed_off",
    resolutionOfExceptionId: null,
    ...evidence,
  },
  { kind: "event", ...scope, caseVersion: 1, event: "created", referenceId: null, ...evidence },
];
const envelope = (record: object) => ({ contract: "operations.record", version: 1, record });

describe("portable staff queue records", () => {
  it("rejects inconsistent record chronology", () => {
    const earlier = "2026-10-02T00:00:00Z";
    for (const index of [0, 1, 2, 4]) {
      expect(
        operationsRecordSchema.safeParse(envelope({ ...records[index], updatedAt: earlier }))
          .success,
      ).toBe(false);
    }
    expect(
      operationsRecordSchema.safeParse(envelope({ ...records[1], revokedAt: earlier })).success,
    ).toBe(false);
    expect(
      operationsRecordSchema.safeParse(
        envelope({ ...records[4], state: "delivered", deliveredAt: earlier }),
      ).success,
    ).toBe(false);
    expect(
      operationsRecordSchema.safeParse(envelope({ ...records[5], recordedAt: earlier })).success,
    ).toBe(false);
  });
  it.each(records)("accepts a strict non-clinical $kind record", (record) => {
    expect(operationsRecordSchema.parse(envelope(record))).toEqual(envelope(record));
  });
  it.each(records)("rejects extra clinical or provider fields in $kind", (record) => {
    for (const key of [
      "protocol",
      "diagnosis",
      "questionnaire",
      "providerUrl",
      "notes",
      "price",
      "password",
    ]) {
      expect(
        operationsRecordSchema.safeParse(envelope({ ...record, [key]: "excluded" })).success,
      ).toBe(false);
    }
  });
  it("rejects wrong contract major and provider objects", () => {
    expect(operationsRecordSchema.safeParse({ ...envelope(records[0]!), version: 2 }).success).toBe(
      false,
    );
    expect(
      operationsRecordSchema.safeParse({ ...envelope(records[0]!), headers: new Headers() })
        .success,
    ).toBe(false);
  });
  it("never treats operational outcome as clinical approval", () => {
    const record = records[0]!;
    for (const override of [
      { state: "clinical.approve" },
      { state: "provider_outcome_recorded", outcome: null },
      { state: "onboarding_pending", outcome: "completed" },
      { state: "provider_outcome_recorded", outcome: "approved" },
    ])
      expect(operationsRecordSchema.safeParse(envelope({ ...record, ...override })).success).toBe(
        false,
      );
    expect(
      operationsRecordSchema.safeParse(
        envelope({ ...record, state: "provider_outcome_recorded", outcome: "completed" }),
      ).success,
    ).toBe(true);
  });
  it("rejects self-grant, wrong purpose and inverted assignment window", () => {
    for (const override of [
      { grantedBySubjectId: other },
      { purpose: "clinical_care" },
      { expiresAt: time },
    ]) {
      expect(
        operationsRecordSchema.safeParse(envelope({ ...records[1], ...override })).success,
      ).toBe(false);
    }
  });
  it("limits authorisation to 30 days and rejects nonopaque destination references", () => {
    for (const override of [
      { expiresAt: "2026-11-03T00:00:00Z" },
      { expiresAt: time },
      { destinationId: "https://provider.invalid/intake" },
      { destinationDigest: "not-a-digest" },
    ]) {
      expect(
        operationsRecordSchema.safeParse(envelope({ ...records[3], ...override })).success,
      ).toBe(false);
    }
  });
  it("rejects false delivery, self-retry and free-text external references", () => {
    for (const override of [
      { state: "delivered" },
      { deliveredAt: time },
      { retryOfAttemptId: id },
      { externalReference: "BPC157" },
      { externalReference: "https://provider.invalid/record" },
    ]) {
      expect(
        operationsRecordSchema.safeParse(envelope({ ...records[4], ...override })).success,
      ).toBe(false);
    }
  });
  it("requires opaque evidence and enumerated exception codes", () => {
    expect(
      operationsRecordSchema.safeParse(
        envelope({ ...records[5], evidenceReference: "provider said yes" }),
      ).success,
    ).toBe(false);
    expect(
      operationsRecordSchema.safeParse(envelope({ ...records[6], code: "dosage review" })).success,
    ).toBe(false);
  });
});
