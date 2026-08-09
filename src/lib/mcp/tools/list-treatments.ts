import { defineTool } from "@lovable.dev/mcp-js";

const treatments = [
  {
    id: "peptides",
    category: "Peptides",
    title: "Precision, at a cellular level.",
    description:
      "Peptide treatment, medically guided. Doctor-led peptide therapy for recovery, performance, and longevity.",
  },
  {
    id: "hair-loss",
    category: "Hair loss",
    title: "Hair today. Still here tomorrow.",
    description:
      "Clinically proven treatments for male pattern hair loss, prescribed by HPCSA-registered doctors.",
  },
  {
    id: "ed",
    category: "Erectile dysfunction",
    title: "Hard, made easy.",
    description:
      "Discreet, prescription-based treatment for ED. Virtual consult, no awkward pharmacy visits.",
  },
  {
    id: "weight",
    category: "Weight management",
    title: "Less of you, more of you.",
    description:
      "Medical weight management programmes tailored to South African men, delivered to your door.",
  },
  {
    id: "trt",
    category: "Testosterone / TRT",
    title: "Energy you forgot you had.",
    description:
      "Testosterone replacement therapy for men with clinically low T, monitored by our doctor team.",
  },
];

export default defineTool({
  name: "list_treatments",
  title: "List Meneer treatments",
  description:
    "Return the men's health treatment categories offered by Meneer (peptides, hair loss, ED, weight management, TRT).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(treatments, null, 2) }],
    structuredContent: { treatments },
  }),
});
