import { execFileSync } from "node:child_process";
import { countRehearsalAssertions } from "./lib/sprint10-rehearsal";
import {
  assertLocalRecoveryEnvironment,
  buildLiveCommerceSuite,
  liveCommerceSuites,
  recoveryBaselineSql,
  validateRecoveryBaseline,
} from "./lib/live-commerce-rehearsal";

assertLocalRecoveryEnvironment(process.env);
function sql(input: string) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_meneer-health-local",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
}
let assertions = 0;
try {
  const baseline = validateRecoveryBaseline(sql(recoveryBaselineSql));
  for (const suite of liveCommerceSuites) {
    assertions += countRehearsalAssertions(sql(buildLiveCommerceSuite(suite)));
    if (validateRecoveryBaseline(sql(recoveryBaselineSql)) !== baseline)
      throw new Error("LIVE_COMMERCE_BASELINE_CHANGED");
  }
} catch {
  // SQL/provider contents never belong in diagnostics.
  throw new Error("LIVE_COMMERCE_LOCAL_REHEARSAL_FAILED");
}
console.log(
  JSON.stringify({
    exercise: "live-commerce-local",
    suites: liveCommerceSuites.length,
    assertions,
    rollbackOnly: true,
    baselineRestored: true,
    hosted: false,
    providerContacted: false,
  }),
);
