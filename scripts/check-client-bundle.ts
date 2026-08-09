import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { SERVER_ONLY_BUNDLE_CANARY } from "../config/environment-canary";
import { serverEnvironmentNames } from "../config/environment-catalogue";

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
    }),
  );

  return files.flat();
}

async function containsValue(directory: string, value: string): Promise<boolean> {
  const files = await collectFiles(directory);

  for (const file of files) {
    const content = await readFile(file);
    if (content.includes(Buffer.from(value))) {
      return true;
    }
  }

  return false;
}

const clientDirectory = path.resolve("dist/client");
const serverDirectory = path.resolve("dist/server");

if (!(await containsValue(serverDirectory, SERVER_ONLY_BUNDLE_CANARY))) {
  throw new Error("Server configuration canary is missing from server output.");
}

const forbiddenClientValues = [SERVER_ONLY_BUNDLE_CANARY, ...serverEnvironmentNames];

for (const value of forbiddenClientValues) {
  if (await containsValue(clientDirectory, value)) {
    throw new Error("Server-only configuration material was found in client output.");
  }
}

console.log("Client bundle configuration canary check passed.");
