import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertLocalRecoveryEnvironment,
  recoveryBaselineSql,
  validateRecoveryBaseline,
} from "./sprint13-recovery-rehearsal";

export { assertLocalRecoveryEnvironment, recoveryBaselineSql, validateRecoveryBaseline };
export const liveCommerceSuites = [
  "pilot_payment_reconciliation",
  "pilot_reconciliation_completion",
] as const;
export type LiveCommerceSuite = (typeof liveCommerceSuites)[number];

// Reuse the reviewed financial assertions rather than maintaining a divergent live copy.
// Fixed source files/account only; this runner never accepts a URL, credential or arbitrary SQL.
export function buildLiveCommerceSuite(suite: LiveCommerceSuite, source?: string) {
  if (!liveCommerceSuites.includes(suite)) throw new Error("LIVE_COMMERCE_SUITE_REJECTED");
  const sql =
    source ??
    readFileSync(resolve(process.cwd(), `supabase/tests/database/${suite}.test.sql`), "utf8");
  const release =
    "insert into commerce_private.checkout_releases values('10000000-0000-4000-8000-000000000001','acct_synthetic12345',gen_random_uuid(),now()+interval '1 hour',true);";
  const callback =
    "public.apply_pilot_provider_event('80000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','acct_synthetic12345',";
  if (!/^begin;\s/.test(sql) || !/\nrollback;\s*$/.test(sql))
    throw new Error("LIVE_COMMERCE_BOUNDARY_REJECTED");
  let body = sql.replace(/^begin;\s*/, "").replace(/\nrollback;\s*$/, "");
  if (
    /^\s*(begin|commit|rollback)\s*;/im.test(body) ||
    body.split(release).length !== 2 ||
    body.split(callback).length - 1 !== (suite === "pilot_payment_reconciliation" ? 2 : 1) ||
    !body.includes("cs_test_") ||
    !body.includes("insert into commerce_private.checkout_intents(")
  )
    throw new Error("LIVE_COMMERCE_FIXTURE_DRIFT");
  body = body.replace(release, "");
  body = body.replace(
    "insert into commerce_private.checkout_intents(",
    release.replace("true);", "true,'live');") + "\ninsert into commerce_private.checkout_intents(",
  );
  body = body.replaceAll(
    callback,
    callback.replace("apply_pilot_provider_event", "apply_commerce_provider_event") + "'live',",
  );
  body = body.replaceAll("cs_test_", "cs_live_");
  return `begin;\nset local statement_timeout='45s';\nset local lock_timeout='5s';\n${body}\nrollback;`;
}
