import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  createProductionLogicalDump,
  createSyntheticLogicalDump,
  readHostedRecoveryEnvironment,
  restoreAndReconcileSyntheticLogicalDump,
  S3R2RecoveryArchiveStore,
  type CommandRunner,
} from "./hosted-recovery-support";

const validEnvironment = {
  RECOVERY_EXPORT_SOURCE: "synthetic",
  RECOVERY_R2_BUCKET: "meneer-health-recovery-production",
  RECOVERY_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 7).toString("base64"),
  BACKUP_HEARTBEAT_URL: "https://heartbeat.example.invalid/synthetic",
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  R2_ACCESS_KEY_ID: "access-key-with-test-length",
  R2_SECRET_ACCESS_KEY: "secret-key-with-sufficient-test-length",
} as const;

describe("hosted recovery support", () => {
  it("accepts a complete synthetic configuration without a database credential", () => {
    expect(readHostedRecoveryEnvironment(validEnvironment)).toMatchObject({
      RECOVERY_EXPORT_SOURCE: "synthetic",
      RECOVERY_R2_BUCKET: "meneer-health-recovery-production",
    });
    expect(
      readHostedRecoveryEnvironment({ ...validEnvironment, SUPABASE_DB_URL: "" }),
    ).toMatchObject({
      RECOVERY_EXPORT_SOURCE: "synthetic",
      SUPABASE_DB_URL: undefined,
    });
  });

  it("requires a database URL and a 32-byte key for production", () => {
    expect(() =>
      readHostedRecoveryEnvironment({
        ...validEnvironment,
        RECOVERY_EXPORT_SOURCE: "production",
      }),
    ).toThrow("HOSTED_RECOVERY_CONFIGURATION_INVALID");
    expect(() =>
      readHostedRecoveryEnvironment({
        ...validEnvironment,
        RECOVERY_ENCRYPTION_KEY_BASE64: Buffer.alloc(31).toString("base64"),
      }),
    ).toThrow("HOSTED_RECOVERY_CONFIGURATION_INVALID");
  });

  it("runs a PostgreSQL 17 custom-format dump without placing the URL in arguments", () => {
    const directory = mkdtempSync(join(tmpdir(), "meneer-dump-test-"));
    const command = vi.fn<CommandRunner>((_executable, args, options) => {
      expect(args).not.toContain("postgresql://secret.invalid/database");
      expect(options.env?.PGDATABASE).toBe("postgresql://secret.invalid/database");
      writeFileSync(join(directory, "recovery.dump"), "synthetic dump");
      return "";
    });
    try {
      expect(
        new TextDecoder().decode(
          createProductionLogicalDump("postgresql://secret.invalid/database", directory, command),
        ),
      ).toBe("synthetic dump");
      expect(command).toHaveBeenCalledOnce();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("creates and restores a deterministic PostgreSQL custom-format synthetic dump", () => {
    const directory = mkdtempSync(join(tmpdir(), "meneer-hosted-round-trip-test-"));
    const command = vi.fn<CommandRunner>((_executable, args) => {
      const script = args.at(-1) ?? "";
      if (script.includes("recovery_source")) {
        writeFileSync(join(directory, "recovery.dump"), "custom-format-dump");
        writeFileSync(join(directory, "source.fingerprint"), `${3}:${"a".repeat(32)}\n`);
      } else if (script.includes("recovery_restore")) {
        writeFileSync(join(directory, "restored.fingerprint"), `${3}:${"a".repeat(32)}\n`);
      }
      return "";
    });
    try {
      const source = createSyntheticLogicalDump(directory, command);
      expect(source.recordCount).toBe(3);
      expect(new TextDecoder().decode(source.payload)).toBe("custom-format-dump");
      expect(
        restoreAndReconcileSyntheticLogicalDump(
          source.payload,
          source.fingerprint,
          directory,
          command,
        ),
      ).toEqual({ recordCount: 3, fingerprint: `${3}:${"a".repeat(32)}` });
      expect(command).toHaveBeenCalledTimes(2);
      expect(command.mock.calls[0]?.[1]).toContain("postgres:17.6-alpine");
      expect(command.mock.calls[1]?.[1]).toContain("postgres:17.6-alpine");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails reconciliation when the restored fingerprint changes", () => {
    const directory = mkdtempSync(join(tmpdir(), "meneer-hosted-mismatch-test-"));
    const command = vi.fn<CommandRunner>(() => {
      writeFileSync(join(directory, "restored.fingerprint"), `${2}:${"b".repeat(32)}\n`);
      return "";
    });
    try {
      expect(() =>
        restoreAndReconcileSyntheticLogicalDump(
          new TextEncoder().encode("dump"),
          `${3}:${"a".repeat(32)}`,
          directory,
          command,
        ),
      ).toThrow("HOSTED_RECOVERY_RECONCILIATION_FAILED");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("uploads only an encrypted recovery key to the EU bucket and removes its staging file", async () => {
    let stagedPath = "";
    const command = vi.fn<CommandRunner>((_executable, args) => {
      const operation = args[1];
      expect(args[0]).toBe("s3api");
      expect(args).toContain(
        "https://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.eu.r2.cloudflarestorage.com",
      );
      expect(args[args.indexOf("--bucket") + 1]).toBe("meneer-health-recovery-production");
      expect(args[args.indexOf("--key") + 1]).toBe(
        "2030-01-01/b0000000-0000-4000-8000-000000000019.json.enc",
      );
      if (operation === "put-object") {
        stagedPath = args[args.indexOf("--body") + 1] ?? "";
      }
      if (operation === "get-object") {
        writeFileSync(args.at(-1) ?? "", "encrypted");
      }
      return "";
    });
    const store = new S3R2RecoveryArchiveStore(
      "meneer-health-recovery-production",
      "a".repeat(32),
      "access-key-with-test-length",
      "secret-key-with-sufficient-test-length",
      command,
    );
    await store.put("2030-01-01/b0000000-0000-4000-8000-000000000019.json.enc", "encrypted");
    await expect(
      store.get("2030-01-01/b0000000-0000-4000-8000-000000000019.json.enc"),
    ).resolves.toBe("encrypted");
    await store.delete("2030-01-01/b0000000-0000-4000-8000-000000000019.json.enc");
    expect(command).toHaveBeenCalledTimes(3);
    expect(command.mock.calls.map((call) => call[1][1])).toEqual([
      "put-object",
      "get-object",
      "delete-object",
    ]);
    expect(() => writeFileSync(stagedPath, "gone", { flag: "r+" })).toThrow();
    await expect(store.put("unsafe/plaintext.sql", "plaintext")).rejects.toThrow(
      "RECOVERY_OBJECT_KEY_INVALID",
    );
  });
});
