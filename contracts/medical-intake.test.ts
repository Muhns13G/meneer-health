import { describe, expect, it } from "vitest";
import { intakeAnswersSchema, submittedIntake } from "./medical-intake";
import catalogue from "../content/medical-intake-catalogue.json";
import { completeSyntheticAnswers } from "./fixtures/medical-intake-synthetic";
describe("portable medical intake payload", () => {
  it("keeps eight sections, original 24 items and separate unselected sex extension", () => {
    expect(catalogue.sections).toHaveLength(8);
    expect(catalogue.items).toHaveLength(24);
    expect(catalogue.extensions[0]!.defaultValue).toBeNull();
    expect(catalogue.items.map((x) => x.id)).not.toContain("sex");
    expect(catalogue.items.some((x) => /PHQ-9|Questions for you/.test(x.prompt))).toBe(false);
  });
  it("allows a partial draft without invented normal answers", () => {
    expect(intakeAnswersSchema.parse({})).toEqual({});
  });
  it("submits explicit answers without a blood or deposit requirement", () => {
    expect(submittedIntake(completeSyntheticAnswers).categories).toEqual(["peptides"]);
  });
  it("requires a deliberate sex answer", () => {
    expect(() => submittedIntake({ ...completeSyntheticAnswers, sex: undefined })).toThrow();
  });
  it("removes inactive branches from submitted snapshot without altering the draft", () => {
    const draft = {
      ...completeSyntheticAnswers,
      category_ed: { disposition: "provided", text: "Synthetic inactive branch" },
    };
    expect(submittedIntake(draft)).not.toHaveProperty("category_ed");
    expect(draft.category_ed.text).toBe("Synthetic inactive branch");
  });
  it.each([
    { ...completeSyntheticAnswers, bloods: "excluded" },
    { ...completeSyntheticAnswers, mental_safety: undefined },
    { ...completeSyntheticAnswers, date_of_birth: "2999-01-01" },
    { ...completeSyntheticAnswers, signature: "" },
    { ...completeSyntheticAnswers, categories: ["peptides", "peptides"] },
    { ...completeSyntheticAnswers, allergies: { disposition: "none", text: "contradiction" } },
  ])("rejects missing false extra or contradictory submission values", (input) => {
    expect(() => submittedIntake(input)).toThrow();
  });
});
