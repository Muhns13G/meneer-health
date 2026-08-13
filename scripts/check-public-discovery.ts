import "@tanstack/react-start/server-only";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderRobotsTxt, renderSitemapXml } from "@/lib/public-route-policy";

const outputs = [
  { path: "public/robots.txt", expected: renderRobotsTxt() },
  { path: "public/sitemap.xml", expected: renderSitemapXml() },
] as const;

for (const output of outputs) {
  const actual = readFileSync(resolve(process.cwd(), output.path), "utf8");
  if (actual !== output.expected) {
    throw new Error(`PUBLIC_DISCOVERY_OUTPUT_STALE:${output.path}`);
  }
}

console.log("Public discovery outputs match the approved route policy.");
