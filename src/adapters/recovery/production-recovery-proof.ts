import "@tanstack/react-start/server-only";

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { governedRecoverySchemas, type CommandRunner } from "./hosted-recovery-support";

const runCommand: CommandRunner = (executable, args, options) =>
  execFileSync(executable, [...args], {
    encoding: "utf8",
    env: options.env,
    maxBuffer: options.maxBuffer,
    stdio: ["ignore", "pipe", "pipe"],
  });

const fingerprintSchema = z
  .array(
    z
      .object({
        table: z.string().regex(/^[a-z_]+\.[a-z_]+$/),
        count: z.number().int().nonnegative(),
        digest: z.string().regex(/^[a-f0-9]{32}$/),
      })
      .strict(),
  )
  .min(1);

export type ProductionRecoveryFingerprint = z.infer<typeof fingerprintSchema>;

// Only aggregate counts and hashes leave PostgreSQL; raw row contents never enter output.
const fingerprintSql = `
create temporary table recovery_fingerprint (table_name text, row_count bigint, digest text);
do $proof$
declare t record;
begin
  for t in select schemaname, tablename from pg_tables
    where schemaname in (${governedRecoverySchemas.map((schema) => `'${schema}'`).join(",")})
    order by schemaname, tablename
  loop
    execute format('insert into recovery_fingerprint select %L, count(*), coalesce(md5(string_agg(row_data, E''\\n'' order by row_data)), md5('''')) from (select to_jsonb(r)::text row_data from %I.%I r) rows',
      t.schemaname || '.' || t.tablename, t.schemaname, t.tablename);
  end loop;
end $proof$;
select coalesce(jsonb_agg(jsonb_build_object('table',table_name,'count',row_count,'digest',digest) order by table_name),'[]'::jsonb) from recovery_fingerprint;
`;

export function readProductionRecoveryFingerprint(
  databaseUrl: string,
  directory: string,
  command: CommandRunner = runCommand,
): ProductionRecoveryFingerprint {
  writeFileSync(join(directory, "fingerprint.sql"), fingerprintSql, { mode: 0o600 });
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== "postgresql:" || url.searchParams.get("sslmode") !== "require")
      throw new Error("connection");
    const connection = {
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
      PGSSLMODE: "require",
      PGCONNECT_TIMEOUT: "15",
    };
    const output = command(
      "docker",
      [
        "run",
        "--rm",
        ...Object.keys(connection).flatMap((name) => ["-e", name]),
        "-v",
        `${directory}:/recovery:ro`,
        "postgres:17.6-alpine",
        "psql",
        "-X",
        "-qAt",
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        "/recovery/fingerprint.sql",
      ],
      {
        env: { ...process.env, ...connection },
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    return fingerprintSchema.parse(JSON.parse(output.trim()));
  } catch {
    throw new Error("PRODUCTION_RECOVERY_SOURCE_FINGERPRINT_FAILED");
  }
}

export function restoreAndReconcileProductionLogicalDump(
  payload: Uint8Array<ArrayBuffer>,
  expected: ProductionRecoveryFingerprint,
  directory: string,
  command: CommandRunner = runCommand,
): number {
  writeFileSync(join(directory, "production-restore.dump"), payload, { mode: 0o600 });
  writeFileSync(join(directory, "fingerprint.sql"), fingerprintSql, { mode: 0o600 });
  const script = String.raw`
export PGDATA=/tmp/meneer-production-restore
mkdir -p "$PGDATA"
chown postgres:postgres "$PGDATA"
install -o postgres -g postgres -m 600 /recovery/production-restore.dump /tmp/production-restore.dump
install -o postgres -g postgres -m 600 /recovery/fingerprint.sql /tmp/fingerprint.sql
gosu postgres initdb --username=postgres --auth=trust >/dev/null
gosu postgres pg_ctl -w start >/dev/null
gosu postgres createdb --username=postgres recovery_restore
gosu postgres psql -U postgres -d recovery_restore -v ON_ERROR_STOP=1 -c 'drop schema public; create schema extensions; create extension pgcrypto with schema extensions;' >/dev/null
gosu postgres pg_restore -U postgres -d recovery_restore --no-owner --no-acl --exit-on-error /tmp/production-restore.dump
gosu postgres psql -U postgres -d recovery_restore -X -qAt -v ON_ERROR_STOP=1 -f /tmp/fingerprint.sql > /tmp/restored-production.json
gosu postgres pg_ctl -m fast -w stop >/dev/null
install -m 644 /tmp/restored-production.json /recovery/restored-production.json
`;
  try {
    command(
      "docker",
      ["run", "--rm", "-v", `${directory}:/recovery`, "postgres:17.6-alpine", "sh", "-ceu", script],
      { maxBuffer: 16 * 1024 * 1024 },
    );
    const restored = fingerprintSchema.parse(
      JSON.parse(readFileSync(join(directory, "restored-production.json"), "utf8")),
    );
    if (JSON.stringify(restored) !== JSON.stringify(expected)) throw new Error("mismatch");
    return restored.reduce((sum, table) => sum + table.count, 0);
  } catch {
    throw new Error("PRODUCTION_RECOVERY_RESTORE_RECONCILIATION_FAILED");
  }
}
