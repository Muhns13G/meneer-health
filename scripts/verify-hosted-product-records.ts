import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
// @ts-expect-error Bun-only rehearsal runtime; application types intentionally target Node 22.
import { Database } from "bun:sqlite";
import { z } from "zod";
import {
  encryptRecoveryArchive,
  decryptRecoveryArchive,
} from "../src/application/recovery/recovery-archive";
import { decryptShippingAddress } from "../src/server/payments/shipping-envelope";
import {
  preparationManifestSchema,
  productRehearsalOrigin,
} from "./lib/product-rehearsal-preparation";

function assert(value: unknown, code: string): asserts value {
  if (!value) throw Error(code);
}
const path = ".sprint15-product-journey-replacement.local";
const m = JSON.parse(readFileSync(path, "utf8"));
const c = preparationManifestSchema.parse(
  JSON.parse(readFileSync(".sprint15-product-rehearsal.local", "utf8")),
);
assert(
  process.env.PRODUCT_REHEARSAL_RECORD_CONFIRM ===
    "synthetic-record-roundtrip-no-provider-writes" &&
    !process.env.CI &&
    m.completed === true &&
    m.cleaned === false &&
    m.tenant === c.tenantId &&
    m.exerciseId === c.exerciseId,
  "S15_RECORD_SCOPE_REJECTED",
);
const tenant = z.uuid().parse(m.tenant);
const caseId = z.uuid().parse(m.ids.case);
const catalogue = z.uuid().parse(m.ids.catalogue);
const key = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
// Fixed relation allowlist; never export provider Auth, real users or the full database.
const tables = {
  offers: ["commerce_private.offers", `tenant_id='${tenant}'`],
  drafts: ["commerce_private.product_quote_drafts", `tenant_id='${tenant}'`],
  evidence: ["commerce_private.product_quote_evidence", `tenant_id='${tenant}'`],
  issued: ["commerce_private.issued_product_quotes", `tenant_id='${tenant}'`],
  acceptance: [
    "commerce_private.order_acceptances",
    `offer_id in(select id from commerce_private.offers where tenant_id='${tenant}')`,
  ],
  intents: ["commerce_private.checkout_intents", `tenant_id='${tenant}'`],
  settlement: [
    "commerce_private.settlements",
    `intent_id in(select id from commerce_private.checkout_intents where tenant_id='${tenant}')`,
  ],
  funding: ["commerce_private.deposit_funding", `tenant_id='${tenant}'`],
  credit: ["commerce_private.credit_reservations", `case_id='${caseId}'`],
  custody: ["commerce_private.product_fulfilment_events", `tenant_id='${tenant}'`],
  notices: [
    "audit_private.transactional_notifications",
    `tenant_id='${tenant}' and source_kind='product_fulfilment'`,
  ],
  shipping: ["commerce_private.shipping_address_snapshots", `tenant_id='${tenant}'`],
  delivery: ["commerce_private.product_delivery_bindings", `tenant_id='${tenant}'`],
  prices: [
    "commerce_private.prices",
    `id in(select price_id from commerce_private.catalogue_price_bindings where catalogue_id='${catalogue}')`,
  ],
} as const;
async function snapshot() {
  const query =
    "select jsonb_build_object(" +
    Object.entries(tables)
      .map(
        ([name, [table, where]]) =>
          `'${name}',(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]') from ${table} r where ${where})`,
      )
      .join(",") +
    ") as records;";
  const r = await fetch(
    "https://api.supabase.com/v1/projects/gibfpolrdjotwvewgfsz/database/query",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: true }),
    },
  );
  assert(r.ok, "S15_RECORD_EXPORT_FAILED");
  return z
    .array(z.object({ records: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))) }))
    .parse(await r.json())[0]!.records;
}
const records = await snapshot();
assert(
  records.offers?.length === 2 &&
    records.issued?.length === 1 &&
    records.custody?.length === 7 &&
    records.notices?.length === 7,
  "S15_RECORD_CHAIN_INCOMPLETE",
);
const counts = Object.fromEntries(
  Object.entries(records).map(([name, rows]) => [name, rows.length]),
);
const payload = new TextEncoder().encode(JSON.stringify(records));
const checksum = createHash("sha256").update(payload).digest("hex");
const archiveKey = crypto.getRandomValues(new Uint8Array(32));
const archive = await encryptRecoveryArchive(
  {
    contract: "recovery.manifest",
    version: 1,
    createdAt: new Date().toISOString(),
    environment: "local",
    backupId: randomUUID(),
    schemaVersion: "20261020113457",
    recordCounts: counts,
    checksum,
  },
  payload,
  archiveKey,
  "s15-record-proof",
);
const restored = await decryptRecoveryArchive(JSON.parse(JSON.stringify(archive)), archiveKey);
assert(
  createHash("sha256").update(restored.payload).digest("hex") === checksum,
  "S15_RECORD_CHECKSUM_CHANGED",
);
let wrongKeyDenied = false;
try {
  await decryptRecoveryArchive(archive, crypto.getRandomValues(new Uint8Array(32)));
} catch {
  wrongKeyDenied = true;
}
assert(wrongKeyDenied, "S15_RECORD_WRONG_KEY_ACCEPTED");
// This is a scoped record-level roundtrip, not a Postgres schema/ACL restore.
// Full application-schema restore/quarantine is covered by the separate local packet.
const db = new Database(":memory:");
try {
  db.exec("create table restored_records(relation text not null,body text not null);");
  const insert = db.prepare("insert into restored_records values(?,?)");
  const decoded = JSON.parse(new TextDecoder().decode(restored.payload));
  for (const [name, rows] of Object.entries(decoded))
    for (const row of rows as unknown[]) insert.run(name, JSON.stringify(row));
  const scalar = (sql: string) => Object.values(db.query(sql).get() as Record<string, unknown>)[0];
  assert(
    scalar("select count(*) from restored_records where relation='custody'") === 7,
    "S15_RECORD_RESTORE_COUNT_CHANGED",
  );
  assert(
    scalar(
      "select count(*) from restored_records i join restored_records o on json_extract(i.body,'$.offer_id')=json_extract(o.body,'$.id') where i.relation='issued' and o.relation='offers'",
    ) === 1,
    "S15_RECORD_OFFER_CHAIN_BROKEN",
  );
  assert(
    scalar(
      "select count(*) from restored_records where relation='credit' and json_extract(body,'$.credit_minor')=99900",
    ) === 1,
    "S15_RECORD_CREDIT_CHAIN_BROKEN",
  );
  const address = records.shipping![0]!;
  await decryptShippingAddress(
    address.envelope,
    {
      tenantId: tenant,
      subjectId: z.uuid().parse(m.actors.patient.subject),
      caseId,
      snapshotId: z.uuid().parse(address.id),
      version: 1,
    },
    { "s15-shipping": Uint8Array.from(Buffer.from(c.shippingKey, "base64")) },
  );
} finally {
  db.close();
  archiveKey.fill(0);
}
const before = JSON.stringify(records);
const races = await Promise.all(
  Array.from({ length: 8 }, () =>
    fetch(productRehearsalOrigin + "/staff/products/fulfilment", {
      method: "POST",
      headers: {
        Origin: productRehearsalOrigin,
        "Sec-Fetch-Site": "same-origin",
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
        Cookie: `__Host-product-rehearsal=${c.accessKey}; ${m.actors.operations.cookie}`,
      },
      body: JSON.stringify({ action: "read", caseId }),
    }),
  ),
);
assert(
  races.every((r) => r.status === 401 || r.status === 403),
  "S15_REVOKED_CONCURRENT_ACCESS_ACCEPTED",
);
assert(JSON.stringify(await snapshot()) === before, "S15_DENIAL_CHANGED_RECORDS");
m.proofs.push({
  hostedSyntheticRecordRoundtrip: true,
  fullPostgresRestore: false,
  checksum: true,
  shippingDecryption: true,
  wrongArchiveKeyDenied: true,
  revokedConcurrentRequestsDenied: 8,
  recordsUnchanged: true,
});
writeFileSync(path, JSON.stringify(m), { mode: 0o600 });
console.log(
  JSON.stringify({
    recordCounts: counts,
    encryptedRoundtrip: true,
    shippingDecryption: true,
    wrongArchiveKeyDenied: true,
    revokedConcurrentRequestsDenied: 8,
    noProviderWrites: true,
  }),
);
