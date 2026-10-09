import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertLocalRecoveryEnvironment,
  buildLiveCommerceSuite,
  liveCommerceSuites,
} from "./live-commerce-rehearsal";

it.each(liveCommerceSuites)(
  "reuses fixed %s assertions with live release before intent creation and rollback",
  (suite) => {
    const source = readFileSync(`supabase/tests/database/${suite}.test.sql`, "utf8");
    const sql = buildLiveCommerceSuite(suite);
    expect(sql.startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("rollback;")).toBe(true);
    expect(sql).not.toContain("cs_test_");
    expect(sql).toContain("true,'live');");
    expect(sql.indexOf("insert into commerce_private.checkout_releases")).toBeLessThan(
      sql.indexOf("insert into commerce_private.checkout_intents"),
    );
    expect(sql).toContain("public.apply_commerce_provider_event(");
    if (source.includes("public.apply_pilot_provider_event_before_reconciliation"))
      expect(sql).toContain("public.apply_pilot_provider_event_before_reconciliation");
    for (const invalid of [
      source.replace("rollback;", "commit;"),
      source.replace(
        "insert into commerce_private.checkout_releases values(",
        "insert into commerce_private.other_releases values(",
      ),
      source.replace("begin;", "begin;\ncommit;"),
      source.replaceAll("public.apply_pilot_provider_event(", "public.other("),
    ])
      expect(() => buildLiveCommerceSuite(suite, invalid)).toThrow();
  },
);
it("rejects inherited hosted/provider credentials and arbitrary suite names", () => {
  for (const name of [
    "STRIPE_LIVE_RESTRICTED_KEY",
    "SUPABASE_URL",
    "COMMERCE_CHECKOUT_MODE",
    "HOSTED_TARGET",
  ])
    expect(() => assertLocalRecoveryEnvironment({ [name]: "synthetic" })).toThrow();
  expect(() => buildLiveCommerceSuite("arbitrary" as never)).toThrow();
});
