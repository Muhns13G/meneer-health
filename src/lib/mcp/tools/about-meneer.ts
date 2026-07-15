import { defineTool } from "@lovable.dev/mcp-js";

const about = {
  name: "Meneer",
  tagline: "Sorted, sir.",
  country: "South Africa",
  description:
    "Meneer is a South African direct-to-consumer men's health telehealth platform. Virtual consultations with HPCSA-registered doctors, prescription treatments, and discreet delivery anywhere in SA.",
  trust: [
    "HPCSA-registered doctors",
    "Discreet, plain-packaging delivery",
    "POPIA-compliant handling of medical data",
  ],
  website: "meneer.co.za",
};

export default defineTool({
  name: "about_meneer",
  title: "About Meneer",
  description: "Return a summary of what Meneer is, who it serves, and its trust markers.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(about, null, 2) }],
    structuredContent: about,
  }),
});
