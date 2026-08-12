import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Treatments } from "@/components/Treatments";
import { treatmentIntentWireIds } from "@/domain/journey/treatment-intent-catalogue";
import { renderWithRouter } from "@/test/render-with-router";

describe("treatment journey entry", () => {
  it("posts opaque selections without placing health intent in a URL", async () => {
    const { container } = await renderWithRouter(<Treatments />);
    const forms = Array.from(container.querySelectorAll<HTMLFormElement>("form"));

    expect(forms).toHaveLength(4);
    expect(forms.every((form) => form.action.endsWith("/api/journey/intent"))).toBe(true);
    expect(forms.every((form) => form.method === "post")).toBe(true);
    expect(
      forms.map((form) => form.querySelector<HTMLInputElement>('input[name="selection"]')?.value),
    ).toEqual(Object.values(treatmentIntentWireIds));
    expect(
      forms.every((form) => !/[?&](condition|treatment|health_intent)=/i.test(form.action)),
    ).toBe(true);
  });

  it("retains the dedicated peptide route and generic start link", async () => {
    await renderWithRouter(<Treatments />);

    expect(screen.getByRole("link", { name: /Precision, at a cellular level/i })).toHaveAttribute(
      "href",
      "/peptides",
    );
    expect(screen.getByRole("link", { name: "Find your match →" })).toHaveAttribute(
      "href",
      "/start",
    );
  });
});
