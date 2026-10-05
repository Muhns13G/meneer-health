import { execFileSync } from "node:child_process";
import {
  assertLocalRehearsalEnvironment,
  buildSprint10Rehearsal,
  countRehearsalAssertions,
  sprint10RehearsalSuites,
} from "./lib/sprint10-rehearsal";

assertLocalRehearsalEnvironment(process.env);
const args = [
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
];
function sql(input: string): string {
  return execFileSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
}
// Counts stay inside a hash; never print row values or credentials. Compare before/after every suite.
const inventory = `do $$declare t record; n bigint; values text:=''; begin
for t in select schemaname,tablename from pg_tables where schemaname in
('public','identity_private','intake_private','audit_private','auth') order by schemaname,tablename loop
execute format('select count(*) from %I.%I',t.schemaname,t.tablename) into n;
values:=values||t.schemaname||'.'||t.tablename||':'||n::text||';'; end loop;
perform set_config('meneer.rehearsal_inventory',md5(values),false); end$$;
select current_setting('meneer.rehearsal_inventory'),md5(pg_get_functiondef('identity_private.handoff_payment_ready(uuid)'::regprocedure)||pg_get_functiondef('intake_private.review_payment_ready(uuid)'::regprocedure));`;
const baseline = sql(inventory);
let assertions = 0;
for (const suite of sprint10RehearsalSuites) {
  try {
    assertions += countRehearsalAssertions(sql(buildSprint10Rehearsal(suite)));
    if (sql(inventory) !== baseline) throw new Error("ROLLBACK_BASELINE_CHANGED");
  } catch {
    // Do not rethrow subprocess stderr: an arbitrary SQL error can contain private values.
    throw new Error(`SPRINT10_REHEARSAL_FAILED:${suite}`);
  }
}
console.log(
  JSON.stringify({
    exercise: "sprint10-rehearsal",
    suites: sprint10RehearsalSuites.length,
    assertions,
    rollbackOnly: true,
    baselineRestored: true,
    paymentAdaptersUnchanged: true,
    hosted: false,
    emailSent: false,
    providerContacted: false,
    rowContentLogged: false,
  }),
);
