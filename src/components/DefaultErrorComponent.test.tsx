import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DefaultErrorComponent } from "@/components/DefaultErrorComponent";
import { syntheticError } from "@/test/fixtures/non-production";
import { renderWithRouter } from "@/test/render-with-router";

describe("default error component", () => {
  it("handles a non-Error thrown value without exposing it", async () => {
    await renderWithRouter(
      <DefaultErrorComponent error="synthetic-private-detail" reset={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeVisible();
    expect(screen.queryByText("synthetic-private-detail")).not.toBeInTheDocument();
  });

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
