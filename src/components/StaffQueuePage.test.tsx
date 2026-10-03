import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffQueuePage } from "./StaffQueuePage";
const id = "a1000000-0000-4000-8000-000000000001";
const item = {
  caseId: id,
  state: "onboarding_pending",
  version: 1,
  assignedOwner: id,
  createdAt: "2026-10-03T12:00:00Z",
  updatedAt: "2026-10-03T12:00:00Z",
  profileActive: true,
  emailVerified: true,
  exceptionCode: null,
  handoffReadiness: "not_evaluated",
  paymentReadiness: "not_evaluated",
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("accessible assigned queue", () => {
  it("loads masked details and clears them on denial", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ cases: [item], nextCursor: null }))
      .mockResolvedValueOnce(
        Response.json({
          ...item,
          profile: {
            givenName: "Synthetic",
            familyName: "Client",
            status: "active",
            maskedEmail: "***@***",
            maskedMobile: "***12",
            contactPreference: "email",
            mobileVerificationStatus: "pending",
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    render(<StaffQueuePage />);
    await userEvent.click(await screen.findByRole("button", { name: `View case ${id}` }));
    expect(await screen.findByText("Synthetic Client")).toBeVisible();
    expect(screen.getByText("***@***")).toBeVisible();
    await waitFor(() => expect(screen.getByRole("heading", { name: `Case ${id}` })).toHaveFocus());
    await userEvent.click(screen.getByRole("button", { name: "Back to assigned queue" }));
    expect(await screen.findByText(/Access is unavailable/)).toBeVisible();
    expect(screen.queryByText("Synthetic Client")).toBeNull();
    expect(location.pathname).not.toContain(id);
  });
  it("applies bounded state filters and cursor paging without profile fields", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ cases: [item], nextCursor: { createdAt: item.createdAt, id } }),
      )
      .mockResolvedValue(Response.json({ cases: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetch);
    render(<StaffQueuePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Next page" }));
    expect(await screen.findByText(/No assigned cases/)).toBeVisible();
    expect(String(fetch.mock.calls[1]![1].body)).toContain(`afterId=${id}`);
    await userEvent.selectOptions(screen.getByLabelText("Operational state"), "cancelled");
    await userEvent.click(screen.getByRole("button", { name: "Apply filter / refresh" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(String(fetch.mock.calls[2]![1].body)).toBe("state=cancelled&afterCreatedAt=&afterId=");
  });
  it("shows sign-in and fails closed on unapproved fields", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({ cases: [item], nextCursor: null, rawEmail: "private@example.invalid" }),
      );
    vi.stubGlobal("fetch", fetch);
    render(<StaffQueuePage />);
    expect(await screen.findByText(/Sign in with staff MFA/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Apply filter / refresh" }));
    expect(await screen.findByText(/temporarily unavailable/)).toBeVisible();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
