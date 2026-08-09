import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PilotRouteGate } from "@/components/PilotRouteGate";
import { SafetyEntryGate } from "@/components/SafetyEntryGate";
import { pilotGateFixture } from "@/test/fixtures/non-production";
import { renderWithRouter } from "@/test/render-with-router";

describe("inactive journey gates", () => {
  it("renders the start safety boundary without a submission surface", async () => {
    await renderWithRouter(<SafetyEntryGate />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Start your private consult" }),
    ).toBeVisible();
    expect(screen.getByText(/No health information is collected from this page/)).toBeVisible();
    expect(screen.getByRole("link", { name: /Mobile emergency: 112/ })).toHaveAttribute(
      "href",
      "tel:112",
    );
    expect(screen.getByRole("link", { name: /Ambulance: 10177/ })).toHaveAttribute(
      "href",
      "tel:10177",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders an inactive campaign boundary from non-production fixture content", async () => {
    await renderWithRouter(<PilotRouteGate {...pilotGateFixture} />);

    expect(screen.getByRole("heading", { level: 1, name: pilotGateFixture.title })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(pilotGateFixture.assurance);
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
