import { defineTool } from "@lovable.dev/mcp-js";

const steps = [
  { step: 1, title: "Complete your online intake", detail: "A short medical questionnaire — takes about 5 minutes." },
  { step: 2, title: "Consult with your doctor", detail: "A virtual consultation (video or phone) with one of our HPCSA-registered doctors, 15–20 minutes." },
  { step: 3, title: "Prescription and treatment plan", detail: "If clinically appropriate, your doctor issues a prescription and personalised plan." },
  { step: 4, title: "Medication delivered to your door", detail: "Discreet, plain packaging. Anywhere in South Africa." },
];

export default defineTool({
  name: "how_it_works",
  title: "How Meneer works",
  description:
    "Return the four-step Meneer patient journey: intake, virtual consult, prescription, discreet delivery.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(steps, null, 2) }],
    structuredContent: { steps },
  }),
});
