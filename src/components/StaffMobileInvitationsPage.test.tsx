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
  it("shows minimal conflict recovery without provider identity or false acceptance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            invitations: [{ ...row, delivery: { status: "conflict", budgetReview: true } }],
            nextId: null,
            reservationEnabled: true,
            sendingEnabled: false,
          },
          { headers: { "X-Session-Expires-At": new Date(Date.now() + 600000).toISOString() } },
        ),
      ),
    );
    render(<StaffMobileInvitationsPage />);
    expect(await screen.findByText(/Delivery: conflict/)).toHaveTextContent(
      "not invitation acceptance",
    );
    expect(screen.getByText(/Delivery: conflict/)).toHaveTextContent("do not resend blindly");
    expect(screen.queryByRole("button", { name: /Send one invitation SMS/ })).toBeNull();
  });
  it("dispatches only once after explicit confirmation and never auto-retries uncertainty", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            invitations: [
              {
                ...row,
                reviewed: true,
                sendReserved: true,
                dispatchRequestKey: id,
                delivery: { status: "not_attempted", budgetReview: false },
              },
            ],
            nextId: null,
            reservationEnabled: true,
            sendingEnabled: true,
          },
          { headers: { "X-Session-Expires-At": new Date(Date.now() + 600000).toISOString() } },
        ),
      )
      .mockRejectedValueOnce(new Error("uncertain"));
    vi.stubGlobal("fetch", fetch);
    render(<StaffMobileInvitationsPage />);
    const send = await screen.findByRole("button", {
      name: "Send one invitation SMS for Synthetic",
    });
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(send);
    await screen.findByText(/Command result uncertain/);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]![0]).toBe("/staff/mobile-invitations/dispatch");
    expect(Object.fromEntries(new URLSearchParams(fetch.mock.calls[1]![1].body))).toEqual({
      invitationId: id,
      expectedVersion: "1",
      reservationRequestKey: id,
    });
    expect(screen.queryByText("Synthetic Participant")).toBeNull();
  });
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
