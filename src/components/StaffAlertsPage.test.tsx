import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { StaffAlertsPage } from "./StaffAlertsPage";
const id = "a1000000-0000-4000-8000-000000000001";
const alert = {
  id,
  code: "ACCESS_DENIED",
  owner: "security",
  severity: "critical",
  recorded_at: "2026-10-04T09:00:00Z",
  delivery: "accepted",
  acknowledged: false,
  resolved: false,
};
const session = () =>
  Response.json({ role: "admin", expiresAt: new Date(Date.now() + 600_000).toISOString() });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("requires explicit acknowledgement and re-reads state after the receipt", async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json({ alerts: [alert] }))
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json({ responseId: id }))
    .mockResolvedValueOnce(Response.json({ alerts: [{ ...alert, acknowledged: true }] }));
  vi.stubGlobal("fetch", send);
  render(<StaffAlertsPage />);
  await userEvent.click(screen.getByRole("button", { name: "Load alerts" }));
  expect(await screen.findByText("Awaiting acknowledgement")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Acknowledge alert" }));
  expect(await screen.findByRole("button", { name: "Confirm resolution" })).toBeVisible();
  const fields = new URLSearchParams(send.mock.calls[3]![1].body);
  expect(fields.get("action")).toBe("acknowledged");
  expect(fields.get("alertId")).toBe(id);
  expect(fields.has("tenantId")).toBe(false);
});
it("clears prior alert data when the fresh session is rejected", async () => {
  const send = vi
    .fn()
    .mockResolvedValueOnce(session())
    .mockResolvedValueOnce(Response.json({ alerts: [alert] }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }));
  vi.stubGlobal("fetch", send);
  render(<StaffAlertsPage />);
  await userEvent.click(screen.getByRole("button", { name: "Load alerts" }));
  await screen.findByText("Awaiting acknowledgement");
  await userEvent.click(screen.getByRole("button", { name: "Load alerts" }));
  expect(await screen.findByText(/Access unavailable/)).toBeVisible();
  expect(screen.queryByText("ACCESS DENIED")).toBeNull();
  expect(screen.getByRole("status")).toHaveFocus();
});
it("expires during a stalled read and rejects its late private response", async () => {
  vi.useFakeTimers();
  let finish!: (response: Response) => void;
  const send = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        role: "admin",
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
  vi.stubGlobal("fetch", send);
  render(<StaffAlertsPage />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Load alerts" }));
  });
  expect(screen.getByRole("status")).toHaveTextContent("Checking live");
  await act(async () => {
    vi.advanceTimersByTime(1001);
  });
  expect(screen.getByRole("status")).toHaveTextContent("Session expired");
  expect(screen.getByRole("status")).toHaveFocus();
  expect(screen.getByRole("button", { name: "Load alerts" })).toBeEnabled();
  await act(async () => {
    finish(Response.json({ alerts: [alert] }));
  });
  expect(screen.queryByText("ACCESS DENIED")).toBeNull();
  expect(screen.getByRole("status")).toHaveTextContent("Session expired");
});
