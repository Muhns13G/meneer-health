import { describe, expect, it, vi } from "vitest";

import { runRecoveryExportJob } from "./recovery-job";

const input = {
  manifest: {
    contract: "recovery.manifest",
    version: 1,
    createdAt: "2030-01-01T00:00:00.000Z",
    environment: "local",
    backupId: "b0000000-0000-4000-8000-000000000013",
    schemaVersion: "20260810222608",
    recordCounts: { subjects: 3 },
    checksum: "a".repeat(64),
  },
  payload: new TextEncoder().encode("synthetic pg dump"),
  keyBytes: new Uint8Array(32).fill(9),
  keyReference: "recovery-key-v1",
} as const;

describe("recovery export job", () => {
  it("stores the encrypted artifact before sending a payload-free heartbeat", async () => {
    const calls: string[] = [];
    const store = {
      put: vi.fn(async (_objectKey: string, _body: string) => void calls.push("stored")),
    };
    const heartbeat = { success: vi.fn(async () => void calls.push("heartbeat")) };

    await expect(runRecoveryExportJob(input, store, heartbeat)).resolves.toEqual({
      backupId: input.manifest.backupId,
      heartbeatDelivered: true,
    });
    expect(calls).toEqual(["stored", "heartbeat"]);
    expect(store.put.mock.calls[0]?.[1]).not.toContain("subjects");
    expect(heartbeat.success).toHaveBeenCalledWith();
  });

  it("never reports success when durable storage fails", async () => {
    const heartbeat = { success: vi.fn() };
    await expect(
      runRecoveryExportJob(
        input,
        { put: vi.fn().mockRejectedValue(new Error("unavailable")) },
        heartbeat,
      ),
    ).rejects.toThrow("unavailable");
    expect(heartbeat.success).not.toHaveBeenCalled();
  });

  it("verifies a stored archive before reporting success", async () => {
    const calls: string[] = [];
    const verifyStoredArchive = vi.fn(async () => void calls.push("verified"));
    const heartbeat = { success: vi.fn(async () => void calls.push("heartbeat")) };

    await runRecoveryExportJob(
      input,
      { put: vi.fn(async () => void calls.push("stored")) },
      heartbeat,
      verifyStoredArchive,
    );

    expect(calls).toEqual(["stored", "verified", "heartbeat"]);
    expect(verifyStoredArchive).toHaveBeenCalledWith({
      objectKey: "2030-01-01/b0000000-0000-4000-8000-000000000013.json.enc",
      serializedArchive: expect.not.stringContaining("synthetic pg dump"),
    });
  });

  it("never reports success when stored-archive verification fails", async () => {
    const heartbeat = { success: vi.fn() };
    await expect(
      runRecoveryExportJob(
        input,
        { put: vi.fn() },
        heartbeat,
        vi.fn().mockRejectedValue(new Error("restore mismatch")),
      ),
    ).rejects.toThrow("restore mismatch");
    expect(heartbeat.success).not.toHaveBeenCalled();
  });
});
