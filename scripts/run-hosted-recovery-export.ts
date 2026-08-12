import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { HttpBackupHeartbeat } from "../src/adapters/recovery/cloudflare-recovery-adapters";
import {
  createProductionLogicalDump,
  createSyntheticLogicalDump,
  readHostedRecoveryEnvironment,
  restoreAndReconcileSyntheticLogicalDump,
  S3R2RecoveryArchiveStore,
} from "../src/adapters/recovery/hosted-recovery-support";
import { decryptRecoveryArchive } from "../src/application/recovery/recovery-archive";
import { runRecoveryExportJob } from "../src/application/recovery/recovery-job";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");

function latestSchemaVersion(): string {
  const versions = readdirSync(migrationDirectory)
    .map((file) => /^(\d{14})_.+\.sql$/.exec(file)?.[1])
    .filter((value): value is string => value !== undefined)
    .sort();
  const version = versions.at(-1);
  if (!version) throw new Error("HOSTED_RECOVERY_SCHEMA_VERSION_MISSING");
  return version;
}

async function run(): Promise<void> {
  const environment = readHostedRecoveryEnvironment(process.env);
  const directory = mkdtempSync(join(tmpdir(), "meneer-hosted-recovery-"));
  try {
    const syntheticFixture =
      environment.RECOVERY_EXPORT_SOURCE === "synthetic"
        ? createSyntheticLogicalDump(directory)
        : undefined;
    const payload =
      environment.RECOVERY_EXPORT_SOURCE === "production"
        ? createProductionLogicalDump(environment.SUPABASE_DB_URL!, directory)
        : syntheticFixture!.payload;
    const checksum = createHash("sha256").update(payload).digest("hex");
    const backupId = randomUUID();
    const keyBytes = Uint8Array.from(
      Buffer.from(environment.RECOVERY_ENCRYPTION_KEY_BASE64, "base64"),
    );
    const store = new S3R2RecoveryArchiveStore(
      environment.RECOVERY_R2_BUCKET,
      environment.CLOUDFLARE_ACCOUNT_ID,
      environment.R2_ACCESS_KEY_ID,
      environment.R2_SECRET_ACCESS_KEY,
    );
    let roundTripVerified = false;
    let syntheticObjectDeleted = false;
    const outcome = await runRecoveryExportJob(
      {
        manifest: {
          contract: "recovery.manifest",
          version: 1,
          createdAt: new Date().toISOString(),
          environment: "production",
          backupId,
          schemaVersion: latestSchemaVersion(),
          recordCounts: {
            logical_archive: syntheticFixture?.recordCount ?? 1,
            storage_objects: 0,
          },
          checksum,
        },
        payload,
        keyBytes,
        keyReference: "meneer-health-recovery-key-v1",
      },
      store,
      new HttpBackupHeartbeat(environment.BACKUP_HEARTBEAT_URL),
      syntheticFixture
        ? async ({ objectKey, serializedArchive }) => {
            try {
              const downloadedBody = await store.get(objectKey);
              if (downloadedBody !== serializedArchive) {
                throw new Error("HOSTED_RECOVERY_ARCHIVE_BODY_MISMATCH");
              }
              const restoredArchive = await decryptRecoveryArchive(
                JSON.parse(downloadedBody),
                keyBytes,
              );
              const restoredChecksum = createHash("sha256")
                .update(restoredArchive.payload)
                .digest("hex");
              if (
                restoredArchive.manifest.backupId !== backupId ||
                restoredArchive.manifest.checksum !== checksum ||
                restoredChecksum !== checksum
              ) {
                throw new Error("HOSTED_RECOVERY_ARCHIVE_RECONCILIATION_FAILED");
              }
              const restored = restoreAndReconcileSyntheticLogicalDump(
                restoredArchive.payload,
                syntheticFixture.fingerprint,
                directory,
              );
              if (restored.recordCount !== syntheticFixture.recordCount) {
                throw new Error("HOSTED_RECOVERY_RECORD_COUNT_MISMATCH");
              }
              roundTripVerified = true;
            } finally {
              await store.delete(objectKey);
              syntheticObjectDeleted = true;
            }
          }
        : undefined,
    );
    if (!outcome.heartbeatDelivered) throw new Error("HOSTED_RECOVERY_HEARTBEAT_FAILED");
    console.log(
      JSON.stringify({
        job: "hosted-recovery-export",
        source: environment.RECOVERY_EXPORT_SOURCE,
        encrypted: true,
        durableWrite: true,
        roundTripVerified,
        restoredRecordCount: syntheticFixture?.recordCount ?? null,
        syntheticObjectDeleted,
        heartbeatPayloadFields: 0,
      }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

await run();
