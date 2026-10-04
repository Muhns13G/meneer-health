import { cleanup, render, screen } from "@testing-library/react";
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
});
