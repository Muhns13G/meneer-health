import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RefundPanel } from "./RefundPanel";
const id = "a4700000-0000-4000-8000-000000000001";
const view = () => ({
  requestState: "not_requested",
  refunds: [],
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("limits deposit replacement and dispute ownership to staff without claiming refunded or paid money", async () => {
  const data = {
    ...view(),
    canReplaceDeposit: true,
    disputes: [{ reference: id, status: "lost", owned: false, reconciled: true }],
  };
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(data));
  vi.stubGlobal("fetch", fetcher);
  const page = render(<RefundPanel offerId={id} staff />);
  fireEvent.click(screen.getByRole("button", { name: "Check cancellation / refund request" }));
  await screen.findByText(/Dispute: lost/);
  fireEvent.click(screen.getByRole("button", { name: "Authorise replacement deposit Checkout" }));
  await screen.findByText(/Dispute: lost/);
  expect(JSON.parse(fetcher.mock.calls[1]![1]!.body as string).action).toBe("replace_deposit");
  fireEvent.click(screen.getByRole("button", { name: "Take ownership of dispute review" }));
  await screen.findByText(/Dispute: lost/);
  expect(JSON.parse(fetcher.mock.calls[2]![1]!.body as string)).toMatchObject({
    action: "own_dispute",
    reference: id,
  });
  page.rerender(<RefundPanel offerId={crypto.randomUUID()} />);
  fireEvent.click(screen.getByRole("button", { name: "Check cancellation / refund request" }));
  await screen.findByText(/Dispute: lost/);
  expect(
    screen.queryByRole("button", { name: "Authorise replacement deposit Checkout" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Take ownership of dispute review" }),
  ).not.toBeInTheDocument();
});
it("requires explicit request confirmation and never treats request acceptance as refunded", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(view()))
    .mockResolvedValueOnce(Response.json({ ...view(), requestState: "requested" }));
  vi.stubGlobal("fetch", fetcher);
  render(<RefundPanel offerId={id} />);
  fireEvent.click(screen.getByRole("button", { name: "Check cancellation / refund request" }));
  await screen.findByText("Request: not requested");
  expect(
    screen.getByRole("button", { name: "Submit cancellation / refund request" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Submit cancellation / refund request" }));
  await screen.findByText("Request: requested");
  expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toMatchObject({
    action: "request",
    offerId: id,
  });
  expect(screen.queryByText(/refund confirmed/i)).not.toBeInTheDocument();
  expect(localStorage.length).toBe(0);
});
it("clears private facts on expiry, denial and offer remount", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ ...view(), expiresAt: new Date(Date.now() + 1000).toISOString() }),
    );
  vi.stubGlobal("fetch", fetcher);
  const page = render(<RefundPanel offerId={id} />);
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Check cancellation / refund request" })),
  );
  await act(async () => vi.advanceTimersByTime(1001));
  expect(screen.queryByText("Request: not requested")).not.toBeInTheDocument();
  page.rerender(<RefundPanel offerId={crypto.randomUUID()} />);
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
});
it("shows signed terminal refunds and restricts reconciliation/retry to staff", async () => {
  const data = {
    ...view(),
    refunds: [{ reference: id, amountMinor: 19900, state: "failed_verified" }],
    exceptions: [{ reference: id, code: "EVENT_CONFLICT", state: "pending" }],
  };
  const fetcher = vi.fn().mockImplementation(async () => Response.json(data));
  vi.stubGlobal("fetch", fetcher);
  const page = render(<RefundPanel offerId={id} staff />);
  fireEvent.click(screen.getByRole("button", { name: "Check cancellation / refund request" }));
  await screen.findByText(/refund failed verified/);
  fireEvent.click(screen.getByRole("button", { name: "Reconcile verified payment evidence" }));
  await screen.findByText(/refund failed verified/);
  expect(JSON.parse(fetcher.mock.calls[1]![1].body).action).toBe("reconcile");
  fireEvent.click(screen.getByRole("button", { name: "Queue retry after verified failure" }));
  await screen.findByText(/refund failed verified/);
  expect(JSON.parse(fetcher.mock.calls[2]![1].body).action).toBe("retry");
  page.rerender(<RefundPanel offerId={crypto.randomUUID()} />);
  expect(
    screen.queryByRole("button", { name: "Reconcile verified payment evidence" }),
  ).not.toBeInTheDocument();
});
