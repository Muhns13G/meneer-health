import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { StaffSupportPage } from "./StaffSupportPage";
const id = "f1400000-0000-4000-8000-000000000001";
const session = (deadline = Date.now() + 600000) =>
  Response.json({
    role: "auditor",
    purpose: "privacy_review",
    expiresAt: new Date(deadline).toISOString(),
  });
const view = {
  cases: [
    {
      reference: id,
      purpose: "privacy",
      state: "received",
      recordedAt: "2026-10-06T00:00:00Z",
      canRespond: true,
    },
  ],
  notifications: [
    {
      reference: id,
      template: "account-v1",
      state: "uncertain",
      reason: "TRANSPORT_UNCERTAIN",
      recordedAt: "2026-10-06T00:00:00Z",
      reviewState: "unreviewed",
      canResend: false,
    },
  ],
  coverage: [],
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("loads only explicit purpose queues and separates transport from human review", async () => {
  const send = vi.fn().mockResolvedValueOnce(session()).mockResolvedValueOnce(Response.json(view));
  vi.stubGlobal("fetch", send);
  render(<StaffSupportPage />);
  expect(send).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Load support queues" }));
  expect(
    await screen.findByText("Uncertain send; independent reconciliation required"),
  ).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("Viewing does not acknowledge");
  expect(screen.queryByRole("button", { name: "Queue confirmed non-acceptance retry" })).toBeNull();
  expect(JSON.parse(send.mock.calls[1]![1].body)).toEqual({ action: "read" });
});
it("records an audited notification acknowledgement and re-reads, without claiming delivery", async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json(view))
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json(id))
    .mockResolvedValueOnce(
      Response.json({
        ...view,
        notifications: [{ ...view.notifications[0], reviewState: "acknowledged" }],
      }),
    );
  vi.stubGlobal("fetch", send);
  render(<StaffSupportPage />);
  await userEvent.click(screen.getByRole("button", { name: "Load support queues" }));
  await screen.findByText("Awaiting owner review");
  await userEvent.click(screen.getByRole("button", { name: "Acknowledge delivery review" }));
  expect(
    await screen.findByRole("button", { name: "Confirm secure follow-up completed" }),
  ).toBeVisible();
  const body = JSON.parse(send.mock.calls[3]![1].body);
  expect(body).toEqual({
    action: "acknowledged",
    reference: id,
    requestKey: expect.any(String),
    reason: "review_started",
  });
  expect(send.mock.calls[3]![1].headers["Idempotency-Key"]).toBe(body.requestKey);
  expect(screen.getByRole("status")).toHaveTextContent("outcomes remain separate");
});
it("uses a stable key after an uncertain mutation and hides stale private data", async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json(view))
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json(view))
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json(id))
    .mockResolvedValueOnce(Response.json(view));
  vi.stubGlobal("fetch", send);
  render(<StaffSupportPage />);
  await userEvent.click(screen.getByRole("button", { name: "Load support queues" }));
  await screen.findByText("Awaiting owner review");
  await userEvent.click(screen.getByRole("button", { name: "Acknowledge delivery review" }));
  await screen.findByText(/Queue or response could not be confirmed/);
  expect(screen.queryByText("Awaiting owner review")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Load support queues" }));
  await screen.findByText("Awaiting owner review");
  await userEvent.click(screen.getByRole("button", { name: "Acknowledge delivery review" }));
  await screen.findByText(/Owner response recorded/);
  expect(JSON.parse(send.mock.calls[3]![1].body).requestKey).toBe(
    JSON.parse(send.mock.calls[7]![1].body).requestKey,
  );
});
it("clears queues on fresh-session denial", async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json(view))
    .mockResolvedValueOnce(new Response(null, { status: 401 }));
  vi.stubGlobal("fetch", send);
  render(<StaffSupportPage />);
  await userEvent.click(screen.getByRole("button", { name: "Load support queues" }));
  await screen.findByText("Awaiting owner review");
  await userEvent.click(screen.getByRole("button", { name: "Load support queues" }));
  await screen.findByText(/could not be confirmed/);
  expect(screen.queryByRole("heading", { name: "Support requests" })).toBeNull();
});
it("hides private data at the exact session deadline", async () => {
  vi.useFakeTimers();
  const deadline = Date.now() + 1000;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce(session(deadline)).mockResolvedValueOnce(Response.json(view)),
  );
  render(<StaffSupportPage />);
  await act(async () => {
    screen.getByRole("button", { name: "Load support queues" }).click();
  });
  expect(screen.getByText("Awaiting owner review")).toBeVisible();
  await act(async () => {
    vi.advanceTimersByTime(1001);
  });
  expect(screen.getByRole("status")).toHaveTextContent("Session expired");
  expect(screen.queryByRole("heading", { name: "Support requests" })).toBeNull();
});
