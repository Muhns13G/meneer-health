export const productRecoverySchemas = [
  "public",
  "commerce_private",
  "audit_private",
  "fulfilment_private",
  "identity_private",
  "intake_private",
  "lifecycle_private",
  "measurement_private",
  "payments_private",
] as const;

export function assertProductRecoveryDatabase(database: string, created: readonly string[]) {
  if (
    database !== "postgres" &&
    (!created.includes(database) || !/^product_(source|restore)_[a-f0-9]{32}$/.test(database))
  )
    throw Error("PRODUCT_RECOVERY_DATABASE_REJECTED");
}

// The existing fixed synthetic suite is committed only inside a disposable local database.
// It is not a hosted fixture builder and must never be sent to a hosted SQL connection.
export function buildProductRecoveryFixture(source: string) {
  if (
    !source.startsWith("begin;") ||
    !/\nrollback;\s*$/.test(source) ||
    /^(?:commit|rollback);/im.test(source.replace(/\nrollback;\s*$/, "")) ||
    !source.includes("-- Explicit local-synthetic ledger funding, not a Stripe capture")
  )
    throw Error("PRODUCT_RECOVERY_FIXTURE_CHANGED");
  return source.replace(/\nrollback;\s*$/, "\ncommit;\n");
}
