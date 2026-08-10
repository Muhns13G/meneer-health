import { describe, expect, it } from "vitest";

import { decryptRecoveryArchive, encryptRecoveryArchive } from "./recovery-archive";

const manifest = {
  contract: "recovery.manifest",
  version: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
  environment: "local",
  backupId: "b0000000-0000-4000-8000-000000000013",
  schemaVersion: "20260810222608",
  recordCounts: { subjects: 3, tenants: 2 },
  checksum: "a".repeat(64),
} as const;

describe("encrypted recovery archives", () => {
  it("round-trips an allowlisted manifest with AES-256-GCM", async () => {
    const key = new Uint8Array(32).fill(7);
    const payload = new TextEncoder().encode("synthetic pg dump");
    const archive = await encryptRecoveryArchive(
      manifest,
      payload,
      key,
      "recovery-key-v1",
      new Uint8Array(12).fill(2),
    );

    expect(JSON.stringify(archive)).not.toContain("subjects");
    const restored = await decryptRecoveryArchive(archive, key);
    expect(restored.manifest).toEqual(manifest);
    expect(new TextDecoder().decode(restored.payload)).toBe("synthetic pg dump");
  });

  it("rejects wrong keys and prohibited manifest fields", async () => {
    const key = new Uint8Array(32).fill(7);
    const archive = await encryptRecoveryArchive(
      manifest,
      new Uint8Array([1, 2, 3]),
      key,
      "recovery-key-v1",
    );
    await expect(decryptRecoveryArchive(archive, new Uint8Array(32).fill(8))).rejects.toThrow();
    await expect(
      encryptRecoveryArchive(
        { ...manifest, patientEmail: "never@example.invalid" } as never,
        new Uint8Array([1]),
        key,
        "recovery-key-v1",
      ),
    ).rejects.toThrow();
  });
});
