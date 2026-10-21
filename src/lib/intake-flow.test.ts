import { expect, it } from "vitest";
import catalogue from "../../content/medical-intake-catalogue.json";
import { completeSyntheticAnswers } from "../../contracts/fixtures/medical-intake-synthetic";
import { createIntakeFlow } from "./intake-flow";
const { firstUnansweredIntakeStep, intakeStepForField, intakeSteps } = createIntakeFlow(catalogue);

it("moves only presentation order while preserving every source section and answer key", () => {
  expect(intakeSteps.map((step) => step.section)).toEqual([7, 1, 2, 3, 4, 5, 6, 8]);
  expect([...intakeSteps.map((step) => step.section)].sort()).toEqual(
    catalogue.sections.map((s) => s.id),
  );
  expect(intakeStepForField("categories")).toBe(1);
  expect(intakeStepForField("category_peptides")).toBe(1);
  expect(intakeStepForField("sex")).toBe(2);
  expect(intakeStepForField("signature")).toBe(8);
});
it("derives resume from actual required responses rather than visited pages", () => {
  expect(firstUnansweredIntakeStep({})).toBe(1);
  expect(
    firstUnansweredIntakeStep({
      categories: ["peptides"],
      category_peptides: { disposition: "none", text: "" },
    }),
  ).toBe(2);
  expect(firstUnansweredIntakeStep(completeSyntheticAnswers)).toBe(8);
});
