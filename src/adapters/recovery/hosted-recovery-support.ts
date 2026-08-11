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
) => void;

const defaultCommandRunner: CommandRunner = (executable, args, options) => {
  execFileSync(executable, [...args], {
    env: options.env,
    maxBuffer: options.maxBuffer,
    stdio: ["ignore", "ignore", "pipe"],
  });
};

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
    if (!/^\d{4}-\d{2}-\d{2}\/[a-f0-9-]{36}\.json\.enc$/.test(objectKey)) {
      throw new Error("RECOVERY_OBJECT_KEY_INVALID");
    }
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
}
