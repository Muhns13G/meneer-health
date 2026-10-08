import { execFileSync } from "node:child_process";
import { countRehearsalAssertions } from "./lib/sprint10-rehearsal";
import {
  assertLocalMobileEnvironment,
  buildMobileSecuritySuite,
  mobileSecurityBaselineSql,
  mobileSecuritySuites,
  validateMobileSecurityBaseline,
} from "./lib/sprint14-security";

assertLocalMobileEnvironment(process.env);
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
let currentSuite: string = "baseline";
try {
  const baseline = validateMobileSecurityBaseline(sql(mobileSecurityBaselineSql));
  for (const suite of mobileSecuritySuites) {
    currentSuite = suite;
    assertions += countRehearsalAssertions(sql(buildMobileSecuritySuite(suite)));
    if (validateMobileSecurityBaseline(sql(mobileSecurityBaselineSql)) !== baseline)
      throw new Error("MOBILE_SECURITY_BASELINE_CHANGED");
  }
} catch (error) {
  const reason =
    error instanceof Error &&
    [
      "MOBILE_SECURITY_BASELINE_CHANGED",
      "SPRINT10_REHEARSAL_ASSERTIONS_FAILED",
      "SPRINT13_HANDOFF_BASELINE_INVALID",
    ].includes(error.message)
      ? error.message
      : "SQL_EXECUTION_FAILED";
  throw new Error(`MOBILE_SECURITY_FAILED:${currentSuite}:${reason}`);
}
console.log(
  JSON.stringify({
    exercise: "local-mobile-security",
    suites: mobileSecuritySuites.length,
    assertions,
    rollbackOnly: true,
    rowSecurityTriggerFunctionBaselineRestored: true,
    hosted: false,
    emailsSent: 0,
    smsSent: 0,
  }),
);
