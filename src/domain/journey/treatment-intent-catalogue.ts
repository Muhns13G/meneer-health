export type TreatmentIntent = "hair" | "ed" | "weight" | "trt";

export const treatmentIntentWireIds = Object.freeze({
  hair: "f78b1764-6838-4df7-92d7-a715a24ab247",
  ed: "68211ec1-8594-4a6e-a003-e027871b9345",
  weight: "74daf768-b1ee-4c25-9284-d8e875bd0282",
  trt: "211137a7-7d1d-4381-aa68-655379397363",
} as const satisfies Readonly<Record<TreatmentIntent, string>>);
