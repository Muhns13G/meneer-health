import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { supportChannels } from "@/lib/support-channels";
import { Route as ContactRoute } from "@/routes/contact";
import { renderWithRouter } from "@/test/render-with-router";

describe("support and emergency surfaces", () => {
  it("publishes only verified interactive channels and marks dedicated channels unavailable", async () => {
    expect(supportChannels.dedicated).toEqual({
      clinical: "unavailable",
      complaint: "unavailable",
      privacy: "unavailable",
    });
    const ContactPage = ContactRoute.options.component;
    if (!ContactPage) throw new Error("CONTACT_ROUTE_COMPONENT_MISSING");
    await renderWithRouter(<ContactPage />);

    expect(screen.getByRole("link", { name: supportChannels.general.email })).toHaveAttribute(
      "href",
      supportChannels.general.href,
    );
    expect(screen.getByRole("link", { name: "112 from a mobile" })).toHaveAttribute(
      "href",
      supportChannels.emergency.mobile.href,
    );
    expect(screen.getByRole("link", { name: "10177 for an ambulance" })).toHaveAttribute(
      "href",
      supportChannels.emergency.ambulance.href,
    );

    for (const heading of ["Privacy and data requests", "Complaints", "Clinical questions"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getAllByText("Dedicated channel unavailable")).toHaveLength(2);
    expect(
      screen.getByText(/No clinical-question or adverse-event channel is active/),
    ).toBeVisible();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
