import { runControlledIncidentExercise } from "../src/application/observability/controlled-incident-exercise";

const report = runControlledIncidentExercise();
if (report.outcome !== "passed") throw new Error("Controlled incident exercise failed.");
console.log(JSON.stringify(report));
