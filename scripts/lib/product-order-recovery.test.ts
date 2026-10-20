import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  assertProductRecoveryDatabase,
  buildProductRecoveryFixture,
  productRecoverySchemas,
} from "./product-order-recovery";
it("permits only fixed local baseline or manifested disposable restore databases", () => {
  const id = "product_restore_" + "a".repeat(32);
  expect(() => assertProductRecoveryDatabase("postgres", [])).not.toThrow();
  expect(() => assertProductRecoveryDatabase(id, [id])).not.toThrow();
  for (const target of [
    id,
    "production",
    "supabase",
    "product_restore_bad",
    "postgres;drop database postgres",
  ])
    expect(() => assertProductRecoveryDatabase(target, [])).toThrow();
  expect(productRecoverySchemas).not.toContain("auth");
});
it("retains the fixed local assertions while committing only inside disposable source", () => {
  const source = readFileSync("supabase/tests/database/manual_product_fulfilment.test.sql", "utf8");
  const packet = buildProductRecoveryFixture(source);
  expect(packet).toContain("select * from finish();");
  expect(packet.trim().endsWith("commit;")).toBe(true);
  expect(packet.replace(/commit;\s*$/, "rollback;\n")).toBe(source.replace(/\s*$/, "\n"));
  for (const changed of [
    source.replace("begin;", ""),
    source.replace("rollback;", "commit;"),
    source.replace("select * from finish();", "commit;\nselect * from finish();"),
  ])
    expect(() => buildProductRecoveryFixture(changed)).toThrow();
});
