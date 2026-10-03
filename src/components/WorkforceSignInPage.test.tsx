import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkforceSignInPage } from "./WorkforceSignInPage";

afterEach(() => vi.unstubAllGlobals());
describe("individual staff sign-in", () => {
  it("accepts an existing invitation code without sending another email", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ enrollment: null }));
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(<WorkforceSignInPage />);
    await user.type(screen.getByLabelText("Staff email address"), "staff@example.invalid");
    await user.click(screen.getByRole("button", { name: "I already have an invitation code" }));
    expect(fetcher).not.toHaveBeenCalled();
    await user.type(await screen.findByLabelText("Six-digit email code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify email" }));
    expect(await screen.findByLabelText("Authenticator code")).toBeInTheDocument();
    expect(fetcher.mock.calls[0]?.[1].body.get("action")).toBe("invitation");
  });
  it("requires email and TOTP before showing staff session actions", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(
        Response.json({
          enrollment: { qrCode: "data:image/svg+xml,synthetic", secret: "SYNTHETIC" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        Response.json({
          role: "operations",
          purpose: "operations",
          expiresAt: "2030-01-01T00:00:00Z",
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const user = userEvent.setup();
    render(<WorkforceSignInPage />);
    await user.type(screen.getByLabelText("Staff email address"), "staff@example.invalid");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("Six-digit email code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify email" }));
    expect(await screen.findByLabelText("Authenticator code")).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Renew session" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Authenticator code"), "654321");
    await user.click(screen.getByRole("button", { name: "Verify authenticator" }));
    expect(await screen.findByRole("button", { name: "Renew session" })).toBeInTheDocument();
    expect(screen.queryByText(/Manual setup key/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Invite reviewed staff" }),
    ).not.toBeInTheDocument();
    for (const [, options] of fetcher.mock.calls.slice(0, 3)) {
      expect(options.body.toString()).not.toMatch(/role=|tenantId=|purpose=|assurance=/);
    }
  });
  it("never advances to staff access on failed email verification", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 202 }))
        .mockResolvedValueOnce(new Response(null, { status: 401 })),
    );
    const user = userEvent.setup();
    render(<WorkforceSignInPage />);
    await user.type(screen.getByLabelText("Staff email address"), "staff@example.invalid");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("Six-digit email code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify email" }));
    expect(await screen.findByText(/Access could not be verified/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Authenticator code")).not.toBeInTheDocument();
  });
});
