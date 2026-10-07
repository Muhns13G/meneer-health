import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { CommandRunner } from "./hosted-recovery-support";
import {
  readProductionRecoveryFingerprint,
  restoreAndReconcileProductionLogicalDump,
} from "./production-recovery-proof";

const fingerprint = [{ table: "measurement_private.events", count: 2, digest: "a".repeat(32) }];

describe("production recovery proof", () => {
  it("keeps connection credentials out of arguments and reads only aggregate evidence", () => {
    const directory = mkdtempSync(join(tmpdir(), "meneer-proof-test-"));
    try {
      const command = vi.fn<CommandRunner>((_executable, args, options) => {
        expect(args.join(" ")).not.toContain("synthetic-password");
        expect(options.env?.PGPASSWORD).toBe("synthetic-password");
        return JSON.stringify(fingerprint);
      });
      expect(
        readProductionRecoveryFingerprint(
          "postgresql://synthetic:synthetic-password@db.invalid/postgres?sslmode=require",
          directory,
          command,
        ),
      ).toEqual(fingerprint);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("requires matching per-table counts and digests after the isolated restore", () => {
    const directory = mkdtempSync(join(tmpdir(), "meneer-proof-test-"));
    try {
      const command = vi.fn<CommandRunner>(() => {
        writeFileSync(join(directory, "restored-production.json"), JSON.stringify(fingerprint));
        return "";
      });
      expect(
        restoreAndReconcileProductionLogicalDump(new Uint8Array(), fingerprint, directory, command),
      ).toBe(2);
      expect(command.mock.calls[0]?.[1]).toContain("--rm");
      expect(() =>
        restoreAndReconcileProductionLogicalDump(
          new Uint8Array(),
          [{ ...fingerprint[0]!, count: 3 }],
          directory,
          command,
        ),
      ).toThrow("PRODUCTION_RECOVERY_RESTORE_RECONCILIATION_FAILED");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails closed on invalid fingerprint output without forwarding provider errors", () => {
    const directory = mkdtempSync(join(tmpdir(), "meneer-proof-test-"));
    try {
      expect(() =>
        readProductionRecoveryFingerprint(
          "postgresql://synthetic:password@db.invalid/postgres?sslmode=require",
          directory,
          () => "[]",
        ),
      ).toThrow("PRODUCTION_RECOVERY_SOURCE_FINGERPRINT_FAILED");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
