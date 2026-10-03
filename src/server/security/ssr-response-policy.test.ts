import { describe, expect, it, vi } from "vitest";

import { applySsrResponsePolicy } from "./ssr-response-policy";

const request = new Request("https://meneerhealth.co.za/");

describe("SSR response compatibility", () => {
  it("secures a plain response without changing its body", async () => {
    const result = applySsrResponsePolicy(request, new Response("synthetic"), "syntheticnonce");
    expect(result).toBeInstanceOf(Response);
    if (!(result instanceof Response)) throw new Error("Expected plain response");
    expect(result.headers.get("Content-Security-Policy")).toContain("nonce-syntheticnonce");
    expect(await result.text()).toBe("synthetic");
  });

  it("preserves stream cleanup ownership and disposer without invoking it", async () => {
    const dispose = vi.fn(() => undefined);
    const result = applySsrResponsePolicy(
      request,
      { response: new Response("synthetic"), serverSsrCleanup: "stream", dispose },
      "syntheticnonce",
    );
    if (result instanceof Response || result.serverSsrCleanup !== "stream") {
      throw new Error("Expected retained stream ownership");
    }
    expect(result.dispose).toBe(dispose);
    expect(dispose).not.toHaveBeenCalled();
    expect(result.response.headers.get("Content-Security-Policy")).toContain(
      "nonce-syntheticnonce",
    );
    expect(await result.response.text()).toBe("synthetic");
  });

  it("preserves non-stream cleanup and private cache policy", () => {
    const result = applySsrResponsePolicy(
      new Request("https://meneerhealth.co.za/portal"),
      { response: new Response("synthetic"), serverSsrCleanup: "none" },
      "syntheticnonce",
    );
    if (result instanceof Response) throw new Error("Expected SSR wrapper");
    expect(result.serverSsrCleanup).toBe("none");
    expect(result.response.headers.get("Cache-Control")).toContain("no-store");
  });
});
