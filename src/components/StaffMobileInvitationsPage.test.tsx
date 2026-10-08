import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffMobileInvitationsPage } from "./StaffMobileInvitationsPage";

const id = "a1430000-0000-4000-8000-000000000001";
const row = {
  id,
  version: 1,
  status: "draft",
  expiresAt: null,
  givenName: "Synthetic",
  familyName: "Participant",
  maskedPhone: "***01",
  reviewed: false,
  sendReserved: false,
};
function response(invitations = [row], expiry = Date.now() + 600_000) {
  return Response.json(
    { invitations, nextId: null, reservationEnabled: true, sendingEnabled: false },
    { headers: { "X-Session-Expires-At": new Date(expiry).toISOString() } },
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("private staff mobile invitation register", () => {
  it("masks contacts and requires explicit confirmation before recording a review", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(
        Response.json({
          invitationId: id,
          version: 1,
          status: "draft",
          action: "review",
          smsSent: false,
        }),
      )
      .mockResolvedValueOnce(response([{ ...row, reviewed: true }]));
    vi.stubGlobal("fetch", fetch);
    render(<StaffMobileInvitationsPage />);
    const review = await screen.findByRole("button", { name: "Review invitation for Synthetic" });
    expect(review).toBeDisabled();
    expect(screen.getByText(/Phone \*\*\*01/)).toBeVisible();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(review);
    await screen.findByText(/Command recorded/);
    const fields = new URLSearchParams(fetch.mock.calls[1]![1].body);
    expect(Object.fromEntries(fields)).toEqual({
      action: "review",
      invitationId: id,
      expectedVersion: "1",
      requestKey: expect.stringMatching(/^[a-f0-9-]{36}$/),
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Reserve send for Synthetic" })).toBeDisabled();
  });
  it.each([409, 429, 403])(
    "clears private detail and never retries a rejected command (%s)",
    async (status) => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(response())
        .mockResolvedValueOnce(new Response(null, { status }));
      vi.stubGlobal("fetch", fetch);
      render(<StaffMobileInvitationsPage />);
      await userEvent.click(
        await screen.findByRole("button", { name: "Revoke invitation for Synthetic" }),
      );
      await waitFor(() => expect(screen.queryByText("Synthetic Participant")).toBeNull());
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(screen.queryByLabelText("Given name")).toBeNull();
    },
  );
  it("fails closed on expired or overbroad projections", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([row], Date.now() - 1));
    vi.stubGlobal("fetch", fetch);
    render(<StaffMobileInvitationsPage />);
    await screen.findByText(/Access unavailable/);
    expect(screen.queryByText("Synthetic Participant")).toBeNull();
  });
  it("clears data on network uncertainty without automatic replay", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    render(<StaffMobileInvitationsPage />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Revoke invitation for Synthetic" }),
    );
    await screen.findByText(/Command result uncertain/);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Synthetic Participant")).toBeNull();
  });
});
