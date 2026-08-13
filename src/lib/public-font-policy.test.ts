import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  GOOGLE_FONTS_FILE_ORIGIN,
  GOOGLE_FONTS_STYLESHEET_ORIGIN,
  GOOGLE_FONTS_STYLESHEET_URL,
  PUBLIC_FONT_POLICY,
} from "./public-font-policy";

const repositoryRoot = process.cwd();

describe("public font policy", () => {
  it("retains only the owner-approved v1 families, weights, and swap strategy", () => {
    expect(PUBLIC_FONT_POLICY).toMatchObject({
      delivery: "approved-external-v1",
      provider: "Google Fonts CSS API",
      display: "swap",
      reviewTrigger: "before-public-launch-or-nextjs-migration",
    });
    expect(PUBLIC_FONT_POLICY.families).toEqual([
      { family: "DM Sans", weights: [300, 400, 500, 600, 700] },
      { family: "Playfair Display", weights: [400, 500, 600, 700] },
    ]);
    expect(GOOGLE_FONTS_STYLESHEET_URL).toContain("family=DM+Sans:wght@300;400;500;600;700");
    expect(GOOGLE_FONTS_STYLESHEET_URL).toContain(
      "family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400",
    );
    expect(GOOGLE_FONTS_STYLESHEET_URL).toContain("display=swap");
  });

  it("keeps the declared CSS fallback stacks aligned with the approved policy", () => {
    const styles = readFileSync(join(repositoryRoot, "src/styles.css"), "utf8");

    expect(styles).toContain(`--font-sans: ${PUBLIC_FONT_POLICY.fallbacks.sans};`);
    expect(styles).toContain(`--font-serif: ${PUBLIC_FONT_POLICY.fallbacks.serif};`);
  });

  it("keeps the static asset CSP aligned with the approved provider origins", () => {
    const headers = readFileSync(join(repositoryRoot, "public/_headers"), "utf8");

    expect(headers).toContain(`style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_STYLESHEET_ORIGIN}`);
    expect(headers).toContain(`font-src 'self' ${GOOGLE_FONTS_FILE_ORIGIN}`);
    expect(headers).not.toMatch(/fonts\.(?!googleapis\.com|gstatic\.com)[^\s;]+/);
  });
});
