import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("uses the same code-only neutral verification email for signup and returning users", () => {
  const html = readFileSync("supabase/templates/magic-link.html", "utf8");
  const config = readFileSync("supabase/config.toml", "utf8");
  expect(html).toContain("Your Meneer verification code");
  expect(html).toContain("Return to the Meneer page where you requested this code");
  expect(html).toContain("<strong>{{ .Token }}</strong>");
  expect(html).toContain("15 minutes");
  expect(html).not.toMatch(/account\/sign-in|href\s*=|ConfirmationURL|TokenHash|tracking/i);
  for (const kind of ["confirmation", "magic_link"]) {
    expect(config).toContain(
      `[auth.email.template.${kind}]\nsubject = "Your Meneer verification code"\ncontent_path = "./supabase/templates/magic-link.html"`,
    );
  }
});
