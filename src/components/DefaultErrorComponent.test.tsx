import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DefaultErrorComponent } from "@/components/DefaultErrorComponent";
import { syntheticError } from "@/test/fixtures/non-production";
import { renderWithRouter } from "@/test/render-with-router";

describe("default error component", () => {
  it("offers a retry and safe home action", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const { router } = await renderWithRouter(
      <DefaultErrorComponent error={syntheticError} reset={reset} />,
    );
    const invalidate = vi.spyOn(router, "invalidate").mockResolvedValue();

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(invalidate).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });
});
