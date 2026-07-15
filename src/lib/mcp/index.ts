import { defineMcp } from "@lovable.dev/mcp-js";
import aboutMeneer from "./tools/about-meneer";
import howItWorks from "./tools/how-it-works";
import listTreatments from "./tools/list-treatments";

export default defineMcp({
  name: "meneer-mcp",
  title: "Meneer",
  version: "0.1.0",
  instructions:
    "Public information about Meneer, a South African men's health telehealth service. Use `about_meneer` for an overview, `list_treatments` for the treatment categories, and `how_it_works` for the patient journey.",
  tools: [aboutMeneer, listTreatments, howItWorks],
});
