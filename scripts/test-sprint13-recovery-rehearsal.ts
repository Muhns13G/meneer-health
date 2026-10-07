import { execFileSync } from "node:child_process";
import { countRehearsalAssertions } from "./lib/sprint10-rehearsal";
import {
  assertLocalRecoveryEnvironment,
  buildSprint13RecoverySuite,
  recoveryBaselineSql,
  sprint13RecoverySuites,
  validateRecoveryBaseline,
} from "./lib/sprint13-recovery-rehearsal";

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
let currentSuite: string = "baseline";
try {
  const baseline = validateRecoveryBaseline(sql(recoveryBaselineSql));
  for (const suite of sprint13RecoverySuites) {
    currentSuite = suite;
    assertions += countRehearsalAssertions(sql(buildSprint13RecoverySuite(suite)));
    if (validateRecoveryBaseline(sql(recoveryBaselineSql)) !== baseline) {
      throw new Error("SPRINT13_RECOVERY_BASELINE_CHANGED");
    }
  }
} catch (error) {
  // SQL diagnostics can contain private values. Expose only the fixed suite and safe reason.
  const reason =
    error instanceof Error &&
    [
      "SPRINT10_REHEARSAL_ASSERTIONS_FAILED",
      "SPRINT13_RECOVERY_BASELINE_CHANGED",
      "SPRINT13_HANDOFF_BASELINE_INVALID",
      "SPRINT13_RECOVERY_ROLLBACK_BOUNDARY_MISSING",
      "SPRINT13_RECOVERY_TRANSACTION_REJECTED",
    ].includes(error.message)
      ? error.message
      : "SQL_EXECUTION_FAILED";
  throw new Error(`SPRINT13_RECOVERY_LOCAL_REHEARSAL_FAILED:${currentSuite}:${reason}`);
}
console.log(
  JSON.stringify({
    exercise: "sprint13-recovery-local",
    suites: sprint13RecoverySuites.length,
    assertions,
    rollbackOnly: true,
    rowFingerprintsRestored: true,
    securityMetadataRestored: true,
    functionDefinitionsUnchanged: true,
    paymentEvidence: "rollback-only-synthetic",
    hosted: false,
    providerContacted: false,
    generatorContacted: false,
  }),
);
