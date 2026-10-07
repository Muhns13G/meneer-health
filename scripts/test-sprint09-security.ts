import { execFileSync } from "node:child_process";
import { buildSprint09SecurityProof, sprint09SecuritySuites } from "./lib/sprint09-security-proof";

// Local-only runner. Hosted SQL packets go through explicitly approved MCP/SQL review instead.
if (process.env.SUPABASE_INTEGRATION_TARGET || process.env.SUPABASE_DB_URL)
  throw new Error("SPRINT09_LOCAL_RUNNER_HOSTED_TARGET_REJECTED");

let checks = 0;
for (const suite of sprint09SecuritySuites) {
  const output = execFileSync(
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
      input: buildSprint09SecurityProof(suite, "local"),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const lines = output.split("\n");
  const passed = lines.filter((line) => /^ok \d+\b/.test(line)).length;
  const plan = lines.find((line) => /^1\.\.\d+$/.test(line));
  if (
    lines.some((line) => /^not ok\b|^#.*(?:failed|Looks like)/i.test(line)) ||
    !plan ||
    passed !== Number(plan.slice(3))
  )
    throw new Error(`SPRINT09_SECURITY_FAILED:${suite}`);
  checks += passed;
}
console.log(
  JSON.stringify({
    exercise: "sprint09-security",
    suites: sprint09SecuritySuites.length,
    assertions: checks,
    rollbackOnly: true,
    rowContentLogged: false,
    hosted: false,
  }),
);
