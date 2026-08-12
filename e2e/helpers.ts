import { expect, type Page } from "@playwright/test";

export function monitorPage(page: Page) {
  const findings: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      findings.push(`console:${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    findings.push(`pageerror: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    const failure = request.failure();
    const isExpectedMediaPreloadCancellation =
      request.resourceType() === "media" && failure?.errorText === "net::ERR_ABORTED";

    if (isExpectedMediaPreloadCancellation) return;

    if (url.origin === "http://127.0.0.1:8085") {
      findings.push(
        `requestfailed: ${request.method()} ${url.pathname} (${failure?.errorText ?? "unknown"})`,
      );
    }
  });

  return findings;
}

export async function expectConfiguredMediaAvailable(page: Page) {
  const sources = page.locator("video source[src]");

  for (let index = 0; index < (await sources.count()); index += 1) {
    const source = await sources.nth(index).getAttribute("src");
    expect(source).toBeTruthy();

    const response = await page.request.get(new URL(source!, page.url()).toString(), {
      headers: { Range: "bytes=0-1023" },
    });

    expect([200, 206]).toContain(response.status());
    expect(response.headers()["content-type"]).toMatch(/^video\/mp4(?:;|$)/i);
    await response.dispose();
  }
}

export async function isolateExternalFonts(page: Page) {
  await page.route(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//, (route) =>
    route.fulfill({ status: 204, body: "" }),
  );
}

export async function expectHealthyRendering(page: Page, findings: string[]) {
  await page.waitForLoadState("networkidle");

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  const incompleteImages = await page
    .locator("img")
    .evaluateAll((images) =>
      (images as HTMLImageElement[])
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute("src")),
    );

  expect(hasHorizontalOverflow).toBe(false);
  expect(incompleteImages).toEqual([]);
  expect(findings).toEqual([]);
}
