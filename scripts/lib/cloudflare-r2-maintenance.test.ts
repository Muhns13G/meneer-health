import { describe, expect, it, vi } from "vitest";
import { CloudflareR2MaintenanceStore } from "./cloudflare-r2-maintenance";

const account = "a".repeat(32),
  token = "t".repeat(25);
const page = (result: unknown[], is_truncated: boolean, cursor?: string) =>
  Response.json({
    success: true,
    result,
    result_info: { is_truncated, ...(cursor ? { cursor } : {}) },
  });
describe("EU R2 maintenance adapter", () => {
  it("proves exhaustion when the final page omits pagination metadata", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          result: [{ key: "one", last_modified: "2026-10-01T00:00:00Z" }],
        }),
      )
      .mockResolvedValueOnce(Response.json({ success: true, result: [] }));
    expect(
      await new CloudflareR2MaintenanceStore(account, "test-recovery", token, request).inventory(),
    ).toHaveLength(1);
    expect(request.mock.calls[1]![0]).toContain("start_after=one");
  });
  it("rejects a provider ignoring the advancing exhaustion request", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () =>
      Response.json({
        success: true,
        result: [{ key: "one", last_modified: "2026-10-01T00:00:00Z" }],
      }),
    );
    await expect(
      new CloudflareR2MaintenanceStore(account, "test-recovery", token, request).inventory(),
    ).rejects.toThrow("INCOMPLETE");
  });
  it("exhausts provider cursors and pins EU jurisdiction", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        page([{ key: "one", last_modified: "2026-10-01T00:00:00Z" }], true, "opaque"),
      )
      .mockResolvedValueOnce(page([{ key: "two", last_modified: "2026-10-02T00:00:00Z" }], false));
    const store = new CloudflareR2MaintenanceStore(account, "test-recovery", token, request);
    expect(await store.inventory()).toHaveLength(2);
    expect(request.mock.calls[1]![0]).toContain("cursor=opaque");
    expect(request.mock.calls[0]![1]!.headers).toMatchObject({ "cf-r2-jurisdiction": "eu" });
  });
  it.each([undefined, "same"])("rejects missing or looping continuation %s", async (cursor) => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => page([], true, cursor));
    const store = new CloudflareR2MaintenanceStore(account, "test-recovery", token, request);
    await expect(store.inventory()).rejects.toThrow("INCOMPLETE");
  });
  it("rejects duplicate objects across pages", async () => {
    const object = { key: "one", last_modified: "2026-10-01T00:00:00Z" };
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([object], true, "next"))
      .mockResolvedValueOnce(page([object], false));
    await expect(
      new CloudflareR2MaintenanceStore(account, "test-recovery", token, request).inventory(),
    ).rejects.toThrow("DUPLICATE");
  });
  it("refuses ungoverned mutation keys without a network call", async () => {
    const request = vi.fn<typeof fetch>();
    const store = new CloudflareR2MaintenanceStore(account, "test-recovery", token, request);
    await expect(store.delete("existing-object")).rejects.toThrow("OBJECT_REJECTED");
    expect(request).not.toHaveBeenCalled();
  });
  it("redacts provider response bodies on failure", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("private provider detail", { status: 403 }));
    await expect(
      new CloudflareR2MaintenanceStore(account, "test-recovery", token, request).inventory(),
    ).rejects.toThrow("R2_MAINTENANCE_HTTP_403");
  });
});
