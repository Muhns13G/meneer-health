import { describe, expect, it, vi } from "vitest";
import { maintainMobileOrphanCopies } from "./mobile-orphan-copy-maintenance";

const id = "10000000-0000-4000-8000-000000000001";
function fixture(age = 37) {
  const now = new Date();
  const input = {
    operationId: id,
    state: "copies_pending",
    operationFingerprint: "a".repeat(64),
    manifest: {
      observedAt: now.toISOString(),
      retirements: [
        {
          operationId: id,
          tenantId: id,
          emailInvitationId: id,
          subjectId: id,
          providerSubjectId: id,
          contactDigest: "b".repeat(64),
          providerAbsentAt: new Date(now.getTime() - age * 86400000).toISOString(),
        },
      ],
    },
  };
  const objects = new Map<string, string>();
  const store = {
    put: vi.fn(async (key: string, body: string) => {
      objects.set(key, body);
    }),
    get: vi.fn(async (key: string) => objects.get(key)!),
  };
  const ports = {
    store,
    complete: vi.fn(async () => {}),
    inventory: vi.fn(async () =>
      [...objects.keys()].map((key) => ({ key, lastModified: now.toISOString() })),
    ),
  };
  return { input, now, ports, key: new Uint8Array(32).fill(7), objects };
}
describe("orphan copy maintenance", () => {
  it("writes and independently opens encrypted disposition before recording completion", async () => {
    const f = fixture();
    expect(await maintainMobileOrphanCopies(f.input, f.key, f.ports, f.now)).toMatchObject({
      state: "completed",
    });
    expect(f.ports.complete).toHaveBeenCalledOnce();
    expect([...f.objects.values()][0]).not.toContain("providerSubjectId");
  });
  it("retains pending while the bounded recovery-copy lifetime has not elapsed", async () => {
    const f = fixture(2);
    expect(await maintainMobileOrphanCopies(f.input, f.key, f.ports, f.now)).toMatchObject({
      state: "copies_pending",
    });
    expect(f.ports.complete).not.toHaveBeenCalled();
  });
  it.each(["2020-01-01/old.json.enc", "unknown-object"])(
    "unknown or older object %s vetoes completion",
    async (key) => {
      const f = fixture();
      f.objects.set(key, "opaque");
      expect(await maintainMobileOrphanCopies(f.input, f.key, f.ports, f.now)).toMatchObject({
        state: "copies_pending",
        olderObjectCount: 1,
      });
      expect(f.ports.complete).not.toHaveBeenCalled();
    },
  );
  it("failed storage cannot inspect inventory or complete", async () => {
    const f = fixture();
    f.ports.store.put.mockRejectedValueOnce(new Error("write failed"));
    await expect(maintainMobileOrphanCopies(f.input, f.key, f.ports, f.now)).rejects.toThrow();
    expect(f.ports.inventory).not.toHaveBeenCalled();
    expect(f.ports.complete).not.toHaveBeenCalled();
  });
  it("corrupt download cannot complete", async () => {
    const f = fixture();
    f.ports.store.get.mockResolvedValueOnce("corrupt");
    await expect(maintainMobileOrphanCopies(f.input, f.key, f.ports, f.now)).rejects.toThrow(
      "DURABILITY",
    );
    expect(f.ports.complete).not.toHaveBeenCalled();
  });
  it("missing just-written object rejects incomplete inventory", async () => {
    const f = fixture();
    f.ports.inventory.mockResolvedValueOnce([]);
    await expect(maintainMobileOrphanCopies(f.input, f.key, f.ports, f.now)).rejects.toThrow(
      "INVENTORY",
    );
  });
  it("rejects stale, mismatched and non-pending manifests before any write", async () => {
    const f = fixture();
    for (const input of [
      { ...f.input, state: "uncertain" },
      { ...f.input, operationId: crypto.randomUUID() },
      { ...f.input, manifest: { ...f.input.manifest, observedAt: new Date(0).toISOString() } },
    ]) {
      await expect(maintainMobileOrphanCopies(input, f.key, f.ports, f.now)).rejects.toThrow();
    }
    expect(f.ports.store.put).not.toHaveBeenCalled();
  });
});
