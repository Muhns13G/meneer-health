import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { HttpBackupHeartbeat } from "../src/adapters/recovery/cloudflare-recovery-adapters";
import {
  createProductionLogicalDump,
  readHostedRecoveryEnvironment,
  S3R2RecoveryArchiveStore,
} from "../src/adapters/recovery/hosted-recovery-support";
import { runRecoveryExportJob } from "../src/application/recovery/recovery-job";

const syntheticPayload = new TextEncoder().encode("meneer-health-hosted-recovery-synthetic-v1");
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
    const payload =
      environment.RECOVERY_EXPORT_SOURCE === "production"
        ? createProductionLogicalDump(environment.SUPABASE_DB_URL!, directory)
        : syntheticPayload;
    const checksum = createHash("sha256").update(payload).digest("hex");
    const outcome = await runRecoveryExportJob(
      {
        manifest: {
          contract: "recovery.manifest",
          version: 1,
          createdAt: new Date().toISOString(),
          environment: "production",
          backupId: randomUUID(),
          schemaVersion: latestSchemaVersion(),
          recordCounts: {
            logical_archive: 1,
            storage_objects: 0,
          },
          checksum,
        },
        payload,
        keyBytes: Uint8Array.from(
          Buffer.from(environment.RECOVERY_ENCRYPTION_KEY_BASE64, "base64"),
        ),
        keyReference: "meneer-health-recovery-key-v1",
      },
      new S3R2RecoveryArchiveStore(
        environment.RECOVERY_R2_BUCKET,
        environment.CLOUDFLARE_ACCOUNT_ID,
        environment.R2_ACCESS_KEY_ID,
        environment.R2_SECRET_ACCESS_KEY,
      ),
      new HttpBackupHeartbeat(environment.BACKUP_HEARTBEAT_URL),
    );
    if (!outcome.heartbeatDelivered) throw new Error("HOSTED_RECOVERY_HEARTBEAT_FAILED");
    console.log(
      JSON.stringify({
        job: "hosted-recovery-export",
        source: environment.RECOVERY_EXPORT_SOURCE,
        encrypted: true,
        durableWrite: true,
        heartbeatPayloadFields: 0,
      }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

await run();
