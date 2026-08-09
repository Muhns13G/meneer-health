import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Nav } from "@/components/Nav";
import { renderWithRouter } from "@/test/render-with-router";

describe("primary navigation", () => {
  it("opens and closes the mobile navigation without changing route targets", async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Nav />);

    expect(screen.getAllByRole("link", { name: "Peptides" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getAllByRole("link", { name: "Peptides" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Start privately" })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getAllByRole("link", { name: "Peptides" })).toHaveLength(1);
  });
});
