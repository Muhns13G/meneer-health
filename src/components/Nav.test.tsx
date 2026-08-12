import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Nav } from "@/components/Nav";
import { renderWithRouter } from "@/test/render-with-router";

describe("primary navigation", () => {
  it("resolves homepage sections from every route instead of using page-local hashes", async () => {
    await renderWithRouter(<Nav />);

    for (const label of ["Hair Loss", "ED", "Weight", "Testosterone"]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", "/#treatments");
    }
    expect(screen.getByRole("link", { name: "How It Works" })).toHaveAttribute("href", "/#how");
    expect(screen.getByRole("link", { name: "Peptides" })).toHaveAttribute("href", "/peptides");
  });

  it("exposes a disclosure and moves focus into the opened mobile navigation", async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Nav />);

    expect(screen.getAllByRole("link", { name: "Peptides" })).toHaveLength(1);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "mobile-primary-navigation");

    await user.click(trigger);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("navigation", { name: "Mobile primary navigation" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Peptides" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Start privately" })).toHaveLength(2);
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: "Hair Loss" })[1]).toHaveFocus(),
    );

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.getAllByRole("link", { name: "Peptides" })).toHaveLength(1);
  });

  it("returns focus to the trigger when Escape closes the menu", async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Nav />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("navigation", { name: "Mobile primary navigation" })).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus());
  });

  it("closes on outside interaction, desktop resize, and route changes", async () => {
    const user = userEvent.setup();
    const { router } = await renderWithRouter(<Nav />);
    const openMenu = () => user.click(screen.getByRole("button", { name: "Open menu" }));

    await openMenu();
    await user.click(document.body);
    expect(screen.queryByRole("navigation", { name: "Mobile primary navigation" })).toBeNull();

    await openMenu();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    fireEvent(window, new Event("resize"));
    expect(screen.queryByRole("navigation", { name: "Mobile primary navigation" })).toBeNull();

    await openMenu();
    await router.navigate({ to: "/", hash: "how" });
    await waitFor(() =>
      expect(screen.queryByRole("navigation", { name: "Mobile primary navigation" })).toBeNull(),
    );
  });
});
