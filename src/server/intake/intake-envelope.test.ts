import { expect, it } from "vitest";
import { encryptIntake, decryptIntake, readIntakeKeyRing } from "./intake-envelope";
import { intakeScopeSchema } from "../../../contracts/medical-intake";
const ring = readIntakeKeyRing(
  JSON.stringify({ current: "synthetic", keys: { synthetic: btoa("s".repeat(32)) } }),
);
const scope = intakeScopeSchema.parse({
  tenantId: "10000000-0000-4000-8000-000000000001",
  subjectId: "20000000-0000-4000-8000-000000000001",
  intakeId: "d2000000-0000-4000-8000-000000000001",
  snapshotId: "d2000000-0000-4000-8000-000000000002",
  collectionVersion: "1.1.0",
  controlVersion: "1.0.0",
});
it("encrypts without plaintext and uses a fresh nonce", async () => {
  const a = await encryptIntake({ synthetic: "never-log" }, scope, ring);
  const b = await encryptIntake({ synthetic: "never-log" }, scope, ring);
  expect(JSON.stringify(a)).not.toContain("never-log");
  expect(a.nonce).not.toBe(b.nonce);
  expect(await decryptIntake(a, scope, ring)).toEqual({ synthetic: "never-log" });
});
it("rejects tampering wrong subject snapshot and key", async () => {
  const a = await encryptIntake({}, scope, ring);
  await expect(
    decryptIntake(
      { ...a, ciphertext: (a.ciphertext[0] === "A" ? "B" : "A") + a.ciphertext.slice(1) },
      scope,
      ring,
    ),
  ).rejects.toThrow("INTAKE_ENVELOPE_REJECTED");
  await expect(decryptIntake(a, { ...scope, subjectId: scope.intakeId }, ring)).rejects.toThrow();
  await expect(decryptIntake(a, { ...scope, snapshotId: scope.intakeId }, ring)).rejects.toThrow();
  await expect(decryptIntake(a, scope, { current: "missing", keys: {} })).rejects.toThrow();
});
it("rejects malformed or overlong keys and payload", async () => {
  expect(() => readIntakeKeyRing('{"current":"synthetic","keys":{"synthetic":"bad"}}')).toThrow(
    "INTAKE_KEY_UNAVAILABLE",
  );
  await expect(encryptIntake("x".repeat(65537), scope, ring)).rejects.toThrow(
    "INTAKE_PAYLOAD_TOO_LARGE",
  );
});
