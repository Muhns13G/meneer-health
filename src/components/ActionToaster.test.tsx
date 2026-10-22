import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ActionToaster } from "./ActionToaster";

const { rendered } = vi.hoisted(() => ({ rendered: vi.fn() }));
vi.mock("sonner", () => ({
  Toaster: (props: unknown) => {
    rendered(props);
    return null;
  },
}));

it("keeps routine confirmations dismissible and transient for ten seconds", () => {
  render(<ActionToaster />);
  expect(rendered).toHaveBeenCalledWith(
    expect.objectContaining({
      duration: 10000,
      closeButton: true,
      visibleToasts: 2,
      toastOptions: expect.objectContaining({ closeButtonAriaLabel: "Dismiss notification" }),
    }),
  );
});
