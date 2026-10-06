import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountCodePage } from "./AccountCodePage";

// Isolate the form's transition contract; routed navigation is covered by Playwright.
vi.mock("./Nav", () => ({ Nav: () => null }));
vi.mock("./Footer", () => ({ Footer: () => null }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

for (const mode of ["sign-in", "recover"] as const) {
  it(`${mode} focuses the code step, failure result and returned email step`, async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 202 }))
        .mockResolvedValueOnce(new Response(null, { status: 400 })),
    );
    const user = userEvent.setup();
    render(<AccountCodePage mode={mode} />);
    await user.type(screen.getByLabelText("Email address"), "journey@example.invalid");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => expect(screen.getByLabelText("Six-digit code")).toHaveFocus());
    await user.type(screen.getByLabelText("Six-digit code"), "123456");
    await user.click(
      screen.getByRole("button", {
        name: mode === "recover" ? "Complete recovery" : "Verify and sign in",
      }),
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent("We could not verify those details.");
    await user.click(screen.getByRole("button", { name: "Use another email address" }));
    expect(screen.getByLabelText("Email address")).toHaveFocus();
  });
}
