import { execFileSync } from "node:child_process";
import { countRehearsalAssertions } from "./lib/sprint10-rehearsal";
import {
  assertLocalEvidenceEnvironment,
  buildSprint13EvidenceSuite,
  evidenceBaselineSql,
  sprint13EvidenceSuites,
  validateEvidenceBaseline,
} from "./lib/sprint13-evidence-rehearsal";

assertLocalEvidenceEnvironment(process.env);
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
  const baseline = validateEvidenceBaseline(sql(evidenceBaselineSql));
  for (const suite of sprint13EvidenceSuites) {
    currentSuite = suite;
    assertions += countRehearsalAssertions(sql(buildSprint13EvidenceSuite(suite)));
    if (validateEvidenceBaseline(sql(evidenceBaselineSql)) !== baseline) {
      throw new Error("SPRINT13_EVIDENCE_BASELINE_CHANGED");
    }
  }
} catch {
  // Raw SQL diagnostics may contain sensitive values; never emit them or a cause.
  throw new Error(`SPRINT13_EVIDENCE_LOCAL_FAILED:${currentSuite}`);
}
console.log(
  JSON.stringify({
    exercise: "sprint13-evidence-local",
    suites: sprint13EvidenceSuites.length,
    assertions,
    rollbackOnly: true,
    rowSecurityTriggerFunctionBaselineRestored: true,
    hosted: false,
    providerContacted: false,
    generatorContacted: false,
  }),
);
