import { expect, it, vi } from "vitest";
import { sendMedicalNotification, runMedicalSafetyDispatch } from "./safety-dispatch";
const claim = {
  notificationId: "d5000000-0000-4000-8000-000000000001",
  leaseId: "d5000000-0000-4000-8000-000000000002",
  recipient: "clinical@example.invalid",
};
it.each([
  [201, "accepted"],
  [429, "retryable"],
  [401, "failed"],
  [500, "uncertain"],
  [302, "uncertain"],
] as const)("classifies %s without claiming acknowledgement", async (status, outcome) => {
  const send = vi.fn<typeof fetch>(async () => new Response(null, { status }));
  expect(await sendMedicalNotification("synthetic-key", claim, send)).toBe(outcome);
  const [, options] = send.mock.calls[0]!;
  expect(options!.redirect).toBe("manual");
  const body = JSON.parse(options!.body as string);
  expect(body.textContent).not.toMatch(/patient|intakeId|snapshot|diagnosis|suicide|STI/);
  expect(body.headers.idempotencyKey).toBe(claim.notificationId);
  expect(body).not.toHaveProperty("htmlContent");
});
it("does not send when a responder has no valid contact or retry ambiguous transport", async () => {
  const send = vi.fn<typeof fetch>().mockRejectedValue(new Error("private provider error"));
  expect(await sendMedicalNotification("synthetic", { ...claim, recipient: null }, send)).toBe(
    "uncertain",
  );
  expect(send).not.toHaveBeenCalled();
  expect(await sendMedicalNotification("synthetic", claim, send)).toBe("uncertain");
  expect(send).toHaveBeenCalledTimes(1);
});
it("stays disabled and fails closed on partial configuration", async () => {
  await expect(runMedicalSafetyDispatch({})).resolves.toBeUndefined();
  await expect(
    runMedicalSafetyDispatch({ MEDICAL_INTAKE_MODE: "disabled" }),
  ).resolves.toBeUndefined();
  await expect(runMedicalSafetyDispatch({ MEDICAL_INTAKE_MODE: "enabled" })).rejects.toThrow(
    "MEDICAL_NOTIFICATION_CONFIGURATION_INVALID",
  );
});
