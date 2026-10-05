import { z } from "zod";
import type { ContractDefinition } from "./catalogue";

export const medicalIntakeContract = {
  name: "medical-intake.record",
  kind: "result",
  owner: "Protected medical intake module",
  consumers: ["Authorised intake service", "Successor framework adapters"],
  version: 1,
  sensitivity: "special-personal-information",
  idempotency: "required",
  lifecycle: "active",
} as const satisfies ContractDefinition;
export const intakeVersion = "1.1.0" as const;
export const intakeControlVersion = "1.0.0" as const;
const text = (maximum: number) =>
  z
    .string()
    .max(maximum)
    .refine((v) =>
      [...v].every((c) => {
        const n = c.codePointAt(0)!;
        return (
          (n === 9 || n === 10 || n === 13 || (n >= 32 && n !== 127)) &&
          !(n >= 0xd800 && n <= 0xdfff)
        );
      }),
    );
const answer = z
  .object({ disposition: z.enum(["provided", "none", "unknown", "declined"]), text: text(4000) })
  .strict()
  .superRefine((v, c) => {
    if (v.disposition !== "provided" && v.text !== "")
      c.addIssue({ code: "custom", message: "Answer and disposition must agree." });
  });
export const intakeCategories = ["ed", "hair", "weight", "trt", "peptides"] as const;
export const intakeConditions = [
  "heart_disease",
  "high_blood_pressure",
  "diabetes",
  "kidney_disease",
  "liver_disease",
  "thyroid_disorder",
] as const;
const date = z.iso
  .date()
  .refine((v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
const measurement = z
  .number()
  .positive()
  .finite()
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7);
export const intakeAnswersSchema = z
  .object({
    full_name: text(200).optional(),
    date_of_birth: date.optional(),
    identity_document: z
      .object({ type: z.enum(["id", "passport"]), number: text(64) })
      .strict()
      .optional(),
    sex: z.enum(["male", "female", "intersex", "prefer_not_to_say"]).optional(),
    measurements: z
      .object({ heightCm: measurement.optional(), weightKg: measurement.optional() })
      .strict()
      .optional(),
    gp_contact: text(500).optional(),
    health_history: answer.optional(),
    medications: answer.optional(),
    allergies: answer.optional(),
    diagnosed_conditions: z
      .object({
        disposition: z.enum(["provided", "none", "unknown"]),
        values: z.array(z.enum(intakeConditions)).max(6),
      })
      .strict()
      .refine(
        (v) =>
          new Set(v.values).size === v.values.length &&
          (v.disposition === "provided" || v.values.length === 0),
      )
      .optional(),
    family_history: answer.optional(),
    lifestyle: answer.optional(),
    mental_history: answer.optional(),
    mental_safety: z.enum(["yes", "no"]).optional(),
    sexual_history: answer.optional(),
    sti_symptoms: z.enum(["yes", "no"]).optional(),
    categories: z
      .array(z.enum(intakeCategories))
      .max(5)
      .refine((v) => new Set(v).size === v.length)
      .optional(),
    category_ed: answer.optional(),
    category_hair: answer.optional(),
    category_weight: answer.optional(),
    category_trt: answer.optional(),
    category_peptides: answer.optional(),
    accuracy_declaration: z.boolean().optional(),
    doctor_review_consent: z.boolean().optional(),
    signature: text(200).optional(),
  })
  .strict()
  .refine((v) => new TextEncoder().encode(JSON.stringify(v)).length <= 65536);
export type IntakeAnswers = z.infer<typeof intakeAnswersSchema>;
// Fixed vocabulary also defines the maximum grant scope; never accept arbitrary JSON paths.
export const medicalFieldIds = [
  "full_name",
  "date_of_birth",
  "identity_document",
  "sex",
  "contact",
  "measurements",
  "gp_contact",
  "health_history",
  "medications",
  "allergies",
  "diagnosed_conditions",
  "family_history",
  "lifestyle",
  "mental_history",
  "mental_safety",
  "sexual_history",
  "sti_symptoms",
  "categories",
  "category_ed",
  "category_hair",
  "category_weight",
  "category_trt",
  "category_peptides",
  "accuracy_declaration",
  "doctor_review_consent",
  "signature",
] as const;
export function submittedIntake(input: unknown, now = new Date()): IntakeAnswers {
  const value = intakeAnswersSchema.parse(input);
  const required = [
    "full_name",
    "date_of_birth",
    "sex",
    "measurements",
    "health_history",
    "medications",
    "allergies",
    "diagnosed_conditions",
    "family_history",
    "lifestyle",
    "mental_history",
    "mental_safety",
    "sexual_history",
    "sti_symptoms",
    "signature",
  ] as const;
  if (
    required.some((k) => value[k] === undefined) ||
    !value.full_name?.trim() ||
    !value.signature?.trim() ||
    (value.identity_document !== undefined && !value.identity_document.number.trim()) ||
    value.measurements?.heightCm === undefined ||
    value.measurements?.weightKg === undefined ||
    !value.categories?.length ||
    value.accuracy_declaration !== true ||
    value.doctor_review_consent !== true ||
    value.date_of_birth! > now.toISOString().slice(0, 10)
  )
    throw new Error("INTAKE_INCOMPLETE");
  if (
    value.diagnosed_conditions?.disposition === "provided" &&
    value.diagnosed_conditions.values.length === 0
  )
    throw new Error("INTAKE_INCOMPLETE");
  for (const category of intakeCategories) {
    const k = `category_${category}` as keyof IntakeAnswers;
    if (value.categories.includes(category)) {
      if (value[k] === undefined) throw new Error("INTAKE_INCOMPLETE");
    } else delete value[k];
  }
  for (const candidate of Object.values(value)) {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      "disposition" in candidate &&
      candidate.disposition === "provided" &&
      "text" in candidate &&
      typeof candidate.text === "string" &&
      !candidate.text.trim()
    )
      throw new Error("INTAKE_INCOMPLETE");
  }
  return value;
}
const uuid = z.uuid();
export function intakeSubmissionErrors(input: unknown, now = new Date()): Record<string, string> {
  const parsed = intakeAnswersSchema.safeParse(input);
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues)
      errors[String(issue.path[0] ?? "questionnaire")] =
        "Check this response and its length or format.";
    return errors;
  }
  const v = parsed.data;
  for (const key of [
    "full_name",
    "date_of_birth",
    "sex",
    "measurements",
    "health_history",
    "medications",
    "allergies",
    "diagnosed_conditions",
    "family_history",
    "lifestyle",
    "mental_history",
    "mental_safety",
    "sexual_history",
    "sti_symptoms",
    "signature",
  ] as const)
    if (v[key] === undefined || v[key] === "") errors[key] = "This response is required.";
  if (v.date_of_birth && v.date_of_birth > now.toISOString().slice(0, 10))
    errors.date_of_birth = "Enter a date of birth that is not in the future.";
  if (v.identity_document && !v.identity_document.number.trim())
    errors.identity_document = "Enter a document number or choose Not provided.";
  if (v.measurements?.heightCm === undefined || v.measurements?.weightKg === undefined)
    errors.measurements = "Enter both height in centimetres and weight in kilograms.";
  if (!v.categories?.length) errors.categories = "Choose at least one category.";
  for (const category of v.categories ?? []) {
    const key = `category_${category}` as const;
    if (v[key] === undefined) errors[key] = "Give an explicit response for this selected category.";
  }
  for (const [key, a] of Object.entries(v)) {
    if (
      a &&
      typeof a === "object" &&
      "disposition" in a &&
      a.disposition === "provided" &&
      "text" in a &&
      typeof a.text === "string" &&
      !a.text.trim()
    )
      errors[key] = "Provide details, or choose an explicit alternative response.";
  }
  if (v.diagnosed_conditions?.disposition === "provided" && !v.diagnosed_conditions.values.length)
    errors.diagnosed_conditions =
      "Select the diagnosed conditions, or choose an explicit alternative response.";
  if (v.accuracy_declaration !== true)
    errors.accuracy_declaration = "Confirm the accuracy declaration before submission.";
  if (v.doctor_review_consent !== true)
    errors.doctor_review_consent = "Record the separate doctor-review consent before submission.";
  if (!v.signature?.trim()) errors.signature = "Type your full name for this submission.";
  return errors;
}
export const intakeScopeSchema = z
  .object({
    tenantId: uuid,
    subjectId: uuid,
    intakeId: uuid,
    snapshotId: uuid,
    collectionVersion: z.literal(intakeVersion),
    controlVersion: z.literal(intakeControlVersion),
  })
  .strict();
export type IntakeScope = z.infer<typeof intakeScopeSchema>;
export const intakeEnvelopeSchema = z
  .object({
    algorithm: z.literal("AES-256-GCM"),
    keyId: z.string().regex(/^[a-z0-9-]{1,48}$/),
    scope: intakeScopeSchema,
    nonce: z.string().regex(/^[A-Za-z0-9+/]{16}$/),
    ciphertext: z
      .string()
      .regex(/^[A-Za-z0-9+/]+={0,2}$/)
      .min(24)
      .max(100000),
  })
  .strict();
export type IntakeEnvelope = z.infer<typeof intakeEnvelopeSchema>;
export const medicalIntakeRecordSchema = z
  .object({
    contract: z.literal("medical-intake.record"),
    version: z.literal(1),
    scope: intakeScopeSchema,
    recordVersion: z.number().int().positive(),
    state: z.enum(["draft", "submitted", "restricted", "deleted"]),
    envelope: intakeEnvelopeSchema.nullable(),
    safetyHold: z.boolean(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()
  .refine((v) =>
    v.envelope === null
      ? v.state === "deleted"
      : JSON.stringify(v.envelope.scope) === JSON.stringify(v.scope),
  );
