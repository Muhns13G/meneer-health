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

  it.each([401, 403, 404, 422, 429, 500])(
    "logs only safe HTTP diagnostics for %s",
    async (status) => {
      const sensitive = "synthetic-secret-response.invalid";
      const fetcher = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response(sensitive, { status }));
      const logger = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        await expect(
          worker.scheduled(null, { GITHUB_RECOVERY_DISPATCH_TOKEN: sensitive }),
        ).rejects.toThrow("RECOVERY_DISPATCH_FAILED");
        expect(logger).toHaveBeenCalledTimes(1);
        expect(JSON.parse(logger.mock.calls[0][0])).toEqual({
          job: "recovery-dispatch",
          accepted: false,
          backupVerified: false,
          failureCategory: "http-rejected",
          httpStatus: status,
        });
        expect(logger.mock.calls[0][0]).not.toContain(sensitive);
        expect(fetcher).toHaveBeenCalledTimes(1);
      } finally {
        vi.restoreAllMocks();
      }
    },
  );

  it.each(["TimeoutError", "TypeError"])("redacts %s provider exceptions", async (name) => {
    const error = new Error("synthetic-credential.invalid in request headers");
    error.name = name;
    vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(
        worker.scheduled(null, { GITHUB_RECOVERY_DISPATCH_TOKEN: "synthetic-token" }),
      ).rejects.toThrow("RECOVERY_DISPATCH_FAILED");
      expect(JSON.parse(logger.mock.calls[0][0])).toEqual({
        job: "recovery-dispatch",
        accepted: false,
        backupVerified: false,
        failureCategory: name === "TimeoutError" ? "timeout" : "network",
      });
      expect(logger.mock.calls[0][0]).not.toContain(error.message);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("logs configuration failure without contacting GitHub", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await expect(worker.scheduled(null, { GITHUB_RECOVERY_DISPATCH_TOKEN: " " })).rejects.toThrow(
        "RECOVERY_DISPATCH_FAILED",
      );
      expect(JSON.parse(logger.mock.calls[0][0]).failureCategory).toBe("configuration");
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
