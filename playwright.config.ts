import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:8085";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    locale: "en-ZA",
    timezoneId: "Africa/Johannesburg",
    contextOptions: {
      reducedMotion: "reduce",
    },
    serviceWorkers: "block",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    // Avoid nested Bun dotenv autoload and Cloudflare loading of ignored hosted files.
    command: "node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 8085",
    env: {
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
    },
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
