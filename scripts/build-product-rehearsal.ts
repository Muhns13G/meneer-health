import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SERVER_ONLY_BUNDLE_CANARY } from "../config/environment-canary";
import { serverEnvironmentNames } from "../config/environment-catalogue";

// A rehearsal build must not redirect an owner's later ordinary production deployment.
const pointer = ".wrangler/deploy/config.json";
const previous = existsSync(pointer) ? readFileSync(pointer) : undefined;
const nodeVersion = spawnSync("node", ["--version"], { encoding: "utf8" });
if (nodeVersion.status !== 0 || !nodeVersion.stdout.startsWith("v22."))
  throw Error("PRODUCT_REHEARSAL_REQUIRES_NODE_22");
try {
  const result = spawnSync(
    "node",
    [
      "node_modules/vite/bin/vite.js",
      "build",
      "--config",
      "operations/product-rehearsal/vite.config.ts",
    ],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) throw Error("PRODUCT_REHEARSAL_BUILD_FAILED");
  const config = JSON.parse(readFileSync("dist-product-rehearsal/server/wrangler.json", "utf8"));
  if (
    config.name !== "meneer-product-rehearsal" ||
    config.assets?.run_worker_first !== true ||
    config.assets?.binding !== "REHEARSAL_ASSETS" ||
    config.triggers?.crons?.length !== 0 ||
    config.preview_urls !== false
  )
    throw Error("PRODUCT_REHEARSAL_UPLOAD_BOUNDARY_INVALID");
  function files(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
    );
  }
  const forbidden = [
    SERVER_ONLY_BUNDLE_CANARY,
    ...serverEnvironmentNames,
    "PRODUCT_REHEARSAL_ACCESS_KEY",
  ];
  if (
    files("dist-product-rehearsal/client").some((file) => {
      const content = readFileSync(file);
      return forbidden.some((value) => content.includes(Buffer.from(value)));
    })
  )
    throw Error("PRODUCT_REHEARSAL_CLIENT_SECRET_BOUNDARY_FAILED");
  console.log(
    "Separate rehearsal build and private-client boundary verified; no deployment performed.",
  );
} finally {
  if (previous) writeFileSync(pointer, previous);
  else if (existsSync(pointer)) unlinkSync(pointer);
}
