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

it("routes a verified existing client to document review after only one OTP", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 202 }))
    .mockResolvedValueOnce(
      new Response(null, { status: 204, headers: { "X-Meneer-Session": "documents" } }),
    );
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  render(<AccountCodePage mode="sign-in" />);
  await user.type(screen.getByLabelText("Email address"), "review@example.invalid");
  await user.click(screen.getByRole("button", { name: "Send code" }));
  await user.type(await screen.findByLabelText("Six-digit code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and sign in" }));
  expect(await screen.findByRole("link", { name: "Review current documents" })).toHaveAttribute(
    "href",
    "/account/documents",
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status")).toHaveTextContent("no second code");
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

it("public registration remains unavailable without readiness and offers normal sign-in", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 412 })));
  render(<AccountCodePage mode="sign-up" />);
  await screen.findByText(/New account signup is currently unavailable/);
  expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Mobile emergency: 112" })).toHaveAttribute(
    "href",
    "tel:112",
  );
  expect(screen.getByRole("link", { name: "Ambulance: 10177" })).toHaveAttribute(
    "href",
    "tel:10177",
  );
  expect(screen.getByRole("link", { name: "Already have an account? Sign in" })).toHaveAttribute(
    "href",
    "/account/sign-in",
  );
});
