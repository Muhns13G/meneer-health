import { expect, test } from "@playwright/test";

import { isolateExternalFonts } from "./helpers";

test("support, privacy, and emergency routing preserve the approved public boundary", async ({
  page,
}) => {
  await isolateExternalFonts(page);
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("link", { name: "support@meneerhealth.co.za" })).toHaveAttribute(
    "href",
    "mailto:support@meneerhealth.co.za",
  );
  await expect(
    page.getByText(/OCTOTHORP ZA owns this channel, and it is monitored daily/),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "112 from a mobile" })).toHaveAttribute(
    "href",
    "tel:112",
  );
  await expect(page.getByRole("link", { name: "10177 for an ambulance" })).toHaveAttribute(
    "href",
    "tel:10177",
  );
  for (const heading of ["Privacy and data requests", "Complaints", "Clinical questions"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.locator("form, input, textarea")).toHaveCount(0);

  await page.goto("/privacy");
  await expect(page.getByText(/only to request secure follow-up/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Information Regulator’s POPIA channels" }),
  ).toHaveAttribute("href", "https://inforegulator.org.za/popia/");

  await page.goto("/terms");
  await expect(page.getByRole("link", { name: "112 from a mobile" })).toHaveAttribute(
    "href",
    "tel:112",
  );
  await expect(page.getByRole("link", { name: "10177 for an ambulance" })).toHaveAttribute(
    "href",
    "tel:10177",
  );
});
