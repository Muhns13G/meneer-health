// No dotenv, hosted bindings, provider request, mail, account or database access.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { publicAuthSettingsRequestOptions } from "../src/adapters/identity/supabase/public-auth-settings-request.ts";

// Use the runtime shipped by the already locked Wrangler toolchain, not a new dependency.
const toolchain = createRequire(import.meta.resolve("wrangler"));
const { Miniflare, convertV4MiniflareOptions } = toolchain("miniflare");
const parsed = ts.parseConfigFileTextToJson(
  "wrangler.jsonc",
  readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
);
assert.ok(!parsed.error, "Worker runtime configuration must parse as JSONC");
const configuration = parsed.config;
const script = `
${publicAuthSettingsRequestOptions.toString()}
export default {
  fetch(request) {
    const options = publicAuthSettingsRequestOptions("synthetic-only-key");
    if (new URL(request.url).pathname === "/legacy") options.redirect = "error";
    try {
      // Construction only: global fetch is never called and no provider can be contacted.
      const settings = new Request("https://settings.example.invalid/auth/v1/settings", options);
      return Response.json({ accepted: true, redirect: settings.redirect, cache: settings.cache,
        boundedSignal: options.signal instanceof AbortSignal });
    } catch (error) {
      return Response.json({ accepted: false, rejectedRedirectOption: error instanceof TypeError
        && error.message.includes("Invalid redirect value") });
    }
  }
};`;
const runtime = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    compatibilityDate: configuration.compatibility_date,
    compatibilityFlags: configuration.compatibility_flags,
    cf: false,
    telemetry: { enabled: false },
    logRequests: false,
    script,
  }),
);
try {
  const legacy = await (await runtime.dispatchFetch("http://localhost/legacy")).json();
  assert.deepEqual(legacy, { accepted: false, rejectedRedirectOption: true });
  const fixed = await (await runtime.dispatchFetch("http://localhost/fixed")).json();
  assert.deepEqual(fixed, {
    accepted: true,
    redirect: "manual",
    cache: "no-store",
    boundedSignal: true,
  });
  console.log(
    JSON.stringify({
      exercise: "public-registration-worker-runtime",
      probes: 2,
      legacyFailureReproduced: true,
      actualTransportOptionsAccepted: true,
      providerRequests: 0,
      sends: 0,
      accounts: 0,
    }),
  );
} finally {
  await runtime.dispose();
}
