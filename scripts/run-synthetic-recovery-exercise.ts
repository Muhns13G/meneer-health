import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import type { EncryptedRecoveryArchive } from "../contracts/lifecycle";
import { decryptRecoveryArchive } from "../src/application/recovery/recovery-archive";
import { runRecoveryExportJob } from "../src/application/recovery/recovery-job";

const projectId = "meneer-health-local";
const container = `supabase_db_${projectId}`;
const stagingDatabase = `meneer_recovery_${process.pid}`;
const containerDump = `/tmp/${stagingDatabase}.dump`;
const schemaVersion = "20260811113146";
const governedSchemas = [
  "public",
  "audit_private",
  "fulfilment_private",
  "identity_private",
  "lifecycle_private",
  "payments_private",
] as const;

function docker(args: string[]): Buffer {
  return execFileSync("docker", args, {
    maxBuffer: 128 * 1024 * 1024,
  });
}

function sql(database: string, statement: string): string {
  return execFileSync(
    "docker",
    ["exec", container, "psql", "-U", "postgres", "-d", database, "-At", "-c", statement],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  ).trim();
}

function databaseFingerprint(database: string): {
  count: number;
  checksum: string;
  counts: Record<string, number>;
} {
  const tableNames = sql(
    database,
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
  )
    .split("\n")
    .filter((name) => /^[a-z][a-z0-9_]*$/.test(name) && name !== "recovery_exercises");
  const counts: Record<string, number> = {};
  const facts: string[] = [];
  let total = 0;
  for (const table of tableNames) {
    const result = sql(
      database,
      `select count(*)::text || '|' || coalesce(md5(string_agg(row_data, E'\\n' order by row_data)), md5('')) from (select to_jsonb(t)::text as row_data from public.${table} t) rows`,
    );
    const [countText, checksum] = result.split("|");
    const count = Number(countText);
    if (!Number.isSafeInteger(count) || checksum === undefined)
      throw new Error("RECOVERY_FINGERPRINT_INVALID");
    counts[table] = count;
    total += count;
    facts.push(`${table}|${count}|${checksum}`);
  }
  return {
    count: total,
    counts,
    checksum: createHash("sha256").update(facts.join("\n")).digest("hex"),
  };
}

async function run(): Promise<void> {
  const startedAt = Date.now();
  const backupId = randomUUID();
  const tempDirectory = mkdtempSync(join(tmpdir(), "meneer-recovery-"));
  const encryptedPath = join(tempDirectory, "recovery.json.enc");
  const decryptedPath = join(tempDirectory, "restore.dump");
  const key = crypto.getRandomValues(new Uint8Array(32));

  try {
    const source = databaseFingerprint("postgres");
    const dump = docker([
      "exec",
      container,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-Fc",
      ...governedSchemas.flatMap((schema) => ["-n", schema]),
    ]) as Buffer;
    const dumpChecksum = createHash("sha256").update(dump).digest("hex");
    let heartbeatCalls = 0;
    const outcome = await runRecoveryExportJob(
      {
        manifest: {
          contract: "recovery.manifest",
          version: 1,
          createdAt: new Date().toISOString(),
          environment: "local",
          backupId,
          schemaVersion,
          recordCounts: { ...source.counts, storage_objects: 0 },
          checksum: dumpChecksum,
        },
        payload: Uint8Array.from(dump),
        keyBytes: key,
        keyReference: "synthetic-exercise-key",
      },
      {
        put: async (_objectKey, body) => {
          writeFileSync(encryptedPath, body, { mode: 0o600 });
        },
      },
      { success: async () => void (heartbeatCalls += 1) },
    );
    if (!outcome.heartbeatDelivered || heartbeatCalls !== 1)
      throw new Error("RECOVERY_HEARTBEAT_FAILED");

    const archive = JSON.parse(readFileSync(encryptedPath, "utf8")) as EncryptedRecoveryArchive;
    const decrypted = await decryptRecoveryArchive(archive, key);
    if (decrypted.manifest.checksum !== dumpChecksum)
      throw new Error("RECOVERY_ARCHIVE_CHECKSUM_FAILED");
    writeFileSync(decryptedPath, decrypted.payload, { mode: 0o600 });

    docker(["exec", container, "dropdb", "-U", "postgres", "--if-exists", stagingDatabase]);
    docker(["exec", container, "createdb", "-U", "postgres", stagingDatabase]);
    sql(
      stagingDatabase,
      "drop schema public; create schema extensions; create extension pgcrypto with schema extensions;",
    );
    docker(["cp", decryptedPath, `${container}:${containerDump}`]);
    docker([
      "exec",
      container,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      stagingDatabase,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
      containerDump,
    ]);

    const restored = databaseFingerprint(stagingDatabase);
    if (restored.count !== source.count || restored.checksum !== source.checksum) {
      throw new Error("RECOVERY_RECONCILIATION_FAILED");
    }

    const statusOutput = execFileSync("bunx", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
    });
    const status = JSON.parse(statusOutput.slice(statusOutput.indexOf("{"))) as {
      API_URL: string;
      SECRET_KEY: string;
    };
    const client = createClient(status.API_URL, status.SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const recoveryTimeSeconds = Math.ceil((Date.now() - startedAt) / 1000);
    const { data, error } = await client.rpc("record_recovery_exercise", {
      p_id: backupId,
      p_environment: "local",
      p_schema_version: schemaVersion,
      p_backup_checksum: dumpChecksum,
      p_source_checksum: source.checksum,
      p_restored_checksum: restored.checksum,
      p_source_record_count: source.count,
      p_restored_record_count: restored.count,
      p_recovery_point_seconds: 0,
      p_recovery_time_seconds: recoveryTimeSeconds,
      p_heartbeat_delivered: true,
      p_exercised_at: new Date().toISOString(),
    });
    if (error || (data as { reconciled?: boolean } | null)?.reconciled !== true) {
      throw new Error("RECOVERY_EVIDENCE_FAILED");
    }
    console.log(
      JSON.stringify({
        exercise: "synthetic-recovery",
        reconciled: true,
        encrypted: true,
        heartbeatPayloadFields: 0,
        sourceRecordCount: source.count,
        restoredRecordCount: restored.count,
        recoveryTimeSeconds,
      }),
    );
  } finally {
    try {
      docker(["exec", container, "dropdb", "-U", "postgres", "--if-exists", stagingDatabase]);
      docker(["exec", container, "rm", "-f", containerDump]);
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  }
}

await run();
