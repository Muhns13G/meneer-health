import { execFileSync } from "node:child_process";
import { countRehearsalAssertions } from "./lib/sprint10-rehearsal";
import {
  assertLocalHandoffEnvironment,
  buildSprint13HandoffSuite,
  handoffBaselineSql,
  sprint13HandoffSuites,
  validateHandoffBaseline,
} from "./lib/sprint13-handoff-rehearsal";

assertLocalHandoffEnvironment(process.env);
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
  const baseline = validateHandoffBaseline(sql(handoffBaselineSql));
  for (const suite of sprint13HandoffSuites) {
    currentSuite = suite;
    assertions += countRehearsalAssertions(sql(buildSprint13HandoffSuite(suite)));
    if (validateHandoffBaseline(sql(handoffBaselineSql)) !== baseline) {
      throw new Error("SPRINT13_HANDOFF_BASELINE_CHANGED");
    }
  }
} catch (error) {
  // Never expose a PostgreSQL diagnostic that could contain fixture answers or credentials.
  const reason =
    error instanceof Error &&
    [
      "SPRINT10_REHEARSAL_ASSERTIONS_FAILED",
      "SPRINT13_HANDOFF_BASELINE_CHANGED",
      "SPRINT13_HANDOFF_BASELINE_INVALID",
    ].includes(error.message)
      ? error.message
      : "SQL_EXECUTION_FAILED";
  throw new Error(`SPRINT13_HANDOFF_LOCAL_REHEARSAL_FAILED:${currentSuite}:${reason}`);
}
console.log(
  JSON.stringify({
    exercise: "sprint13-handoff-local",
    suites: sprint13HandoffSuites.length,
    assertions,
    rollbackOnly: true,
    rowFingerprintsRestored: true,
    securityMetadataRestored: true,
    paymentAndTransferDefinitionsUnchanged: true,
    positivePaymentEvidence: "rollback-only-synthetic",
    hosted: false,
    providerContacted: false,
    currentGeneratorCompatibilityProven: false,
    medicalAnswersLogged: false,
  }),
);
