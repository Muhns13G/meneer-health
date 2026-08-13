import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const failures: string[] = [];

const retiredPaths = [
  ".lovable/mcp/manifest.json",
  "src/lib/mcp/index.ts",
  "src/lib/mcp/tools/about-meneer.ts",
  "src/lib/mcp/tools/how-it-works.ts",
  "src/lib/mcp/tools/list-treatments.ts",
  "src/routes/[.mcp]/invoke-tool/$tool.ts",
  "src/routes/[.mcp]/list-tools.ts",
  "src/routes/[.well-known]/oauth-protected-resource.ts",
  "src/routes/mcp.ts",
] as const;

const forbiddenRuntimeMarkers = [
  "@lovable.dev/mcp-js",
  "@modelcontextprotocol/sdk",
  "createTanStackMcpHandler",
  "defineMcp(",
  "mcpPlugin(",
  "about_meneer",
  "list_treatments",
  "how_it_works",
] as const;

function collectFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    return entry.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}

function checkFiles(files: readonly string[], label: string): void {
  for (const file of files) {
    const content = readFileSync(file);
    for (const marker of forbiddenRuntimeMarkers) {
      if (content.includes(Buffer.from(marker))) {
        failures.push(`${label} contains retired MCP marker ${marker}: ${file}`);
      }
    }
  }
}

for (const retiredPath of retiredPaths) {
  if (existsSync(resolve(repositoryRoot, retiredPath))) {
    failures.push(`Retired MCP path exists: ${retiredPath}`);
  }
}

const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  overrides?: Record<string, unknown>;
};
const declaredPackageNames = new Set(
  [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
    packageJson.overrides,
  ].flatMap((section) => Object.keys(section ?? {})),
);
for (const packageName of ["@lovable.dev/mcp-js", "@modelcontextprotocol/sdk"]) {
  if (declaredPackageNames.has(packageName)) {
    failures.push(`Retired MCP dependency is declared: ${packageName}`);
  }
}

checkFiles(
  [
    ...collectFiles(resolve(repositoryRoot, "src")),
    resolve(repositoryRoot, "vite.config.ts"),
    resolve(repositoryRoot, "bun.lock"),
  ],
  "Deployable source",
);

const routeTree = readFileSync(resolve(repositoryRoot, "src/routeTree.gen.ts"), "utf8");
for (const route of [
  "/mcp",
  "/.mcp/list-tools",
  "/.mcp/invoke-tool",
  "/.well-known/oauth-protected-resource",
]) {
  if (routeTree.includes(route))
    failures.push(`Generated route tree contains retired route: ${route}`);
}

const buildDirectories = [
  resolve(repositoryRoot, "dist/client"),
  resolve(repositoryRoot, "dist/server"),
];
for (const directory of buildDirectories) {
  if (!existsSync(directory)) failures.push(`Production build output is missing: ${directory}`);
}
checkFiles(buildDirectories.flatMap(collectFiles), "Production build");

if (failures.length > 0) {
  for (const failure of failures) console.error(`MCP absence error: ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify({
    check: "mcp-absence",
    retiredFiles: "absent",
    retiredDependencies: "absent",
    generatedRoutes: "absent",
    buildMarkers: "absent",
  }),
);

export {};
