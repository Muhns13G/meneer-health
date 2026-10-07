import { describe, expect, it, vi } from "vitest";
import worker, { dispatchRecovery } from "../../operations/recovery-dispatcher/worker";

describe("scoped recovery dispatcher", () => {
  it("pins repository, workflow, production source and main ref", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await dispatchRecovery({ GITHUB_RECOVERY_DISPATCH_TOKEN: "synthetic-token" }, fetcher);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/Muhns13G/meneer-health/actions/workflows/recovery-export.yml/dispatches",
    );
    expect(JSON.parse(options.body)).toEqual({ ref: "main", inputs: { source: "production" } });
    expect(options.redirect).toBe("error");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects absent credentials before network access", async () => {
    const fetcher = vi.fn();
    await expect(dispatchRecovery({ GITHUB_RECOVERY_DISPATCH_TOKEN: "" }, fetcher)).rejects.toThrow(
      "RECOVERY_DISPATCH_CONFIGURATION_INVALID",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([200, 401, 403, 429, 500])("rejects non-dispatch response %s", async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(
      dispatchRecovery({ GITHUB_RECOVERY_DISPATCH_TOKEN: "synthetic-token" }, fetcher),
    ).rejects.toThrow("RECOVERY_DISPATCH_REJECTED");
  });
  it("exposes no HTTP trigger", () => {
    expect(worker.fetch().status).toBe(404);
  });
});
