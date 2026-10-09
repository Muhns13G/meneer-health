import { createHash } from "node:crypto";
import { catalogueImportSchema } from "../../src/domain/payments/product-catalogue";

export function validateCatalogueImport(input: unknown, sourceBytes: Uint8Array) {
  const result = catalogueImportSchema.safeParse(input);
  // Do not expose validation values, product names, wholesale data or file content in errors.
  if (!result.success) throw new Error("CATALOGUE_MANIFEST_INVALID");
  if (createHash("sha256").update(sourceBytes).digest("hex") !== result.data.sourceFingerprint)
    throw new Error("CATALOGUE_SOURCE_MISMATCH");
  return result.data;
}

export function catalogueImportSql(input: unknown) {
  const manifest = catalogueImportSchema.parse(input);
  const literal = JSON.stringify(manifest).replaceAll("'", "''");
  return `select commerce_private.import_catalogue('${literal}'::jsonb) as imported_catalogue;`;
}

export function assertLocalCatalogueImport(
  environment: Record<string, string | undefined>,
  provenance: string,
) {
  if (
    provenance !== "local-synthetic" ||
    Object.entries(environment).some(
      ([name, value]) =>
        value &&
        /^(SUPABASE_|POSTGRES_|PGDATABASE$|PGHOST$|DATABASE_URL$|HOSTED_|STRIPE_|BREVO_|TELNYX_|R2_|CLOUDFLARE_)/.test(
          name,
        ),
    )
  )
    throw new Error("CATALOGUE_LOCAL_IMPORT_GUARD_REJECTED");
}
