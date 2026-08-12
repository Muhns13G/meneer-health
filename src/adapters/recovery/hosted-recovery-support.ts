import "@tanstack/react-start/server-only";

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import type { RecoveryArchiveStore } from "@/application/recovery/recovery-job";

export const governedRecoverySchemas = [
  "public",
  "audit_private",
  "fulfilment_private",
  "identity_private",
  "lifecycle_private",
  "payments_private",
] as const;

const bucketNameSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/)
  .refine((value) => !value.includes("--"));

const hostedRecoveryEnvironmentSchema = z
  .object({
    RECOVERY_EXPORT_SOURCE: z.enum(["synthetic", "production"]),
    RECOVERY_R2_BUCKET: bucketNameSchema,
    RECOVERY_ENCRYPTION_KEY_BASE64: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    BACKUP_HEARTBEAT_URL: z.url().startsWith("https://"),
    CLOUDFLARE_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/),
    R2_ACCESS_KEY_ID: z.string().min(20),
    R2_SECRET_ACCESS_KEY: z.string().min(32),
    SUPABASE_DB_URL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.url().startsWith("postgresql://").optional(),
    ),
  })
  .superRefine((environment, context) => {
    if (environment.RECOVERY_EXPORT_SOURCE === "production" && !environment.SUPABASE_DB_URL) {
      context.addIssue({
        code: "custom",
        path: ["SUPABASE_DB_URL"],
        message: "A production database URL is required for production exports.",
      });
    }
    const keyBytes = Buffer.from(environment.RECOVERY_ENCRYPTION_KEY_BASE64, "base64");
    if (keyBytes.byteLength !== 32) {
      context.addIssue({
        code: "custom",
        path: ["RECOVERY_ENCRYPTION_KEY_BASE64"],
        message: "The recovery key must decode to exactly 32 bytes.",
      });
    }
  });

export type HostedRecoveryEnvironment = z.infer<typeof hostedRecoveryEnvironmentSchema>;

export function readHostedRecoveryEnvironment(input: NodeJS.ProcessEnv): HostedRecoveryEnvironment {
  const result = hostedRecoveryEnvironmentSchema.safeParse(input);
  if (!result.success) throw new Error("HOSTED_RECOVERY_CONFIGURATION_INVALID");
  return Object.freeze(result.data);
}

export type CommandRunner = (
  executable: string,
  args: readonly string[],
  options: { env?: NodeJS.ProcessEnv; maxBuffer?: number },
) => string;

const defaultCommandRunner: CommandRunner = (executable, args, options) => {
  return execFileSync(executable, [...args], {
    encoding: "utf8",
    env: options.env,
    maxBuffer: options.maxBuffer,
    stdio: ["ignore", "pipe", "pipe"],
  });
};

export type SyntheticLogicalDump = Readonly<{
  payload: Uint8Array<ArrayBuffer>;
  recordCount: number;
  fingerprint: string;
}>;

const syntheticDatabaseScript = String.raw`
export PGDATA=/tmp/meneer-source
mkdir -p "$PGDATA"
chown postgres:postgres "$PGDATA"
install -o postgres -g postgres -m 600 /recovery/seed.sql /tmp/recovery-seed.sql
gosu postgres initdb --username=postgres --auth=trust >/dev/null
gosu postgres pg_ctl -w start >/dev/null
gosu postgres createdb --username=postgres recovery_source
gosu postgres psql --username=postgres --dbname=recovery_source --set=ON_ERROR_STOP=1 --file=/tmp/recovery-seed.sql >/dev/null
gosu postgres psql --username=postgres --dbname=recovery_source --tuples-only --no-align --output="$PGDATA/source.fingerprint" --command="select count(*)::text || ':' || md5(string_agg(id::text || ':' || marker, '|' order by id)) from public.recovery_probe"
gosu postgres pg_dump --username=postgres --dbname=recovery_source -Fc --no-owner --no-acl --table=public.recovery_probe --file="$PGDATA/recovery.dump"
gosu postgres pg_ctl -m fast -w stop >/dev/null
install -m 644 "$PGDATA/source.fingerprint" /recovery/source.fingerprint
install -m 644 "$PGDATA/recovery.dump" /recovery/recovery.dump
`;

const syntheticRestoreScript = String.raw`
export PGDATA=/tmp/meneer-restore
mkdir -p "$PGDATA"
chown postgres:postgres "$PGDATA"
install -o postgres -g postgres -m 600 /recovery/downloaded.dump /tmp/downloaded.dump
gosu postgres initdb --username=postgres --auth=trust >/dev/null
gosu postgres pg_ctl -w start >/dev/null
gosu postgres createdb --username=postgres recovery_restore
gosu postgres pg_restore --username=postgres --dbname=recovery_restore --no-owner --no-acl --exit-on-error /tmp/downloaded.dump
gosu postgres psql --username=postgres --dbname=recovery_restore --tuples-only --no-align --output="$PGDATA/restored.fingerprint" --command="select count(*)::text || ':' || md5(string_agg(id::text || ':' || marker, '|' order by id)) from public.recovery_probe"
gosu postgres pg_ctl -m fast -w stop >/dev/null
install -m 644 "$PGDATA/restored.fingerprint" /recovery/restored.fingerprint
`;

const syntheticSeedSql = `
create table public.recovery_probe (
  id integer primary key,
  marker text not null
);
insert into public.recovery_probe (id, marker) values
  (1, 'synthetic-alpha'),
  (2, 'synthetic-beta'),
  (3, 'synthetic-gamma');
`;

export function createSyntheticLogicalDump(
  outputDirectory: string,
  command: CommandRunner = defaultCommandRunner,
): SyntheticLogicalDump {
  const dumpPath = join(outputDirectory, "recovery.dump");
  const fingerprintPath = join(outputDirectory, "source.fingerprint");
  try {
    writeFileSync(join(outputDirectory, "seed.sql"), syntheticSeedSql, { mode: 0o600 });
    command(
      "docker",
      [
        "run",
        "--rm",
        "-v",
        `${outputDirectory}:/recovery`,
        "postgres:17.6-alpine",
        "sh",
        "-ceu",
        syntheticDatabaseScript,
      ],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    const fingerprint = readFileSync(fingerprintPath, "utf8").trim();
    const recordCount = Number.parseInt(fingerprint.split(":", 1)[0] ?? "", 10);
    if (!/^3:[a-f0-9]{32}$/.test(fingerprint) || recordCount !== 3) {
      throw new Error("HOSTED_RECOVERY_SYNTHETIC_FINGERPRINT_INVALID");
    }
    return {
      payload: Uint8Array.from(readFileSync(dumpPath)),
      recordCount,
      fingerprint,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "HOSTED_RECOVERY_SYNTHETIC_FINGERPRINT_INVALID"
    ) {
      throw error;
    }
    throw new Error("HOSTED_RECOVERY_SYNTHETIC_DUMP_FAILED", { cause: error });
  }
}

export function restoreAndReconcileSyntheticLogicalDump(
  payload: Uint8Array<ArrayBuffer>,
  expectedFingerprint: string,
  outputDirectory: string,
  command: CommandRunner = defaultCommandRunner,
): { recordCount: number; fingerprint: string } {
  const restoredFingerprintPath = join(outputDirectory, "restored.fingerprint");
  try {
    writeFileSync(join(outputDirectory, "downloaded.dump"), payload, { mode: 0o600 });
    command(
      "docker",
      [
        "run",
        "--rm",
        "-v",
        `${outputDirectory}:/recovery`,
        "postgres:17.6-alpine",
        "sh",
        "-ceu",
        syntheticRestoreScript,
      ],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    const fingerprint = readFileSync(restoredFingerprintPath, "utf8").trim();
    if (fingerprint !== expectedFingerprint) {
      throw new Error("HOSTED_RECOVERY_RECONCILIATION_FAILED");
    }
    return {
      recordCount: Number.parseInt(fingerprint.split(":", 1)[0] ?? "", 10),
      fingerprint,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "HOSTED_RECOVERY_RECONCILIATION_FAILED") {
      throw error;
    }
    throw new Error("HOSTED_RECOVERY_SYNTHETIC_RESTORE_FAILED", { cause: error });
  }
}

export function createProductionLogicalDump(
  databaseUrl: string,
  outputDirectory: string,
  command: CommandRunner = defaultCommandRunner,
): Uint8Array<ArrayBuffer> {
  const dumpName = "recovery.dump";
  const dumpPath = join(outputDirectory, dumpName);
  try {
    command(
      "docker",
      [
        "run",
        "--rm",
        "-e",
        "PGDATABASE",
        "-v",
        `${outputDirectory}:/recovery`,
        "postgres:17.6-alpine",
        "pg_dump",
        "-Fc",
        "--no-owner",
        "--no-acl",
        ...governedRecoverySchemas.flatMap((schema) => ["-n", schema]),
        "-f",
        `/recovery/${dumpName}`,
      ],
      {
        env: { ...process.env, PGDATABASE: databaseUrl },
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    return Uint8Array.from(readFileSync(dumpPath));
  } catch {
    throw new Error("HOSTED_RECOVERY_DATABASE_DUMP_FAILED");
  }
}

export class S3R2RecoveryArchiveStore implements RecoveryArchiveStore {
  constructor(
    private readonly bucket: string,
    private readonly accountId: string,
    private readonly accessKeyId: string,
    private readonly secretAccessKey: string,
    private readonly command: CommandRunner = defaultCommandRunner,
  ) {
    if (!bucketNameSchema.safeParse(bucket).success) {
      throw new Error("RECOVERY_BUCKET_INVALID");
    }
    if (
      !/^[a-f0-9]{32}$/.test(accountId) ||
      accessKeyId.length < 20 ||
      secretAccessKey.length < 32
    ) {
      throw new Error("RECOVERY_R2_CREDENTIAL_INVALID");
    }
  }

  async put(objectKey: string, body: string): Promise<void> {
    this.assertObjectKey(objectKey);
    const directory = mkdtempSync(join(tmpdir(), "meneer-r2-recovery-"));
    const encryptedPath = join(directory, "archive.json.enc");
    try {
      writeFileSync(encryptedPath, body, { mode: 0o600 });
      this.command(
        "aws",
        [
          "s3api",
          "put-object",
          "--endpoint-url",
          `https://${this.accountId}.eu.r2.cloudflarestorage.com`,
          "--bucket",
          this.bucket,
          "--key",
          objectKey,
          "--body",
          encryptedPath,
          "--content-type",
          "application/octet-stream",
          "--metadata",
          "classification=encrypted-recovery,retention-days=35",
        ],
        {
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: this.accessKeyId,
            AWS_SECRET_ACCESS_KEY: this.secretAccessKey,
            AWS_DEFAULT_REGION: "auto",
          },
          maxBuffer: 16 * 1024 * 1024,
        },
      );
    } catch {
      throw new Error("RECOVERY_DURABLE_WRITE_FAILED");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  async get(objectKey: string): Promise<string> {
    this.assertObjectKey(objectKey);
    const directory = mkdtempSync(join(tmpdir(), "meneer-r2-recovery-read-"));
    const encryptedPath = join(directory, "archive.json.enc");
    try {
      this.command(
        "aws",
        [
          "s3api",
          "get-object",
          "--endpoint-url",
          `https://${this.accountId}.eu.r2.cloudflarestorage.com`,
          "--bucket",
          this.bucket,
          "--key",
          objectKey,
          encryptedPath,
        ],
        { env: this.awsEnvironment(), maxBuffer: 16 * 1024 * 1024 },
      );
      return readFileSync(encryptedPath, "utf8");
    } catch {
      throw new Error("RECOVERY_DURABLE_READ_FAILED");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  async delete(objectKey: string): Promise<void> {
    this.assertObjectKey(objectKey);
    try {
      this.command(
        "aws",
        [
          "s3api",
          "delete-object",
          "--endpoint-url",
          `https://${this.accountId}.eu.r2.cloudflarestorage.com`,
          "--bucket",
          this.bucket,
          "--key",
          objectKey,
        ],
        { env: this.awsEnvironment(), maxBuffer: 16 * 1024 * 1024 },
      );
    } catch {
      throw new Error("RECOVERY_SYNTHETIC_CLEANUP_FAILED");
    }
  }

  private assertObjectKey(objectKey: string): void {
    if (!/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}\.json\.enc$/.test(objectKey)) {
      throw new Error("RECOVERY_OBJECT_KEY_INVALID");
    }
  }

  private awsEnvironment(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      AWS_ACCESS_KEY_ID: this.accessKeyId,
      AWS_SECRET_ACCESS_KEY: this.secretAccessKey,
      AWS_DEFAULT_REGION: "auto",
    };
  }
}
