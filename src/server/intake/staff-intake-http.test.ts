import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), authorise: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/server/identity/workforce-session-cookie", () => ({
  openWorkforceProof: async () => ({ sessionId: "d1350000-0000-4000-8000-000000000001" }),
}));
vi.mock("@/server/identity/workforce-http", () => ({
  workforceServiceFor: () => ({ authorise: mocks.authorise }),
}));
vi.mock("@/server/config/environment.server", () => ({
  initialiseServerEnvironment: () => ({
    environment: {
      supabase: {
        url: "https://synthetic.supabase.co",
        secretKey: "synthetic-only",
      },
    },
  }),
}));
import { createStaffIntakeHttpHandler } from "./staff-intake-http";
import { staffIntakeCommandSchema } from "./staff-intake-http";

const id = "d1350000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authorise.mockResolvedValue({
    context: { tenantId: id, subjectId: id, purpose: "care_delivery" },
    session: { id },
    identity: {
      providerSubject: id,
      providerSessionId: id,
      verifiedContact: { value: "medical@example.invalid" },
    },
  });
});
it("routes preparation separately and strips only the transport action", async () => {
  mocks.rpc.mockResolvedValue({ data: id, error: null });
  const command = {
    action: "prepare_transfer",
    intakeId: id,
    snapshotId: id,
    caseVersion: 1,
    requestKey: id,
  };
  const handler = createStaffIntakeHttpHandler({
    MEDICAL_INTAKE_MODE: "enabled",
    MEDICAL_INTAKE_TENANT_ID: id,
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
  });
  const response = await handler(
    new Request("https://meneerhealth.co.za/staff/intake/command", {
      method: "POST",
      headers: {
        Origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        "Idempotency-Key": id,
      },
      body: JSON.stringify(command),
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "prepare_medical_transfer",
    expect.objectContaining({
      p_command: { intakeId: id, snapshotId: id, caseVersion: 1, requestKey: id },
    }),
  );
  expect(await response.json()).toEqual({ reference: id, outcome: "recorded" });
  expect(staffIntakeCommandSchema.safeParse({ ...command, paid: true }).success).toBe(false);
  expect(staffIntakeCommandSchema.safeParse({ ...command, safetyHold: false }).success).toBe(false);
  expect(staffIntakeCommandSchema.safeParse({ ...command, externalReference: id }).success).toBe(
    false,
  );
});
it.each([
  ["PT409", 409],
  ["40001", 409],
  ["P0001", 412],
  ["42501", 403],
  ["08006", 503],
])("maps medical command error %s to private status %s", async (code, status) => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "must-not-be-disclosed" } });
  const handler = createStaffIntakeHttpHandler({
    MEDICAL_INTAKE_MODE: "enabled",
    MEDICAL_INTAKE_TENANT_ID: id,
    REQUEST_RATE_LIMITER: { limit: async () => ({ success: true }) },
  });
  const response = await handler(
    new Request("https://meneerhealth.co.za/staff/intake/command", {
      method: "POST",
      headers: {
        Origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        "Idempotency-Key": id,
      },
      body: JSON.stringify({
        action: "record_transfer",
        intakeId: id,
        snapshotId: id,
        caseVersion: 1,
        externalReference: id,
        requestKey: id,
      }),
    }),
  );
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.text()).toBe("");
  expect(mocks.rpc).toHaveBeenCalledWith("record_medical_transfer", expect.any(Object));
});
