import { intakeSubmissionErrors, type IntakeAnswers } from "../../contracts/medical-intake";

export function createIntakeFlow(catalogue: {
  sections: readonly { id: number; title: string }[];
  items: readonly { id: string; section: number }[];
}) {
  // Presentation order only. Never renumber the source instrument or stored answer keys.
  const intakeSteps = [7, 1, 2, 3, 4, 5, 6, 8].map((section) => ({
    section,
    title:
      section === 7
        ? "Treatment interests"
        : catalogue.sections.find((item) => item.id === section)!.title.replace(/^\d+\. /, ""),
  }));

  function intakeStepForField(key: string): number {
    const section =
      catalogue.items.find((item) => item.id === key)?.section ?? (key === "categories" ? 7 : 1);
    return intakeSteps.findIndex((item) => item.section === section) + 1;
  }

  function firstUnansweredIntakeStep(answers: IntakeAnswers): number {
    const steps = Object.keys(intakeSubmissionErrors(answers)).map(intakeStepForField);
    return steps.length ? Math.min(...steps) : intakeSteps.length;
  }
  return { intakeSteps, intakeStepForField, firstUnansweredIntakeStep };
}
