// Synthetic portability and application fixtures; never a client record.
const negative = { disposition: "none" as const, text: "" };
export const completeSyntheticAnswers = {
  full_name: "Synthetic Client",
  date_of_birth: "1990-01-01",
  sex: "male" as const,
  measurements: { heightCm: 180, weightKg: 80 },
  health_history: negative,
  medications: negative,
  allergies: negative,
  diagnosed_conditions: { disposition: "none" as const, values: [] },
  family_history: negative,
  lifestyle: negative,
  mental_history: negative,
  mental_safety: "no" as const,
  sexual_history: negative,
  sti_symptoms: "no" as const,
  categories: ["peptides" as const],
  category_peptides: negative,
  accuracy_declaration: true,
  doctor_review_consent: true,
  signature: "Synthetic Client",
};
