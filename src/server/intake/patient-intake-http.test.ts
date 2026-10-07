import { expect, it, vi } from "vitest";
import { createPatientIntakeHttpHandler } from "./patient-intake-http";
import {
  IntakeConflictError,
  type MedicalIntakeService,
} from "@/application/intake/medical-intake-service";
import { sealPatientSession, patientSessionCookieName } from "../identity/patient-session-cookie";
const id = "d3000000-0000-4000-8000-000000000001";
async function harness() {
  const now = new Date();
  const until = new Date(Date.now() + 60000);
  const key = new Uint8Array(32).fill(9);
  const token = await sealPatientSession(
    {
      tenantId: id,
      session: {
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
      },
      providerSession: { accessToken: "synthetic", refreshToken: "synthetic", expiresAt: until },
      providerIdentity: {
        provider: "supabase",
        providerSubject: id,
        providerSessionId: id,
        assurance: "aal1",
        authenticatedAt: now,
        expiresAt: until,
        verifiedContact: { kind: "email", value: "intake@example.invalid", verifiedAt: now },
      },
    },
    key,
  );
  const execute = vi.fn<MedicalIntakeService["execute"]>(async () => ({
    intakeId: id,
    caseId: id,
    snapshotId: id,
    safetyHold: false,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    version: 1,
    state: "draft",
  }));
  const limit = vi.fn(async () => ({ success: true }));
  const bindings = {
    MEDICAL_INTAKE_MODE: "enabled",
    MEDICAL_INTAKE_TENANT_ID: id,
    IDENTITY_SESSION_KEY_BASE64: btoa(String.fromCharCode(...key)),
    REQUEST_RATE_LIMITER: { limit },
  };
  const request = (
    headers: Record<string, string> = {},
    body = JSON.stringify({ action: "save", requestKey: id }),
    path = "/portal/intake/command",
    method = "POST",
  ) =>
    new Request("https://meneerhealth.co.za" + path, {
      method,
      headers: {
        Cookie: `${patientSessionCookieName}=${token}`,
        Origin: "https://meneerhealth.co.za",
        "Content-Type": "application/json",
        "Idempotency-Key": id,
        ...headers,
      },
      ...(method === "POST" ? { body } : {}),
    });
  return {
    handler: createPatientIntakeHttpHandler(bindings, { execute }),
    bindings,
    execute,
    limit,
    request,
  };
}
it("is disabled without explicit release mode", async () => {
  const h = await harness();
  expect(
    (
      await createPatientIntakeHttpHandler(
        { ...h.bindings, MEDICAL_INTAKE_MODE: "disabled" },
        { execute: h.execute },
      )(h.request())
    ).status,
  ).toBe(412);
  expect(h.execute).not.toHaveBeenCalled();
});
it("returns a private 409 for a permanent intake conflict without disclosing details", async () => {
  const h = await harness();
  h.execute.mockRejectedValueOnce(new IntakeConflictError());
  const response = await h.handler(h.request());
  expect(response.status).toBe(409);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.text()).toBe("");
  expect(h.execute).toHaveBeenCalledTimes(1);
});
it("does not enable another tenant during a bounded rehearsal", async () => {
  const h = await harness();
  const handler = createPatientIntakeHttpHandler(
    { ...h.bindings, MEDICAL_INTAKE_TENANT_ID: crypto.randomUUID() },
    { execute: h.execute },
  );
  expect((await handler(h.request())).status).toBe(403);
  expect(h.execute).not.toHaveBeenCalled();
});
it("rejects missing forged cookie, foreign origin, unexpected query and mismatched replay key", async () => {
  const h = await harness();
  expect((await h.handler(h.request({ Cookie: "" }))).status).toBe(401);
  expect(
    (await h.handler(h.request({ Cookie: patientSessionCookieName + "=forged" }))).status,
  ).toBe(401);
  expect((await h.handler(h.request({ Origin: "https://example.invalid" }))).status).toBe(403);
  expect(
    (await h.handler(h.request({}, "{}", "/portal/intake/command?intakeId=forged"))).status,
  ).toBe(404);
  expect(
    (
      await h.handler(
        h.request({}, JSON.stringify({ action: "save", requestKey: crypto.randomUUID() })),
      )
    ).status,
  ).toBe(422);
  expect(h.execute).not.toHaveBeenCalled();
});
it("bounds body, methods, malformed JSON and rate without persistence", async () => {
  const h = await harness();
  expect((await h.handler(h.request({}, "x".repeat(65537)))).status).toBe(413);
  expect((await h.handler(h.request({}, "{bad"))).status).toBe(400);
  expect((await h.handler(h.request({}, "", "/portal/intake/command", "GET"))).status).toBe(404);
  h.limit.mockResolvedValueOnce({ success: false });
  expect((await h.handler(h.request())).status).toBe(429);
  expect(h.execute).not.toHaveBeenCalled();
});
it("returns private non-cacheable result and redacts server failures", async () => {
  const h = await harness();
  const result = await h.handler(h.request());
  expect(result.status).toBe(200);
  expect(result.headers.get("Cache-Control")).toContain("no-store");
  expect(result.headers.get("X-Robots-Tag")).toContain("noindex");
  h.execute.mockRejectedValueOnce(new Error("private answer"));
  const fail = await h.handler(h.request());
  expect(fail.status).toBe(503);
  expect(await fail.text()).not.toContain("private answer");
});
