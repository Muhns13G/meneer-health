import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const staticHeaders = readFileSync(resolve(process.cwd(), "public/_headers"), "utf8");

describe("Cloudflare static-asset headers", () => {
  it("defines the browser security baseline for every static asset", () => {
    expect(staticHeaders).toContain("/*");
    expect(staticHeaders).toContain("Content-Security-Policy:");
    expect(staticHeaders).toContain("Permissions-Policy:");
    expect(staticHeaders).toContain("Referrer-Policy: strict-origin-when-cross-origin");
    expect(staticHeaders).toContain("Strict-Transport-Security: max-age=31536000");
    expect(staticHeaders).toContain("X-Content-Type-Options: nosniff");
    expect(staticHeaders).toContain("X-Frame-Options: DENY");
  });

  it("separates fingerprinted and mutable asset cache lifetimes", () => {
    expect(staticHeaders).toMatch(
      /\/assets\/\*[\s\S]*Cache-Control: public, max-age=31536000, immutable/,
    );
    expect(staticHeaders).toMatch(
      /\/campaigns\/\*[\s\S]*Cache-Control: public, max-age=3600, must-revalidate/,
    );
  });
});
