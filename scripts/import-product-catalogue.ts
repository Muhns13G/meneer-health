import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  assertLocalCatalogueImport,
  catalogueImportSql,
  validateCatalogueImport,
} from "./lib/product-catalogue-import";

// No hosted execution path. Real customer-RRP manifests may be validated, never imported here.
// Usage: bun --no-env-file run scripts/import-product-catalogue.ts --validate manifest.json source.pdf
// Synthetic local import: replace --validate with --apply-local; use synthetic source bytes.
const [mode, manifestPath, sourcePath, extra] = process.argv.slice(2);
try {
  if (
    !manifestPath ||
    !sourcePath ||
    extra ||
    !["--validate", "--apply-local"].includes(mode ?? "")
  )
    throw new Error("USAGE");
  const manifestBytes = readFileSync(manifestPath);
  const sourceBytes = readFileSync(sourcePath);
  if (manifestBytes.length > 256_000 || sourceBytes.length > 20_000_000)
    throw new Error("INPUT_SIZE");
  const manifest = validateCatalogueImport(JSON.parse(manifestBytes.toString("utf8")), sourceBytes);
  if (mode === "--apply-local") {
    assertLocalCatalogueImport(process.env, manifest.provenance);
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_meneer-health-local",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-X",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        input: `begin; set local standard_conforming_strings=on; set local lock_timeout='5s'; set local statement_timeout='15s'; ${catalogueImportSql(manifest)} commit;`,
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 1024 * 1024,
      },
    );
  }
  console.log(
    JSON.stringify({
      exercise: "catalogue-import",
      mode,
      items: manifest.items.length,
      sourceMatched: true,
      hosted: false,
      payableOffersCreated: false,
    }),
  );
} catch {
  // Subprocess/JSON failures may include prices or confidential source fragments; redact them.
  console.error("CATALOGUE_IMPORT_REJECTED");
  process.exitCode = 1;
}
